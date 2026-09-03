import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../shared/services/api';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

export const ReviewHistory: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedJudgeId, setSelectedJudgeId] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<any | null>(null);

  // Score Override Modal state
  const [overrideModalReview, setOverrideModalReview] = useState<any | null>(null);
  const [newScore, setNewScore] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['admin-review-history-all'],
    queryFn: () => api.get('/reviews/history/all'),
  });

  const { data: judgeReportData } = useQuery({
    queryKey: ['judge-report', selectedJudgeId],
    queryFn: () => api.get(`/reviews/history/judge/${selectedJudgeId}`),
    enabled: !!selectedJudgeId,
  });

  const overrideMutation = useMutation({
    mutationFn: (data: { reviewId: string; newScore: number; reason: string }) =>
      api.post('/reviews/override', data),
    onSuccess: () => {
      toast.success('Score override recorded successfully!');
      setOverrideModalReview(null);
      setOverrideReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-review-history-all'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to record score override.');
    },
  });

  const handleOpenOverride = (review: any) => {
    setOverrideModalReview(review);
    setNewScore(review.totalScore);
    setOverrideReason('');
  };

  const handleConfirmOverride = () => {
    if (!overrideModalReview) return;
    if (!overrideReason.trim()) {
      toast.error('Reason for score override is required');
      return;
    }
    overrideMutation.mutate({
      reviewId: overrideModalReview.id,
      newScore,
      reason: overrideReason,
    });
  };

  const history = historyData?.history || [];
  const judgeStats = historyData?.judgeStats || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-7xl mx-auto text-[#0B2340] font-sans pb-10 sm:pb-16"
    >
      {/* REVIEW AUDIT LOG HEADER */}
      <div className="bg-white border border-[#C8DCEB] p-6 rounded-2xl shadow-[0_8px_30px_rgba(30,80,120,0.08)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-[#1687D9] animate-pulse" />
            <span className="text-[#0B63B6] font-bold tracking-wider">SYS // REVIEW AUDIT LOG</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0B2340] tracking-tight">
            EVALUATION AUDIT <span className="text-[#1687D9]">//</span> HISTORY DESK
          </h1>
          <p className="text-xs font-sans text-[#52677D] mt-1">
            SCORECARD AUDIT TRAIL, JUDGE EVALUATION METRICS & ADMINISTRATIVE OVERRIDES
          </p>
        </div>
        {user?.role === 'JUDGE' && (
          <AnimatedButton
            onClick={() => navigate('/reviews')}
            variant="primary"
            size="sm"
            icon="edit_note"
            className="bg-[#1687D9] text-white hover:bg-[#0B63B6]"
          >
            GO TO EVALUATION DECK
          </AnimatedButton>
        )}
      </div>

      {/* JUDGE PERFORMANCE METRICS CARDS GRID */}
      {judgeStats.length > 0 && (
        <div className="space-y-3 font-sans">
          <h2 className="text-xs font-mono font-bold text-[#0B63B6] uppercase tracking-wider">
            // JUDGE PERFORMANCE &amp; SPEED METRICS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            {judgeStats.map((j: any) => (
              <button
                key={j.judgeId}
                onClick={() => setSelectedJudgeId(j.judgeId)}
                className="bg-white border border-[#C8DCEB] p-4 rounded-xl text-left hover:border-[#1687D9] transition-all flex flex-col justify-between shadow-[0_8px_30px_rgba(30,80,120,0.08)] group"
              >
                <div>
                  <span className="text-[10px] text-[#52677D] uppercase font-bold block">JUDGE PERFORMANCE</span>
                  <span className="font-bold text-sm text-[#0B2340] block mt-1 truncate group-hover:text-[#1687D9]">{j.judgeName}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#F5FAFE] flex justify-between items-center text-xs">
                  <span className="text-[#52677D]">{j.reviewsCount} Reviews</span>
                  <span className="text-[#047857] font-bold">Avg: {j.avgTimeSeconds}s</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AUDIT LOG TABLE */}
      <div className="bg-white border border-[#C8DCEB] p-6 rounded-2xl space-y-4 font-sans shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
        <h2 className="text-sm font-bold text-[#0B2340] uppercase tracking-wider font-mono flex items-center gap-2">
          <span className="material-symbols-outlined text-[#1687D9]">history</span>
          <span>COMPLETED SCORECARD AUDIT TRAIL</span>
        </h2>

        <div className="border border-[#C8DCEB] rounded-xl overflow-hidden bg-[#F5FAFE]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white border-b border-[#C8DCEB] text-[#0B63B6] text-[10px] font-mono uppercase font-bold">
                <th className="py-3 px-4">ROUND</th>
                <th className="py-3 px-4">TEAM CODE</th>
                <th className="py-3 px-4">TEAM NAME</th>
                <th className="py-3 px-4">TRACK</th>
                <th className="py-3 px-4">JUDGE</th>
                <th className="py-3 px-4">SCORE</th>
                <th className="py-3 px-4">SUBMITTED</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#52677D] font-mono animate-pulse">
                    LOADING REVIEW AUDIT LOG...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#52677D] font-mono">
                    NO COMPLETED EVALUATION RECORDS FOUND.
                  </td>
                </tr>
              ) : (
                history.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0B2340]">{item.roundName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#1687D9]">{item.registrationId}</td>
                    <td className="py-3 px-4 font-bold text-[#0B2340]">{item.teamName}</td>
                    <td className="py-3 px-4 font-mono text-[#52677D]">{item.trackName}</td>
                    <td className="py-3 px-4 text-[#0B2340]">{item.judgeName}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-[#047857]">
                      {item.totalScore} PTS
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#52677D]">
                      {new Date(item.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedReview(item)}
                        className="px-2.5 py-1 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[#0B63B6] font-mono font-bold hover:bg-[#DBEAFE]"
                      >
                        VIEW
                      </button>
                      {user?.role === 'ADMINISTRATOR' && (
                        <button
                          onClick={() => handleOpenOverride(item)}
                          className="px-2.5 py-1 rounded bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] font-mono font-bold hover:bg-[#FEF3C7]"
                        >
                          OVERRIDE
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED SCORECARD MODAL */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-[#0B2340]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#C8DCEB] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-[#0B2340] font-sans">
            <div className="flex justify-between items-start border-b border-[#E2E8F0] pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#0B63B6] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded">
                  SCORECARD AUDIT #{selectedReview.id.substring(0, 8)}
                </span>
                <h3 className="text-xl font-extrabold text-[#0B2340] mt-1">{selectedReview.teamName}</h3>
                <p className="text-xs font-mono text-[#52677D]">Round: {selectedReview.roundName} &bull; Judge: {selectedReview.judgeName}</p>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-[#52677D] hover:text-[#0B2340] font-mono font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Criteria Breakdown */}
            <div className="space-y-3 font-mono text-xs">
              <h4 className="font-bold text-[#0B2340] uppercase">ITEMIZED CRITERIA SCORES</h4>
              <div className="space-y-2">
                {(selectedReview.scores || []).map((s: any) => (
                  <div key={s.criterionId} className="p-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl flex justify-between items-center">
                    <div>
                      <span className="font-bold text-[#0B2340] block">{s.criterionName}</span>
                      <span className="text-[10px] text-[#52677D] block">{s.description}</span>
                    </div>
                    <span className="font-extrabold text-sm text-[#047857]">{s.score} / {s.maxMarks}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-[#0B2340] text-white rounded-xl flex justify-between items-center font-extrabold text-sm">
                <span>TOTAL MARKS</span>
                <span className="text-[#93C5FD]">{selectedReview.totalScore} PTS</span>
              </div>
            </div>

            {/* Comments */}
            {selectedReview.remarks && (
              <div className="space-y-1 font-sans text-xs">
                <label className="font-mono font-bold text-[#0B2340] uppercase block">JUDGE REMARKS &amp; COMMENTS</label>
                <div className="p-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-[#0B2340]">
                  {selectedReview.remarks}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <AnimatedButton onClick={() => setSelectedReview(null)} variant="secondary" size="md">
                CLOSE AUDIT
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}

      {/* ADMINISTRATIVE OVERRIDE MODAL */}
      {overrideModalReview && (
        <div className="fixed inset-0 z-50 bg-[#0B2340]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#C8DCEB] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-[#0B2340] font-sans">
            <div className="border-b border-[#E2E8F0] pb-3">
              <span className="text-[10px] font-mono font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded">
                ADMINISTRATIVE OVERRIDE
              </span>
              <h3 className="text-lg font-extrabold text-[#0B2340] mt-1">Override Score for {overrideModalReview.teamName}</h3>
              <p className="text-xs font-mono text-[#52677D]">Current Score: {overrideModalReview.totalScore} PTS</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-mono font-bold text-[#0B2340] uppercase mb-1">NEW OVERRIDE SCORE (PTS)</label>
                <input
                  type="number"
                  value={newScore}
                  onChange={(e) => setNewScore(Number(e.target.value))}
                  className="w-full p-2.5 bg-[#F5FAFE] border border-[#C8DCEB] rounded-lg font-mono font-bold text-[#0B2340] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono font-bold text-[#0B2340] uppercase mb-1">REASON FOR OVERRIDE (COMPULSORY AUDIT TRAIL)</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State technical or administrative reason for score adjustment..."
                  className="w-full h-24 p-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-lg font-sans text-[#0B2340] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideModalReview(null)}
                className="px-4 py-2 rounded-lg border border-[#C8DCEB] text-[#52677D] font-mono font-bold hover:bg-[#F5FAFE] text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmOverride}
                disabled={overrideMutation.isPending}
                className="px-4 py-2 rounded-lg bg-[#B45309] text-white font-mono font-bold hover:bg-[#92400E] text-xs"
              >
                {overrideMutation.isPending ? 'RECORDING OVERRIDE...' : 'CONFIRM SCORE OVERRIDE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JUDGE INDIVIDUAL REPORT MODAL */}
      {selectedJudgeId && judgeReportData && (
        <div className="fixed inset-0 z-50 bg-[#0B2340]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#C8DCEB] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl text-[#0B2340] font-sans">
            <div className="flex justify-between items-start border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#0B2340]">{judgeReportData.judge?.name}</h3>
                <p className="text-xs font-mono text-[#52677D]">Email: {judgeReportData.judge?.email}</p>
              </div>
              <button onClick={() => setSelectedJudgeId(null)} className="text-[#52677D] font-mono font-bold">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl">
                <span className="text-[10px] text-[#52677D] block">TOTAL EVALUATIONS</span>
                <span className="text-xl font-extrabold text-[#0B2340]">{judgeReportData.stats?.totalReviews || 0}</span>
              </div>
              <div className="p-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl">
                <span className="text-[10px] text-[#52677D] block">AVERAGE TIME</span>
                <span className="text-xl font-extrabold text-[#047857]">{judgeReportData.stats?.avgTimeSeconds || 0}s</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <AnimatedButton onClick={() => setSelectedJudgeId(null)} variant="secondary" size="md">
                CLOSE REPORT
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReviewHistory;
