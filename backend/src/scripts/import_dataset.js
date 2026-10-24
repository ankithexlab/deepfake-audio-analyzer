/**
 * import_dataset.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dataset Ingestion & Metadata Synchronization Engine for PostgreSQL.
 * Scans 6,000 WAV audio samples and seeds metadata into deepfake_db.
 *
 * Dataset Root: E:\projects\mini 5th sem\dataset
 * Target Table: dataset_files
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const db = require('../config/db.config');

const DATASET_ROOT = path.resolve(__dirname, '../../../dataset');

/**
 * Parses WAV file header to extract sample rate and approximate duration.
 * @param {string} filePath 
 * @param {number} fileSize 
 * @returns {{ sampleRate: number, duration: number }}
 */
function parseWavHeader(filePath, fileSize) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(44);
    fs.readSync(fd, buffer, 0, 44, 0);
    fs.closeSync(fd);

    const riff = buffer.toString('ascii', 0, 4);
    const wave = buffer.toString('ascii', 8, 12);
    if (riff === 'RIFF' && wave === 'WAVE') {
      const sampleRate = buffer.readUInt32LE(24);
      const byteRate = buffer.readUInt32LE(28);
      const duration = byteRate > 0 ? Math.max(0, (fileSize - 44) / byteRate) : 4.0;
      return { sampleRate, duration: Math.round(duration * 100) / 100 };
    }
  } catch (err) {
    // Fallback if header read fails
  }
  return { sampleRate: 16000, duration: 4.0 };
}

/**
 * Recursively scans directory for WAV files.
 * @param {string} dir 
 * @param {string} label 
 * @returns {Array<Object>}
 */
function scanAudioDirectory(dir, label) {
  const results = [];
  if (!fs.existsSync(dir)) {
    console.warn(`Directory does not exist: ${dir}`);
    return results;
  }

  const categories = fs.readdirSync(dir, { withFileTypes: true });

  for (const catEntry of categories) {
    if (catEntry.isDirectory()) {
      const categoryName = catEntry.name;
      const catPath = path.join(dir, categoryName);
      const files = fs.readdirSync(catPath);

      for (const file of files) {
        if (file.toLowerCase().endsWith('.wav')) {
          const fullPath = path.join(catPath, file);
          const relativePath = path.relative(DATASET_ROOT, fullPath).replace(/\\/g, '/');
          const stat = fs.statSync(fullPath);
          const { sampleRate, duration } = parseWavHeader(fullPath, stat.size);

          results.push({
            filename: file,
            relativePath,
            filePath: fullPath,
            label,
            category: categoryName,
            fileSize: stat.size,
            durationSeconds: duration,
            sampleRate,
          });
        }
      }
    }
  }

  return results;
}

async function importDataset() {
  console.log('='.repeat(65));
  console.log('DEEPFAKE AUDIO ANALYZER — DATASET POSTGRESQL IMPORT ENGINE');
  console.log('='.repeat(65));
  console.log(`Scanning dataset root: ${DATASET_ROOT}`);

  await db.initDatabase();

  const realDir = path.join(DATASET_ROOT, 'real_voice_real_bg_4s');
  const fakeDir = path.join(DATASET_ROOT, 'fake_voice_real_bg_4s');

  console.log('Scanning REAL audio samples...');
  const realRecords = scanAudioDirectory(realDir, 'REAL');
  console.log(` -> Found ${realRecords.length} REAL WAV files.`);

  console.log('Scanning DEEPFAKE audio samples...');
  const fakeRecords = scanAudioDirectory(fakeDir, 'DEEPFAKE');
  console.log(` -> Found ${fakeRecords.length} DEEPFAKE WAV files.`);

  const allRecords = [...realRecords, ...fakeRecords];
  console.log(`Total files discovered: ${allRecords.length}`);

  if (allRecords.length === 0) {
    console.error('No audio files found! Please verify dataset path.');
    process.exit(1);
  }

  console.log('\nBeginning database synchronization into PostgreSQL (deepfake_db)...');
  const batchSize = 100;
  let insertedCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < allRecords.length; i += batchSize) {
    const batch = allRecords.slice(i, i + batchSize);
    
    // Construct parameterized multi-row insert with ON CONFLICT DO NOTHING
    const values = [];
    const valuePlaceholders = [];
    let pIdx = 1;

    for (const item of batch) {
      valuePlaceholders.push(
        `($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6}, $${pIdx + 7})`
      );
      values.push(
        item.filename,
        item.relativePath,
        item.filePath,
        item.label,
        item.category,
        item.fileSize,
        item.durationSeconds,
        item.sampleRate
      );
      pIdx += 8;
    }

    const queryText = `
      INSERT INTO dataset_files 
        (filename, relative_path, file_path, label, category, file_size, duration_seconds, sample_rate)
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (relative_path) DO NOTHING
    `;

    await db.query(queryText, values);
    insertedCount += batch.length;

    const pct = ((insertedCount / allRecords.length) * 100).toFixed(1);
    process.stdout.write(`\rProgress: [${insertedCount}/${allRecords.length}] (${pct}%) synced...`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nSynchronization finished in ${elapsed}s.\n`);

  // Query database for actual verified counts
  const totalCountRes = await db.query('SELECT COUNT(*) FROM dataset_files');
  const labelCountsRes = await db.query(`
    SELECT label, COUNT(*) AS count 
    FROM dataset_files 
    GROUP BY label 
    ORDER BY label DESC
  `);
  const catCountsRes = await db.query(`
    SELECT category, label, COUNT(*) AS count 
    FROM dataset_files 
    GROUP BY category, label 
    ORDER BY category, label DESC
  `);

  console.log('='.repeat(65));
  console.log('POSTGRESQL DATASET VERIFICATION STATISTICS');
  console.log('='.repeat(65));
  console.log(`Total Dataset Records in deepfake_db: ${totalCountRes.rows[0].count}`);
  
  labelCountsRes.rows.forEach((r) => {
    console.log(` - ${r.label.padEnd(10)}: ${r.count} files`);
  });

  console.log('\nCategory Breakdown:');
  catCountsRes.rows.forEach((r) => {
    console.log(` - Category: ${r.category.padEnd(16)} | Label: ${r.label.padEnd(8)} | Count: ${r.count}`);
  });
  console.log('='.repeat(65));

  await db.pool.end();
}

if (require.main === module) {
  importDataset().catch((err) => {
    console.error('Dataset import failed:', err);
    process.exit(1);
  });
}

module.exports = { importDataset };
