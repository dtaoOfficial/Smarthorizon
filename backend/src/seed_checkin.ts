import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('SmartHorizon@2026', salt);

  await prisma.role.upsert({
    where: { id: 'CHECK_IN_ADMIN' },
    update: {},
    create: { id: 'CHECK_IN_ADMIN', name: 'Check-In Admin' }
  });

  const admins = [
    { email: 'aravindkg51@gmail.com', name: 'Aravind K G' },
    { email: 'sahanagkl123@gmail.com', name: 'Sahana G K' },
    { email: 'akram.rania2006@gmail.com', name: 'Rania Akram' }
  ];

  for (const admin of admins) {
    await prisma.user.upsert({
      where: { email: admin.email },
      update: { passwordHash, roleId: 'CHECK_IN_ADMIN' },
      create: { email: admin.email, passwordHash, name: admin.name, roleId: 'CHECK_IN_ADMIN' }
    });
  }
  console.log('Seeded check-in admins.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
