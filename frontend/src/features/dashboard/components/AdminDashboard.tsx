import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  FileSpreadsheet,
  Monitor,
  CheckCircle2,
  Users,
  HelpCircle,
  BarChart2,
  LayoutGrid,
  AlertTriangle,
  Activity,
  Trophy,
  Download,
  Printer,
  QrCode,
  UserCheck,
  X,
  Search,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useTrack } from '../../../context/TrackContext';
import { ReviewProgressMatrix } from './ReviewProgressMatrix';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { ResponsiveTableContainer } from '../../../shared/components/ResponsiveTableContainer';
import { TeamDetailDrawer } from './TeamDetailDrawer';
import { AssignTeamsModal } from '../../judges/components/AssignTeamsModal';

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedTrackId, selectedTrackName } = useTrack();
  const [missionControl, setMissionControl] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminSelectedQrTeam, setAdminSelectedQrTeam] = useState<any>(null);

  // Manual Check-In Toggle Mutation
  const toggleCheckInMutation = async (teamId: string, currentStatus: boolean) => {
    try {
      const res: any = await api.post(`/teams/${teamId}/checkin`, { checkedIn: !currentStatus });
      if (res.success || res.team) {
        queryClient.invalidateQueries({ queryKey: ['report-attendance-admin'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      }
    } catch (err: any) {
      alert('Failed to update check-in status: ' + (err.message || 'Error'));
    }
  };

  // Feedback Toggle Query & Mutation
  const { data: fbStatusData } = useQuery({
    queryKey: ['feedback-status'],
    queryFn: () => api.get('/feedback/status'),
  });
  const feedbackEnabled = fbStatusData?.feedbackEnabled ?? false;

  const toggleFeedbackMutation = async () => {
    try {
      const res: any = await api.post('/feedback/toggle', { enabled: !feedbackEnabled });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['feedback-status'] });
      }
    } catch (err: any) {
      alert('Failed to toggle feedback status: ' + (err.message || 'Error'));
    }
  };

  // Marksheet / Handy Teams Marks Query
  const { data: marksheetData, isLoading: marksheetLoading } = useQuery({
    queryKey: ['marksheet-report', selectedTrackId],
    queryFn: () => {
      const url = selectedTrackId
        ? `/reports/marksheet?trackId=${selectedTrackId}`
        : '/reports/marksheet';
      return api.get(url);
    },
    refetchInterval: 15000,
  });

  const marksheetThemes: any[] = marksheetData?.themes || [];

  // Attendance Roster Query
  const { data: attendData, isLoading: attendLoading } = useQuery({
    queryKey: ['report-attendance-admin', selectedTrackId],
    queryFn: () => {
      const url = selectedTrackId
        ? `/reports/attendance?trackId=${selectedTrackId}`
        : '/reports/attendance';
      return api.get(url);
    },
    refetchInterval: 15000,
  });

  const attendanceList: any[] = attendData?.attendance || [];

  // Export Marksheet CSV
  const handleExportMarksCSV = () => {
    if (!marksheetThemes || marksheetThemes.length === 0) {
      alert('No marksheet data available to export.');
      return;
    }

    const headers = [
      'Theme / Track Name',
      'Rank',
      'Registration ID',
      'Team Name',
      'College Institution',
      'Team Leader',
      'Leader Email',
      'Review 1 (5m)',
      'Review 2 (5m)',
      'Review 3 (5m)',
      'Total Marks',
      'Status',
    ];

    const rows: any[][] = [];
    marksheetThemes.forEach((theme: any) => {
      theme.teams.forEach((t: any) => {
        rows.push([
          theme.themeName,
          t.rank,
          t.registrationId,
          t.teamName,
          t.college,
          t.leadName,
          t.leadEmail,
          t.review1Score !== null ? `${t.review1Score}/100` : 'Not Complete',
          t.review2Score !== null ? `${t.review2Score}/100` : 'Not Complete',
          t.review3Score !== null ? `${t.review3Score}/100` : 'Not Complete',
          `${t.totalScore}/300`,
          t.status,
        ]);
      });
    });

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map(escapeCsv).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smarthorizon_theme_marksheets.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable Formatted Marks PDF Generator
  const handlePrintMarksPDF = () => {
    if (!marksheetThemes || marksheetThemes.length === 0) {
      alert('No marksheet data available to print.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let themeHtml = '';
    marksheetThemes.forEach((theme: any) => {
      let tableRows = '';
      theme.teams.forEach((t: any) => {
        const medal = t.rank === 1 ? '🥇 1st' : t.rank === 2 ? '🥈 2nd' : t.rank === 3 ? '🥉 3rd' : `#${t.rank}`;
        const r1Text = t.review1Score !== null ? `${t.review1Score}/100` : 'Not Complete';
        const r2Text = t.review2Score !== null ? `${t.review2Score}/100` : 'Not Complete';
        const r3Text = t.review3Score !== null ? `${t.review3Score}/100` : 'Not Complete';

        tableRows += `
          <tr style="border-bottom: 1px solid #2B2B2B;">
            <td style="padding: 10px; font-weight: bold; color: #FFFFFF;">${medal}</td>
            <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #D4D4D4;">${t.registrationId}</td>
            <td style="padding: 10px; font-weight: bold; color: #FFFFFF;">${t.teamName}</td>
            <td style="padding: 10px; color: #B3B3B3;">${t.college}</td>
            <td style="padding: 10px; font-family: monospace; font-size: 11px; color: #B3B3B3;">
              R1: ${r1Text} &bull; R2: ${r2Text} &bull; R3: ${r3Text}
            </td>
            <td style="padding: 10px; text-align: right; font-family: monospace; font-weight: bold; color: #FFFFFF;">
              ${t.totalScore} / 300
            </td>
          </tr>
        `;
      });

      themeHtml += `
        <div style="margin-bottom: 30px; border: 1px solid #2B2B2B; border-radius: 8px; overflow: hidden; background: #181818; padding: 15px;">
          <div style="font-size: 14px; font-weight: bold; color: #FFFFFF; margin-bottom: 12px; text-transform: uppercase; font-family: monospace; border-bottom: 1px solid #2B2B2B; padding-bottom: 8px;">
            THEME / TRACK: ${theme.themeName} (${theme.teams.length} Teams)
          </div>
          
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
            <thead>
              <tr style="background: #2B2B2B; color: #FFFFFF; font-family: monospace; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid #555555;">
                <th style="padding: 10px;">Rank</th>
                <th style="padding: 10px;">Reg ID</th>
                <th style="padding: 10px;">Team Name</th>
                <th style="padding: 10px;">College</th>
                <th style="padding: 10px;">Descriptive Review Status</th>
                <th style="padding: 10px; text-align: right;">Total Marks</th>
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
          <title>SmartHorizon Hackathon 2026 - Current Team Marks List</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background-color: #0E0E0E; color: #FFFFFF; margin: 0; padding: 30px; }
            .header-bar { border-bottom: 2px solid #2B2B2B; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 24px; font-weight: 900; color: #FFFFFF; }
            .subtitle { font-size: 13px; color: #B3B3B3; margin-top: 4px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #2B2B2B; display: flex; justify-content: space-between; font-size: 11px; color: #B3B3B3; font-family: monospace; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header-bar">
            <div>
              <div class="title">SMARTHORIZON HACKATHON 2026</div>
              <div class="subtitle">Official Current Marks List & Descriptive Review Status Report</div>
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 12px; color: #D4D4D4;">
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

  // Export Attendance CSV
  const handleExportAttendanceCSV = () => {
    if (!attendanceList || attendanceList.length === 0) {
      alert('No attendance data available to export.');
      return;
    }

    const headers = [
      'Registration ID',
      'Team Name',
      'Theme / Track',
      'College Institution',
      'Team Leader',
      'Leader Email',
      'Leader Phone',
      'Leader USN',
      'Members Count',
      'Check-In Status',
      'Check-In Time',
      'Checked In By',
      'All Members Roster',
    ];

    const rows = attendanceList.map((a: any) => [
      a.registrationId,
      a.teamName,
      a.trackName,
      a.college,
      a.leadName,
      a.leadEmail,
      a.leadMobile,
      a.leadUsn,
      a.membersCount,
      a.status,
      a.checkInTime ? new Date(a.checkInTime).toLocaleString() : 'N/A',
      a.checkedInBy || 'Desk Staff',
      a.membersList || `${a.leadName} (LEADER)`,
    ]);

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map(escapeCsv).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smarthorizon_official_attendance_sheet.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printable Attendance PDF Generator
  const handlePrintAttendancePDF = () => {
    if (!attendanceList || attendanceList.length === 0) {
      alert('No attendance data available to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHtml = attendanceList
      .map(
        (a: any) => `
      <tr style="border-bottom: 1px solid #2B2B2B;">
        <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #FFFFFF;">${a.registrationId}</td>
        <td style="padding: 10px; font-weight: bold; color: #FFFFFF;">${a.teamName}</td>
        <td style="padding: 10px; color: #B3B3B3;">${a.trackName}</td>
        <td style="padding: 10px; color: #B3B3B3;">${a.college}</td>
        <td style="padding: 10px; font-size: 11px;">
          <div style="font-weight: bold; color: #FFFFFF;">${a.leadName} (Leader)</div>
          <div style="color: #B3B3B3;">${a.leadEmail} &bull; ${a.leadMobile}</div>
        </td>
        <td style="padding: 10px; font-size: 11px; color: #B3B3B3;">${a.membersList || a.leadName}</td>
        <td style="padding: 10px; text-align: center;">
          <span style="background: ${a.checkedIn ? '#2B2B2B' : '#181818'}; color: ${a.checkedIn ? '#FFFFFF' : '#B3B3B3'}; border: 1px solid #555555; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 10px;">
            ${a.status}
          </span>
        </td>
      </tr>
    `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartHorizon 2026 - Official Attendance Sheet</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0E0E0E; color: #FFFFFF; padding: 30px; }
            h2 { font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 4px; }
            .sub { color: #B3B3B3; font-size: 12px; margin-bottom: 20px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
            th { background: #181818; padding: 10px; font-family: monospace; text-transform: uppercase; font-size: 10px; color: #FFFFFF; border-bottom: 2px solid #2B2B2B; }
          </style>
        </head>
        <body onload="window.print();">
          <h2>SMARTHORIZON HACKATHON 2026 &bull; OFFICIAL VENUE ATTENDANCE SHEET</h2>
          <div class="sub">Generated: ${new Date().toLocaleString()} &bull; Total Registered Teams: ${attendanceList.length}</div>
          <table>
            <thead>
              <tr>
                <th>Reg ID</th>
                <th>Team Name</th>
                <th>Theme</th>
                <th>College</th>
                <th>Leader Details</th>
                <th>All Members</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Printable Team QR Badges Generator
  const handlePrintQRBadges = () => {
    if (!attendanceList || attendanceList.length === 0) {
      alert('No team data available to generate QR badges.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const badgesHtml = attendanceList
      .map((a: any) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(a.teamCode || a.registrationId)}`;
        return `
          <div style="width: 220px; padding: 16px; border: 2px solid #2B2B2B; border-radius: 12px; text-align: center; background: #181818; color: #FFFFFF; margin: 10px; display: inline-block; page-break-inside: avoid;">
            <div style="font-size: 10px; font-weight: bold; color: #D4D4D4; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">SMARTHORIZON 2026</div>
            <img src="${qrUrl}" alt="QR Code" style="width: 130px; height: 130px; margin: 0 auto; display: block; border-radius: 8px; border: 1px solid #2B2B2B; background: #ffffff; padding: 4px;" />
            <div style="font-family: monospace; font-size: 14px; font-weight: bold; color: #FFFFFF; margin-top: 8px;">${a.registrationId}</div>
            <div style="font-size: 13px; font-weight: 800; color: #FFFFFF; margin-top: 2px;">${a.teamName}</div>
            <div style="font-size: 10px; color: #B3B3B3; margin-top: 4px;">Theme: ${a.trackName}</div>
            <div style="font-size: 9px; color: #B3B3B3; margin-top: 2px;">${a.college}</div>
          </div>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartHorizon 2026 - Official Team QR Badges</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; background: #0E0E0E; text-align: center; color: #FFFFFF; }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 600);">
          <h2 style="font-size: 18px; margin-bottom: 16px;">SmartHorizon 2026 Official Team QR Badges Roster (${attendanceList.length} Teams)</h2>
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
            ${badgesHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Telemetry poll for Mission Control dashboard
  const { data: mcData, isLoading: mcLoading } = useQuery({
    queryKey: ['mission-control-data'],
    queryFn: () => api.get('/dashboard/mission-control'),
    enabled: missionControl,
    refetchInterval: 5000,
  });

  // Fetch metrics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedTrackId],
    queryFn: () => {
      const url = selectedTrackId
        ? `/dashboard/stats?trackId=${selectedTrackId}`
        : '/dashboard/stats';
      return api.get(url);
    },
  });

  // Fetch alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['dashboard-alerts', selectedTrackId],
    queryFn: () => {
      const url = selectedTrackId
        ? `/dashboard/alerts?trackId=${selectedTrackId}`
        : '/dashboard/alerts';
      return api.get(url);
    },
    refetchInterval: 15000,
  });

  // Fetch activity
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity', selectedTrackId],
    queryFn: () => {
      const url = selectedTrackId
        ? `/dashboard/activity?trackId=${selectedTrackId}`
        : '/dashboard/activity';
      return api.get(url);
    },
    refetchInterval: 10000,
  });

  const stats = statsData?.stats || {
    teamsCount: 0,
    checkedInCount: 0,
    activeJudgesCount: 0,
    totalJudgesCount: 0,
    unresolvedQuestionsCount: 0,
    completionRate: 0,
  };
  const alerts = alertsData?.alerts || [];
  const activity = activityData?.activity || [];

  const checkedInPercent = stats.teamsCount > 0 ? Math.round((stats.checkedInCount / stats.teamsCount) * 100) : 0;

  // Full-screen Mission Control HUD mode
  if (missionControl) {
    if (mcLoading && !mcData) {
      return (
        <div className="fixed inset-0 z-50 bg-[#0E0E0E] text-[#FFFFFF] flex flex-col items-center justify-center p-6 font-mono">
          <div className="w-10 h-10 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin" />
          <h2 className="mt-4 font-bold text-xs text-[#D4D4D4] animate-pulse tracking-widest">
            INITIALIZING MISSION CONTROL TELEMETRY HUB...
          </h2>
        </div>
      );
    }

    const {
      currentLeaders = [],
      recentlyChangedRankings = [],
      reviewsInProgress = [],
      avgReviewTimeSeconds = 0,
      judgeStatus = [],
      qrScanActivity = [],
      supportQueue = [],
      attentionPanel = [],
    } = mcData || {};

    const formatTime = (secs: number) => {
      const absoluteSecs = Math.abs(secs || 0);
      const m = Math.floor(absoluteSecs / 60);
      const s = absoluteSecs % 60;
      return `${secs < 0 ? '-' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
      <div className="fixed inset-0 z-50 bg-[#0E0E0E] text-[#FFFFFF] overflow-y-auto p-6 pb-48 sm:pb-64 space-y-6 flex flex-col min-h-screen font-sans select-none text-left">
        {/* Ops Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#2B2B2B] pb-4 gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 bg-[#FFFFFF] rounded-full animate-ping shrink-0" />
            <div>
              <h1 className="text-xl font-bold font-outfit tracking-tight text-[#FFFFFF]">
                Operations Mission Control HUD
              </h1>
              <p className="text-xs text-[#B3B3B3] font-mono">
                Live venue telemetry &bull; Real-time scorecards &bull; Emergency operations desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#FFFFFF] bg-[#2B2B2B] px-3 py-1 rounded-full border border-[#555555] font-bold">
              SYS STATUS: ONLINE
            </span>
            <AnimatedButton
              onClick={() => setMissionControl(false)}
              variant="outline"
              size="sm"
              className="border-[#2B2B2B] text-[#FFFFFF] hover:bg-[#2B2B2B]"
            >
              Exit Mission Control
            </AnimatedButton>
          </div>
        </div>

        {/* HUD Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 flex-1">
          {/* Column 1: Active Judges & Scans */}
          <div className="space-y-6">
            <AnimatedCard className="space-y-4 bg-[#181818] border-[#2B2B2B]">
              <h3 className="text-xs font-bold text-[#D4D4D4] uppercase tracking-wider font-mono flex items-center gap-2 border-b border-[#2B2B2B] pb-3">
                <Users className="w-4 h-4 text-[#FFFFFF]" />
                <span>Active Judges Roster ({judgeStatus.filter((j: any) => j.status === 'ACTIVE').length})</span>
              </h3>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 hide-scrollbar">
                {judgeStatus.map((j: any) => (
                  <div key={j.id} className="text-xs bg-[#0E0E0E] p-2.5 rounded-xl border border-[#2B2B2B] flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#FFFFFF] block">{j.name}</span>
                      <span className="text-[10px] text-[#B3B3B3] font-mono">{j.currentTeam ? `Evaluating: ${j.currentTeam}` : 'Idle / In Transit'}</span>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${j.status === 'ACTIVE' ? 'bg-[#FFFFFF] animate-pulse' : 'bg-[#555555]'}`} />
                  </div>
                ))}
              </div>
            </AnimatedCard>

            <AnimatedCard className="space-y-4 bg-[#181818] border-[#2B2B2B]">
              <h3 className="text-xs font-bold text-[#D4D4D4] uppercase tracking-wider font-mono flex items-center gap-2 border-b border-[#2B2B2B] pb-3">
                <QrCode className="w-4 h-4 text-[#FFFFFF]" />
                <span>QR Scan Logs</span>
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 hide-scrollbar">
                {qrScanActivity.length === 0 ? (
                  <p className="text-xs text-[#B3B3B3] italic py-6 text-center font-mono">No scans logged.</p>
                ) : (
                  qrScanActivity.map((log: any) => (
                    <div key={log.id} className="text-xs bg-[#0E0E0E] p-2.5 rounded-xl border border-[#2B2B2B]">
                      <div className="flex justify-between text-[#B3B3B3] font-mono mb-1 text-[10px]">
                        <span className="font-bold text-[#FFFFFF]">{log.judgeName}</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[#D4D4D4] text-[11px] leading-snug">{log.details}</p>
                    </div>
                  ))
                )}
              </div>
            </AnimatedCard>
          </div>

          {/* Column 2: Active Timers & Performance */}
          <div className="space-y-6">
            <AnimatedCard className="space-y-4 bg-[#181818] border-[#2B2B2B]">
              <h3 className="text-xs font-bold text-[#D4D4D4] uppercase tracking-wider font-mono flex items-center gap-2 border-b border-[#2B2B2B] pb-3">
                <Activity className="w-4 h-4 text-[#FFFFFF]" />
                <span>Active Review Timers</span>
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                {reviewsInProgress.length === 0 ? (
                  <p className="text-xs text-[#B3B3B3] italic py-8 text-center font-mono">No active review sessions.</p>
                ) : (
                  reviewsInProgress.map((r: any) => {
                    const remainingTime = r.duration - r.elapsed;
                    const isExceeded = remainingTime <= 0;
                    const progressPercent = Math.min(100, (r.elapsed / (r.duration || 1)) * 100);
                    return (
                      <div key={r.id} className="text-xs bg-[#0E0E0E] p-3 rounded-xl border border-[#2B2B2B] space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-bold text-[#FFFFFF] block truncate max-w-[130px]">{r.teamName}</span>
                            <span className="text-[10px] text-[#B3B3B3] block">{r.judgeName} &bull; {r.roundName}</span>
                          </div>
                          <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full
                            ${isExceeded ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] animate-pulse' : 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555]'}`}>
                            {formatTime(remainingTime)}
                          </span>
                        </div>
                        <div className="w-full bg-[#181818] h-1.5 rounded-full overflow-hidden border border-[#2B2B2B]">
                          <div
                            className="h-full bg-[#FFFFFF] transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </AnimatedCard>

            <AnimatedCard className="space-y-2 flex flex-col justify-center text-center bg-[#181818] border-[#2B2B2B]">
              <span className="text-xs font-bold text-[#D4D4D4] uppercase tracking-wider font-mono">Avg Session Duration</span>
              <span className="text-3xl font-extrabold font-mono text-[#FFFFFF] py-1">
                {formatTime(avgReviewTimeSeconds)}
              </span>
              <span className="text-[10px] text-[#B3B3B3] font-mono">Computed from scorecards</span>
            </AnimatedCard>
          </div>

          {/* Column 3: Standings & Scorecards */}
          <div className="space-y-6">
            <AnimatedCard className="space-y-4 bg-[#181818] border-[#2B2B2B]">
              <h3 className="text-xs font-bold text-[#D4D4D4] uppercase tracking-wider font-mono flex items-center gap-2 border-b border-[#2B2B2B] pb-3">
                <Trophy className="w-4 h-4 text-[#FFFFFF]" />
                <span>Track Leaders</span>
              </h3>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 hide-scrollbar">
                {currentLeaders.length === 0 ? (
                  <p className="text-xs text-[#B3B3B3] italic py-6 text-center font-mono">Awaiting standings data.</p>
                ) : (
                  currentLeaders.map((leader: any) => (
                    <div key={leader.trackId} className="text-xs bg-[#0E0E0E] p-3 rounded-xl border border-[#2B2B2B] flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-[#B3B3B3] uppercase block tracking-wider">{leader.trackName}</span>
                        <span className="font-bold text-[#FFFFFF] block">{leader.teamName}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#FFFFFF] bg-[#2B2B2B] px-2.5 py-1 rounded border border-[#555555]">
                        {(leader.score || 0).toFixed(1)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </AnimatedCard>

            <AnimatedCard className="space-y-4 bg-[#181818] border-[#2B2B2B]">
              <h3 className="text-xs font-bold text-[#D4D4D4] uppercase tracking-wider font-mono flex items-center gap-2 border-b border-[#2B2B2B] pb-3">
                <RefreshCw className="w-4 h-4 text-[#FFFFFF]" />
                <span>Recent Submissions</span>
              </h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 hide-scrollbar">
                {recentlyChangedRankings.length === 0 ? (
                  <p className="text-xs text-[#B3B3B3] italic py-6 text-center font-mono">No submissions logged.</p>
                ) : (
                  recentlyChangedRankings.map((rec: any) => (
                    <div key={rec.id} className="text-xs bg-[#0E0E0E] p-2.5 rounded-xl border border-[#2B2B2B]">
                      <div className="flex justify-between text-[#B3B3B3] font-mono mb-1 text-[10px]">
                        <span className="font-bold text-[#FFFFFF]">{rec.teamName}</span>
                        <span>{new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[#D4D4D4] text-[11px]">
                        Evaluated by <strong className="text-[#FFFFFF]">{rec.judgeName}</strong> for <strong className="text-[#D4D4D4]">{rec.roundName}</strong>.
                      </p>
                    </div>
                  ))
                )}
              </div>
            </AnimatedCard>
          </div>

          {/* Column 4: Alerts & Support Queue */}
          <div className="space-y-6">
            <AnimatedCard className="space-y-4 bg-[#181818] border-[#2B2B2B]">
              <h3 className="text-xs font-bold text-[#FFFFFF] uppercase tracking-wider font-mono flex items-center gap-2 border-b border-[#2B2B2B] pb-3">
                <AlertTriangle className="w-4 h-4 text-[#FFFFFF]" />
                <span>Attention Operations</span>
              </h3>
              <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1 hide-scrollbar">
                {attentionPanel.length === 0 ? (
                  <p className="text-xs text-[#B3B3B3] italic py-6 text-center font-mono">No active alerts.</p>
                ) : (
                  attentionPanel.map((al: any, idx: number) => (
                    <div key={idx} className="p-3 bg-[#0E0E0E] border border-[#555555] rounded-xl text-xs flex gap-2 text-left">
                      <AlertTriangle className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                      <span className="text-[#D4D4D4]">{al.message}</span>
                    </div>
                  ))
                )}
              </div>
            </AnimatedCard>

            <AnimatedCard className="space-y-4 bg-[#181818] border-[#2B2B2B]">
              <h3 className="text-xs font-bold text-[#D4D4D4] uppercase tracking-wider font-mono flex items-center gap-2 border-b border-[#2B2B2B] pb-3">
                <HelpCircle className="w-4 h-4 text-[#FFFFFF]" />
                <span>Active Support Tickets</span>
              </h3>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 hide-scrollbar">
                {supportQueue.length === 0 ? (
                  <p className="text-xs text-[#B3B3B3] italic py-6 text-center font-mono">Queue clear.</p>
                ) : (
                  supportQueue.map((ticket: any) => (
                    <div key={ticket.id} className="text-xs bg-[#0E0E0E] p-3 rounded-xl border border-[#2B2B2B] space-y-1.5">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-[#FFFFFF] block truncate max-w-[130px]">{ticket.title}</span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555]">
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-[#D4D4D4] text-[11px] leading-snug">{(ticket.content || '').substring(0, 60)}...</p>
                    </div>
                  ))
                )}
              </div>
            </AnimatedCard>
          </div>
        </div>

        {/* Matrix Card */}
        <AnimatedCard className="space-y-4 bg-[#181818] border-[#2B2B2B]">
          <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-3">
            <h2 className="text-xs font-bold font-mono text-[#FFFFFF] uppercase tracking-wider">
              Round Evaluation Progress Matrix
            </h2>
            <span className="text-[10px] font-mono bg-[#0E0E0E] px-2.5 py-1 rounded border border-[#2B2B2B] text-[#D4D4D4]">
              Live Evaluation Feed
            </span>
          </div>
          <ReviewProgressMatrix />
        </AnimatedCard>
      </div>
    );
  }

  // Standard Admin Dashboard View
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-[1600px] mx-auto"
    >
      {/* COMMAND CENTER SYSTEM HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className="text-[#FFFFFF] font-bold tracking-widest">● SYSTEM ONLINE</span>
            <span className="text-[#555555]">|</span>
            <span className="text-[#D4D4D4] font-bold tracking-widest">SYS // COMMAND CENTER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FFFFFF] tracking-wide flex items-center gap-2">
            SMART HORIZON <span className="text-[#D4D4D4]">//</span> COMMAND CENTER
          </h1>
          <p className="text-xs font-mono text-[#B3B3B3] mt-1">
            LIVE VENUE MONITORING &bull; <span className="text-[#FFFFFF] font-bold">{selectedTrackName || 'ALL EVENT TRACKS'}</span> WORKSPACE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Feedback Toggle Switch */}
          <button
            onClick={toggleFeedbackMutation}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all ${
              feedbackEnabled
                ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
            }`}
            title="Admin Discretion Toggle for Event Feedback Form"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${feedbackEnabled ? 'bg-[#0E0E0E] animate-pulse' : 'bg-[#B3B3B3]'}`} />
            <span>FEEDBACK FORM: {feedbackEnabled ? 'ENABLED' : 'DISABLED'}</span>
          </button>

          <AnimatedButton
            onClick={() => setIsAssignModalOpen(true)}
            variant="primary"
            size="sm"
            className="bg-[#FFFFFF] text-[#0E0E0E] font-extrabold hover:bg-[#D4D4D4] border border-[#FFFFFF] shadow-sm"
          >
            ASSIGN JUDGES TO TEAMS
          </AnimatedButton>

          <a href="/admin/data-entry" target="_blank" rel="noopener noreferrer">
            <AnimatedButton
              variant="outline"
              size="sm"
              className="border-[#555555] bg-[#181818] text-[#FFFFFF] font-extrabold hover:bg-[#2B2B2B] shadow-sm flex items-center gap-2"
            >
              LAUNCH DATA ENTRY TERMINAL
            </AnimatedButton>
          </a>

          <AnimatedButton
            onClick={handlePrintMarksPDF}
            variant="outline"
            size="sm"
            className="bg-[#181818] border-[#555555] text-[#FFFFFF] font-bold hover:bg-[#2B2B2B]"
          >
            PRINT MARKS PDF
          </AnimatedButton>

          <AnimatedButton
            onClick={() => setMissionControl(true)}
            variant="primary"
            size="sm"
            className="bg-[#2B2B2B] border border-[#555555] text-white font-extrabold hover:bg-[#FFFFFF] hover:text-[#0E0E0E]"
          >
            MISSION CONTROL HUD
          </AnimatedButton>
        </div>
      </div>

      {/* LIVE OPERATIONAL METRICS DECK */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Check-in */}
        <div className="bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[#B3B3B3] uppercase tracking-widest font-bold">CHECK-IN STATUS</span>
            <span className="text-[#FFFFFF] font-bold">● {stats.checkedInCount} CHECKED IN</span>
          </div>
          {statsLoading ? (
            <div className="h-8 w-24 bg-[#2B2B2B] animate-pulse rounded" />
          ) : (
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-mono font-extrabold text-[#FFFFFF]">
                {checkedInPercent}%
              </span>
              <span className="text-xs font-mono text-[#D4D4D4]">
                {stats.checkedInCount} / {stats.teamsCount} TEAMS
              </span>
            </div>
          )}
          <div className="w-full bg-[#0E0E0E] h-1.5 rounded-full overflow-hidden border border-[#2B2B2B]">
            <div
              className="bg-[#FFFFFF] h-full transition-all duration-700"
              style={{ width: `${checkedInPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Judges */}
        <div className="bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[#B3B3B3] uppercase tracking-widest font-bold">JUDGES ROSTER</span>
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="text-[#FFFFFF] hover:underline font-bold text-[11px]"
            >
              + ASSIGN TEAMS
            </button>
          </div>
          {statsLoading ? (
            <div className="h-8 w-24 bg-[#2B2B2B] animate-pulse rounded" />
          ) : (
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-mono font-extrabold text-[#FFFFFF]">
                {stats.activeJudgesCount}
              </span>
              <span className="text-xs font-mono text-[#D4D4D4]">
                / {stats.totalJudgesCount} ASSIGNED
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] font-mono text-[#B3B3B3] uppercase">
              {Math.max(0, stats.totalJudgesCount - stats.activeJudgesCount)} INACTIVE / IDLE
            </p>
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2B2B2B] border border-[#555555] text-white font-bold hover:bg-[#555555]"
            >
              ASSIGN
            </button>
          </div>
        </div>

        {/* Metric 3: Support Queue */}
        <div className="bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[#B3B3B3] uppercase tracking-widest font-bold">SUPPORT QUEUE</span>
            <span className="text-[#D4D4D4] font-bold">● TICKET QUEUE</span>
          </div>
          {statsLoading ? (
            <div className="h-8 w-24 bg-[#2B2B2B] animate-pulse rounded" />
          ) : (
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-mono font-extrabold text-[#FFFFFF]">
                {stats.unresolvedQuestionsCount}
              </span>
              <span className="text-xs font-mono text-[#D4D4D4]">UNRESOLVED</span>
            </div>
          )}
          <p className="text-[10px] font-mono text-[#B3B3B3] uppercase">
            HELP TICKETS PENDING RESPONSES
          </p>
        </div>

        {/* Metric 4: Review Completion */}
        <div className="bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl shadow-md space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[#B3B3B3] uppercase tracking-widest font-bold">EVALUATION PROGRESS</span>
            <span className="text-[#FFFFFF] font-bold">● {stats.completionRate}% DONE</span>
          </div>
          {statsLoading ? (
            <div className="h-8 w-24 bg-[#2B2B2B] animate-pulse rounded" />
          ) : (
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-mono font-extrabold text-[#FFFFFF]">
                {stats.completionRate}%
              </span>
              <span className="text-xs font-mono text-[#D4D4D4]">RATE</span>
            </div>
          )}
          <div className="w-full bg-[#0E0E0E] h-1.5 rounded-full overflow-hidden border border-[#2B2B2B]">
            <div
              className="bg-[#FFFFFF] h-full transition-all duration-700"
              style={{ width: `${stats.completionRate || 0}%` }}
            />
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 2/3 Column: Review Progress Matrix */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-lg space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-3">
              <h2 className="text-sm font-bold text-[#FFFFFF] uppercase tracking-wider flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#FFFFFF]" />
                <span>REVIEW EVALUATION MATRIX</span>
              </h2>
              <span className="text-[10px] bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] px-2.5 py-1 rounded uppercase font-bold">
                LIVE SCORE FEED
              </span>
            </div>
            <ReviewProgressMatrix />
          </div>
        </div>

        {/* Sidebar 1/3 Column: Alerts & Live Activity Feed */}
        <div className="space-y-6 font-mono text-xs">
          {/* Attention Alerts Panel */}
          <div className="bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold text-[#FFFFFF] uppercase tracking-wider flex items-center gap-2 border-b border-[#2B2B2B] pb-2">
              <AlertTriangle className="w-4 h-4 text-[#FFFFFF]" />
              <span>ATTENTION REQUIRED</span>
            </h2>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {alertsLoading ? (
                <div className="h-10 bg-[#2B2B2B] animate-pulse rounded" />
              ) : alerts.length === 0 ? (
                <div className="p-3 border border-dashed border-[#2B2B2B] rounded text-center text-[11px] text-[#B3B3B3]">
                  NO OPERATIONAL ISSUES.
                </div>
              ) : (
                alerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className="p-2.5 bg-[#0E0E0E] border border-[#555555] rounded text-[11px] flex gap-2 text-left justify-between items-start"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#FFFFFF] shrink-0 mt-0.5" />
                    <p className="text-[#FFFFFF] leading-snug">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold text-[#FFFFFF] uppercase tracking-wider flex items-center gap-2 border-b border-[#2B2B2B] pb-2">
              <Activity className="w-4 h-4 text-[#FFFFFF]" />
              <span>LIVE TELEMETRY LOG</span>
            </h2>
            <div className="divide-y divide-[#2B2B2B] overflow-y-auto max-h-[300px] pr-1 hide-scrollbar">
              {activityLoading ? (
                <div className="h-8 bg-[#2B2B2B] animate-pulse rounded my-2" />
              ) : activity.length === 0 ? (
                <p className="text-[11px] text-[#B3B3B3] text-center py-6">
                  NO TELEMETRY LOGGED.
                </p>
              ) : (
                activity.map((act: any) => (
                  <div key={act.id} className="py-2.5 text-left font-mono">
                    <div className="flex justify-between items-baseline mb-0.5 text-[10px]">
                      <span className="font-bold text-[#FFFFFF] uppercase">{act.type}</span>
                      <span className="text-[#B3B3B3]">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#D4D4D4] font-sans leading-snug">{act.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MARKSHEET DATABASE ROSTER PANEL */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2B2B2B] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#FFFFFF] uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#FFFFFF]" />
              <span>MARKSHEET DATABASE & REVIEWS DESK</span>
            </h2>
            <p className="text-[11px] text-[#B3B3B3] font-mono mt-0.5">
              ACCUMULATED SCORES & DESCRIPTIVE REVIEW STATUS LEDGER
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnimatedButton
              onClick={handleExportMarksCSV}
              variant="outline"
              size="sm"
              className="border-[#2B2B2B] text-[#FFFFFF] hover:bg-[#2B2B2B]"
            >
              EXPORT EXCEL / CSV
            </AnimatedButton>
            <AnimatedButton
              onClick={handlePrintMarksPDF}
              variant="primary"
              size="sm"
              className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
            >
              FORMATTED MARKS PDF
            </AnimatedButton>
          </div>
        </div>

        {marksheetLoading ? (
          <div className="p-6 text-center text-xs font-mono text-[#D4D4D4] animate-pulse">
            LOADING MARKSHEET LEDGER...
          </div>
        ) : marksheetThemes.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-[#B3B3B3]">
            NO MARKSHEET RECORDS FOUND.
          </div>
        ) : (
          <div className="space-y-5">
            {marksheetThemes.map((theme: any) => (
              <div key={theme.themeId} className="border border-[#2B2B2B] rounded-xl bg-[#0E0E0E] p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-2">
                  <span className="text-xs font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] px-2.5 py-0.5 rounded uppercase border border-[#555555]">
                    TRACK // {theme.themeName}
                  </span>
                  <span className="text-[11px] font-mono text-[#D4D4D4]">
                    EVALUATED: <strong className="text-[#FFFFFF]">{theme.completedCount} / {theme.teamsCount}</strong> TEAMS
                  </span>
                </div>

                <div className="border border-[#2B2B2B] rounded-xl overflow-hidden bg-[#0E0E0E]">
                  <ResponsiveTableContainer title={`MARKSHEET — ${theme.themeName}`}>
                    <table className="w-full text-left text-xs font-mono border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-[#181818] border-b border-[#2B2B2B] text-[#B3B3B3] text-[10px] uppercase font-bold">
                          <th className="py-2.5 px-3 sticky left-0 z-20 bg-[#181818] min-w-[60px]">RANK</th>
                          <th className="py-2.5 px-3 sticky left-[60px] z-20 bg-[#181818] border-r border-[#2B2B2B] min-w-[130px]">REG ID</th>
                          <th className="py-2.5 px-3 sticky left-[190px] z-20 bg-[#181818] border-r border-[#2B2B2B] min-w-[170px]">TEAM NAME</th>
                          <th className="py-2.5 px-3 min-w-[150px]">COLLEGE</th>
                          <th className="py-2.5 px-3 min-w-[200px]">ROUND BREAKDOWN</th>
                          <th className="py-2.5 px-3 text-right min-w-[120px]">TOTAL SCORE</th>
                          <th className="py-2.5 px-3 text-center min-w-[80px]">DRAWER</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2B2B2B] text-xs bg-[#0E0E0E]">
                        {theme.teams.map((t: any) => {
                          const r1Text = t.review1Score !== null ? `${t.review1Score}/100` : 'NOT DONE';
                          const r2Text = t.review2Score !== null ? `${t.review2Score}/100` : 'NOT DONE';
                          const r3Text = t.review3Score !== null ? `${t.review3Score}/100` : 'NOT DONE';
                          const descriptiveStatus = `R1: ${r1Text} | R2: ${r2Text} | R3: ${r3Text}`;

                          return (
                            <tr key={t.teamId} className="hover:bg-[#2B2B2B]/60 transition-colors group">
                              <td className="py-2 px-3 font-bold font-mono text-[#FFFFFF] sticky left-0 z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B]/60">
                                #{t.rank}
                              </td>
                              <td className="py-2 px-3 text-[#D4D4D4] font-bold sticky left-[60px] z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B]/60 border-r border-[#2B2B2B] min-w-[130px]">{t.registrationId}</td>
                              <td className="py-2 px-3 font-bold text-[#FFFFFF] font-sans sticky left-[190px] z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B]/60 border-r border-[#2B2B2B] min-w-[170px]">{t.teamName}</td>
                              <td className="py-2 px-3 text-[#B3B3B3] font-sans min-w-[150px]">{t.college}</td>
                              <td className="py-2 px-3 text-[11px] text-[#B3B3B3] min-w-[200px]">{descriptiveStatus}</td>
                              <td className="py-2 px-3 text-right font-mono font-extrabold text-[#FFFFFF] text-sm min-w-[120px]">
                                {t.totalScore} / 300
                              </td>
                              <td className="py-2 px-3 text-center min-w-[80px]">
                                <button
                                  onClick={() => {
                                    setSelectedTeamId(t.teamId);
                                    setDrawerOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] text-[10px] font-mono hover:bg-[#FFFFFF] hover:text-[#0E0E0E] font-bold transition-all"
                                >
                                  VIEW
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </ResponsiveTableContainer>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HANDY ATTENDANCE & CHECK-IN LEDGER */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2B2B2B] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#FFFFFF] uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#FFFFFF]" />
              <span>ATTENDANCE & QR CHECK-IN DESK</span>
            </h2>
            <p className="text-[11px] text-[#B3B3B3] font-mono mt-0.5">
              VENUE ATTENDANCE & TEAM MEMBER VERIFICATION LEDGER
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AnimatedButton
              onClick={handleExportAttendanceCSV}
              variant="outline"
              size="sm"
              className="border-[#2B2B2B] text-[#FFFFFF] hover:bg-[#2B2B2B]"
            >
              EXPORT CSV
            </AnimatedButton>
            <AnimatedButton
              onClick={handlePrintAttendancePDF}
              variant="outline"
              size="sm"
              className="border-[#2B2B2B] text-[#FFFFFF] hover:bg-[#2B2B2B]"
            >
              PRINT ATTENDANCE
            </AnimatedButton>
            <AnimatedButton
              onClick={handlePrintQRBadges}
              variant="primary"
              size="sm"
              className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
            >
              PRINT QR BADGES
            </AnimatedButton>
          </div>
        </div>

        {/* Live Attendance Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-3 rounded-xl text-center">
            <span className="text-[10px] font-mono text-[#B3B3B3] uppercase font-bold block">ENROLLED TEAMS</span>
            <span className="text-2xl font-mono font-extrabold text-[#FFFFFF] block mt-0.5">
              {attendData?.summary?.totalTeams || attendanceList.length}
            </span>
          </div>
          <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-3 rounded-xl text-center">
            <span className="text-[10px] font-mono text-[#D4D4D4] uppercase font-bold block">CHECKED IN</span>
            <span className="text-2xl font-mono font-extrabold text-[#FFFFFF] block mt-0.5">
              {attendData?.summary?.checkedInCount || attendanceList.filter((x: any) => x.checkedIn).length}
            </span>
          </div>
          <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-3 rounded-xl text-center">
            <span className="text-[10px] font-mono text-[#B3B3B3] uppercase font-bold block">PENDING</span>
            <span className="text-2xl font-mono font-extrabold text-[#D4D4D4] block mt-0.5">
              {attendData?.summary?.pendingCount || attendanceList.filter((x: any) => !x.checkedIn).length}
            </span>
          </div>
          <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-3 rounded-xl text-center">
            <span className="text-[10px] font-mono text-[#FFFFFF] uppercase font-bold block">ATTENDANCE RATE</span>
            <span className="text-2xl font-mono font-extrabold text-[#FFFFFF] block mt-0.5">
              {attendData?.summary?.checkInPercentage || 0}%
            </span>
          </div>
        </div>

        {attendLoading ? (
          <div className="p-6 text-center text-xs font-mono text-[#D4D4D4] animate-pulse">
            LOADING ATTENDANCE ROSTER...
          </div>
        ) : attendanceList.length === 0 ? (
          <div className="p-6 text-center text-xs font-mono text-[#B3B3B3]">
            NO ATTENDANCE RECORDS FOUND.
          </div>
        ) : (
          <div className="border border-[#2B2B2B] rounded-xl bg-[#0E0E0E]"><ResponsiveTableContainer title="VENUE ATTENDANCE DESK">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[#181818] border-b border-[#2B2B2B] text-[#B3B3B3] text-[10px] uppercase font-bold">
                  <th className="py-2.5 px-3">REG ID</th>
                  <th className="py-2.5 px-3">TEAM & TRACK</th>
                  <th className="py-2.5 px-3">INSTITUTION</th>
                  <th className="py-2.5 px-3">TEAM LEADER</th>
                  <th className="py-2.5 px-3">MEMBERS</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                  <th className="py-2.5 px-3 text-right">CONTROLS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B2B2B] text-xs">
                {attendanceList.map((a: any) => (
                  <tr key={a.teamId} className="hover:bg-[#2B2B2B]/60 transition-colors">
                    <td className="py-2.5 px-3 text-[#FFFFFF] font-bold">{a.registrationId}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-[#FFFFFF] font-sans block">{a.teamName}</span>
                      <span className="text-[10px] text-[#B3B3B3] block font-mono">TRK: {a.trackName}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#D4D4D4] font-sans">{a.college}</td>
                    <td className="py-2.5 px-3 text-[#D4D4D4]">
                      <div className="font-bold text-[#FFFFFF] font-sans">{a.leadName}</div>
                      <div className="text-[10px] text-[#B3B3B3]">{a.leadEmail}</div>
                      <div className="text-[10px] text-[#B3B3B3]">{a.leadMobile} &bull; USN: {a.leadUsn}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#D4D4D4]">
                      <div className="text-[10px] leading-snug font-sans">
                        {a.members && a.members.length > 0 ? (
                          a.members.map((m: any) => (
                            <div key={m.id || m.email} className="flex items-center gap-1 py-0.5">
                              <span className={`px-1 rounded text-[9px] font-mono font-bold uppercase ${
                                m.role === 'LEADER' ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555]' : 'bg-[#181818] text-[#B3B3B3]'
                              }`}>
                                {m.role}
                              </span>
                              <span className="font-medium text-[#FFFFFF]">{m.name}</span>
                            </div>
                          ))
                        ) : (
                          <span>{a.membersList || a.leadName}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border inline-block ${
                          a.checkedIn
                            ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                            : 'bg-[#2B2B2B] text-[#B3B3B3] border-[#555555]'
                        }`}
                      >
                        {a.status}
                      </span>
                      {a.checkInTime && (
                        <span className="block text-[9px] text-[#B3B3B3] mt-0.5">
                          {new Date(a.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setAdminSelectedQrTeam(a)}
                          className="px-2 py-1 bg-[#2B2B2B] hover:bg-[#FFFFFF] hover:text-[#0E0E0E] text-[#FFFFFF] border border-[#555555] rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                          title="Show QR Code on screen for student scan"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>SHOW QR</span>
                        </button>
                        <button
                          onClick={() => toggleCheckInMutation(a.teamId, a.checkedIn)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition-all ${
                            a.checkedIn
                              ? 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B] hover:bg-[#2B2B2B]'
                              : 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF] font-extrabold'
                          }`}
                          title={`Toggle Manual Check-In`}
                        >
                          {a.checkedIn ? 'ABSENT' : 'CHECK-IN'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></ResponsiveTableContainer></div>)}
      </div>

      {/* Admin QR Display Modal */}
      {adminSelectedQrTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0E0E]/80 backdrop-blur-md select-none font-mono">
          <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl text-[#FFFFFF] relative">
            <button
              onClick={() => setAdminSelectedQrTeam(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded border border-[#2B2B2B] bg-[#0E0E0E] text-[#B3B3B3] hover:text-white flex items-center justify-center text-sm font-bold"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] px-3 py-0.5 rounded uppercase border border-[#555555]">
                OFFICIAL VENUE CHECK-IN BADGE
              </span>
              <h3 className="text-xl font-extrabold text-white mt-2 font-sans">{adminSelectedQrTeam.teamName}</h3>
              <p className="text-xs text-[#D4D4D4]">REG ID: {adminSelectedQrTeam.registrationId}</p>
              <p className="text-[11px] text-[#B3B3B3]">TRK: {adminSelectedQrTeam.trackName} &bull; {adminSelectedQrTeam.college}</p>
            </div>

            <div className="bg-[#0E0E0E] p-4 rounded-xl border border-[#2B2B2B] inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(adminSelectedQrTeam.teamCode || adminSelectedQrTeam.registrationId || adminSelectedQrTeam.teamId)}`}
                alt={`QR ${adminSelectedQrTeam.teamName}`}
                className="w-52 h-52 object-contain rounded bg-white p-2 border border-[#2B2B2B] mx-auto"
              />
            </div>

            <div className="bg-[#0E0E0E] p-3 rounded-xl border border-[#2B2B2B] text-left space-y-1 text-[11px] font-sans">
              <p className="text-[#B3B3B3] leading-relaxed">
                👉 <strong>STUDENT CHECK-IN:</strong> Student Team Leader opens portal, taps <strong>"Scan Admin Venue QR"</strong>, and scans this code to confirm presence at venue.
              </p>
            </div>

            <div className="flex gap-2 pt-1 font-mono">
              <button
                onClick={() => {
                  toggleCheckInMutation(adminSelectedQrTeam.teamId, adminSelectedQrTeam.checkedIn);
                  setAdminSelectedQrTeam(null);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  adminSelectedQrTeam.checkedIn
                    ? 'bg-[#2B2B2B] text-[#B3B3B3] border-[#555555]'
                    : 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF] font-black'
                }`}
              >
                {adminSelectedQrTeam.checkedIn ? 'MARK ABSENT' : 'MANUAL CHECK-IN'}
              </button>
              <AnimatedButton onClick={() => setAdminSelectedQrTeam(null)} variant="outline" size="sm" className="border-[#2B2B2B] text-[#FFFFFF]">
                CLOSE
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}

      <TeamDetailDrawer
        teamId={selectedTeamId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <AssignTeamsModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </motion.div>
  );
};

export default AdminDashboard;

