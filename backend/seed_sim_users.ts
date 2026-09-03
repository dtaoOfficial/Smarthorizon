import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  
  // Create Sim Judge
  const judgePassword = await bcrypt.hash('judge123', salt);
  await prisma.user.upsert({
    where: { email: 'simjudge@smarthorizon.com' },
    update: {},
    create: {
      email: 'simjudge@smarthorizon.com',
      name: 'Simulation Judge',
      passwordHash: judgePassword,
      role: { connect: { id: 'JUDGE' } },
      phone: '555-000-1111'
    }
  });

  // Create Sim Student
  const studentPassword = await bcrypt.hash('student123', salt);
  await prisma.user.upsert({
    where: { email: 'simstudent@smarthorizon.com' },
    update: {},
    create: {
      email: 'simstudent@smarthorizon.com',
      name: 'Simulation Student',
      passwordHash: studentPassword,
      role: { connect: { id: 'STUDENT' } },
      phone: '555-000-2222'
    }
  });

  console.log("Sim users seeded.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
