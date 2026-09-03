import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('SmartHorizon@2026', salt);

  const admins = [
    { email: 'aravindkg51@gmail.com', name: 'Aravind K G' },
    { email: 'sahanagkl123@gmail.com', name: 'Sahana G K' },
    { email: 'akram.rania2006@gmail.com', name: 'Rania Akram' }
  ];

  for (const admin of admins) {
    await prisma.user.updateMany({
      where: { email: admin.email },
      data: { roleId: 'ADMINISTRATOR' }
    });
  }
  console.log('Updated check-in admins to ADMINISTRATOR.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
