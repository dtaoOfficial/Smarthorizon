import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetAllData() {
  console.log('Resetting all simulated operational data...');

  // 1. Delete transactional / runtime operational records
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

  console.log('Cleared all reviews, scores, feedback, tickets, attendance, and logs.');

  // 2. Reset team check-in status, reviews, codes, and lock flags
  const updatedTeams = await prisma.team.updateMany({
    data: {
      checkedIn: false,
      checkInTime: null,
      checkedInBy: null,
      checkInStatus: 'PENDING',
      status: 'Registered',
      teamCode: null,
      qrCode: null,
      qrGeneratedAt: null,
      locked: false,
    },
  });

  console.log(`Reset ${updatedTeams.count} teams back to initial registered (un-checked-in) state.`);

  // 3. Reset all user passwords & judge statuses
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const judgePassword = await bcrypt.hash('judge123', salt);
  const studentPassword = await bcrypt.hash('student123', salt);

  await prisma.user.updateMany({
    where: { roleId: 'ADMINISTRATOR' },
    data: {
      passwordHash: adminPassword,
      mustChangePassword: false,
    },
  });

  const updatedJudges = await prisma.user.updateMany({
    where: { roleId: 'JUDGE' },
    data: {
      passwordHash: judgePassword,
      mustChangePassword: false,
      judgeStatus: 'Available',
      avgReviewTime: 0.0,
      currentTeamId: null,
      nextTeamId: null,
    },
  });

  await prisma.user.updateMany({
    where: { roleId: 'STUDENT' },
    data: {
      passwordHash: studentPassword,
      mustChangePassword: false,
    },
  });

  console.log(`Reset all user passwords (Admin: admin123, Judges: judge123, Students: student123).`);
  console.log(`Reset ${updatedJudges.count} judge accounts to Available with 0 review time.`);

  // 4. Reset track lock / freeze flags
  await prisma.track.updateMany({
    data: {
      resultsLocked: false,
      frozenLeaderboard: null,
    },
  });

  // 5. Reset review round lock / active flags (keep Round 1 active)
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

  // 6. Log system reset event
  const admin = await prisma.user.findFirst({
    where: { roleId: 'ADMINISTRATOR' },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin?.id || null,
      actorRole: 'ADMINISTRATOR',
      action: 'SYSTEM_RESET',
      details: 'Reset all simulated operational data: cleared team check-ins, reviews, scores, feedback, tickets, announcements, and assignments.',
    },
  });

  console.log('Operational data reset completed successfully!');
}

resetAllData()
  .catch((e) => {
    console.error('Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
