import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leader = await prisma.teamMember.findFirst({
    where: { role: 'LEADER' },
    include: { user: true, team: true },
  });

  const member = await prisma.teamMember.findFirst({
    where: { role: 'MEMBER' },
    include: { user: true, team: true },
  });

  console.log('Leader Email:', leader?.email, 'Team:', leader?.team?.name);
  console.log('Member Email:', member?.email, 'Team:', member?.team?.name);
}

main().finally(() => prisma.$disconnect());
