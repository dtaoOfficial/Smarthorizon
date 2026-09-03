import prisma from './db';

async function checkJudgeAssignments() {
  console.log('=== CHECKING ALL JUDGE ASSIGNMENTS IN DATABASE ===');

  const judges = await prisma.user.findMany({ where: { roleId: 'JUDGE' } });
  console.log(`Total Judges found: ${judges.length}`);

  for (const j of judges) {
    const assignments = await prisma.judgeAssignment.findMany({
      where: { judgeId: j.id },
      include: { team: true }
    });
    console.log(`\nJudge "${j.name}" (Email: ${j.email}, ID: ${j.id}):`);
    console.log(`-> Assigned ${assignments.length} teams:`);
    assignments.forEach(a => {
      console.log(`   - Team: "${a.team.name}" (RegID: ${a.team.registrationId}, ID: ${a.team.id})`);
    });
  }

  console.log('\n=== TOTAL TEAMS & ASSIGNMENTS SUMMARY ===');
  const totalTeams = await prisma.team.count();
  const totalAssignments = await prisma.judgeAssignment.count();
  console.log(`Total Teams: ${totalTeams}`);
  console.log(`Total JudgeAssignment records: ${totalAssignments}`);
}

checkJudgeAssignments()
  .catch(e => {
    console.error('Check failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
