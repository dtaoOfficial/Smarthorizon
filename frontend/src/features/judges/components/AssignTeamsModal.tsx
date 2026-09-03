import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { Track } from '../../../context/TrackContext';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { useTheme } from '../../../context/ThemeContext';

interface AssignTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedJudgeIds?: string[];
  selectedTeamIds?: string[];
  tracks?: Track[];
}

export const AssignTeamsModal: React.FC<AssignTeamsModalProps> = ({
  isOpen,
  onClose,
  selectedJudgeIds: initialJudgeIds = [],
  selectedTeamIds: initialTeamIds = [],
  tracks = [],
}) => {
  const queryClient = useQueryClient();
  const { isLight } = useTheme();

  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [judgeSearch, setJudgeSearch] = useState<string>('');
  const [teamSearch, setTeamSearch] = useState<string>('');

  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>(initialJudgeIds);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(initialTeamIds);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ count: number; judgeCount: number; teamCount: number } | null>(null);

  // Sync initial props when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedJudgeIds(initialJudgeIds);
      setSelectedTeamIds(initialTeamIds);
      setSuccessResult(null);
      setErrorMessage(null);
      setJudgeSearch('');
      setTeamSearch('');
    }
  }, [isOpen]);

  // 1. QUERY REAL JUDGES FROM DATABASE
  const { data: judgesData, isLoading: isJudgesLoading } = useQuery({
    queryKey: ['judges-list'],
    queryFn: () => api.get('/judges'),
    enabled: isOpen,
  });

  // 2. QUERY REAL TEAMS FROM DATABASE
  const { data: teamsData, isLoading: isTeamsLoading } = useQuery({
    queryKey: ['teams-directory-assign', selectedTrackId],
    queryFn: () => api.get(selectedTrackId ? `/teams?trackId=${selectedTrackId}` : '/teams'),
    enabled: isOpen,
  });

  const judgesList = useMemo(() => {
    const raw = judgesData?.judges || [];
    if (!judgeSearch.trim()) return raw;
    const q = judgeSearch.toLowerCase();
    return raw.filter((j: any) =>
      j.name.toLowerCase().includes(q) ||
      j.email.toLowerCase().includes(q)
    );
  }, [judgesData, judgeSearch]);

  const teamsList = useMemo(() => {
    const raw = teamsData?.teams || [];
    if (!teamSearch.trim()) return raw;
    const q = teamSearch.toLowerCase();
    return raw.filter((t: any) =>
      t.name.toLowerCase().includes(q) ||
      (t.registrationId && t.registrationId.toLowerCase().includes(q)) ||
      (t.trackName && t.trackName.toLowerCase().includes(q))
    );
  }, [teamsData, teamSearch]);

  const [assignMode, setAssignMode] = useState<'OVERWRITE' | 'ADD' | 'UNASSIGN'>('OVERWRITE');

  // Bulk Assign Mutation
  const assignMutation = useMutation({
    mutationFn: (payload: { judgeIds: string[]; teamIds: string[]; trackId?: string; mode?: string }) =>
      api.post('/judges/assign-teams', payload),
    onSuccess: (res: any) => {
      setSuccessResult({
        count: res.assignedCount || res.count || selectedTeamIds.length * selectedJudgeIds.length,
        judgeCount: selectedJudgeIds.length,
        teamCount: selectedTeamIds.length,
      });
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['judges-list'] });
      queryClient.invalidateQueries({ queryKey: ['teams-directory-assign'] });
      queryClient.invalidateQueries({ queryKey: ['open-judge-pool'] });
      queryClient.invalidateQueries({ queryKey: ['judge-assignments'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to complete assignment.');
    },
  });

  if (!isOpen) return null;

  const handleConfirmAssignment = () => {
    if (selectedJudgeIds.length === 0) {
      setErrorMessage('Please select at least one Judge.');
      return;
    }
    if (selectedTeamIds.length === 0) {
      setErrorMessage('Please select at least one Team.');
      return;
    }

    setErrorMessage(null);
    assignMutation.mutate({
      judgeIds: selectedJudgeIds,
      teamIds: selectedTeamIds,
      trackId: selectedTrackId || undefined,
      mode: assignMode,
    });
  };

  const handleToggleJudge = (id: string) => {
    setSelectedJudgeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleTeam = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllJudges = () => {
    if (selectedJudgeIds.length === judgesList.length) {
      setSelectedJudgeIds([]);
    } else {
      setSelectedJudgeIds(judgesList.map((j: any) => j.id));
    }
  };

  const handleSelectAllTeams = () => {
    if (selectedTeamIds.length === teamsList.length) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(teamsList.map((t: any) => t.id));
    }
  };

  const getButtonText = () => {
    if (assignMutation.isPending) return 'ASSIGNING TEAMS...';
    if (selectedJudgeIds.length === 1 && selectedTeamIds.length === 1) {
      return 'CONFIRM TEAM ASSIGNMENT';
    }
    if (selectedJudgeIds.length === 1) {
      return `CONFIRM ASSIGNMENT (1 JUDGE → ${selectedTeamIds.length} TEAMS)`;
    }
    if (selectedTeamIds.length === 1) {
      return `CONFIRM ASSIGNMENT (${selectedJudgeIds.length} JUDGES → 1 TEAM)`;
    }
    return `CONFIRM TEAM ASSIGNMENTS (${selectedJudgeIds.length} JUDGES → ${selectedTeamIds.length} TEAMS)`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans select-none">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0B2545]/80 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative w-full max-w-4xl bg-[#181818] border border-[#2B2B2B] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] text-[#FFFFFF]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#2B2B2B] bg-[#0E0E0E] flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] border border-[#555555] px-2.5 py-0.5 rounded-full uppercase">
                ADMINISTRATION &bull; JUDGE ALLOCATION
              </span>
            </div>
            <h2 className="text-xl font-bold font-mono text-[#FFFFFF] mt-1 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#FFFFFF]" />
              <span>ASSIGN JUDGES TO TEAMS</span>
            </h2>
            <p className="text-xs text-[#B3B3B3]">Select target judge(s) and team(s) to establish evaluation assignments.</p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#2B2B2B] bg-[#181818] text-[#B3B3B3] hover:text-[#FFFFFF] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 font-sans">
          {successResult ? (
            <div className="p-8 text-center space-y-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-2xl">
              <CheckCircle2 className="w-12 h-12 text-[#FFFFFF] mx-auto animate-bounce" />
              <div>
                <h3 className="text-xl font-extrabold text-[#FFFFFF]">✓ Team Assignments Confirmed!</h3>
                <p className="text-xs font-mono text-[#B3B3B3] mt-1">
                  Successfully linked {successResult.judgeCount} Judge(s) to {successResult.teamCount} Team(s) ({successResult.count} total assignment records).
                </p>
              </div>
              <div className="pt-2">
                <AnimatedButton onClick={onClose} variant="primary" size="md" className="bg-[#FFFFFF] text-[#0E0E0E] font-extrabold">
                  Close &amp; Return
                </AnimatedButton>
              </div>
            </div>
          ) : (
            <>
              {/* Assignment Mode Selector */}
              <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                <span className="font-bold text-[#FFFFFF] uppercase">ASSIGNMENT OPERATION MODE:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignMode('OVERWRITE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-extrabold transition-all border ${
                      assignMode === 'OVERWRITE'
                        ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF] shadow-sm'
                        : 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B] hover:bg-[#2B2B2B]'
                    }`}
                  >
                    Set Exact Roster (Replace)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode('ADD')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-extrabold transition-all border ${
                      assignMode === 'ADD'
                        ? 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555] shadow-sm'
                        : 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B] hover:bg-[#2B2B2B]'
                    }`}
                  >
                    Append (Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode('UNASSIGN')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-extrabold transition-all border ${
                      assignMode === 'UNASSIGN'
                        ? 'bg-[#181818] text-[#B3B3B3] border-[#555555] shadow-sm'
                        : 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B] hover:bg-[#2B2B2B]'
                    }`}
                  >
                    Unassign Selected
                  </button>
                </div>
              </div>

              {/* Selection Split Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Column 1: Select Judges */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono font-bold uppercase text-[#FFFFFF]">
                      1. SELECT JUDGES ({selectedJudgeIds.length} SELECTED)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllJudges}
                      className="text-[11px] font-mono text-[#FFFFFF] hover:underline font-bold"
                    >
                      {selectedJudgeIds.length === judgesList.length && judgesList.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#B3B3B3] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search judges..."
                      value={judgeSearch}
                      onChange={(e) => setJudgeSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs font-mono text-[#FFFFFF] focus:outline-none"
                    />
                  </div>

                  <div className="border border-[#2B2B2B] rounded-xl p-2 max-h-60 overflow-y-auto space-y-1 bg-[#0E0E0E]">
                    {isJudgesLoading ? (
                      <div className="p-4 text-center text-xs font-mono text-[#B3B3B3]">Loading judges...</div>
                    ) : (
                      judgesList.map((j: any) => {
                        const isChecked = selectedJudgeIds.includes(j.id);
                        return (
                          <div
                            key={j.id}
                            onClick={() => handleToggleJudge(j.id)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChecked ? 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]' : 'bg-[#181818] text-[#D4D4D4] border-[#2B2B2B] hover:bg-[#2B2B2B]/60'
                            }`}
                          >
                            <div>
                              <span className="font-bold block">{j.name}</span>
                              <span className={`text-[10px] font-mono ${isChecked ? 'text-[#D4D4D4]' : 'text-[#B3B3B3]'}`}>{j.email}</span>
                            </div>
                            {isChecked && <Check className="w-4 h-4 text-[#FFFFFF]" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Column 2: Select Teams */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono font-bold uppercase text-[#FFFFFF]">
                      2. SELECT TEAMS ({selectedTeamIds.length} SELECTED)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllTeams}
                      className="text-[11px] font-mono text-[#FFFFFF] hover:underline font-bold"
                    >
                      {selectedTeamIds.length === teamsList.length && teamsList.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#B3B3B3] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search teams..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs font-mono text-[#FFFFFF] focus:outline-none"
                    />
                  </div>

                  <div className="border border-[#2B2B2B] rounded-xl p-2 max-h-60 overflow-y-auto space-y-1 bg-[#0E0E0E]">
                    {isTeamsLoading ? (
                      <div className="p-4 text-center text-xs font-mono text-[#B3B3B3]">Loading teams...</div>
                    ) : (
                      teamsList.map((t: any) => {
                        const isChecked = selectedTeamIds.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleToggleTeam(t.id)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isChecked ? 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]' : 'bg-[#181818] text-[#D4D4D4] border-[#2B2B2B] hover:bg-[#2B2B2B]/60'
                            }`}
                          >
                            <div>
                              <span className="font-bold block">{t.name} ({t.registrationId})</span>
                              <span className={`text-[10px] font-mono ${isChecked ? 'text-[#D4D4D4]' : 'text-[#B3B3B3]'}`}>{t.trackName}</span>
                            </div>
                            {isChecked && <Check className="w-4 h-4 text-[#FFFFFF]" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!successResult && (
          <div className="p-4 border-t border-[#2B2B2B] bg-[#0E0E0E] flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs font-mono text-[#FFFFFF] font-bold">
              {selectedJudgeIds.length > 0 && selectedTeamIds.length > 0 ? (
                <span className="bg-[#181818] border border-[#555555] text-[#FFFFFF] px-3 py-1 rounded-md">
                  Target: {selectedJudgeIds.length} Judge(s) &rarr; {selectedTeamIds.length} Team(s)
                </span>
              ) : (
                <span className="text-[#B3B3B3]">Select at least 1 judge and 1 team</span>
              )}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#2B2B2B] text-[#FFFFFF] font-mono font-extrabold text-xs hover:bg-[#2B2B2B]"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmAssignment}
                disabled={assignMutation.isPending || selectedJudgeIds.length === 0 || selectedTeamIds.length === 0}
                className="px-5 py-2 rounded-xl bg-[#FFFFFF] text-[#0E0E0E] font-mono font-extrabold text-xs hover:bg-[#D4D4D4] disabled:opacity-50 shadow-sm"
              >
                {getButtonText()}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AssignTeamsModal;
