import prisma from './db';

async function setupTestTeam() {
  console.log('--- Setting up "40% Veg" Team & Review 1 Demo Criteria ---');

  // 1. Get or create active hackathon
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

  // 2. Get or create Track
  let track = await prisma.track.findFirst({ where: { hackathonId: hackathon.id } });
  if (!track) {
    track = await prisma.track.create({
      data: {
        name: 'Open Innovation & DeepTech',
        hackathonId: hackathon.id,
      },
    });
  }

  // 3. Find or create Review 1 round
  let reviewRound1 = await prisma.reviewRound.findFirst({
    where: { sequence: 1 },
    include: { criteria: true },
  });

  if (!reviewRound1) {
    reviewRound1 = await prisma.reviewRound.create({
      data: {
        name: 'Review 1: Proposal & Problem Setup',
        description: 'Initial proposal, 40% Veg formulation, problem understanding & feasibility.',
        sequence: 1,
        active: true,
        duration: 300,
        weight: 1.0,
        hackathonId: hackathon.id,
      },
      include: { criteria: true },
    });
  }

  // 4. Create demo criteria for Review 1
  const criteriaData = [
    {
      name: '40% Veg Formulation & Recipe Innovation',
      description: 'Evaluates the 40% vegetarian formulation, ingredient selection, and culinary innovation.',
      maxMarks: 10,
      weight: 1.0,
      sequence: 1,
      required: true,
    },
    {
      name: 'Problem Understanding & Target Audience',
      description: 'Clarity of the dietary problem statement, target market need, and user benefit.',
      maxMarks: 10,
      weight: 1.0,
      sequence: 2,
      required: true,
    },
    {
      name: 'Technical Feasibility & Prototype Quality',
      description: 'Execution feasibility, prototype completeness, and process scalability.',
      maxMarks: 10,
      weight: 1.0,
      sequence: 3,
      required: true,
    },
    {
      name: 'Team Presentation & Pitch Clarity',
      description: 'Communication quality, presentation structure, and Q&A handling.',
      maxMarks: 10,
      weight: 1.0,
      sequence: 4,
      required: true,
    },
  ];

  for (const c of criteriaData) {
    const existing = await prisma.judgingCriterion.findFirst({
      where: { roundId: reviewRound1.id, name: c.name },
    });

    if (!existing) {
      await prisma.judgingCriterion.create({
        data: {
          roundId: reviewRound1.id,
          ...c,
        },
      });
      console.log(`Created criterion: "${c.name}"`);
    } else {
      await prisma.judgingCriterion.update({
        where: { id: existing.id },
        data: c,
      });
      console.log(`Updated criterion: "${c.name}"`);
    }
  }

  // 5. Create or find Team "40% Veg"
  let team = await prisma.team.findFirst({
    where: {
      OR: [
        { registrationId: 'REG-40VEG' },
        { name: { contains: '40%' } },
        { name: { contains: 'Veg' } },
      ],
    },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        registrationId: 'REG-40VEG',
        teamCode: 'REG-40VEG',
        name: '40% Veg',
        projectTitle: '40% Veg Plant-Based Nutrition & AgriTech Platform',
        domain: 'Agritech & Food Innovation',
        status: 'Confirmed',
        checkedIn: true,
        checkInStatus: 'CHECKED_IN',
        hackathonId: hackathon.id,
        trackId: track.id,
      },
    });
    console.log('Created Team "40% Veg" with Registration ID: REG-40VEG');
  } else {
    team = await prisma.team.update({
      where: { id: team.id },
      data: {
        name: '40% Veg',
        registrationId: 'REG-40VEG',
        teamCode: 'REG-40VEG',
        projectTitle: '40% Veg Plant-Based Nutrition & AgriTech Platform',
        checkedIn: true,
        checkInStatus: 'CHECKED_IN',
      },
    });
    console.log('Updated Team "40% Veg" ID:', team.id);
  }

  // Add demo members to "40% Veg" if none exist
  const membersCount = await prisma.teamMember.count({ where: { teamId: team.id } });
  if (membersCount === 0) {
    await prisma.teamMember.createMany({
      data: [
        {
          teamId: team.id,
          name: 'Ananya Sharma',
          email: 'ananya.veg@smarthorizon.com',
          phone: '+91 9876543210',
          role: 'Team Leader',
        },
        {
          teamId: team.id,
          name: 'Rohan Mehta',
          email: 'rohan.veg@smarthorizon.com',
          phone: '+91 9876543211',
          role: 'Food Tech Specialist',
        },
      ],
    });
    console.log('Added demo team members to 40% Veg.');
  }

  // 6. Find Judge 1 and assign Team "40% Veg" to Judge 1
  let judge1 = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'judge1@smarthorizon.com' },
        { roleId: 'JUDGE' },
      ],
    },
  });

  if (!judge1) {
    judge1 = await prisma.user.create({
      data: {
        email: 'judge1@smarthorizon.com',
        name: 'Dr. Rajesh Sharma (Judge 1)',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fKbXW2u.e5d/J7JvD6U6b8tH3k6f7u5V7Z5K5mS', // judge123
        roleId: 'JUDGE',
        judgeStatus: 'Available',
      },
    });
  }

  // Create JudgeAssignment
  const existingAssign = await prisma.judgeAssignment.findUnique({
    where: {
      judgeId_teamId: {
        judgeId: judge1.id,
        teamId: team.id,
      },
    },
  });

  if (!existingAssign) {
    await prisma.judgeAssignment.create({
      data: {
        judgeId: judge1.id,
        teamId: team.id,
        trackId: track.id,
        order: 1,
      },
    });
    console.log(`Assigned Team "40% Veg" to Judge "${judge1.name}".`);
  }

  console.log('--- Setup Complete! Team "40% Veg" is ready for Review 1 Evaluation ---');
}

setupTestTeam()
  .catch((err) => console.error('Setup failed:', err))
  .finally(() => prisma.$disconnect());
