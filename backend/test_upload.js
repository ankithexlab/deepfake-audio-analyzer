/**
 * test_upload.js — Quick API smoke test
 * Run: node test_upload.js
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const BOUNDARY = '----TestBoundary12345';
const FILE_PATH = path.join(__dirname, 'test_audio.wav');
const fileContent = fs.readFileSync(FILE_PATH);

// Build multipart body
const parts = [
  `--${BOUNDARY}\r\n`,
  `Content-Disposition: form-data; name="audio"; filename="test_audio.wav"\r\n`,
  `Content-Type: audio/wav\r\n`,
  `\r\n`,
];
const header = Buffer.from(parts.join(''));
const footer = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
const body   = Buffer.concat([header, fileContent, footer]);

// ── Test 1: Upload valid WAV ───────────────────────────────────
function testUpload(cb) {
  const options = {
    hostname: 'localhost',
    port    : 5000,
    path    : '/api/v1/upload',
    method  : 'POST',
    headers : {
      'Content-Type'  : `multipart/form-data; boundary=${BOUNDARY}`,
      'Content-Length': body.length,
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      const parsed = JSON.parse(data);
      console.log(`\n✅ Test 1 — Upload WAV:`);
      console.log(`   Status : ${res.statusCode}`);
      console.log(`   Success: ${parsed.success}`);
      console.log(`   FileId : ${parsed.data?.fileId}`);
      console.log(`   Format : ${parsed.data?.format}`);
      console.log(`   Size   : ${parsed.data?.sizeHuman}`);
      cb(parsed.data?.fileId);
    });
  });

  req.on('error', (e) => console.error('Upload error:', e.message));
  req.write(body);
  req.end();
}

// ── Test 2: Check analysis status ─────────────────────────────
function testAnalysisStatus(fileId, cb) {
  if (!fileId) { console.log('\n⚠ Skipping test 2 (no fileId)'); return cb(); }

  http.get(`http://localhost:5000/api/v1/analysis/${fileId}`, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      const parsed = JSON.parse(data);
      console.log(`\n✅ Test 2 — Analysis Status:`);
      console.log(`   Status : ${res.statusCode}`);
      console.log(`   Success: ${parsed.success}`);
      console.log(`   AStatus: ${parsed.data?.status}`);
      cb(fileId);
    });
  }).on('error', (e) => console.error(e.message));
}

// ── Test 3: Run analysis (stub) ────────────────────────────────
function testRunAnalysis(fileId, cb) {
  if (!fileId) { console.log('\n⚠ Skipping test 3 (no fileId)'); return cb(); }

  const options = {
    hostname: 'localhost',
    port    : 5000,
    path    : `/api/v1/analysis/${fileId}/run`,
    method  : 'POST',
    headers : { 'Content-Type': 'application/json', 'Content-Length': 0 },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      const parsed = JSON.parse(data);
      console.log(`\n✅ Test 3 — Run Analysis (stub):`);
      console.log(`   Status   : ${res.statusCode}`);
      console.log(`   Success  : ${parsed.success}`);
      console.log(`   Label    : ${parsed.data?.analysisResult?.label}`);
      console.log(`   Confidence: ${parsed.data?.analysisResult?.confidence}`);
      cb(fileId);
    });
  });
  req.on('error', (e) => console.error(e.message));
  req.end();
}

// ── Test 4: 404 for unknown route ─────────────────────────────
function test404(fileId, cb) {
  http.get('http://localhost:5000/api/v1/nonexistent', (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      const parsed = JSON.parse(data);
      console.log(`\n✅ Test 4 — 404 Handler:`);
      console.log(`   Status : ${res.statusCode}`);
      console.log(`   Code   : ${parsed.error?.code}`);
      cb(fileId);
    });
  }).on('error', (e) => console.error(e.message));
}

// ── Test 5: Delete uploaded file ──────────────────────────────
function testDelete(fileId, cb) {
  if (!fileId) { console.log('\n⚠ Skipping test 5 (no fileId)'); return cb(); }

  const options = {
    hostname: 'localhost',
    port    : 5000,
    path    : `/api/v1/upload/${fileId}`,
    method  : 'DELETE',
  };
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      const parsed = JSON.parse(data);
      console.log(`\n✅ Test 5 — Delete File:`);
      console.log(`   Status : ${res.statusCode}`);
      console.log(`   Success: ${parsed.success}`);
      console.log(`   Msg    : ${parsed.message}`);
      cb();
    });
  });
  req.on('error', (e) => console.error(e.message));
  req.end();
}

// ── Run all tests sequentially ─────────────────────────────────
console.log('🚀 Running API smoke tests against http://localhost:5000\n');
testUpload((fileId) =>
  testAnalysisStatus(fileId, (id) =>
    testRunAnalysis(id, (id2) =>
      test404(id2, (id3) =>
        testDelete(id3, () => {
          console.log('\n\n🎉 All smoke tests completed.\n');
          process.exit(0);
        })
      )
    )
  )
);
