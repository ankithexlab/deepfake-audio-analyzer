require('dotenv').config();
const db = require('./src/config/db.config');
const app = require('./src/app');
const path = require('path');
const fs = require('fs');

async function runAuthSecurityTests() {
  console.log('='.repeat(70));
  console.log('AUTHENTICATION & AUTHORIZATION SECURITY AUDIT TEST SUITE');
  console.log('='.repeat(70));

  await db.initDatabase();

  const server = app.listen(5005, async () => {
    let passed = 0;
    let failed = 0;

    function assert(cond, name, details = '') {
      if (cond) {
        passed++;
        console.log(`✓ [PASS] ${name}${details ? ': ' + details : ''}`);
      } else {
        failed++;
        console.error(`✗ [FAIL] ${name}${details ? ': ' + details : ''}`);
      }
    }

    try {
      const BASE = 'http://localhost:5005/api/v1';

      // ── TEST 1: Unauthenticated Requests return 401 ─────────────────
      console.log('\n--- 1. Testing Unauthenticated Route Protection ---');
      const unauthHistory = await fetch(`${BASE}/history`);
      assert(unauthHistory.status === 401, 'Unauthenticated /history blocked with 401');

      const unauthStats = await fetch(`${BASE}/history/stats`);
      assert(unauthStats.status === 401, 'Unauthenticated /history/stats blocked with 401');

      const unauthExport = await fetch(`${BASE}/history/export/csv`);
      assert(unauthExport.status === 401, 'Unauthenticated /history/export/csv blocked with 401');

      const unauthUpload = await fetch(`${BASE}/upload`, { method: 'POST' });
      assert(unauthUpload.status === 401, 'Unauthenticated /upload blocked with 401');

      const unauthPreprocess = await fetch(`${BASE}/preprocess/00000000-0000-0000-0000-000000000000`, { method: 'POST' });
      assert(unauthPreprocess.status === 401, 'Unauthenticated /preprocess/:id blocked with 401');

      const unauthAnalysis = await fetch(`${BASE}/analysis/00000000-0000-0000-0000-000000000000/run`, { method: 'POST' });
      assert(unauthAnalysis.status === 401, 'Unauthenticated /analysis/:id/run blocked with 401');

      const unauthReport = await fetch(`${BASE}/analysis/00000000-0000-0000-0000-000000000000/report`);
      assert(unauthReport.status === 401, 'Unauthenticated /analysis/:id/report blocked with 401');

      const unauthPdf = await fetch(`${BASE}/analysis/00000000-0000-0000-0000-000000000000/pdf`);
      assert(unauthPdf.status === 401, 'Unauthenticated /analysis/:id/pdf blocked with 401');

      const unauthMe = await fetch(`${BASE}/auth/me`);
      assert(unauthMe.status === 401, 'Unauthenticated /auth/me blocked with 401');

      // ── TEST 2: Invalid/Expired Token returns 401 ───────────────────
      console.log('\n--- 2. Testing Invalid / Forged JWT Token Rejection ---');
      const invalidTokenRes = await fetch(`${BASE}/auth/me`, {
        headers: { 'Authorization': 'Bearer fake.invalid.jwt.token' }
      });
      assert(invalidTokenRes.status === 401, 'Forged JWT rejected with 401');

      // ── TEST 3: Validation and Error Handling on Signup ───────────────
      console.log('\n--- 3. Testing Signup Validation & Error Handling ---');
      const missingFields = await fetch(`${BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });
      assert(missingFields.status === 400, 'Missing signup fields rejected with 400');

      const weakPw = await fetch(`${BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Short', email: 'short@example.com', password: '123' }),
      });
      assert(weakPw.status === 400, 'Short password (<6 chars) rejected with 400');

      // ── TEST 4: Valid Signup & Account Creation in PostgreSQL ────────
      console.log('\n--- 4. Testing Valid User Signup & Session Generation ---');
      const testEmail1 = `user_alice_${Date.now()}@aura-security.com`;
      const signupRes1 = await fetch(`${BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Security',
          email: testEmail1,
          password: 'Password123!',
        }),
      });
      const signupJson1 = await signupRes1.json();
      assert(signupRes1.status === 201 && signupJson1.success && signupJson1.data?.token, 'Valid signup creates account (201)');
      const aliceToken = signupJson1.data?.token;
      const aliceUser = signupJson1.data?.user;

      // Verify user in PostgreSQL
      const dbUser1 = await db.query('SELECT id, name, email, role, password_hash FROM users WHERE email = $1', [testEmail1]);
      assert(
        dbUser1.rows.length === 1 && dbUser1.rows[0].password_hash.startsWith('$2'),
        'User verified in PostgreSQL with bcrypt password_hash'
      );

      // Duplicate email rejection
      const duplicateSignup = await fetch(`${BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Duplicate',
          email: testEmail1,
          password: 'Password123!',
        }),
      });
      assert(duplicateSignup.status === 409, 'Duplicate email registration rejected with 409');

      // ── TEST 5: Login & Credentials Validation ──────────────────────
      console.log('\n--- 5. Testing Login Authentication ---');
      const wrongPw = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail1, password: 'WrongPassword' }),
      });
      assert(wrongPw.status === 401, 'Invalid password rejected with 401');

      const nonexistentUser = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ghost_user_9999@example.com', password: 'Password123!' }),
      });
      assert(nonexistentUser.status === 401, 'Nonexistent user rejected with 401');

      const validLogin = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail1, password: 'Password123!' }),
      });
      const loginJson = await validLogin.json();
      assert(validLogin.status === 200 && loginJson.data?.token, 'Valid login returns 200 and JWT token');

      // Test Session Profile Verification (/auth/me)
      const meRes = await fetch(`${BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
      });
      const meJson = await meRes.json();
      assert(meRes.status === 200 && meJson.data?.user?.email === testEmail1, 'Valid session preserves profile via /auth/me');

      // ── TEST 6: User Isolation & Cross-User Privacy ───────────────────
      console.log('\n--- 6. Testing Cross-User Data Isolation & Ownership ---');
      // Create User 2 (Bob)
      const testEmail2 = `user_bob_${Date.now()}@aura-security.com`;
      const signupRes2 = await fetch(`${BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bob Examiner',
          email: testEmail2,
          password: 'Password123!',
        }),
      });
      const signupJson2 = await signupRes2.json();
      const bobToken = signupJson2.data?.token;

      // Alice uploads an audio file
      const testFilePath = path.resolve('test_real.wav');
      const fileBytes = fs.readFileSync(testFilePath);
      const boundary = '----WebKitFormBoundaryAliceFile';
      const payloadHeader = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="alice_secret_audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`
      );
      const payloadFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body = Buffer.concat([payloadHeader, fileBytes, payloadFooter]);

      const aliceUpload = await fetch(`${BASE}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${aliceToken}`,
        },
        body,
      });
      const aliceUploadJson = await aliceUpload.json();
      const aliceFileId = aliceUploadJson.data?.fileId;
      assert(aliceUpload.status === 201 && aliceFileId, 'Alice uploaded file successfully', `fileId: ${aliceFileId}`);

      // Verify Alice file has her user_id in DB
      const dbFileCheck = await db.query('SELECT user_id FROM audio_files WHERE id = $1', [aliceFileId]);
      assert(dbFileCheck.rows[0].user_id === aliceUser.id, 'File is strictly linked to Alice in PostgreSQL');

      // Bob attempts to access Alice's status -> should be FORBIDDEN 403
      const bobAccessStatus = await fetch(`${BASE}/analysis/${aliceFileId}`, {
        headers: { 'Authorization': `Bearer ${bobToken}` }
      });
      assert(bobAccessStatus.status === 403, "Bob cannot check status of Alice's private file (403 Forbidden)");

      // Bob attempts to run analysis on Alice's file -> should be FORBIDDEN 403
      const bobRunAnalysis = await fetch(`${BASE}/analysis/${aliceFileId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bobToken}`,
        }
      });
      assert(bobRunAnalysis.status === 403, "Bob cannot run analysis on Alice's private file (403 Forbidden)");

      // Bob calls GET /history -> should NOT see Alice's file
      const bobHistory = await fetch(`${BASE}/history`, {
        headers: { 'Authorization': `Bearer ${bobToken}` }
      });
      const bobHistoryJson = await bobHistory.json();
      const foundInBob = bobHistoryJson.data?.records?.find(r => r.file_id === aliceFileId);
      assert(!foundInBob, "Bob's private history does NOT contain Alice's scan");

      // Alice calls GET /history -> SHOULD see her file
      const aliceHistory = await fetch(`${BASE}/history`, {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
      });
      const aliceHistoryJson = await aliceHistory.json();
      const foundInAlice = aliceHistoryJson.data?.records?.find(r => r.file_id === aliceFileId);
      assert(Boolean(foundInAlice), "Alice's private history contains her own scan");

      // Bob attempts to delete Alice's file -> should be FORBIDDEN 403
      const bobDelete = await fetch(`${BASE}/history/${aliceFileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${bobToken}` }
      });
      assert(bobDelete.status === 403, "Bob cannot delete Alice's scan record (403 Forbidden)");

      // Alice can delete her own file
      const aliceDelete = await fetch(`${BASE}/history/${aliceFileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${aliceToken}` }
      });
      assert(aliceDelete.status === 200, "Alice can delete her own scan record (200 OK)");

      // Cleanup test users from DB
      await db.query('DELETE FROM users WHERE email IN ($1, $2)', [testEmail1, testEmail2]);
      console.log('✓ Cleaned up test audit user records from PostgreSQL.');

      // ── TEST 7: Demo User Integrity ─────────────────────────────────
      console.log('\n--- 7. Verifying Demo User Integrity ---');
      const demoUserCheck = await db.query("SELECT id, name, email, role FROM users WHERE email = 'demo@aura.ai'");
      assert(
        demoUserCheck.rows.length === 1 && demoUserCheck.rows[0].role === 'guest',
        'Demo user demo@aura.ai exists with role guest (untouched and intact)'
      );

      console.log('\n' + '='.repeat(70));
      console.log(`SECURITY AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED.`);
      console.log('='.repeat(70));

      if (failed > 0) {
        process.exitCode = 1;
      }
    } catch (err) {
      console.error('Audit suite encountered error:', err);
      process.exitCode = 1;
    } finally {
      server.close();
      setTimeout(() => process.exit(process.exitCode || 0), 500);
    }
  });
}

runAuthSecurityTests();
