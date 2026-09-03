import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api } from '../../../shared/services/api';
import { QrScannerModal } from '../../../shared/components/QrScannerModal';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { useToast } from '../../../context/ToastContext';

export const TeamReviews: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'evaluate' | 'pool'>('pool');
  const [activeRound, setActiveRound] = useState<any>(null);
  const [currentTeam, setCurrentTeam] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving...' | 'Unsaved Draft' | 'Idle'>('Idle');

  // Scanner & Status states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [qrVerified, setQrVerified] = useState(false);
  const [loadingTeamName, setLoadingTeamName] = useState<string | null>(null);

  // Fetch all 3 Review Rounds with itemized criteria
  const { data: roundsData, isLoading: roundsLoading } = useQuery({
    queryKey: ['active-rounds-criteria'],
    queryFn: () => api.get('/reviews/rounds'),
  });

  const activeRoundData = activeRound || roundsData?.rounds?.[0];

  // Fetch Admin-assigned teams for the logged-in judge
  const { data: poolData, isLoading: poolLoading, refetch: refetchPool } = useQuery({
    queryKey: ['open-judge-pool', activeRoundData?.id],
    queryFn: () => api.get(`/reviews/open-pool?roundId=${activeRoundData?.id || ''}`),
    enabled: !!activeRoundData?.id,
    refetchInterval: 10000,
  });

  const eligibleTeams = poolData?.teams || [];

  useEffect(() => {
    if (roundsData?.rounds && roundsData.rounds.length > 0 && !activeRound) {
      setActiveRound(roundsData.rounds[0]);
    }
  }, [roundsData, activeRound]);

  // Load team details when teamId URL changes
  useEffect(() => {
    if (teamId) {
      setActiveTab('evaluate');
      setIsSubmitted(false);
      api
        .get(`/teams/${teamId}`)
        .then((res: any) => {
          const teamObj = res.team || res;
          setCurrentTeam({
            teamId: teamObj.id,
            teamName: teamObj.name || teamObj.teamName,
            registrationId: teamObj.registrationId || `REG-${teamObj.id.substring(0, 4)}`,
            trackName: teamObj.trackName || teamObj.track?.name || 'General Track',
            domain: teamObj.domain,
            pdfUrl: teamObj.pdfUrl,
            pdfFilename: teamObj.pdfFilename,
          });
        })
        .catch((err: any) => {
          console.error('Failed to fetch team details:', err);
          toast.error('Failed to resolve team context.');
        });
    }
  }, [teamId]);

  // LocalStorage Draft Restore
  useEffect(() => {
    if (!currentTeam?.teamId) return;
    try {
      const localKey = `smarthorizon_draft_${currentTeam.teamId}_${activeRoundData?.id}`;
      const saved = localStorage.getItem(localKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.scores && Object.keys(parsed.scores).length > 0) {
          setScores(parsed.scores);
          if (parsed.comments) setComments(parsed.comments);
          setAutoSaveStatus('Saved');
        }
      }
    } catch (e) {
      console.warn('Failed to restore local draft:', e);
    }
  }, [currentTeam?.teamId, activeRoundData?.id]);

  // Auto-save draft
  useEffect(() => {
    if (!activeRoundData || !currentTeam?.teamId) return;
    const hasScores = Object.keys(scores).length > 0;
    if (!hasScores && !comments) return;

    setAutoSaveStatus('Saving...');
    const timer = setTimeout(() => {
      try {
        const localKey = `smarthorizon_draft_${currentTeam.teamId}_${activeRoundData.id}`;
        localStorage.setItem(localKey, JSON.stringify({ scores, comments, timestamp: Date.now() }));
      } catch (e) {}

      const scoresList = (activeRoundData.criteria || []).map((c: any) => ({
        criterionId: c.id,
        score: Math.round(scores[c.id] || 0),
      }));

      api
        .post('/reviews/save', {
          roundId: activeRoundData.id,
          teamId: currentTeam.teamId,
          comments,
          status: 'DRAFT',
          scores: scoresList,
        })
        .then(() => setAutoSaveStatus('Saved'))
        .catch(() => setAutoSaveStatus('Unsaved Draft'));
    }, 1500);

    return () => clearTimeout(timer);
  }, [scores, comments, activeRoundData, currentTeam?.teamId]);

  // Fetch existing review scores for current team & active round
  useEffect(() => {
    if (!currentTeam?.teamId || !activeRoundData?.id) return;
    api
      .get(`/reviews/draft/${currentTeam.teamId}?roundId=${activeRoundData.id}`)
      .then((res: any) => {
        if (res.review && res.review.scores && res.review.scores.length > 0) {
          const loadedScores: Record<string, number> = {};
          res.review.scores.forEach((s: any) => {
            loadedScores[s.criterionId] = s.score;
          });
          setScores(loadedScores);
          if (res.review.comments) setComments(res.review.comments);
          setAutoSaveStatus('Saved');
        }
      })
      .catch(() => {});
  }, [currentTeam?.teamId, activeRoundData?.id]);

  // Save/Submit Review Mutation
  const saveReviewMutation = useMutation({
    mutationFn: (data: any) => api.post('/reviews/save', data),
    onSuccess: (res: any) => {
      setIsSubmitted(true);
      toast.success(res.message || 'Scorecard submitted & audit logged successfully!');
      try {
        confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}
      if (currentTeam?.teamId && activeRoundData?.id) {
        localStorage.removeItem(`smarthorizon_draft_${currentTeam.teamId}_${activeRoundData.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ['open-judge-pool'] });
      queryClient.invalidateQueries({ queryKey: ['admin-review-history-all'] });

      // Automatically return judge back to their dashboard after short delay
      setTimeout(() => {
        setCurrentTeam(null);
        setActiveTab('pool');
        navigate('/dashboard', { replace: true });
      }, 1500);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit evaluation scorecard.');
    },
  });

  const handleScoreChange = (criterionId: string, val: number | string, maxMarks: number) => {
    const rawNum = typeof val === 'number' ? val : parseFloat(String(val)) || 0;
    const roundedInt = Math.round(rawNum);
    const maxInt = Math.round(Number(maxMarks) || 10);
    const clamped = Math.max(0, Math.min(roundedInt, maxInt));
    setScores((prev) => ({ ...prev, [criterionId]: clamped }));
  };

  const handleSubmitScorecard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoundData || !currentTeam) {
      toast.error('Missing evaluation context.');
      return;
    }

    const missingCriteria = activeRoundData.criteria.filter((c: any) => scores[c.id] === undefined);
    if (missingCriteria.length > 0) {
      toast.error(`Please score all compulsory criteria before submitting (${missingCriteria.length} missing).`);
      return;
    }

    const scoresList = activeRoundData.criteria.map((c: any) => ({
      criterionId: c.id,
      score: Math.round(Number(scores[c.id] !== undefined ? scores[c.id] : 0)),
    }));

    saveReviewMutation.mutate({
      roundId: activeRoundData.id,
      teamId: currentTeam.teamId,
      comments,
      status: 'SUBMITTED',
      scores: scoresList,
    });
  };

  const openScanner = () => {
    setScanError(null);
    setScannerOpen(true);
  };

  const handleScan = async (scannedData: string) => {
    let regId = scannedData.trim();
    if (scannedData.includes('{')) {
      try {
        const parsed = JSON.parse(scannedData);
        regId = parsed.registrationId || parsed.teamCode || parsed.teamId || scannedData;
      } catch (e) {}
    }

    setScannerOpen(false);
    toast.info(`Scanned Code: ${regId}`, 'Verifying Team Registration...');

    api
      .get(`/teams/verify-qr?code=${encodeURIComponent(regId)}`)
      .then((res: any) => {
        const teamObj = res.team || res;
        setLoadingTeamName(teamObj.name || teamObj.teamName);
        setQrVerified(true);

        setTimeout(() => {
          setQrVerified(false);
          setCurrentTeam({
            teamId: teamObj.id,
            teamName: teamObj.name || teamObj.teamName,
            registrationId: teamObj.registrationId || regId,
            trackName: teamObj.trackName || teamObj.track?.name || 'General Track',
            domain: teamObj.domain,
            pdfUrl: teamObj.pdfUrl,
            pdfFilename: teamObj.pdfFilename,
          });
          setActiveTab('evaluate');
          setIsSubmitted(false);
          toast.success(`Loaded Team ${teamObj.name}`, 'Ready for Evaluation');
        }, 1200);
      })
      .catch((err: any) => {
        console.error('QR verification failed:', err);
        setScanError('QR Code unverified. No matching team found.');
        toast.error('QR verification failed. Please try again or select from assigned roster.');
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-7xl mx-auto text-[#0B2340] font-sans pb-10 sm:pb-16"
    >
      {/* EVALUATION WORKSTATION HERO */}
      <div className="bg-white border border-[#C8DCEB] p-6 rounded-2xl shadow-[0_8px_30px_rgba(30,80,120,0.08)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="bg-[#EFF6FF] text-[#1687D9] border border-[#BFDBFE] px-2.5 py-0.5 rounded-md font-mono font-bold">
              SYS // EVALUATION WORKSTATION
            </span>
            {activeRoundData && (
              <span className="bg-[#F0F7FF] text-[#0B63B6] border border-[#C8DCEB] px-2.5 py-0.5 rounded-md font-mono font-bold">
                ROUND: {activeRoundData.name} (v{activeRoundData.rubricVersion || '1.0'})
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#0B2340] tracking-tight mt-2">
            JUDGE EVALUATION WORKSTATION
          </h1>
          <p className="text-xs text-[#52677D] mt-0.5 font-medium">
            QUALITATIVE RUBRIC & QUANTITATIVE SCORECARD PIPELINE
          </p>
        </div>
        <AnimatedButton
          onClick={openScanner}
          variant="primary"
          size="sm"
          icon="qr_code_scanner"
          className="bg-[#1687D9] text-white hover:bg-[#0B63B6]"
        >
          SCAN TEAM QR
        </AnimatedButton>
      </div>

      {/* ROUND SELECTOR */}
      <div className="bg-white p-5 rounded-2xl border border-[#C8DCEB] space-y-4 shadow-[0_8px_30px_rgba(30,80,120,0.08)] font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1687D9] text-base">gavel</span>
            <h3 className="text-xs font-bold text-[#0B2340] font-mono uppercase tracking-wider">
              SELECT EVALUATION REVIEW ROUND:
            </h3>
          </div>
          {activeRoundData && (
            <span className="text-[10px] font-mono text-[#0B63B6] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded-full font-bold">
              ACTIVE: {activeRoundData.name} ({activeRoundData.criteria?.length || 0} CRITERIA)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(roundsData?.rounds || []).map((round: any, idx: number) => {
            const isSelected = activeRoundData?.id === round.id;
            const totalMaxMarks = (round.criteria || []).reduce((sum: number, c: any) => sum + (c.maxMarks || 10), 0);

            return (
              <button
                key={round.id}
                type="button"
                onClick={() => {
                  setActiveRound(round);
                  setScores({});
                  toast.info(`Switched to ${round.name}`, `Criteria Loaded (${round.criteria?.length || 0} items)`);
                }}
                className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#EFF6FF] border-[#1687D9] shadow-sm text-[#0B2340]'
                    : 'bg-white border-[#C8DCEB] hover:border-[#1687D9] text-[#52677D] hover:bg-[#F5FAFE]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                    isSelected ? 'bg-[#1687D9] text-white' : 'bg-[#E2E8F0] text-[#0B2340]'
                  }`}>
                    ROUND {round.sequence || idx + 1}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-[#0B63B6]' : 'text-[#1687D9]'}`}>
                    MAX: {totalMaxMarks} PTS
                  </span>
                </div>
                <div className="mt-2">
                  <h4 className={`font-bold text-xs ${isSelected ? 'text-[#0B2340]' : 'text-[#0B2340]'}`}>
                    {round.name}
                  </h4>
                  <p className="text-[11px] text-[#52677D] line-clamp-1 mt-0.5">
                    {round.description || `${round.criteria?.length || 0} criteria items`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* WORKSPACE TABS BAR */}
      <div className="flex border border-[#C8DCEB] bg-white rounded-xl p-1.5 overflow-x-auto hide-scrollbar shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
        <button
          onClick={() => setActiveTab('pool')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-xs whitespace-nowrap transition-all ${
            activeTab === 'pool'
              ? 'text-white font-extrabold bg-[#1687D9] shadow-sm'
              : 'text-[#0B2340] font-bold hover:text-[#1687D9] hover:bg-[#F5FAFE]'
          }`}
        >
          <span className={`material-symbols-outlined text-base ${activeTab === 'pool' ? 'text-white' : 'text-[#0B2340]'}`}>
            assignment_ind
          </span>
          <span>My Assigned Teams ({eligibleTeams.length})</span>
        </button>
        {currentTeam && (
          <button
            onClick={() => setActiveTab('evaluate')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-xs whitespace-nowrap transition-all ${
              activeTab === 'evaluate'
                ? 'text-white font-extrabold bg-[#1687D9] shadow-sm'
                : 'text-[#0B2340] font-bold hover:text-[#1687D9] hover:bg-[#F5FAFE]'
            }`}
          >
            <span className={`material-symbols-outlined text-base ${activeTab === 'evaluate' ? 'text-white' : 'text-[#0B2340]'}`}>
              edit_note
            </span>
            <span>Evaluating: {currentTeam.teamName}</span>
          </button>
        )}
      </div>

      {/* QR Scanning Verification Overlay */}
      {qrVerified && (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
          <span className="material-symbols-outlined text-[#047857] text-[56px] animate-bounce">
            check_circle
          </span>
          <h3 className="text-2xl font-extrabold text-[#0B2340]">✓ QR Code Verified</h3>
          <p className="text-xs font-mono text-[#047857]">Loading Team: {loadingTeamName}...</p>
        </div>
      )}

      {/* TAB 1: MY ASSIGNED TEAMS */}
      {activeTab === 'pool' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#0B2340] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1687D9]">assignment_ind</span>
                <span>My Assigned Teams for {activeRoundData?.name}</span>
              </h2>
              <p className="text-xs text-[#52677D]">Teams assigned specifically to you by the event administrator.</p>
            </div>
            <button
              onClick={() => refetchPool()}
              className="text-xs font-mono text-[#1687D9] hover:underline flex items-center gap-1 font-bold"
            >
              <span className="material-symbols-outlined text-sm text-[#1687D9]">refresh</span> Refresh Roster
            </button>
          </div>

          {poolLoading ? (
            <div className="p-8 text-center text-[#52677D] font-mono animate-pulse bg-white rounded-xl border border-[#C8DCEB] shadow-sm">Loading assigned teams...</div>
          ) : eligibleTeams.length === 0 ? (
            <div className="p-12 border border-dashed border-[#C8DCEB] rounded-2xl text-center space-y-2 bg-white shadow-sm">
              <span className="material-symbols-outlined text-4xl text-[#52677D]">assignment_turned_in</span>
              <h3 className="text-lg font-bold text-[#0B2340]">No Assigned Teams in Roster</h3>
              <p className="text-xs text-[#52677D]">Teams assigned to you by the administrator will appear here for evaluation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eligibleTeams.map((team: any) => {
                const evalStatus = team.evalStatus;

                return (
                  <AnimatedCard key={team.id} className="p-5 space-y-4 bg-white border border-[#C8DCEB] hover:border-[#1687D9] flex flex-col justify-between transition-all shadow-[0_8px_30px_rgba(30,80,120,0.08)]">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-mono text-[11px] font-bold text-[#0B2340] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded-full">
                          {team.registrationId || team.teamCode}
                        </span>
                        {evalStatus === 'COMPLETED' ? (
                          <span className="text-[10px] font-mono font-bold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full">
                            ✓ Evaluated
                          </span>
                        ) : evalStatus === 'DRAFT' ? (
                          <span className="text-[10px] font-mono font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-0.5 rounded-full">
                            📝 Draft Saved
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-[#1687D9] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded-full">
                            ⚡ Assigned by Admin
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-extrabold text-[#0B2340] mt-2">{team.name}</h3>
                      <p className="text-xs font-mono text-[#52677D] mt-1">Track: <span className="text-[#1687D9] font-bold">{team.trackName}</span></p>
                    </div>

                    <div className="pt-3 border-t border-[#F5FAFE] flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#52677D]">
                        {team.membersCount || 0} Members
                      </span>

                      <AnimatedButton
                        onClick={() => navigate(`/reviews/${team.id}`)}
                        variant="primary"
                        size="sm"
                        icon="edit_note"
                        className="bg-[#1687D9] text-white hover:bg-[#0B63B6]"
                      >
                        {evalStatus === 'COMPLETED' ? 'View Evaluation' : 'Evaluate Team'}
                      </AnimatedButton>
                    </div>
                  </AnimatedCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EVALUATION WORKSPACE */}
      {activeTab === 'evaluate' && (
        <>
          {isSubmitted ? (
            <div className="p-12 border border-[#C8DCEB] rounded-2xl text-center space-y-6 bg-white max-w-xl mx-auto shadow-sm">
              <span className="material-symbols-outlined text-[64px] text-[#047857]">check_circle</span>
              <div>
                <h3 className="text-2xl font-extrabold text-[#0B2340]">✓ Scorecard Finalized</h3>
                <p className="text-xs font-mono text-[#52677D] mt-2">Evaluation logged safely in database audit log.</p>
              </div>
              <div className="flex justify-center gap-3">
                <AnimatedButton
                  onClick={() => {
                    setCurrentTeam(null);
                    setActiveTab('pool');
                    navigate('/dashboard', { replace: true });
                  }}
                  variant="primary"
                  size="lg"
                  icon="arrow_forward"
                  className="bg-[#1687D9] text-white"
                >
                  Return to Judge Dashboard
                </AnimatedButton>
              </div>
            </div>
          ) : !currentTeam ? (
            <div className="p-12 border border-dashed border-[#C8DCEB] rounded-2xl text-center space-y-3 bg-white shadow-sm">
              <span className="material-symbols-outlined text-[48px] text-[#52677D]">touch_app</span>
              <h3 className="text-xl font-bold text-[#0B2340]">No Team Selected</h3>
              <p className="text-xs font-mono text-[#52677D]">Select a team from your Assigned Roster or scan a Team QR code.</p>
              <AnimatedButton onClick={() => setActiveTab('pool')} variant="primary" size="md" className="bg-[#1687D9] text-white">
                Go to Assigned Roster
              </AnimatedButton>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatedCard className="space-y-6 bg-white border border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)] p-6 rounded-2xl">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#C8DCEB] pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[#0B63B6] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {activeRoundData?.name || 'Round Active'} (Rubric v{activeRoundData?.rubricVersion || '1.0'})
                      </span>
                      <span className="text-[11px] font-mono text-[#047857] font-bold">
                        {autoSaveStatus}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#0B2340] mt-2">
                      Evaluating: {currentTeam.teamName} ({currentTeam.registrationId})
                    </h2>
                    <p className="text-xs font-mono text-[#52677D]">Track: {currentTeam.trackName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentTeam.pdfUrl && (
                      <a
                        href={currentTeam.pdfUrl.startsWith('http') ? currentTeam.pdfUrl : currentTeam.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-mono text-[#0B63B6] font-bold flex items-center gap-1 hover:bg-[#DBEAFE]"
                      >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        View PDF
                      </a>
                    )}
                    <AnimatedButton
                      onClick={() => setActiveTab('pool')}
                      variant="secondary"
                      size="sm"
                    >
                      Back to Roster
                    </AnimatedButton>
                  </div>
                </div>

                {/* Rubric Criteria Evaluation Form */}
                <form onSubmit={handleSubmitScorecard} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#0B2340] uppercase tracking-wider font-mono">
                      Rubric Criteria Evaluation (Whole Number Integer Scoring)
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      ★ Marks Compulsory
                    </span>
                  </div>

                  {activeRoundData?.criteria.map((c: any) => {
                    const currentScore = scores[c.id] !== undefined ? Math.round(scores[c.id]) : 0;

                    return (
                      <div
                        key={c.id}
                        className="p-5 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl space-y-4"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base text-[#0B2340] block">{c.name}</span>
                              <span className="text-[9px] font-mono text-[#BE123C] bg-[#FFE4E6] border border-[#FECDD3] px-1.5 py-0.5 rounded">REQUIRED</span>
                            </div>
                            <span className="text-xs text-[#52677D] block mt-0.5">{c.description}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-2xl font-extrabold font-mono text-[#1687D9]">
                              {currentScore}
                            </span>
                            <span className="text-xs font-mono text-[#52677D] block">/ {c.maxMarks} pts</span>
                          </div>
                        </div>

                        {/* Touch Slider Controls */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleScoreChange(c.id, currentScore - 1, c.maxMarks)}
                            className="w-12 h-12 rounded-xl bg-white border border-[#C8DCEB] text-[#0B2340] font-extrabold text-xl flex items-center justify-center hover:bg-[#EFF6FF] active:scale-95 transition-all shrink-0 shadow-sm"
                          >
                            -
                          </button>

                          <input
                            type="range"
                            min="0"
                            max={c.maxMarks}
                            step="1"
                            value={currentScore}
                            onChange={(e) => handleScoreChange(c.id, parseInt(e.target.value, 10), c.maxMarks)}
                            className="flex-1 h-3 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#1687D9]"
                          />

                          <button
                            type="button"
                            onClick={() => handleScoreChange(c.id, currentScore + 1, c.maxMarks)}
                            className="w-12 h-12 rounded-xl bg-white border border-[#C8DCEB] text-[#0B2340] font-extrabold text-xl flex items-center justify-center hover:bg-[#EFF6FF] active:scale-95 transition-all shrink-0 shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Running Total Indicator */}
                  {activeRoundData && (
                    <div className="p-4 bg-[#0B2340] border border-[#0B2340] rounded-xl flex justify-between items-center text-white shadow-sm">
                      <div>
                        <span className="font-bold text-sm text-white block">Total Score</span>
                        <span className="text-[10px] font-mono text-[#93C5FD] font-bold">Whole integer marks</span>
                      </div>
                      <span className="font-mono text-xl font-extrabold text-white bg-[#0B63B6] px-4 py-1.5 rounded-lg border border-[#1687D9]">
                        {activeRoundData.criteria.reduce((sum: number, c: any) => sum + Math.round(Number(scores[c.id] || 0)), 0)}{' '}
                        / {activeRoundData.criteria.reduce((sum: number, c: any) => sum + Math.round(Number(c.maxMarks || 10)), 0)} pts
                      </span>
                    </div>
                  )}

                  {/* Qualitative Feedback */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-mono font-extrabold text-[#0B2340]">JUDGE COMMENTS &amp; REMARKS</label>
                      <span className="text-[10px] font-mono font-bold text-[#52677D] bg-[#F5FAFE] border border-[#C8DCEB] px-2 py-0.5 rounded">Optional</span>
                    </div>
                    <textarea
                      className="w-full h-32 p-4 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] font-sans focus:outline-none focus:border-[#1687D9] placeholder-[#94A3B8]"
                      placeholder="Provide constructive feedback for the team (optional)..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <AnimatedButton
                      type="submit"
                      disabled={saveReviewMutation.isPending}
                      variant="primary"
                      size="lg"
                      icon="task_alt"
                      className="bg-[#1687D9] text-white hover:bg-[#0B63B6]"
                    >
                      {saveReviewMutation.isPending
                        ? 'Saving Scorecard...'
                        : Object.keys(scores).length > 0
                        ? `Save & Update Marks (${activeRoundData?.name})`
                        : 'Finalize & Submit Scorecard'}
                    </AnimatedButton>
                  </div>
                </form>
              </AnimatedCard>
            </div>
          )}
        </>
      )}

      {/* QR Code Modal */}
      <QrScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        scanError={scanError}
        setScanError={setScanError}
      />
    </motion.div>
  );
};

export default TeamReviews;
