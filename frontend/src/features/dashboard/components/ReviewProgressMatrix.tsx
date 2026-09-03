import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, QrCode, Eye, FileText } from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useTrack } from '../../../context/TrackContext';
import { TeamDetailDrawer } from './TeamDetailDrawer';
import { ResponsiveTableContainer } from '../../../shared/components/ResponsiveTableContainer';
import { QrScannerModal } from '../../../shared/components/QrScannerModal';
import { AccessDeniedModal } from '../../../shared/components/AccessDeniedModal';
import { useNavigate } from 'react-router-dom';

interface ReviewMatrixData {
  rounds: { id: string; name: string; sequenceOrder: number; maxMarks: number }[];
  matrix: {
    team: {
      id: string;
      registrationId?: string;
      name: string;
      trackId: string;
      trackName: string;
      college: string;
      checkedIn: boolean;
      paymentStatusFinal?: string;
    };
    rounds: {
      roundId: string;
      roundName: string;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      completedCount: number;
      assignedCount: number;
      totalScore?: number;
      progressLabel: string;
    }[];
    overallStatus: string;
  }[];
}

export const ReviewProgressMatrix: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTrackId } = useTrack();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [checkInFilter, setCheckInFilter] = useState<'ALL' | 'CHECKED_IN' | 'PENDING'>('ALL');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [accessDeniedOpen, setAccessDeniedOpen] = useState(false);

  const { data, isLoading, error } = useQuery<ReviewMatrixData>({
    queryKey: ['review-matrix', selectedTrackId],
    queryFn: () =>
      api.get(`/reviews/matrix${selectedTrackId ? `?trackId=${selectedTrackId}` : ''}`),
    refetchInterval: 10000,
  });

  const rounds = data?.rounds || [];
  const matrix = data?.matrix || [];

  const filteredMatrix = matrix.filter((item) => {
    const matchesSearch =
      item.team.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.team.registrationId && item.team.registrationId.toLowerCase().includes(search.toLowerCase())) ||
      item.team.college.toLowerCase().includes(search.toLowerCase());

    const matchesCheckIn =
      checkInFilter === 'ALL' ||
      (checkInFilter === 'CHECKED_IN' && item.team.checkedIn) ||
      (checkInFilter === 'PENDING' && !item.team.checkedIn);

    return matchesSearch && matchesCheckIn;
  });

  const getStatusBadge = (status: string, label: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-extrabold bg-[#FFFFFF] text-[#0E0E0E] border border-[#FFFFFF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E0E0E]" />
            {label}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-extrabold bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF] animate-pulse" />
            {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-[#0E0E0E] text-[#B3B3B3] border border-[#2B2B2B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#555555]" />
            {label}
          </span>
        );
    }
  };

  const handleScan = async (code: string) => {
    setScanError(null);
    try {
      const res = await api.post('/reviews/scan', { code });
      if (res.success) {
        setScannerOpen(false);
        navigate(`/reviews/${res.team.id}`, {
          state: {
            fromQrScan: true,
            qrScanTimestamp: res.qrScanTimestamp,
            reviewStartTimestamp: res.reviewStartTimestamp,
          },
        });
      }
    } catch (err: any) {
      if (err.status === 403) {
        setScannerOpen(false);
        setAccessDeniedOpen(true);
      } else {
        setScanError(err.message || 'QR Scan failed validation.');
      }
    }
  };

  return (
    <div className="space-y-6 text-left select-none text-[#FFFFFF]">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#181818] p-4 rounded-2xl border border-[#2B2B2B] shadow-lg">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" />
          <input
            type="text"
            placeholder="Search team name, ID, college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF] transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* QR Scan Trigger */}
          <button
            onClick={() => {
              setScannerOpen(true);
              setScanError(null);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFFFF] text-[#0E0E0E] hover:bg-[#D4D4D4] text-xs font-bold font-mono transition-all shadow-md"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan Team Badge</span>
          </button>

          {/* Check-In Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#0E0E0E] p-1 rounded-xl border border-[#2B2B2B] text-xs font-mono">
            {(['ALL', 'CHECKED_IN', 'PENDING'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setCheckInFilter(filter)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  checkInFilter === filter
                    ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555]'
                    : 'text-[#B3B3B3] hover:text-[#FFFFFF]'
                }`}
              >
                {filter === 'ALL' ? 'All Teams' : filter === 'CHECKED_IN' ? 'Checked In' : 'Pending'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Review Progress Matrix Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-[#181818] border border-[#2B2B2B] rounded-2xl min-h-[360px] text-center font-mono">
          <div className="w-10 h-10 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-[#D4D4D4] animate-pulse">Syncing review matrix data...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-[#181818] text-[#B3B3B3] border border-[#2B2B2B] rounded-2xl text-xs font-mono text-center">
          Failed to load live review matrix. Please try refreshing.
        </div>
      ) : filteredMatrix.length === 0 ? (
        <div className="p-12 text-center text-[#B3B3B3] font-mono bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl space-y-2">
          <FileText className="w-8 h-8 text-[#555555] mx-auto" />
          <p className="text-xs">No teams found matching search criteria.</p>
        </div>
      ) : (
        <div className="bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl overflow-hidden shadow-xl">
          <ResponsiveTableContainer title="EVALUATION PROGRESS MATRIX">
            <table className="w-full text-left border-collapse font-mono text-xs min-w-[900px]">
              <thead>
                <tr className="bg-[#181818] border-b border-[#2B2B2B] text-[#FFFFFF] font-extrabold text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 sticky left-0 z-20 bg-[#181818] border-r border-[#2B2B2B] min-w-[220px]">
                    TEAM &amp; REGISTRATION ID
                  </th>
                  <th className="py-3 px-4 min-w-[140px]">TRACK / DOMAIN</th>
                  <th className="py-3 px-4 text-center min-w-[110px]">CHECK-IN</th>
                  {rounds.map((round) => (
                    <th key={round.id} className="py-3 px-4 text-center min-w-[170px]">
                      <span className="block font-extrabold text-[#FFFFFF] text-xs">{round.name}</span>
                      <span className="text-[10px] text-[#B3B3B3] font-bold block">MAX {round.maxMarks || 100} PTS</span>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right min-w-[90px] w-20">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2B2B2B] bg-[#0E0E0E] text-xs font-sans">
                {filteredMatrix.map((item) => (
                  <tr
                    key={item.team.id}
                    className="hover:bg-[#2B2B2B]/60 transition-colors group cursor-pointer"
                    onClick={() => setSelectedTeamId(item.team.id)}
                  >
                    {/* Sticky Team Identification Cell */}
                    <td className="py-3 px-4 sticky left-0 z-20 bg-[#0E0E0E] group-hover:bg-[#2B2B2B]/60 transition-colors border-r border-[#2B2B2B] min-w-[220px]">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-[#FFFFFF] group-hover:text-[#D4D4D4] transition-colors text-xs font-mono">
                          {item.team.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 font-mono">
                          <span className="text-[10px] text-[#D4D4D4] font-extrabold">
                            {item.team.registrationId || item.team.id.substring(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-[#B3B3B3] truncate max-w-[140px]">
                            &bull; {item.team.college}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Track */}
                    <td className="py-3 px-4 font-mono min-w-[140px]">
                      <span className="inline-block px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#181818] border border-[#2B2B2B] text-[#D4D4D4]">
                        {item.team.trackName}
                      </span>
                    </td>

                    {/* Check-In */}
                    <td className="py-3 px-4 text-center font-mono min-w-[110px]">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold uppercase border ${
                          item.team.checkedIn
                            ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                            : 'bg-[#2B2B2B] text-[#B3B3B3] border-[#555555]'
                        }`}
                      >
                        {item.team.checkedIn ? 'VERIFIED' : 'PENDING'}
                      </span>
                    </td>

                    {/* Rounds Progress Columns */}
                    {rounds.map((round) => {
                      const roundData = item.rounds.find((r) => r.roundId === round.id);
                      return (
                        <td key={round.id} className="py-3 px-4 text-center min-w-[170px]">
                          {roundData
                            ? getStatusBadge(roundData.status, roundData.progressLabel)
                            : getStatusBadge('NOT_STARTED', '0/0')}
                        </td>
                      );
                    })}

                    {/* View Drawer Button */}
                    <td className="py-3 px-4 text-right min-w-[90px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeamId(item.team.id);
                        }}
                        className="p-1.5 rounded bg-[#181818] border border-[#2B2B2B] text-[#B3B3B3] hover:text-[#FFFFFF] hover:bg-[#2B2B2B] hover:border-[#555555] transition-all"
                        title="View Team Workspace"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTableContainer>
        </div>
      )}

      {/* Team Detail Drawer */}
      <TeamDetailDrawer
        teamId={selectedTeamId}
        isOpen={!!selectedTeamId}
        onClose={() => setSelectedTeamId(null)}
      />

      {/* Modals */}
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
    </div>
  );
};

export default ReviewProgressMatrix;

