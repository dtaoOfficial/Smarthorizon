import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../../../shared/services/api';
import { useTrack } from '../../../context/TrackContext';
import { AssignTeamsModal } from '../components/AssignTeamsModal';
import { JudgeDetailDrawer } from '../components/JudgeDetailDrawer';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';

export const JudgeCoordination: React.FC = () => {
  const { tracks } = useTrack();

  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedJudgeId, setSelectedJudgeId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [trackFilter, setTrackFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Judge Inspector Dropdown state
  const [inspectorJudgeId, setInspectorJudgeId] = useState<string>('');

  const { data: judgesData, isLoading } = useQuery({
    queryKey: ['judges-list'],
    queryFn: () => api.get('/judges'),
  });

  const judges = judgesData?.judges || [];
  const suggestions = judgesData?.suggestions || {};

  // Set default inspector judge once loaded
  React.useEffect(() => {
    if (judges.length > 0 && !inspectorJudgeId) {
      setInspectorJudgeId(judges[0].id);
    }
  }, [judges, inspectorJudgeId]);

  // Fetch selected judge's detailed reviews audit data
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['judge-reviews-audit', inspectorJudgeId],
    queryFn: () => api.get(`/judges/${inspectorJudgeId}/reviews-audit`),
    enabled: !!inspectorJudgeId,
  });

  const inspectorJudge = auditData?.judge || null;
  const inspectorReviews = auditData?.reviews || [];

  const handleRowClick = (id: string, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('button')) return;
    setSelectedJudgeId(id);
    setDrawerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555]';
      case 'Reviewing':
        return 'bg-[#FFFFFF] text-[#0E0E0E] border border-[#FFFFFF] font-bold animate-pulse';
      case 'Walking':
        return 'bg-[#181818] text-[#B3B3B3] border border-[#2B2B2B]';
      case 'Break':
        return 'bg-[#181818] text-[#FFFFFF] border border-[#555555]';
      case 'Offline':
        return 'bg-[#0E0E0E] text-[#B3B3B3] border border-[#2B2B2B]';
      default:
        return 'bg-[#0E0E0E] text-[#B3B3B3] border border-[#2B2B2B]';
    }
  };

  const filteredJudges = judges.filter((j: any) => {
    if (trackFilter && !j.assignedTracks.some((t: any) => t.id === trackFilter)) return false;
    if (statusFilter && j.status !== statusFilter) return false;
    return true;
  });

  const exportJudgeAuditCsv = () => {
    if (!inspectorJudge || inspectorReviews.length === 0) return;
    const headers = ['Judge Name', 'Judge Email', 'Round', 'Reg ID', 'Team Name', 'Theme', 'Total Marks', 'Remarks', 'Duration (s)', 'Submitted At'];
    const rows = inspectorReviews.map((r: any) => [
      `"${inspectorJudge.name}"`,
      `"${inspectorJudge.email}"`,
      `"${r.roundName}"`,
      `"${r.registrationId}"`,
      `"${r.teamName}"`,
      `"${r.trackName}"`,
      r.totalMarks,
      `"${(r.remarks || '').replace(/"/g, '""')}"`,
      r.durationSeconds,
      `"${new Date(r.submittedAt).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((row: (string | number)[]) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${inspectorJudge.name.replace(/\s+/g, '_')}_reviews_audit.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-[1600px] mx-auto text-[#FFFFFF] font-sans"
    >
      {/* JUDGE COORDINATION HEADER */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className="text-[#FFFFFF] font-bold tracking-wider">SYS // JUDGE ROSTER & PIPELINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FFFFFF] tracking-tight">
            JUDGE ROSTER <span className="text-[#D4D4D4]">//</span> ASSIGNMENT PIPELINE
          </h1>
          <p className="text-xs text-[#B3B3B3] mt-0.5 font-sans">
            EVALUATION AUDIT LEDGER, WORKLOAD BALANCING & LIVE SCORING TELEMETRY
          </p>
        </div>
        <AnimatedButton
          onClick={() => setIsAssignModalOpen(true)}
          variant="primary"
          size="sm"
          icon="assignment_ind"
          className="bg-[#FFFFFF] text-[#0E0E0E] hover:bg-[#D4D4D4] font-extrabold"
        >
          ASSIGN EVALUATION
        </AnimatedButton>
      </div>

      {/* JUDGE INSPECTOR & REVIEWS AUDIT */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl space-y-5 font-sans">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2B2B2B] pb-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#FFFFFF] text-xl">manage_search</span>
            <div>
              <h2 className="text-sm font-bold uppercase text-[#FFFFFF] font-mono tracking-wider">JUDGE REVIEW INSPECTOR</h2>
              <p className="text-[11px] text-[#B3B3B3] font-sans mt-0.5">
                SELECT A JUDGE TO AUDIT LIVE EVALUATIONS, MARKS ALLOCATION & SPEED TELEMETRY
              </p>
            </div>
          </div>

          {/* JUDGE DROPDOWN SELECTOR */}
          <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
            <label className="text-[#FFFFFF] uppercase font-bold font-mono whitespace-nowrap">SELECT JUDGE:</label>
            <select
              value={inspectorJudgeId}
              onChange={(e) => setInspectorJudgeId(e.target.value)}
              className="h-9 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-lg text-xs font-mono font-bold text-[#FFFFFF] focus:outline-none w-full sm:w-64"
            >
              {judges.map((j: any) => (
                <option key={j.id} value={j.id}>
                  {j.name} ({j.status}) - {j.completedReviewsCount} REVIEWS
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Judge Live Details Card */}
        {auditLoading ? (
          <div className="p-8 text-center font-mono text-xs text-[#B3B3B3] animate-pulse">
            LOADING JUDGE EVALUATION AUDIT DATA...
          </div>
        ) : inspectorJudge ? (
          <div className="space-y-5">
            {/* Status & Current Team Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Card 1: Live Status */}
              <div className="bg-[#0E0E0E] p-4 rounded-xl border border-[#2B2B2B] space-y-2">
                <span className="text-[10px] font-mono text-[#B3B3B3] uppercase font-bold block">OPERATIONAL STATUS</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStatusBadge(inspectorJudge.status)}`}>
                    {inspectorJudge.status}
                  </span>
                  {inspectorJudge.isCurrentlyJudging && (
                    <span className="text-[9px] font-mono text-[#FFFFFF] bg-[#2B2B2B] border border-[#555555] px-2 py-0.5 rounded uppercase font-bold animate-pulse">
                      ● ACTIVE EVALUATION
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#B3B3B3] block pt-1 font-mono">
                  AVG SPEED: <strong className="text-[#FFFFFF]">{inspectorJudge.avgReviewTime} MIN</strong> / TEAM
                </span>
              </div>

              {/* Card 2: Currently Judging Team Status */}
              <div className="bg-[#0E0E0E] p-4 rounded-xl border border-[#2B2B2B] space-y-2">
                <span className="text-[10px] font-mono text-[#B3B3B3] uppercase font-bold block">CURRENT TARGET TEAM</span>
                {inspectorJudge.isCurrentlyJudging && inspectorJudge.currentTeam ? (
                  <div>
                    <span className="text-sm font-bold text-[#FFFFFF] font-sans block">{inspectorJudge.currentTeam.name}</span>
                    <span className="text-[10px] font-mono text-[#B3B3B3] block mt-0.5">
                      REG: <strong className="text-[#FFFFFF]">{inspectorJudge.currentTeam.registrationId}</strong> &bull; TRK: <strong className="text-[#D4D4D4]">{inspectorJudge.currentTeam.track?.name}</strong>
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-[#B3B3B3] block italic pt-1">
                    No active evaluation in progress.
                  </span>
                )}
              </div>

              {/* Card 3: Summary Totals & CSV Export Button */}
              <div className="bg-[#0E0E0E] p-4 rounded-xl border border-[#2B2B2B] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#B3B3B3] uppercase font-bold block">SUBMITTED SCORECARDS</span>
                  <span className="text-2xl font-extrabold font-mono text-[#FFFFFF] block mt-0.5">
                    {inspectorReviews.length} <span className="text-xs font-normal text-[#B3B3B3]">Evaluated</span>
                  </span>
                </div>
                <AnimatedButton
                  onClick={exportJudgeAuditCsv}
                  disabled={inspectorReviews.length === 0}
                  variant="secondary"
                  size="sm"
                  icon="download"
                >
                  EXPORT CSV
                </AnimatedButton>
              </div>
            </div>

            {/* Itemized Audit Log Table for Selected Judge */}
            <div className="border border-[#2B2B2B] rounded-xl overflow-hidden bg-[#0E0E0E]">
              <div className="px-4 py-2.5 bg-[#181818] border-b border-[#2B2B2B] flex justify-between items-center text-xs font-mono">
                <span className="font-bold text-[#FFFFFF] uppercase">
                  SCORECARD AUDIT LOG ({inspectorJudge.name})
                </span>
                <span className="text-[10px] text-[#B3B3B3]">
                  REAL-TIME BACKEND RECORD
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#181818] border-b border-[#2B2B2B] text-[#FFFFFF] text-[10px] font-mono uppercase font-bold">
                    <th className="py-3 px-4">ROUND</th>
                    <th className="py-3 px-4">TEAM CODE</th>
                    <th className="py-3 px-4">TEAM NAME</th>
                    <th className="py-3 px-4">TRACK</th>
                    <th className="py-3 px-4">TOTAL SCORE</th>
                    <th className="py-3 px-4">REMARKS</th>
                    <th className="py-3 px-4">SUBMITTED AT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B2B2B]">
                  {inspectorReviews.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 px-4 text-center text-[#B3B3B3] font-mono">
                        No evaluated scorecards found for this judge.
                      </td>
                    </tr>
                  ) : (
                    inspectorReviews.map((rev: any) => (
                      <tr key={rev.id} className="hover:bg-[#2B2B2B]/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#FFFFFF]">{rev.roundName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-[#D4D4D4]">{rev.registrationId}</td>
                        <td className="py-3 px-4 font-bold text-[#FFFFFF]">{rev.teamName}</td>
                        <td className="py-3 px-4 font-mono text-[#B3B3B3]">{rev.trackName}</td>
                        <td className="py-3 px-4 font-mono font-extrabold text-[#FFFFFF]">{rev.totalMarks} PTS</td>
                        <td className="py-3 px-4 text-[#B3B3B3] truncate max-w-[200px]">{rev.remarks || 'No remarks'}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#B3B3B3]">
                          {new Date(rev.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {/* WORKLOAD BALANCING RECOMMENDATIONS */}
      {suggestions && suggestions.heavyLoadJudges?.length > 0 && (
        <div className="p-4 bg-[#181818] border border-[#2B2B2B] rounded-2xl flex items-center justify-between text-xs font-sans text-[#D4D4D4] shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#FFFFFF] text-xl">warning</span>
            <div>
              <strong className="block font-bold text-[#FFFFFF]">WORKLOAD IMBALANCE DETECTED</strong>
              <span>
                {suggestions.heavyLoadJudges.length} judges have &gt; 5 teams assigned, while {suggestions.lightLoadJudges?.length || 0} judges have light queues.
              </span>
            </div>
          </div>
          <AnimatedButton
            onClick={() => setIsAssignModalOpen(true)}
            variant="secondary"
            size="sm"
          >
            REBALANCE QUEUE
          </AnimatedButton>
        </div>
      )}

      {/* FILTERS & SEARCH BAR */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Track Filter */}
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="h-9 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-lg text-xs font-mono text-[#FFFFFF] focus:outline-none"
          >
            <option value="">ALL TRACKS ({tracks.length})</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-lg text-xs font-mono text-[#FFFFFF] focus:outline-none"
          >
            <option value="">ALL STATUSES</option>
            <option value="Available">Available</option>
            <option value="Reviewing">Reviewing</option>
            <option value="Walking">Walking</option>
            <option value="Break">Break</option>
            <option value="Offline">Offline</option>
          </select>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <AnimatedButton
            onClick={() => setIsAssignModalOpen(true)}
            disabled={selectedJudgeIds.length === 0}
            variant="primary"
            size="sm"
            className="bg-[#FFFFFF] text-[#0E0E0E] hover:bg-[#D4D4D4] font-extrabold"
          >
            BULK ASSIGN ({selectedJudgeIds.length})
          </AnimatedButton>
        </div>
      </div>

      {/* JUDGES ROSTER TABLE */}
      <div className="bg-[#181818] border border-[#2B2B2B] rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0E0E0E] border-b border-[#2B2B2B] text-[#FFFFFF] text-[10px] font-mono uppercase font-bold">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedJudgeIds(filteredJudges.map((j: any) => j.id));
                      } else {
                        setSelectedJudgeIds([]);
                      }
                    }}
                    checked={selectedJudgeIds.length > 0 && selectedJudgeIds.length === filteredJudges.length}
                    className="accent-[#FFFFFF] rounded"
                  />
                </th>
                <th className="py-3.5 px-4">JUDGE NAME</th>
                <th className="py-3.5 px-4">STATUS</th>
                <th className="py-3.5 px-4">ASSIGNED TRACKS</th>
                <th className="py-3.5 px-4 text-center">ASSIGNED TEAMS</th>
                <th className="py-3.5 px-4 text-center">COMPLETED</th>
                <th className="py-3.5 px-4 text-center">AVG SPEED</th>
                <th className="py-3.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B2B2B] font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#B3B3B3] font-mono animate-pulse">
                    LOADING JUDGE ROSTER...
                  </td>
                </tr>
              ) : filteredJudges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#B3B3B3] font-mono">
                    NO JUDGES MATCHING FILTERS.
                  </td>
                </tr>
              ) : (
                filteredJudges.map((j: any) => {
                  const isChecked = selectedJudgeIds.includes(j.id);

                  return (
                    <tr
                      key={j.id}
                      onClick={(e) => handleRowClick(j.id, e)}
                      className={`hover:bg-[#2B2B2B]/60 cursor-pointer transition-colors ${
                        isChecked ? 'bg-[#2B2B2B]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (isChecked) {
                              setSelectedJudgeIds(selectedJudgeIds.filter((id) => id !== j.id));
                            } else {
                              setSelectedJudgeIds([...selectedJudgeIds, j.id]);
                            }
                          }}
                          className="accent-[#FFFFFF] rounded"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#FFFFFF]">
                        {j.name}
                        <span className="block text-[10px] font-mono text-[#B3B3B3] font-normal">{j.email}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${getStatusBadge(j.status)}`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#B3B3B3]">
                        {j.assignedTracks.map((t: any) => t.name).join(', ') || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#FFFFFF]">
                        {j.assignedTeamsCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#FFFFFF]">
                        {j.completedReviewsCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[#B3B3B3]">
                        {j.avgReviewTime} min
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJudgeId(j.id);
                            setDrawerOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#2B2B2B] border border-[#555555] text-xs font-mono font-bold text-[#FFFFFF] hover:bg-[#555555]"
                        >
                          INSPECT
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Drawers */}
      <AssignTeamsModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        selectedJudgeIds={selectedJudgeIds}
      />

      <JudgeDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        judgeId={selectedJudgeId}
      />
    </motion.div>
  );
};

export default JudgeCoordination;
