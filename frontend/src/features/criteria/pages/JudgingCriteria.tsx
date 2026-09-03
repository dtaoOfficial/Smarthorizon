import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListChecks,
  Settings,
  Eye,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useTrack } from '../../../context/TrackContext';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';

export const JudgingCriteria: React.FC = () => {
  const { tracks } = useTrack();
  const queryClient = useQueryClient();

  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'criteria' | 'settings' | 'preview'>('criteria');

  // Modal / Form state for Add/Edit Criterion
  const [isCriterionModalOpen, setIsCriterionModalOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<any | null>(null);
  const [critName, setCritName] = useState('');
  const [critDesc, setCritDesc] = useState('');
  const [critMax, setCritMax] = useState(10);
  const [critWeight, setCritWeight] = useState(1.0);
  const [critSeq, setCritSeq] = useState(1);

  // Round Edit Settings state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDuration, setEditDuration] = useState(5);
  const [editWeight, setEditWeight] = useState(1.0);
  const [editActive, setEditActive] = useState(true);

  // Simulator preview state
  const [previewScores, setPreviewScores] = useState<Record<string, number>>({});
  const [previewComments, setPreviewComments] = useState('');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch all 3 Review Rounds with itemized criteria
  const { data: roundsData, isLoading: roundsLoading } = useQuery({
    queryKey: ['admin-review-rounds'],
    queryFn: () => api.get('/criteria/rounds'),
  });

  const rounds = roundsData?.rounds || [];
  const selectedRound = rounds.find((r: any) => r.id === selectedRoundId) || rounds[0];

  useEffect(() => {
    if (rounds.length > 0 && !selectedRoundId) {
      setSelectedRoundId(rounds[0].id);
    }
  }, [rounds, selectedRoundId]);

  useEffect(() => {
    if (selectedRound) {
      setEditName(selectedRound.name || '');
      setEditDesc(selectedRound.description || '');
      setEditDuration(selectedRound.duration || 5);
      setEditWeight(selectedRound.weight || 1.0);
      setEditActive(selectedRound.active || false);
    }
  }, [selectedRound]);

  // Round Update Mutation
  const updateRoundMutation = useMutation({
    mutationFn: (payload: any) => api.put(`/criteria/rounds/${selectedRound?.id}`, payload),
    onSuccess: () => {
      setErrorMessage(null);
      setSuccessMessage('Review round settings updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-review-rounds'] });
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update review round.');
    },
  });

  // Criterion Create/Edit Mutation
  const saveCriterionMutation = useMutation({
    mutationFn: (payload: any) =>
      editingCriterion
        ? api.put(`/criteria/${editingCriterion.id}`, payload)
        : api.post('/criteria', payload),
    onSuccess: () => {
      setErrorMessage(null);
      setSuccessMessage(editingCriterion ? 'Criterion updated.' : 'New criterion added.');
      queryClient.invalidateQueries({ queryKey: ['admin-review-rounds'] });
      closeCriterionModal();
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to save criterion.');
    },
  });

  // Criterion Delete Mutation
  const deleteCriterionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/criteria/${id}`),
    onSuccess: () => {
      setSuccessMessage('Criterion deleted.');
      queryClient.invalidateQueries({ queryKey: ['admin-review-rounds'] });
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to delete criterion.');
    },
  });

  // Round Lock/Unlock Mutation
  const toggleLockMutation = useMutation({
    mutationFn: () => api.put(`/criteria/rounds/${selectedRound?.id}/toggle-lock`, {}),
    onSuccess: (data: any) => {
      setErrorMessage(null);
      setSuccessMessage(`Rubric ${data.locked ? 'Locked' : 'Unlocked'} successfully.`);
      queryClient.invalidateQueries({ queryKey: ['admin-review-rounds'] });
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to toggle rubric lock state.');
    },
  });

  const openAddCriterionModal = () => {
    setEditingCriterion(null);
    setCritName('');
    setCritDesc('');
    setCritMax(10);
    setCritWeight(1.0);
    setCritSeq((selectedRound?.criteria?.length || 0) + 1);
    setIsCriterionModalOpen(true);
  };

  const openEditCriterionModal = (criterion: any) => {
    setEditingCriterion(criterion);
    setCritName(criterion.name);
    setCritDesc(criterion.description || '');
    setCritMax(criterion.maxMarks);
    setCritWeight(criterion.weight || 1.0);
    setCritSeq(criterion.sequence || 1);
    setIsCriterionModalOpen(true);
  };

  const closeCriterionModal = () => {
    setIsCriterionModalOpen(false);
    setEditingCriterion(null);
  };

  const handleCriterionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRound) return;

    saveCriterionMutation.mutate({
      roundId: selectedRound.id,
      name: critName.trim(),
      description: critDesc.trim(),
      maxMarks: Number(critMax),
      weight: Number(critWeight),
      sequence: Number(critSeq),
      required: true,
    });
  };

  const handleDeleteCriterion = (criterion: any) => {
    if (window.confirm(`Delete criterion "${criterion.name}"?`)) {
      deleteCriterionMutation.mutate(criterion.id);
    }
  };

  const handleSaveRoundSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRound) return;

    updateRoundMutation.mutate({
      name: editName,
      description: editDesc,
      sequence: selectedRound.sequence,
      active: editActive,
      duration: Number(editDuration),
      weight: Number(editWeight),
    });
  };

  const handlePreviewScoreChange = (criterionId: string, val: number, maxMarks: number) => {
    const clamped = Math.max(0, Math.min(maxMarks, Math.round(val)));
    setPreviewScores((prev) => ({ ...prev, [criterionId]: clamped }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-7xl mx-auto text-[#FFFFFF] font-sans"
    >
      {/* JUDGING CRITERIA HEADER */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className="text-[#FFFFFF] font-bold tracking-wider">SYS // JUDGING RUBRICS & CRITERIA DESK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FFFFFF] tracking-tight">
            JUDGING CRITERIA <span className="text-[#D4D4D4]">//</span> EVALUATION RUBRICS
          </h1>
          <p className="text-xs text-[#B3B3B3] mt-0.5 font-mono">
            ROUND RUBRIC SPECIFICATIONS, MARKS WEIGHTING & JUDGE SCORECARD SIMULATOR
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] rounded-2xl text-xs font-mono font-bold flex gap-2 items-center">
          <CheckCircle2 className="w-4 h-4 text-[#FFFFFF]" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-[#181818] border border-[#555555] text-[#B3B3B3] rounded-2xl text-xs font-mono font-bold flex gap-2 items-center">
          <AlertCircle className="w-4 h-4 text-[#555555]" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* REVIEW ROUNDS SELECTOR TABS */}
      <div className="bg-[#181818] p-6 rounded-2xl border border-[#2B2B2B] space-y-3 shadow-xl font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#FFFFFF] uppercase tracking-wider">
            SELECT REVIEW ROUND TO EDIT RUBRIC:
          </span>
          <span className="text-[#D4D4D4] font-bold">
            {rounds.length} ROUNDS CONFIGURED
          </span>
        </div>

        {roundsLoading ? (
          <div className="p-6 text-center text-[#B3B3B3] font-mono animate-pulse text-xs">
            LOADING REVIEW ROUNDS...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rounds.map((round: any, idx: number) => {
              const isSelected = selectedRound?.id === round.id;
              const totalMaxMarks = (round.criteria || []).reduce((sum: number, c: any) => sum + (c.maxMarks || 10), 0);

              return (
                <button
                  key={round.id}
                  onClick={() => {
                    setSelectedRoundId(round.id);
                    setPreviewScores({});
                  }}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#2B2B2B] border-[#555555] shadow-sm text-[#FFFFFF]'
                      : 'bg-[#0E0E0E] border-[#2B2B2B] hover:border-[#555555] text-[#B3B3B3] hover:bg-[#181818]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded uppercase ${
                      isSelected ? 'bg-[#FFFFFF] text-[#0E0E0E]' : 'bg-[#181818] text-[#B3B3B3] border border-[#2B2B2B]'
                    }`}>
                      ROUND {round.sequence || idx + 1} {round.locked ? '🔒' : ''}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#FFFFFF]">
                      MAX: {totalMaxMarks} PTS
                    </span>
                  </div>
                  <div className="mt-3 font-mono">
                    <h3 className="font-bold text-xs text-[#FFFFFF]">
                      {round.name}
                    </h3>
                    <p className="text-[10px] text-[#B3B3B3] line-clamp-1 mt-0.5">
                      {round.description || `${round.criteria?.length || 0} criteria configured`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedRound && (
        <div className="space-y-6">
          {/* Sub-navigation bar for selected round */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#181818] p-3 rounded-2xl border border-[#2B2B2B] shadow-xl font-mono">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('criteria')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'criteria'
                    ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] font-extrabold shadow-sm'
                    : 'text-[#B3B3B3] font-bold hover:text-[#FFFFFF] hover:bg-[#0E0E0E]'
                }`}
              >
                <ListChecks className="w-4 h-4 text-[#FFFFFF]" />
                <span>RUBRIC CRITERIA ({selectedRound.criteria?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] font-extrabold shadow-sm'
                    : 'text-[#B3B3B3] font-bold hover:text-[#FFFFFF] hover:bg-[#0E0E0E]'
                }`}
              >
                <Settings className="w-4 h-4 text-[#FFFFFF]" />
                <span>ROUND SETTINGS</span>
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'preview'
                    ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] font-extrabold shadow-sm'
                    : 'text-[#B3B3B3] font-bold hover:text-[#FFFFFF] hover:bg-[#0E0E0E]'
                }`}
              >
                <Eye className="w-4 h-4 text-[#FFFFFF]" />
                <span>SCORECARD SIMULATOR</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <AnimatedButton
                onClick={() => toggleLockMutation.mutate()}
                variant="outline"
                size="sm"
                className={`border-[#555555] text-xs font-bold ${
                  selectedRound.locked ? 'text-amber-400 border-amber-500' : 'text-emerald-400 border-emerald-500'
                }`}
              >
                {selectedRound.locked ? '🔒 UNLOCK RUBRIC' : '🔓 LOCK RUBRIC'}
              </AnimatedButton>

              {activeTab === 'criteria' && (
                <AnimatedButton onClick={openAddCriterionModal} variant="primary" size="sm" className="bg-[#FFFFFF] text-[#0E0E0E] font-extrabold hover:bg-[#D4D4D4]">
                  ADD NEW CRITERION
                </AnimatedButton>
              )}
            </div>
          </div>

          {/* TAB 1: CRITERIA MANAGEMENT */}
          {activeTab === 'criteria' && (
            <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl space-y-4 font-mono shadow-xl">
              <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-3">
                <div>
                  <h2 className="text-sm font-bold uppercase text-[#FFFFFF] tracking-wider">
                    {selectedRound.name} CRITERIA BREAKDOWN
                  </h2>
                  <p className="text-[11px] text-[#B3B3B3] font-sans mt-0.5">
                    DEFINED EVALUATION CRITERIA & MARKS ALLOCATION FOR {selectedRound.name}
                  </p>
                </div>
                <span className="text-xs font-mono text-[#FFFFFF] font-bold bg-[#2B2B2B] border border-[#555555] px-3 py-1 rounded">
                  TOTAL ROUND WEIGHT: {selectedRound.criteria?.reduce((sum: number, c: any) => sum + (c.maxMarks || 10), 0)} MARKS
                </span>
              </div>

              {!selectedRound.criteria || selectedRound.criteria.length === 0 ? (
                <div className="p-8 text-center text-[#B3B3B3] font-mono border border-dashed border-[#2B2B2B] rounded-2xl space-y-2 bg-[#0E0E0E]">
                  <Plus className="w-8 h-8 text-[#FFFFFF] mx-auto" />
                  <h3 className="text-xs font-bold text-[#FFFFFF]">NO CRITERIA CONFIGURED</h3>
                  <p className="text-[11px] text-[#B3B3B3]">CLICK "ADD NEW CRITERION" ABOVE TO POPULATE RUBRIC.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {selectedRound.criteria.map((c: any, index: number) => (
                    <div
                      key={c.id}
                      className="p-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-[#555555] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] font-mono font-bold flex items-center justify-center text-xs shrink-0">
                          #{c.sequence || index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-[#FFFFFF] font-mono">{c.name}</h4>
                            <span className="text-[9px] font-mono text-[#B3B3B3] bg-[#181818] border border-[#2B2B2B] px-2 py-0.5 rounded">
                              WEIGHT: {c.weight || 1.0}X
                            </span>
                          </div>
                          <p className="text-xs text-[#D4D4D4] font-sans mt-0.5">{c.description || 'No description provided.'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[#2B2B2B] pt-2 sm:pt-0">
                        <div className="text-right font-mono">
                          <span className="text-lg font-extrabold text-[#FFFFFF]">{c.maxMarks}</span>
                          <span className="text-[9px] text-[#B3B3B3] block uppercase font-bold">MAX MARKS</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditCriterionModal(c)}
                            className="p-2 bg-[#181818] hover:bg-[#2B2B2B] border border-[#2B2B2B] rounded-lg text-[#FFFFFF] transition-colors"
                            title="Edit Criterion"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCriterion(c)}
                            className="p-2 bg-[#181818] hover:bg-[#2B2B2B] border border-[#2B2B2B] rounded-lg text-[#B3B3B3] hover:text-[#FFFFFF] transition-colors"
                            title="Delete Criterion"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ROUND SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl space-y-4 font-mono shadow-xl">
              <h2 className="text-sm font-bold uppercase text-[#FFFFFF] tracking-wider border-b border-[#2B2B2B] pb-3">
                CONFIGURE {selectedRound.name} PARAMETERS
              </h2>

              <form onSubmit={handleSaveRoundSettings} className="space-y-4 max-w-xl font-mono text-xs">
                <div>
                  <label className="block text-[#B3B3B3] font-bold uppercase mb-1">ROUND NAME</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#B3B3B3] font-bold uppercase mb-1">DESCRIPTION</label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full p-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#B3B3B3] font-bold uppercase mb-1">REVIEW DURATION (MINUTES)</label>
                    <input
                      type="number"
                      min="1"
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      className="w-full h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[#B3B3B3] font-bold uppercase mb-1">WEIGHTING MULTIPLIER</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={editWeight}
                      onChange={(e) => setEditWeight(Number(e.target.value))}
                      className="w-full h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <AnimatedButton
                  type="submit"
                  disabled={updateRoundMutation.isPending}
                  variant="primary"
                  size="sm"
                  className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
                >
                  SAVE ROUND CONFIGURATION
                </AnimatedButton>
              </form>
            </div>
          )}

          {/* TAB 3: SIMULATOR PREVIEW */}
          {activeTab === 'preview' && (
            <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl space-y-5 font-mono shadow-xl">
              <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-3">
                <div>
                  <h2 className="text-sm font-bold uppercase text-[#FFFFFF] flex items-center gap-2 tracking-wider">
                    <Eye className="w-4 h-4 text-[#FFFFFF]" />
                    <span>LIVE JUDGE SCORECARD SIMULATOR ({selectedRound.name})</span>
                  </h2>
                  <p className="text-[11px] text-[#B3B3B3] font-sans mt-0.5">PREVIEW HOW JUDGES WILL EVALUATE TEAMS AND SCORE CRITERIA IN REAL TIME.</p>
                </div>
              </div>

              <div className="space-y-4 max-w-3xl">
                {selectedRound.criteria?.map((c: any) => {
                  const currentVal = previewScores[c.id] || 0;

                  return (
                    <div key={c.id} className="p-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-xs text-[#FFFFFF] font-mono block">{c.name}</span>
                          <span className="text-[11px] text-[#D4D4D4] font-sans block mt-0.5">{c.description}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-extrabold font-mono text-[#FFFFFF]">{currentVal}</span>
                          <span className="text-[10px] font-mono text-[#B3B3B3] block">/ {c.maxMarks} PTS</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handlePreviewScoreChange(c.id, currentVal - 1, c.maxMarks)}
                          className="w-8 h-8 rounded-lg bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] font-bold text-base flex items-center justify-center hover:bg-[#2B2B2B] transition-all"
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="0"
                          max={c.maxMarks}
                          step="1"
                          value={currentVal}
                          onChange={(e) => handlePreviewScoreChange(c.id, Number(e.target.value), c.maxMarks)}
                          className="flex-1 h-2 bg-[#181818] rounded appearance-none cursor-pointer accent-[#FFFFFF]"
                        />
                        <button
                          type="button"
                          onClick={() => handlePreviewScoreChange(c.id, currentVal + 1, c.maxMarks)}
                          className="w-8 h-8 rounded-lg bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] font-bold text-base flex items-center justify-center hover:bg-[#2B2B2B] transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="p-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl flex justify-between items-center font-mono">
                  <div>
                    <span className="font-bold text-xs text-[#FFFFFF] uppercase block">SIMULATED SCORE TOTAL</span>
                    <span className="text-[10px] text-[#B3B3B3]">LIVE COMPUTATION FEED</span>
                  </div>
                  <span className="text-lg font-extrabold text-[#FFFFFF] bg-[#181818] px-3 py-1 rounded-xl border border-[#555555]">
                    {Object.values(previewScores).reduce((a, b) => a + Math.round(Number(b || 0)), 0)} / {selectedRound.criteria?.reduce((sum: number, c: any) => sum + Math.round(Number(c.maxMarks || 10)), 0)} PTS
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT CRITERION MODAL */}
      <AnimatePresence>
        {isCriterionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0E0E]/85 backdrop-blur-md font-mono select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#181818] border border-[#2B2B2B] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl text-[#FFFFFF]"
            >
              <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-3">
                <h3 className="text-sm font-bold uppercase text-[#FFFFFF]">
                  {editingCriterion ? 'EDIT CRITERION' : `ADD CRITERION TO ${selectedRound?.name}`}
                </h3>
                <button
                  onClick={closeCriterionModal}
                  className="w-7 h-7 rounded border border-[#2B2B2B] bg-[#0E0E0E] text-[#B3B3B3] hover:text-white flex items-center justify-center text-xs font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCriterionSubmit} className="space-y-4 font-mono text-xs">
                <div>
                  <label className="block font-bold text-[#B3B3B3] uppercase mb-1">CRITERION NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Innovation & Problem Statement Alignment"
                    value={critName}
                    onChange={(e) => setCritName(e.target.value)}
                    className="w-full h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF] font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#B3B3B3] uppercase mb-1">DESCRIPTION / RUBRIC HINT</label>
                  <textarea
                    rows={2}
                    placeholder="Explain what judges should evaluate..."
                    value={critDesc}
                    onChange={(e) => setCritDesc(e.target.value)}
                    className="w-full p-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#B3B3B3] uppercase mb-1">MAX MARKS</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={critMax}
                      onChange={(e) => setCritMax(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#B3B3B3] uppercase mb-1">WEIGHT</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={critWeight}
                      onChange={(e) => setCritWeight(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] font-mono font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#B3B3B3] uppercase mb-1">ORDER SEQ</label>
                    <input
                      type="number"
                      min="1"
                      value={critSeq}
                      onChange={(e) => setCritSeq(Number(e.target.value))}
                      className="w-full h-10 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] font-mono font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <AnimatedButton type="button" onClick={closeCriterionModal} variant="outline" size="sm" className="border-[#2B2B2B] text-[#FFFFFF]">
                    CANCEL
                  </AnimatedButton>
                  <AnimatedButton
                    type="submit"
                    disabled={saveCriterionMutation.isPending}
                    variant="primary"
                    size="sm"
                    className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
                  >
                    SAVE CRITERION
                  </AnimatedButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default JudgingCriteria;
