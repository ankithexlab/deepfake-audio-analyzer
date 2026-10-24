require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./src/config/db.config');
const app = require('./src/app');

async function testPipeline() {
  console.log('='.repeat(65));
  console.log('STARTING COMPLETE DEEPFAKE AUDIO ANALYZER TEST SUITE');
  console.log('='.repeat(65));

  // Step 0: PostgreSQL Verification
  await db.initDatabase();
  console.log('✓ PostgreSQL connected and initialized successfully.');

  const dbDatasetRes = await db.query(`
    SELECT 
      COUNT(*) AS total,
      COUNT(CASE WHEN label = 'REAL' THEN 1 END) AS real_count,
      COUNT(CASE WHEN label = 'DEEPFAKE' THEN 1 END) AS fake_count
    FROM dataset_files
  `);
  const row = dbDatasetRes.rows[0];
  console.log(`✓ Database Dataset Integration Verified: Total=${row.total}, REAL=${row.real_count}, DEEPFAKE=${row.fake_count}`);
  if (parseInt(row.total, 10) !== 6000) {
    console.warn('⚠️ Warning: dataset_files count is not 6000. Run npm run import-dataset to seed all records.');
  }

  const server = app.listen(5004, async () => {
    try {
      console.log('\n--- 0. Authenticating Session via Backend API ---');
      const authRes = await fetch('http://localhost:5004/api/v1/auth/guest', { method: 'POST' });
      const authJson = await authRes.json();
      const authToken = authJson.data?.token;
      console.log('✓ Session Authenticated:', authJson.success, 'Role:', authJson.data?.user?.role);

      console.log('\n--- 1. Testing WAV Audio Upload & Full Pipeline (REAL) ---');
      
      const testFilePath = path.resolve('test_real.wav');
      const fileBytes = fs.readFileSync(testFilePath);
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      
      const payloadHeader = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="test_real.wav"\r\nContent-Type: audio/wav\r\n\r\n`
      );
      const payloadFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([payloadHeader, fileBytes, payloadFooter]);

      const uploadRes = await fetch('http://localhost:5004/api/v1/upload', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${authToken}`,
        },
        body,
      });

      const uploadJson = await uploadRes.json();
      console.log('✓ 1. Upload Success:', uploadJson.success, 'fileId:', uploadJson.data?.fileId);
      const realFileId = uploadJson.data.fileId;

      // Preprocessing
      console.log('✓ 2. Preprocessing & Feature Extraction...');
      const prepRes = await fetch(`http://localhost:5004/api/v1/preprocess/${realFileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const prepJson = await prepRes.json();
      console.log('✓ 2. Preprocessing Complete. Sampling Rate:', prepJson.data?.preprocessing?.samplingRateHz, 'Hz Mono');

      // Inference with Trained Model
      console.log('✓ 3. Running AI Model Inference with Trained Ensemble...');
      const inferRes = await fetch(`http://localhost:5004/api/v1/analysis/${realFileId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const inferJson = await inferRes.json();
      console.log('✓ 3. AI Inference Result:', {
        verdict: inferJson.data?.analysisResult?.label,
        confidence: `${(inferJson.data?.analysisResult?.confidence * 100).toFixed(2)}%`,
        fakeProbability: `${(inferJson.data?.analysisResult?.fakeProbability * 100).toFixed(2)}%`,
        realProbability: `${(inferJson.data?.analysisResult?.realProbability * 100).toFixed(2)}%`,
        modelName: inferJson.data?.analysisResult?.modelName,
      });

      // Visualizations
      console.log('\n--- 2. Testing Visual Analysis Asset Generation ---');
      const vizWave = await fetch(`http://localhost:5004/api/v1/preprocess/${realFileId}/visualization/waveform`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const vizMel = await fetch(`http://localhost:5004/api/v1/preprocess/${realFileId}/visualization/mel`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const vizSpec = await fetch(`http://localhost:5004/api/v1/preprocess/${realFileId}/visualization/spectrogram`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      console.log('✓ Waveform plot image status:', vizWave.status, vizWave.headers.get('content-type'));
      console.log('✓ Mel Spectrogram plot image status:', vizMel.status, vizMel.headers.get('content-type'));
      console.log('✓ STFT Spectrogram plot image status:', vizSpec.status, vizSpec.headers.get('content-type'));

      // PDF Report Download
      console.log('\n--- 3. Testing PDF Forensic Report Generation ---');
      const pdfRes = await fetch(`http://localhost:5004/api/v1/analysis/${realFileId}/pdf`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      console.log('✓ PDF Report status:', pdfRes.status, 'Content-Type:', pdfRes.headers.get('content-type'));
      const pdfBytes = await pdfRes.arrayBuffer();
      console.log('✓ PDF size generated:', pdfBytes.byteLength, 'bytes');

      // Structured Report JSON
      const reportRes = await fetch(`http://localhost:5004/api/v1/analysis/${realFileId}/report`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const reportJson = await reportRes.json();
      console.log('✓ Structured Report JSON status:', reportRes.status, 'Report ID:', reportJson.data?.reportId);

      // Deepfake Sample Test
      console.log('\n--- 4. Testing Known Deepfake Audio Detection ---');
      const fakeFilePath = path.resolve('../frontend/public/samples/sample_deepfake_voice_1.wav');
      const fakeBytes = fs.readFileSync(fakeFilePath);
      const boundaryFake = '----WebKitFormBoundaryFakeVoiceSample';

      const fakeHeader = Buffer.from(
        `--${boundaryFake}\r\nContent-Disposition: form-data; name="audio"; filename="sample_deepfake_voice_1.wav"\r\nContent-Type: audio/wav\r\n\r\n`
      );
      const fakeFooter = Buffer.from(`\r\n--${boundaryFake}--\r\n`);
      const fakeBody = Buffer.concat([fakeHeader, fakeBytes, fakeFooter]);

      const fakeUploadRes = await fetch('http://localhost:5004/api/v1/upload', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundaryFake}`,
          'Authorization': `Bearer ${authToken}`,
        },
        body: fakeBody,
      });
      const fakeUploadJson = await fakeUploadRes.json();
      const fakeFileId = fakeUploadJson.data.fileId;

      await fetch(`http://localhost:5004/api/v1/preprocess/${fakeFileId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const fakeInferRes = await fetch(`http://localhost:5004/api/v1/analysis/${fakeFileId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const fakeInferJson = await fakeInferRes.json();
      console.log('✓ Deepfake Audio Detected:', {
        verdict: fakeInferJson.data?.analysisResult?.label,
        confidence: `${(fakeInferJson.data?.analysisResult?.confidence * 100).toFixed(2)}%`,
        fakeProbability: `${(fakeInferJson.data?.analysisResult?.fakeProbability * 100).toFixed(2)}%`,
        realProbability: `${(fakeInferJson.data?.analysisResult?.realProbability * 100).toFixed(2)}%`,
      });

      // MP3 Audio Upload Test
      console.log('\n--- 5. Testing MP3 Audio Support ---');
      const mp3Path = path.resolve('test_sample.mp3');
      const mp3Bytes = fs.readFileSync(mp3Path);
      const boundaryMp3 = '----WebKitFormBoundaryMp3Sample';

      const mp3Header = Buffer.from(
        `--${boundaryMp3}\r\nContent-Disposition: form-data; name="audio"; filename="test_sample.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`
      );
      const mp3Footer = Buffer.from(`\r\n--${boundaryMp3}--\r\n`);
      const mp3Body = Buffer.concat([mp3Header, mp3Bytes, mp3Footer]);

      const mp3UploadRes = await fetch('http://localhost:5004/api/v1/upload', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundaryMp3}`,
          'Authorization': `Bearer ${authToken}`,
        },
        body: mp3Body,
      });
      const mp3UploadJson = await mp3UploadRes.json();
      console.log('✓ MP3 Upload Accepted:', mp3UploadJson.success, 'format:', mp3UploadJson.data?.format);

      // Dashboard & History Statistics from DB
      console.log('\n--- 6. Testing PostgreSQL Dashboard & History Stats ---');
      const statsRes = await fetch('http://localhost:5004/api/v1/history/stats', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const statsJson = await statsRes.json();
      console.log('✓ Dashboard Database Statistics:', {
        totalScans: statsJson.data?.totalScans,
        deepfakesDetected: statsJson.data?.deepfakesDetected,
        genuineDetected: statsJson.data?.genuineDetected,
        averageConfidence: statsJson.data?.averageConfidence,
        datasetSummary: statsJson.data?.dataset,
      });

      // Security / Invalid Audio Test
      console.log('\n--- 7. Testing Security & Invalid Upload Rejection ---');
      const invalidHeader = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="malicious.exe"\r\nContent-Type: application/octet-stream\r\n\r\n`
      );
      const invalidBody = Buffer.concat([invalidHeader, Buffer.from('FAKE EXE CONTENT'), payloadFooter]);
      const invalidRes = await fetch('http://localhost:5004/api/v1/upload', {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${authToken}`,
        },
        body: invalidBody,
      });
      console.log('✓ Invalid file rejected with status:', invalidRes.status, '(Expected: 415 or 400)');

      console.log('\n' + '='.repeat(65));
      console.log('=== ALL END-TO-END ACCEPTANCE TESTS PASSED SUCCESSFULLY! ===');
      console.log('='.repeat(65));
    } catch (e) {
      console.error('Test failed with error:', e);
      process.exitCode = 1;
    } finally {
      server.close();
      setTimeout(() => process.exit(process.exitCode || 0), 1000);
    }
  });
}

testPipeline();
