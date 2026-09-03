import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Trophy,
  Download,
  Settings,
  Lock,
  Unlock,
  Search,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useTrack } from '../../../context/TrackContext';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';

export const Leaderboards: React.FC = () => {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const { tracks } = useTrack();
  const queryClient = useQueryClient();

  const isJudge = user?.role === 'JUDGE';

  const [trackFilter, setTrackFilter] = useState('');
  const [search, setSearch] = useState('');
  const [limitFilter, setLimitFilter] = useState('full');
  const [activeRound, setActiveRound] = useState<any>(null);

  const { data: roundsData } = useQuery<any>({
    queryKey: ['active-rounds-leaderboard'],
    queryFn: () => api.get('/reviews/rounds'),
  });

  useEffect(() => {
    if (roundsData?.rounds && roundsData.rounds.length > 0 && !activeRound) {
      setActiveRound(roundsData.rounds[0]);
    }
  }, [roundsData, activeRound]);

  const { data: leaderboardData, isLoading: leaderboardLoading, error: leaderboardError } = useQuery({
    queryKey: ['leaderboard-rankings', trackFilter, limitFilter, search, activeRound?.id],
    queryFn: () => {
      let url = `/tracks/leaderboard?limit=${limitFilter}`;
      if (trackFilter) url += `&trackId=${trackFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (activeRound?.id) url += `&roundId=${activeRound.id}`;
      return api.get(url);
    },
  });

  const selectedTrackObj = tracks.find((t) => t.id === trackFilter);
  const isLocked = selectedTrackObj?.resultsLocked || false;
  const currentVisibility = selectedTrackObj?.leaderboardVisibility || 'ADMIN_ONLY';

  const lockRankingsMutation = useMutation({
    mutationFn: ({ trackId, lock }: { trackId: string; lock: boolean }) =>
      api.post(`/tracks/${trackId}/${lock ? 'lock-results' : 'unlock-results'}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard-rankings'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: ({
      trackId,
      visibility,
      exposeScoresToStudents,
    }: {
      trackId: string;
      visibility: string;
      exposeScoresToStudents?: boolean;
    }) => api.put(`/tracks/${trackId}/visibility`, { visibility, exposeScoresToStudents }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard-rankings'] });
      queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
  });

  const handleCSVExport = () => {
    if (!leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0) return;
    const headers = ['Rank', 'Team Name', 'Project Title', 'Track', 'Reviews Count', 'Weighted Score', 'Movement'];
    const rows = leaderboardData.leaderboard.map((t: any) => [
      t.rank,
      t.name,
      t.projectTitle,
      t.trackName,
      t.reviewsCount,
      t.score,
      t.movement,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((e: any[]) => e.map((val: any) => `"${String(val || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leaderboard_export_${trackFilter ? selectedTrackObj?.name : 'overall'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-extrabold text-sm shadow-md ${
          isLight ? 'bg-[#1687D9] text-white' : 'bg-[#FFFFFF] text-[#0E0E0E]'
        }`}>
          🥇 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-extrabold text-sm shadow-sm ${
          isLight ? 'bg-[#0B63B6] text-white' : 'bg-[#D4D4D4] text-[#0E0E0E]'
        }`}>
          🥈 2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-extrabold text-sm shadow-sm border ${
          isLight ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]' : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
        }`}>
          🥉 3
        </span>
      );
    }
    return <span className={`font-mono font-bold ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>#{rank}</span>;
  };

  const isPublicPrivacyView = user?.role !== 'ADMINISTRATOR' || leaderboardData?.isPublicPrivacyView;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 text-left select-none max-w-[1600px] mx-auto font-sans transition-colors duration-300 ${
        isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
      }`}
    >
      {/* LEADERBOARD HEADER */}
      <div className={`p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono border ${
        isJudge
          ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
          : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#1687D9] animate-pulse" />
            <span className={`font-bold tracking-wider ${isLight ? 'text-[#0B63B6]' : 'text-[#FFFFFF]'}`}>
              SYS // DIGITAL ARENA LEADERBOARD
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold font-outfit tracking-tight ${
            isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
          }`}>
            STANDINGS <span className={isLight ? 'text-[#1687D9]' : 'text-[#D4D4D4]'}>//</span> DIGITAL ARENA LEADERBOARD
          </h1>
          <p className={`text-xs mt-0.5 font-mono ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
            REAL-TIME STANDINGS, QUALIFICATION RANKINGS & TIMING TELEMETRY
          </p>
        </div>

        {!isPublicPrivacyView && (
          <AnimatedButton
            disabled={!leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0}
            onClick={handleCSVExport}
            variant="primary"
            size="sm"
            className={isLight ? 'bg-[#1687D9] text-white font-bold hover:bg-[#0B63B6]' : 'bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]'}
          >
            EXPORT CSV
          </AnimatedButton>
        )}
      </div>

      {/* Admin Controls Panel */}
      {user?.role === 'ADMINISTRATOR' && trackFilter && (
        <div className={`p-5 rounded-2xl space-y-4 font-mono border ${
          isJudge
            ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
            : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
        }`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className={`text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
              }`}>
                <Settings className={`w-4 h-4 ${isLight ? 'text-[#1687D9]' : 'text-[#FFFFFF]'}`} />
                <span>TRACK CONFIGURATION ({selectedTrackObj?.name})</span>
              </h3>
              <p className={`text-[11px] font-sans mt-0.5 ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
                CONFIGURE LOCK STATE AND VISIBILITY PERMISSIONS FOR THIS DOMAIN TRACK.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <label className={`uppercase font-bold ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>VISIBILITY:</label>
                <select
                  value={currentVisibility}
                  onChange={(e) => visibilityMutation.mutate({ trackId: trackFilter, visibility: e.target.value })}
                  className={`h-9 border rounded-xl text-xs font-mono font-bold px-3 focus:outline-none ${
                    isJudge
                      ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340]'
                      : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
                  }`}
                >
                  <option value="HIDDEN">HIDDEN</option>
                  <option value="ADMIN_ONLY">ADMIN ONLY</option>
                  <option value="ADMIN_JUDGES">ADMIN + JUDGES</option>
                  <option value="STUDENTS">STUDENTS INCLUDED</option>
                  <option value="PUBLIC">PUBLIC</option>
                </select>
              </div>

              <label className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer ${
                isJudge
                  ? 'bg-[#F5FAFE] border-[#C8DCEB]'
                  : 'bg-[#0E0E0E] border-[#2B2B2B]'
              }`}>
                <input
                  type="checkbox"
                  className="rounded border-[#C8DCEB] text-[#1687D9] focus:ring-0"
                  checked={selectedTrackObj?.exposeScoresToStudents || false}
                  onChange={(e) =>
                    visibilityMutation.mutate({
                      trackId: trackFilter,
                      visibility: currentVisibility,
                      exposeScoresToStudents: e.target.checked,
                    })
                  }
                />
                <span className={`text-xs font-mono font-bold ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>EXPOSE SCORES</span>
              </label>

              <AnimatedButton
                onClick={() => lockRankingsMutation.mutate({ trackId: trackFilter, lock: !isLocked })}
                variant={isLocked ? 'primary' : 'danger'}
                size="sm"
                className={isLocked
                  ? isLight ? 'bg-[#1687D9] text-white font-bold' : 'bg-[#FFFFFF] text-[#0E0E0E] font-bold'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/40'}
              >
                {isLocked ? 'UNLOCK RESULTS' : 'FREEZE & LOCK RESULTS'}
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className={`p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 font-mono border ${
        isJudge
          ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
          : 'bg-[#181818] border-[#2B2B2B] shadow-xl'
      }`}>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`} />
            <input
              type="text"
              placeholder="SEARCH TEAM..."
              className={`pl-9 pr-3 h-9 border rounded-xl text-xs font-mono focus:outline-none w-48 ${
                isJudge
                  ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] placeholder-[#94A3B8] focus:border-[#1687D9]'
                  : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF] placeholder-[#B3B3B3] focus:border-[#FFFFFF]'
              }`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className={`h-9 border rounded-xl text-xs font-mono font-bold px-3 focus:outline-none ${
              isJudge
                ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340]'
                : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
            }`}
          >
            <option value="">FILTER: ALL TRACKS</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {!isPublicPrivacyView && (
            <select
              value={limitFilter}
              onChange={(e) => setLimitFilter(e.target.value)}
              className={`h-9 border rounded-xl text-xs font-mono font-bold px-3 focus:outline-none ${
                isJudge
                  ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340]'
                  : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
              }`}
            >
              <option value="full">SCOPE: FULL RANKING</option>
              <option value="10">SCOPE: TOP 10 TEAMS</option>
              <option value="5">SCOPE: TOP 5 TEAMS</option>
            </select>
          )}
        </div>
      </div>

      {/* Standings Grid */}
      <div className="space-y-3 font-mono">
        {leaderboardLoading ? (
          <div className={`flex flex-col items-center justify-center p-16 rounded-2xl min-h-[300px] text-center border ${
            isJudge
              ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
              : 'bg-[#181818] border-[#2B2B2B]'
          }`}>
            <div className={`w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mb-3 ${
              isLight ? 'border-[#1687D9]' : 'border-[#FFFFFF]'
            }`} />
            <p className={`font-mono text-xs animate-pulse ${isLight ? 'text-[#52677D]' : 'text-[#D4D4D4]'}`}>
              LOADING DIGITAL ARENA TELEMETRY...
            </p>
          </div>
        ) : leaderboardError ? (
          <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-2xl text-center text-xs font-mono">
            {leaderboardError.message || 'LEADERBOARD RANKINGS RESTRICTED.'}
          </div>
        ) : !leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0 ? (
          <div className={`p-12 border border-dashed rounded-2xl text-center font-mono text-xs ${
            isJudge
              ? 'bg-white border-[#C8DCEB] text-[#52677D]'
              : 'bg-[#181818] border-[#2B2B2B] text-[#B3B3B3]'
          }`}>
            NO STANDINGS TELEMETRY LOGGED YET.
          </div>
        ) : isPublicPrivacyView ? (
          /* PUBLIC PRIVACY VIEW */
          <motion.div layout className="space-y-2">
            {leaderboardData.leaderboard.map((t: any) => (
              <motion.div
                key={t.teamId || t.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className={`p-4 rounded-xl flex items-center justify-between gap-4 transition-colors font-mono border ${
                  isJudge
                    ? 'bg-white border-[#C8DCEB] hover:border-[#1687D9] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
                    : 'bg-[#181818] border-[#2B2B2B] hover:border-[#555555] shadow-xl'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 border rounded-lg text-xs font-bold font-mono shrink-0 ${
                    isJudge
                      ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#0B63B6]'
                      : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF]'
                  }`}>
                    {t.teamCode || t.teamId || t.id}
                  </div>
                  <div>
                    <span className={`font-bold font-sans text-sm block ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>{t.teamName || t.name}</span>
                    <span className={`text-[11px] block mt-0.5 font-mono ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
                      {t.projectTitle ? `${t.projectTitle} • ` : ''}<strong className={isLight ? 'text-[#1687D9]' : 'text-[#FFFFFF]'}>{t.trackName}</strong>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* ADMIN STANDINGS VIEW */
          <motion.div layout className="space-y-2">
            {leaderboardData.leaderboard.map((t: any) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors font-mono border ${
                  isJudge
                    ? 'bg-white border-[#C8DCEB] hover:border-[#1687D9] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
                    : 'bg-[#181818] border-[#2B2B2B] hover:border-[#555555] shadow-xl'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 text-center shrink-0">
                    {getRankBadge(t.rank)}
                  </div>
                  <div>
                    <span className={`font-bold font-sans text-sm block ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>{t.name}</span>
                    <span className={`text-xs block mt-0.5 truncate max-w-md font-mono ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
                      {t.projectTitle || 'No Title'} • <strong className={isLight ? 'text-[#1687D9]' : 'text-[#FFFFFF]'}>{t.trackName}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 justify-between sm:justify-end text-xs font-mono">
                  <div className="text-center">
                    <span className={`text-[9px] uppercase block font-bold ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>REVIEWS</span>
                    <span className={`text-xs font-bold ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>{t.reviewsCount}</span>
                  </div>

                  <div className="text-center">
                    <span className={`text-[9px] uppercase block font-bold ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>SCORE</span>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg border ${
                      isJudge
                        ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                        : 'bg-[#0E0E0E] text-[#FFFFFF] border-[#2B2B2B]'
                    }`}>
                      {t.score !== undefined ? `${t.score.toFixed(1)}` : 'N/A'}
                    </span>
                  </div>

                  <div className="text-center w-14">
                    <span className={`text-[9px] uppercase block font-bold ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>SHIFT</span>
                    <span
                      className={`text-xs font-bold ${
                        t.movement?.includes('↑')
                          ? isLight ? 'text-[#047857]' : 'text-[#FFFFFF]'
                          : t.movement?.includes('↓')
                          ? 'text-rose-500'
                          : isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'
                      }`}
                    >
                      {t.movement || '-'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Leaderboards;
