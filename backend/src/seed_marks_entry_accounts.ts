import prisma from './db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('=== SEEDING 30 OPERATIONAL CREDENTIALS (10 PER ROLE) ===');

  // 1. Ensure Roles Exist
  await prisma.role.upsert({
    where: { id: 'ADMINISTRATOR' },
    update: {},
    create: { id: 'ADMINISTRATOR', name: 'Administrator' }
  });

  await prisma.role.upsert({
    where: { id: 'CHECK_IN_ADMIN' },
    update: {},
    create: { id: 'CHECK_IN_ADMIN', name: 'Check-In Admin' }
  });

  await prisma.role.upsert({
    where: { id: 'DATA_ENTRY' },
    update: {},
    create: { id: 'DATA_ENTRY', name: 'Data Entry / Marks Terminal' }
  });

  const salt = await bcrypt.genSalt(10);

  // 1. Full Admin Accounts (10 accounts: admin1..admin10 with passwords panda1..panda10)
  for (let i = 1; i <= 10; i++) {
    const email = `admin${i}@smarthorizon.com`;
    const password = `panda${i}`;
    const passwordHash = await bcrypt.hash(password, salt);
    const name = `Administrator ${i}`;

    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, roleId: 'ADMINISTRATOR', name, mustChangePassword: false },
      create: { email, passwordHash, name, roleId: 'ADMINISTRATOR', mustChangePassword: false }
    });
  }

  // Also preserve primary admin
  const primaryAdminPass = await bcrypt.hash('panda1', salt);
  await prisma.user.upsert({
    where: { email: 'admin@smarthorizon.com' },
    update: { passwordHash: primaryAdminPass, roleId: 'ADMINISTRATOR', name: 'Primary Administrator', mustChangePassword: false },
    create: { email: 'admin@smarthorizon.com', passwordHash: primaryAdminPass, name: 'Primary Administrator', roleId: 'ADMINISTRATOR', mustChangePassword: false }
  });

  // 2. Check-In Admin Accounts (10 accounts: checkin1..checkin10 with passwords panda1..panda10)
  for (let i = 1; i <= 10; i++) {
    const email = `checkin${i}@smarthorizon.com`;
    const password = `panda${i}`;
    const passwordHash = await bcrypt.hash(password, salt);
    const name = `Check-In Terminal ${i}`;

    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, roleId: 'CHECK_IN_ADMIN', name, mustChangePassword: false },
      create: { email, passwordHash, name, roleId: 'CHECK_IN_ADMIN', mustChangePassword: false }
    });
  }

  // 3. Data Entry Accounts (10 accounts: dataentry1..dataentry10 with passwords panda1..panda10)
  for (let i = 1; i <= 10; i++) {
    const email = `dataentry${i}@smarthorizon.com`;
    const password = `panda${i}`;
    const passwordHash = await bcrypt.hash(password, salt);
    const name = `Marks Entry Terminal ${i}`;

    await prisma.user.upsert({
      where: { email },
      update: { passwordHash, roleId: 'DATA_ENTRY', name, mustChangePassword: false },
      create: { email, passwordHash, name, roleId: 'DATA_ENTRY', mustChangePassword: false }
    });
  }

  console.log('✅ Successfully seeded 10 Full Admins, 10 Check-In Admins, and 10 Data Entry Accounts with passwords panda1..panda10!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

