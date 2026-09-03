import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const admins = [
    'aravindkg51@gmail.com',
    'sahanagkl123@gmail.com',
    'akram.rania2006@gmail.com'
  ];
  for (const email of admins) {
    await prisma.user.updateMany({
      where: { email },
      data: { roleId: 'CHECK_IN_ADMIN' }
    });
  }
  console.log('Updated to CHECK_IN_ADMIN.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
