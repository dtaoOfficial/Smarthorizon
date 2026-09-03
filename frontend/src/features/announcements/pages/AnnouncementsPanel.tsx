import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Clock,
  Code2,
  Utensils,
  MapPin,
  AlertTriangle,
  Pin,
  Trash2,
  Edit,
  Check,
  Send,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useTrack } from '../../../context/TrackContext';

export const AnnouncementsPanel: React.FC = () => {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const { tracks } = useTrack();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMINISTRATOR' || user?.role === 'CHECK_IN_ADMIN';
  const isJudge = user?.role === 'JUDGE';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'GENERAL' | 'SCHEDULE' | 'TECHNICAL' | 'FOOD' | 'VENUE' | 'EMERGENCY'>('GENERAL');
  const [priority, setPriority] = useState<'INFO' | 'IMPORTANT' | 'CRITICAL'>('INFO');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'TRACK' | 'TEAMS'>('ALL');
  const [targetTrackId, setTargetTrackId] = useState<string>('');
  const [targetTeamIds, setTargetTeamIds] = useState<string[]>([]);
  const [searchTeamText, setSearchTeamText] = useState('');
  const [requireAck, setRequireAck] = useState(false);
  const [pinned, setPinned] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch announcements feed
  const { data: annData, isLoading } = useQuery({
    queryKey: ['announcements-feed'],
    queryFn: () => api.get('/announcements'),
    refetchInterval: 15000,
  });

  const announcements: any[] = annData?.announcements || [];

  // Fetch teams list for targeted team selection (Admin)
  const { data: teamsData } = useQuery({
    queryKey: ['teams-list-announcements'],
    queryFn: () => api.get('/teams'),
    enabled: isAdmin && targetAudience === 'TEAMS',
  });

  const teamsList: any[] = teamsData?.teams || [];

  const [editingAnn, setEditingAnn] = useState<any | null>(null);

  // Publish Announcement Mutation
  const publishMutation = useMutation({
    mutationFn: (newAnn: any) => api.post('/announcements', newAnn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-feed'] });
      setTitle('');
      setContent('');
      setTargetTeamIds([]);
      setSuccessMsg('Announcement published successfully to target audience!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      const detailMsg = err.details ? Object.values(err.details).flat().join(', ') : err.message;
      setErrorMsg(detailMsg || 'Failed to publish announcement.');
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  // Edit Announcement Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.put(`/announcements/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-feed'] });
      setEditingAnn(null);
      setSuccessMsg('Announcement updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      const detailMsg = err.details ? Object.values(err.details).flat().join(', ') : err.message;
      setErrorMsg(detailMsg || 'Failed to update announcement.');
      setTimeout(() => setErrorMsg(null), 5000);
    },
  });

  // Unsend Announcement Mutation
  const unsendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/unsend`, {}),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['announcements-feed'] });
      setSuccessMsg(res.message || 'Announcement unsent and retracted!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to unsend announcement.');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  // Send / Publish Draft Mutation
  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/send`, {}),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['announcements-feed'] });
      setSuccessMsg(res.message || 'Announcement sent to participants!');
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to send announcement.');
      setTimeout(() => setErrorMsg(null), 4000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Please fill out both subject and content.');
      return;
    }
    if (targetAudience === 'TRACK' && !targetTrackId) {
      alert('Please select a target domain track.');
      return;
    }
    if (targetAudience === 'TEAMS' && targetTeamIds.length === 0) {
      alert('Please select at least one target team.');
      return;
    }

    publishMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      targetAudience: targetAudience === 'ALL' ? 'EVERYONE' : targetAudience,
      trackId: targetAudience === 'TRACK' ? targetTrackId : null,
      targetTeamIds: targetAudience === 'TEAMS' ? targetTeamIds : [],
      pinned,
      status: 'PUBLISHED',
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/announcements/${id}`);
      queryClient.invalidateQueries({ queryKey: ['announcements-feed'] });
    } catch (err: any) {
      alert('Delete failed: ' + (err.message || 'Error'));
    }
  };

  const toggleSelectTeam = (teamId: string) => {
    setTargetTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const getCategoryIcon = (cat: string) => {
    const iconClass = isLight ? 'w-4 h-4 text-[#1687D9]' : 'w-4 h-4 text-[#FFFFFF]';
    switch (cat) {
      case 'SCHEDULE':
        return <Clock className={iconClass} />;
      case 'TECHNICAL':
        return <Code2 className={iconClass} />;
      case 'FOOD':
        return <Utensils className={iconClass} />;
      case 'VENUE':
        return <MapPin className={iconClass} />;
      case 'EMERGENCY':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <Megaphone className={iconClass} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 text-left select-none max-w-[1600px] mx-auto font-sans transition-colors duration-300 ${
        isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
      }`}
    >
      {/* ANNOUNCEMENTS HEADER */}
      <div className={`p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono border ${
        isJudge
          ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
          : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#1687D9] animate-pulse" />
            <span className={`font-bold tracking-wider ${isLight ? 'text-[#0B63B6]' : 'text-[#FFFFFF]'}`}>
              SYS // BROADCAST & BULLETINS DESK
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold font-outfit tracking-tight ${
            isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
          }`}>
            ANNOUNCEMENTS <span className={isLight ? 'text-[#1687D9]' : 'text-[#D4D4D4]'}>//</span> TARGETED BULLETINS
          </h1>
          <p className={`text-xs mt-0.5 font-mono ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
            REAL-TIME BROADCASTS, DOMAIN TRACK BULLETINS & TEAM DIRECT TELEMETRY
          </p>
        </div>
      </div>

      {successMsg && (
        <div className={`p-4 rounded-2xl text-xs font-mono font-bold flex gap-2 items-center border ${
          isJudge
            ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]'
            : 'bg-[#2B2B2B] border-[#555555] text-[#FFFFFF]'
        }`}>
          <Check className="w-4 h-4 text-[#047857]" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-mono font-bold flex gap-2 items-center">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Announcements Feed (8 cols on lg or full grid if not admin) */}
        <div className={`${isAdmin ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          {isLoading ? (
            <div className={`flex flex-col items-center justify-center p-16 rounded-2xl min-h-[300px] text-center font-mono border ${
              isJudge
                ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
                : 'bg-[#181818] border-[#2B2B2B]'
            }`}>
              <div className={`w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-3 ${
                isLight ? 'border-[#1687D9]' : 'border-[#FFFFFF]'
              }`} />
              <p className={`text-xs animate-pulse ${isLight ? 'text-[#52677D]' : 'text-[#D4D4D4]'}`}>SYNCING ANNOUNCEMENT FEED...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className={`p-12 text-center font-mono space-y-2 rounded-2xl border ${
              isJudge
                ? 'bg-white border-[#C8DCEB] text-[#52677D] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
                : 'bg-[#181818] border-[#2B2B2B] text-[#B3B3B3]'
            }`}>
              <Megaphone className={`w-10 h-10 mx-auto ${isLight ? 'text-[#1687D9]' : 'text-[#B3B3B3]'}`} />
              <p className="text-xs">NO BROADCAST ANNOUNCEMENTS PUBLISHED YET.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div key={a.id} className={`p-5 rounded-2xl space-y-3 border transition-colors ${
                  isJudge
                    ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
                    : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isJudge
                          ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1687D9]'
                          : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
                      }`}>
                        {getCategoryIcon(a.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
                          {a.pinned && (
                            <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded border ${
                              isJudge
                                ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                                : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
                            }`}>
                              <Pin className={`w-3 h-3 ${isLight ? 'text-[#1687D9]' : 'text-[#FFFFFF]'}`} /> PINNED
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded font-bold uppercase border ${
                              a.priority === 'CRITICAL'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : a.priority === 'IMPORTANT'
                                ? isJudge
                                  ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                                  : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
                                : isJudge
                                  ? 'bg-[#F5FAFE] text-[#52677D] border-[#C8DCEB]'
                                  : 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B]'
                            }`}
                          >
                            {a.priority}
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${
                            isJudge
                              ? 'bg-[#F5FAFE] text-[#0B2340] border-[#C8DCEB]'
                              : 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B]'
                          }`}>
                            {a.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded border ${
                            isJudge
                              ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                              : 'bg-[#2B2B2B] text-[#D4D4D4] border-[#555555]'
                          }`}>
                            AUDIENCE: {a.targetAudience}
                          </span>
                        </div>
                        <h3 className={`text-lg font-bold font-outfit mt-1 ${
                          isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
                        }`}>{a.title}</h3>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border uppercase mr-1 ${
                          a.status === 'PUBLISHED'
                            ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {a.status || 'PUBLISHED'}
                        </span>

                        <button
                          onClick={() => setEditingAnn(a)}
                          className="p-1.5 rounded text-[#1687D9] hover:bg-[#EFF6FF] transition-colors"
                          title="Edit Announcement"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {a.status === 'PUBLISHED' ? (
                          <button
                            onClick={() => unsendMutation.mutate(a.id)}
                            disabled={unsendMutation.isPending}
                            className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 font-mono text-[10px] font-extrabold transition-colors flex items-center gap-1"
                            title="Unsend & Retract Broadcast"
                          >
                            <span>UNSEND</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => sendMutation.mutate(a.id)}
                            disabled={sendMutation.isPending}
                            className="px-2.5 py-1 rounded bg-[#047857] text-white hover:bg-[#065f46] font-mono text-[10px] font-extrabold transition-colors flex items-center gap-1"
                            title="Send Broadcast to Participants"
                          >
                            <Send className="w-3 h-3" />
                            <span>SEND</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(a.id, a.title)}
                          className="p-1.5 rounded text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className={`text-xs leading-relaxed font-sans p-4 rounded-xl border ${
                    isJudge
                      ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340]'
                      : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#D4D4D4]'
                  }`}>
                    {a.content}
                  </p>

                  <div className={`pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                    isLight ? 'border-[#C8DCEB] text-[#52677D]' : 'border-[#2B2B2B] text-[#B3B3B3]'
                  }`}>
                    <span>PUBLISHED BY: {a.authorName || 'OPERATIONS TEAM'} &bull; {new Date(a.createdAt).toLocaleString()}</span>
                    {a.analytics && (
                      <span>ACKNOWLEDGED: <strong className={isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}>{a.analytics.ackPercentage}%</strong></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Admin Composer Portal (4 cols on lg) */}
        {isAdmin && (
          <div className="lg:col-span-4 font-mono text-xs space-y-4">
            <div className={`p-6 rounded-2xl space-y-4 border ${
              isJudge
                ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
                : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
            }`}>
              <h3 className={`text-xs font-bold uppercase flex items-center gap-2 border-b pb-3 tracking-wider ${
                isLight ? 'border-[#C8DCEB] text-[#0B2340]' : 'border-[#2B2B2B] text-[#FFFFFF]'
              }`}>
                <Send className={`w-4 h-4 ${isLight ? 'text-[#1687D9]' : 'text-[#FFFFFF]'}`} />
                <span>PUBLISH ANNOUNCEMENT DECK</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${
                    isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                  }`}>
                    ANNOUNCEMENT SUBJECT / TITLE
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Round 2 Evaluation Commencing..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full h-10 px-4 border rounded-xl text-xs font-mono font-bold focus:outline-none ${
                      isJudge
                        ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] focus:border-[#1687D9]'
                        : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF] focus:border-[#FFFFFF]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${
                      isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                    }`}>CATEGORY</label>
                    <select
                      value={category}
                      onChange={(e: any) => setCategory(e.target.value)}
                      className={`w-full h-10 px-3 border rounded-xl text-xs font-mono focus:outline-none ${
                        isJudge
                          ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340]'
                          : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
                      }`}
                    >
                      <option value="GENERAL">GENERAL</option>
                      <option value="SCHEDULE">SCHEDULE</option>
                      <option value="TECHNICAL">TECHNICAL</option>
                      <option value="FOOD">FOOD & REFRESHMENT</option>
                      <option value="VENUE">VENUE LOGISTICS</option>
                      <option value="EMERGENCY">EMERGENCY ALERTS</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${
                      isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                    }`}>PRIORITY LEVEL</label>
                    <select
                      value={priority}
                      onChange={(e: any) => setPriority(e.target.value)}
                      className={`w-full h-10 px-3 border rounded-xl text-xs font-mono focus:outline-none ${
                        isJudge
                          ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340]'
                          : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
                      }`}
                    >
                      <option value="INFO">INFO (NORMAL)</option>
                      <option value="IMPORTANT">IMPORTANT</option>
                      <option value="CRITICAL">CRITICAL (HIGH PRIORITY)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${
                    isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                  }`}>TARGET AUDIENCE</label>
                  <select
                    value={targetAudience}
                    onChange={(e: any) => setTargetAudience(e.target.value)}
                    className={`w-full h-10 px-3 border rounded-xl text-xs font-mono focus:outline-none ${
                      isJudge
                        ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340]'
                        : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
                    }`}
                  >
                    <option value="ALL">BROADCAST ALL PARTICIPANTS</option>
                    <option value="TRACK">TARGET SPECIFIC DOMAIN TRACK</option>
                    <option value="TEAMS">TARGET SPECIFIC TEAMS</option>
                  </select>
                </div>

                {targetAudience === 'TRACK' && (
                  <div>
                    <label className={`block text-[10px] uppercase font-bold mb-1 ${
                      isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                    }`}>SELECT DOMAIN TRACK</label>
                    <select
                      value={targetTrackId}
                      onChange={(e) => setTargetTrackId(e.target.value)}
                      className={`w-full h-10 px-3 border rounded-xl text-xs font-mono focus:outline-none ${
                        isJudge
                          ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340]'
                          : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
                      }`}
                    >
                      <option value="">Choose Domain Track...</option>
                      {tracks.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {targetAudience === 'TEAMS' && (
                  <div className="space-y-2">
                    <label className={`block text-[10px] uppercase font-bold ${
                      isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                    }`}>SELECT TARGET TEAMS</label>
                    <input
                      type="text"
                      placeholder="Filter teams by name..."
                      value={searchTeamText}
                      onChange={(e) => setSearchTeamText(e.target.value)}
                      className={`w-full h-9 px-3 border rounded-xl text-xs focus:outline-none ${
                        isJudge
                          ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340]'
                          : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
                      }`}
                    />
                    <div className={`max-h-36 overflow-y-auto border rounded-xl p-2 space-y-1 ${
                      isLight ? 'bg-[#F5FAFE] border-[#C8DCEB]' : 'bg-[#0E0E0E] border-[#2B2B2B]'
                    }`}>
                      {teamsList
                        .filter((t) => t.name.toLowerCase().includes(searchTeamText.toLowerCase()))
                        .map((t) => {
                          const isSelected = targetTeamIds.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleSelectTeam(t.id)}
                              className={`p-2 rounded-lg cursor-pointer text-[11px] flex justify-between items-center transition-colors ${
                                isSelected
                                  ? isLight ? 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#0B63B6] font-bold' : 'bg-[#2B2B2B] border border-[#555555] text-[#FFFFFF] font-bold'
                                  : isLight ? 'hover:bg-[#EFF6FF]/60 text-[#52677D]' : 'hover:bg-[#2B2B2B]/60 text-[#B3B3B3]'
                              }`}
                            >
                              <span>{t.name} ({t.trackName})</span>
                              {isSelected && <Check className={`w-4 h-4 ${isLight ? 'text-[#1687D9]' : 'text-[#FFFFFF]'}`} />}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-[10px] uppercase font-bold mb-1 ${
                    isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                  }`}>ANNOUNCEMENT BODY CONTENT</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Enter broadcast message details..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className={`w-full p-3 border rounded-xl text-xs font-sans focus:outline-none ${
                      isJudge
                        ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] focus:border-[#1687D9]'
                        : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF] focus:border-[#FFFFFF]'
                    }`}
                  />
                </div>

                <div className={`flex items-center justify-between pt-1 font-mono text-[11px] ${
                  isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                }`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinned}
                      onChange={(e) => setPinned(e.target.checked)}
                      className="rounded border-[#C8DCEB] text-[#1687D9] focus:ring-0"
                    />
                    <span>PIN TO TOP OF FEED</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireAck}
                      onChange={(e) => setRequireAck(e.target.checked)}
                      className="rounded border-[#C8DCEB] text-[#1687D9] focus:ring-0"
                    />
                    <span>REQUIRE ACKNOWLEDGMENT</span>
                  </label>
                </div>

                <AnimatedButton
                  type="submit"
                  disabled={publishMutation.isPending}
                  variant="primary"
                  size="md"
                  className={isLight ? 'w-full bg-[#1687D9] text-white font-extrabold hover:bg-[#0B63B6]' : 'w-full bg-[#1687D9] text-white font-extrabold hover:bg-[#0B63B6]'}
                >
                  {publishMutation.isPending ? 'PUBLISHING...' : 'PUBLISH ANNOUNCEMENT NOW'}
                </AnimatedButton>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* EDIT ANNOUNCEMENT MODAL */}
      {editingAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans select-none bg-[#0B2545]/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 font-mono text-xs text-[#0B2340]"
          >
            <div className="flex justify-between items-center border-b border-[#CBD5E1] pb-3">
              <h3 className="text-base font-extrabold text-[#0B2340] flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#1687D9]" />
                <span>EDIT ANNOUNCEMENT</span>
              </h3>
              <button
                onClick={() => setEditingAnn(null)}
                className="text-[#64748B] hover:text-[#0B2340] font-bold text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#52677D] uppercase mb-1">SUBJECT TITLE</label>
                <input
                  type="text"
                  value={editingAnn.title}
                  onChange={(e) => setEditingAnn({ ...editingAnn, title: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] font-bold focus:outline-none focus:border-[#1687D9]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#52677D] uppercase mb-1">BODY CONTENT</label>
                <textarea
                  rows={4}
                  value={editingAnn.content}
                  onChange={(e) => setEditingAnn({ ...editingAnn, content: e.target.value })}
                  className="w-full p-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] font-sans focus:outline-none focus:border-[#1687D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#52677D] uppercase mb-1">PRIORITY</label>
                  <select
                    value={editingAnn.priority}
                    onChange={(e) => setEditingAnn({ ...editingAnn, priority: e.target.value })}
                    className="w-full h-9 px-2 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] font-bold"
                  >
                    <option value="INFO">INFO</option>
                    <option value="IMPORTANT">IMPORTANT</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#52677D] uppercase mb-1">CATEGORY</label>
                  <select
                    value={editingAnn.category}
                    onChange={(e) => setEditingAnn({ ...editingAnn, category: e.target.value })}
                    className="w-full h-9 px-2 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] font-bold"
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="SCHEDULE">SCHEDULE</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                    <option value="FOOD">FOOD</option>
                    <option value="VENUE">VENUE</option>
                    <option value="EMERGENCY">EMERGENCY</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editingAnn.pinned}
                  onChange={(e) => setEditingAnn({ ...editingAnn, pinned: e.target.checked })}
                  className="rounded border-[#C8DCEB] text-[#1687D9]"
                />
                <span className="font-bold">PIN TO TOP OF FEED</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#CBD5E1]">
              <button
                onClick={() => setEditingAnn(null)}
                className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#0B2340] font-bold text-xs hover:bg-[#F5FAFE]"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  updateMutation.mutate({
                    id: editingAnn.id,
                    payload: {
                      title: editingAnn.title.trim(),
                      content: editingAnn.content.trim(),
                      category: editingAnn.category,
                      priority: editingAnn.priority,
                      targetAudience: editingAnn.targetAudience === 'ALL' ? 'EVERYONE' : editingAnn.targetAudience,
                      trackId: editingAnn.trackId || null,
                      pinned: editingAnn.pinned,
                      status: editingAnn.status || 'PUBLISHED',
                    }
                  });
                }}
                disabled={updateMutation.isPending}
                className="px-5 py-2 rounded-xl bg-[#1687D9] text-white font-extrabold text-xs hover:bg-[#0B63B6]"
              >
                {updateMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AnnouncementsPanel;
