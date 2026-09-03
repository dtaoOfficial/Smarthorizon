import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding started...');

  // 1. Clean existing data in order of dependency
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.announcementReceipt.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.questionReply.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.reviewScore.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.judgingCriterion.deleteMany({});
  await prisma.reviewRound.deleteMany({});
  await prisma.judgeAssignment.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.track.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.hackathon.deleteMany({});

  console.log('Cleaned old data.');

  // 2. Create Roles
  const roles = [
    { id: 'ADMINISTRATOR', name: 'Administrator' },
    { id: 'CHECK_IN_ADMIN', name: 'Check-In Admin' },
    { id: 'DATA_ENTRY', name: 'Data Entry / Marks Terminal' },
    { id: 'JUDGE', name: 'Judge' },
    { id: 'STUDENT', name: 'Student' }
  ];
  for (const role of roles) {
    await prisma.role.create({ data: role });
  }
  console.log('Seeded Roles.');

  // 3. Create Hackathon
  const hackathon = await prisma.hackathon.create({
    data: {
      name: 'SmartHorizon Hackathon 2026',
      description: 'The annual flagship university hackathon for building modern web, AI, and cybersecurity applications.',
      startDate: new Date('2026-10-15T09:00:00Z'),
      endDate: new Date('2026-10-17T17:00:00Z'),
      active: true,
      feedbackEnabled: false,
      submissionsOpen: false,
    }
  });
  console.log(`Seeded Hackathon: ${hackathon.name}`);

  // 4. Create Tracks
  const trackDomainMapping: Record<string, string> = {
    fintech: 'FinTech',
    healthtech: 'Healthcare',
    smartcity: 'Smart City',
    spacetech: 'SpaceTech',
    agriculture: 'Agriculture',
    ai: 'AI & ML',
    cybersecurity: 'Cybersecurity'
  };

  const defaultTrackNames = ['FinTech', 'Healthcare', 'Smart City', 'SpaceTech', 'Agriculture', 'AI & ML', 'Cybersecurity', 'Open Innovation'];
  const tracks: Record<string, any> = {};
  for (const name of defaultTrackNames) {
    const t = await prisma.track.create({
      data: { name, hackathonId: hackathon.id }
    });
    tracks[name] = t;
  }
  console.log('Seeded Tracks.');

  // 5. Create Users (hashed passwords)
  const salt = await bcrypt.genSalt(10);
  const judgePassword = await bcrypt.hash('judge123', salt);
  const studentPassword = await bcrypt.hash('student123', salt);

  // 5.1 Seed 10 Full Administrators (admin1..admin10 -> panda1..panda10)
  for (let i = 1; i <= 10; i++) {
    const email = `admin${i}@smarthorizon.com`;
    const password = `panda${i}`;
    const passwordHash = await bcrypt.hash(password, salt);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: `Administrator ${i}`,
        roleId: 'ADMINISTRATOR',
      }
    });
  }
  // Primary admin
  const primaryAdminPass = await bcrypt.hash('panda1', salt);
  await prisma.user.create({
    data: {
      email: 'admin@smarthorizon.com',
      passwordHash: primaryAdminPass,
      name: 'Primary Administrator',
      roleId: 'ADMINISTRATOR',
    }
  });
  console.log('Seeded 10 Full Administrators.');

  // 5.2 Seed 10 Check-In Admins (checkin1..checkin10 -> panda1..panda10)
  for (let i = 1; i <= 10; i++) {
    const email = `checkin${i}@smarthorizon.com`;
    const password = `panda${i}`;
    const passwordHash = await bcrypt.hash(password, salt);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: `Check-In Terminal ${i}`,
        roleId: 'CHECK_IN_ADMIN',
      }
    });
  }
  console.log('Seeded 10 Check-In Admins.');

  // 5.3 Seed 10 Data Entry Operators (dataentry1..dataentry10 -> panda1..panda10)
  for (let i = 1; i <= 10; i++) {
    const email = `dataentry${i}@smarthorizon.com`;
    const password = `panda${i}`;
    const passwordHash = await bcrypt.hash(password, salt);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: `Marks Entry Terminal ${i}`,
        roleId: 'DATA_ENTRY',
      }
    });
  }
  console.log('Seeded 10 Data Entry Operators.');

  // 5.4 Seed 20 Official Judges from Login_credentials_judges.md
  const officialJuryData = [
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

  const judges: any[] = [];
  const statusOptions = ['Available'];
  const tracksList = Object.values(tracks);

  for (let i = 0; i < officialJuryData.length; i++) {
    const jData = officialJuryData[i];
    const status = 'Available';
    const avgSpeed = 0;
    
    const t1 = tracksList[(i) % tracksList.length];
    const t2 = tracksList[(i + 1) % tracksList.length];
    const trackConnect = [{ id: t1.id }];
    if (i % 2 === 0) trackConnect.push({ id: t2.id });

    const pwd = jData.phone ? await bcrypt.hash(jData.phone, salt) : judgePassword;

    const judge = await prisma.user.create({
      data: {
        email: jData.email,
        passwordHash: pwd,
        name: jData.name,
        phone: jData.phone,
        judgeStatus: status,
        avgReviewTime: avgSpeed,
        roleId: 'JUDGE',
        assignedTracks: { connect: trackConnect }
      }
    });
    judges.push(judge);
  }
  console.log('Seeded 20 Official Judge profiles (All status: Available, avgReviewTime: 0).');


  // 6. Create Exactly 3 Review Rounds (100 Marks Each, as per official NHCE Rubrics)
  const round1 = await prisma.reviewRound.create({
    data: {
      name: 'Evaluation 1: Problem Understanding, Solution Alignment & Execution Plan',
      description: 'Day 1 Evening | Assess whether the team correctly understands the problem and has a clear, technically feasible plan to transform its prototype.',
      sequence: 1,
      duration: 300, // 5 minutes in seconds
      active: true,
      hackathonId: hackathon.id,
      thresholdExcellent: 85,
      thresholdGood: 65,
      thresholdImprovement: 45,
    }
  });

  const round2 = await prisma.reviewRound.create({
    data: {
      name: 'Evaluation 2: Implementation, Integration & Validation',
      description: 'Day 2 Post Lunch | Assess actual progress from concept/prototype toward a working solution (most technically focused evaluation).',
      sequence: 2,
      duration: 300, // 5 minutes in seconds
      active: false,
      hackathonId: hackathon.id,
      thresholdExcellent: 85,
      thresholdGood: 65,
      thresholdImprovement: 45,
    }
  });

  const round3 = await prisma.reviewRound.create({
    data: {
      name: 'Evaluation 3: Final Solution, Innovation, Impact & Presentation',
      description: 'Day 3 Morning | Evaluate final outcome as a complete hackathon solution, with emphasis on innovation, usability, and impact.',
      sequence: 3,
      duration: 300, // 5 minutes in seconds
      active: false,
      hackathonId: hackathon.id,
      thresholdExcellent: 85,
      thresholdGood: 65,
      thresholdImprovement: 45,
    }
  });
  console.log('Seeded 3 Official NHCE Review Rounds (100 Marks Each).');

  // 7. Seed Criteria for Round 1, Round 2, and Round 3 (Official NHCE Rubrics)
  // Evaluation 1 Criteria (Total: 100 Marks)
  const eval1_criteria = [
    { name: 'Problem Understanding & User Need', description: 'Clear understanding of the problem, target users, existing pain points and actual need.', maxMarks: 20, sequence: 1 },
    { name: 'Solution–Problem Alignment', description: 'How directly the proposed solution addresses the selected problem statement.', maxMarks: 15, sequence: 2 },
    { name: 'Understanding of Existing Prototype', description: "Team's understanding of what already works, limitations and gaps in the shortlisted prototype.", maxMarks: 10, sequence: 3 },
    { name: 'Solution Approach & Feasibility', description: 'Logical approach, appropriate technologies and feasibility within the hackathon constraints.', maxMarks: 15, sequence: 4 },
    { name: 'Incorporation of Jury Expectations', description: 'Understanding of additional requirements/expectations communicated by the jury.', maxMarks: 15, sequence: 5 },
    { name: 'Development Roadmap', description: 'Clear priorities, milestones, task allocation and realistic plan for the remaining hackathon.', maxMarks: 10, sequence: 6 },
    { name: 'Team Knowledge & Communication', description: 'Team members demonstrate ownership and can clearly explain their proposed approach.', maxMarks: 5, sequence: 7 },
    { name: 'Problem-Specific Criteria', description: 'Additional expectations defined by the jury for the particular problem statement/theme.', maxMarks: 15, sequence: 8 },
  ];

  for (const c of eval1_criteria) {
    await prisma.judgingCriterion.create({
      data: {
        roundId: round1.id,
        name: c.name,
        description: c.description,
        maxMarks: c.maxMarks,
        weight: 1.0,
        sequence: c.sequence,
      }
    });
  }

  // Evaluation 2 Criteria (Total: 100 Marks)
  const eval2_criteria = [
    { name: 'Functional Implementation', description: 'Degree to which the proposed core features are actually implemented and working.', maxMarks: 25, sequence: 1 },
    { name: 'Technical Implementation & Integration', description: 'Quality of integration between hardware, software, AI/ML, APIs, databases, sensors or other relevant components.', maxMarks: 15, sequence: 2 },
    { name: 'Testing & Validation', description: 'Test cases, validation methodology, handling of different inputs/scenarios and evidence of testing.', maxMarks: 15, sequence: 3 },
    { name: 'Performance & Reliability', description: 'Accuracy, response time, efficiency, stability or other meaningful performance measures.', maxMarks: 15, sequence: 4 },
    { name: 'Implementation of Jury Feedback', description: 'Extent to which feedback and expectations from Evaluation 1 have been incorporated.', maxMarks: 15, sequence: 5 },
    { name: 'Problem-Solving & Technical Adaptability', description: 'How effectively the team handles technical challenges, failures and unexpected situations.', maxMarks: 10, sequence: 6 },
    { name: 'Problem-Specific Criteria', description: 'Additional technical/domain requirement identified by the jury.', maxMarks: 5, sequence: 7 },
  ];

  for (const c of eval2_criteria) {
    await prisma.judgingCriterion.create({
      data: {
        roundId: round2.id,
        name: c.name,
        description: c.description,
        maxMarks: c.maxMarks,
        weight: 1.0,
        sequence: c.sequence,
      }
    });
  }

  // Evaluation 3 Criteria (Total: 100 Marks)
  const eval3_criteria = [
    { name: 'Final Solution Completeness', description: 'Extent to which the final solution addresses the intended problem and promised features.', maxMarks: 15, sequence: 1 },
    { name: 'Innovation & Originality', description: 'Novelty of the idea/approach and differentiation from existing solutions.', maxMarks: 15, sequence: 2 },
    { name: 'User Experience & Usability', description: 'Ease of use, interface, accessibility, user interaction and suitability for intended users.', maxMarks: 15, sequence: 3 },
    { name: 'Effectiveness & Evidence of Results', description: 'Demonstrated results, measurable improvement and evidence that the solution works.', maxMarks: 15, sequence: 4 },
    { name: 'Real-World Impact & Applicability', description: 'Practical value, societal/industrial relevance and potential to solve the identified problem.', maxMarks: 15, sequence: 5 },
    { name: 'Scalability & Future Potential', description: 'Possibility of deployment, scaling, extension and further development.', maxMarks: 10, sequence: 6 },
    { name: 'Final Demonstration & Presentation', description: 'Quality of demo, clarity of explanation, storytelling and ability to communicate the solution.', maxMarks: 10, sequence: 7 },
    { name: 'Problem-Specific / Jury Challenge Criteria', description: 'Fulfilment of the specific final expectation/challenge given for the problem.', maxMarks: 5, sequence: 8 },
  ];

  for (const c of eval3_criteria) {
    await prisma.judgingCriterion.create({
      data: {
        roundId: round3.id,
        name: c.name,
        description: c.description,
        maxMarks: c.maxMarks,
        weight: 1.0,
        sequence: c.sequence,
      }
    });
  }
  console.log('Seeded official 100-mark rubrics for Evaluation 1, Evaluation 2, and Evaluation 3.');

  const createdTeams: any[] = [];
  const registrationsFilePath = path.join(__dirname, '../prisma/registrations.json');

  if (fs.existsSync(registrationsFilePath)) {
    console.log('Loading team registration data from registrations.json...');
    const rawRegistrations = JSON.parse(fs.readFileSync(registrationsFilePath, 'utf8'));

    for (let i = 0; i < rawRegistrations.length; i++) {
      const reg = rawRegistrations[i];
      const domainKey = (reg.domain || '').toLowerCase();
      const trackName = trackDomainMapping[domainKey] || (tracks[reg.domain] ? reg.domain : 'Open Innovation');
      let track = tracks[trackName];
      if (!track) {
        track = await prisma.track.create({
          data: { name: reg.domain || 'Open Innovation', hackathonId: hackathon.id }
        });
        tracks[reg.domain || 'Open Innovation'] = track;
      }

      const team = await prisma.team.create({
        data: {
          registrationId: String(reg.registration_id || `REG-${i + 1}`),
          name: reg.team_name || `Team ${i + 1}`,
          college: reg.college_name || null,
          collegeName: reg.college_name || null,
          domain: reg.domain || track.name,
          selectedPsId: reg.selected_ps_id || null,
          mentorName1: reg.mentor_name_1 || reg.mentor_name || null,
          emergencyContact: reg.lead_mobile ? `Emergency: ${reg.lead_mobile}` : null,
          projectTitle: `${reg.team_name || 'Team'} Initiative`,
          problemStatement: `Problem definition for ${reg.selected_ps_id || 'selected domain'}.`,
          projectDesc: `Submission for ${reg.domain || track.name}.`,
          projectUrl: `https://github.com/smarthorizon/${(reg.team_name || 'team').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          techStack: 'React, Vite, Node.js, Prisma, TailwindCSS',
          status: 'Registered',
          repoVisibility: i % 2 === 0 ? 'PUBLIC' : 'PRIVATE',
          repoCommitCount: 10 + (i * 5) % 50,
          checkedIn: false,
          checkInTime: null,
          checkedInBy: null,
          teamCode: null,
          qrCode: null,
          qrGeneratedAt: null,
          trackId: track.id,
          hackathonId: hackathon.id,

          leadName: reg.lead_name || null,
          leadEmail: reg.lead_email || null,
          leadMobile: reg.lead_mobile || null,
          leadUsn: reg.lead_usn || null,

          member2Name: reg.member2_name || null,
          member2Email: reg.member2_email || null,
          member2Mobile: reg.member2_mobile || null,
          member2Usn: reg.member2_usn || null,

          member3Name: reg.member3_name || null,
          member3Email: reg.member3_email || null,
          member3Mobile: reg.member3_mobile || null,
          member3Usn: reg.member3_usn || null,

          member4Name: reg.member4_name || null,
          member4Email: reg.member4_email || null,
          member4Mobile: reg.member4_mobile || null,
          member4Usn: reg.member4_usn || null,

          member5Name: reg.member5_name || null,
          member5Email: reg.member5_email || null,
          member5Mobile: reg.member5_mobile || null,
          member5Usn: reg.member5_usn || null,

          paymentStatusFinal: (reg.payment_status_final || reg.payment_status || 'PAID').toUpperCase(),
        }
      });
      createdTeams.push(team);

      const allParticipantCredentials: { regId: string; teamName: string; name: string; role: string; email: string; password: string }[] = [];

      // Create leader user & teamMember
      if (reg.lead_email && reg.lead_name) {
        let leaderUser = await prisma.user.findUnique({ where: { email: reg.lead_email } });
        if (!leaderUser) {
          const leaderPhone = reg.lead_mobile || null;
          const finalPassword = leaderPhone ? await bcrypt.hash(leaderPhone.toString().trim(), salt) : studentPassword;
          
          leaderUser = await prisma.user.create({
            data: {
              email: reg.lead_email,
              passwordHash: finalPassword,
              name: reg.lead_name,
              phone: leaderPhone,
              roleId: 'STUDENT',
            }
          });
        }
        await prisma.teamMember.create({
          data: {
            name: reg.lead_name,
            email: reg.lead_email,
            phone: reg.lead_mobile || null,
            role: 'LEADER',
            teamId: team.id,
            userId: leaderUser.id
          }
        });
        allParticipantCredentials.push({
          regId: team.registrationId || `REG-${i + 1}`,
          teamName: team.name,
          name: reg.lead_name,
          role: 'Team Leader',
          email: reg.lead_email,
          password: 'student123'
        });
      }

      // Helper for members
      const members = [
        { name: reg.member2_name, email: reg.member2_email, phone: reg.member2_mobile },
        { name: reg.member3_name, email: reg.member3_email, phone: reg.member3_mobile },
        { name: reg.member4_name, email: reg.member4_email, phone: reg.member4_mobile },
        { name: reg.member5_name, email: reg.member5_email, phone: reg.member5_mobile },
      ];

      for (const m of members) {
        if (m.name && m.name.trim()) {
          const mEmail = m.email && m.email.trim() ? m.email.trim() : `member_${Math.random().toString(36).substring(7)}@smarthorizon.com`;
          await prisma.teamMember.create({
            data: {
              name: m.name.trim(),
              email: mEmail,
              phone: m.phone || null,
              role: 'MEMBER',
              teamId: team.id,
              userId: null
            }
          });
        }
      }
    }
    console.log(`Seeded ${createdTeams.length} real teams from registrations.json.`);
  } else {
    console.log('registrations.json not found, using default sample teams.');
  }

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
