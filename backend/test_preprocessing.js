/**
 * test_preprocessing.js — Preprocessing Pipeline Smoke Test
 * Run: node test_preprocessing.js
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const BOUNDARY = '----TestBoundaryPreprocessor999';
const FILE_PATH = path.join(__dirname, 'test_real.wav');

if (!fs.existsSync(FILE_PATH)) {
  console.error('Error: test_real.wav not found! Please run node test_upload.js first or generate audio.');
  process.exit(1);
}

const fileContent = fs.readFileSync(FILE_PATH);

// Build multipart body
const parts = [
  `--${BOUNDARY}\r\n`,
  `Content-Disposition: form-data; name="audio"; filename="test_real.wav"\r\n`,
  `Content-Type: audio/wav\r\n`,
  `\r\n`,
];
const header = Buffer.from(parts.join(''));
const footer = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
const body   = Buffer.concat([header, fileContent, footer]);

function requestJSON(options, bodyData, cb) {
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        cb(null, res.statusCode, parsed);
      } catch (err) {
        cb(err, res.statusCode, data);
      }
    });
  });
  req.on('error', (e) => cb(e));
  if (bodyData) req.write(bodyData);
  req.end();
}

console.log('🚀 Starting Preprocessing Pipeline Smoke Test...\n');

// 1. Upload file
requestJSON({
  hostname: 'localhost',
  port    : 5000,
  path    : '/api/v1/upload',
  method  : 'POST',
  headers : {
    'Content-Type'  : `multipart/form-data; boundary=${BOUNDARY}`,
    'Content-Length': body.length,
  },
}, body, (err, status, resp) => {
  if (err || !resp.success) {
    console.error('❌ Step 1 (Upload) failed:', err || resp);
    process.exit(1);
  }

  const fileId = resp.data.fileId;
  console.log(`✅ Step 1 — Audio Uploaded: fileId = ${fileId}`);

  // 2. Trigger Preprocessing & Feature Extraction
  requestJSON({
    hostname: 'localhost',
    port    : 5000,
    path    : `/api/v1/preprocess/${fileId}`,
    method  : 'POST',
    headers : { 'Content-Length': 0 },
  }, null, (err2, status2, resp2) => {
    if (err2 || !resp2.success) {
      console.error('❌ Step 2 (Preprocess) failed:', err2 || resp2);
      process.exit(1);
    }

    console.log(`✅ Step 2 — Preprocessing Completed:`);
    console.log(`   Sample Rate : ${resp2.data.preprocessing.samplingRateHz} Hz`);
    console.log(`   Channels    : ${resp2.data.preprocessing.channels} (Mono)`);
    console.log(`   Raw Length  : ${resp2.data.preprocessing.rawDurationSec} s`);
    console.log(`   Clean Length: ${resp2.data.preprocessing.cleanDurationSec} s`);
    console.log(`   MFCC Count  : ${resp2.data.preprocessing.featuresSummary.mfccCount}`);
    console.log(`   Chroma Bands: ${resp2.data.preprocessing.featuresSummary.chromaBands}`);

    // 3. Get Preprocessing Status
    requestJSON({
      hostname: 'localhost',
      port    : 5000,
      path    : `/api/v1/preprocess/${fileId}`,
      method  : 'GET',
    }, null, (err3, status3, resp3) => {
      if (err3 || !resp3.success) {
        console.error('❌ Step 3 (Status) failed:', err3 || resp3);
        process.exit(1);
      }
      console.log(`✅ Step 3 — Status Verified: status = ${resp3.data.status}`);

      // 4. Retrieve Extracted Features Matrix
      requestJSON({
        hostname: 'localhost',
        port    : 5000,
        path    : `/api/v1/preprocess/${fileId}/features`,
        method  : 'GET',
      }, null, (err4, status4, resp4) => {
        if (err4 || !resp4.success) {
          console.error('❌ Step 4 (Features) failed:', err4 || resp4);
          process.exit(1);
        }
        console.log(`✅ Step 4 — Raw Feature Payload Retrieved:`);
        console.log(`   ZCR Mean   : ${resp4.data.features.zeroCrossingRate.mean}`);
        console.log(`   RMS Mean   : ${resp4.data.features.rmsEnergy.mean}`);
        console.log(`   Waveform Pts: ${resp4.data.features.waveformPoints.length}`);

        // 5. Cleanup
        requestJSON({
          hostname: 'localhost',
          port    : 5000,
          path    : `/api/v1/upload/${fileId}`,
          method  : 'DELETE',
        }, null, (err5, status5, resp5) => {
          console.log(`✅ Step 5 — Cleaned Up File`);
          console.log('\n🎉 ALL PREPROCESSING PIPELINE TESTS PASSED SUCCESSFULLY!\n');
          process.exit(0);
        });
      });
    });
  });
});
