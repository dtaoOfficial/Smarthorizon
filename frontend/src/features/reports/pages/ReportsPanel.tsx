import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../../../shared/services/api';
import { useTrack } from '../../../context/TrackContext';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { ResponsiveTableContainer } from '../../../shared/components/ResponsiveTableContainer';

type ReportTab =
  | 'marksheet'
  | 'feedback'
  | 'summary'
  | 'evaluation'
  | 'attendance'
  | 'payments'
  | 'domains'
  | 'colleges'
  | 'judges'
  | 'rankings';

export const ReportsPanel: React.FC = () => {
  const { tracks } = useTrack();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = (searchParams.get('tab') as ReportTab) || 'marksheet';
  const [activeTab, setActiveTab] = useState<ReportTab>(tabParam);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as ReportTab;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('');
  const [feedbackRoleFilter, setFeedbackRoleFilter] = useState('');

  const { data: summaryData } = useQuery({
    queryKey: ['report-summary'],
    queryFn: () => api.get('/reports/summary'),
    enabled: activeTab === 'summary',
  });

  const { data: marksheetData, isLoading: marksheetLoading } = useQuery({
    queryKey: ['report-marksheet', trackFilter],
    queryFn: () => api.get(`/reports/marksheet?trackId=${trackFilter}`),
    enabled: activeTab === 'marksheet',
  });

  const { data: feedbackSummaryData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['admin-feedback-summary'],
    queryFn: () => api.get('/feedback/admin/summary'),
    enabled: activeTab === 'feedback',
  });

  const { data: evalsData } = useQuery({
    queryKey: ['report-evaluations', trackFilter],
    queryFn: () => api.get(`/reports/evaluations?trackId=${trackFilter}`),
    enabled: activeTab === 'evaluation',
  });

  const { data: attendData } = useQuery({
    queryKey: ['report-attendance', trackFilter],
    queryFn: () => api.get(`/reports/attendance?trackId=${trackFilter}`),
    enabled: activeTab === 'attendance',
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['report-payments'],
    queryFn: () => api.get('/reports/payments'),
    enabled: activeTab === 'payments',
  });

  const { data: domainsData } = useQuery({
    queryKey: ['report-domains'],
    queryFn: () => api.get('/reports/domains'),
    enabled: activeTab === 'domains',
  });

  const { data: collegesData } = useQuery({
    queryKey: ['report-colleges'],
    queryFn: () => api.get('/reports/colleges'),
    enabled: activeTab === 'colleges',
  });

  const { data: judgesData } = useQuery({
    queryKey: ['report-judges'],
    queryFn: () => api.get('/reports/judges'),
    enabled: activeTab === 'judges',
  });

  const { data: rankingsData } = useQuery({
    queryKey: ['report-rankings'],
    queryFn: () => api.get('/reports/rankings'),
    enabled: activeTab === 'rankings',
  });

  const getFilteredData = (dataList: any[], fields: string[]) => {
    if (!search) return dataList || [];
    const term = search.toLowerCase();
    return (dataList || []).filter((item) =>
      fields.some((field) => String(item[field] || '').toLowerCase().includes(term))
    );
  };

  const downloadCSV = (headers: string[], rows: any[][], fileName: string) => {
    const csvContent = [
      headers.join(','),
      ...rows.map((e) => e.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (activeTab === 'marksheet') {
      if (!marksheetData?.themes) return;
      const headers = [
        'Theme / Track Name',
        'Rank',
        'Registration ID',
        'Team Name',
        'College',
        'Lead Name',
        'Lead Email',
        'Review 1 Score (/100)',
        'Review 2 Score (/100)',
        'Review 3 Score (/100)',
        'Total Score (/300)',
        'Status',
      ];

      const rows: any[][] = [];
      marksheetData.themes.forEach((theme: any) => {
        if (selectedThemeFilter && theme.themeName !== selectedThemeFilter) return;
        theme.teams.forEach((t: any) => {
          if (
            search &&
            !t.teamName.toLowerCase().includes(search.toLowerCase()) &&
            !t.registrationId.toLowerCase().includes(search.toLowerCase()) &&
            !t.college.toLowerCase().includes(search.toLowerCase())
          ) {
            return;
          }
          rows.push([
            theme.themeName,
            t.rank,
            t.registrationId,
            t.teamName,
            t.college,
            t.leadName,
            t.leadEmail,
            t.review1Score ?? 'N/A',
            t.review2Score ?? 'N/A',
            t.review3Score ?? 'N/A',
            t.totalScore,
            t.status,
          ]);
        });
      });

      downloadCSV(headers, rows, 'theme_wise_marksheet_export');
    } else if (activeTab === 'feedback') {
      if (!feedbackSummaryData?.feedbacks) return;
      const headers = [
        'Respondent Name',
        'Email',
        'Role',
        'Team Name',
        'Track / Theme',
        'Q1 Org & Mgt (/5)',
        'Q2 Problem/Theme (/5)',
        'Q3 Registration (/5)',
        'Q4 Facilities/Tech (/5)',
        'Q5 Mentoring (/5)',
        'Q6 Evaluation Fairness (/5)',
        'Q7 Food & Hospitality (/5)',
        'Q8 Volunteers (/5)',
        'Q9 Learning & Net (/5)',
        'Q10 Overall Satisf. (/5)',
        'Overall Avg Rating (/5.0)',
        'Comments & Suggestions',
        'Submitted At',
      ];

      const filtered = feedbackSummaryData.feedbacks.filter((f: any) => {
        if (feedbackRoleFilter && f.userRole !== feedbackRoleFilter) return false;
        if (search) {
          const term = search.toLowerCase();
          return (
            f.userName.toLowerCase().includes(term) ||
            f.userEmail.toLowerCase().includes(term) ||
            f.teamName.toLowerCase().includes(term) ||
            (f.comments && f.comments.toLowerCase().includes(term))
          );
        }
        return true;
      });

      const rows = filtered.map((f: any) => [
        f.userName,
        f.userEmail,
        f.userRole,
        f.teamName,
        f.trackName,
        f.q1,
        f.q2,
        f.q3,
        f.q4,
        f.q5,
        f.q6,
        f.q7,
        f.q8,
        f.q9,
        f.q10,
        f.avgRating,
        f.comments || '',
        new Date(f.createdAt).toLocaleString(),
      ]);

      downloadCSV(headers, rows, 'feedback_results_database');
    } else if (activeTab === 'evaluation') {
      const data = getFilteredData(evalsData?.evaluations || [], ['teamName', 'trackName']);
      const headers = ['Team Name', 'Track', 'Judge Count', 'Final Score', 'Comments'];
      const rows = data.map((e: any) => [e.teamName, e.trackName, e.judgeCount, e.finalScore, e.comments.join(' | ')]);
      downloadCSV(headers, rows, 'evaluations_report');
    } else if (activeTab === 'attendance') {
      const data = getFilteredData(attendData?.attendance || [], ['teamName', 'trackName', 'college']);
      const headers = ['Team Name', 'Members Count', 'College', 'Track', 'Status', 'Check-In Time'];
      const rows = data.map((e: any) => [e.teamName, e.membersCount, e.college, e.trackName, e.status, e.checkInTime]);
      downloadCSV(headers, rows, 'attendance_report');
    } else if (activeTab === 'payments') {
      const data = getFilteredData(paymentsData?.teams || [], ['name', 'registrationId', 'collegeName', 'domain', 'leadName', 'paymentStatusFinal']);
      const headers = ['Registration ID', 'Team Name', 'College', 'Domain', 'Lead Name', 'Lead Email', 'Payment Status'];
      const rows = data.map((t: any) => [t.registrationId, t.name, t.collegeName || t.college, t.domain, t.leadName, t.leadEmail, t.paymentStatusFinal]);
      downloadCSV(headers, rows, 'payment_report');
    } else if (activeTab === 'domains') {
      const data = getFilteredData(domainsData?.domains || [], ['domain']);
      const headers = ['Theme / Domain', 'Teams Count', 'Participants Count', 'Checked In Count', 'Paid Teams'];
      const rows = data.map((d: any) => [d.domain, d.teamsCount, d.participantsCount, d.checkedInCount, d.paidCount]);
      downloadCSV(headers, rows, 'theme_summary_report');
    } else if (activeTab === 'colleges') {
      const data = getFilteredData(collegesData?.colleges || [], ['collegeName']);
      const headers = ['College Name', 'Teams Count', 'Participants Count', 'Paid Teams'];
      const rows = data.map((c: any) => [c.collegeName, c.teamsCount, c.participantsCount, c.paidCount]);
      downloadCSV(headers, rows, 'college_summary_report');
    } else if (activeTab === 'judges') {
      const data = getFilteredData(judgesData?.judges || [], ['judgeName']);
      const headers = ['Judge Name', 'Assigned Teams', 'Completed Reviews', 'Pending Reviews', 'Avg Duration (mins)'];
      const rows = data.map((j: any) => [j.judgeName, j.assignedCount, j.completedCount, j.pendingCount, j.avgDuration]);
      downloadCSV(headers, rows, 'judges_performance_report');
    } else if (activeTab === 'rankings') {
      const data = getFilteredData(rankingsData?.rankings || [], ['teamName', 'trackName']);
      const headers = ['Rank', 'Team Name', 'Theme / Track', 'Final Score', 'Judge Count'];
      const rows = data.map((r: any) => [r.rank, r.teamName, r.trackName, r.finalScore, r.judgeCount]);
      downloadCSV(headers, rows, 'theme_standings_report');
    }
  };

  const handlePrintPDF = () => {
    if (!marksheetData?.themes) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let themeHtml = '';

    marksheetData.themes.forEach((theme: any) => {
      if (selectedThemeFilter && theme.themeName !== selectedThemeFilter) return;

      const filteredTeams = theme.teams.filter((t: any) => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (
          t.teamName.toLowerCase().includes(term) ||
          t.registrationId.toLowerCase().includes(term) ||
          t.college.toLowerCase().includes(term)
        );
      });

      if (filteredTeams.length === 0) return;

      let tableRows = '';
      filteredTeams.forEach((t: any) => {
        const medal = t.rank === 1 ? '🥇 1st' : t.rank === 2 ? '🥈 2nd' : t.rank === 3 ? '🥉 3rd' : `#${t.rank}`;
        tableRows += `
          <tr style="border-bottom: 1px solid #1E293B;">
            <td style="padding: 10px; font-weight: bold; color: ${t.rank === 1 ? '#F59E0B' : t.rank === 2 ? '#94A3B8' : t.rank === 3 ? '#D97706' : '#64748B'};">${medal}</td>
            <td style="padding: 10px; font-family: monospace; color: #60A5FA; font-weight: bold;">${t.registrationId}</td>
            <td style="padding: 10px; font-weight: bold; color: #F8FAFC;">${t.teamName}</td>
            <td style="padding: 10px; color: #CBD5E1;">${t.college}</td>
            <td style="padding: 10px; color: #94A3B8;">${t.leadName}</td>
            <td style="padding: 10px; text-align: center; color: #38BDF8; font-family: monospace;">${t.review1Score !== null ? t.review1Score + ' / 100' : '-'}</td>
            <td style="padding: 10px; text-align: center; color: #818CF8; font-family: monospace;">${t.review2Score !== null ? t.review2Score + ' / 100' : '-'}</td>
            <td style="padding: 10px; text-align: center; color: #C084FC; font-family: monospace;">${t.review3Score !== null ? t.review3Score + ' / 100' : '-'}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #34D399; font-family: monospace; font-size: 14px;">${t.totalScore} / 300</td>
            <td style="padding: 10px; text-align: center;">
              <span style="background: ${t.completedReviewsCount === 3 ? '#065F46' : '#92400E'}; color: ${t.completedReviewsCount === 3 ? '#34D399' : '#FBBF24'}; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">
                ${t.status}
              </span>
            </td>
          </tr>
        `;
      });

      themeHtml += `
        <div style="page-break-inside: avoid; margin-bottom: 30px; background: #0F172A; border: 1px solid #334155; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3B82F6; padding-bottom: 12px; margin-bottom: 15px;">
            <div>
              <span style="background: #1E3A8A; color: #93C5FD; border: 1px solid #3B82F6; font-size: 11px; font-weight: bold; font-family: monospace; padding: 3px 10px; border-radius: 20px;">
                THEME: ${theme.themeName}
              </span>
              <h2 style="margin: 8px 0 0 0; font-size: 18px; color: #FFFFFF; font-weight: 800;">${theme.themeName} Theme Marksheet</h2>
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 12px; color: #94A3B8;">
              <div>Teams Evaluated: <strong style="color: #34D399;">${theme.completedCount} / ${theme.teamsCount}</strong></div>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
            <thead>
              <tr style="background: #020617; color: #94A3B8; font-family: monospace; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid #334155;">
                <th style="padding: 10px;">Rank</th>
                <th style="padding: 10px;">Reg ID</th>
                <th style="padding: 10px;">Team Name</th>
                <th style="padding: 10px;">College</th>
                <th style="padding: 10px;">Team Lead</th>
                <th style="padding: 10px; text-align: center;">Rev 1 (5m)</th>
                <th style="padding: 10px; text-align: center;">Rev 2 (5m)</th>
                <th style="padding: 10px; text-align: center;">Rev 3 (5m)</th>
                <th style="padding: 10px; text-align: right;">Total Score</th>
                <th style="padding: 10px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartHorizon Hackathon 2026 - Theme-Wise Final Marksheet</title>
          <style>
            @media print {
              body { background: #030712 !important; color: #fff !important; }
              .no-print { display: none; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; background-color: #030712; color: #F8FAFC; margin: 0; padding: 30px; }
            .header-bar { border-b: 2px solid #3B82F6; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 24px; font-weight: 900; color: #FFF; letter-spacing: -0.5px; }
            .subtitle { font-size: 13px; color: #94A3B8; margin-top: 4px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1E293B; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; font-family: monospace; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header-bar">
            <div>
              <div class="title">SMARTHORIZON HACKATHON 2026</div>
              <div class="subtitle">Official Theme-Wise Final Marksheet & Evaluation Report</div>
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 12px; color: #94A3B8;">
              <div>Generated: ${new Date().toLocaleString()}</div>
              <div>Status: Official Verified Audit</div>
            </div>
          </div>

          ${themeHtml}

          <div class="footer">
            <div>SmartHorizon Hackathon Operations Desk &bull; Confidential Official Audit</div>
            <div>Approved by Lead Hackathon Administrator</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const tabsList: { id: ReportTab; label: string; icon: string }[] = [
    { id: 'marksheet', label: 'Theme Marksheets (Theme-Wise)', icon: 'assignment_turned_in' },
    { id: 'feedback', label: 'Feedback Results Database', icon: 'rate_review' },
    { id: 'summary', label: 'Event Summary', icon: 'analytics' },
    { id: 'evaluation', label: 'Evaluation Breakdown', icon: 'gavel' },
    { id: 'attendance', label: 'Attendance Roster', icon: 'how_to_reg' },
    { id: 'payments', label: 'Payment Desk', icon: 'payments' },
    { id: 'domains', label: 'Theme Summary', icon: 'category' },
    { id: 'colleges', label: 'College Representation', icon: 'school' },
    { id: 'judges', label: 'Judge Performance', icon: 'supervised_user_circle' },
    { id: 'rankings', label: 'Theme Standings', icon: 'emoji_events' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-[1600px] mx-auto text-[#FFFFFF] font-sans"
    >
      {/* REPORTS DESK HEADER */}
      <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-5 rounded-sm shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className="text-[#FFFFFF] font-bold tracking-wider">SYS // REPORTS & AUDIT CONTROL DESK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FFFFFF] tracking-tight">
            REPORTS <span className="text-[#FFFFFF]">//</span> AUDIT INTELLIGENCE
          </h1>
          <p className="text-xs text-[#B3B3B3] mt-0.5">
            OFFICIAL MARKSHEETS, FEEDBACK ANALYTICS & EXPORT TELEMETRY
          </p>
        </div>

        {activeTab !== 'summary' && (
          <div className="flex gap-2 font-mono">
            {activeTab === 'marksheet' && (
              <AnimatedButton onClick={handlePrintPDF} variant="primary" size="sm" glow icon="print">
                PRINT PDF MARKSHEET
              </AnimatedButton>
            )}
            <AnimatedButton onClick={handleExportCSV} variant="outline" size="sm" icon="download">
              EXPORT EXCEL / CSV
            </AnimatedButton>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-[#FFFFFF]/20 bg-[#0E0E0E] rounded-sm p-1 overflow-x-auto hide-scrollbar  font-mono">
        {tabsList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSearchParams({ tab: tab.id });
              setSearch('');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'text-[#FFFFFF] font-extrabold bg-[#2B2B2B] border border-[#FFFFFF]/60 shadow-[0_0_8px_rgba(0,200,255,0.2)]'
                : 'text-[#B3B3B3] font-bold hover:text-[#FFFFFF] hover:bg-[#2B2B2B]/40'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Filter / Search Bar */}
      {activeTab !== 'summary' && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-[#0E0E0E] p-3.5 border border-[#FFFFFF]/30 rounded-sm font-mono  shadow-xl">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto text-xs">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#B3B3B3] text-sm">search</span>
              <input
                type="text"
                placeholder="SEARCH TEAM, REG ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0E0E0E] border border-[#FFFFFF]/30 text-[#FFFFFF] pl-8 pr-3 py-1.5 rounded text-xs focus:outline-none focus:border-[#FFFFFF] font-mono placeholder:#465868"
              />
            </div>

            {activeTab === 'marksheet' && marksheetData?.themes && (
              <select
                value={selectedThemeFilter}
                onChange={(e) => setSelectedThemeFilter(e.target.value)}
                className="h-8 bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded text-xs font-mono font-bold px-2.5 text-[#FFFFFF] focus:outline-none"
              >
                <option value="">FILTER: ALL TRACKS</option>
                {marksheetData.themes.map((theme: any) => (
                  <option key={theme.themeName} value={theme.themeName}>
                    {theme.themeName} TRACK
                  </option>
                ))}
              </select>
            )}

            {activeTab === 'feedback' && (
              <select
                value={feedbackRoleFilter}
                onChange={(e) => setFeedbackRoleFilter(e.target.value)}
                className="h-8 bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded text-xs font-mono font-bold px-2.5 text-[#FFFFFF] focus:outline-none"
              >
                <option value="">ROLE: ALL RESPONDENTS</option>
                <option value="STUDENT">STUDENTS ONLY</option>
                <option value="JUDGE">JUDGES ONLY</option>
              </select>
            )}

            {(activeTab === 'evaluation' || activeTab === 'attendance') && (
              <select
                value={trackFilter}
                onChange={(e) => setTrackFilter(e.target.value)}
                className="h-8 bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded text-xs font-mono font-bold px-2.5 text-[#FFFFFF] focus:outline-none"
              >
                <option value="">TRACK: ALL</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Render Tab Contents */}
      <div className="space-y-6">
        {/* TAB 1: THEME-WISE MARKSHEET */}
        {activeTab === 'marksheet' && (
          <div className="space-y-6 font-mono">
            {/* Summary Cards */}
            {marksheetData?.summary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                  <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">TOTAL TRACKS</span>
                  <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                    {marksheetData.summary.totalThemes || marksheetData.summary.totalProblemStatements}
                  </span>
                </div>

                <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                  <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">TOTAL TEAMS</span>
                  <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                    {marksheetData.summary.totalTeams}
                  </span>
                </div>

                <div className="bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                  <span className="text-[10px] text-[#FFFFFF] uppercase font-bold">COMPLETED 3/3 REVIEWS</span>
                  <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                    {marksheetData.summary.completedAllReviewsCount}
                  </span>
                </div>

                <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                  <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">FORMAT</span>
                  <span className="text-lg font-extrabold text-[#FFB020] block pt-0.5">
                    TRACK RANKINGS
                  </span>
                </div>
              </div>
            )}

            {/* Theme Marksheet Cards */}
            {marksheetLoading ? (
              <div className="p-12 text-center font-mono text-xs text-[#FFFFFF] animate-pulse bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm ">
                COMPILING TRACK MARKSHEETS...
              </div>
            ) : !marksheetData?.themes || marksheetData.themes.length === 0 ? (
              <div className="p-12 text-center font-mono text-xs text-[#B3B3B3] border border-dashed border-[#FFFFFF]/20 rounded-sm bg-[#0E0E0E] ">
                NO EVALUATION MARKSHEETS LOGGED YET.
              </div>
            ) : (
              marksheetData.themes.map((theme: any) => {
                if (selectedThemeFilter && theme.themeName !== selectedThemeFilter) return null;

                const filteredTeams = theme.teams.filter((t: any) => {
                  if (!search) return true;
                  const term = search.toLowerCase();
                  return (
                    t.teamName.toLowerCase().includes(term) ||
                    t.registrationId.toLowerCase().includes(term) ||
                    t.college.toLowerCase().includes(term) ||
                    t.leadName.toLowerCase().includes(term)
                  );
                });

                if (filteredTeams.length === 0) return null;

                return (
                  <div key={theme.themeName} className="bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm overflow-hidden shadow-xl ">
                    {/* Theme Header */}
                    <div className="p-4 bg-[#181818] border-b border-[#FFFFFF]/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono font-bold text-[#FFFFFF] bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 px-2.5 py-0.5 rounded uppercase">
                            TRACK: {theme.themeName}
                          </span>
                        </div>
                        <h2 className="text-base font-bold font-mono text-[#FFFFFF] mt-1">{theme.themeName} MARKSHEET</h2>
                      </div>
                      <div className="text-right font-mono text-xs text-[#B3B3B3] shrink-0">
                        <span>COMPLETED 3/3: </span>
                        <strong className="text-[#FFFFFF] font-bold">{theme.completedCount}</strong> / {theme.teamsCount} TEAMS
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="border border-[#FFFFFF]/20 rounded-sm overflow-hidden bg-[#0E0E0E]">
                      <ResponsiveTableContainer title={`REPORTS — ${theme.themeName}`}>
                        <table className="w-full text-left text-xs border-collapse font-mono min-w-[850px]">
                          <thead className="bg-[#181818] text-[#B3B3B3] text-[10px] uppercase border-b border-[#FFFFFF]/20 font-bold">
                            <tr>
                              <th className="p-3 w-14 text-center sticky left-0 z-20 bg-[#181818] min-w-[60px]">RANK</th>
                              <th className="p-3 sticky left-[60px] z-20 bg-[#181818] border-r border-[#FFFFFF]/20 min-w-[130px]">REG ID</th>
                              <th className="p-3 sticky left-[190px] z-20 bg-[#181818] border-r border-[#FFFFFF]/20 min-w-[170px]">TEAM NAME &amp; LEAD</th>
                              <th className="p-3 min-w-[150px]">COLLEGE</th>
                              <th className="p-3 text-center min-w-[100px]">REV 1</th>
                              <th className="p-3 text-center min-w-[100px]">REV 2</th>
                              <th className="p-3 text-center min-w-[100px]">REV 3</th>
                              <th className="p-3 text-right min-w-[110px]">TOTAL SCORE</th>
                              <th className="p-3 text-center min-w-[100px]">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#FFFFFF]/10 bg-[#0E0E0E]">
                            {filteredTeams.map((t: any) => (
                              <tr key={t.teamId} className="hover:bg-[#2B2B2B] transition-colors group">
                                <td className="p-3 text-center font-bold sticky left-0 z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B] min-w-[60px]">
                                  {t.rank === 1 ? (
                                    <span className="text-[#FFB020] bg-[#FFB020]/15 border border-[#FFB020]/40 px-2 py-0.5 rounded text-[10px]">
                                      🥇 1
                                    </span>
                                  ) : t.rank === 2 ? (
                                    <span className="text-[#B3B3B3] bg-[#2B2B2B] border border-[#FFFFFF]/20 px-2 py-0.5 rounded text-[10px]">
                                      🥈 2
                                    </span>
                                  ) : t.rank === 3 ? (
                                    <span className="text-[#FFB020] bg-[#FFB020]/15 border border-[#FFB020]/40 px-2 py-0.5 rounded text-[10px]">
                                      🥉 3
                                    </span>
                                  ) : (
                                    <span className="text-[#B3B3B3]">#{t.rank}</span>
                                  )}
                                </td>
                                <td className="p-3 font-bold text-[#FFFFFF] sticky left-[60px] z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B] border-r border-[#FFFFFF]/20 min-w-[130px]">{t.registrationId}</td>
                                <td className="p-3 font-sans sticky left-[190px] z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B] border-r border-[#FFFFFF]/20 min-w-[170px]">
                                  <span className="font-bold text-[#FFFFFF] block">{t.teamName}</span>
                                  <span className="text-[10px] text-[#B3B3B3] font-mono block mt-0.5">LEAD: {t.leadName}</span>
                                </td>
                                <td className="p-3 font-sans text-[#B3B3B3] truncate max-w-[160px] min-w-[150px]">{t.college}</td>
                                <td className="p-3 text-center text-[#FFFFFF] font-bold min-w-[100px]">
                                  {t.review1Score !== null ? `${t.review1Score} / 100` : '-'}
                                </td>
                                <td className="p-3 text-center text-[#FFFFFF] font-bold min-w-[100px]">
                                  {t.review2Score !== null ? `${t.review2Score} / 100` : '-'}
                                </td>
                                <td className="p-3 text-center text-[#FFFFFF] font-bold min-w-[100px]">
                                  {t.review3Score !== null ? `${t.review3Score} / 100` : '-'}
                                </td>
                                <td className="p-3 text-right font-bold text-[#FFFFFF] text-sm min-w-[110px]">
                                  {t.totalScore} <span className="text-[10px] text-[#B3B3B3] font-normal">/ 300</span>
                                </td>
                                <td className="p-3 text-center min-w-[100px]">
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                                    t.completedReviewsCount === 3
                                      ? 'bg-[#FFFFFF]/10 text-[#FFFFFF] border-[#FFFFFF]/40'
                                      : 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/40'
                                  }`}
                                >
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ResponsiveTableContainer>
                  </div>
                </div>
              );
              })
            )}
          </div>
        )}

        {/* TAB 2: FEEDBACK RESULTS DATABASE */}
        {activeTab === 'feedback' && (
          <div className="space-y-6 font-mono">
            {feedbackLoading ? (
              <div className="p-12 text-center font-mono text-xs text-[#FFFFFF] animate-pulse bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm ">
                COMPILING FEEDBACK DATABASE RESULTS...
              </div>
            ) : !feedbackSummaryData?.summary ? (
              <div className="p-12 text-center font-mono text-xs text-[#B3B3B3] border border-dashed border-[#FFFFFF]/20 rounded-sm bg-[#0E0E0E] ">
                NO FEEDBACK SUBMISSIONS RECORDED YET.
              </div>
            ) : (
              <>
                {/* Role Switcher Sub-Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E0E0E] p-2.5 rounded-sm border border-[#FFFFFF]/30  text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[#B3B3B3] uppercase font-bold px-1">FILTER:</span>
                    <button
                      onClick={() => setFeedbackRoleFilter('')}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                        feedbackRoleFilter === ''
                          ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#FFFFFF]/60'
                          : 'text-[#B3B3B3] hover:text-[#FFFFFF]'
                      }`}
                    >
                      <span>ALL ({feedbackSummaryData.summary.totalResponses})</span>
                    </button>

                    <button
                      onClick={() => setFeedbackRoleFilter('STUDENT')}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                        feedbackRoleFilter === 'STUDENT'
                          ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#FFFFFF]/60'
                          : 'text-[#B3B3B3] hover:text-[#FFFFFF]'
                      }`}
                    >
                      <span>STUDENTS ({feedbackSummaryData.summary.studentResponsesCount})</span>
                    </button>

                    <button
                      onClick={() => setFeedbackRoleFilter('JUDGE')}
                      className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                        feedbackRoleFilter === 'JUDGE'
                          ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#FFFFFF]/60'
                          : 'text-[#B3B3B3] hover:text-[#FFFFFF]'
                      }`}
                    >
                      <span>JUDGES ({feedbackSummaryData.summary.judgeResponsesCount})</span>
                    </button>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                    <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">RESPONSES</span>
                    <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                      {feedbackRoleFilter === 'STUDENT' ? feedbackSummaryData.summary.studentResponsesCount :
                       feedbackRoleFilter === 'JUDGE' ? feedbackSummaryData.summary.judgeResponsesCount :
                       feedbackSummaryData.summary.totalResponses}
                    </span>
                  </div>

                  <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                    <span className="text-[10px] text-[#FFFFFF] uppercase font-bold">STUDENT AVG SCORE</span>
                    <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                      {feedbackSummaryData.summary.studentAvgRating} / 5.0
                    </span>
                  </div>

                  <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                    <span className="text-[10px] text-[#FFFFFF] uppercase font-bold">JUDGE AVG SCORE</span>
                    <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                      {feedbackSummaryData.summary.judgeAvgRating} / 5.0
                    </span>
                  </div>

                  <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                    <span className="text-[10px] text-[#FFFFFF] uppercase font-bold">VIEW AVERAGE</span>
                    <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                      {feedbackRoleFilter === 'STUDENT' ? feedbackSummaryData.summary.studentAvgRating :
                       feedbackRoleFilter === 'JUDGE' ? feedbackSummaryData.summary.judgeAvgRating :
                       feedbackSummaryData.summary.overallAvgRating} / 5.0
                    </span>
                  </div>
                </div>

                {/* Feedback Database Records Table */}
                <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm overflow-hidden shadow-xl ">
                  <div className="p-4 border-b border-[#FFFFFF]/20 flex justify-between items-center bg-[#181818] text-xs">
                    <h3 className="font-bold text-[#FFFFFF] uppercase flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#FFFFFF] text-base">database</span>
                      <span>FEEDBACK SUBMISSIONS DATABASE</span>
                    </h3>
                    <span className="text-[#B3B3B3]">
                      SHOWING {feedbackSummaryData.feedbacks.length} RECORDS
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#181818] text-[#B3B3B3] text-[10px] uppercase border-b border-[#FFFFFF]/20 font-bold">
                        <tr>
                          <th className="p-3">RESPONDENT</th>
                          <th className="p-3">ROLE</th>
                          <th className="p-3">TEAM / TRACK</th>
                          <th className="p-3 text-center">AVG RATING</th>
                          <th className="p-3">COMMENTS & SUGGESTIONS</th>
                          <th className="p-3">SUBMITTED AT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#FFFFFF]/10 bg-[#0E0E0E]">
                        {feedbackSummaryData.feedbacks
                          .filter((f: any) => {
                            if (feedbackRoleFilter && f.userRole !== feedbackRoleFilter) return false;
                            if (search) {
                              const term = search.toLowerCase();
                              return (
                                f.userName.toLowerCase().includes(term) ||
                                f.userEmail.toLowerCase().includes(term) ||
                                f.teamName.toLowerCase().includes(term) ||
                                (f.comments && f.comments.toLowerCase().includes(term))
                              );
                            }
                            return true;
                          })
                          .map((f: any) => (
                            <tr key={f.id} className="hover:bg-[#2B2B2B] transition-colors">
                              <td className="p-3 font-sans">
                                <span className="font-bold text-[#FFFFFF] block">{f.userName}</span>
                                <span className="text-[10px] text-[#B3B3B3] font-mono block">{f.userEmail}</span>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                                    f.userRole === 'STUDENT'
                                      ? 'bg-[#FFFFFF]/10 text-[#FFFFFF] border-[#FFFFFF]/30'
                                      : 'bg-[#FFFFFF]/10 text-[#FFFFFF] border-[#FFFFFF]/30'
                                  }`}
                                >
                                  {f.userRole}
                                </span>
                              </td>
                              <td className="p-3 font-sans text-[#FFFFFF]">
                                {f.teamName !== 'N/A' ? (
                                  <>
                                    <strong className="text-[#FFFFFF]">{f.teamName}</strong>
                                    <span className="block text-[10px] text-[#FFFFFF] font-mono">TRACK: {f.trackName}</span>
                                  </>
                                ) : (
                                  <span className="text-[#B3B3B3] italic">Judge Platform Feedback</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-[#FFFFFF] text-sm">
                                {f.avgRating}
                              </td>
                              <td className="p-3 font-sans text-[#B3B3B3] text-xs max-w-xs truncate">
                                {f.comments || <span className="text-[#B3B3B3] italic">No comment text</span>}
                              </td>
                              <td className="p-3 text-[#B3B3B3] text-[10px]">
                                {new Date(f.createdAt).toLocaleDateString()}{' '}
                                {new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SUMMARY TAB */}
        {activeTab === 'summary' && summaryData && (
          <div className="space-y-6 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">CHECKED-IN / REGISTERED</span>
                <span className="text-2xl font-extrabold text-[#FFFFFF] block mt-1">
                  {summaryData.summary.teamsCheckedIn} / {summaryData.summary.teamsRegistered}
                </span>
              </div>

              <div className="bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                <span className="text-[10px] text-[#FFFFFF] uppercase font-bold">REVIEWS FINALIZED</span>
                <span className="text-2xl font-extrabold text-[#FFFFFF] block mt-1">
                  {summaryData.summary.reviewsCompleted}
                </span>
              </div>

              <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                <span className="text-[10px] text-[#FFFFFF] uppercase font-bold">JUDGE UTILIZATION</span>
                <span className="text-2xl font-extrabold text-[#FFFFFF] block mt-1">
                  {summaryData.summary.judgeUtilization}%
                </span>
              </div>

              <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">QUESTIONS RESOLVED</span>
                <span className="text-2xl font-extrabold text-[#FFFFFF] block mt-1">
                  {summaryData.summary.questionsAnswered}
                </span>
              </div>
            </div>

            <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-5 rounded-sm space-y-4  shadow-xl">
              <h3 className="text-xs font-bold uppercase text-[#FFFFFF] border-b border-[#FFFFFF]/20 pb-3 tracking-wider">
                TRACK EVALUATION COMPLETION PROGRESS
              </h3>
              <div className="space-y-4 text-xs">
                {summaryData.summary.trackCompletion.map((t: any) => (
                  <div key={t.trackName} className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-bold text-[#FFFFFF]">{t.trackName}</span>
                      <span className="font-bold text-[#FFFFFF]">
                        {t.completionRate}% ({t.completedReviews} REVIEWS)
                      </span>
                    </div>
                    <div className="w-full bg-[#0E0E0E] h-2 rounded overflow-hidden border border-[#FFFFFF]/20">
                      <div
                        className="bg-[#FFFFFF] h-full rounded transition-all duration-1000"
                        style={{ width: `${t.completionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm overflow-hidden shadow-xl font-mono ">
            <div className="p-4 border-b border-[#FFFFFF]/20 flex justify-between items-center bg-[#181818] text-xs">
              <h3 className="font-bold text-[#FFFFFF] uppercase">PAYMENT STATUS REPORT</h3>
              <span className="text-[#FFFFFF] bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 px-2 py-0.5 rounded font-bold">
                PAID: {paymentsData?.summary?.paidTeams || 0} / {paymentsData?.summary?.totalTeams || 0} ({paymentsData?.summary?.paymentRate || 0}%)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181818] text-[#B3B3B3] text-[10px] uppercase border-b border-[#FFFFFF]/20 font-bold">
                    <th className="p-3">REG ID</th>
                    <th className="p-3">TEAM NAME</th>
                    <th className="p-3">COLLEGE</th>
                    <th className="p-3">TRACK</th>
                    <th className="p-3">LEAD NAME</th>
                    <th className="p-3">LEAD EMAIL</th>
                    <th className="p-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFFFFF]/10 bg-[#0E0E0E]">
                  {getFilteredData(paymentsData?.teams, ['name', 'registrationId', 'collegeName', 'domain', 'leadName']).map((t: any) => (
                    <tr key={t.id} className="hover:bg-[#2B2B2B]">
                      <td className="p-3 text-[#FFFFFF] font-bold">{t.registrationId}</td>
                      <td className="p-3 font-sans font-bold text-[#FFFFFF]">{t.name}</td>
                      <td className="p-3 text-[#B3B3B3] font-sans">{t.collegeName || t.college}</td>
                      <td className="p-3 text-[#FFFFFF]">{t.domain}</td>
                      <td className="p-3 font-sans text-[#FFFFFF]">{t.leadName}</td>
                      <td className="p-3 text-[#B3B3B3]">{t.leadEmail}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${t.paymentStatusFinal === 'PAID' ? 'bg-[#FFFFFF]/10 text-[#FFFFFF] border-[#FFFFFF]/30' : 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30'}`}>
                          {t.paymentStatusFinal || 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'domains' && (
          <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm overflow-hidden shadow-xl font-mono ">
            <div className="p-4 border-b border-[#FFFFFF]/20 bg-[#181818]">
              <h3 className="font-bold text-[#FFFFFF] uppercase text-xs">TRACK BREAKDOWN SUMMARY</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181818] text-[#B3B3B3] text-[10px] uppercase border-b border-[#FFFFFF]/20 font-bold">
                    <th className="p-3">TRACK / DOMAIN</th>
                    <th className="p-3">TOTAL TEAMS</th>
                    <th className="p-3">PARTICIPANTS COUNT</th>
                    <th className="p-3">CHECKED IN TEAMS</th>
                    <th className="p-3">PAID TEAMS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFFFFF]/10 bg-[#0E0E0E]">
                  {getFilteredData(domainsData?.domains, ['domain']).map((d: any) => (
                    <tr key={d.domain} className="hover:bg-[#2B2B2B]">
                      <td className="p-3 font-sans font-bold text-[#FFFFFF]">{d.domain}</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{d.teamsCount}</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{d.participantsCount}</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{d.checkedInCount}</td>
                      <td className="p-3 text-[#FFFFFF]">{d.paidCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'colleges' && (
          <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm overflow-hidden shadow-xl font-mono ">
            <div className="p-4 border-b border-[#FFFFFF]/20 flex justify-between items-center bg-[#181818] text-xs">
              <h3 className="font-bold text-[#FFFFFF] uppercase">COLLEGE REPRESENTATION SUMMARY</h3>
              <span className="text-[#FFFFFF] bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 px-2 py-0.5 rounded font-bold">
                {collegesData?.totalColleges || 0} INSTITUTIONS REPRESENTED
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181818] text-[#B3B3B3] text-[10px] uppercase border-b border-[#FFFFFF]/20 font-bold">
                    <th className="p-3">COLLEGE / INSTITUTION</th>
                    <th className="p-3">TEAMS COUNT</th>
                    <th className="p-3">PARTICIPANTS COUNT</th>
                    <th className="p-3">PAID TEAMS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFFFFF]/10 bg-[#0E0E0E]">
                  {getFilteredData(collegesData?.colleges, ['collegeName']).map((c: any) => (
                    <tr key={c.collegeName} className="hover:bg-[#2B2B2B]">
                      <td className="p-3 font-sans font-bold text-[#FFFFFF]">{c.collegeName}</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{c.teamsCount}</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{c.participantsCount}</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{c.paidCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'evaluation' && (
          <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm overflow-hidden shadow-xl font-mono ">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181818] text-[#B3B3B3] text-[10px] uppercase border-b border-[#FFFFFF]/20 font-bold">
                    <th className="p-3">TEAM NAME</th>
                    <th className="p-3">TRACK</th>
                    <th className="p-3">JUDGES COUNT</th>
                    <th className="p-3">SCORE</th>
                    <th className="p-3">COMMENTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFFFFF]/10 bg-[#0E0E0E]">
                  {getFilteredData(evalsData?.evaluations, ['teamName', 'trackName']).map((e: any) => (
                    <tr key={e.teamId} className="hover:bg-[#2B2B2B]">
                      <td className="p-3 font-sans font-bold text-[#FFFFFF]">{e.teamName}</td>
                      <td className="p-3 text-[#FFFFFF]">{e.trackName}</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{e.judgeCount}</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{e.finalScore}</td>
                      <td className="p-3 text-[#B3B3B3] font-sans text-xs">{e.comments.join(' | ') || 'No comments'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-6 font-mono">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                <span className="text-[10px] text-[#B3B3B3] uppercase font-bold">ENROLLED TEAMS</span>
                <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                  {attendData?.summary?.totalTeams || attendData?.attendance?.length || 0}
                </span>
              </div>

              <div className="bg-[#FFFFFF]/10 border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                <span className="text-[10px] text-[#FFFFFF] uppercase font-bold">CHECKED IN TEAMS</span>
                <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                  {attendData?.summary?.checkedInCount || attendData?.attendance?.filter((x: any) => x.checkedIn).length || 0}
                </span>
              </div>

              <div className="bg-[#FFB020]/10 border border-[#FFB020]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                <span className="text-[10px] text-[#FFB020] uppercase font-bold">PENDING CHECK-IN</span>
                <span className="text-2xl font-extrabold text-[#FFB020] block">
                  {attendData?.summary?.pendingCount || attendData?.attendance?.filter((x: any) => !x.checkedIn).length || 0}
                </span>
              </div>

              <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 p-3.5 rounded-sm space-y-1  shadow-xl">
                <span className="text-[10px] text-[#FFFFFF] uppercase font-bold">ATTENDANCE RATE</span>
                <span className="text-2xl font-extrabold text-[#FFFFFF] block">
                  {attendData?.summary?.checkInPercentage || 0}%
                </span>
              </div>
            </div>

            {/* Attendance & Team Members Table */}
            <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm overflow-hidden shadow-xl ">
              <div className="p-4 border-b border-[#FFFFFF]/20 flex justify-between items-center bg-[#181818] text-xs">
                <h3 className="font-bold text-[#FFFFFF] uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FFFFFF] text-base">fact_check</span>
                  <span>OFFICIAL ATTENDANCE & TEAM ROSTER</span>
                </h3>
                <span className="text-[#B3B3B3]">
                  SHOWING {getFilteredData(attendData?.attendance, ['teamName', 'registrationId', 'trackName', 'college', 'leadName']).length} TEAMS
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#181818] text-[#B3B3B3] text-[10px] uppercase border-b border-[#FFFFFF]/20 font-bold">
                    <tr>
                      <th className="p-3">REG ID</th>
                      <th className="p-3">TEAM NAME & TRACK</th>
                      <th className="p-3">COLLEGE</th>
                      <th className="p-3">ROSTER MEMBERS</th>
                      <th className="p-3 text-center">STATUS</th>
                      <th className="p-3 text-right">TIME</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FFFFFF]/10 bg-[#0E0E0E]">
                    {getFilteredData(attendData?.attendance, ['teamName', 'registrationId', 'trackName', 'college', 'leadName']).map((a: any) => (
                      <tr key={a.teamId} className="hover:bg-[#2B2B2B] transition-colors">
                        <td className="p-3 font-bold text-[#FFFFFF]">
                          {a.registrationId}
                        </td>
                        <td className="p-3 font-sans">
                          <span className="font-bold text-[#FFFFFF] block">{a.teamName}</span>
                          <span className="text-[10px] text-[#FFFFFF] font-mono block mt-0.5">TRK: {a.trackName}</span>
                        </td>
                        <td className="p-3 text-[#B3B3B3] font-sans max-w-[160px] truncate">{a.college}</td>
                        <td className="p-3 font-sans max-w-xs">
                          <div className="space-y-1 text-[10px]">
                            {a.members && a.members.length > 0 ? (
                              a.members.map((m: any) => (
                                <span key={m.id || m.email} className="inline-block mr-1.5 bg-[#2B2B2B] border border-[#FFFFFF]/20 px-1.5 py-0.5 rounded text-[#FFFFFF]">
                                  {m.name} ({m.role})
                                </span>
                              ))
                            ) : (
                              <span className="text-[#FFFFFF]">{a.leadName} (LEADER)</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                              a.checkedIn
                                ? 'bg-[#FFFFFF]/10 text-[#FFFFFF] border-[#FFFFFF]/40'
                                : 'bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/40'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        <td className="p-3 text-right text-[#B3B3B3] text-xs">
                          {a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'judges' && (
          <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm overflow-hidden shadow-xl font-mono ">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181818] text-[#B3B3B3] text-[10px] uppercase border-b border-[#FFFFFF]/20 font-bold">
                    <th className="p-3">JUDGE NAME</th>
                    <th className="p-3">ASSIGNED TEAMS</th>
                    <th className="p-3">COMPLETED REVIEWS</th>
                    <th className="p-3">PENDING REVIEWS</th>
                    <th className="p-3">AVG DURATION</th>
                    <th className="p-3">AVG SCORE GIVEN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFFFFF]/10 bg-[#0E0E0E]">
                  {getFilteredData(judgesData?.judges, ['judgeName']).map((j: any) => (
                    <tr key={j.judgeId} className="hover:bg-[#2B2B2B]">
                      <td className="p-3 font-sans font-bold text-[#FFFFFF]">{j.judgeName}</td>
                      <td className="p-3 text-[#B3B3B3]">{j.assignedCount}</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{j.completedCount}</td>
                      <td className="p-3 text-[#FFB020] font-bold">{j.pendingCount}</td>
                      <td className="p-3 text-[#B3B3B3]">{j.avgDuration} MINS</td>
                      <td className="p-3 text-[#FFFFFF] font-bold">{j.avgScoreGiven}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rankings' && (
          <div className="bg-[#0E0E0E] border border-[#FFFFFF]/30 rounded-sm overflow-hidden shadow-xl font-mono ">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181818] text-[#B3B3B3] text-[10px] uppercase border-b border-[#FFFFFF]/20 font-bold">
                    <th className="p-3 text-center">RANK</th>
                    <th className="p-3">TEAM NAME</th>
                    <th className="p-3">TRACK</th>
                    <th className="p-3 text-center">REVIEWS COMPLETED</th>
                    <th className="p-3 text-right">FINAL SCORE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FFFFFF]/10 bg-[#0E0E0E]">
                  {getFilteredData(rankingsData?.rankings, ['teamName', 'trackName']).map((r: any) => (
                    <tr key={r.teamId} className="hover:bg-[#2B2B2B]">
                      <td className="p-3 text-center font-bold text-[#FFFFFF]">
                        {r.rank === 1 ? '🥇 1' : r.rank === 2 ? '🥈 2' : r.rank === 3 ? '🥉 3' : `#${r.rank}`}
                      </td>
                      <td className="p-3 font-sans font-bold text-[#FFFFFF]">{r.teamName}</td>
                      <td className="p-3 text-[#FFFFFF]">{r.trackName}</td>
                      <td className="p-3 text-center text-[#B3B3B3]">{r.judgeCount}</td>
                      <td className="p-3 text-right font-extrabold text-[#FFFFFF] text-sm">{r.finalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ReportsPanel;
