import prisma from './db';

const officialJury = [
  { slNo: 1, name: 'Mr. Punay Mehra', email: 'punay.mehra@gmail.com', phone: '9899397505' },
  { slNo: 2, name: 'Mr. Manikanth Thakur', email: 'manikant.thakur@visionet.com', phone: '9019042797' },
  { slNo: 3, name: 'Mr. Dhanush DB', email: 'dhanushdb123@gmail.com', phone: '7019561885' },
  { slNo: 4, name: 'Ms. Priyanka K', email: 'priyanka.kanupuru@gmail.com', phone: '8095029066' },
  { slNo: 5, name: 'Mr. Raghu Prasad Konduru', email: 'raghuprasadkonandur@kaushalya.tech', phone: '9845547471' },
  { slNo: 6, name: 'Mr. Sunil Hosur', email: 'drsunil.ece@gmail.com', phone: '9986754377' },
  { slNo: 7, name: 'Mr. Nilesh', email: 'nilesh.rajule@unplex.tech', phone: '9604128928' },
  { slNo: 8, name: 'Ms. Priyanka Desai', email: 'priyanka.desai612@gmail.com', phone: '9164423641' },
  { slNo: 9, name: 'Dr. R. Jayashree', email: 'jayavet@gmail.com', phone: '9448627916' },
  { slNo: 10, name: 'Dr. Devendra Singh Basera', email: 'dr.devendrabasera@gmail.com', phone: '9680963009' },
  { slNo: 11, name: 'Mr. Mithun TV', email: 'mithvinu@gmail.com', phone: '9742707237' },
  { slNo: 12, name: 'Mr. Kantha Rao', email: 'kantha.4pi@csir.res.in', phone: '9731669130' },
  { slNo: 13, name: 'Mr. Sai Kiran', email: 'sai.kiran@conneqtiongroup.com', phone: '6360074795' },
  { slNo: 14, name: 'Mr. Pradeep Rao', email: 'pradeep.rao@kyndryl.com', phone: '9900199366' },
  { slNo: 15, name: 'Mr. Darshan', email: 'dharshan@conneqtiongroup.com', phone: '9483937849' },
  { slNo: 16, name: 'Dr Timothy', email: 'timothy@nunnarilabs.com', phone: '9791383414' },
  { slNo: 17, name: 'Mr. Laxmana Lenka', email: 'laxmana_lenka@waters.com', phone: '8971983983' },
  { slNo: 18, name: 'Mr. Sivaraman Rao', email: 'sivaraman_rao@waters.com', phone: '8971466775' },
  { slNo: 19, name: 'Mr. Sridhar R', email: 'sridhar.ramasamy@cdw.com', phone: '7868856291' },
  { slNo: 20, name: 'Mr. Ilancheran', email: 'ilancheran.muthumari@cdw.com', phone: '9047515542' },
];

async function main() {
  console.log('Cleaning up placeholder judges and updating all judge records to official names...');

  // 1. Update placeholder judge1..judge20 accounts to official names if present
  for (let i = 1; i <= 20; i++) {
    const dummyEmail = `judge${i}@smarthorizon.com`;
    const official = officialJury[i - 1];

    const dummyUser = await prisma.user.findFirst({ where: { email: dummyEmail } });
    if (dummyUser) {
      // Check if official user email already exists
      const officialUser = await prisma.user.findFirst({ where: { email: official.email } });

      if (officialUser && officialUser.id !== dummyUser.id) {
        // Reassign any assignments or reviews from dummyUser to officialUser
        await prisma.judgeAssignment.updateMany({
          where: { judgeId: dummyUser.id },
          data: { judgeId: officialUser.id }
        });
        await prisma.review.updateMany({
          where: { judgeId: dummyUser.id },
          data: { judgeId: officialUser.id }
        });
        // Delete dummy user
        await prisma.user.delete({ where: { id: dummyUser.id } });
        console.log(`Merged ${dummyEmail} into ${official.email} (${official.name})`);
      } else {
        // Update dummy user directly to official email and name
        await prisma.user.update({
          where: { id: dummyUser.id },
          data: {
            email: official.email,
            name: official.name,
            phone: official.phone
          }
        });
        console.log(`Updated ${dummyEmail} -> ${official.email} (${official.name})`);
      }
    }
  }

  // 2. Ensure all 20 official judges have correct names
  for (const official of officialJury) {
    await prisma.user.updateMany({
      where: { email: official.email },
      data: { name: official.name, roleId: 'JUDGE' }
    });
  }

  // 3. Check remaining judge users in DB
  const currentJudges = await prisma.user.findMany({
    where: { roleId: 'JUDGE' },
    select: { id: true, email: true, name: true }
  });

  console.log('Final List of Judges in Database:');
  console.log(JSON.stringify(currentJudges, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
