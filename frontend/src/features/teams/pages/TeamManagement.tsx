import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Route,
  Search,
  Download,
  FolderArchive,
  Printer,
  QrCode,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useTrack } from '../../../context/TrackContext';
import { TeamDetailDrawer } from '../../dashboard/components/TeamDetailDrawer';
import { CreateTeamModal } from '../components/CreateTeamModal';
import { ManageTracksModal } from '../components/ManageTracksModal';
import { AssignTeamsModal } from '../../judges/components/AssignTeamsModal';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { ResponsiveTableContainer } from '../../../shared/components/ResponsiveTableContainer';

export const TeamManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { selectedTrackId, tracks, refetchTracks } = useTrack();

  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState<string | null>(selectedTrackId);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTracksModalOpen, setIsTracksModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedQrTeam, setSelectedQrTeam] = useState<any>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setTrackFilter(selectedTrackId);
  }, [selectedTrackId]);

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams-directory', trackFilter, statusFilter, paymentFilter, search, sortBy, sortOrder, page],
    queryFn: () => {
      let url = `/registration/teams?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (trackFilter) url += `&trackId=${trackFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      return api.get(url);
    },
  });

  const handleRowClick = (id: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('button')) return;
    setSelectedTeamId(id);
    setDrawerOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (!teamsData?.teams) return;
    if (selectedIds.length === teamsData.teams.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(teamsData.teams.map((t: any) => t.id));
    }
  };

  const handleCSVExport = async () => {
    try {
      await api.downloadFile('/registration/export-csv', 'teams_export.csv');
    } catch (e) {
      console.error(e);
      alert('Failed to export CSV');
    }
  };

  const handleExportZIP = async () => {
    try {
      await api.downloadFile('/registration/teams/export-zip', 'team_assets.zip');
    } catch (e) {
      console.error(e);
      alert('Failed to export ZIP');
    }
  };

  const handleRegenerateQR = async () => {
    if (!selectedQrTeam) return;
    setIsRegenerating(true);
    try {
      const res = await api.post(`/registration/teams/${selectedQrTeam.id}/regenerate-qr`);
      if (res.success) {
        setSelectedQrTeam((prev: any) => ({
          ...prev,
          teamCode: res.teamCode,
          qrCode: res.qrCode,
        }));
        queryClient.invalidateQueries({ queryKey: ['teams-directory'] });
      }
    } catch (e) {
      console.error(e);
      alert('Failed to regenerate QR code');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePrintAllBadges = () => {
    if (!teamsData?.teams) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let badgesHtml = '';
    teamsData.teams.forEach((t: any) => {
      badgesHtml += `
        <div class="badge-card">
          <h2>${t.name}</h2>
          <p>${t.trackName}</p>
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(t.teamCode || t.id)}" />
          <div class="footer-text">${t.registrationId || t.teamCode || t.id}</div>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>PDF Badge Sheet - SmartHorizon</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background-color: #0E0E0E; color: #fff; }
            .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; page-break-inside: avoid; }
            .badge-card { border: 2px solid #2B2B2B; border-radius: 12px; padding: 20px; text-align: center; background: #181818; }
            h2 { margin: 5px 0; font-size: 20px; font-weight: 800; color: #fff; }
            p { margin: 0 0 10px 0; font-size: 14px; color: #D4D4D4; text-transform: uppercase; font-weight: 600; }
            img { width: 150px; height: 150px; background: #fff; padding: 5px; border-radius: 8px; }
            .footer-text { margin-top: 10px; font-family: monospace; font-size: 12px; font-weight: bold; color: #B3B3B3; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="grid-container">${badgesHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]';
      case 'FAILED':
        return 'bg-[#181818] text-[#B3B3B3] border-[#555555]';
      case 'REFUNDED':
        return 'bg-[#2B2B2B] text-[#D4D4D4] border-[#555555]';
      default:
        return 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B]';
    }
  };

  // Filter client side if payment filter applied
  const filteredTeams = teamsData?.teams ? teamsData.teams.filter((t: any) => {
    if (paymentFilter && t.paymentStatusFinal !== paymentFilter) return false;
    return true;
  }) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-[1600px] mx-auto text-[#FFFFFF] font-sans"
    >
      {/* TEAMS ROSTER HEADER */}
      {/* TEAMS DIRECTORY HEADER */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className="text-[#FFFFFF] font-bold tracking-wider">● SYSTEM ONLINE</span>
            <span className="text-[#555555]">|</span>
            <span className="text-[#D4D4D4] font-bold">SYS // TEAMS & MEMBERS ROSTER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FFFFFF] tracking-tight">
            TEAMS & MEMBERS <span className="text-[#D4D4D4]">//</span> DIRECTORY
          </h1>
          <p className="text-xs text-[#B3B3B3] mt-0.5 font-mono">
            PARTICIPANT LEDGER, INSTITUTION DIRECTORY & ATTENDANCE STATUS
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <AnimatedButton
            onClick={() => setIsAssignModalOpen(true)}
            variant="primary"
            size="sm"
            className="bg-[#FFFFFF] text-[#0E0E0E] font-extrabold hover:bg-[#D4D4D4]"
          >
            ASSIGN JUDGES
          </AnimatedButton>

          <AnimatedButton
            onClick={() => setIsTracksModalOpen(true)}
            variant="outline"
            size="sm"
            className="bg-[#181818] border border-[#555555] text-[#FFFFFF] font-extrabold hover:bg-[#2B2B2B]"
          >
            MANAGE TRACKS
          </AnimatedButton>

          <AnimatedButton
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
            size="sm"
            className="bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] font-extrabold hover:bg-[#555555]"
          >
            ADD TEAM
          </AnimatedButton>
        </div>
      </div>

      {/* FILTERS & COMMAND CONTROLS */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" />
            <input
              type="text"
              placeholder="SEARCH REG ID, TEAM, LEAD..."
              className="pl-9 pr-3 h-9 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:text-[#B3B3B3] focus:outline-none focus:border-[#FFFFFF] w-64 font-extrabold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={trackFilter || ''}
            onChange={(e) => setTrackFilter(e.target.value || null)}
            className="h-9 bg-white border-2 border-[#64748B] rounded-xl text-xs px-3 text-[#0F172A] font-extrabold focus:outline-none focus:border-[#0284C7]"
          >
            <option value="">TRACK: ALL</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter || ''}
            onChange={(e) => setPaymentFilter(e.target.value || null)}
            className="h-9 bg-white border-2 border-[#64748B] rounded-xl text-xs px-3 text-[#0F172A] font-extrabold focus:outline-none focus:border-[#0284C7]"
          >
            <option value="">PAYMENT: ALL</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="h-9 bg-white border-2 border-[#64748B] rounded-xl text-xs px-3 text-[#0F172A] font-extrabold focus:outline-none focus:border-[#0284C7]"
          >
            <option value="">STATUS: ALL</option>
            <option value="Registered">Registered</option>
            <option value="Checked In">Checked In</option>
            <option value="Withdrawn">Withdrawn</option>
            <option value="Disqualified">Disqualified</option>
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          <AnimatedButton onClick={handleCSVExport} variant="primary" size="sm" className="bg-[#0284C7] text-white font-extrabold hover:bg-[#0369A1]">
            EXPORT CSV
          </AnimatedButton>

          <AnimatedButton onClick={handleExportZIP} variant="outline" size="sm" className="bg-white text-[#0F172A] border-2 border-[#64748B] hover:bg-[#F1F5F9] font-extrabold">
            EXPORT ZIP
          </AnimatedButton>

          <AnimatedButton onClick={handlePrintAllBadges} variant="outline" size="sm" className="bg-white text-[#0F172A] border-2 border-[#64748B] hover:bg-[#F1F5F9] font-extrabold">
            PRINT BADGES
          </AnimatedButton>
        </div>
      </div>

      {/* DIRECTORY GRID TABLE */}
      <div className="bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl overflow-hidden shadow-xl font-mono">
        <ResponsiveTableContainer title="TEAMS & MEMBERS DIRECTORY">
          <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-[#181818] border-b border-[#2B2B2B] text-[#FFFFFF] text-[10px] uppercase font-extrabold">
                <th className="py-3 px-3 w-10 text-center sticky left-0 z-20 bg-[#181818]">
                  <input
                    type="checkbox"
                    className="rounded border-[#555555] bg-[#0E0E0E] text-[#FFFFFF] focus:ring-0"
                    checked={filteredTeams.length > 0 && selectedIds.length === filteredTeams.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-[#D4D4D4] sticky left-10 z-20 bg-[#181818] border-r border-[#2B2B2B] min-w-[130px]" onClick={() => handleSort('registrationId')}>
                  REG ID
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-[#D4D4D4] sticky left-[170px] z-20 bg-[#181818] border-r border-[#2B2B2B] min-w-[180px]" onClick={() => handleSort('name')}>
                  TEAM &amp; LEAD
                </th>
                <th className="py-3 px-3 cursor-pointer hover:text-[#D4D4D4] min-w-[160px]" onClick={() => handleSort('college')}>
                  INSTITUTION
                </th>
                <th className="py-3 px-3 min-w-[140px]">TRACK</th>
                <th className="py-3 px-3 min-w-[180px]">PROBLEM STMT</th>
                <th className="py-3 px-3 min-w-[120px]">MENTOR</th>
                <th className="py-3 px-3 min-w-[100px]">PAYMENT</th>
                <th className="py-3 px-3 min-w-[110px]">CHECK-IN</th>
                <th className="py-3 px-3 text-right min-w-[140px]">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B2B2B] bg-[#0E0E0E]">
              {teamsLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#B3B3B3] font-mono animate-pulse">
                    LOADING DIRECTORY...
                  </td>
                </tr>
              ) : filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#B3B3B3] font-mono">
                    NO REGISTERED TEAMS FOUND MATCHING FILTERS.
                  </td>
                </tr>
              ) : (
                filteredTeams.map((t: any) => (
                  <tr
                    key={t.id}
                    onClick={(e) => handleRowClick(t.id, e)}
                    className="hover:bg-[#2B2B2B]/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 text-center sticky left-0 z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B]/60">
                      <input
                        type="checkbox"
                        className="rounded border-[#555555] bg-[#0E0E0E] text-[#FFFFFF] focus:ring-0"
                        checked={selectedIds.includes(t.id)}
                        onChange={() => toggleSelect(t.id)}
                      />
                    </td>
                    <td className="py-3 px-3 text-[#D4D4D4] font-bold sticky left-10 z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B]/60 border-r border-[#2B2B2B] min-w-[130px]">
                      {t.registrationId || t.teamCode || `#REG-${t.id.substring(0, 5).toUpperCase()}`}
                    </td>
                    <td className="py-3 px-3 sticky left-[170px] z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B]/60 border-r border-[#2B2B2B] min-w-[180px]">
                      <div className="flex flex-col font-sans">
                        <span className="font-bold text-[#FFFFFF] block group-hover:text-[#D4D4D4] transition-colors">{t.name}</span>
                        <span className="text-[10px] text-[#B3B3B3] font-mono mt-0.5">
                          LEAD: {t.leadName || 'N/A'} ({t.leadEmail || 'N/A'})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[#B3B3B3] font-sans truncate max-w-[150px]">
                      {t.collegeName || t.college || 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] bg-[#181818] border border-[#2B2B2B] text-[#D4D4D4] px-2 py-0.5 rounded font-bold uppercase">
                        {t.domain || t.trackName}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#FFFFFF] font-bold">
                      {t.selectedPsId || 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-[#B3B3B3] font-sans">
                      {t.mentorName1 || 'Unassigned'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                        t.paymentStatusFinal === 'PAID' ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]' : 'bg-[#2B2B2B] text-[#B3B3B3] border-[#555555]'
                      }`}>
                        {t.paymentStatusFinal || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {t.checkedIn ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold border uppercase bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0E0E0E] animate-pulse" />
                          CHECKED IN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold border uppercase bg-[#181818] text-[#B3B3B3] border-[#555555]">
                          UNCHECKED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedQrTeam(t);
                            setIsQrModalOpen(true);
                          }}
                          className="p-1 rounded text-[#B3B3B3] hover:text-white hover:bg-[#2B2B2B]"
                          title="Show Team QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTeamId(t.id);
                            setDrawerOpen(true);
                          }}
                          className="p-1 rounded text-[#B3B3B3] hover:text-white hover:bg-[#2B2B2B]"
                          title="Open Team Details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTableContainer>
      </div>

      {/* Pagination */}
      {teamsData && teamsData.totalPages > 1 && (
        <div className="flex justify-between items-center pt-2 font-mono text-xs text-[#B3B3B3]">
          <span>
            PAGE {teamsData.page} OF {teamsData.totalPages}
          </span>
          <div className="flex gap-2">
            <AnimatedButton
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              variant="outline"
              size="sm"
              className="border-[#2B2B2B] text-[#FFFFFF]"
            >
              PREVIOUS
            </AnimatedButton>
            <AnimatedButton
              disabled={page === teamsData.totalPages}
              onClick={() => setPage(page + 1)}
              variant="outline"
              size="sm"
              className="border-[#2B2B2B] text-[#FFFFFF]"
            >
              NEXT
            </AnimatedButton>
          </div>
        </div>
      )}

      {/* Modals & Drawer */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        tracks={tracks}
      />
      <ManageTracksModal
        isOpen={isTracksModalOpen}
        onClose={() => setIsTracksModalOpen(false)}
        tracks={tracks}
        refetchTracks={refetchTracks}
      />
      <TeamDetailDrawer
        teamId={selectedTeamId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Admin QR Code Viewer/Regenerator Modal */}
      {isQrModalOpen && selectedQrTeam && (
        <div className="fixed inset-0 bg-[#0E0E0E]/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none font-mono">
          <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl relative text-[#FFFFFF]">
            <button
              onClick={() => {
                setIsQrModalOpen(false);
                setSelectedQrTeam(null);
              }}
              className="absolute top-4 right-4 w-7 h-7 rounded border border-[#2B2B2B] bg-[#0E0E0E] text-[#B3B3B3] hover:text-white flex items-center justify-center text-xs font-bold"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-1 text-center">
              <span className="text-[10px] font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] border border-[#555555] px-3 py-0.5 rounded uppercase">
                {selectedQrTeam.domain || selectedQrTeam.trackName}
              </span>
              <h3 className="text-xl font-extrabold font-sans text-white pt-1">{selectedQrTeam.name}</h3>
              <p className="text-xs text-[#FFFFFF] font-bold">{selectedQrTeam.registrationId || selectedQrTeam.teamCode || 'No Code'}</p>
            </div>

            <div className="flex justify-center bg-white p-3 rounded-xl border border-[#2B2B2B] mx-auto max-w-[200px]">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedQrTeam.teamCode || selectedQrTeam.id)}`}
                alt="QR Code"
                className="w-44 h-44"
              />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <AnimatedButton
                  onClick={async () => {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(selectedQrTeam.teamCode || selectedQrTeam.id)}`;
                    const response = await fetch(qrUrl);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `${selectedQrTeam.registrationId || selectedQrTeam.teamCode || 'team'}_qr.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  variant="outline"
                  size="sm"
                  className="border-[#2B2B2B] text-[#FFFFFF]"
                >
                  DOWNLOAD
                </AnimatedButton>
                <AnimatedButton
                  onClick={handlePrintAllBadges}
                  variant="outline"
                  size="sm"
                  className="border-[#2B2B2B] text-[#FFFFFF]"
                >
                  PRINT
                </AnimatedButton>
              </div>
              <AnimatedButton
                disabled={isRegenerating}
                onClick={handleRegenerateQR}
                variant="danger"
                size="sm"
                className="bg-[#181818] text-[#B3B3B3] border border-[#555555] hover:bg-[#2B2B2B]"
              >
                {isRegenerating ? 'REGENERATING...' : 'REGENERATE QR'}
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}

      <AssignTeamsModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedTeamIds={selectedIds}
      />
    </motion.div>
  );
};

export default TeamManagement;
