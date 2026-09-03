import prisma from './db';
import bcrypt from 'bcryptjs';

async function seedSimulationAccounts() {
  console.log('=== SEEDING SIMULATION JUDGE (simjudge) & SIMULATION STUDENT (simStudent) ===');

  const passwordHashJudge = await bcrypt.hash('judge123', 10);
  const passwordHashStudent = await bcrypt.hash('student123', 10);

  // 1. Ensure Active Hackathon & Track
  let hackathon = await prisma.hackathon.findFirst({ where: { active: true } });
  if (!hackathon) {
    hackathon = await prisma.hackathon.create({
      data: {
        name: 'SmartHorizon Hackathon 2026',
        description: 'The annual flagship university hackathon.',
        startDate: new Date('2026-10-15T09:00:00Z'),
        endDate: new Date('2026-10-17T17:00:00Z'),
        active: true,
      },
    });
  }

  const tracks = await prisma.track.findMany({ where: { hackathonId: hackathon.id } });
  const defaultTrack = tracks[0] || await prisma.track.create({
    data: { name: 'AI & ML', hackathonId: hackathon.id }
  });

  // 2. Create / Update Simulation Judge: simjudge
  let simjudge = await prisma.user.findFirst({
    where: { OR: [{ email: 'simjudge@smarthorizon.com' }, { name: 'simjudge' }] }
  });

  if (!simjudge) {
    simjudge = await prisma.user.create({
      data: {
        email: 'simjudge@smarthorizon.com',
        name: 'simjudge',
        passwordHash: passwordHashJudge,
        roleId: 'JUDGE',
        judgeStatus: 'Available',
        phone: '9999999999',
        mustChangePassword: false,
        assignedTracks: { connect: tracks.map(t => ({ id: t.id })) }
      }
    });
    console.log('✅ Created Simulation Judge: simjudge (simjudge@smarthorizon.com / judge123)');
  } else {
    simjudge = await prisma.user.update({
      where: { id: simjudge.id },
      data: {
        name: 'simjudge',
        email: 'simjudge@smarthorizon.com',
        passwordHash: passwordHashJudge,
        roleId: 'JUDGE',
        judgeStatus: 'Available',
        mustChangePassword: false,
      }
    });
    console.log('✅ Updated Simulation Judge: simjudge (simjudge@smarthorizon.com / judge123)');
  }

  // Assign simjudge to first 10 teams so evaluation queue is populated
  const sampleTeams = await prisma.team.findMany({ take: 15, orderBy: { registrationId: 'asc' } });
  for (let i = 0; i < sampleTeams.length; i++) {
    const t = sampleTeams[i];
    await prisma.judgeAssignment.upsert({
      where: {
        judgeId_teamId: {
          judgeId: simjudge.id,
          teamId: t.id,
        }
      },
      update: { order: (i % 3) + 1 },
      create: {
        judgeId: simjudge.id,
        teamId: t.id,
        trackId: t.trackId,
        order: (i % 3) + 1,
      }
    });
  }
  console.log(`Assigned simjudge to ${sampleTeams.length} teams for evaluation.`);

  // 3. Create / Update Simulation Team & Simulation Student: simStudent
  let simTeam = await prisma.team.findFirst({
    where: { registrationId: 'SHIH26-SIM-001' }
  });

  if (!simTeam) {
    simTeam = await prisma.team.create({
      data: {
        registrationId: 'SHIH26-SIM-001',
        teamCode: 'SIM-STUDENT-01',
        qrCode: 'SIM-STUDENT-01',
        qrGeneratedAt: new Date(),
        name: 'simStudent Team',
        college: 'New Horizon College of Engineering',
        collegeName: 'New Horizon College of Engineering',
        domain: defaultTrack.name,
        selectedPsId: 'SH-AI-01',
        emergencyContact: '9876543210',
        projectTitle: 'simStudent AI Autonomous Simulation Vault',
        problemStatement: 'Building an autonomous simulation workspace for hackathons.',
        projectDesc: 'Official simulation student team entry for Smart Horizon 2026.',
        techStack: 'React, TypeScript, Node.js, Prisma, TailwindCSS',
        status: 'Registered',
        checkedIn: true,
        checkInTime: new Date(),
        paymentStatusFinal: 'PAID',
        trackId: defaultTrack.id,
        hackathonId: hackathon.id,
        leadName: 'simStudent',
        leadEmail: 'simstudent@smarthorizon.com',
        leadMobile: '9876543210',
        leadUsn: '1NH26SIM001',
      }
    });
    console.log('✅ Created Simulation Team: simStudent Team (SHIH26-SIM-001)');
  }

  let simStudent = await prisma.user.findFirst({
    where: { OR: [{ email: 'simstudent@smarthorizon.com' }, { name: 'simStudent' }] }
  });

  if (!simStudent) {
    simStudent = await prisma.user.create({
      data: {
        email: 'simstudent@smarthorizon.com',
        name: 'simStudent',
        passwordHash: passwordHashStudent,
        roleId: 'STUDENT',
        phone: '9876543210',
        mustChangePassword: false,
      }
    });
    console.log('✅ Created Simulation Student: simStudent (simstudent@smarthorizon.com / student123)');
  } else {
    simStudent = await prisma.user.update({
      where: { id: simStudent.id },
      data: {
        name: 'simStudent',
        email: 'simstudent@smarthorizon.com',
        passwordHash: passwordHashStudent,
        roleId: 'STUDENT',
        mustChangePassword: false,
      }
    });
    console.log('✅ Updated Simulation Student: simStudent (simstudent@smarthorizon.com / student123)');
  }

  // Ensure TeamMember record for simStudent
  const existingMember = await prisma.teamMember.findFirst({
    where: { teamId: simTeam.id, role: 'LEADER' }
  });

  if (!existingMember) {
    await prisma.teamMember.create({
      data: {
        teamId: simTeam.id,
        userId: simStudent.id,
        name: 'simStudent',
        email: 'simstudent@smarthorizon.com',
        phone: '9876543210',
        role: 'LEADER',
      }
    });
  } else {
    await prisma.teamMember.update({
      where: { id: existingMember.id },
      data: { userId: simStudent.id, email: 'simstudent@smarthorizon.com' }
    });
  }

  console.log('=== SIMULATION ACCOUNTS SEEDED SUCCESSFULLY ===');
}

seedSimulationAccounts()
  .catch(e => {
    console.error('Failed to seed simulation accounts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
