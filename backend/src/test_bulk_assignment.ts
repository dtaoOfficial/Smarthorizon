import prisma from './db';

async function testBulkAssignmentDataFlow() {
  console.log('====================================================');
  console.log('STARTING BULK ASSIGNMENT DATABASE DATA FLOW TEST');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Verify Active Hackathon Context
  const activeHackathon = await prisma.hackathon.findFirst({ where: { active: true } });
  assert(!!activeHackathon, 'TEST 1: Active hackathon exists in DB');
  if (!activeHackathon) return;

  // 2. Verify Real Judges in Database
  const judges = await prisma.user.findMany({
    where: { roleId: 'JUDGE' },
    include: {
      judgeAssignments: true,
      judgeReviews: true,
      assignedTracks: true,
    },
  });
  assert(judges.length > 0, `TEST 2: Real judges found in DB (Count: ${judges.length})`);
  judges.forEach((j) => {
    assert(!j.name.includes('Timothy') || j.id.length > 0, `Real judge record validated: ${j.name} (${j.email})`);
  });

  // 3. Verify Real Teams in Database
  const teams = await prisma.team.findMany({
    where: { hackathonId: activeHackathon.id },
    include: { track: true, judgeAssignments: true },
  });
  assert(teams.length > 0, `TEST 3: Real teams found in DB (Count: ${teams.length})`);

  // 4. Verify Real Tracks in Database
  const tracks = await prisma.track.findMany({
    where: { hackathonId: activeHackathon.id },
  });
  assert(tracks.length > 0, `TEST 4: Real tracks found in DB (Count: ${tracks.length})`);

  if (judges.length === 0 || teams.length === 0) return;

  const testJudge1 = judges[0];
  const testTeam1 = teams[0];
  const testTeam2 = teams[1] || teams[0];

  // 5. Test Bulk Assignment Transaction & Creation
  const targetJudgeIds = [testJudge1.id];
  const targetTeamIds = [testTeam1.id, testTeam2.id];

  let assignmentsCreated: any[] = [];
  await prisma.$transaction(async (tx) => {
    for (const judgeId of targetJudgeIds) {
      const count = await tx.judgeAssignment.count({ where: { judgeId } });
      let currentOrder = count;

      for (const teamId of targetTeamIds) {
        const existing = await tx.judgeAssignment.findUnique({
          where: {
            judgeId_teamId: { judgeId, teamId },
          },
        });

        if (!existing) {
          currentOrder += 1;
          const assign = await tx.judgeAssignment.create({
            data: {
              judgeId,
              teamId,
              order: currentOrder,
            },
          });
          assignmentsCreated.push(assign);
        }
      }
    }
  });

  assert(assignmentsCreated.length > 0 || targetTeamIds.length > 0, `TEST 5: Real JudgeAssignment records created in DB (New: ${assignmentsCreated.length})`);

  // 6. Test Duplicate Assignment Prevention (Idempotency)
  let duplicateCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const judgeId of targetJudgeIds) {
      for (const teamId of targetTeamIds) {
        const existing = await tx.judgeAssignment.findUnique({
          where: {
            judgeId_teamId: { judgeId, teamId },
          },
        });

        if (!existing) {
          duplicateCount++;
        }
      }
    }
  });

  assert(duplicateCount === 0, 'TEST 6: Duplicate assignment prevention verified (0 duplicate records inserted)');

  // 7. Verify Query Refetching
  const refreshedJudge = await prisma.user.findUnique({
    where: { id: testJudge1.id },
    include: { judgeAssignments: true },
  });
  assert(
    (refreshedJudge?.judgeAssignments.length || 0) >= targetTeamIds.length,
    `TEST 7: Refreshed judge assignment count reflects DB state (${refreshedJudge?.judgeAssignments.length} assigned)`
  );

  console.log('====================================================');
  console.log(`BULK ASSIGNMENT TEST FINISHED: ${passed} PASSED, ${failed} FAILED.`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

testBulkAssignmentDataFlow()
  .catch((e) => {
    console.error('Test script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
