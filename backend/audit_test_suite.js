const fs = require('fs');

async function runAuditTests() {
  const baseUrl = 'http://localhost:5000/api/v1';
  console.log('='.repeat(65));
  console.log('PHASE 2 BACKEND & API AUDIT TEST SUITE');
  console.log('Target Base URL:', baseUrl);
  console.log('='.repeat(65));

  const results = [];

  async function check(name, testFn) {
    try {
      const res = await testFn();
      results.push({ name, status: 'PASS', detail: res });
      console.log(`[PASS] ${name}: ${JSON.stringify(res)}`);
    } catch (err) {
      results.push({ name, status: 'FAIL', error: err.message });
      console.log(`[FAIL] ${name}: ${err.message}`);
    }
  }

  // 1. Health Endpoint
  await check('GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const json = await res.json();
    if (res.status !== 200 || json.data?.status !== 'ok') {
      throw new Error(`Expected 200 & status ok, got ${res.status}: ${JSON.stringify(json)}`);
    }
    return { status: res.status, model: json.data?.model };
  });

  // 2. Auth - Guest Demo Login
  let guestToken = null;
  await check('POST /auth/guest', async () => {
    const res = await fetch(`${baseUrl}/auth/guest`, { method: 'POST' });
    const json = await res.json();
    if (res.status !== 200 || !json.data?.token || json.data?.user?.role !== 'guest') {
      throw new Error(`Expected 200 with token and role 'guest', got ${res.status} role: ${json.data?.user?.role}`);
    }
    guestToken = json.data.token;
    return { status: res.status, userEmail: json.data.user.email, role: json.data.user.role };
  });

  // 3. Auth - Me without token (Unauthenticated check)
  await check('GET /auth/me (Unauthorized without token)', async () => {
    const res = await fetch(`${baseUrl}/auth/me`);
    const json = await res.json();
    const code = json.error?.code;
    if (res.status !== 401 || code !== 'AUTH_TOKEN_MISSING') {
      throw new Error(`Expected 401 AUTH_TOKEN_MISSING, got ${res.status} ${code}`);
    }
    return { status: res.status, code };
  });

  // 4. Auth - Me with valid Guest Token
  await check('GET /auth/me (Authorized with Bearer token)', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${guestToken}` }
    });
    const json = await res.json();
    if (res.status !== 200 || !json.data?.user || json.data?.user?.role !== 'guest') {
      throw new Error(`Expected 200 with user role 'guest', got ${res.status} role: ${json.data?.user?.role}`);
    }
    return { status: res.status, email: json.data.user.email, role: json.data.user.role };
  });

  // 5. Auth - Invalid Credentials Login
  await check('POST /auth/login (Invalid credentials rejection)', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_test_user@invalid.com', password: 'wrongpassword' })
    });
    const json = await res.json();
    const code = json.error?.code;
    if (res.status !== 401 || code !== 'INVALID_CREDENTIALS') {
      throw new Error(`Expected 401 INVALID_CREDENTIALS, got ${res.status} ${code}`);
    }
    return { status: res.status, code };
  });

  // 6. History Stats (Audit 39 vs 52)
  await check('GET /history/stats', async () => {
    const res = await fetch(`${baseUrl}/history/stats`);
    const json = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    return {
      status: res.status,
      totalScans: json.data?.totalScans,
      totalAudioFiles: json.data?.totalAudioFiles,
      pendingScans: json.data?.pendingScans,
      deepfakes: json.data?.deepfakesDetected,
      genuine: json.data?.genuineDetected,
      confidence: json.data?.averageConfidence,
      dataset: json.data?.dataset
    };
  });

  // 7. History Records & Pagination
  let sampleCompletedFileId = null;
  let samplePendingFileId = null;
  await check('GET /history (Pagination and record query)', async () => {
    const res = await fetch(`${baseUrl}/history?page=1&limit=5`);
    const json = await res.json();
    if (res.status !== 200 || !json.data?.records) throw new Error(`Expected 200 with records, got ${res.status}`);
    const records = json.data.records;
    for (const r of records) {
      if (r.label && !sampleCompletedFileId) sampleCompletedFileId = r.file_id;
      if (!r.label && !samplePendingFileId) samplePendingFileId = r.file_id;
    }
    return {
      status: res.status,
      countReturned: records.length,
      totalRecords: json.data.pagination.totalRecords,
      totalPages: json.data.pagination.totalPages
    };
  });

  // 8. CSV Export
  await check('GET /history/export/csv', async () => {
    const res = await fetch(`${baseUrl}/history/export/csv`);
    const text = await res.text();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const lines = text.trim().split('\n');
    return {
      status: res.status,
      contentType: res.headers.get('content-type'),
      headerLine: lines[0],
      rowCount: lines.length - 1
    };
  });

  // 9. AI Model Info
  await check('GET /analysis/model-info', async () => {
    const res = await fetch(`${baseUrl}/analysis/model-info`);
    const json = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    return {
      status: res.status,
      name: json.data?.name,
      version: json.data?.version,
      ready: json.data?.ready,
      featureDim: json.data?.featureDimensions
    };
  });

  // 10. Upload Validation: Missing Audio File
  await check('POST /upload (Validation: empty payload)', async () => {
    const res = await fetch(`${baseUrl}/upload`, {
      method: 'POST'
    });
    const json = await res.json();
    const code = json.error?.code;
    if (res.status !== 400 || code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR, got ${res.status} ${code}`);
    }
    return { status: res.status, code, message: json.message };
  });

  // 11. Preprocess Validation: Invalid UUID param
  await check('GET /preprocess/not-a-valid-uuid (Validation: Malformed UUID)', async () => {
    const res = await fetch(`${baseUrl}/preprocess/not-a-valid-uuid`);
    const json = await res.json();
    const code = json.error?.code;
    if (res.status !== 400 || code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR, got ${res.status} ${code}`);
    }
    return { status: res.status, code };
  });

  // 12. Preprocess: Non-existent UUID
  await check('GET /preprocess/00000000-0000-4000-8000-000000000000 (Non-existent file)', async () => {
    const res = await fetch(`${baseUrl}/preprocess/00000000-0000-4000-8000-000000000000`);
    const json = await res.json();
    const code = json.error?.code;
    if (res.status !== 404 || code !== 'FILE_NOT_FOUND') {
      throw new Error(`Expected 404 FILE_NOT_FOUND, got ${res.status} ${code}`);
    }
    return { status: res.status, code };
  });

  // 13. PDF Report for Completed Scan (if sampleCompletedFileId exists)
  if (sampleCompletedFileId) {
    await check(`GET /analysis/${sampleCompletedFileId}/pdf (PDF generation for real scan)`, async () => {
      const res = await fetch(`${baseUrl}/analysis/${sampleCompletedFileId}/pdf`);
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const buf = await res.arrayBuffer();
      return {
        status: res.status,
        contentType: res.headers.get('content-type'),
        bytes: buf.byteLength
      };
    });

    await check(`GET /analysis/${sampleCompletedFileId}/report (Structured JSON report)`, async () => {
      const res = await fetch(`${baseUrl}/analysis/${sampleCompletedFileId}/report`);
      const json = await res.json();
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      return {
        status: res.status,
        reportId: json.data?.reportId,
        verdict: json.data?.verdict,
        confidence: json.data?.confidence
      };
    });
  }

  console.log('='.repeat(65));
  console.log(`TOTAL AUDIT CHECKS: ${results.length}`);
  const passCount = results.filter(r => r.status === 'PASS').length;
  console.log(`PASSED: ${passCount} / ${results.length}`);
  console.log('='.repeat(65));
}

runAuditTests().catch(console.error);
