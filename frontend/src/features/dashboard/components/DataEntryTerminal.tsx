import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import { Check, Search, AlertCircle, Save, UserCheck, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const DataEntryTerminal: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedJudgeId, setSelectedJudgeId] = useState<string>('');
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Focus ref for fast entry
  const firstInputRef = useRef<HTMLInputElement>(null);
  const teamSearchRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: judgesData } = useQuery({
    queryKey: ['judges-list'],
    queryFn: () => api.get('/judges'),
  });

  const { data: roundsData } = useQuery({
    queryKey: ['reviews-rounds'],
    queryFn: () => api.get('/reviews/rounds'),
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams-list'],
    queryFn: () => api.get('/teams'),
  });

  const judges: any[] = judgesData?.judges || [];
  const rounds: any[] = roundsData?.rounds || [];
  const teams: any[] = teamsData?.teams || [];

  const selectedRound = rounds.find((r: any) => r.id === selectedRoundId);
  const criteria = selectedRound?.criteria || [];
  const selectedTeam = teams.find((t: any) => t.id === selectedTeamId);
  const selectedJudge = judges.find((j: any) => j.id === selectedJudgeId);

  // Auto-focus first input when team is selected & auto-select assigned judge
  useEffect(() => {
    if (selectedTeamId && criteria.length > 0) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
    
    if (selectedTeam) {
      const assignedIds = selectedTeam.assignedJudgeIds || [];
      if (assignedIds.length > 0 && (!selectedJudgeId || !assignedIds.includes(selectedJudgeId))) {
        setSelectedJudgeId(assignedIds[0]);
      }
    }
  }, [selectedTeamId, criteria, selectedTeam]);

  // Handle scoring input
  const handleScoreChange = (criterionId: string, val: string) => {
    setScores(prev => ({ ...prev, [criterionId]: val }));
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/reviews/admin-save', payload);
    },
    onSuccess: () => {
      setSuccessMsg(`Successfully saved scores for ${selectedTeam?.teamCode || selectedTeam?.name} (${selectedJudge?.name || 'Judge'})`);
      setErrorMsg(null);
      // Reset for next team
      setSelectedTeamId('');
      setTeamSearchTerm('');
      setScores({});
      
      // Auto focus team search again for rapid entry
      setTimeout(() => {
        setSuccessMsg(null);
        teamSearchRef.current?.focus();
      }, 2500);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to save scores. Check inputs.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJudgeId || !selectedRoundId || !selectedTeamId) {
      setErrorMsg('Please select a Judge by name, Round, and Team.');
      return;
    }

    const payloadScores = criteria.map((c: any) => ({
      criterionId: c.id,
      score: parseInt(scores[c.id] || '0', 10),
    }));

    submitMutation.mutate({
      judgeId: selectedJudgeId,
      roundId: selectedRoundId,
      teamId: selectedTeamId,
      status: 'SUBMITTED',
      scores: payloadScores,
      comments: `Entered via Admin Data Entry Terminal on behalf of ${selectedJudge?.name || 'Judge'}`
    });
  };

  const filteredTeams = teams.filter((t: any) => {
    if (!teamSearchTerm) return false;
    const term = teamSearchTerm.toLowerCase();
    return (
      (t.teamCode && t.teamCode.toLowerCase().includes(term)) ||
      (t.registrationId && t.registrationId.toLowerCase().includes(term)) ||
      (t.name && t.name.toLowerCase().includes(term)) ||
      (Array.isArray(t.assignedJudges) && t.assignedJudges.some((jn: string) => jn.toLowerCase().includes(term)))
    );
  }).slice(0, 6); // Top 6 for fast selection

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white p-6 pb-48 sm:pb-60 font-mono selection:bg-[#2B2B2B]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2B2B2B] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1687D9]">Data Entry Terminal</h1>
            <p className="text-xs text-[#B3B3B3]">Rapid score ingestion mode with full Judge Name verification.</p>
          </div>
          {selectedJudge && (
            <div className="hidden sm:flex items-center gap-2 bg-[#181818] border border-[#2B2B2B] px-3 py-1.5 rounded-lg text-xs">
              <UserCheck className="w-4 h-4 text-[#1687D9]" />
              <span className="text-[#B3B3B3]">Active Judge:</span>
              <span className="font-bold text-white">{selectedJudge.name}</span>
            </div>
          )}
        </div>

        {/* Global Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-[#B3B3B3] flex items-center gap-1.5 font-bold">
              <Award className="w-3.5 h-3.5 text-[#1687D9]" />
              1. Select Judge Name (Source Evaluator)
            </label>
            <select 
              value={selectedJudgeId}
              onChange={(e) => setSelectedJudgeId(e.target.value)}
              className="w-full bg-[#181818] border border-[#2B2B2B] rounded-lg p-3 text-sm focus:border-[#1687D9] focus:outline-none text-white font-sans"
            >
              <option value="">-- Choose Judge by Name --</option>
              {judges.map((j: any) => (
                <option key={j.id} value={j.id}>
                  {j.name} {j.assignedTracks?.length ? `(${j.assignedTracks.join(', ')})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-[#B3B3B3] font-bold">2. Select Round</label>
            <select 
              value={selectedRoundId}
              onChange={(e) => setSelectedRoundId(e.target.value)}
              className="w-full bg-[#181818] border border-[#2B2B2B] rounded-lg p-3 text-sm focus:border-[#1687D9] focus:outline-none text-white font-sans"
            >
              <option value="">-- Select Evaluation Round --</option>
              {rounds.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-[#2B2B2B]" />

        {/* Team Selection */}
        <div className="space-y-4">
          <label className="text-xs text-[#B3B3B3] font-bold">3. Search Team (Code, Team Name, or Judge Name)</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[#52677D]" />
            <input 
              ref={teamSearchRef}
              type="text"
              placeholder="e.g., REG-1049, Tech Titans, or Judge Name..."
              value={teamSearchTerm}
              onChange={(e) => {
                setTeamSearchTerm(e.target.value);
                setSelectedTeamId('');
              }}
              className="w-full bg-[#181818] border border-[#2B2B2B] rounded-lg p-3 pl-10 text-sm focus:border-[#1687D9] focus:outline-none font-sans"
            />
          </div>

          {!selectedTeamId && teamSearchTerm && filteredTeams.length > 0 && (
            <div className="bg-[#181818] border border-[#2B2B2B] rounded-lg overflow-hidden divide-y divide-[#2B2B2B]">
              {filteredTeams.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTeamId(t.id);
                    setTeamSearchTerm(`${t.teamCode || t.registrationId} - ${t.name}`);
                  }}
                  className="w-full text-left p-3 hover:bg-[#2B2B2B] transition-colors text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                >
                  <div>
                    <span className="font-bold text-[#1687D9] mr-3">{t.teamCode || t.registrationId}</span>
                    <span className="text-white font-medium">{t.name}</span>
                    <span className="text-xs text-[#7F7F7F] ml-2 font-mono">({t.trackName || 'General'})</span>
                  </div>
                  {Array.isArray(t.assignedJudges) && t.assignedJudges.length > 0 && (
                    <div className="text-xs text-[#B3B3B3] flex items-center gap-1 font-sans">
                      <span className="text-[#7F7F7F]">Judges:</span>
                      <span className="text-[#1687D9] font-medium">{t.assignedJudges.join(', ')}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scoring Form */}
        <AnimatePresence>
          {selectedTeamId && selectedRound && (
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="bg-[#181818] border border-[#1687D9] rounded-xl p-6 space-y-6"
            >
              <div className="border-b border-[#2B2B2B] pb-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-lg font-bold text-white">
                    Scores for: <span className="text-[#1687D9]">{selectedTeam?.name}</span> ({selectedTeam?.teamCode || selectedTeam?.registrationId})
                  </h2>
                  <span className="text-xs bg-[#2B2B2B] px-2.5 py-1 rounded text-[#D4D4D4] font-mono">
                    Round: {selectedRound.name}
                  </span>
                </div>

                {/* Assigned Judges Quick Switcher */}
                {selectedTeam?.assignedJudges && selectedTeam.assignedJudges.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[#B3B3B3]">Assigned Judges for this team:</span>
                    {selectedTeam.assignedJudges.map((judgeName: string, idx: number) => {
                      const judgeId = selectedTeam.assignedJudgeIds?.[idx];
                      const isCurrent = selectedJudgeId === judgeId;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (judgeId) setSelectedJudgeId(judgeId);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 ${
                            isCurrent
                              ? 'bg-[#1687D9]/20 border-[#1687D9] text-[#1687D9] font-bold'
                              : 'bg-[#0E0E0E] border-[#333333] text-[#B3B3B3] hover:border-[#1687D9] hover:text-white'
                          }`}
                        >
                          <UserCheck className="w-3 h-3" />
                          {judgeName}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Active Evaluator confirmation banner */}
                <div className="mt-2 text-xs text-[#D4D4D4] bg-[#0E0E0E] p-2.5 rounded-lg border border-[#2B2B2B] flex items-center justify-between">
                  <span>
                    Submitting marks on behalf of Judge: <strong className="text-white text-sm">{selectedJudge?.name || 'Please select a judge'}</strong>
                  </span>
                  {selectedJudge?.assignedTracks && (
                    <span className="text-[#7F7F7F] text-[11px] hidden sm:inline">
                      Track: {selectedJudge.assignedTracks.join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {criteria.map((c: any, idx: number) => (
                  <div key={c.id} className="space-y-2 border-b border-[#2B2B2B] pb-4 last:border-0">
                    <label className="flex justify-between text-sm font-bold text-[#1687D9]">
                      <span>{c.name}</span>
                      <span>Max: {c.maxMarks}</span>
                    </label>
                    <div className="mt-2">
                      <input
                        ref={idx === 0 ? firstInputRef : null}
                        type="number"
                        min="0"
                        max={c.maxMarks}
                        value={scores[c.id] ?? ''}
                        onChange={(e) => handleScoreChange(c.id, e.target.value)}
                        className="w-full bg-[#0E0E0E] border border-[#2B2B2B] rounded-lg p-3 text-lg font-bold focus:border-[#1687D9] focus:outline-none text-white font-mono"
                        placeholder="Enter whole number score"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-900/30 text-red-400 border border-red-900 rounded-lg flex items-center gap-2 text-sm font-sans">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full bg-[#1687D9] hover:bg-[#0B63B6] text-white p-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm font-mono tracking-wider"
              >
                <Save className="w-5 h-5" />
                {submitMutation.isPending ? 'SAVING MARKS...' : `SAVE EVALUATION AS ${selectedJudge?.name?.toUpperCase() || 'JUDGE'} (ENTER)`}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Success Toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed top-6 right-6 bg-green-900/90 text-green-300 border border-green-700 p-4 rounded-xl flex items-center gap-3 backdrop-blur-md shadow-2xl z-50 text-sm font-sans"
            >
              <Check className="w-5 h-5 text-green-400" />
              <span className="font-bold">{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

