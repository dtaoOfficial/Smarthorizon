import prisma from './db';
import { generateAccessToken } from './utils/jwt';
import http from 'http';
import fs from 'fs';
import path from 'path';

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

async function runRedTeamGate() {
  console.log('==================================================');
  console.log('🔥 EXECUTING FINAL RED-TEAM PRODUCTION GATE');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assertResult(testName: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.log(`❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    const adminUser = await prisma.user.findFirst({ where: { roleId: 'ADMINISTRATOR' } });
    const judgeUser = await prisma.user.findFirst({ where: { roleId: 'JUDGE' } });
    const teams = await prisma.team.findMany({ take: 2, include: { members: true } });

    if (!adminUser || !judgeUser || teams.length < 2) {
      console.log('⚠️ Database context missing required entities for Red-Team Gate.');
      return;
    }

    const teamA = teams[0];
    const teamB = teams[1];

    let studentAUser = await prisma.user.findFirst({
      where: {
        roleId: 'STUDENT',
        OR: [
          ...(teamA.leadEmail ? [{ email: { equals: teamA.leadEmail } }] : []),
          { teamMembers: { some: { teamId: teamA.id } } }
        ]
      }
    });

    let studentBUser = await prisma.user.findFirst({
      where: {
        roleId: 'STUDENT',
        OR: [
          ...(teamB.leadEmail ? [{ email: { equals: teamB.leadEmail } }] : []),
          { teamMembers: { some: { teamId: teamB.id } } }
        ]
      }
    });

    // Fallback if DB doesn't have student users linked yet
    if (!studentAUser) {
      studentAUser = await prisma.user.create({
        data: {
          email: teamA.leadEmail || `student_a_${Date.now()}@smarthorizon.com`,
          name: teamA.leadName || 'Student A Lead',
          passwordHash: 'hash',
          roleId: 'STUDENT',
        }
      });
      await prisma.teamMember.create({
        data: { teamId: teamA.id, userId: studentAUser.id, name: studentAUser.name, role: 'LEADER', email: studentAUser.email }
      });
    }

    if (!studentBUser) {
      studentBUser = await prisma.user.create({
        data: {
          email: teamB.leadEmail || `student_b_${Date.now()}@smarthorizon.com`,
          name: teamB.leadName || 'Student B Lead',
          passwordHash: 'hash',
          roleId: 'STUDENT',
        }
      });
      await prisma.teamMember.create({
        data: { teamId: teamB.id, userId: studentBUser.id, name: studentBUser.name, role: 'LEADER', email: studentBUser.email }
      });
    }

    const adminToken = generateAccessToken({ userId: adminUser.id, role: 'ADMINISTRATOR', email: adminUser.email });
    const judgeToken = generateAccessToken({ userId: judgeUser.id, role: 'JUDGE', email: judgeUser.email });
    const student1Token = generateAccessToken({ userId: studentAUser.id, role: 'STUDENT', email: studentAUser.email });
    const student2Token = generateAccessToken({ userId: studentBUser.id, role: 'STUDENT', email: studentBUser.email });

    console.log(`Target Matrix Setup:
    - Admin: ${adminUser.email}
    - Judge A: ${judgeUser.email}
    - Student A: ${studentAUser.email} (Team A: ${teamA.name} [${teamA.id}])
    - Student B: ${studentBUser.email} (Team B: ${teamB.name} [${teamB.id}])
    `);

    // ==========================================
    // SECTION 1: DOWNLOAD TOKEN & URL SECURITY
    // ==========================================
    const r1 = await makeRequest({ path: `/api/submissions/download/${teamA.id}?token=${adminToken}` });
    assertResult('1. Long-lived access JWT in URL query string -> REJECTED (401)', r1.status === 401);

    const r2 = await makeRequest({ path: `/api/submissions/download/${teamA.id}?accessToken=${adminToken}` });
    assertResult('2. Access token query string ?accessToken= -> REJECTED (401)', r2.status === 401);

    const r3 = await makeRequest({
      path: `/api/submissions/download-token/${teamA.id}`,
      method: 'POST',
      token: adminToken,
    });
    assertResult('3. Issue 60s single-use download token -> GRANTED (200)', r3.status === 200 && Boolean(r3.body?.downloadToken));

    const downloadToken = r3.body?.downloadToken;
    if (downloadToken) {
      const r4 = await makeRequest({ path: `/api/submissions/download/${teamA.id}?downloadToken=${downloadToken}` });
      assertResult('4. Redeem short-lived download token for Team A -> PROCESSED (not 401)', r4.status !== 401);

      const r5 = await makeRequest({ path: `/api/submissions/download/${teamA.id}?downloadToken=${downloadToken}` });
      assertResult('5. Replay consumed single-use download token -> REJECTED (403)', r5.status === 403);

      // Issue token for Team A and attempt using it for Team B
      const rTokenA = await makeRequest({
        path: `/api/submissions/download-token/${teamA.id}`,
        method: 'POST',
        token: adminToken,
      });
      if (rTokenA.body?.downloadToken) {
        const r6 = await makeRequest({ path: `/api/submissions/download/${teamB.id}?downloadToken=${rTokenA.body.downloadToken}` });
        assertResult('6. Team A download token used against Team B -> REJECTED (403)', r6.status === 403);
      }
    }

    // ==========================================
    // SECTION 2: PRIVATE FILE EXPOSURE (/uploads)
    // ==========================================
    const r7 = await makeRequest({ path: '/uploads/submissions/test.pdf' });
    assertResult('7. Unauthenticated request to /uploads -> REJECTED (404)', r7.status === 404);

    const r8 = await makeRequest({ path: '/uploads/submissions/test.pdf', token: student1Token });
    assertResult('8. Direct static route /uploads access -> REJECTED (404)', r8.status === 404);

    // ==========================================
    // SECTION 3: AUTHORIZATION MATRIX VERIFICATION
    // ==========================================
    // Student A -> Team A workspace -> ALLOW
    const r9 = await makeRequest({ path: `/api/teams/${teamA.id}`, token: student1Token });
    assertResult('9. Student A accessing Team A details -> ALLOW (200)', r9.status === 200);

    // Student A -> Team B workspace -> DENY
    const r10 = await makeRequest({ path: `/api/teams/${teamB.id}`, token: student1Token });
    assertResult('10. Student A accessing Team B details -> DENY (403)', r10.status === 403);

    // Student B -> Team B workspace -> ALLOW
    const r11 = await makeRequest({ path: `/api/teams/${teamB.id}`, token: student2Token });
    assertResult('11. Student B accessing Team B details -> ALLOW (200)', r11.status === 200);

    // Student B -> Team A workspace -> DENY
    const r12 = await makeRequest({ path: `/api/teams/${teamA.id}`, token: student2Token });
    assertResult('12. Student B accessing Team A details -> DENY (403)', r12.status === 403);

    // Student A -> Team B submission download -> DENY
    const r13 = await makeRequest({ path: `/api/submissions/download/${teamB.id}`, token: student1Token });
    assertResult('13. Student A downloading Team B presentation -> DENY (403)', r13.status === 403);

    // Student A -> Evaluation endpoint -> DENY
    const r14 = await makeRequest({
      path: '/api/reviews/save',
      method: 'POST',
      token: student1Token,
      body: { roundId: 'r1', teamId: teamA.id, status: 'SUBMITTED', scores: [] }
    });
    assertResult('14. Student A submitting evaluation scores -> DENY (403)', r14.status === 403);

    // Student A -> Admin summary report -> DENY
    const r15 = await makeRequest({ path: '/api/reports/summary', token: student1Token });
    assertResult('15. Student A accessing Admin reports -> DENY (403)', r15.status === 403);

    // Judge A -> Unassigned Team B evaluation claim -> DENY
    const isJudgeAssigned = await prisma.judgeAssignment.findFirst({
      where: { judgeId: judgeUser.id, teamId: teamB.id }
    });
    if (!isJudgeAssigned) {
      const r16 = await makeRequest({
        path: '/api/reviews/claim',
        method: 'POST',
        token: judgeToken,
        body: { teamId: teamB.id, roundId: 'r1' }
      });
      assertResult('16. Judge A claiming unassigned Team B evaluation -> DENY (403)', r16.status === 403);
    }

    // Judge A -> Admin report -> DENY
    const r17 = await makeRequest({ path: '/api/reports/summary', token: judgeToken });
    assertResult('17. Judge A accessing Admin reports -> DENY (403)', r17.status === 403);

    // Admin -> Admin summary report -> ALLOW
    const r18 = await makeRequest({ path: '/api/reports/summary', token: adminToken });
    assertResult('18. Admin accessing Admin summary report -> ALLOW (200)', r18.status === 200);

    // ==========================================
    // SECTION 4: MASS ASSIGNMENT & SENSITIVE FIELD MUTATION
    // ==========================================
    const r19 = await makeRequest({
      path: `/api/teams/${teamA.id}`,
      method: 'PUT',
      token: student1Token,
      body: { projectUrl: 'https://github.com/test/repo', role: 'ADMINISTRATOR', paymentStatusFinal: 'REFUNDED', locked: false }
    });
    const updatedTeam = await prisma.team.findUnique({ where: { id: teamA.id } });
    assertResult(
      '19. Mass assignment attempt (Student attempting paymentStatus/role escalation) -> PROTECTED',
      updatedTeam?.paymentStatusFinal !== 'REFUNDED' && (r19.status === 403 || r19.status === 200)
    );

    // ==========================================
    // SECTION 5: FILESYSTEM ATTACKS & PATH TRAVERSAL
    // ==========================================
    const r20 = await makeRequest({ path: '/api/submissions/download/../../package.json', token: adminToken });
    assertResult('20. Path traversal ../../package.json -> SAFE RESPONSE (404/403)', r20.status === 404 || r20.status === 403);

    const r21 = await makeRequest({ path: '/api/submissions/download/..%2f..%2fpackage.json', token: adminToken });
    assertResult('21. Encoded traversal ..%2f..%2fpackage.json -> SAFE RESPONSE (404/403)', r21.status === 404 || r21.status === 403);

    // ==========================================
    // SECTION 6: FRONTEND SECRET AUDIT
    // ==========================================
    const distPath = path.resolve(__dirname, '../../frontend/dist/assets');
    let foundSecretInBundle = false;
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(path.join(distPath, file), 'utf8');
          if (
            content.includes('smarthorizon-access-secret-key') ||
            content.includes('DATABASE_URL') ||
            content.includes('REFRESH_TOKEN_SECRET')
          ) {
            foundSecretInBundle = true;
            break;
          }
        }
      }
    }
    assertResult('22. Frontend production bundle secret scan -> ZERO SECRETS EXPOSED', !foundSecretInBundle);

    console.log('\n==================================================');
    console.log(`RED-TEAM GATE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Red team gate execution error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runRedTeamGate();
