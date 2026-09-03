import prisma from './db';

async function fixSimjudgeAssignment() {
  console.log('=== FIXING SIMJUDGE ASSIGNMENTS ===');

  const simjudge = await prisma.user.findFirst({
    where: { email: 'simjudge@smarthorizon.com' }
  });

  if (!simjudge) {
    console.error('simjudge user not found');
    return;
  }

  const simteam = await prisma.team.findFirst({
    where: { registrationId: 'SHIH26-SIM-001' }
  });

  if (!simteam) {
    console.error('simteam not found');
    return;
  }

  // Delete all previous assignments for simjudge
  await prisma.judgeAssignment.deleteMany({
    where: { judgeId: simjudge.id }
  });

  // Assign ONLY simteam to simjudge
  await prisma.judgeAssignment.create({
    data: {
      judgeId: simjudge.id,
      teamId: simteam.id,
      trackId: simteam.trackId,
      order: 1
    }
  });

  console.log(`Successfully reset simjudge (${simjudge.email}) to have ONLY simteam (${simteam.name}) assigned.`);
}

fixSimjudgeAssignment()
  .catch(e => {
    console.error('Fix failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
