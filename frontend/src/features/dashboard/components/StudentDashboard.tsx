import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Gavel,
  Users,
  HelpCircle,
  Megaphone,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Lock,
  Edit2,
  Download,
  Printer,
  Maximize2,
  ExternalLink,
  X,
  Star,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { QrScannerModal } from '../../../shared/components/QrScannerModal';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';

type StudentTabType = 'dashboard' | 'reviews' | 'team' | 'questions' | 'announcements';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const { isLight, studentTheme, toggleStudentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<StudentTabType>('dashboard');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Workspace Edit Form states
  const [isEditing, setIsEditing] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [presentationUrl, setPresentationUrl] = useState('');
  const [techStack, setTechStack] = useState('');

  const downloadQR = async () => {
    if (!team) return;
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(team.teamCode || team.id)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${team.teamCode || 'team'}_qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download QR failed:', e);
    }
  };

  const printQR = () => {
    if (!team) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${team.name}</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 90vh;
              text-align: center;
              margin: 0;
              background-color: #0E0E0E;
              color: #FFFFFF;
            }
            .badge-card {
              border: 2px solid #2B2B2B;
              border-radius: 16px;
              padding: 40px;
              width: 360px;
              background-color: #181818;
            }
            h2 { margin: 10px 0 5px 0; font-size: 28px; font-weight: 800; color: #FFFFFF; }
            p { margin: 0 0 20px 0; font-size: 16px; color: #D4D4D4; text-transform: uppercase; font-weight: 600; letter-spacing: 1px; }
            img { width: 250px; height: 250px; background: #fff; padding: 10px; border-radius: 12px; }
            .footer-text { margin-top: 20px; font-family: monospace; font-size: 16px; font-weight: bold; color: #B3B3B3; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="badge-card">
            <h2>${team.name}</h2>
            <p>${team.trackName}</p>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(team.teamCode || team.id)}" alt="QR Code" />
            <div class="footer-text">${team.teamCode || team.id}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-team-details'],
    queryFn: () => api.get('/teams/my-team'),
  });

  const team = data?.team;

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleScan = async (code: string) => {
    setScanError(null);
    try {
      const res: any = await api.post('/registration/self-check-in', { code });
      if (res.success) {
        toast.success(res.message || 'Check-In Verified! Team marked PRESENT at venue.');
        setScannerOpen(false);
        queryClient.invalidateQueries({ queryKey: ['my-team-details'] });
      }
    } catch (err: any) {
      setScanError(err.message || 'Invalid QR Code scanned. Please scan the official Venue Check-In QR Code displayed at the admin desk.');
    }
  };

  const isLeader = Boolean(
    team?.members?.some((m: any) =>
      (m.userId === user?.id || m.email?.toLowerCase() === user?.email?.toLowerCase()) &&
      (m.role === 'LEADER' || m.role === 'LEAD')
    ) || (team?.leadEmail?.toLowerCase() === user?.email?.toLowerCase())
  );

  useEffect(() => {
    if (team) {
      setProjectTitle(team.projectTitle || '');
      setProblemStatement(team.problemStatement || '');
      setProjectDesc(team.projectDesc || '');
      setProjectUrl(team.projectUrl || '');
      setDemoUrl(team.demoUrl || '');
      setPresentationUrl(team.presentationUrl || '');
      setTechStack(team.techStack || '');
    }
  }, [team]);

  const updateWorkspaceMutation = useMutation({
    mutationFn: (newData: any) => api.put(`/teams/${team.id}`, newData),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['my-team-details'] });
    },
  });

  const { data: announcementsData, isLoading: announcementsLoading } = useQuery({
    queryKey: ['my-announcements'],
    queryFn: () => api.get('/notifications').then((res) => res.notifications || []),
  });

  if (isLoading) {
    return (
      <div className={`${isLight ? 'flex flex-col items-center justify-center p-16 bg-white border border-[#C8DCEB] rounded-2xl min-h-[360px] text-center font-mono' : 'flex flex-col items-center justify-center p-16 bg-[#181818] border border-[#2B2B2B] rounded-2xl min-h-[360px] text-center font-mono'}`}>
        <div className="w-10 h-10 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin mb-4" />
        <p className={`${isLight ? 'text-sm text-[#0B63B6] animate-pulse' : 'text-sm text-[#D4D4D4] animate-pulse'}`}>
          Syncing student profile...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-950/40 text-rose-300 border border-rose-500/40 rounded-2xl flex items-center gap-3 font-mono">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        <span className="text-sm">You are not currently assigned to a hackathon team. Please contact the administrator.</span>
      </div>
    );
  }

  const tabs: { id: StudentTabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'reviews', label: 'Evaluations', icon: <Gavel className="w-4 h-4" /> },
    { id: 'team', label: 'Team Info', icon: <Users className="w-4 h-4" /> },
    { id: 'questions', label: 'Support Requests', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
  ];

  const getProgressLabelStyles = (label: string) => {
    switch (label) {
      case 'Excellent Progress':
        return isLight ? 'bg-[#EFF6FF] text-[#0B2340] border border-[#BFDBFE]' : 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555]';
      case 'Good Progress':
        return isLight ? 'bg-[#EFF6FF] text-[#0B63B6] border border-[#BFDBFE]' : 'bg-[#2B2B2B] text-[#D4D4D4] border border-[#555555]';
      case 'Needs Improvement':
        return isLight ? 'bg-white text-[#52677D] border border-[#C8DCEB]' : 'bg-[#181818] text-[#B3B3B3] border border-[#2B2B2B]';
      case 'At Risk':
        return 'bg-rose-950/40 text-rose-300 border border-rose-500/40';
      default:
        return isLight ? 'bg-white text-[#52677D] border border-[#C8DCEB]' : 'bg-[#181818] text-[#B3B3B3] border border-[#2B2B2B]';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-7xl mx-auto font-sans pb-10 sm:pb-16"
    >
      {/* TEAM PORTAL HEADER - TEAM CONTROL DECK */}
      <div className={`relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-2xl border shadow-xl overflow-hidden transition-colors duration-300 ${
        isLight
          ? 'bg-white border-[#C8DCEB] text-[#0B2340] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
          : 'bg-[#181818] border-[#2B2B2B] text-[#FFFFFF]'
      }`}>
        <div className={`absolute top-0 inset-x-0 h-0.5 ${isLight ? 'bg-[#1687D9]' : 'bg-[#FFFFFF]'}`} />

        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap font-mono text-xs">
            <span className={`px-2.5 py-0.5 rounded font-bold border ${
              isLight ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]' : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
            }`}>
              SYS // TEAM CONTROL DECK
            </span>
            <span className={`px-2.5 py-0.5 rounded font-bold border ${
              isLight ? 'bg-[#F5FAFE] text-[#1687D9] border-[#C8DCEB]' : 'bg-[#2B2B2B] text-[#D4D4D4] border-[#555555]'
            }`}>
              TRK // {team.trackName}
            </span>
            <span className={`px-2.5 py-0.5 rounded border ${
              isLight ? 'bg-[#F5FAFE] text-[#52677D] border-[#C8DCEB]' : 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B]'
            }`}>
              REG: {team.registrationId || team.teamCode || team.id}
            </span>
          </div>
          <h1 className={`text-3xl font-extrabold font-outfit tracking-tight flex items-center gap-2 ${
            isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
          }`}>
            TEAM <span className={isLight ? 'text-[#1687D9]' : 'text-[#D4D4D4]'}>//</span> {team.name}
          </h1>
          <p className={`text-xs font-mono mt-1 ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
            SMART HORIZON 2026 INTERNATIONAL HACKATHON OPERATIONS DECK
          </p>
        </div>

        <div className="flex items-center gap-2.5 font-mono flex-wrap">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleStudentTheme}
            className={`px-3 py-1.5 rounded border text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isLight
                ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#0B63B6] hover:bg-[#DBEAFE]'
                : 'bg-[#2B2B2B] border-[#555555] text-[#FFFFFF] hover:bg-[#555555]'
            }`}
          >
            {studentTheme === 'light' ? (
              <>
                <Sun className="w-4 h-4 text-[#1687D9]" />
                <span>LIGHT MODE</span>
              </>
            ) : (
              <>
                <Moon className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
                <span>DARK MODE</span>
              </>
            )}
          </button>

          {!team.checkedIn && (
            <AnimatedButton
              onClick={() => setScannerOpen(true)}
              variant="primary"
              size="sm"
              className={isLight ? 'bg-[#1687D9] text-white font-bold hover:bg-[#0B63B6]' : 'bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]'}
            >
              SCAN VENUE QR
            </AnimatedButton>
          )}
          <AnimatedButton
            onClick={() => navigate('/feedback')}
            variant="secondary"
            size="sm"
            className={isLight ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#0B63B6] hover:bg-[#DBEAFE]' : 'border-[#2B2B2B] text-[#FFFFFF] hover:bg-[#2B2B2B]'}
          >
            SUBMIT FEEDBACK
          </AnimatedButton>
          <span className={`px-3 py-1.5 rounded border text-xs font-mono font-bold uppercase tracking-wider ${
            team.checkedIn
              ? isLight ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]' : 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
              : isLight ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' : 'bg-[#2B2B2B] text-[#B3B3B3] border-[#555555]'
          }`}>
            {team.checkedIn ? '● PRESENT' : '○ UNCHECKED'}
          </span>
        </div>
      </div>

      {/* HACKATHON STAGE PROGRESSION VISUALIZATION */}
      <div className={`p-6 rounded-2xl border shadow-lg space-y-3 font-mono transition-colors duration-300 ${
        isLight
          ? 'bg-white border-[#C8DCEB] text-[#0B2340] shadow-[0_8px_30px_rgba(30,80,120,0.08)]'
          : 'bg-[#181818] border-[#2B2B2B] text-[#FFFFFF]'
      }`}>
        <div className="flex justify-between items-center text-xs">
          <span className={`uppercase tracking-widest font-bold ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>// HACKATHON EVENT TIMELINE PROGRESSION</span>
          <span className={`font-bold ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>STAGE STATUS: {team.projectUrl ? 'SUBMISSION COMPLETE' : 'BUILDING'}</span>
        </div>

        <div className="overflow-x-auto pb-2 hide-scrollbar">
          <div className="grid grid-cols-5 gap-2 pt-2 relative min-w-[600px]">
          {/* Connecting Line */}
          <div className={`${isLight ? 'absolute top-[28px] left-[10%] right-[10%] h-0.5 bg-[#EFF6FF] -z-0' : 'absolute top-[28px] left-[10%] right-[10%] h-0.5 bg-[#2B2B2B] -z-0'}`}>
            <div
              className="h-full bg-[#FFFFFF]"
              style={{
                width: team.projectUrl ? (team.reviews?.length > 0 ? '75%' : '50%') : '25%',
              }}
            />
          </div>

          {/* Stage 1: Registration */}
          <div className="flex flex-col items-center text-center space-y-1.5 z-10">
            <div className="w-8 h-8 rounded-full bg-[#FFFFFF] text-[#0E0E0E] font-bold flex items-center justify-center text-xs shadow-md">
              ✓
            </div>
            <span className={`${isLight ? 'text-[11px] font-bold text-[#0B2340]' : 'text-[11px] font-bold text-[#FFFFFF]'}`}>REGISTRATION</span>
            <span className={`${isLight ? 'text-[9px] text-[#0B63B6]' : 'text-[9px] text-[#D4D4D4]'}`}>VERIFIED</span>
          </div>

          {/* Stage 2: Build */}
          <div className="flex flex-col items-center text-center space-y-1.5 z-10">
            <div className="w-8 h-8 rounded-full bg-[#FFFFFF] text-[#0E0E0E] font-bold flex items-center justify-center text-xs shadow-md">
              ✓
            </div>
            <span className={`${isLight ? 'text-[11px] font-bold text-[#0B2340]' : 'text-[11px] font-bold text-[#FFFFFF]'}`}>BUILD</span>
            <span className={`${isLight ? 'text-[9px] text-[#0B63B6]' : 'text-[9px] text-[#D4D4D4]'}`}>ACTIVE</span>
          </div>

          {/* Stage 3: Submission */}
          <div className="flex flex-col items-center text-center space-y-1.5 z-10">
            <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs transition-all ${
              team.projectUrl
                ? 'bg-[#FFFFFF] text-[#0E0E0E]'
                : 'bg-[#2B2B2B] border border-[#555555] text-[#FFFFFF] animate-pulse'
            }`}>
              {team.projectUrl ? '✓' : '●'}
            </div>
            <span className={`${isLight ? 'text-[11px] font-bold text-[#0B2340]' : 'text-[11px] font-bold text-[#FFFFFF]'}`}>SUBMISSION</span>
            <span className={`text-[9px] ${team.projectUrl ? (isLight ? 'text-[#0B63B6]' : 'text-[#FFFFFF]') : (isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]')}`}>
              {team.projectUrl ? 'SUBMITTED' : 'ACTION REQ'}
            </span>
          </div>

          {/* Stage 4: Evaluation */}
          <div className="flex flex-col items-center text-center space-y-1.5 z-10">
            <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${
              team.reviews?.length > 0
                ? 'bg-[#FFFFFF] text-[#0E0E0E]'
                : 'bg-[#0E0E0E] border border-[#2B2B2B] text-[#B3B3B3]'
            }`}>
              {team.reviews?.length > 0 ? '●' : '○'}
            </div>
            <span className={`${isLight ? 'text-[11px] font-bold text-[#0B2340]' : 'text-[11px] font-bold text-[#FFFFFF]'}`}>EVALUATION</span>
            <span className={`${isLight ? 'text-[9px] text-[#52677D]' : 'text-[9px] text-[#B3B3B3]'}`}>
              {team.reviews?.length > 0 ? `${team.reviews.length} REVIEWED` : 'PENDING'}
            </span>
          </div>

          {/* Stage 5: Result */}
          <div className="flex flex-col items-center text-center space-y-1.5 z-10">
            <div className={`${isLight ? 'w-8 h-8 rounded-full bg-[#F5FAFE] border border-[#C8DCEB] text-[#52677D] font-bold flex items-center justify-center text-xs' : 'w-8 h-8 rounded-full bg-[#0E0E0E] border border-[#2B2B2B] text-[#B3B3B3] font-bold flex items-center justify-center text-xs'}`}>
              ○
            </div>
            <span className={`${isLight ? 'text-[11px] font-bold text-[#0B2340]' : 'text-[11px] font-bold text-[#FFFFFF]'}`}>RESULT</span>
            <span className={`${isLight ? 'text-[9px] text-[#52677D]' : 'text-[9px] text-[#B3B3B3]'}`}>FINAL ROUND</span>
          </div>
        </div>
        </div>
      </div>

      {/* VENUE CHECK-IN BANNER */}
      {!team.checkedIn && (
        <div className={`${isLight ? 'p-5 bg-white border border-[#BFDBFE] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left font-mono' : 'p-5 bg-[#181818] border border-[#555555] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left font-mono'}`}>
          <div className="flex items-center gap-3">
            <QrCode className={`${isLight ? 'w-6 h-6 text-[#0B2340] shrink-0' : 'w-6 h-6 text-[#FFFFFF] shrink-0'}`} />
            <div>
              <h4 className={`${isLight ? 'text-xs font-bold text-[#0B2340] uppercase tracking-wide' : 'text-xs font-bold text-[#FFFFFF] uppercase tracking-wide'}`}>
                📍 VENUE CHECK-IN VERIFICATION REQUIRED
              </h4>
              <p className={`${isLight ? 'text-xs text-[#52677D] font-sans mt-0.5' : 'text-xs text-[#B3B3B3] font-sans mt-0.5'}`}>
                Report to the Admin Desk, tap <strong className={`${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>"SCAN VENUE QR"</strong>, and scan your assigned QR code to verify team attendance.
              </p>
            </div>
          </div>
          <AnimatedButton
            onClick={() => setScannerOpen(true)}
            variant="primary"
            size="sm"
            className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
          >
            SCAN VENUE QR NOW
          </AnimatedButton>
        </div>
      )}

      {/* COMPULSORY ACTIONS ERROR ALERT */}
      {(!team.projectUrl || !team.projectUrl.toLowerCase().includes('github.com')) && (
        <div className={`${isLight ? 'p-5 bg-white border border-[#BFDBFE] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left font-mono' : 'p-5 bg-[#181818] border border-[#555555] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left font-mono'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`${isLight ? 'w-6 h-6 text-[#0B2340] shrink-0' : 'w-6 h-6 text-[#FFFFFF] shrink-0'}`} />
            <div>
              <h4 className={`${isLight ? 'text-xs font-bold text-[#0B2340] uppercase tracking-wide' : 'text-xs font-bold text-[#FFFFFF] uppercase tracking-wide'}`}>
                ★ COMPULSORY ACTION REQUIRED: PUBLIC GITHUB REPOSITORY URL MISSING
              </h4>
              <p className={`${isLight ? 'text-xs text-[#52677D] font-sans mt-0.5' : 'text-xs text-[#B3B3B3] font-sans mt-0.5'}`}>
                {isLeader
                  ? 'Submit your team\'s public GitHub repository URL (https://github.com/...) for evaluation.'
                  : `Your Team Leader (${team.leadName || 'Leader'}) must submit the public GitHub repository URL.`}
              </p>
            </div>
          </div>
          {isLeader ? (
            <AnimatedButton onClick={() => { setActiveTab('dashboard'); setIsEditing(true); }} variant="primary" size="sm" className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]">
              ADD GITHUB URL NOW
            </AnimatedButton>
          ) : (
            <span className={`${isLight ? 'text-xs font-mono text-[#0B63B6] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1 rounded font-bold' : 'text-xs font-mono text-[#D4D4D4] bg-[#2B2B2B] border border-[#555555] px-3 py-1 rounded font-bold'}`}>
              TEAM LEADER ACTION REQUIRED
            </span>
          )}
        </div>
      )}

      {/* TEAM NAVIGATION CONTROL TABS */}
      <div className={`flex border rounded-2xl p-1 overflow-x-auto hide-scrollbar font-mono text-xs transition-colors duration-300 ${
        isLight ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)]' : 'bg-[#181818] border-[#2B2B2B]'
      }`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs whitespace-nowrap transition-all ${
                isActive
                  ? isLight ? 'bg-[#1687D9] text-white font-bold shadow-sm' : 'bg-[#2B2B2B] text-[#FFFFFF] font-bold border border-[#555555] shadow-md'
                  : isLight ? 'text-[#52677D] hover:text-[#0B2340] hover:bg-[#F5FAFE]' : 'text-[#B3B3B3] hover:text-[#FFFFFF] hover:bg-[#2B2B2B]/60'
              }`}
            >
              <span className={`shrink-0 ${isActive ? (isLight ? 'text-white' : 'text-[#FFFFFF]') : (isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]')}`}>
                {tab.icon}
              </span>
              <span className="uppercase">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TABS CONTENT AREA */}
      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left Column: Project Workspace Card */}
            <div className="lg:col-span-2 space-y-6 font-sans">
              <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-6 rounded-2xl shadow-xl space-y-4' : 'bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl space-y-4'}`}>
                <div className={`${isLight ? 'flex justify-between items-center border-b border-[#C8DCEB] pb-3 font-mono' : 'flex justify-between items-center border-b border-[#2B2B2B] pb-3 font-mono'}`}>
                  <h3 className={`${isLight ? 'text-sm font-bold uppercase tracking-wider text-[#0B2340] flex items-center gap-2' : 'text-sm font-bold uppercase tracking-wider text-[#FFFFFF] flex items-center gap-2'}`}>
                    <Code2 className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
                    <span>PROJECT WORKSPACE & SUBMISSION</span>
                  </h3>
                  {!team.locked && !isEditing && isLeader && (
                    <AnimatedButton
                      onClick={() => setIsEditing(true)}
                      variant="secondary"
                      size="sm"
                      className={`${isLight ? 'border-[#C8DCEB] text-[#0B2340] hover:bg-[#EFF6FF]' : 'border-[#2B2B2B] text-[#FFFFFF] hover:bg-[#2B2B2B]'}`}
                    >
                      EDIT WORKSPACE
                    </AnimatedButton>
                  )}
                  {!team.locked && !isEditing && !isLeader && (
                    <span className={`${isLight ? 'text-[10px] font-mono text-[#52677D] bg-[#F5FAFE] border border-[#C8DCEB] px-2.5 py-1 rounded font-bold' : 'text-[10px] font-mono text-[#B3B3B3] bg-[#0E0E0E] border border-[#2B2B2B] px-2.5 py-1 rounded font-bold'}`}>
                      VIEW ONLY (LEADER EDITS)
                    </span>
                  )}
                </div>

                {team.locked && (
                  <div className={`${isLight ? 'p-3 bg-[#F5FAFE] border-l-2 border-[#FFFFFF] text-[#52677D] text-xs flex items-center gap-2 font-mono' : 'p-3 bg-[#0E0E0E] border-l-2 border-[#FFFFFF] text-[#B3B3B3] text-xs flex items-center gap-2 font-mono'}`}>
                    <Lock className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
                    <span>WORKSPACE LOCKED: Submission deadline reached.</span>
                  </div>
                )}

                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!projectUrl || !projectUrl.toLowerCase().includes('github.com')) {
                        toast.error('A valid public GitHub repository URL (https://github.com/...) is compulsory.');
                        return;
                      }
                      updateWorkspaceMutation.mutate({
                        projectTitle,
                        problemStatement,
                        projectDesc,
                        projectUrl,
                        demoUrl,
                        presentationUrl,
                        techStack,
                        repoVisibility: 'PUBLIC',
                      });
                    }}
                    className="space-y-4 pt-2 font-mono text-xs"
                  >
                    <div>
                      <label className={`${isLight ? 'block font-bold text-[#52677D] uppercase mb-1' : 'block font-bold text-[#B3B3B3] uppercase mb-1'}`}>
                        PROJECT TITLE
                      </label>
                      <input
                        type="text"
                        required
                        className={`${isLight ? 'w-full h-10 px-4 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]' : 'w-full h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]'}`}
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={`${isLight ? 'block font-bold text-[#52677D] uppercase mb-1' : 'block font-bold text-[#B3B3B3] uppercase mb-1'}`}>
                        PROBLEM STATEMENT
                      </label>
                      <textarea
                        className={`${isLight ? 'w-full h-20 p-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]' : 'w-full h-20 p-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]'}`}
                        value={problemStatement}
                        onChange={(e) => setProblemStatement(e.target.value)}
                        placeholder="Describe the problem being solved..."
                      />
                    </div>
                    <div>
                      <label className={`${isLight ? 'block font-bold text-[#52677D] uppercase mb-1' : 'block font-bold text-[#B3B3B3] uppercase mb-1'}`}>
                        SHORT DESCRIPTION
                      </label>
                      <textarea
                        required
                        className={`${isLight ? 'w-full h-24 p-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]' : 'w-full h-24 p-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]'}`}
                        value={projectDesc}
                        onChange={(e) => setProjectDesc(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`${isLight ? 'block font-bold text-[#52677D] uppercase mb-1' : 'block font-bold text-[#B3B3B3] uppercase mb-1'}`}>TECH STACK</label>
                        <input
                          type="text"
                          className={`${isLight ? 'w-full h-10 px-4 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]' : 'w-full h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]'}`}
                          value={techStack}
                          onChange={(e) => setTechStack(e.target.value)}
                          placeholder="e.g. React, Node.js, Python"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className={`${isLight ? 'block font-bold text-[#52677D] uppercase' : 'block font-bold text-[#B3B3B3] uppercase'}`}>GITHUB REPO URL</label>
                          <span className={`${isLight ? 'text-[9px] font-mono font-bold text-[#0B2340] bg-[#EFF6FF] border border-[#BFDBFE] px-1.5 py-0.5 rounded' : 'text-[9px] font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] border border-[#555555] px-1.5 py-0.5 rounded'}`}>★ COMPULSORY</span>
                        </div>
                        <input
                          type="url"
                          required
                          className={`${isLight ? 'w-full h-10 px-4 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]' : 'w-full h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]'}`}
                          value={projectUrl}
                          onChange={(e) => setProjectUrl(e.target.value)}
                          placeholder="https://github.com/..."
                        />
                      </div>
                    </div>
                    <div className={`${isLight ? 'flex justify-end gap-2 pt-3 border-t border-[#C8DCEB]' : 'flex justify-end gap-2 pt-3 border-t border-[#2B2B2B]'}`}>
                      <AnimatedButton
                        type="button"
                        onClick={() => setIsEditing(false)}
                        variant="secondary"
                        size="sm"
                        className={`${isLight ? 'border-[#C8DCEB] text-[#0B2340]' : 'border-[#2B2B2B] text-[#FFFFFF]'}`}
                      >
                        CANCEL
                      </AnimatedButton>
                      <AnimatedButton
                        type="submit"
                        disabled={updateWorkspaceMutation.isPending}
                        variant="primary"
                        size="sm"
                        className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
                      >
                        {updateWorkspaceMutation.isPending ? 'SAVING...' : 'SAVE WORKSPACE'}
                      </AnimatedButton>
                    </div>
                  </form>
                                  ) : (
                    <div className="space-y-4 pt-1 font-sans">
                      {!team.projectUrl && !team.demoUrl && !team.presentationUrl && (
                        <div className={`p-4 rounded-xl border font-mono text-xs text-center ${isLight ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#0B2340]' : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#D4D4D4]'}`}>
                        <strong>YOUR EVENT WORKSPACE IS READY.</strong><br/>
                        Complete your project details when instructed by the organizers.
                      </div>
                      )}
                      <div>
                      <span className={`${isLight ? 'block text-[10px] font-mono uppercase text-[#52677D] font-bold' : 'block text-[10px] font-mono uppercase text-[#B3B3B3] font-bold'}`}>PROJECT TITLE</span>
                      <p className={`${isLight ? 'text-xl font-bold font-mono text-[#0B2340] mt-1' : 'text-xl font-bold font-mono text-[#FFFFFF] mt-1'}`}>{team.projectTitle || 'No title entered yet'}</p>
                    </div>
                    {team.problemStatement && (
                      <div>
                        <span className={`${isLight ? 'block text-[10px] font-mono uppercase text-[#52677D] font-bold' : 'block text-[10px] font-mono uppercase text-[#B3B3B3] font-bold'}`}>PROBLEM STATEMENT</span>
                        <p className={`${isLight ? 'text-xs text-[#0B63B6] leading-relaxed mt-1' : 'text-xs text-[#D4D4D4] leading-relaxed mt-1'}`}>{team.problemStatement}</p>
                      </div>
                    )}
                    <div>
                      <span className={`${isLight ? 'block text-[10px] font-mono uppercase text-[#52677D] font-bold' : 'block text-[10px] font-mono uppercase text-[#B3B3B3] font-bold'}`}>DESCRIPTION</span>
                      <p className={`${isLight ? 'text-xs text-[#0B63B6] leading-relaxed mt-1' : 'text-xs text-[#D4D4D4] leading-relaxed mt-1'}`}>{team.projectDesc || 'No description provided yet.'}</p>
                    </div>
                    {team.techStack && (
                      <div>
                        <span className={`${isLight ? 'block text-[10px] font-mono uppercase text-[#52677D] font-bold' : 'block text-[10px] font-mono uppercase text-[#B3B3B3] font-bold'}`}>TECH STACK</span>
                        <p className={`${isLight ? 'text-xs font-mono font-semibold text-[#0B2340] mt-1' : 'text-xs font-mono font-semibold text-[#FFFFFF] mt-1'}`}>{team.techStack}</p>
                      </div>
                    )}

                    <div className={`${isLight ? 'grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#C8DCEB] font-mono text-xs' : 'grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#2B2B2B] font-mono text-xs'}`}>
                      <div>
                        <span className={`${isLight ? 'block text-[10px] uppercase text-[#52677D] font-bold' : 'block text-[10px] uppercase text-[#B3B3B3] font-bold'}`}>GITHUB REPO</span>
                        {team.projectUrl ? (
                          <a href={team.projectUrl} target="_blank" rel="noopener noreferrer" className={`${isLight ? 'text-[#0B2340] hover:underline text-xs block mt-1 truncate' : 'text-[#FFFFFF] hover:underline text-xs block mt-1 truncate'}`}>
                            {team.projectUrl}
                          </a>
                        ) : (
                          <span className={`${isLight ? 'text-[#0B63B6] italic text-xs block mt-1 font-bold' : 'text-[#D4D4D4] italic text-xs block mt-1 font-bold'}`}>NOT SUBMITTED</span>
                        )}
                      </div>
                      <div>
                        <span className={`${isLight ? 'block text-[10px] uppercase text-[#52677D] font-bold' : 'block text-[10px] uppercase text-[#B3B3B3] font-bold'}`}>DEMO URL</span>
                        {team.demoUrl ? (
                          <a href={team.demoUrl} target="_blank" rel="noopener noreferrer" className={`${isLight ? 'text-[#0B2340] hover:underline text-xs block mt-1 truncate' : 'text-[#FFFFFF] hover:underline text-xs block mt-1 truncate'}`}>
                            {team.demoUrl}
                          </a>
                        ) : (
                          <span className={`${isLight ? 'text-[#52677D] italic text-xs block mt-1' : 'text-[#B3B3B3] italic text-xs block mt-1'}`}>Not submitted</span>
                        )}
                      </div>
                      <div>
                        <span className={`${isLight ? 'block text-[10px] uppercase text-[#52677D] font-bold' : 'block text-[10px] uppercase text-[#B3B3B3] font-bold'}`}>PRESENTATION</span>
                        {team.presentationUrl ? (
                          <a href={team.presentationUrl} target="_blank" rel="noopener noreferrer" className={`${isLight ? 'text-[#0B2340] hover:underline text-xs block mt-1 truncate' : 'text-[#FFFFFF] hover:underline text-xs block mt-1 truncate'}`}>
                            {team.presentationUrl}
                          </a>
                        ) : (
                          <span className={`${isLight ? 'text-[#52677D] italic text-xs block mt-1' : 'text-[#B3B3B3] italic text-xs block mt-1'}`}>Not submitted</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: QR Code & Attendance Badge */}
            <div className="space-y-6 font-mono text-xs">
              <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-6 rounded-2xl text-center space-y-4 relative overflow-hidden' : 'bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl text-center space-y-4 relative overflow-hidden'}`}>
                <div className="space-y-1">
                  <span className={`${isLight ? 'text-[10px] font-mono text-[#0B2340] bg-[#EFF6FF] px-3 py-1 rounded font-bold uppercase border border-[#BFDBFE]' : 'text-[10px] font-mono text-[#FFFFFF] bg-[#2B2B2B] px-3 py-1 rounded font-bold uppercase border border-[#555555]'}`}>
                    TEAM QR BADGE
                  </span>
                  <p className={`${isLight ? 'text-[11px] text-[#52677D] font-sans mt-1' : 'text-[11px] text-[#B3B3B3] font-sans mt-1'}`}>
                    Present badge to judges for QR speed evaluation.
                  </p>
                </div>

                <div className={`${isLight ? 'flex justify-center bg-white p-3 rounded-xl border border-[#C8DCEB] shadow-md mx-auto max-w-[190px]' : 'flex justify-center bg-white p-3 rounded-xl border border-[#2B2B2B] shadow-md mx-auto max-w-[190px]'}`}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(team.teamCode || team.id)}`}
                    alt="Team QR Code"
                    className="w-36 h-36"
                  />
                </div>

                <div className="space-y-0.5 text-center">
                  <span className={`${isLight ? 'font-mono font-bold text-[#0B2340] text-sm' : 'font-mono font-bold text-[#FFFFFF] text-sm'}`}>{team.teamCode || team.id}</span>
                  <span className={`${isLight ? 'block text-[10px] text-[#0B63B6] uppercase font-mono font-extrabold' : 'block text-[10px] text-[#D4D4D4] uppercase font-mono font-extrabold'}`}>{team.trackName}</span>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <AnimatedButton
                    onClick={() => setIsFullScreen(true)}
                    variant="primary"
                    size="sm"
                    className="w-full bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
                  >
                    FULL SCREEN BADGE
                  </AnimatedButton>
                  <div className="grid grid-cols-2 gap-1.5">
                    <AnimatedButton
                      onClick={downloadQR}
                      variant="secondary"
                      size="sm"
                      className={`${isLight ? 'border-[#C8DCEB] text-[#0B2340]' : 'border-[#2B2B2B] text-[#FFFFFF]'}`}
                    >
                      DOWNLOAD
                    </AnimatedButton>
                    <AnimatedButton
                      onClick={printQR}
                      variant="secondary"
                      size="sm"
                      className={`${isLight ? 'border-[#C8DCEB] text-[#0B2340]' : 'border-[#2B2B2B] text-[#FFFFFF]'}`}
                    >
                      PRINT
                    </AnimatedButton>
                  </div>
                </div>
              </div>

              {/* Attendance Card */}
              <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl space-y-3' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-3'}`}>
                <div className="flex justify-between items-center">
                  <span className={`${isLight ? 'text-xs font-mono font-bold text-[#0B2340] uppercase' : 'text-xs font-mono font-bold text-[#FFFFFF] uppercase'}`}>VENUE ATTENDANCE</span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    team.checkedIn
                      ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                      : 'bg-[#2B2B2B] text-[#B3B3B3] border-[#555555]'
                  }`}>
                    {team.checkedIn ? 'PRESENT' : 'UNCHECKED'}
                  </span>
                </div>

                {team.checkedIn ? (
                  <div className={`${isLight ? 'p-3 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl space-y-1' : 'p-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl space-y-1'}`}>
                    <p className={`${isLight ? 'text-xs text-[#0B2340] font-mono font-bold flex items-center gap-1.5' : 'text-xs text-[#FFFFFF] font-mono font-bold flex items-center gap-1.5'}`}>
                      <CheckCircle2 className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
                      Verified PRESENT at Venue
                    </p>
                    <p className={`${isLight ? 'text-[10px] font-mono text-[#52677D]' : 'text-[10px] font-mono text-[#B3B3B3]'}`}>
                      Time: {team.checkInTime ? new Date(team.checkInTime).toLocaleString() : 'Recorded'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1 font-sans">
                    <p className={`${isLight ? 'text-xs text-[#0B63B6]' : 'text-xs text-[#D4D4D4]'}`}>
                      Scan the <strong className={`${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>Venue Check-In QR Code</strong> at the admin desk to mark Present.
                    </p>
                    <AnimatedButton
                      onClick={() => {
                        setScanError(null);
                        setScannerOpen(true);
                      }}
                      variant="primary"
                      size="sm"
                      className="w-full bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
                    >
                      SCAN VENUE QR CODE
                    </AnimatedButton>
                  </div>
                )}
              </div>

              {/* Evaluation Progress Card */}
              <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl space-y-3' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-3'}`}>
                <h3 className={`${isLight ? 'text-xs font-mono font-bold text-[#0B2340] uppercase tracking-wider' : 'text-xs font-mono font-bold text-[#FFFFFF] uppercase tracking-wider'}`}>EVALUATION PROGRESS</h3>
                {team.reviews.length === 0 ? (
                  <p className={`${isLight ? 'text-xs text-[#52677D] italic' : 'text-xs text-[#B3B3B3] italic'}`}>No reviews submitted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {team.reviews.map((rev: any) => (
                      <div key={rev.id} className={`${isLight ? 'flex justify-between items-center bg-[#F5FAFE] p-2.5 rounded-xl border border-[#C8DCEB] text-xs' : 'flex justify-between items-center bg-[#0E0E0E] p-2.5 rounded-xl border border-[#2B2B2B] text-xs'}`}>
                        <span className={`${isLight ? 'font-bold text-[#0B2340] font-mono' : 'font-bold text-[#FFFFFF] font-mono'}`}>{rev.roundName}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${getProgressLabelStyles(rev.progressLabel)}`}>
                          {rev.progressLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div
            key="reviews"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 font-mono"
          >
            <h3 className={`${isLight ? 'text-lg font-bold text-[#0B2340] uppercase tracking-wider' : 'text-lg font-bold text-[#FFFFFF] uppercase tracking-wider'}`}>JUDGE EVALUATION FEEDBACK LOGS</h3>
            {team.reviews.length === 0 ? (
              <div className={`${isLight ? 'p-8 border border-dashed border-[#C8DCEB] rounded-2xl text-center text-[#52677D] font-mono text-xs bg-white' : 'p-8 border border-dashed border-[#2B2B2B] rounded-2xl text-center text-[#B3B3B3] font-mono text-xs bg-[#181818]'}`}>
                AWAITING EVALUATION FEEDBACK FROM JUDGES.
              </div>
            ) : (
              <div className="space-y-3">
                {team.reviews.map((rev: any) => (
                  <div key={rev.id} className={`${isLight ? 'p-5 bg-white border border-[#C8DCEB] rounded-2xl space-y-3' : 'p-5 bg-[#181818] border border-[#2B2B2B] rounded-2xl space-y-3'}`}>
                    <div className={`${isLight ? 'flex justify-between items-center border-b border-[#C8DCEB] pb-2' : 'flex justify-between items-center border-b border-[#2B2B2B] pb-2'}`}>
                      <h4 className={`${isLight ? 'text-sm font-bold text-[#0B2340]' : 'text-sm font-bold text-[#FFFFFF]'}`}>{rev.roundName}</h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${getProgressLabelStyles(rev.progressLabel)}`}>
                        {rev.progressLabel}
                      </span>
                    </div>
                    {rev.comments ? (
                      <p className={`${isLight ? 'text-xs text-[#0B63B6] font-sans leading-relaxed italic bg-[#F5FAFE] p-3 rounded-xl border border-[#C8DCEB]' : 'text-xs text-[#D4D4D4] font-sans leading-relaxed italic bg-[#0E0E0E] p-3 rounded-xl border border-[#2B2B2B]'}`}>
                        "{rev.comments}"
                      </p>
                    ) : (
                      <p className={`${isLight ? 'text-xs text-[#52677D] italic' : 'text-xs text-[#B3B3B3] italic'}`}>Evaluated with no written remarks.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'team' && (
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 font-mono"
          >
            <h3 className={`${isLight ? 'text-lg font-bold text-[#0B2340] uppercase tracking-wider' : 'text-lg font-bold text-[#FFFFFF] uppercase tracking-wider'}`}>TEAM ROSTER & MEMBERS</h3>
            <div className={`${isLight ? 'bg-white border border-[#C8DCEB] rounded-2xl overflow-hidden divide-y divide-[#2B2B2B]' : 'bg-[#181818] border border-[#2B2B2B] rounded-2xl overflow-hidden divide-y divide-[#2B2B2B]'}`}>
              {team.members.map((member: any) => (
                <div key={member.id} className="p-4 flex justify-between items-center">
                  <div>
                    <span className={`${isLight ? 'font-bold text-sm text-[#0B2340] font-sans block' : 'font-bold text-sm text-[#FFFFFF] font-sans block'}`}>{member.name}</span>
                    <span className={`${isLight ? 'text-xs text-[#52677D] font-mono' : 'text-xs text-[#B3B3B3] font-mono'}`}>{member.email}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border
                    ${member.role === 'LEADER' ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]' : 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B]'}`}>
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'questions' && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 font-mono"
          >
            <div className="flex justify-between items-center">
              <h3 className={`${isLight ? 'text-lg font-bold text-[#0B2340] uppercase tracking-wider' : 'text-lg font-bold text-[#FFFFFF] uppercase tracking-wider'}`}>SUPPORT REQUESTS</h3>
              <AnimatedButton
                onClick={() => navigate('/questions')}
                variant="primary"
                size="sm"
                className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
              >
                HELP DESK CONSOLE
              </AnimatedButton>
            </div>
            <div className={`${isLight ? 'p-8 text-center space-y-4 bg-white border border-[#C8DCEB] rounded-2xl' : 'p-8 text-center space-y-4 bg-[#181818] border border-[#2B2B2B] rounded-2xl'}`}>
              <HelpCircle className={`${isLight ? 'w-10 h-10 text-[#0B2340] mx-auto' : 'w-10 h-10 text-[#FFFFFF] mx-auto'}`} />
              <div>
                <h4 className={`${isLight ? 'text-base font-bold text-[#0B2340] uppercase' : 'text-base font-bold text-[#FFFFFF] uppercase'}`}>NEED TECHNICAL OR ORGANIZATIONAL HELP?</h4>
                <p className={`${isLight ? 'text-xs text-[#52677D] font-sans max-w-md mx-auto mt-1' : 'text-xs text-[#B3B3B3] font-sans max-w-md mx-auto mt-1'}`}>
                  Submit technical or venue tickets to hackathon organizers and track response status in real time.
                </p>
              </div>
              <AnimatedButton
                onClick={() => navigate('/questions')}
                variant="primary"
                size="md"
                className="mx-auto bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
              >
                OPEN HELP DESK PORTAL
              </AnimatedButton>
            </div>
          </motion.div>
        )}

        {activeTab === 'announcements' && (
          <motion.div
            key="announcements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 font-mono"
          >
            <h3 className={`${isLight ? 'text-lg font-bold text-[#0B2340] uppercase tracking-wider' : 'text-lg font-bold text-[#FFFFFF] uppercase tracking-wider'}`}>SYSTEM BROADCASTS & ALERTS</h3>
            {announcementsLoading ? (
              <p className={`${isLight ? 'text-xs font-mono text-[#52677D] animate-pulse text-center p-8' : 'text-xs font-mono text-[#B3B3B3] animate-pulse text-center p-8'}`}>LOADING BROADCASTS...</p>
            ) : !announcementsData || announcementsData.length === 0 ? (
              <div className={`${isLight ? 'p-8 border border-dashed border-[#C8DCEB] rounded-2xl text-center text-[#52677D] font-mono text-xs bg-white' : 'p-8 border border-dashed border-[#2B2B2B] rounded-2xl text-center text-[#B3B3B3] font-mono text-xs bg-[#181818]'}`}>
                NO ACTIVE BROADCASTS PUBLISHED YET.
              </div>
            ) : (
              <div className="space-y-3">
                {announcementsData.map((notif: any) => (
                  <div key={notif.id} className={`${isLight ? 'p-4 space-y-1 bg-white border border-[#C8DCEB] rounded-2xl' : 'p-4 space-y-1 bg-[#181818] border border-[#2B2B2B] rounded-2xl'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`${isLight ? 'font-bold text-sm text-[#0B2340] font-sans' : 'font-bold text-sm text-[#FFFFFF] font-sans'}`}>{notif.title}</span>
                      <span className={`${isLight ? 'text-[10px] text-[#52677D]' : 'text-[10px] text-[#B3B3B3]'}`}>
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`${isLight ? 'text-xs text-[#0B63B6] font-sans' : 'text-xs text-[#D4D4D4] font-sans'}`}>{notif.content}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen QR Modal */}
      {isFullScreen && (
        <div
          className={`${isLight ? 'fixed inset-0 bg-[#F5FAFE]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none font-mono' : 'fixed inset-0 bg-[#0E0E0E]/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none font-mono'}`}
          onClick={() => setIsFullScreen(false)}
        >
          <div
            className={`${isLight ? 'bg-white border border-[#C8DCEB] p-8 rounded-2xl max-w-sm w-full text-center space-y-5 relative shadow-2xl text-[#0B2340]' : 'bg-[#181818] border border-[#2B2B2B] p-8 rounded-2xl max-w-sm w-full text-center space-y-5 relative shadow-2xl text-[#FFFFFF]'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsFullScreen(false)}
              className={`${isLight ? 'absolute top-4 right-4 w-7 h-7 rounded border border-[#C8DCEB] bg-[#F5FAFE] text-[#52677D] hover:text-white flex items-center justify-center text-xs font-bold' : 'absolute top-4 right-4 w-7 h-7 rounded border border-[#2B2B2B] bg-[#0E0E0E] text-[#B3B3B3] hover:text-white flex items-center justify-center text-xs font-bold'}`}
            >
              <X className="w-4 h-4" />
            </button>
            <span className={`${isLight ? 'text-[10px] text-[#0B2340] bg-[#EFF6FF] border border-[#BFDBFE] px-3 py-1 rounded font-bold uppercase' : 'text-[10px] text-[#FFFFFF] bg-[#2B2B2B] border border-[#555555] px-3 py-1 rounded font-bold uppercase'}`}>
              SMART HORIZON QR BADGE
            </span>
            <h3 className={`${isLight ? 'text-2xl font-extrabold text-[#0B2340] font-sans' : 'text-2xl font-extrabold text-white font-sans'}`}>{team.name}</h3>
            <p className={`${isLight ? 'text-xs text-[#0B63B6] font-bold' : 'text-xs text-[#D4D4D4] font-bold'}`}>{team.trackName}</p>
            <div className={`${isLight ? 'bg-white p-4 rounded-xl border border-[#C8DCEB] inline-block shadow-md' : 'bg-white p-4 rounded-xl border border-[#2B2B2B] inline-block shadow-md'}`}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(team.teamCode || team.id)}`}
                alt="Full QR"
                className="w-56 h-56"
              />
            </div>
            <p className={`${isLight ? 'text-xs text-[#52677D] font-bold' : 'text-xs text-[#B3B3B3] font-bold'}`}>{team.teamCode || team.id}</p>
          </div>
        </div>
      )}

      {/* QR Modals */}
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

export default StudentDashboard;

