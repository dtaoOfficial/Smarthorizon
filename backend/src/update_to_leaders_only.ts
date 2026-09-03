import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { syncParticipantCredentialsFile } from './utils/credentialsSync';

const prisma = new PrismaClient();

async function updateToLeadersOnly() {
  console.log('Starting migration to Leaders-Only credentials...');

  const studentPasswordHash = await bcrypt.hash('student123', 10);

  // 1. Get all teams with their members
  const teams = await prisma.team.findMany({
    include: {
      members: true,
    },
  });

  console.log(`Found ${teams.length} teams.`);

  const leaderUserIds = new Set<string>();

  for (const team of teams) {
    let leaderEmail = team.leadEmail ? team.leadEmail.trim().toLowerCase() : null;
    let leaderName = team.leadName ? team.leadName.trim() : null;

    // Find if there is a team member marked as LEADER
    let leaderMember = team.members.find(
      (m) => m.role === 'LEADER' || m.role === 'Team Leader'
    );

    if (!leaderEmail && leaderMember) {
      leaderEmail = leaderMember.email ? leaderMember.email.trim().toLowerCase() : null;
      leaderName = leaderMember.name ? leaderMember.name.trim() : leaderName;
    }

    if (!leaderEmail && team.members.length > 0) {
      leaderEmail = team.members[0].email.trim().toLowerCase();
      leaderName = team.members[0].name.trim();
      leaderMember = team.members[0];
    }

    if (!leaderEmail) {
      console.warn(`Team ${team.name} (${team.id}) has no leader email!`);
      continue;
    }

    // Ensure Leader User exists
    let leaderUser = await prisma.user.findUnique({
      where: { email: leaderEmail },
    });

    if (!leaderUser) {
      leaderUser = await prisma.user.create({
        data: {
          email: leaderEmail,
          passwordHash: studentPasswordHash,
          name: leaderName || `Leader ${team.name}`,
          phone: team.leadMobile || null,
          roleId: 'STUDENT',
          mustChangePassword: true,
        },
      });
      console.log(`Created leader user: ${leaderEmail}`);
    } else {
      // Reset password to student123 and set mustChangePassword = true
      leaderUser = await prisma.user.update({
        where: { id: leaderUser.id },
        data: {
          passwordHash: studentPasswordHash,
          mustChangePassword: true,
          roleId: 'STUDENT',
        },
      });
      console.log(`Reset leader password for: ${leaderEmail}`);
    }

    leaderUserIds.add(leaderUser.id);

    // Unlink any existing TeamMember using this leaderUser.id to prevent unique constraint conflict
    await prisma.teamMember.updateMany({
      where: { userId: leaderUser.id },
      data: { userId: null },
    });

    // Update or create TeamMember for leader
    if (leaderMember) {
      await prisma.teamMember.update({
        where: { id: leaderMember.id },
        data: {
          userId: leaderUser.id,
          role: 'LEADER',
        },
      });
    } else {
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: leaderUser.id,
          name: leaderName || `Leader ${team.name}`,
          email: leaderEmail,
          phone: team.leadMobile || null,
          role: 'LEADER',
        },
      });
    }
  }

  // 2. Identify all non-leader STUDENT users to delete
  const allStudentUsers = await prisma.user.findMany({
    where: { roleId: 'STUDENT' },
  });

  const nonLeaderUsers = allStudentUsers.filter((u) => !leaderUserIds.has(u.id));
  const nonLeaderUserIds = nonLeaderUsers.map((u) => u.id);

  console.log(
    `Total student users: ${allStudentUsers.length}, Leaders: ${leaderUserIds.size}, Non-leaders to remove: ${nonLeaderUserIds.length}`
  );

  if (nonLeaderUserIds.length > 0) {
    // Unlink TeamMember.userId for non-leaders so TeamMember records remain intact!
    const unlinkedTM = await prisma.teamMember.updateMany({
      where: { userId: { in: nonLeaderUserIds } },
      data: { userId: null },
    });
    console.log(`Unlinked ${unlinkedTM.count} TeamMember records from non-leader User accounts.`);

    // Clean up dependent tables referencing non-leader users if any
    await prisma.notification.deleteMany({
      where: { userId: { in: nonLeaderUserIds } },
    });
    await prisma.announcementReceipt.deleteMany({
      where: { userId: { in: nonLeaderUserIds } },
    });
    await prisma.studentFeedback.deleteMany({
      where: { studentId: { in: nonLeaderUserIds } },
    });
    await prisma.eventFeedback.deleteMany({
      where: { userId: { in: nonLeaderUserIds } },
    });
    await prisma.questionReply.deleteMany({
      where: { userId: { in: nonLeaderUserIds } },
    });
    await prisma.question.deleteMany({
      where: { userId: { in: nonLeaderUserIds } },
    });
    await prisma.auditLog.deleteMany({
      where: { userId: { in: nonLeaderUserIds } },
    });

    // Delete non-leader user accounts
    const deletedUsers = await prisma.user.deleteMany({
      where: { id: { in: nonLeaderUserIds } },
    });
    console.log(`Deleted ${deletedUsers.count} non-leader user accounts from database.`);
  }

  console.log('Syncing credentials markdown roster...');
  await syncParticipantCredentialsFile();
  console.log('Migration to Leaders-Only finished successfully!');
}

updateToLeadersOnly()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
