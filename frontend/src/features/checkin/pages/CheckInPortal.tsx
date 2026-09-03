import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Download,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useTrack } from '../../../context/TrackContext';
import { TeamDetailDrawer } from '../../dashboard/components/TeamDetailDrawer';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { ResponsiveTableContainer } from '../../../shared/components/ResponsiveTableContainer';

type ActiveTabType = 'desk' | 'wizard';
type ImportStep = 1 | 2 | 3 | 4 | 5;

export const CheckInPortal: React.FC = () => {
  const { selectedTrackId } = useTrack();
  const queryClient = useQueryClient();

  const [activePortalTab, setActivePortalTab] = useState<ActiveTabType>('desk');

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('checkedIn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'team' | 'participant'>('team');
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv');
  const [venueQrModalOpen, setVenueQrModalOpen] = useState(false);
  const [teamQrModalData, setTeamQrModalData] = useState<any>(null);
  const [manualCheckInModalData, setManualCheckInModalData] = useState<any>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const [importStep, setImportStep] = useState<ImportStep>(1);
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationSummary, setValidationSummary] = useState<any>(null);
  const [validationRows, setValidationRows] = useState<any[]>([]);
  const [importSuccessMessage, setImportSuccessMessage] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['attendance-summary', selectedTrackId],
    queryFn: () => {
      const url = selectedTrackId
        ? `/registration/attendance-summary?trackId=${selectedTrackId}`
        : '/registration/attendance-summary';
      return api.get(url);
    },
  });

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['registration-teams', selectedTrackId, search, sortBy, sortOrder, page],
    queryFn: () => {
      let url = `/registration/teams?page=${page}&limit=12&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (selectedTrackId) url += `&trackId=${selectedTrackId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      return api.get(url);
    },
  });

  useEffect(() => {
    setPage(1);
  }, [search, selectedTrackId]);

  const [checkInSuccessModalData, setCheckInSuccessModalData] = useState<any | null>(null);
  const [fullscreenQr, setFullscreenQr] = useState<string | null>(null);

  const togglePresentMutation = useMutation({
    mutationFn: ({ teamId, present }: { teamId: string; present: boolean }) =>
      api.post('/registration/toggle-present', { teamId, present }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-teams'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to toggle present status');
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (teamId: string) => api.post(`/registration/check-in/${teamId}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['registration-teams'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      setCheckInSuccessModalData(data);
    },
  });

  const handleSingleCheckIn = (teamId: string) => {
    checkInMutation.mutate(teamId);
  };

  const memberCheckInMutation = useMutation({
    mutationFn: ({ teamId, memberId, status }: { teamId: string; memberId: string; status: 'PRESENT' | 'ABSENT' }) =>
      api.post('/registration/member-checkin', { teamId, memberId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-teams'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update member attendance');
    },
  });

  const handleExportDownload = async () => {
    try {
      const url = `/api/registration/export-attendance?type=${exportType}&format=${exportFormat}`;
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `Export failed with status ${res.status}`);
        return;
      }

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `smarthorizon_${exportType}_attendance.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportModalOpen(false);
    } catch (err: any) {
      console.error('Export download error:', err);
      alert('Failed to download report: ' + (err.message || 'Network error'));
    }
  };

  const handleBulkQrPdfDownload = async () => {
    try {
      const url = '/api/registration/teams/export-qr-pdf';
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || `QR PDF generation failed with status ${res.status}`);
        return;
      }

      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = 'smarthorizon_bulk_team_qrs.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('QR PDF download error:', err);
      alert('Failed to download QR PDF: ' + (err.message || 'Network error'));
    }
  };

  const handleRowClick = (teamId: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('button')) {
      return;
    }
    setSelectedTeamId(teamId);
    setDrawerOpen(true);
  };

  const renderTeamCheckInBadge = (team: any) => {
    const presentCount = team.members?.filter((m: any) => m.attendanceStatus === 'PRESENT').length || 0;
    const totalCount = team.members?.length || 1;

    let status = team.checkInStatus || (team.checkedIn ? 'FULLY_CHECKED_IN' : 'PENDING');
    if (presentCount === 0) {
      status = 'PENDING';
    } else if (presentCount < totalCount) {
      status = 'PARTIALLY_CHECKED_IN';
    } else {
      status = 'FULLY_CHECKED_IN';
    }

    if (status === 'FULLY_CHECKED_IN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#052E16] border border-[#16A34A] text-[11px] font-mono font-bold text-[#22C55E]">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          Fully Checked In ({presentCount}/{totalCount})
        </span>
      );
    } else if (status === 'PARTIALLY_CHECKED_IN') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#451A03] border border-[#D97706] text-[11px] font-mono font-bold text-[#F59E0B]">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
          Partially Checked In ({presentCount}/{totalCount})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0E0E0E] border border-[#2B2B2B] text-[11px] font-mono font-bold text-[#B3B3B3]">
          <span className="w-2 h-2 rounded-full bg-[#B3B3B3]" />
          Pending (0/{totalCount})
        </span>
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-[1600px] mx-auto text-[#FFFFFF] font-sans"
    >
      {/* CHECK-IN PORTAL HEADER */}
      <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className="text-[#FFFFFF] font-extrabold tracking-wider">● VENUE ONLINE</span>
            <span className="text-[#64748B]">|</span>
            <span className="text-[#FFFFFF] font-extrabold">SYS // CHECK-IN DESK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-outfit text-[#FFFFFF] tracking-tight">
            CHECK-IN <span className="text-[#FFFFFF]">//</span> VENUE OPERATIONS DESK
          </h1>
          <p className="text-xs text-[#B3B3B3] mt-0.5 font-mono font-bold">
            LIVE VENUE CHECK-IN DESK &bull; PARTICIPANT VERIFICATION & QR TELEMETRY
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono">
          <AnimatedButton
            onClick={() => setVenueQrModalOpen(true)}
            variant="primary"
            size="sm"
            className="bg-[#0284C7] text-white font-extrabold border-2 border-[#38BDF8] hover:bg-[#0369A1] shadow-md"
          >
            DISPLAY VENUE DESK QR
          </AnimatedButton>
          <AnimatedButton
            onClick={() => setExportModalOpen(true)}
            variant="outline"
            size="sm"
            className="bg-[#1E293B] text-[#F8FAFC] font-extrabold border-2 border-[#64748B] hover:bg-[#334155] hover:border-[#38BDF8] shadow-sm"
          >
            EXPORT ATTENDANCE
          </AnimatedButton>
          <AnimatedButton
            onClick={handleBulkQrPdfDownload}
            variant="outline"
            size="sm"
            className="bg-[#1E293B] text-[#F8FAFC] font-extrabold border-2 border-[#64748B] hover:bg-[#334155] hover:border-[#38BDF8] shadow-sm"
          >
            PRINTABLE QR BADGES PDF
          </AnimatedButton>
        </div>
      </div>

      {activePortalTab === 'desk' && (
        <div className="space-y-6">
          {/* Operational Counter Metrics */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <div className="bg-[#0F172A] border-2 border-[#334155] p-4 rounded-2xl space-y-1 shadow-md">
              <span className="text-[11px] text-[#38BDF8] uppercase font-extrabold tracking-wider block">TOTAL TEAMS</span>
              <span className="text-2xl font-extrabold text-[#F8FAFC] block">
                {summary?.totalRegistered || 0}
              </span>
            </div>

            <div className="bg-[#064E3B]/40 border-2 border-[#059669] p-4 rounded-2xl space-y-1 shadow-md">
              <span className="text-[11px] text-[#34D399] uppercase font-extrabold tracking-wider block">CHECKED-IN TEAMS</span>
              <span className="text-2xl font-extrabold text-[#34D399] block">
                {summary?.checkedIn || 0}
              </span>
            </div>

            <div className="bg-[#78350F]/40 border-2 border-[#D97706] p-4 rounded-2xl space-y-1 shadow-md">
              <span className="text-[11px] text-[#FBBF24] uppercase font-extrabold tracking-wider block">PENDING TEAMS</span>
              <span className="text-2xl font-extrabold text-[#FBBF24] block">
                {summary?.pending || 0}
              </span>
            </div>

            <div className="bg-[#0F172A] border-2 border-[#334155] p-4 rounded-2xl space-y-1 shadow-md">
              <span className="text-[11px] text-[#818CF8] uppercase font-extrabold tracking-wider block">PARTICIPANTS</span>
              <span className="text-2xl font-extrabold text-[#F8FAFC] block">
                {summary?.totalParticipants || 0}
              </span>
            </div>

            <div className="bg-[#064E3B]/40 border-2 border-[#059669] p-4 rounded-2xl space-y-1 shadow-md">
              <span className="text-[11px] text-[#34D399] uppercase font-extrabold tracking-wider block">PRESENT PARTICIPANTS</span>
              <span className="text-2xl font-extrabold text-[#34D399] block">
                {summary?.checkedInParticipants || 0}
              </span>
            </div>

            <div className="bg-[#7F1D1D]/40 border-2 border-[#DC2626] p-4 rounded-2xl space-y-1 shadow-md">
              <span className="text-[11px] text-[#F87171] uppercase font-extrabold tracking-wider block">ABSENT PARTICIPANTS</span>
              <span className="text-2xl font-extrabold text-[#F87171] block">
                {summary?.absentParticipants || 0}
              </span>
            </div>
          </section>

          {/* Search & Operations Table */}
          <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl space-y-4 font-mono shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 h-10 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder-[#B3B3B3] font-mono font-bold focus:outline-none focus:border-[#FFFFFF]"
                  placeholder="SEARCH TEAM ID, TEAM NAME, PARTICIPANT..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Sort Order Selector */}
              <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
                <label className="text-[#D4D4D4] uppercase font-extrabold whitespace-nowrap">SORT BY:</label>
                <select
                  className="bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] text-xs rounded-xl px-3 h-10 font-mono font-extrabold focus:outline-none focus:border-[#FFFFFF]"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="registrationId">TEAM CODE / REG ID</option>
                  <option value="name">TEAM NAME</option>
                  <option value="track">TRACK NAME</option>
                  <option value="checkedIn">CHECK-IN STATUS</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 h-10 bg-[#181818] border border-[#555555] text-[#FFFFFF] hover:bg-[#2B2B2B] rounded-xl text-xs font-mono font-extrabold transition-colors"
                >
                  {sortOrder === 'asc' ? '▲ ASC' : '▼ DESC'}
                </button>
              </div>
            </div>

            {/* Teams Operations Matrix Table */}
            <div className="border border-[#2B2B2B] rounded-xl overflow-hidden bg-[#0E0E0E]">
              <ResponsiveTableContainer title="VENUE CHECK-IN MATRIX">
                <table className="w-full text-left text-xs border-collapse font-mono min-w-[850px]">
                  <thead>
                    <tr className="bg-[#181818] border-b border-[#2B2B2B] text-[#FFFFFF] text-[11px] uppercase font-extrabold tracking-wider">
                      <th className="py-3 px-4 cursor-pointer hover:text-[#D4D4D4] sticky left-0 z-20 bg-[#181818] border-r border-[#2B2B2B] min-w-[130px]" onClick={() => handleSort('registrationId')}>
                        <div className="flex items-center gap-1 text-white">
                          <span>TEAM CODE</span>
                          {sortBy === 'registrationId' && (
                            <span className="text-[#D4D4D4]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-4 cursor-pointer hover:text-[#D4D4D4] sticky left-[130px] z-20 bg-[#181818] border-r border-[#2B2B2B] min-w-[180px]" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1 text-white">
                          <span>TEAM NAME</span>
                          {sortBy === 'name' && (
                            <span className="text-[#D4D4D4]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-4 cursor-pointer hover:text-[#D4D4D4] min-w-[140px]" onClick={() => handleSort('track')}>
                        TRACK
                      </th>
                      <th className="py-3 px-4 min-w-[220px]">ROSTER MEMBERS</th>
                      <th className="py-3 px-4 cursor-pointer hover:text-[#D4D4D4] min-w-[110px]" onClick={() => handleSort('checkedIn')}>
                        STATUS
                      </th>
                      <th className="py-3 px-4 text-right min-w-[170px]">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2B2B2B] bg-[#0E0E0E]">
                    {teamsLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#B3B3B3] font-mono animate-pulse">
                          LOADING CHECK-IN MATRIX...
                        </td>
                      </tr>
                    ) : !teamsData || teamsData.teams.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#B3B3B3] font-mono">
                          NO MATCHING TEAMS FOUND.
                        </td>
                      </tr>
                    ) : (
                      teamsData.teams.map((t: any) => (
                        <React.Fragment key={t.id}>
                          <tr
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTeamId(expandedTeamId === t.id ? null : t.id);
                            }}
                            className="hover:bg-[#2B2B2B]/60 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4 font-extrabold text-[#D4D4D4] font-mono sticky left-0 z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B]/60 transition-colors border-r border-[#2B2B2B] min-w-[130px]">
                              {t.teamCode || t.registrationId || t.id.substring(0, 8)}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#FFFFFF] font-sans group-hover:text-[#D4D4D4] transition-colors sticky left-[130px] z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B]/60 border-r border-[#2B2B2B] min-w-[180px]">
                              <div className="flex items-center gap-2">
                                <span>{t.name}</span>
                                <span className="text-[10px] text-[#64748B] font-mono">
                                  {expandedTeamId === t.id ? '▲' : '▼'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono min-w-[140px]">
                              <span className="text-[10px] bg-[#181818] border border-[#2B2B2B] px-2.5 py-0.5 rounded text-[#D4D4D4] font-extrabold font-mono">
                                {t.trackName}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-sans min-w-[220px]">
                              <div className="flex flex-wrap gap-1">
                                {t.members?.length > 0 ? (
                                  t.members.map((m: any) => (
                                    <span
                                      key={m.id}
                                      className="inline-flex items-center gap-1 bg-[#181818] border border-[#2B2B2B] px-2 py-0.5 rounded text-[10px] text-[#FFFFFF] font-semibold"
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${m.attendanceStatus === 'PRESENT' ? 'bg-[#22C55E]' : 'bg-[#555555]'}`} />
                                      {m.name}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[#B3B3B3] text-[10px] font-mono">No members listed</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 min-w-[110px]">{renderTeamCheckInBadge(t)}</td>
                            <td className="py-3 px-4 text-right min-w-[170px]">
                              <div className="flex items-center justify-end gap-2 font-mono">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTeamQrModalData(t);
                                  }}
                                  className="px-2.5 py-1 bg-[#2B2B2B] border border-[#555555] text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#0E0E0E] rounded text-[10px] font-mono font-extrabold flex items-center gap-1 transition-all shadow-sm"
                                  title="Display QR code on screen"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>SHOW QR</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setManualCheckInModalData(t);
                                  }}
                                  className={`px-3 py-1 rounded text-[10px] font-mono font-extrabold border transition-all ${
                                    (t.members?.filter((m: any) => m.attendanceStatus === 'PRESENT').length || 0) > 0
                                      ? 'bg-[#052E16] text-[#22C55E] border-[#16A34A] hover:bg-[#14532D]'
                                      : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#FFFFFF] hover:bg-[#555555]'
                                  }`}
                                  title="Manage Member Check-In"
                                >
                                  {(t.members?.filter((m: any) => m.attendanceStatus === 'PRESENT').length || 0) > 0 ? 'MANAGE ATTENDANCE' : 'CHECK-IN'}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Member Attendance Panel */}
                          {expandedTeamId === t.id && (
                            <tr>
                              <td colSpan={6} className="p-0 border-b border-[#2B2B2B]">
                                <div className="bg-[#0A0A0A] border-l-2 border-[#38BDF8] px-6 py-4">
                                  <p className="text-[10px] font-mono font-extrabold text-[#38BDF8] uppercase tracking-widest mb-3">
                                    MEMBER ATTENDANCE — {t.name}
                                  </p>
                                  <div className="flex flex-wrap gap-3">
                                    {t.members?.length > 0 ? (
                                      t.members.map((m: any) => {
                                        const isPresent = m.attendanceStatus === 'PRESENT';
                                        return (
                                          <div
                                            key={m.id}
                                            className="flex items-center gap-3 bg-[#181818] border border-[#2B2B2B] rounded-lg px-4 py-2.5 min-w-[220px]"
                                          >
                                            <div className="flex-1">
                                              <p className="text-[11px] font-extrabold text-[#FFFFFF] font-mono">{m.name}</p>
                                              <p className="text-[10px] text-[#64748B] font-mono">{m.role}</p>
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                memberCheckInMutation.mutate({
                                                  teamId: t.id,
                                                  memberId: m.id,
                                                  status: isPresent ? 'ABSENT' : 'PRESENT',
                                                });
                                              }}
                                              disabled={memberCheckInMutation.isPending}
                                              className={`px-3 py-1 rounded text-[10px] font-mono font-extrabold border transition-all ${
                                                isPresent
                                                  ? 'bg-[#052E16] text-[#22C55E] border-[#16A34A] hover:bg-[#14532D]'
                                                  : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:bg-[#334155] hover:text-[#F8FAFC]'
                                              }`}
                                            >
                                              {isPresent ? '✓ PRESENT' : 'ABSENT'}
                                            </button>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span className="text-[#B3B3B3] text-[10px] font-mono">No members found</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </ResponsiveTableContainer>
            </div>

            {teamsData && teamsData.totalPages > 1 && (
              <div className="flex justify-between items-center pt-2 font-mono text-xs text-[#CBD5E1] font-bold">
                <span>
                  PAGE {teamsData.page} OF {teamsData.totalPages}
                </span>
                <div className="flex gap-2">
                  <AnimatedButton
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    variant="outline"
                    size="sm"
                    className="bg-[#1E293B] border-2 border-[#64748B] text-[#F8FAFC] font-extrabold hover:bg-[#334155] hover:border-[#38BDF8] disabled:opacity-40"
                  >
                    PREVIOUS
                  </AnimatedButton>
                  <AnimatedButton
                    disabled={page === teamsData.totalPages}
                    onClick={() => setPage(page + 1)}
                    variant="outline"
                    size="sm"
                    className="bg-[#1E293B] border-2 border-[#64748B] text-[#F8FAFC] font-extrabold hover:bg-[#334155] hover:border-[#38BDF8] disabled:opacity-40"
                  >
                    NEXT
                  </AnimatedButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      <AnimatePresence>
        {exportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/85 backdrop-blur-md select-none font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0F172A] border-2 border-[#334155] p-6 rounded-2xl max-w-md w-full text-[#F8FAFC] space-y-5 shadow-2xl relative"
            >
              <button
                onClick={() => setExportModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded border-2 border-[#64748B] bg-[#1E293B] text-[#CBD5E1] hover:text-white hover:border-[#38BDF8] flex items-center justify-center text-xs font-bold transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <h3 className="text-xl font-extrabold font-mono text-[#F8FAFC]">EXPORT ATTENDANCE REPORT</h3>
                <p className="text-xs text-[#94A3B8] mt-1 font-sans font-bold">Export venue check-in telemetry datasets.</p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#CBD5E1] mb-1.5 font-extrabold uppercase tracking-wider">1. GRANULARITY</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportType('team')}
                      className={`p-3 rounded-xl text-center border-2 transition-all font-extrabold ${
                        exportType === 'team'
                          ? 'bg-[#0284C7] border-[#38BDF8] text-white shadow-md'
                          : 'bg-[#1E293B] border-[#64748B] text-[#F8FAFC] hover:bg-[#334155] hover:border-[#38BDF8]'
                      }`}
                    >
                      TEAM REPORT
                    </button>
                    <button
                      onClick={() => setExportType('participant')}
                      className={`p-3 rounded-xl text-center border-2 transition-all font-extrabold ${
                        exportType === 'participant'
                          ? 'bg-[#0284C7] border-[#38BDF8] text-white shadow-md'
                          : 'bg-[#1E293B] border-[#64748B] text-[#F8FAFC] hover:bg-[#334155] hover:border-[#38BDF8]'
                      }`}
                    >
                      PARTICIPANT REPORT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[#CBD5E1] mb-1.5 font-extrabold uppercase tracking-wider">2. FILE FORMAT</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setExportFormat('csv')}
                      className={`p-2.5 rounded-xl text-center border-2 transition-all font-extrabold ${
                        exportFormat === 'csv'
                          ? 'bg-[#0284C7] border-[#38BDF8] text-white shadow-md'
                          : 'bg-[#1E293B] border-[#64748B] text-[#F8FAFC] hover:bg-[#334155] hover:border-[#38BDF8]'
                      }`}
                    >
                      CSV (.csv)
                    </button>
                    <button
                      onClick={() => setExportFormat('xlsx')}
                      className={`p-2.5 rounded-xl text-center border-2 transition-all font-extrabold ${
                        exportFormat === 'xlsx'
                          ? 'bg-[#0284C7] border-[#38BDF8] text-white shadow-md'
                          : 'bg-[#1E293B] border-[#64748B] text-[#F8FAFC] hover:bg-[#334155] hover:border-[#38BDF8]'
                      }`}
                    >
                      EXCEL (.xlsx)
                    </button>
                    <button
                      onClick={() => setExportFormat('pdf')}
                      className={`p-2.5 rounded-xl text-center border-2 transition-all font-extrabold ${
                        exportFormat === 'pdf'
                          ? 'bg-[#0284C7] border-[#38BDF8] text-white shadow-md'
                          : 'bg-[#1E293B] border-[#64748B] text-[#F8FAFC] hover:bg-[#334155] hover:border-[#38BDF8]'
                      }`}
                    >
                      PDF (.pdf)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <AnimatedButton onClick={() => setExportModalOpen(false)} variant="outline" size="sm" className="flex-1 bg-[#1E293B] border-2 border-[#64748B] text-[#F8FAFC] font-extrabold hover:bg-[#334155]">
                  CANCEL
                </AnimatedButton>
                <AnimatedButton onClick={handleExportDownload} variant="primary" size="sm" className="flex-1 bg-[#0284C7] border-2 border-[#38BDF8] text-white font-extrabold hover:bg-[#0369A1] shadow-lg">
                  DOWNLOAD REPORT
                </AnimatedButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Details Drawer */}
      <TeamDetailDrawer
        teamId={selectedTeamId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Check-In Success Modal */}
      <AnimatePresence>
        {checkInSuccessModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/85 backdrop-blur-md select-none font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0F172A] border-2 border-[#334155] p-6 rounded-2xl max-w-lg w-full text-center space-y-5 shadow-2xl text-[#F8FAFC] relative"
            >
              <button
                onClick={() => setCheckInSuccessModalData(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded border-2 border-[#64748B] bg-[#1E293B] text-[#CBD5E1] hover:text-white flex items-center justify-center text-xs font-bold transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded text-xs font-mono font-extrabold uppercase border bg-[#065F46] text-[#34D399] border-[#34D399]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                  TEAM VERIFIED & CHECKED IN
                </span>
                <h3 className="text-xl font-extrabold font-sans text-white mt-2">
                  {checkInSuccessModalData.team.name}
                </h3>
              </div>

              <div className="bg-[#020617] p-5 rounded-xl border-2 border-[#334155] flex flex-col items-center justify-center space-y-3">
                <div className="bg-white p-3 rounded-xl border border-[#334155] shadow-md">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      checkInSuccessModalData.team.qrCode || checkInSuccessModalData.team.teamCode || checkInSuccessModalData.team.id
                    )}`}
                    alt="Team Venue QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <div className="font-mono text-center space-y-0.5">
                  <div className="text-base font-extrabold text-[#38BDF8]">
                    CODE: {checkInSuccessModalData.team.teamCode || 'SH26-TEAM'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <AnimatedButton
                  onClick={() => setCheckInSuccessModalData(null)}
                  variant="primary"
                  size="sm"
                  className="bg-[#0284C7] border-2 border-[#38BDF8] text-white font-extrabold hover:bg-[#0369A1] shadow-md"
                >
                  DONE
                </AnimatedButton>
              </div>
            </motion.div>
          </div>
        )}

        {/* Official Desk Venue Check-In QR Modal */}
        {venueQrModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/85 backdrop-blur-md font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0F172A] border-2 border-[#334155] rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl relative text-[#F8FAFC]"
            >
              <button
                onClick={() => setVenueQrModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded border-2 border-[#64748B] bg-[#1E293B] text-[#CBD5E1] hover:text-white flex items-center justify-center text-xs font-bold transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-extrabold text-[#38BDF8] bg-[#1E293B] px-3 py-0.5 rounded border border-[#38BDF8] uppercase">
                  OFFICIAL VENUE DESK QR BADGE
                </span>
                <h3 className="text-xl font-extrabold font-mono text-white pt-1">
                  VENUE CHECK-IN QR
                </h3>
                <p className="text-xs text-[#CBD5E1] font-sans font-bold leading-relaxed">
                  Students: Open Student Portal, tap <strong className="text-[#38BDF8]">"SCAN VENUE QR"</strong>, and scan this QR code!
                </p>
              </div>

              <div className="bg-white p-4 rounded-xl border-2 border-[#334155] inline-block mx-auto shadow-md">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=SMARTHORIZON_VENUE_CHECKIN"
                  alt="Official Venue Check-In QR Code"
                  className="w-56 h-56 mx-auto"
                />
              </div>

              <div className="p-3 bg-[#020617] border-2 border-[#334155] rounded-xl text-center space-y-0.5">
                <span className="text-xs font-mono font-extrabold text-[#38BDF8]">CODE: SMARTHORIZON_VENUE_CHECKIN</span>
                <span className="block text-[10px] font-mono text-[#CBD5E1] font-bold">AUTO-MARKS TEAM AS PRESENT IN REAL-TIME</span>
              </div>

              <AnimatedButton
                onClick={() => setVenueQrModalOpen(false)}
                variant="primary"
                size="md"
                className="w-full bg-[#0284C7] text-white border-2 border-[#38BDF8] font-extrabold hover:bg-[#0369A1]"
              >
                CLOSE QR DISPLAY
              </AnimatedButton>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Specific QR Display Modal for Student Scanning */}
      <AnimatePresence>
        {teamQrModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/85 backdrop-blur-md select-none font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0F172A] border-2 border-[#334155] p-6 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl text-[#F8FAFC] relative"
            >
              <button
                onClick={() => setTeamQrModalData(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded border-2 border-[#64748B] bg-[#1E293B] text-[#CBD5E1] hover:text-white flex items-center justify-center text-xs font-bold transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[10px] font-mono font-extrabold text-[#38BDF8] bg-[#1E293B] border border-[#38BDF8] px-3 py-0.5 rounded uppercase">
                  OFFICIAL TEAM QR BADGE
                </span>
                <h3 className="text-xl font-extrabold font-sans text-white mt-1">{teamQrModalData.name}</h3>
                <p className="text-xs text-[#38BDF8] font-mono font-extrabold">REG ID: {teamQrModalData.registrationId || teamQrModalData.teamCode}</p>
                <p className="text-xs text-[#CBD5E1] font-mono font-bold">TRK: {teamQrModalData.trackName}</p>
              </div>

              <div className="bg-[#020617] p-4 rounded-xl border-2 border-[#334155] inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(teamQrModalData.teamCode || teamQrModalData.registrationId || teamQrModalData.id)}`}
                  alt={`QR ${teamQrModalData.name}`}
                  className="w-52 h-52 object-contain rounded-xl bg-white p-2 border border-[#334155] mx-auto"
                />
              </div>

              <div className="bg-[#020617] p-3 rounded-xl border-2 border-[#334155] text-left font-sans">
                <p className="text-xs text-[#CBD5E1] leading-relaxed font-bold">
                  👉 <strong>STUDENT INSTRUCTION:</strong> Student Team Leader opens portal, taps <strong>"SCAN VENUE QR"</strong>, and scans this code to confirm presence at venue.
                </p>
              </div>

              <div className="flex gap-2 pt-1 font-mono">
                <button
                  onClick={() => {
                    togglePresentMutation.mutate({ teamId: teamQrModalData.id, present: !teamQrModalData.checkedIn });
                    setTeamQrModalData(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold transition-all border-2 ${
                    teamQrModalData.checkedIn
                      ? 'bg-[#DC2626] text-white border-[#F87171] hover:bg-[#B91C1C]'
                      : 'bg-[#16A34A] text-white border-[#4ADE80] hover:bg-[#15803D]'
                  }`}
                >
                  {teamQrModalData.checkedIn ? 'MARK ENTIRE TEAM ABSENT' : 'MARK ENTIRE TEAM PRESENT'}
                </button>
                <AnimatedButton onClick={() => setTeamQrModalData(null)} variant="outline" size="sm" className="bg-[#1E293B] border-2 border-[#64748B] text-[#F8FAFC] font-extrabold hover:bg-[#334155]">
                  CLOSE
                </AnimatedButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Team Member Manual Attendance Check-In Modal */}
      <AnimatePresence>
        {manualCheckInModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/85 backdrop-blur-md select-none font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0F172A] border-2 border-[#334155] p-6 rounded-2xl max-w-lg w-full text-left space-y-4 shadow-2xl text-[#F8FAFC] relative"
            >
              <button
                onClick={() => setManualCheckInModalData(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded border-2 border-[#64748B] bg-[#1E293B] text-[#CBD5E1] hover:text-white flex items-center justify-center text-xs font-bold transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[10px] font-mono font-extrabold text-[#38BDF8] bg-[#1E293B] px-3 py-0.5 rounded border border-[#38BDF8] uppercase">
                  MEMBER ATTENDANCE VERIFICATION
                </span>
                <h3 className="text-xl font-extrabold font-mono text-white pt-2">
                  {manualCheckInModalData.name}
                </h3>
                <p className="text-xs text-[#CBD5E1] font-mono mt-1">
                  Team Code: <span className="text-[#38BDF8] font-bold">{manualCheckInModalData.teamCode || manualCheckInModalData.registrationId}</span> &bull; Track: <span className="text-white font-bold">{manualCheckInModalData.trackName}</span>
                </p>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {manualCheckInModalData.members?.length > 0 ? (
                  manualCheckInModalData.members.map((m: any) => {
                    const isPresent = m.attendanceStatus === 'PRESENT';
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between bg-[#1E293B] border border-[#334155] rounded-xl p-3"
                      >
                        <div>
                          <p className="text-sm font-bold text-white font-mono">{m.name}</p>
                          <p className="text-xs text-[#94A3B8] font-mono">{m.role}</p>
                        </div>
                        <button
                          onClick={() => {
                            memberCheckInMutation.mutate(
                              {
                                teamId: manualCheckInModalData.id,
                                memberId: m.id,
                                status: isPresent ? 'ABSENT' : 'PRESENT',
                              },
                              {
                                onSuccess: () => {
                                  // Update local modal data state to reflect immediately
                                  setManualCheckInModalData((prev: any) => {
                                    if (!prev) return null;
                                    return {
                                      ...prev,
                                      members: prev.members.map((mem: any) =>
                                        mem.id === m.id
                                          ? { ...mem, attendanceStatus: isPresent ? 'ABSENT' : 'PRESENT' }
                                          : mem
                                      ),
                                    };
                                  });
                                },
                              }
                            );
                          }}
                          disabled={memberCheckInMutation.isPending}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-extrabold border transition-all ${
                            isPresent
                              ? 'bg-[#052E16] text-[#22C55E] border-[#16A34A] hover:bg-[#14532D]'
                              : 'bg-[#0F172A] text-[#94A3B8] border-[#334155] hover:bg-[#334155] hover:text-[#F8FAFC]'
                          }`}
                        >
                          {isPresent ? '✓ PRESENT' : 'MARK PRESENT'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-[#94A3B8]">No team members found</div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#334155]">
                <button
                  onClick={() => {
                    togglePresentMutation.mutate(
                      { teamId: manualCheckInModalData.id, present: !manualCheckInModalData.checkedIn },
                      {
                        onSuccess: () => {
                          setManualCheckInModalData(null);
                        },
                      }
                    );
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-extrabold border transition-all ${
                    manualCheckInModalData.checkedIn
                      ? 'bg-[#1E293B] text-[#CBD5E1] border-[#475569] hover:bg-[#334155]'
                      : 'bg-[#0284C7] text-white border-[#38BDF8] hover:bg-[#0369A1]'
                  }`}
                >
                  {manualCheckInModalData.checkedIn ? 'MARK ENTIRE TEAM ABSENT' : 'CHECK-IN ENTIRE TEAM'}
                </button>
                <button
                  onClick={() => setManualCheckInModalData(null)}
                  className="py-2 px-4 bg-[#1E293B] border border-[#475569] text-[#F8FAFC] font-mono text-xs font-extrabold rounded-xl hover:bg-[#334155]"
                >
                  DONE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CheckInPortal;
