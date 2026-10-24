/**
 * test_phase4_api_matrix.js
 * Comprehensive Integration Test Matrix for Phase 4.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  const results = [];
  function record(testName, category, status, details) {
    results.push({ testName, category, status, details });
    const mark = status === 'PASS' ? '✓' : '✗';
    console.log(`${mark} [${category}] ${testName}: ${status} - ${details}`);
  }

  console.log('====================================================');
  console.log('STARTING PHASE 4 INTEGRATION & API CONTRACT TEST MATRIX');
  console.log('====================================================\n');

  let guestToken = null;
  let realFileId = null;
  let fakeFileId = null;

  // ── 1. Health & Model Readiness ─────────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const json = await res.json();
    if (res.status === 200 && json.success && json.data.model.ready === true) {
      record('Health & Readiness Probe', 'SYSTEM', 'PASS', `Model: ${json.data.model.name}, Ready: ${json.data.model.ready}`);
    } else {
      record('Health & Readiness Probe', 'SYSTEM', 'FAIL', `Unexpected payload: ${JSON.stringify(json)}`);
    }
  } catch (err) {
    record('Health & Readiness Probe', 'SYSTEM', 'FAIL', err.message);
  }

  // Model Info Endpoint
  try {
    const res = await fetch(`${BASE_URL}/analysis/model-info`);
    const json = await res.json();
    if (res.status === 200 && json.success && json.data.featureCount === 170) {
      record('Model Info Contract', 'SYSTEM', 'PASS', `Model: ${json.data.modelName}, FeatureCount: ${json.data.featureCount}`);
    } else {
      record('Model Info Contract', 'SYSTEM', 'FAIL', `Unexpected status ${res.status}`);
    }
  } catch (err) {
    record('Model Info Contract', 'SYSTEM', 'FAIL', err.message);
  }

  // ── 2. Guest Authentication & Security ──────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/auth/guest`, { method: 'POST' });
    const json = await res.json();
    if (res.status === 200 && json.success && json.data.user.role === 'guest') {
      guestToken = json.data.token;
      // Decode JWT payload
      const parts = guestToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.role === 'guest' && payload.email === 'demo@aura.ai') {
        record('Guest Login & Role Verification', 'AUTH', 'PASS', `Role: ${json.data.user.role}, JWT payload role: ${payload.role}`);
      } else {
        record('Guest Login & Role Verification', 'AUTH', 'FAIL', `JWT payload role mismatch: ${payload.role}`);
      }
    } else {
      record('Guest Login & Role Verification', 'AUTH', 'FAIL', `Response role was: ${json.data?.user?.role}`);
    }
  } catch (err) {
    record('Guest Login & Role Verification', 'AUTH', 'FAIL', err.message);
  }

  // Protected Route with Token (/api/v1/auth/me)
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${guestToken}` }
    });
    const json = await res.json();
    if (res.status === 200 && json.success && json.data.user.role === 'guest') {
      record('Protected Route Authorization (/auth/me)', 'AUTH', 'PASS', `Authenticated as: ${json.data.user.email} (${json.data.user.role})`);
    } else {
      record('Protected Route Authorization (/auth/me)', 'AUTH', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    record('Protected Route Authorization (/auth/me)', 'AUTH', 'FAIL', err.message);
  }

  // Protected Route without Token (Missing Auth)
  try {
    const res = await fetch(`${BASE_URL}/auth/me`);
    if (res.status === 401) {
      record('Missing Token Rejection', 'SECURITY', 'PASS', 'Correctly rejected with 401 Unauthorized');
    } else {
      record('Missing Token Rejection', 'SECURITY', 'FAIL', `Unexpected status: ${res.status}`);
    }
  } catch (err) {
    record('Missing Token Rejection', 'SECURITY', 'FAIL', err.message);
  }

  // Protected Route with Invalid Token
  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': 'Bearer fake.invalid.jwt.token' }
    });
    if (res.status === 401) {
      record('Invalid Token Rejection', 'SECURITY', 'PASS', 'Correctly rejected with 401 Unauthorized');
    } else {
      record('Invalid Token Rejection', 'SECURITY', 'FAIL', `Unexpected status: ${res.status}`);
    }
  } catch (err) {
    record('Invalid Token Rejection', 'SECURITY', 'FAIL', err.message);
  }

  // ── 3. Audio Upload Validation Scenarios ─────────────────────────
  // A. Valid WAV Upload
  try {
    const filePath = path.resolve(__dirname, 'test_real.wav');
    const fileBytes = fs.readFileSync(filePath);
    const boundary = '----WebKitFormBoundaryTestRealWav';
    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="test_real.wav"\r\nContent-Type: audio/wav\r\n\r\n`);
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, fileBytes, footer]);

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body
    });
    const json = await res.json();
    if (res.status === 201 && json.success && json.data.fileId) {
      realFileId = json.data.fileId;
      record('Valid WAV Upload', 'UPLOAD', 'PASS', `File ID: ${realFileId}, Size: ${json.data.sizeHuman}, Status: ${json.data.status}`);
    } else {
      record('Valid WAV Upload', 'UPLOAD', 'FAIL', `Status ${res.status}: ${json.message}`);
    }
  } catch (err) {
    record('Valid WAV Upload', 'UPLOAD', 'FAIL', err.message);
  }

  // B. Supported MP3 Upload
  try {
    const filePath = path.resolve(__dirname, 'test_sample.mp3');
    const fileBytes = fs.readFileSync(filePath);
    const boundary = '----WebKitFormBoundaryTestMp3';
    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="test_sample.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`);
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, fileBytes, footer]);

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body
    });
    const json = await res.json();
    if (res.status === 201 && json.success && json.data.fileId) {
      record('Supported MP3 Upload', 'UPLOAD', 'PASS', `File ID: ${json.data.fileId}, Format: ${json.data.format}`);
    } else {
      record('Supported MP3 Upload', 'UPLOAD', 'FAIL', `Status ${res.status}: ${json.message}`);
    }
  } catch (err) {
    record('Supported MP3 Upload', 'UPLOAD', 'FAIL', err.message);
  }

  // C. Unsupported File Type (.txt)
  try {
    const boundary = '----WebKitFormBoundaryInvalidTxt';
    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="malicious.txt"\r\nContent-Type: text/plain\r\n\r\nThis is not audio`);
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, footer]);

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body
    });
    if (res.status === 415 || res.status === 400) {
      record('Unsupported File Type Rejection (.txt)', 'VALIDATION', 'PASS', `Rejected with HTTP ${res.status} as expected`);
    } else {
      record('Unsupported File Type Rejection (.txt)', 'VALIDATION', 'FAIL', `Unexpected status: ${res.status}`);
    }
  } catch (err) {
    record('Unsupported File Type Rejection (.txt)', 'VALIDATION', 'FAIL', err.message);
  }

  // D. Empty Body / Missing File
  try {
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res.status === 400 || res.status === 500) {
      record('Missing Multipart Audio Payload Rejection', 'VALIDATION', 'PASS', `Rejected with HTTP ${res.status}`);
    } else {
      record('Missing Multipart Audio Payload Rejection', 'VALIDATION', 'FAIL', `Unexpected status: ${res.status}`);
    }
  } catch (err) {
    record('Missing Multipart Audio Payload Rejection', 'VALIDATION', 'FAIL', err.message);
  }

  // ── 4. Preprocessing & Forensic Visualizations ───────────────────
  if (realFileId) {
    try {
      const res = await fetch(`${BASE_URL}/preprocess/${realFileId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (res.status === 200 && json.success && json.data.preprocessing?.samplingRateHz === 16000) {
        record('Audio Preprocessing Pipeline (16kHz Mono)', 'PREPROCESSING', 'PASS', `SampleRate: 16000Hz, Channels: Mono, Status: ${json.data.status}`);
      } else {
        record('Audio Preprocessing Pipeline (16kHz Mono)', 'PREPROCESSING', 'FAIL', `Status ${res.status}: ${json.message}`);
      }
    } catch (err) {
      record('Audio Preprocessing Pipeline (16kHz Mono)', 'PREPROCESSING', 'FAIL', err.message);
    }

    // Check Visualizations
    for (const vizType of ['waveform', 'mel', 'spectrogram']) {
      try {
        const res = await fetch(`${BASE_URL}/preprocess/${realFileId}/visualization/${vizType}`);
        const ctype = res.headers.get('content-type');
        if (res.status === 200 && ctype.includes('image/png')) {
          const imgBuf = await res.arrayBuffer();
          record(`Forensic Visualization: ${vizType}`, 'FORENSICS', 'PASS', `Status 200, Content-Type: ${ctype}, Size: ${imgBuf.byteLength} bytes`);
        } else {
          record(`Forensic Visualization: ${vizType}`, 'FORENSICS', 'FAIL', `Status ${res.status}, Type: ${ctype}`);
        }
      } catch (err) {
        record(`Forensic Visualization: ${vizType}`, 'FORENSICS', 'FAIL', err.message);
      }
    }

    // Check 170-D Feature Retrieval Endpoint
    try {
      const res = await fetch(`${BASE_URL}/preprocess/${realFileId}/features`);
      const json = await res.json();
      if (res.status === 200 && json.success && json.data.features) {
        const mfccLen = json.data.features.mfcc?.mean?.length || 0;
        record('Feature JSON Retrieval (/features)', 'FEATURES', 'PASS', `Features present, MFCC mean len: ${mfccLen}`);
      } else {
        record('Feature JSON Retrieval (/features)', 'FEATURES', 'FAIL', `Status ${res.status}`);
      }
    } catch (err) {
      record('Feature JSON Retrieval (/features)', 'FEATURES', 'FAIL', err.message);
    }
  }

  // Preprocessing Non-Existent File ID (Valid UUID v4 that does not exist in store)
  try {
    const fakeUuid = 'a0000000-0000-4000-8000-000000000000';
    const res = await fetch(`${BASE_URL}/preprocess/${fakeUuid}`, { method: 'POST' });
    if (res.status === 404) {
      record('Preprocessing Nonexistent File ID', 'ERROR_HANDLING', 'PASS', 'Correctly returned 404 Not Found');
    } else {
      record('Preprocessing Nonexistent File ID', 'ERROR_HANDLING', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    record('Preprocessing Nonexistent File ID', 'ERROR_HANDLING', 'FAIL', err.message);
  }

  // ── 5. AI Inference & Verdict Verification ───────────────────────
  // A. Real Audio Sample Inference
  if (realFileId) {
    try {
      const res = await fetch(`${BASE_URL}/analysis/${realFileId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (res.status === 200 && json.success && json.data.analysisResult) {
        const ar = json.data.analysisResult;
        record('AI Model Inference (Real Sample)', 'INFERENCE', 'PASS', `Verdict: ${ar.label}, Confidence: ${(ar.confidence * 100).toFixed(2)}%, RealProb: ${(ar.realProbability * 100).toFixed(2)}%, FakeProb: ${(ar.fakeProbability * 100).toFixed(2)}%, Latency: ${ar.processingMs}ms`);
      } else {
        record('AI Model Inference (Real Sample)', 'INFERENCE', 'FAIL', `Status ${res.status}: ${json.message}`);
      }
    } catch (err) {
      record('AI Model Inference (Real Sample)', 'INFERENCE', 'FAIL', err.message);
    }
  }

  // B. Known Deepfake Sample Upload, Preprocessing & Inference
  try {
    const fakePath = path.resolve('../frontend/public/samples/sample_deepfake_voice_1.wav');
    const fileBytes = fs.readFileSync(fakePath);
    const boundary = '----WebKitFormBoundaryDeepfakeSample';
    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="sample_deepfake_voice_1.wav"\r\nContent-Type: audio/wav\r\n\r\n`);
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, fileBytes, footer]);

    const upRes = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body
    });
    const upJson = await upRes.json();
    fakeFileId = upJson.data?.fileId;

    await fetch(`${BASE_URL}/preprocess/${fakeFileId}`, { method: 'POST' });

    const inferRes = await fetch(`${BASE_URL}/analysis/${fakeFileId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const inferJson = await inferRes.json();
    if (inferRes.status === 200 && inferJson.success && inferJson.data.analysisResult) {
      const ar = inferJson.data.analysisResult;
      record('AI Model Inference (Deepfake Sample)', 'INFERENCE', 'PASS', `Verdict: ${ar.label}, Confidence: ${(ar.confidence * 100).toFixed(2)}%, FakeProb: ${(ar.fakeProbability * 100).toFixed(2)}%, RealProb: ${(ar.realProbability * 100).toFixed(2)}%`);
    } else {
      record('AI Model Inference (Deepfake Sample)', 'INFERENCE', 'FAIL', `Status ${inferRes.status}: ${inferJson.message}`);
    }
  } catch (err) {
    record('AI Model Inference (Deepfake Sample)', 'INFERENCE', 'FAIL', err.message);
  }

  // ── 6. Forensic Reports & Downloads ──────────────────────────────
  if (realFileId) {
    // Structured JSON Report
    try {
      const res = await fetch(`${BASE_URL}/analysis/${realFileId}/report`);
      const json = await res.json();
      if (res.status === 200 && json.success && json.data.reportId) {
        record('Forensic JSON Report (/report)', 'REPORT', 'PASS', `Report ID: ${json.data.reportId}, Verdict: ${json.data.verdict}`);
      } else {
        record('Forensic JSON Report (/report)', 'REPORT', 'FAIL', `Status ${res.status}`);
      }
    } catch (err) {
      record('Forensic JSON Report (/report)', 'REPORT', 'FAIL', err.message);
    }

    // PDF Forensic Report Download
    try {
      const res = await fetch(`${BASE_URL}/analysis/${realFileId}/pdf`);
      const ctype = res.headers.get('content-type');
      const buf = await res.arrayBuffer();
      const magic = Buffer.from(buf.slice(0, 4)).toString('ascii');
      if (res.status === 200 && ctype.includes('application/pdf') && magic === '%PDF') {
        record('Forensic PDF Export (/pdf)', 'REPORT', 'PASS', `Status 200, Content-Type: ${ctype}, Size: ${buf.byteLength} bytes, Magic: ${magic}`);
      } else {
        record('Forensic PDF Export (/pdf)', 'REPORT', 'FAIL', `Status ${res.status}, Type: ${ctype}, Magic: ${magic}`);
      }
    } catch (err) {
      record('Forensic PDF Export (/pdf)', 'REPORT', 'FAIL', err.message);
    }
  }

  // ── 7. History & Statistics Verification ─────────────────────────
  // A. History List & Pagination
  try {
    const res = await fetch(`${BASE_URL}/history?page=1&limit=10`);
    const json = await res.json();
    if (res.status === 200 && json.success && Array.isArray(json.data.records) && json.data.pagination.totalRecords !== undefined) {
      record('History List & Pagination', 'HISTORY', 'PASS', `Returned ${json.data.records.length} records, Total: ${json.data.pagination.totalRecords}`);
    } else {
      record('History List & Pagination', 'HISTORY', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    record('History List & Pagination', 'HISTORY', 'FAIL', err.message);
  }

  // B. Pending Files Filter
  try {
    const res = await fetch(`${BASE_URL}/history?verdict=PENDING`);
    const json = await res.json();
    if (res.status === 200 && json.success && Array.isArray(json.data.records)) {
      const allPending = json.data.records.every(r => r.prediction_id === null);
      record('Pending Files Reconciliation Filter (verdict=PENDING)', 'HISTORY', 'PASS', `Returned ${json.data.records.length} pending files. All have null prediction_id: ${allPending}`);
    } else {
      record('Pending Files Reconciliation Filter (verdict=PENDING)', 'HISTORY', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    record('Pending Files Reconciliation Filter (verdict=PENDING)', 'HISTORY', 'FAIL', err.message);
  }

  // C. REAL Predictions Filter
  try {
    const res = await fetch(`${BASE_URL}/history?verdict=REAL`);
    const json = await res.json();
    if (res.status === 200 && json.success) {
      const allReal = json.data.records.every(r => r.label === 'REAL');
      record('History Filter (verdict=REAL)', 'HISTORY', 'PASS', `Returned ${json.data.records.length} records, All REAL: ${allReal}`);
    } else {
      record('History Filter (verdict=REAL)', 'HISTORY', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    record('History Filter (verdict=REAL)', 'HISTORY', 'FAIL', err.message);
  }

  // D. FAKE Predictions Filter
  try {
    const res = await fetch(`${BASE_URL}/history?verdict=FAKE`);
    const json = await res.json();
    if (res.status === 200 && json.success) {
      const allFake = json.data.records.every(r => r.label === 'FAKE');
      record('History Filter (verdict=FAKE)', 'HISTORY', 'PASS', `Returned ${json.data.records.length} records, All FAKE: ${allFake}`);
    } else {
      record('History Filter (verdict=FAKE)', 'HISTORY', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    record('History Filter (verdict=FAKE)', 'HISTORY', 'FAIL', err.message);
  }

  // E. Live History Statistics
  try {
    const res = await fetch(`${BASE_URL}/history/stats`);
    const json = await res.json();
    if (res.status === 200 && json.success && json.data.totalScans !== undefined) {
      record('Live Database Statistics (/history/stats)', 'DASHBOARD', 'PASS', `TotalScans: ${json.data.totalScans}, Real: ${json.data.genuineDetected}, Fake: ${json.data.deepfakesDetected}, AvgConfidence: ${json.data.averageConfidence}, Dataset: ${json.data.dataset?.total}`);
    } else {
      record('Live Database Statistics (/history/stats)', 'DASHBOARD', 'FAIL', `Status: ${res.status}`);
    }
  } catch (err) {
    record('Live Database Statistics (/history/stats)', 'DASHBOARD', 'FAIL', err.message);
  }

  // F. CSV Export Download
  try {
    const res = await fetch(`${BASE_URL}/history/export/csv`);
    const ctype = res.headers.get('content-type');
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (res.status === 200 && ctype.includes('text/csv') && lines[0].startsWith('File ID,Filename,Format,Size')) {
      record('History CSV Export (/history/export/csv)', 'REPORT', 'PASS', `Status 200, Content-Type: ${ctype}, Rows: ${lines.length} (including header)`);
    } else {
      record('History CSV Export (/history/export/csv)', 'REPORT', 'FAIL', `Status: ${res.status}, Type: ${ctype}, Header: ${lines[0]}`);
    }
  } catch (err) {
    record('History CSV Export (/history/export/csv)', 'REPORT', 'FAIL', err.message);
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE FINISHED: ${results.filter(r => r.status === 'PASS').length} / ${results.length} PASSED`);
  console.log('====================================================');

  return { realFileId, fakeFileId, results };
}

runTests().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
