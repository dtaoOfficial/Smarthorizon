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
  const adminPassword = await bcrypt.hash('admin123', salt);
  const judgePassword = await bcrypt.hash('judge123', salt);
  const studentPassword = await bcrypt.hash('student123', salt);

  // Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@smarthorizon.com',
      passwordHash: adminPassword,
      name: 'Jane Admin',
      roleId: 'ADMINISTRATOR',
    }
  });

  // Seed 15 Judges
  const judges: any[] = [];
  const statusOptions = ['Available', 'Reviewing', 'Walking', 'Break', 'Offline'];
  const tracksList = Object.values(tracks);

  for (let i = 1; i <= 20; i++) {
    const status = statusOptions[i % statusOptions.length];
    const avgSpeed = 8 + (i * 1.5) % 12;
    
    const t1 = tracksList[(i - 1) % tracksList.length];
    const t2 = tracksList[(i) % tracksList.length];
    const trackConnect = [{ id: t1.id }];
    if (i % 2 === 0) trackConnect.push({ id: t2.id });

    const judge = await prisma.user.create({
      data: {
        email: `judge${i}@smarthorizon.com`,
        passwordHash: judgePassword,
        name: `Judge Representative ${i}`,
        phone: `+1 (555) 019-${1000 + i}`,
        judgeStatus: status,
        avgReviewTime: parseFloat(avgSpeed.toFixed(1)),
        roleId: 'JUDGE',
        assignedTracks: { connect: trackConnect }
      }
    });
    judges.push(judge);
  }
  console.log('Seeded 20 Judge profiles.');

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

  // 9. Seed Judge Assignments & Submitted Reviews across Round 1, Round 2, and Round 3
  let assignmentCount = 0;
  
  const dbJudges = await prisma.user.findMany({
    where: { roleId: 'JUDGE' },
    include: { assignedTracks: true }
  });

  for (let idx = 0; idx < createdTeams.length; idx++) {
    const team = createdTeams[idx];
    const trackJudges = dbJudges.filter(j => 
      j.assignedTracks.some((t: any) => t.id === team.trackId)
    );

    const judge = trackJudges[idx % trackJudges.length] || dbJudges[idx % dbJudges.length];

    // Fetch round criteria for scoring
    const round1Criteria = await prisma.judgingCriterion.findMany({ where: { roundId: round1.id }, orderBy: { sequence: 'asc' } });
    const round2Criteria = await prisma.judgingCriterion.findMany({ where: { roundId: round2.id }, orderBy: { sequence: 'asc' } });
    const round3Criteria = await prisma.judgingCriterion.findMany({ where: { roundId: round3.id }, orderBy: { sequence: 'asc' } });

    // Seed Review 1 for all teams
    const r1_rev = await prisma.review.create({
      data: {
        roundId: round1.id,
        teamId: team.id,
        judgeId: judge.id,
        comments: `Evaluation 1: Clear problem understanding for ${team.name}. Roadmap and feasibility are solid.`,
        status: 'SUBMITTED',
        actualDuration: 280,
      }
    });

    for (let cIdx = 0; cIdx < round1Criteria.length; cIdx++) {
      const crit = round1Criteria[cIdx];
      const ratio = 0.72 + ((idx * 7 + cIdx * 3) % 24) / 100;
      const score = Math.min(crit.maxMarks, Math.max(1, Math.round(crit.maxMarks * ratio)));
      await prisma.reviewScore.create({
        data: { reviewId: r1_rev.id, criterionId: crit.id, score }
      });
    }

    // Seed Review 2 for 80% of teams
    if (idx % 5 !== 4) {
      const r2_rev = await prisma.review.create({
        data: {
          roundId: round2.id,
          teamId: team.id,
          judgeId: judge.id,
          comments: `Evaluation 2: Strong technical architecture, feature integration, and testing validation.`,
          status: 'SUBMITTED',
          actualDuration: 295,
        }
      });

      for (let cIdx = 0; cIdx < round2Criteria.length; cIdx++) {
        const crit = round2Criteria[cIdx];
        const ratio = 0.75 + ((idx * 11 + cIdx * 5) % 22) / 100;
        const score = Math.min(crit.maxMarks, Math.max(1, Math.round(crit.maxMarks * ratio)));
        await prisma.reviewScore.create({
          data: { reviewId: r2_rev.id, criterionId: crit.id, score }
        });
      }
    }

    // Seed Review 3 (Final Review) for 70% of teams
    if (idx % 4 !== 3) {
      const r3_rev = await prisma.review.create({
        data: {
          roundId: round3.id,
          teamId: team.id,
          judgeId: judge.id,
          comments: `Evaluation 3 (Final): Outstanding live demonstration! Working prototype with great real-world impact.`,
          status: 'SUBMITTED',
          actualDuration: 300,
        }
      });

      for (let cIdx = 0; cIdx < round3Criteria.length; cIdx++) {
        const crit = round3Criteria[cIdx];
        const ratio = 0.78 + ((idx * 13 + cIdx * 4) % 20) / 100;
        const score = Math.min(crit.maxMarks, Math.max(1, Math.round(crit.maxMarks * ratio)));
        await prisma.reviewScore.create({
          data: { reviewId: r3_rev.id, criterionId: crit.id, score }
        });
      }

      // Mark team as checked in and completed
      await prisma.team.update({
        where: { id: team.id },
        data: { checkedIn: true, status: 'Completed' }
      });
    } else {
      await prisma.team.update({
        where: { id: team.id },
        data: { checkedIn: true, status: 'Checked In' }
      });

      await prisma.judgeAssignment.create({
        data: {
          judgeId: judge.id,
          teamId: team.id,
          trackId: team.trackId,
          order: assignmentCount + 1
        }
      });
      assignmentCount += 1;
    }
  }
  console.log('Seeded 3-Round Evaluations for teams.');

  // 10. Seed Q&A Support Tickets
  const studentLeaders = await prisma.user.findMany({ where: { roleId: 'STUDENT' } });
  
  for (let i = 0; i < 10; i++) {
    const student = studentLeaders[i % studentLeaders.length];
    const category = i % 2 === 0 ? 'TECHNICAL' : 'ORGANIZATIONAL';
    const status = i % 3 === 0 ? 'Resolved' : i % 3 === 1 ? 'Assigned' : 'Open';
    const priority = i % 4 === 0 ? 'CRITICAL' : i % 4 === 1 ? 'HIGH' : 'MEDIUM';

    const q = await prisma.question.create({
      data: {
        hackathonId: hackathon.id,
        userId: student.id,
        category,
        title: `${category === 'TECHNICAL' ? 'Compiler compilation error' : 'Sponsor space location'} #${i}`,
        content: `Detailed support description for question ticket #${i}. What guidelines apply?`,
        priority,
        status,
        assignedToId: status === 'Assigned' ? adminUser.id : null,
      }
    });

    if (status === 'Resolved') {
      await prisma.questionReply.create({
        data: {
          questionId: q.id,
          userId: adminUser.id,
          content: 'We have updated the settings sheet. Let us know if you need anything else!',
        }
      });
    }
  }
  console.log('Seeded Q&A support tickets.');

  // 11. Seed Announcements
  const ann1 = await prisma.announcement.create({
    data: {
      hackathonId: hackathon.id,
      title: 'Welcome to SmartHorizon Hackathon 2026!',
      content: 'Welcome teams! Please make sure your team has completed the check-in process at the reception desk. If you have questions, drop a line in the Support tab.',
      authorId: adminUser.id,
      pinned: true,
      priority: 'CRITICAL',
      category: 'GENERAL',
    }
  });

  const ann2 = await prisma.announcement.create({
    data: {
      hackathonId: hackathon.id,
      title: 'Snacks & Pizza dinner is ready',
      content: 'Snacks and pizza boxes are available in the central dining hall. Vegan options are located in Sector C.',
      authorId: adminUser.id,
      pinned: false,
      priority: 'INFO',
      category: 'FOOD',
    }
  });

  // Seed read receipts
  const studentUsers = await prisma.user.findMany({ where: { roleId: 'STUDENT' } });
  for (let idx = 0; idx < 30; idx++) {
    const user = studentUsers[idx];
    await prisma.announcementReceipt.create({
      data: {
        announcementId: ann1.id,
        userId: user.id,
        status: 'ACKNOWLEDGED',
      }
    });

    if (idx % 2 === 0) {
      await prisma.announcementReceipt.create({
        data: {
          announcementId: ann2.id,
          userId: user.id,
          status: 'READ',
        }
      });
    }
  }
  console.log('Seeded Announcements & Read Receipts.');

  // 12. Seed Notifications
  await prisma.notification.create({
    data: {
      userId: studentLeaders[0].id,
      title: 'Solidity Compiler Update',
      content: 'Your support ticket has been resolved by Dr. Alice.',
      type: 'QUESTION_REPLY',
    }
  });

  // 13. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SYSTEM_STARTUP',
      details: 'System database scaled up and seeded successfully for Release Candidate RC1.'
    }
  });

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
