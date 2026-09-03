import prisma from './db';
import bcrypt from 'bcryptjs';

async function seedDemoAccounts() {
  console.log('=== SEEDING FULL ACCESS DEMO ACCOUNTS ===');

  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashJudge = await bcrypt.hash('judge123', 10);
  const passwordHashStudent = await bcrypt.hash('student123', 10);

  // 1. Ensure Active Hackathon & Track
  let hackathon = await prisma.hackathon.findFirst({ where: { active: true } });
  if (!hackathon) {
    hackathon = await prisma.hackathon.create({
      data: {
        name: 'SmartHorizon 2026 International Hackathon',
        startDate: new Date(),
        endDate: new Date(Date.now() + 48 * 3600 * 1000),
        active: true,
      },
    });
  }

  let track = await prisma.track.findFirst({ where: { hackathonId: hackathon.id } });
  if (!track) {
    track = await prisma.track.create({
      data: {
        name: 'AI & Machine Learning',
        hackathonId: hackathon.id,
      },
    });
  }

  // 2. Seed Admin Account
  let admin = await prisma.user.findFirst({ where: { email: 'admin@smarthorizon.com' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@smarthorizon.com',
        name: 'Administrator (Super Admin)',
        passwordHash: passwordHashAdmin,
        roleId: 'ADMINISTRATOR',
      },
    });
    console.log('Created Admin account: admin@smarthorizon.com');
  } else {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: passwordHashAdmin, roleId: 'ADMINISTRATOR' },
    });
    console.log('Updated Admin account: admin@smarthorizon.com');
  }

  // 3. Seed Judge Account
  let judge = await prisma.user.findFirst({ where: { email: 'judge1@smarthorizon.com' } });
  if (!judge) {
    judge = await prisma.user.create({
      data: {
        email: 'judge1@smarthorizon.com',
        name: 'Dr. Rajesh Sharma (Judge 1)',
        passwordHash: passwordHashJudge,
        roleId: 'JUDGE',
        judgeStatus: 'Available',
      },
    });
    console.log('Created Judge account: judge1@smarthorizon.com');
  } else {
    await prisma.user.update({
      where: { id: judge.id },
      data: { passwordHash: passwordHashJudge, roleId: 'JUDGE', judgeStatus: 'Available' },
    });
    console.log('Updated Judge account: judge1@smarthorizon.com');
  }

  // 4. Seed Demo Team & Student Account
  let team = await prisma.team.findFirst({
    where: { registrationId: 'REG-001' },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        registrationId: 'REG-001',
        teamCode: 'REG-001',
        name: 'Team Horizon',
        projectTitle: 'Smart AI Healthcare Diagnostic Vault',
        domain: 'AI & HealthTech',
        status: 'Confirmed',
        checkedIn: true,
        checkInStatus: 'CHECKED_IN',
        projectUrl: 'https://github.com/smarthorizon/team-horizon',
        demoUrl: 'https://figma.com/@smarthorizon-team-horizon',
        hackathonId: hackathon.id,
        trackId: track.id,
      },
    });
    console.log('Created Demo Team Horizon (REG-001).');
  }

  let student = await prisma.user.findFirst({ where: { email: 'student1@smarthorizon.com' } });
  if (!student) {
    student = await prisma.user.create({
      data: {
        email: 'student1@smarthorizon.com',
        name: 'Aarav Patel (Student Leader)',
        passwordHash: passwordHashStudent,
        roleId: 'STUDENT',
      },
    });
    console.log('Created Student account: student1@smarthorizon.com');
  } else {
    await prisma.user.update({
      where: { id: student.id },
      data: { passwordHash: passwordHashStudent, roleId: 'STUDENT' },
    });
    console.log('Updated Student account: student1@smarthorizon.com');
  }

  // Ensure TeamMember record exists
  const existingMember = await prisma.teamMember.findFirst({
    where: { teamId: team.id, role: 'Team Leader' },
  });

  if (!existingMember) {
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: student.id,
        name: 'Aarav Patel',
        email: 'student1@smarthorizon.com',
        role: 'Team Leader',
      },
    });
  } else {
    await prisma.teamMember.update({
      where: { id: existingMember.id },
      data: { userId: student.id, email: 'student1@smarthorizon.com' },
    });
  }

  // 5. Ensure Judge Assignment for Judge 1 & Team Horizon
  const assign = await prisma.judgeAssignment.findUnique({
    where: {
      judgeId_teamId: {
        judgeId: judge.id,
        teamId: team.id,
      },
    },
  });

  if (!assign) {
    await prisma.judgeAssignment.create({
      data: {
        judgeId: judge.id,
        teamId: team.id,
        trackId: track.id,
        order: 1,
      },
    });
    console.log('Assigned Team Horizon to Judge 1.');
  }

  console.log('=== FULL ACCESS DEMO ACCOUNTS SEEDED SUCCESSFULLY ===');
}

seedDemoAccounts()
  .catch((err) => console.error('Demo accounts seed failed:', err))
  .finally(() => prisma.$disconnect());
