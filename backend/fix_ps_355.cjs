// One-off fix: team SHIH26-TID-355 (Tech Bros) had selectedPsId "SH-HLT-11"
// but should be "SH-HLT-10" (per judge_mapping.xlsx team_mapping row for this
// team, and the requested master-prompt update). Team name, track, and the
// 5-person roster were already correct in the database.
const prisma = require('./dist/db').default;

(async () => {
  const team = await prisma.team.findUnique({ where: { registrationId: 'SHIH26-TID-355' } });
  if (!team) {
    console.error('Team SHIH26-TID-355 not found.');
    process.exit(1);
  }
  if (team.selectedPsId === 'SH-HLT-10') {
    console.log('Already SH-HLT-10, nothing to do.');
    process.exit(0);
  }

  await prisma.team.update({
    where: { id: team.id },
    data: {
      selectedPsId: 'SH-HLT-10',
      problemStatement: 'Problem definition for SH-HLT-10.',
    },
  });

  console.log(`Updated TID-355 selectedPsId ${team.selectedPsId} -> SH-HLT-10`);
  await prisma.$disconnect();
})().catch(async (err) => {
  console.error('Failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
