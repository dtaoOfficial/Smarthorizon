import prisma from '../db';
import xlsx from 'xlsx';
import path from 'path';

const rootExcelPath = path.join(__dirname, '../../../Filtered_Complete_Registration_118.xlsx');

export async function exportParticipantsExcel() {
  console.log('=== EXPORTING PARTICIPANTS EXCEL (118 TEAMS) ===');

  const teams = await prisma.team.findMany({
    include: {
      track: true,
      members: true,
    },
    orderBy: { registrationId: 'asc' },
  });

  const rows = teams.map((t, idx) => ({
    'Sl No': idx + 1,
    'Registration ID': t.registrationId || t.teamCode || 'N/A',
    'Team Code': t.teamCode || 'N/A',
    'Team Name': t.name,
    'Domain / Track': t.domain || t.track?.name || 'N/A',
    'Problem Statement ID': t.selectedPsId || 'N/A',
    'Check-In Status': t.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN',
    'Payment Status': t.paymentStatusFinal || 'PAID',
    'Team Leader Name': t.leadName || t.members.find(m => m.role === 'LEADER')?.name || 'N/A',
    'Team Leader Email': t.leadEmail || t.members.find(m => m.role === 'LEADER')?.email || 'N/A',
    'Team Leader Mobile': t.leadMobile || t.members.find(m => m.role === 'LEADER')?.phone || t.emergencyContact || 'N/A',
    'Member 2 Name': t.member2Name || (t.members[1] ? t.members[1].name : ''),
    'Member 2 Email': t.member2Email || (t.members[1] ? t.members[1].email : ''),
    'Member 2 Mobile': t.member2Mobile || (t.members[1] ? t.members[1].phone : ''),
    'Member 3 Name': t.member3Name || (t.members[2] ? t.members[2].name : ''),
    'Member 3 Email': t.member3Email || (t.members[2] ? t.members[2].email : ''),
    'Member 3 Mobile': t.member3Mobile || (t.members[2] ? t.members[2].phone : ''),
    'Member 4 Name': t.member4Name || (t.members[3] ? t.members[3].name : ''),
    'Member 4 Email': t.member4Email || (t.members[3] ? t.members[3].email : ''),
    'Member 4 Mobile': t.member4Mobile || (t.members[3] ? t.members[3].phone : ''),
    'Member 5 Name': t.member5Name || (t.members[4] ? t.members[4].name : ''),
    'Member 5 Email': t.member5Email || (t.members[4] ? t.members[4].email : ''),
    'Member 5 Mobile': t.member5Mobile || (t.members[4] ? t.members[4].phone : ''),
    'Project Title': t.projectTitle || 'N/A',
    'Emergency Contact': t.emergencyContact || 'N/A',
  }));

  const worksheet = xlsx.utils.json_to_sheet(rows);

  // Set column widths for readability
  worksheet['!cols'] = [
    { wch: 6 },  // Sl No
    { wch: 20 }, // Registration ID
    { wch: 16 }, // Team Code
    { wch: 25 }, // Team Name
    { wch: 18 }, // Domain
    { wch: 20 }, // PS ID
    { wch: 18 }, // Check-In
    { wch: 15 }, // Payment
    { wch: 25 }, // Leader Name
    { wch: 32 }, // Leader Email
    { wch: 16 }, // Leader Mobile
    { wch: 25 }, // M2 Name
    { wch: 32 }, // M2 Email
    { wch: 16 }, // M2 Mobile
    { wch: 25 }, // M3 Name
    { wch: 32 }, // M3 Email
    { wch: 16 }, // M3 Mobile
    { wch: 25 }, // M4 Name
    { wch: 32 }, // M4 Email
    { wch: 16 }, // M4 Mobile
    { wch: 25 }, // M5 Name
    { wch: 32 }, // M5 Email
    { wch: 16 }, // M5 Mobile
    { wch: 35 }, // Project Title
    { wch: 18 }, // Emergency Contact
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, '118 Registered Teams');

  xlsx.writeFile(workbook, rootExcelPath);
  console.log(`Successfully generated Excel file at: ${rootExcelPath}`);
}

exportParticipantsExcel()
  .catch(err => console.error('Excel export failed:', err))
  .finally(() => prisma.$disconnect());
