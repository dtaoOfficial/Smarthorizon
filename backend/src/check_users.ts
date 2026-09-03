import prisma from './db';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      mustChangePassword: true,
    },
  });

  console.log(`Total users in DB: ${users.length}`);
  console.log(JSON.stringify(users.slice(0, 15), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
