import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../shared/services/api';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { useToast } from '../../../context/ToastContext';
import { useTrack } from '../../../context/TrackContext';

export const AdminSubmissionsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { tracks } = useTrack();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'pending'>('all');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // Fetch All Submissions Data
  const { data, isLoading } = useQuery({
    queryKey: ['admin-submissions-all'],
    queryFn: () => api.get('/submissions/admin/all'),
  });

  // Toggle Submissions Mutation
  const toggleMutation = useMutation({
    mutationFn: (payload: { open: boolean }) => api.post('/submissions/toggle', payload),
    onSuccess: (res: any) => {
      toast.success(res.message || 'Submission state updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-submissions-all'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to toggle submission state.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-[#181818] border border-[#2B2B2B] rounded-sm min-h-[400px] text-center font-mono select-none">
        <div className="w-12 h-12 border-4 border-[#FFFFFF] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-[#FFFFFF] animate-pulse font-bold tracking-wider">SYNCING PROJECT SUBMISSION DASHBOARD...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalTeams: 0,
    submittedCount: 0,
    pendingCount: 0,
    submissionRatePercent: 0,
    submissionsOpen: false,
    isCurrentlyOpen: false,
  };

  const submissions: any[] = data?.submissions || [];

  // Filter Submissions
  const filteredSubmissions = submissions.filter((item) => {
    // Status Filter
    if (statusFilter === 'submitted' && item.status !== 'SUBMITTED') return false;
    if (statusFilter === 'pending' && item.status === 'SUBMITTED') return false;

    // Track Filter
    if (selectedTrackFilter !== 'all' && item.trackId !== selectedTrackFilter) return false;

    // Search Query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchCode = item.teamCode?.toLowerCase().includes(q) || item.registrationId?.toLowerCase().includes(q);
      const matchTitle = item.projectTitle?.toLowerCase().includes(q);
      const matchGithub = item.githubUrl?.toLowerCase().includes(q);
      const matchLeader = item.leadName?.toLowerCase().includes(q) || item.leadEmail?.toLowerCase().includes(q);
      return matchName || matchCode || matchTitle || matchGithub || matchLeader;
    }

    return true;
  });

  // Handle CSV Export
  const handleExportCSV = async () => {
    const queryParams = new URLSearchParams();
    if (selectedTrackFilter !== 'all') queryParams.append('trackId', selectedTrackFilter);
    if (statusFilter !== 'all') queryParams.append('status', statusFilter);
    if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());

    try {
      toast.success('Generating Submissions CSV export...');
      await api.downloadFile(`/submissions/export-csv?${queryParams.toString()}`, `SmartHorizon_Submissions_${Date.now()}.csv`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to download CSV export.');
    }
  };

  // Handle Bulk ZIP Download
  const handleBulkZipDownload = async () => {
    const queryParams = new URLSearchParams();
    if (selectedTrackFilter !== 'all') queryParams.append('trackId', selectedTrackFilter);

    try {
      toast.success('Preparing Bulk Presentations ZIP package...');
      await api.downloadFile(`/submissions/admin/download-all-zip?${queryParams.toString()}`, `SmartHorizon_Presentations_${Date.now()}.zip`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to download ZIP package.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-[1600px] mx-auto text-[#0B2340] font-sans"
    >
      {/* 1. TOP CONTROL BAR BANNER */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${summary.submissionsOpen ? 'bg-[#FFFFFF] animate-pulse' : 'bg-[#555555]'}`} />
            <span className={`font-bold tracking-wider ${summary.submissionsOpen ? 'text-[#FFFFFF]' : 'text-[#B3B3B3]'}`}>
              {summary.submissionsOpen ? '● SUBMISSIONS OPEN' : '○ SUBMISSIONS CLOSED'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FFFFFF] tracking-tight">
            PROJECT SUBMISSIONS <span className="text-[#D4D4D4]">//</span> COMMAND CENTER
          </h1>
          <p className="text-xs text-[#B3B3B3] mt-0.5 font-mono">
            GLOBAL SUBMISSION TOGGLE, TEAM DELIVERABLES & BULK PRESENTATION EXPORTS
          </p>
        </div>

        {/* Global Admin Toggle Button */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <AnimatedButton
            onClick={() => toggleMutation.mutate({ open: !summary.submissionsOpen })}
            disabled={toggleMutation.isPending}
            variant="primary"
            size="md"
            className={summary.submissionsOpen ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] hover:bg-[#555555] font-extrabold' : 'bg-[#FFFFFF] text-[#0E0E0E] hover:bg-[#D4D4D4] font-extrabold'}
          >
            {toggleMutation.isPending
              ? 'UPDATING...'
              : summary.submissionsOpen
              ? 'CLOSE SUBMISSIONS'
              : 'OPEN SUBMISSIONS'}
          </AnimatedButton>
        </div>
      </div>

      {/* 2. SUBMISSION TELEMETRY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <AnimatedCard className="p-4 bg-[#181818] border border-[#2B2B2B] space-y-1 shadow-xl">
          <span className="text-[10px] text-[#B3B3B3] font-bold uppercase tracking-wider block">TOTAL TEAMS</span>
          <span className="text-3xl font-extrabold text-[#FFFFFF] font-mono">{summary.totalTeams}</span>
          <span className="text-[10px] text-[#B3B3B3] block">Registered Hackathon Teams</span>
        </AnimatedCard>

        <AnimatedCard className="p-4 bg-[#181818] border border-[#2B2B2B] space-y-1 shadow-xl">
          <span className="text-[10px] text-[#FFFFFF] font-extrabold uppercase tracking-wider block">SUBMITTED TEAMS</span>
          <span className="text-3xl font-extrabold text-[#FFFFFF] font-mono">{summary.submittedCount}</span>
          <span className="text-[10px] text-[#B3B3B3] block">Project Deliverables Received</span>
        </AnimatedCard>

        <AnimatedCard className="p-4 bg-[#181818] border border-[#2B2B2B] space-y-1 shadow-xl">
          <span className="text-[10px] text-[#D4D4D4] font-extrabold uppercase tracking-wider block">PENDING TEAMS</span>
          <span className="text-3xl font-extrabold text-[#D4D4D4] font-mono">{summary.pendingCount}</span>
          <span className="text-[10px] text-[#B3B3B3] block">Awaiting Final Submission</span>
        </AnimatedCard>

        <AnimatedCard className="p-4 bg-[#181818] border border-[#2B2B2B] space-y-1 shadow-xl">
          <span className="text-[10px] text-[#FFFFFF] font-extrabold uppercase tracking-wider block">COMPLETION RATE</span>
          <span className="text-3xl font-extrabold text-[#FFFFFF] font-mono">{summary.submissionRatePercent}%</span>
          <div className="w-full h-1.5 bg-[#0E0E0E] rounded overflow-hidden mt-2 border border-[#2B2B2B]">
            <div className="h-full bg-[#FFFFFF] transition-all duration-300" style={{ width: `${summary.submissionRatePercent}%` }} />
          </div>
        </AnimatedCard>
      </div>

      {/* 3. CONTROLS, SEARCH & FILTER BAR */}
      <div className="p-4 bg-[#181818] border border-[#2B2B2B] rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 font-mono">
        {/* Left: Search Input & Track Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-72">
            <span className="absolute left-3 top-2.5 material-symbols-outlined text-base text-[#B3B3B3]">search</span>
            <input
              type="text"
              placeholder="Search code, team, title, repo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF] placeholder:text-[#B3B3B3] font-bold"
            />
          </div>

          <select
            value={selectedTrackFilter}
            onChange={(e) => setSelectedTrackFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] font-bold focus:outline-none focus:border-[#FFFFFF]"
          >
            <option value="all">ALL TRACKS / DOMAINS</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Status Tabs */}
        <div className="flex items-center bg-[#0E0E0E] p-1 rounded-xl border border-[#2B2B2B] text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-[#FFFFFF] text-[#0E0E0E] font-extrabold' : 'text-[#B3B3B3] hover:text-[#FFFFFF]'}`}
          >
            ALL ({summary.totalTeams})
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3 py-1 rounded-lg transition-colors ${statusFilter === 'submitted' ? 'bg-[#FFFFFF] text-[#0E0E0E] font-extrabold' : 'text-[#B3B3B3] hover:text-[#FFFFFF]'}`}
          >
            SUBMITTED ({summary.submittedCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded transition-colors ${statusFilter === 'pending' ? 'bg-[#FFFFFF] text-[#0E0E0E] font-extrabold' : 'text-[#B3B3B3] hover:text-[#FFFFFF]'}`}
          >
            PENDING ({summary.pendingCount})
          </button>
        </div>

        {/* Right: Export Actions */}
        <div className="flex items-center gap-2">
          <AnimatedButton onClick={handleExportCSV} variant="secondary" size="sm" icon="download">
            EXPORT CSV
          </AnimatedButton>
          <AnimatedButton onClick={handleBulkZipDownload} variant="primary" size="sm" icon="folder_zip">
            DOWNLOAD ZIP
          </AnimatedButton>
        </div>
      </div>

      {/* 4. SUBMISSIONS TABLE */}
      <div className="bg-[#181818] border border-[#2B2B2B] rounded-sm overflow-hidden shadow-xl font-mono">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#0E0E0E] border-b border-[#2B2B2B] text-[#B3B3B3] text-[10px] uppercase font-bold">
                <th className="py-3 px-4">TEAM CODE</th>
                <th className="py-3 px-4">TEAM NAME</th>
                <th className="py-3 px-4">TRACK</th>
                <th className="py-3 px-4">PROJECT TITLE</th>
                <th className="py-3 px-4">GITHUB REPO</th>
                <th className="py-3 px-4 text-center">PPT FILE</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B2B2B] bg-[#0E0E0E]">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#B3B3B3]">
                    NO MATCHING SUBMISSION RECORDS FOUND.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.teamId} className="hover:bg-[#181818] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#FFFFFF]">{sub.teamCode}</td>
                    <td className="py-3 px-4 font-bold text-[#FFFFFF] font-sans">
                      {sub.name}
                      <span className="block text-[10px] font-mono text-[#B3B3B3] font-normal">{sub.leadName}</span>
                    </td>
                    <td className="py-3 px-4 text-[#D4D4D4]">
                      <span className="text-[10px] bg-[#181818] border border-[#2B2B2B] px-2 py-0.5 rounded font-bold text-[#D4D4D4]">
                        {sub.trackName}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#FFFFFF] max-w-xs truncate font-sans">
                      {sub.projectTitle || <span className="text-[#B3B3B3] italic font-mono">-</span>}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      {sub.githubUrl ? (
                        <a
                          href={sub.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#FFFFFF] hover:underline text-[11px] font-mono"
                        >
                          {sub.githubUrl.replace('https://github.com/', '')}
                        </a>
                      ) : (
                        <span className="text-[#B3B3B3] italic">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sub.presentationUrl ? (
                        <a
                          href={api.getAuthDownloadUrl(`/submissions/download/${sub.teamId}`)}
                          download
                          className="inline-flex items-center gap-1 text-[#FFFFFF] hover:underline font-bold text-[11px]"
                        >
                          <span className="material-symbols-outlined text-sm">slideshow</span>
                          PPT
                        </a>
                      ) : (
                        <span className="text-[#B3B3B3]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                          sub.status === 'SUBMITTED'
                            ? 'bg-[#2B2B2B] border-[#555555] text-[#FFFFFF]'
                            : 'bg-[#181818] border-[#2B2B2B] text-[#B3B3B3]'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="px-2.5 py-1 rounded bg-[#2B2B2B] border border-[#555555] text-[#FFFFFF] hover:bg-[#555555] font-bold text-[10px] transition-colors"
                      >
                        VIEW SUBMISSION
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. TEAM SUBMISSION DETAIL DRAWER / MODAL */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0E0E]/90 backdrop-blur-md select-none font-mono">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-sm max-w-2xl w-full text-[#FFFFFF] space-y-5 shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedSubmission(null)}
                className="absolute top-4 right-4 text-[#B3B3B3] hover:text-[#FFFFFF]"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>

              <div className="border-b border-[#2B2B2B] pb-3">
                <div className="flex items-center gap-2 text-[10px] text-[#38BDF8] font-mono font-extrabold mb-1">
                  <span>CANONICAL TEAM FOLDER: submissions/SHIH26-{selectedSubmission.registrationId || selectedSubmission.teamCode}_{selectedSubmission.name.replace(/[^a-zA-Z0-9_-]/g, '_')}/</span>
                </div>
                <h3 className="text-2xl font-extrabold font-mono text-[#F8FAFC]">
                  {selectedSubmission.registrationId || selectedSubmission.teamCode} — {selectedSubmission.name}
                </h3>
                <p className="text-xs text-[#CBD5E1] mt-0.5 font-sans font-bold">
                  Track: <strong className="text-[#38BDF8]">{selectedSubmission.trackName}</strong> &bull; Leader: {selectedSubmission.leadName} ({selectedSubmission.leadEmail})
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono max-h-96 overflow-y-auto pr-1 hide-scrollbar">
                {/* CATEGORY 1: PRESENTATION (.PPT / .PPTX) */}
                <div className="p-4 bg-[#0E0E0E] rounded-xl border-2 border-[#334155] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#38BDF8] font-extrabold uppercase tracking-wider">
                      📁 CATEGORY: PRESENTATION (presentation/)
                    </span>
                    <span className="text-[9px] bg-[#1E293B] text-[#34D399] border border-[#34D399] px-2 py-0.5 rounded font-extrabold">
                      VERSION v{selectedSubmission.version || 1}
                    </span>
                  </div>
                  {selectedSubmission.presentationUrl ? (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1 border-t border-[#1E293B]">
                      <div>
                        <span className="font-extrabold text-[#F8FAFC] text-xs block">
                          {selectedSubmission.originalFileName || `presentation_v${selectedSubmission.version || 1}.pptx`}
                        </span>
                        <span className="text-[10px] text-[#CBD5E1] block">
                          Storage: <code className="text-[#38BDF8]">{selectedSubmission.presentationUrl}</code>
                        </span>
                      </div>
                      <a
                        href={api.getAuthDownloadUrl(`/submissions/download/${selectedSubmission.teamId}`)}
                        download
                        className="px-3 py-1.5 rounded-lg bg-[#0284C7] border border-[#38BDF8] text-white font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#0369A1] shadow-sm shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        DOWNLOAD PPT
                      </a>
                    </div>
                  ) : (
                    <span className="text-[#94A3B8] italic block pt-1">No presentation PowerPoint file uploaded yet.</span>
                  )}
                </div>

                {/* CATEGORY 2: SOURCE CODE */}
                <div className="p-4 bg-[#0E0E0E] rounded-xl border-2 border-[#334155] space-y-2">
                  <span className="text-[10px] text-[#38BDF8] font-extrabold uppercase tracking-wider block">
                    📁 CATEGORY: SOURCE CODE (source-code/)
                  </span>
                  {selectedSubmission.githubUrl ? (
                    <div className="flex justify-between items-center pt-1 border-t border-[#1E293B]">
                      <div>
                        <span className="font-extrabold text-[#F8FAFC] text-xs block">PUBLIC GITHUB REPOSITORY</span>
                        <a
                          href={selectedSubmission.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#38BDF8] hover:underline text-xs block truncate max-w-sm font-extrabold"
                        >
                          {selectedSubmission.githubUrl}
                        </a>
                      </div>
                      <a
                        href={selectedSubmission.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#1E293B] border border-[#64748B] text-[#F8FAFC] font-extrabold text-xs flex items-center gap-1.5 hover:bg-[#334155] shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm">code</span>
                        OPEN REPO
                      </a>
                    </div>
                  ) : (
                    <span className="text-[#94A3B8] italic block pt-1">No source code repository URL submitted.</span>
                  )}
                </div>

                {/* CATEGORY 3: DOCUMENTATION & ABSTRACT */}
                <div className="p-4 bg-[#0E0E0E] rounded-xl border-2 border-[#334155] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#38BDF8] font-extrabold uppercase tracking-wider">
                      📁 CATEGORY: DOCUMENTATION (documentation/)
                    </span>
                    <span className="text-[10px] text-[#CBD5E1] bg-[#1E293B] px-2 py-0.5 rounded border border-[#64748B] font-extrabold">
                      {selectedSubmission.wordCount} / 100 WORDS
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1 border-t border-[#1E293B]">
                    <span className="text-[10px] text-[#CBD5E1] font-extrabold uppercase block">PROJECT TITLE: {selectedSubmission.projectTitle || 'N/A'}</span>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed italic bg-[#020617] p-3 rounded-lg border border-[#334155] font-sans">
                      "{selectedSubmission.projectAbstract || 'No abstract submitted yet.'}"
                    </p>
                  </div>
                </div>

                {selectedSubmission.submissionFiles && selectedSubmission.submissionFiles.length > 0 && (
                  <div className="p-4 bg-[#0E0E0E] rounded-xl border-2 border-[#334155] space-y-2">
                    <span className="text-[10px] text-[#38BDF8] font-extrabold uppercase tracking-wider block">
                      📜 SUBMISSION FILE AUDIT HISTORY ({selectedSubmission.submissionFiles.length} FILES)
                    </span>
                    <div className="space-y-1.5 pt-1 border-t border-[#1E293B]">
                      {selectedSubmission.submissionFiles.map((f: any) => (
                        <div key={f.id} className="flex justify-between items-center p-2 bg-[#1E293B] rounded border border-[#475569] text-[11px]">
                          <div>
                            <span className="font-extrabold text-white block">{f.originalFileName} (v{f.version})</span>
                            <span className="text-[9px] text-[#CBD5E1]">Path: {f.storagePath}</span>
                          </div>
                          <span className="text-[9px] text-[#38BDF8] font-extrabold font-mono">{(f.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <AnimatedButton onClick={() => setSelectedSubmission(null)} variant="primary" size="sm">
                  CLOSE INSPECTOR
                </AnimatedButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminSubmissionsPanel;
