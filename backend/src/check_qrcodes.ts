import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.team.count();
  const teamsWithoutCode = await prisma.team.findMany({
    where: { OR: [{ teamCode: null }, { qrCode: null }] },
  });

  console.log(`Total Teams: ${total}`);
  console.log(`Teams missing teamCode or qrCode: ${teamsWithoutCode.length}`);

  if (teamsWithoutCode.length > 0) {
    console.log('Generating unique teamCode & qrCode for missing teams...');
    for (const team of teamsWithoutCode) {
      const uniqueCode = team.registrationId || `SHIH26-TEAM-${team.id.substring(0, 6).toUpperCase()}`;
      await prisma.team.update({
        where: { id: team.id },
        data: {
          teamCode: uniqueCode,
          qrCode: uniqueCode,
          qrGeneratedAt: new Date(),
        },
      });
    }
    console.log('All missing teams populated with unique QR codes!');
  }
}

main().finally(() => prisma.$disconnect());
