import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetSimulationData() {
  console.log('=== STARTING COMPLETE SIMULATION DATA RESET ===');

  // 1. Clear all simulated / runtime operational records
  console.log('Clearing simulated feedback, reviews, attendance, tickets, and logs...');
  await prisma.eventFeedback.deleteMany({});
  await prisma.studentFeedback.deleteMany({});
  await prisma.juryFeedback.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.announcementReceipt.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.questionReply.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.reviewScore.deleteMany({});
  await prisma.reviewOverride.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.evaluationClaim.deleteMany({});
  await prisma.judgeAssignment.deleteMany({});
  await prisma.teamSubmission.deleteMany({});
  await prisma.auditLog.deleteMany({});

  console.log('Cleared all simulated operational records.');

  // 2. Reset team operational states (keep team IDs, codes, QR codes, and roster intact)
  const updatedTeams = await prisma.team.updateMany({
    data: {
      checkedIn: false,
      checkInTime: null,
      checkedInBy: null,
      checkInStatus: 'PENDING',
      status: 'Registered',
      locked: false,
    },
  });

  console.log(`Reset ${updatedTeams.count} teams back to initial registered (un-checked-in) state.`);

  // 3. Reset judge operational statuses
  const updatedJudges = await prisma.user.updateMany({
    where: { roleId: 'JUDGE' },
    data: {
      judgeStatus: 'Available',
      avgReviewTime: 0.0,
      currentTeamId: null,
      nextTeamId: null,
    },
  });

  console.log(`Reset ${updatedJudges.count} judge accounts to Available state.`);

  // 4. Reset track locks and frozen leaderboards
  await prisma.track.updateMany({
    data: {
      resultsLocked: false,
      frozenLeaderboard: null,
    },
  });

  // 5. Reset review round states (Round 1 active, others inactive and unlocked)
  await prisma.reviewRound.updateMany({
    data: {
      active: false,
      locked: false,
    },
  });

  const round1 = await prisma.reviewRound.findFirst({
    where: { sequence: 1 },
  });

  if (round1) {
    await prisma.reviewRound.update({
      where: { id: round1.id },
      data: { active: true },
    });
  }

  // 6. Cleanly re-assign judges evenly across the 118 teams
  console.log('Re-assigning judges across official teams...');
  const judges = await prisma.user.findMany({
    where: { roleId: 'JUDGE' },
    orderBy: { email: 'asc' },
  });

  const teams = await prisma.team.findMany({
    orderBy: { registrationId: 'asc' },
  });

  if (judges.length > 0 && teams.length > 0) {
    let judgeIdx = 0;
    for (let tIdx = 0; tIdx < teams.length; tIdx++) {
      const currentTeam = teams[tIdx];
      // Assign 2 judges per team
      for (let j = 0; j < 2; j++) {
        const assignedJudge = judges[judgeIdx % judges.length];
        await prisma.judgeAssignment.create({
          data: {
            judgeId: assignedJudge.id,
            teamId: currentTeam.id,
            trackId: currentTeam.trackId,
            order: j + 1,
          },
        });
        judgeIdx++;
      }
    }
    console.log(`Freshly assigned ${judges.length} judges across ${teams.length} teams.`);
  }

  // 7. Log system reset audit record
  const admin = await prisma.user.findFirst({
    where: { roleId: 'ADMINISTRATOR' },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin?.id || null,
      actorRole: 'ADMINISTRATOR',
      action: 'SYSTEM_RESET',
      details: 'Reset all simulated operational data: cleared team check-ins, reviews, scores, feedback, tickets, announcements, and re-assigned fresh judge rosters.',
    },
  });

  console.log('=== SIMULATION DATA RESET COMPLETED SUCCESSFULLY ===');
}

resetSimulationData()
  .catch((e) => {
    console.error('Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
