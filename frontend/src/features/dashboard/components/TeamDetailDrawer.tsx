import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info,
  Users,
  Code2,
  Gavel,
  QrCode,
  History,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { useAuth } from '../../../context/AuthContext';

interface TeamDetailDrawerProps {
  teamId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TeamDetailDrawer: React.FC<TeamDetailDrawerProps> = ({
  teamId,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'project' | 'reviews' | 'attendance' | 'timeline'>('overview');

  const { data: teamData, isLoading, error } = useQuery({
    queryKey: ['team-details', teamId],
    queryFn: () => (teamId ? api.get(`/teams/${teamId}`) : null),
    enabled: !!teamId && isOpen,
  });

  const team = teamData?.team || teamData;

  const toggleCheckInMutation = useMutation({
    mutationFn: (checkedIn: boolean) =>
      api.post(`/teams/${teamId}/checkin`, { checkedIn }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });
      queryClient.invalidateQueries({ queryKey: ['review-matrix'] });
    },
  });

  const toggleLockMutation = useMutation({
    mutationFn: (locked: boolean) =>
      api.post(`/teams/${teamId}/lock`, { locked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });
    },
  });

  if (!isOpen) return null;

  const tabs: { id: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
    { id: 'members', label: 'Roster Members', icon: <Users className="w-4 h-4" /> },
    { id: 'project', label: 'Project Deck & PDF', icon: <Code2 className="w-4 h-4" /> },
    { id: 'reviews', label: 'Reviews & Scorecard', icon: <Gavel className="w-4 h-4" /> },
    { id: 'attendance', label: 'Attendance Check-In', icon: <QrCode className="w-4 h-4" /> },
    { id: 'timeline', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
  ];

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'SUCCESS':
        return 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]';
      case 'PENDING':
        return 'bg-[#2B2B2B] text-[#D4D4D4] border-[#555555]';
      default:
        return 'bg-[#181818] text-[#B3B3B3] border-[#555555]';
    }
  };

  const timeline = team?.timeline || [
    { id: 1, title: 'Team Registered', timestamp: team?.createdAt || new Date().toISOString(), description: 'Registered in system' },
    ...(team?.checkInTime ? [{ id: 2, title: 'QR Check-In Verified', timestamp: team.checkInTime, description: 'Venue QR code scanned at desk' }] : []),
    ...(team?.pdfUploadedAt ? [{ id: 3, title: 'Domain PDF Synopsis Uploaded', timestamp: team.pdfUploadedAt, description: `Uploaded file: ${team.pdfFilename || 'Presentation.pdf'}` }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0E0E0E]/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Main Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative w-full max-w-3xl bg-[#181818] border-l border-[#2B2B2B] h-full shadow-2xl flex flex-col z-50 text-[#FFFFFF] select-none"
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-[#2B2B2B] flex justify-between items-center bg-[#0E0E0E]">
          <div>
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-[10px] font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] border border-[#555555] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                ID: {team?.registrationId || team?.id?.substring(0, 8).toUpperCase() || 'Loading...'}
              </span>
              {team && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase ${getPaymentBadge(team.paymentStatusFinal || 'PENDING')}`}>
                  Payment: {team.paymentStatusFinal || 'PENDING'}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold font-outfit text-[#FFFFFF] mt-2">
              {team?.name || 'Team Workspace'}
            </h2>
            <p className="text-xs font-mono text-[#B3B3B3] mt-0.5">
              College: {team?.collegeName || team?.college || 'N/A'} &bull; Domain: {team?.domain || team?.trackName || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#181818] hover:bg-[#2B2B2B] text-[#B3B3B3] hover:text-[#FFFFFF] transition-colors border border-[#2B2B2B]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="border-b border-[#2B2B2B] bg-[#181818] flex overflow-x-auto hide-scrollbar px-4 py-2 gap-1.5 font-mono text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-[#0E0E0E] font-extrabold bg-[#FFFFFF] shadow-sm'
                  : 'text-[#B3B3B3] hover:text-[#FFFFFF] hover:bg-[#2B2B2B]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 pb-48 sm:pb-60 space-y-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64 text-center font-mono">
              <div className="w-10 h-10 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-[#D4D4D4] animate-pulse">Loading workspace details...</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-[#181818] text-[#B3B3B3] border border-[#2B2B2B] rounded-xl flex items-center gap-3 font-mono">
              <AlertCircle className="w-5 h-5 text-[#555555] shrink-0" />
              <span className="text-xs">Failed to load team workspace. Please refresh.</span>
            </div>
          )}

          {!isLoading && team && (
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 text-left font-sans"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                    <div className="bg-[#0E0E0E] p-4 border border-[#2B2B2B] rounded-2xl">
                      <span className="block text-[10px] text-[#B3B3B3] uppercase font-bold">Registration ID</span>
                      <span className="text-sm font-bold text-[#FFFFFF] block mt-1">{team.registrationId || 'N/A'}</span>
                    </div>

                    <div className="bg-[#0E0E0E] p-4 border border-[#2B2B2B] rounded-2xl">
                      <span className="block text-[10px] text-[#B3B3B3] uppercase font-bold">College / Institution</span>
                      <span className="text-sm font-bold text-[#FFFFFF] block mt-1">{team.collegeName || team.college || 'N/A'}</span>
                    </div>

                    <div className="bg-[#0E0E0E] p-4 border border-[#2B2B2B] rounded-2xl">
                      <span className="block text-[10px] text-[#B3B3B3] uppercase font-bold">Track / Domain</span>
                      <span className="text-sm font-bold text-[#FFFFFF] block mt-1">{team.domain || team.trackName || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                    <div className="bg-[#0E0E0E] p-4 border border-[#2B2B2B] rounded-2xl">
                      <span className="block text-[10px] text-[#B3B3B3] uppercase font-bold">Problem Statement ID</span>
                      <span className="text-sm font-bold text-[#D4D4D4] block mt-1">{team.selectedPsId || team.problemStatement || 'N/A'}</span>
                    </div>

                    <div className="bg-[#0E0E0E] p-4 border border-[#2B2B2B] rounded-2xl">
                      <span className="block text-[10px] text-[#B3B3B3] uppercase font-bold">Assigned Mentor</span>
                      <span className="text-sm font-bold text-[#FFFFFF] block mt-1">{team.mentorName1 || 'Unassigned'}</span>
                    </div>

                    <div className="bg-[#0E0E0E] p-4 border border-[#2B2B2B] rounded-2xl">
                      <span className="block text-[10px] text-[#B3B3B3] uppercase font-bold">Payment Status</span>
                      <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-mono font-bold border uppercase ${getPaymentBadge(team.paymentStatusFinal)}`}>
                        {team.paymentStatusFinal || 'PENDING'}
                      </span>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  <div className="bg-[#0E0E0E] p-5 border border-[#2B2B2B] rounded-2xl space-y-4 font-mono">
                    <h3 className="text-sm font-bold font-outfit text-[#FFFFFF] border-b border-[#2B2B2B] pb-2">Workspace & Check-In Controls</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-[#2B2B2B]">
                        <div>
                          <span className="font-bold text-xs text-[#FFFFFF] block">Registration Check-In Status</span>
                          <span className="text-[11px] text-[#B3B3B3]">Current status: {team.checkedIn ? 'Checked In' : 'Pending'}</span>
                        </div>
                        {(user?.role === 'ADMINISTRATOR' || user?.role === 'CHECK_IN_ADMIN') ? (
                          <AnimatedButton
                            onClick={() => toggleCheckInMutation.mutate(!team.checkedIn)}
                            variant={team.checkedIn ? 'outline' : 'primary'}
                            size="sm"
                            className={team.checkedIn ? 'bg-[#181818] text-[#B3B3B3] border-[#555555]' : 'bg-[#FFFFFF] text-[#0E0E0E] font-bold'}
                          >
                            {team.checkedIn ? 'Reset Check-In' : 'Mark Checked In'}
                          </AnimatedButton>
                        ) : (
                          <span className="font-mono text-xs font-bold text-[#FFFFFF]">{team.checkedIn ? 'Checked In' : 'Pending'}</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center py-2">
                        <div>
                          <span className="font-bold text-xs text-[#FFFFFF] block">Project Submission Lock</span>
                          <span className="text-[11px] text-[#B3B3B3]">Lock edit permissions</span>
                        </div>
                        {(user?.role === 'ADMINISTRATOR' || user?.role === 'CHECK_IN_ADMIN') ? (
                          <AnimatedButton
                            onClick={() => toggleLockMutation.mutate(!team.locked)}
                            variant="secondary"
                            size="sm"
                            className="border-[#2B2B2B] text-[#FFFFFF]"
                          >
                            {team.locked ? 'Unlock Workspace' : 'Lock Workspace'}
                          </AnimatedButton>
                        ) : (
                          <span className="font-mono text-xs font-bold text-[#B3B3B3]">{team.locked ? 'Locked' : 'Unlocked'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'members' && (
                <motion.div
                  key="members"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 text-left font-sans"
                >
                  {/* Lead Section */}
                  <div className="space-y-3 font-mono">
                    <h3 className="text-xs font-mono font-bold uppercase text-[#FFFFFF] tracking-wider">Team Lead (Primary Contact)</h3>
                    <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-4 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm text-[#FFFFFF]">{team.leadName || 'N/A'}</span>
                        <span className="text-[10px] font-mono font-bold bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] px-2.5 py-0.5 rounded-full uppercase">LEAD</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs text-[#B3B3B3] pt-1 border-t border-[#2B2B2B]">
                        <div><strong className="text-[#FFFFFF]">Email:</strong> {team.leadEmail || 'N/A'}</div>
                        <div><strong className="text-[#FFFFFF]">Mobile:</strong> {team.leadMobile || 'N/A'}</div>
                        <div><strong className="text-[#FFFFFF]">USN:</strong> {team.leadUsn || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Members 2 through 5 */}
                  <div className="space-y-3 font-mono">
                    <h3 className="text-xs font-mono font-bold uppercase text-[#B3B3B3] tracking-wider">Roster Members</h3>
                    <div className="space-y-3">
                      {[
                        { title: 'Member 2', name: team.member2Name, email: team.member2Email, mobile: team.member2Mobile, usn: team.member2Usn },
                        { title: 'Member 3', name: team.member3Name, email: team.member3Email, mobile: team.member3Mobile, usn: team.member3Usn },
                        { title: 'Member 4', name: team.member4Name, email: team.member4Email, mobile: team.member4Mobile, usn: team.member4Usn },
                        { title: 'Member 5', name: team.member5Name, email: team.member5Email, mobile: team.member5Mobile, usn: team.member5Usn },
                      ].map((m, idx) => (
                        <div key={idx} className="bg-[#0E0E0E] border border-[#2B2B2B] p-4 rounded-2xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-[#FFFFFF]">{m.name || `${m.title}: Unassigned`}</span>
                            <span className="text-[10px] font-mono text-[#B3B3B3] uppercase">{m.title}</span>
                          </div>
                          {m.name && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-[#B3B3B3] pt-1 border-t border-[#2B2B2B]">
                              <div><strong className="text-[#FFFFFF]">Email:</strong> {m.email || 'N/A'}</div>
                              <div><strong className="text-[#FFFFFF]">Mobile:</strong> {m.mobile || 'N/A'}</div>
                              <div><strong className="text-[#FFFFFF]">USN:</strong> {m.usn || 'N/A'}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'project' && (
                <motion.div
                  key="project"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 text-left font-sans"
                >
                  <div className="bg-[#0E0E0E] p-5 border border-[#2B2B2B] rounded-2xl space-y-3 font-mono">
                    <span className="text-[10px] font-mono uppercase text-[#FFFFFF] font-bold">Selected Problem Statement ID</span>
                    <h3 className="text-xl font-bold font-outfit text-[#FFFFFF]">{team.selectedPsId || team.problemStatement || 'N/A'}</h3>
                    <p className="text-xs text-[#D4D4D4] leading-relaxed font-sans">{team.problemStatement || 'No description provided.'}</p>
                  </div>

                  <div className="bg-[#0E0E0E] p-5 border border-[#2B2B2B] rounded-2xl space-y-3 font-mono">
                    <span className="text-[10px] font-mono uppercase text-[#B3B3B3] font-bold">Assigned Mentor</span>
                    <p className="text-sm font-bold text-[#FFFFFF]">{team.mentorName1 || 'Unassigned'}</p>
                  </div>

                  {/* Domain PDF Submission Upload */}
                  <div className="bg-[#0E0E0E] p-5 border border-[#2B2B2B] rounded-2xl space-y-4 font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase text-[#FFFFFF] font-bold">Domain PDF Presentation / Synopsis</span>
                      {team.pdfUrl && (
                        <span className="text-[10px] font-mono font-bold bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] px-2 py-0.5 rounded-full">
                          Uploaded
                        </span>
                      )}
                    </div>

                    {team.pdfUrl ? (
                      <div className="p-4 bg-[#181818] border border-[#2B2B2B] rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-[#FFFFFF]" />
                          <div>
                            <span className="font-bold text-xs text-[#FFFFFF] block">{team.pdfFilename || 'Project_Submission.pdf'}</span>
                            <span className="text-[10px] font-mono text-[#B3B3B3]">
                              Uploaded: {team.pdfUploadedAt ? new Date(team.pdfUploadedAt).toLocaleString() : 'Recently'}
                            </span>
                          </div>
                        </div>
                        <a
                          href={team.pdfUrl.startsWith('http') ? team.pdfUrl : `${(import.meta as any).env?.VITE_API_URL || ''}${team.pdfUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] text-[#0E0E0E] text-xs font-mono font-bold hover:bg-[#D4D4D4]"
                        >
                          View PDF
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-[#B3B3B3]">No PDF submission document uploaded yet for this team.</p>
                    )}
                  </div>

                  <div className="bg-[#0E0E0E] p-5 border border-[#2B2B2B] rounded-2xl space-y-3 font-mono">
                    <span className="text-[10px] font-mono uppercase text-[#B3B3B3] font-bold">Project Details</span>
                    <h4 className="text-lg font-bold font-outfit text-[#FFFFFF]">{team.projectTitle || 'Untitled Project'}</h4>
                    <p className="text-xs text-[#D4D4D4] leading-relaxed font-sans">{team.projectDesc || 'No description submitted yet.'}</p>
                    {team.techStack && (
                      <p className="text-xs font-mono text-[#FFFFFF] font-semibold pt-1">Tech Stack: {team.techStack}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 text-left font-mono"
                >
                  {/* Round Averages & Final Score Summary */}
                  {team.roundAverages && (
                    <div className="bg-[#0E0E0E] p-5 border border-[#2B2B2B] rounded-2xl space-y-4 shadow-xl">
                      <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-3">
                        <div>
                          <h4 className="text-sm font-bold font-outfit text-[#FFFFFF]">Evaluation Score Summary</h4>
                          <p className="text-[11px] text-[#B3B3B3] font-mono">Scores averaged per round from all visiting judges</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono text-[#FFFFFF] uppercase font-bold block">Final Overall Score</span>
                          <span className="text-2xl font-mono font-black text-[#FFFFFF]">{team.finalScore ?? 0}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {team.roundAverages.map((ra: any) => (
                          <div key={ra.roundId} className="p-3 bg-[#181818] border border-[#2B2B2B] rounded-xl text-center">
                            <span className="text-[10px] font-mono text-[#B3B3B3] font-bold uppercase block truncate">{ra.roundName}</span>
                            <span className="text-lg font-mono font-bold text-[#FFFFFF] block my-1">
                              {ra.averageScore !== null ? `${ra.averageScore}` : '—'}
                            </span>
                            <span className="text-[9px] font-mono text-[#B3B3B3] block">
                              {ra.judgeCount > 0 ? `${ra.judgeCount} judge${ra.judgeCount > 1 ? 's' : ''}` : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {team.reviews.length === 0 ? (
                    <div className="p-8 border border-dashed border-[#2B2B2B] rounded-2xl text-center text-[#B3B3B3] font-mono font-bold text-xs bg-[#0E0E0E]">
                      No evaluation reviews logged yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h5 className="text-xs font-mono font-extrabold text-[#FFFFFF] uppercase tracking-wider">All Judge Submissions</h5>
                      {team.reviews.map((rev: any) => (
                        <div key={rev.id} className="bg-[#0E0E0E] p-4 border border-[#2B2B2B] rounded-2xl space-y-2">
                          <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-2">
                            <span className="font-bold text-sm text-[#FFFFFF]">{rev.roundName}</span>
                            <span className="text-xs font-mono text-[#FFFFFF] font-bold">
                              {rev.totalScore !== undefined ? `${rev.totalScore}/${rev.totalMaxMarks} pts` : rev.progressLabel}
                            </span>
                          </div>
                          {rev.comments && (
                            <p className="text-xs text-[#D4D4D4] italic pt-1 font-medium font-sans">"{rev.comments}"</p>
                          )}
                          <div className="flex justify-between items-center text-[10px] font-mono text-[#FFFFFF] font-bold pt-2">
                            <span>Judge: {rev.judgeName}</span>
                            <span>Status: {rev.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'attendance' && (
                <motion.div
                  key="attendance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 text-left font-mono"
                >
                  <div className="bg-[#0E0E0E] p-5 border border-[#2B2B2B] rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-[#FFFFFF] uppercase">Check-In Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase border ${
                        team.checkedIn ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]' : 'bg-[#2B2B2B] text-[#B3B3B3] border-[#555555]'
                      }`}>
                        {team.checkedIn ? 'Checked In' : 'Pending'}
                      </span>
                    </div>
                    {team.checkInTime && (
                      <p className="text-xs font-mono text-[#B3B3B3]">
                        Check-in Timestamp: {new Date(team.checkInTime).toLocaleString()}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 text-left font-mono"
                >
                  <div className="border-l-2 border-[#2B2B2B] space-y-4 pl-4 ml-2">
                    {timeline.map((event: any) => (
                      <div key={event.id} className="relative space-y-1">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#FFFFFF] border border-[#0E0E0E]" />
                        <span className="text-[10px] text-[#B3B3B3]">{new Date(event.timestamp).toLocaleString()}</span>
                        <h4 className="text-xs font-bold text-[#FFFFFF]">{event.title}</h4>
                        <p className="text-[11px] text-[#D4D4D4] font-sans">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TeamDetailDrawer;
