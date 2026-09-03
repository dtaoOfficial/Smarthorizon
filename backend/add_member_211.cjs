// One-off fix: team SHIH26-TID-211 (HackStack) was imported with only 4 of its
// 5 registered members. Adds the missing 5th member as a TeamMember record
// (no login account, matching how members 2-4 of this team were imported —
// see src/import_strict_118.ts lines 230-255) and backfills the flat
// Team.member5Name/Email/Mobile fields used elsewhere in the app.
const prisma = require('./dist/db').default;

const REG_ID = 'SHIH26-TID-211';
const NAME = 'Nitin S';
const EMAIL = 'nithin.s@smarthorizon.com';
const PHONE = '9876543256';

(async () => {
  const team = await prisma.team.findUnique({
    where: { registrationId: REG_ID },
    include: { members: true },
  });

  if (!team) {
    console.error(`Team with registrationId ${REG_ID} not found.`);
    process.exit(1);
  }

  const alreadyExists = team.members.some(
    (m) => m.email.toLowerCase() === EMAIL.toLowerCase()
  );
  if (alreadyExists) {
    console.log(`${NAME} is already a member of ${team.name} (${REG_ID}). Nothing to do.`);
    process.exit(0);
  }

  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: null,
      name: NAME,
      email: EMAIL,
      phone: PHONE,
      role: 'MEMBER',
    },
  });

  await prisma.team.update({
    where: { id: team.id },
    data: {
      member5Name: NAME,
      member5Email: EMAIL,
      member5Mobile: PHONE,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorRole: 'ADMINISTRATOR',
      action: 'TEAM_MEMBER_ADDED_MANUAL',
      details: `Added missing member "${NAME}" to team "${team.name}" (${REG_ID}).`,
    },
  });

  console.log(`Added ${NAME} to team "${team.name}" (${REG_ID}) as member 5.`);
  await prisma.$disconnect();
})().catch(async (err) => {
  console.error('Failed:', err);
  await prisma.$disconnect();
  process.exit(1);
});
