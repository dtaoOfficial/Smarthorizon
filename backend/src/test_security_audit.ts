import prisma from './db';
import { generateAccessToken } from './utils/jwt';
import http from 'http';

async function makeRequest(options: {
  path: string;
  method?: string;
  token?: string;
  body?: any;
}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = options.body ? JSON.stringify(options.body) : '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }
    if (options.body) {
      headers['Content-Length'] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path: options.path,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          let parsed = responseData;
          try {
            parsed = JSON.parse(responseData);
          } catch (e) {}
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (options.body) {
      req.write(postData);
    }
    req.end();
  });
}

async function runSecurityTests() {
  console.log('==================================================');
  console.log('🔒 ADVERSARIAL SECOND-PASS SECURITY TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assertTest(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.log(`❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    const adminUser = await prisma.user.findFirst({ where: { roleId: 'ADMINISTRATOR' } });
    const judgeUser = await prisma.user.findFirst({ where: { roleId: 'JUDGE' } });
    const studentUsers = await prisma.user.findMany({
      where: { roleId: 'STUDENT' },
      take: 2,
    });
    const teams = await prisma.team.findMany({ take: 2, include: { members: true } });

    if (!adminUser || !judgeUser || studentUsers.length < 2 || teams.length < 2) {
      console.log('⚠️ Warning: Database needs 1 Admin, 1 Judge, 2 Students, and 2 Teams for testing.');
      return;
    }

    const adminToken = generateAccessToken({ userId: adminUser.id, role: 'ADMINISTRATOR', email: adminUser.email });
    const judgeToken = generateAccessToken({ userId: judgeUser.id, role: 'JUDGE', email: judgeUser.email });
    const student1Token = generateAccessToken({ userId: studentUsers[0].id, role: 'STUDENT', email: studentUsers[0].email });

    const teamA = teams[0];
    const teamB = teams[1];

    console.log(`Context:
    - Admin: ${adminUser.email}
    - Judge: ${judgeUser.email}
    - Student A: ${studentUsers[0].email} (Team A: ${teamA.name})
    - Student B: ${studentUsers[1].email} (Team B: ${teamB.name})
    `);

    // TEST 1: Long-lived access JWT in query parameter -> REJECTED (401)
    const res1 = await makeRequest({ path: `/api/submissions/download/${teamA.id}?token=${adminToken}` });
    assertTest('Long-lived access JWT in URL query string -> REJECTED (401)', res1.status === 401);

    // TEST 2: Direct access to /uploads static path -> REJECTED (404)
    const res2 = await makeRequest({ path: '/uploads/submissions/test.pdf' });
    assertTest('Direct unauthenticated access to /uploads -> REJECTED (404)', res2.status === 404);

    // TEST 3: Issue Short-Lived Single-Use Download Token -> GRANTED (200)
    const res3 = await makeRequest({
      path: `/api/submissions/download-token/${teamA.id}`,
      method: 'POST',
      token: adminToken,
    });
    assertTest('Admin requesting single-use download token -> GRANTED (200)', res3.status === 200 && Boolean(res3.body?.downloadToken));

    const downloadToken = res3.body?.downloadToken;

    // TEST 4: Redeem Single-Use Download Token -> PROCESSED (not 401)
    if (downloadToken) {
      const res4 = await makeRequest({ path: `/api/submissions/download/${teamA.id}?downloadToken=${downloadToken}` });
      assertTest('Redeeming valid short-lived download token -> PROCESSED (not 401)', res4.status !== 401);

      // TEST 5: Attempting to REUSE consumed download token -> REJECTED (403)
      const res5 = await makeRequest({ path: `/api/submissions/download/${teamA.id}?downloadToken=${downloadToken}` });
      assertTest('Attempting to REUSE single-use download token -> REJECTED (403)', res5.status === 403);
    }

    // TEST 6: Participant A → Team B presentation download -> REJECTED (403)
    const res6 = await makeRequest({ path: `/api/submissions/download/${teamB.id}`, token: student1Token });
    assertTest('Participant A downloading Team B presentation -> REJECTED (403)', res6.status === 403);

    // TEST 7: Judge → Unassigned team claim -> REJECTED (403)
    const isAssigned = await prisma.judgeAssignment.findFirst({
      where: { judgeId: judgeUser.id, teamId: teamB.id }
    });
    if (!isAssigned) {
      const res7 = await makeRequest({
        path: '/api/reviews/claim',
        method: 'POST',
        token: judgeToken,
        body: { teamId: teamB.id, roundId: 'r1' }
      });
      assertTest('Judge claiming unassigned team evaluation -> REJECTED (403)', res7.status === 403);
    }

    // TEST 8: Judge → Unassigned team review save -> REJECTED (403)
    if (!isAssigned) {
      const res8 = await makeRequest({
        path: '/api/reviews/save',
        method: 'POST',
        token: judgeToken,
        body: { roundId: 'r1', teamId: teamB.id, status: 'DRAFT', scores: [] }
      });
      assertTest('Judge saving evaluation for unassigned team -> REJECTED (403)', res8.status === 403);
    }

    // TEST 9: Student → Admin summary report -> REJECTED (403)
    const res9 = await makeRequest({ path: '/api/reports/summary', token: student1Token });
    assertTest('Student calling Admin summary report -> REJECTED (403)', res9.status === 403);

    // TEST 10: Path traversal attempt in file download -> REJECTED (404/403)
    const res10 = await makeRequest({ path: '/api/submissions/download/../../package.json', token: adminToken });
    assertTest('Path traversal attempt in file download -> SAFE RESPONSE (404/403)', res10.status === 404 || res10.status === 403);

    console.log('\n==================================================');
    console.log(`SECOND-PASS TEST RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Security test error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runSecurityTests();
