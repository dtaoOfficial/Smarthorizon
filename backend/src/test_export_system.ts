import prisma, { executeWriteTransaction } from './db';
import { generateAccessToken } from './utils/jwt';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function makeExportRequest(options: {
  path: string;
  token: string;
}): Promise<{ status: number; contentType: string; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${options.token}`,
    };

    const req = http.request(
      {
        host: 'localhost',
        port: 5000,
        path: options.path,
        method: 'GET',
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || '';
          resolve({ status: res.statusCode || 500, contentType, buffer });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function runExportAuditTests() {
  console.log('==================================================');
  console.log('📊 SMART HORIZON 2026 PROFESSIONAL EXPORT SYSTEM TEST');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assertExport(name: string, condition: boolean, details?: string) {
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
    if (!adminUser) {
      console.log('⚠️ Missing admin user in DB for export testing.');
      return;
    }

    const adminToken = generateAccessToken({ userId: adminUser.id, role: 'ADMINISTRATOR', email: adminUser.email });

    const outDir = path.resolve(__dirname, '../export_test_output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const exportEndpoints = [
      { name: 'Attendance (XLSX - 3 Sheets)', path: '/api/registration/export-attendance?format=xlsx', fileName: 'SmartHorizon2026_Attendance.xlsx', mime: 'spreadsheetml' },
      { name: 'Attendance (PDF - Landscape)', path: '/api/registration/export-attendance?format=pdf', fileName: 'SmartHorizon2026_Attendance.pdf', mime: 'pdf' },
      { name: 'Attendance (CSV)', path: '/api/registration/export-attendance?format=csv', fileName: 'SmartHorizon2026_Attendance.csv', mime: 'csv' },
      
      { name: 'Teams (XLSX - 2 Sheets)', path: '/api/reports/teams/export?format=xlsx', fileName: 'SmartHorizon2026_Teams.xlsx', mime: 'spreadsheetml' },
      { name: 'Teams (PDF)', path: '/api/reports/teams/export?format=pdf', fileName: 'SmartHorizon2026_Teams.pdf', mime: 'pdf' },
      { name: 'Teams (CSV)', path: '/api/reports/teams/export?format=csv', fileName: 'SmartHorizon2026_Teams.csv', mime: 'csv' },
      
      { name: 'Participants (XLSX)', path: '/api/reports/participants/export?format=xlsx', fileName: 'SmartHorizon2026_Participants.xlsx', mime: 'spreadsheetml' },
      { name: 'Participants (PDF)', path: '/api/reports/participants/export?format=pdf', fileName: 'SmartHorizon2026_Participants.pdf', mime: 'pdf' },
      
      { name: 'Submissions (XLSX - 2 Sheets)', path: '/api/submissions/export-csv?format=xlsx', fileName: 'SmartHorizon2026_Submissions.xlsx', mime: 'spreadsheetml' },
      { name: 'Submissions (PDF)', path: '/api/submissions/export-csv?format=pdf', fileName: 'SmartHorizon2026_Submissions.pdf', mime: 'pdf' },
      { name: 'Submissions (CSV)', path: '/api/submissions/export-csv?format=csv', fileName: 'SmartHorizon2026_Submissions.csv', mime: 'csv' },
      
      { name: 'Judges (XLSX)', path: '/api/reports/judges/export?format=xlsx', fileName: 'SmartHorizon2026_Judges.xlsx', mime: 'spreadsheetml' },
      { name: 'Judges (PDF)', path: '/api/reports/judges/export?format=pdf', fileName: 'SmartHorizon2026_Judges.pdf', mime: 'pdf' },
      
      { name: 'Judge Assignments (XLSX - 2 Sheets)', path: '/api/reports/judge-assignments/export?format=xlsx', fileName: 'SmartHorizon2026_Judge_Assignments.xlsx', mime: 'spreadsheetml' },
      { name: 'Judge Assignments (PDF)', path: '/api/reports/judge-assignments/export?format=pdf', fileName: 'SmartHorizon2026_Judge_Assignments.pdf', mime: 'pdf' },
      
      { name: 'Evaluations / Marksheet (XLSX - 4 Sheets)', path: '/api/reports/marksheet/export?format=xlsx', fileName: 'SmartHorizon2026_Evaluations.xlsx', mime: 'spreadsheetml' },
      { name: 'Evaluations / Marksheet (PDF)', path: '/api/reports/marksheet/export?format=pdf', fileName: 'SmartHorizon2026_Evaluations.pdf', mime: 'pdf' },
      { name: 'Evaluations / Marksheet (CSV)', path: '/api/reports/marksheet/export?format=csv', fileName: 'SmartHorizon2026_Evaluations.csv', mime: 'csv' },
      
      { name: 'Leaderboard (XLSX)', path: '/api/reports/rankings/export?format=xlsx', fileName: 'SmartHorizon2026_Leaderboard.xlsx', mime: 'spreadsheetml' },
      { name: 'Leaderboard (PDF)', path: '/api/reports/rankings/export?format=pdf', fileName: 'SmartHorizon2026_Leaderboard.pdf', mime: 'pdf' },
      { name: 'Leaderboard (CSV)', path: '/api/reports/rankings/export?format=csv', fileName: 'SmartHorizon2026_Leaderboard.csv', mime: 'csv' },
    ];

    for (const ep of exportEndpoints) {
      const res = await makeExportRequest({ path: ep.path, token: adminToken });
      const isValid = res.status === 200 && res.buffer.length > 100 && res.contentType.includes(ep.mime);
      
      if (isValid) {
        const filePath = path.join(outDir, ep.fileName);
        fs.writeFileSync(filePath, res.buffer);
      }

      assertResult(ep.name, isValid, `Status: ${res.status}, Size: ${res.buffer.length} bytes, Type: ${res.contentType}`);
    }

    // 2. CONCURRENT EVALUATIONS & MARKS UPDATE STRESS TEST
    console.log('\n==================================================');
    console.log('⚡ AUDITING CONCURRENT MARKS SUBMISSIONS & EVALUATION CLAIMS');
    console.log('==================================================');

    const round = await prisma.reviewRound.findFirst({ include: { criteria: true } });
    const judges = await prisma.user.findMany({ where: { roleId: 'JUDGE' }, take: 20 });
    const teams = await prisma.team.findMany({ take: 50 });

    if (round && judges.length > 0 && teams.length > 0) {
      const startTime = Date.now();
      const concurrentTasks = teams.map((team, idx) => {
        const judge = judges[idx % judges.length];
        return executeWriteTransaction(async (db) => {
          const rev = await db.review.upsert({
            where: {
              roundId_teamId_judgeId: {
                roundId: round.id,
                teamId: team.id,
                judgeId: judge.id,
              }
            },
            create: {
              roundId: round.id,
              teamId: team.id,
              judgeId: judge.id,
              status: 'SUBMITTED',
              comments: `Concurrent audit test ${idx + 1}`,
              rubricVersion: round.rubricVersion,
            },
            update: {
              status: 'SUBMITTED',
              comments: `Concurrent audit update ${idx + 1}`,
              rubricVersion: round.rubricVersion,
            }
          });

          await db.reviewScore.deleteMany({ where: { reviewId: rev.id } });
          await db.reviewScore.createMany({
            data: round.criteria.map((c) => ({
              reviewId: rev.id,
              criterionId: c.id,
              score: Math.min(c.maxMarks, Math.floor(c.maxMarks * 0.9)),
            }))
          });

          return rev.id;
        });
      });

      const concurrentResults = await Promise.all(concurrentTasks);
      const elapsed = Date.now() - startTime;
      assertResult(
        `Concurrent Marks Submission (${concurrentResults.length} simultaneous submissions in ${elapsed}ms)`,
        concurrentResults.length === teams.length
      );
    }

    console.log('\n==================================================');
    console.log(`FULL AUDIT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`Generated export files stored in: ${outDir}`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Export audit test error:', err);
  } finally {
    await prisma.$disconnect();
  }

  function assertResult(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.log(`❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }
}

runExportAuditTests();

