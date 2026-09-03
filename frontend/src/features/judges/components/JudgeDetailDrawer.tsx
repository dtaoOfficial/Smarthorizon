import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Info,
  ListChecks,
  History,
  UserCheck,
  BarChart2,
  Activity,
  ArrowUp,
  ArrowDown,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../../shared/services/api';

interface JudgeDetailDrawerProps {
  judgeId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'overview' | 'assignments' | 'history' | 'queue' | 'availability' | 'activity' | 'statistics';

export const JudgeDetailDrawer: React.FC<JudgeDetailDrawerProps> = ({
  judgeId,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Fetch judge detail workspace
  const { data: judgesData } = useQuery({
    queryKey: ['judges-list'],
    queryFn: () => api.get('/judges'),
    enabled: !!judgeId && isOpen,
  });

  const judge = judgesData?.judges?.find((j: any) => j.id === judgeId);

  // Update Status Mutation
  const statusMutation = useMutation({
    mutationFn: (statusData: { status: string; currentTeamId?: string | null; nextTeamId?: string | null }) =>
      api.put(`/judges/${judgeId}/status`, statusData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judges-list'] });
    },
  });

  // Reorder Queue Mutation
  const reorderQueueMutation = useMutation({
    mutationFn: (orderedTeamIds: string[]) =>
      api.put(`/judges/${judgeId}/queue`, { orderedTeamIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judges-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-review-matrix'] });
    },
  });

  // Bulk Unassign Mutation
  const unassignMutation = useMutation({
    mutationFn: (teamId: string) =>
      api.post('/judges/unassign-teams', { judgeIds: [judgeId], teamIds: [teamId] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judges-list'] });
      queryClient.invalidateQueries({ queryKey: ['teams-directory'] });
    },
  });

  if (!isOpen || !judgeId) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4 text-[#1D4ED8]" /> },
    { id: 'assignments', label: 'Assignments', icon: <ListChecks className="w-4 h-4 text-[#1D4ED8]" /> },
    { id: 'queue', label: 'Current Queue', icon: <Activity className="w-4 h-4 text-[#1D4ED8]" /> },
    { id: 'history', label: 'Review History', icon: <History className="w-4 h-4 text-[#1D4ED8]" /> },
    { id: 'availability', label: 'Availability', icon: <UserCheck className="w-4 h-4 text-[#1D4ED8]" /> },
    { id: 'statistics', label: 'Statistics', icon: <BarChart2 className="w-4 h-4 text-[#1D4ED8]" /> },
  ];

  const handleMoveQueue = (index: number, direction: 'up' | 'down') => {
    if (!judge?.queue) return;
    const newQueue = [...judge.queue];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;

    if (targetIdx < 0 || targetIdx >= newQueue.length) return;

    // Swap
    const temp = newQueue[index];
    newQueue[index] = newQueue[targetIdx];
    newQueue[targetIdx] = temp;

    const orderedIds = newQueue.map(x => x.teamId);
    reorderQueueMutation.mutate(orderedIds);
  };

  const handleUnassign = (teamId: string) => {
    if (window.confirm('Are you sure you want to remove this team assignment?')) {
      unassignMutation.mutate(teamId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]';
      case 'Reviewing':
        return 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]';
      case 'Walking':
        return 'bg-[#181818] text-[#D4D4D4] border-[#2B2B2B]';
      case 'Break':
        return 'bg-[#181818] text-[#B3B3B3] border-[#555555]';
      case 'Offline':
        return 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B]';
      default:
        return 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B]';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden font-sans select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#0E0E0E]/80 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer box */}
      <div className="relative w-full max-w-2xl bg-[#181818] h-full shadow-2xl flex flex-col z-50 border-l border-[#2B2B2B] text-[#FFFFFF]">
        {/* Header */}
        <div className="p-6 border-b border-[#2B2B2B] flex justify-between items-center bg-[#0E0E0E]">
          <div>
            <div className="flex gap-2 items-center">
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border uppercase ${getStatusBadge(judge?.status || 'Offline')}`}>
                {judge?.status || 'Offline'}
              </span>
            </div>
            <h2 className="font-sans text-2xl font-extrabold text-[#FFFFFF] mt-2">
              {judge?.name || 'Judge Workspace'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#181818] border border-[#2B2B2B] text-[#B3B3B3] hover:text-[#FFFFFF] hover:bg-[#2B2B2B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="border-b border-[#2B2B2B] bg-[#0E0E0E] flex overflow-x-auto hide-scrollbar shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-mono font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'border-[#FFFFFF] text-[#FFFFFF] bg-[#181818]'
                  : 'border-transparent text-[#B3B3B3] hover:text-[#FFFFFF] hover:bg-[#2B2B2B]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 pb-48 sm:pb-60 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl">
                  <span className="text-[10px] font-mono text-[#B3B3B3] uppercase font-bold block">Assigned Tracks</span>
                  <span className="text-sm font-bold text-[#FFFFFF] block mt-1">
                    {judge?.assignedTracks?.map((t: any) => t.name).join(', ') || 'None'}
                  </span>
                </div>
                <div className="p-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl">
                  <span className="text-[10px] font-mono text-[#B3B3B3] uppercase font-bold block">Completed Reviews</span>
                  <span className="text-sm font-mono font-extrabold text-[#FFFFFF] block mt-1">
                    {judge?.completedReviewsCount || 0} Scorecards
                  </span>
                </div>
              </div>

              {/* Status Update Quick Controls */}
              <div className="space-y-3 p-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl">
                <h4 className="text-xs font-mono font-bold uppercase text-[#FFFFFF]">QUICK STATUS OVERRIDE</h4>
                <div className="flex flex-wrap gap-2">
                  {['Available', 'Reviewing', 'Walking', 'Break', 'Offline'].map((st) => (
                    <button
                      key={st}
                      onClick={() => statusMutation.mutate({ status: st })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                        judge?.status === st
                          ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                          : 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B] hover:bg-[#2B2B2B]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-[#FFFFFF]">ASSIGNED TEAMS ({judge?.assignedTeams?.length || 0})</h4>
              <div className="space-y-2">
                {(judge?.assignedTeams || []).map((team: any) => (
                  <div key={team.id} className="p-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-[#FFFFFF] block">{team.name} ({team.registrationId})</span>
                      <span className="text-[10px] font-mono text-[#B3B3B3]">Track: {team.trackName}</span>
                    </div>
                    <button
                      onClick={() => handleUnassign(team.id)}
                      className="p-1.5 text-[#B3B3B3] hover:text-[#FFFFFF] hover:bg-[#2B2B2B] rounded-lg transition-colors"
                      title="Unassign Team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase text-[#0B2545]">REORDER EVALUATION QUEUE</h4>
              <div className="space-y-2">
                {(judge?.queue || []).map((item: any, idx: number) => (
                  <div key={item.teamId} className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-[#0B2545]">#{idx + 1} {item.teamName}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveQueue(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 text-[#475569] hover:bg-[#E2E8F0] rounded disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveQueue(idx, 'down')}
                        disabled={idx === (judge?.queue?.length || 0) - 1}
                        className="p-1 text-[#475569] hover:bg-[#E2E8F0] rounded disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JudgeDetailDrawer;
