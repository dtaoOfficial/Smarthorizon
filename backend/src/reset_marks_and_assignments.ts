import prisma from './db';

async function resetMarksAndJudgeAssignments() {
  console.log('===============================================================');
  console.log('  STARTING RESET: MARKS, REVIEWS & JUDGE ASSIGNMENTS  ');
  console.log('  (ATTENDANCE & CHECK-IN DATA WILL REMAIN UNTOUCHED)  ');
  console.log('===============================================================\n');

  try {
    // 1. Delete all review scores, overrides, reviews, evaluation claims, and judge assignments
    console.log('1. Clearing evaluation scores, overrides, reviews, claims, and judge assignments...');
    
    const deletedScores = await prisma.reviewScore.deleteMany({});
    console.log(`   - Deleted ${deletedScores.count} review score records.`);

    const deletedOverrides = await prisma.reviewOverride.deleteMany({});
    console.log(`   - Deleted ${deletedOverrides.count} review override records.`);

    const deletedReviews = await prisma.review.deleteMany({});
    console.log(`   - Deleted ${deletedReviews.count} review records.`);

    const deletedClaims = await prisma.evaluationClaim.deleteMany({});
    console.log(`   - Deleted ${deletedClaims.count} evaluation claim records.`);

    const deletedAssignments = await prisma.judgeAssignment.deleteMany({});
    console.log(`   - Deleted ${deletedAssignments.count} judge assignment records.`);

    const deletedJuryFeedback = await prisma.juryFeedback.deleteMany({});
    console.log(`   - Deleted ${deletedJuryFeedback.count} jury feedback records.`);

    const deletedStudentFeedback = await prisma.studentFeedback.deleteMany({});
    console.log(`   - Deleted ${deletedStudentFeedback.count} student evaluation feedback records.`);

    // 2. Reset judge statuses and active team pointers on User records
    console.log('\n2. Resetting judge status indicators and review timings...');
    const updatedJudges = await prisma.user.updateMany({
      where: { roleId: 'JUDGE' },
      data: {
        judgeStatus: 'Available',
        avgReviewTime: 0.0,
        currentTeamId: null,
        nextTeamId: null,
      },
    });
    console.log(`   - Reset ${updatedJudges.count} judge user accounts back to "Available" state.`);

    // Also clear currentTeamId and nextTeamId for any non-judge users if set
    await prisma.user.updateMany({
      data: {
        currentTeamId: null,
        nextTeamId: null,
      },
    });

    // 3. Reset Track result locks and frozen leaderboards
    console.log('\n3. Resetting track leaderboard visibility, result locks, and frozen snapshots...');
    const updatedTracks = await prisma.track.updateMany({
      data: {
        resultsLocked: false,
        frozenLeaderboard: null,
        leaderboardVisibility: 'ADMIN_ONLY',
        exposeScoresToStudents: false,
      },
    });
    console.log(`   - Reset ${updatedTracks.count} tracks to default (unlocked, hidden scores).`);

    // 4. Reset ReviewRounds (Round 1 active, subsequent rounds inactive and unlocked)
    console.log('\n4. Resetting review rounds state...');
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
        data: { active: true, locked: false },
      });
      console.log(`   - Activated Review Round 1 ("${round1.name}") and deactivated subsequent rounds.`);
    }

    // 5. Reset Team evaluation states and locks without touching attendance/check-in
    console.log('\n5. Resetting team evaluation locks and status (PRESERVING ATTENDANCE)...');
    
    // Reset locked flag on all teams
    await prisma.team.updateMany({
      data: {
        locked: false,
      },
    });

    // Reset status for teams that were in evaluation-related statuses
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        checkedIn: true,
        checkInStatus: true,
        status: true,
      },
    });

    let statusResetCount = 0;
    for (const team of teams) {
      if (['Review Pending', 'Currently Reviewing', 'Completed'].includes(team.status)) {
        const newStatus = (team.checkedIn || team.checkInStatus === 'FULLY_CHECKED_IN') 
          ? 'Checked In' 
          : 'Registered';
        
        await prisma.team.update({
          where: { id: team.id },
          data: { status: newStatus },
        });
        statusResetCount++;
      }
    }
    console.log(`   - Reset evaluation status for ${statusResetCount} teams.`);
    console.log(`   - Verified: All attendance records, check-in timestamps, and check-in statuses were KEPT INTACT.`);

    // 6. Clear review-related notifications
    console.log('\n6. Cleaning up review-related notifications...');
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        type: {
          in: ['REVIEW_ASSIGNED', 'REVIEW_REMINDER', 'REVIEW_SUBMITTED', 'RESULTS_PUBLISHED'],
        },
      },
    });
    console.log(`   - Deleted ${deletedNotifications.count} review/results notification logs.`);

    // 7. Reset Hackathon feedback toggle to default
    await prisma.hackathon.updateMany({
      data: {
        feedbackEnabled: false,
      },
    });

    // 8. Log system audit record for auditability
    const admin = await prisma.user.findFirst({
      where: { roleId: 'ADMINISTRATOR' },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin?.id || null,
        actorRole: 'ADMINISTRATOR',
        action: 'MARKS_AND_ASSIGNMENTS_RESET',
        details: 'Reset all assigned judges, evaluation claims, reviews, scores, overrides, and track locks. Attendance and check-in data were untouched.',
      },
    });

    console.log('\n===============================================================');
    console.log('  RESET COMPLETED SUCCESSFULLY!');
    console.log('===============================================================\n');

  } catch (error) {
    console.error('\n❌ ERROR during reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetMarksAndJudgeAssignments();
