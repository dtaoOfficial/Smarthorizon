import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Gavel,
  QrCode,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Clock,
  ArrowRight,
  ListFilter,
  Check,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useTrack } from '../../../context/TrackContext';
import { QrScannerModal } from '../../../shared/components/QrScannerModal';
import { AccessDeniedModal } from '../../../shared/components/AccessDeniedModal';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';

export const JudgeDashboard: React.FC = () => {
  const { selectedTrackId } = useTrack();
  const navigate = useNavigate();

  // QR Scanner States
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [accessDeniedOpen, setAccessDeniedOpen] = useState(false);
  const [qrVerified, setQrVerified] = useState(false);
  const [loadingTeamName, setLoadingTeamName] = useState<string | null>(null);

  const handleScan = async (code: string) => {
    setScanError(null);
    try {
      const res = await api.post('/reviews/scan', { code });
      if (res.success) {
        setQrVerified(true);
        setLoadingTeamName(res.team.name);
        setScannerOpen(false);
        setTimeout(() => {
          setQrVerified(false);
          setLoadingTeamName(null);
          navigate(`/reviews/${res.team.id}`, {
            state: {
              fromQrScan: true,
              qrScanTimestamp: res.qrScanTimestamp,
              reviewStartTimestamp: res.reviewStartTimestamp,
            },
          });
        }, 1000);
      }
    } catch (err: any) {
      if (err.status === 403) {
        setScannerOpen(false);
        setAccessDeniedOpen(true);
      } else {
        setScanError(err.message || 'QR Scan failed validation. Verify assignment and round eligibility.');
      }
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['judge-assignments', selectedTrackId],
    queryFn: () => api.get('/dashboard/judge-assignments'),
    refetchInterval: 4000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white border border-[#C8DCEB] rounded-2xl min-h-[360px] text-center font-sans shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
        <div className="w-10 h-10 border-2 border-[#1687D9] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-[#52677D] animate-pulse">
          Resolving evaluation queue...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl flex items-center gap-3 font-sans">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
        <span className="text-sm">Failed to load evaluations queue. Please reload the page.</span>
      </div>
    );
  }

  const stats = (data as any)?.stats || { assigned: 0, completed: 0, pending: 0 };
  const queue: {
    teamId: string;
    teamName: string;
    projectTitle: string | null;
    trackId?: string;
    trackName: string;
    reviewStatus: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';
    reviewId: string | null;
  }[] = (data as any)?.queue || [];
  const activeRound = (data as any)?.activeRound || null;

  const filteredQueue = selectedTrackId
    ? queue.filter((item) => item.trackId === selectedTrackId || item.trackName === selectedTrackId)
    : queue;

  const pendingQueue = queue.filter((item) => item.reviewStatus !== 'SUBMITTED');
  const currentReview = pendingQueue[0] || null;
  const nextReview = pendingQueue[1] || null;

  const renderPerRoundBadges = (roundDetails?: any[]) => {
    if (!roundDetails || roundDetails.length === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold bg-[#F5FAFE] text-[#52677D] border border-[#C8DCEB]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8]" />
          Pending
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {roundDetails.map((rd: any, idx: number) => {
          const isSubmitted = rd.status === 'SUBMITTED';
          const isDraft = rd.status === 'DRAFT';
          const label = `R${idx + 1}: ${isSubmitted ? `Completed (${rd.score ?? 0} pts)` : isDraft ? 'Draft' : 'Not Complete'}`;

          return (
            <span
              key={rd.roundId || idx}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                isSubmitted
                  ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                  : isDraft
                  ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                  : 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSubmitted ? 'bg-[#047857]' : isDraft ? 'bg-[#B45309]' : 'bg-[#1687D9]'}`} />
              <span>{label}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-7xl mx-auto text-[#0B2340] font-sans pb-10 sm:pb-16"
    >
      {/* JUDGE DECK HEADER BAR */}
      <div className="bg-white border border-[#C8DCEB] p-6 rounded-2xl shadow-[0_8px_30px_rgba(30,80,120,0.08)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-[#1687D9] animate-pulse" />
            <span className="text-[#0B63B6] font-bold tracking-wider">SYS // JUDGE EVALUATION DECK</span>
            <span className="text-[#C8DCEB]">|</span>
            <span className="text-[#0B2340] font-bold">ROUND: {activeRound?.name || 'ROUND 1'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0B2340] tracking-tight flex items-center gap-2">
            JUDGE <span className="text-[#1687D9]">//</span> EVALUATION DECK
          </h1>
          <p className="text-xs font-mono text-[#52677D] mt-1">
            QUALITATIVE & QUANTITATIVE SCORING WORKSTATION &bull; ACTIVE ROUND: <span className="text-[#0B2340] font-bold">{activeRound?.name || 'Round 1'}</span>
          </p>
        </div>
        <AnimatedButton
          onClick={() => navigate('/feedback')}
          variant="secondary"
          size="sm"
          className="bg-[#EFF6FF] border border-[#BFDBFE] text-[#0B63B6] hover:bg-[#DBEAFE] font-bold shadow-sm"
        >
          SUBMIT JURY FEEDBACK
        </AnimatedButton>
      </div>

      {/* QR Scanning Verification Overlay */}
      {qrVerified && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#ECFDF5] border border-[#A7F3D0] p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 shadow-sm font-sans text-[#0B2340]"
        >
          <CheckCircle2 className="w-12 h-12 text-[#047857] animate-bounce" />
          <h3 className="text-xl font-extrabold text-[#0B2340]">&check; QR BADGE VERIFIED</h3>
          <p className="text-[#52677D] text-xs">LAUNCHING SCORECARD FOR: {loadingTeamName}...</p>
        </motion.div>
      )}

      {/* Primary QR Scanner Launch Banner */}
      <div className="bg-white border border-[#C8DCEB] p-6 rounded-2xl shadow-[0_8px_30px_rgba(30,80,120,0.08)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-mono text-[#0B63B6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1687D9] animate-ping" />
            <span className="font-bold">INSTANT SPEED SCORING</span>
          </div>
          <h2 className="text-xl font-extrabold font-mono text-[#0B2340] flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-[#1687D9]" />
            <span>SCAN TEAM QR BADGE</span>
          </h2>
          <p className="text-xs text-[#52677D]">
            Scan any team badge to instantly open their live evaluation scorecard with auto-assignment checks.
          </p>
        </div>
        <AnimatedButton
          onClick={() => {
            setScannerOpen(true);
            setScanError(null);
          }}
          variant="primary"
          size="md"
          className="shrink-0 bg-[#1687D9] text-white font-bold hover:bg-[#0B63B6]"
        >
          SCAN QR CODE
        </AnimatedButton>
      </div>

      {/* Statistics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-white border border-[#C8DCEB] p-5 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
          <div>
            <span className="text-[11px] text-[#52677D] uppercase font-bold">ASSIGNED TEAMS</span>
            <span className="text-3xl font-extrabold text-[#0B2340] block mt-1">{stats.assigned}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1687D9]">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#C8DCEB] p-5 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
          <div>
            <span className="text-[11px] text-[#52677D] uppercase font-bold">COMPLETED REVIEWS</span>
            <span className="text-3xl font-extrabold text-[#047857] block mt-1">{stats.completed}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#047857]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-[#C8DCEB] p-5 rounded-2xl flex items-center justify-between shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
          <div>
            <span className="text-[11px] text-[#52677D] uppercase font-bold">PENDING QUEUE</span>
            <span className="text-3xl font-extrabold text-[#B45309] block mt-1">{stats.pending}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#B45309]">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Target Focus Cards (Current vs Next Review) */}
      {currentReview && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {/* Current Target */}
          <div className="bg-white border border-[#1687D9] p-6 rounded-2xl space-y-4 shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold font-mono bg-[#1687D9] text-white px-3 py-1 rounded-md uppercase tracking-wider">
                CURRENT EVALUATION TARGET
              </span>
              <span className="text-xs font-mono text-[#0B63B6]">TRK: {currentReview.trackName}</span>
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-[#0B2340]">{currentReview.teamName}</h3>
              <p className="text-xs text-[#52677D] mt-1 truncate font-mono">
                PROJECT: {currentReview.projectTitle || 'No title entered yet'}
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <AnimatedButton
                onClick={() => {
                  setScannerOpen(true);
                  setScanError(null);
                }}
                variant="primary"
                size="sm"
                className="w-full bg-[#1687D9] text-white font-extrabold hover:bg-[#0B63B6]"
              >
                SCAN TEAM QR
              </AnimatedButton>
              <AnimatedButton
                onClick={() => navigate(`/reviews/${currentReview.teamId}`)}
                variant="outline"
                size="sm"
                className="w-full bg-white text-[#0B2340] border border-[#C8DCEB] hover:border-[#1687D9] hover:bg-[#F5FAFE] font-extrabold"
              >
                START MANUAL SCORING
              </AnimatedButton>
            </div>
          </div>

          {/* Next Target */}
          {nextReview ? (
            <div className="bg-white border border-[#C8DCEB] p-6 rounded-2xl space-y-4 shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold font-mono bg-[#0B63B6] text-white px-3 py-1 rounded-md uppercase tracking-wider">
                  NEXT IN QUEUE
                </span>
                <span className="text-xs font-mono text-[#0B2340] font-bold">TRK: {nextReview.trackName}</span>
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-[#0B2340]">{nextReview.teamName}</h3>
                <p className="text-xs text-[#52677D] mt-1 truncate font-mono font-medium">
                  PROJECT: {nextReview.projectTitle || 'No title entered yet'}
                </p>
              </div>

              <div className="pt-1">
                <AnimatedButton
                  onClick={() => navigate(`/reviews/${nextReview.teamId}`)}
                  variant="primary"
                  size="sm"
                  className="w-full bg-[#1687D9] text-white font-extrabold hover:bg-[#0B63B6]"
                >
                  VIEW TEAM DETAILS
                </AnimatedButton>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[#C8DCEB] rounded-2xl flex flex-col items-center justify-center text-center p-6 text-[#52677D] text-xs bg-white shadow-sm font-mono">
              <Check className="w-6 h-6 mb-1 text-[#1687D9]" />
              <p>NO OTHER PENDING EVALUATIONS IN QUEUE.</p>
            </div>
          )}
        </section>
      )}

      {/* Queue Table */}
      <div className="bg-white border border-[#C8DCEB] p-6 rounded-2xl space-y-4 font-sans shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
        <h2 className="text-sm font-bold text-[#0B2340] uppercase tracking-wider font-mono flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-[#1687D9]" />
          <span>ALL ASSIGNED EVALUATIONS ROSTER</span>
        </h2>
        <div className="border border-[#C8DCEB] rounded-xl overflow-x-auto bg-[#F5FAFE] hide-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-white border-b border-[#C8DCEB] text-[#0B63B6] text-[10px] font-mono uppercase font-bold">
                <th className="py-3 px-4">TEAM NAME</th>
                <th className="py-3 px-4">TRACK</th>
                <th className="py-3 px-4">PROJECT TITLE</th>
                <th className="py-3 px-4">ROUNDS STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 px-4 text-center text-[#52677D] font-mono font-bold">
                    NO ASSIGNMENTS FOUND FOR THIS TRACK.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((item) => (
                  <tr key={item.teamId} className="hover:bg-[#EFF6FF]/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0B2340]">{item.teamName}</td>
                    <td className="py-3 px-4 text-[#1687D9] font-mono font-bold">{item.trackName}</td>
                    <td className="py-3 px-4 text-[#52677D] truncate max-w-[180px]">{item.projectTitle || '-'}</td>
                    <td className="py-3 px-4">{renderPerRoundBadges((item as any).roundDetails)}</td>
                    <td className="py-3 px-4 text-right">
                      <AnimatedButton
                        onClick={() => navigate(`/reviews/${item.teamId}`)}
                        variant={item.reviewStatus === 'SUBMITTED' ? 'secondary' : 'primary'}
                        size="sm"
                        className={item.reviewStatus === 'SUBMITTED' ? 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#0B63B6] hover:bg-[#DBEAFE] font-bold' : 'bg-[#1687D9] text-white font-bold'}
                      >
                        {item.reviewStatus === 'SUBMITTED' ? 'EDIT MARKS' : 'EVALUATE'}
                      </AnimatedButton>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Modals */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        scanError={scanError}
        setScanError={setScanError}
      />

      <AccessDeniedModal
        isOpen={accessDeniedOpen}
        onClose={() => setAccessDeniedOpen(false)}
      />
    </motion.div>
  );
};

export default JudgeDashboard;
