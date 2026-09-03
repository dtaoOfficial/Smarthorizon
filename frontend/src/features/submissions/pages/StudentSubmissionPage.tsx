import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Edit2,
  Download,
  X,
  FileCode,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { useToast } from '../../../context/ToastContext';
import { useTheme } from '../../../context/ThemeContext';

export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isValidGitHubUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    /^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(\/)?$/i.test(trimmed) ||
    (trimmed.toLowerCase().includes('github.com/') && trimmed.startsWith('https://'))
  );
}

export const StudentSubmissionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { isLight } = useTheme();

  const [projectTitle, setProjectTitle] = useState('');
  const [projectAbstract, setProjectAbstract] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [presentationUrl, setPresentationUrl] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>(0);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch Team Submission & Submissions Open Status
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-team-submission'],
    queryFn: () => api.get('/submissions/my-team'),
  });

  const isCurrentlyOpen = data?.isCurrentlyOpen ?? false;
  const isLeader = data?.isLeader ?? true;
  const team = data?.team;
  const existingSubmission = data?.submission;

  // Initialize Form Data when fetched
  useEffect(() => {
    if (existingSubmission) {
      setProjectTitle(existingSubmission.projectTitle || '');
      setProjectAbstract(existingSubmission.projectAbstract || '');
      setGithubUrl(existingSubmission.githubUrl || '');
      setPresentationUrl(existingSubmission.presentationUrl || '');
      setOriginalFileName(existingSubmission.originalFileName || '');
      setFileSize(existingSubmission.fileSize || 0);
    } else if (team) {
      if (team.projectTitle) setProjectTitle(team.projectTitle);
      if (team.projectDesc) setProjectAbstract(team.projectDesc);
      if (team.projectUrl) setGithubUrl(team.projectUrl);
      if (team.presentationUrl) setPresentationUrl(team.presentationUrl);
    }
  }, [existingSubmission, team]);

  // Handle Presentation Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.ppt', '.pptx'].includes(ext)) {
      toast.error('Only PowerPoint presentation files (.ppt, .pptx) are allowed.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds maximum limit of 25 MB.');
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    try {
      const formData = new FormData();
      formData.append('presentation', file);

      const timer = setInterval(() => {
        setUploadProgress((prev) => (prev >= 85 ? 85 : prev + 10));
      }, 150);

      // Do NOT set explicit Content-Type header for FormData; fetch will set boundary automatically
      const res: any = await api.post('/submissions/upload-presentation', formData);

      clearInterval(timer);
      setUploadProgress(100);

      if (res.success) {
        setPresentationUrl(res.presentationUrl);
        setOriginalFileName(res.originalFileName);
        setFileSize(res.fileSize);
        toast.success(res.message || 'PowerPoint presentation uploaded successfully!');
      } else {
        toast.error(res.error || 'Failed to upload presentation file.');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      toast.error(err.message || 'Failed to upload presentation file.');
      setPresentationUrl('');
      setOriginalFileName('');
      setFileSize(0);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 300);
    }
  };

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (payload: any) => api.post('/submissions/submit', payload),
    onSuccess: (res: any) => {
      toast.success(res.message || 'Project submitted successfully!');
      setIsReviewModalOpen(false);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['my-team-submission'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit project.');
    },
  });

  const wordCount = countWords(projectAbstract);
  const isAbstractTooLong = wordCount > 100;
  const isTitleValid = projectTitle.trim().length >= 3 && projectTitle.trim().length <= 150;
  const isGitHubValid = isValidGitHubUrl(githubUrl);
  const isPresentationUploaded = !!presentationUrl;

  const canSubmit = isCurrentlyOpen && isTitleValid && !isAbstractTooLong && wordCount >= 5 && isGitHubValid && isPresentationUploaded;

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCurrentlyOpen) {
      toast.error('Project submissions are currently closed by administration.');
      return;
    }
    if (!isTitleValid) {
      toast.error('Project Title must be between 3 and 150 characters.');
      return;
    }
    if (wordCount < 5) {
      toast.error('Project Abstract must contain at least 5 words.');
      return;
    }
    if (isAbstractTooLong) {
      toast.error(`Project Abstract exceeds 100 words (${wordCount}/100 words).`);
      return;
    }
    if (!isGitHubValid) {
      toast.error('Please enter a valid public GitHub repository URL (https://github.com/...).');
      return;
    }
    if (!isPresentationUploaded) {
      toast.error('Please upload your PowerPoint presentation file.');
      return;
    }

    setIsReviewModalOpen(true);
  };

  const handleConfirmFinalSubmit = () => {
    submitMutation.mutate({
      projectTitle: projectTitle.trim(),
      projectAbstract: projectAbstract.trim(),
      githubUrl: githubUrl.trim(),
      presentationUrl,
      originalFileName,
      fileSize,
    });
  };

  if (isLoading) {
    return (
      <div className={`${isLight ? 'flex flex-col items-center justify-center p-16 bg-white border border-[#C8DCEB] rounded-2xl min-h-[400px] text-center font-mono select-none' : 'flex flex-col items-center justify-center p-16 bg-[#181818] border border-[#2B2B2B] rounded-2xl min-h-[400px] text-center font-mono select-none'}`}>
        <div className="w-10 h-10 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin mb-3" />
        <p className={`${isLight ? 'text-xs text-[#0B63B6] animate-pulse font-bold tracking-wider' : 'text-xs text-[#D4D4D4] animate-pulse font-bold tracking-wider'}`}>SYNCING PROJECT SUBMISSION TERMINAL...</p>
      </div>
    );
  }

  const hasSubmitted = !!existingSubmission;
  const showForm = !hasSubmitted || isEditing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-6 text-left select-none max-w-5xl mx-auto font-sans pb-10 sm:pb-16 ${
        isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
      }`}
    >
      {/* HEADER BANNER */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-mono transition-colors duration-300 ${
        isLight
          ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)] text-[#0B2340]'
          : 'bg-[#181818] border-[#2B2B2B] shadow-xl text-[#FFFFFF]'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${
              isCurrentlyOpen ? (isLight ? 'bg-[#1687D9] animate-pulse' : 'bg-[#FFFFFF] animate-pulse') : 'bg-rose-400'
            }`} />
            <span className={`font-bold tracking-wider ${
              isCurrentlyOpen ? (isLight ? 'text-[#0B63B6]' : 'text-[#FFFFFF]') : 'text-rose-300'
            }`}>
              {isCurrentlyOpen ? '● SUBMISSIONS OPEN' : '○ SUBMISSIONS CLOSED'}
            </span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold font-outfit tracking-tight ${
            isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'
          }`}>
            PROJECT SUBMISSION <span className={isLight ? 'text-[#1687D9]' : 'text-[#D4D4D4]'}>//</span> TERMINAL
          </h1>
          <p className={`text-xs mt-0.5 font-mono ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
            SMART HORIZON 2026 &bull; OFFICIAL TEAM PROJECT DELIVERABLES DOCK
          </p>
        </div>

        {team && (
          <div className={`p-4 rounded-xl border text-right font-mono text-xs w-full md:w-auto ${
            isLight ? 'bg-[#F5FAFE] border-[#C8DCEB]' : 'bg-[#0E0E0E] border-[#2B2B2B]'
          }`}>
            <span className={`text-[10px] block font-bold uppercase ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>TEAM CODE</span>
            <span className={`text-sm font-bold ${isLight ? 'text-[#1687D9]' : 'text-[#FFFFFF]'}`}>{team.teamCode || team.id}</span>
            <span className={`block text-[10px] font-semibold ${isLight ? 'text-[#0B2340]' : 'text-[#D4D4D4]'}`}>{team.name} ({team.trackName})</span>
          </div>
        )}
      </div>

      {/* CLOSED ALERT BANNER */}
      {!isCurrentlyOpen && (
        <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 font-mono text-xs flex items-center gap-3 font-bold shadow-lg">
          <Lock className="w-6 h-6 text-rose-400 shrink-0" />
          <div>
            <h4 className={`${isLight ? 'text-sm font-extrabold text-[#0B2340]' : 'text-sm font-extrabold text-[#FFFFFF]'}`}>Submissions are currently closed</h4>
            <p className="text-xs text-rose-200 font-normal mt-0.5">
              The hackathon administration has closed submission access. Participants cannot submit or update project deliverables at this time.
            </p>
          </div>
        </div>
      )}

      {/* SUBMISSION RECEIVED SUCCESS CARD */}
      {hasSubmitted && !isEditing && (
        <AnimatedCard glow className={`${isLight ? 'p-6 bg-white border border-[#C8DCEB] space-y-5 font-mono' : 'p-6 bg-[#181818] border border-[#2B2B2B] space-y-5 font-mono'}`}>
          <div className={`${isLight ? 'flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C8DCEB] pb-4 gap-3' : 'flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#2B2B2B] pb-4 gap-3'}`}>
            <div className="flex items-center gap-3">
              <div className={`${isLight ? 'w-12 h-12 rounded-xl bg-[#F5FAFE] border border-[#BFDBFE] text-[#0B2340] flex items-center justify-center font-bold text-2xl shadow-md' : 'w-12 h-12 rounded-xl bg-[#0E0E0E] border border-[#555555] text-[#FFFFFF] flex items-center justify-center font-bold text-2xl shadow-md'}`}>
                ✓
              </div>
              <div>
                <span className={`${isLight ? 'text-[10px] font-bold text-[#0B2340] uppercase tracking-wider block' : 'text-[10px] font-bold text-[#FFFFFF] uppercase tracking-wider block'}`}>STATUS: SUBMITTED (v{existingSubmission.version})</span>
                <h3 className={`${isLight ? 'text-xl font-extrabold font-mono text-[#0B2340]' : 'text-xl font-extrabold font-mono text-[#FFFFFF]'}`}>Submission Received</h3>
                <span className={`${isLight ? 'text-xs text-[#52677D]' : 'text-xs text-[#B3B3B3]'}`}>
                  Submitted on: {new Date(existingSubmission.updatedAt || existingSubmission.submittedAt).toLocaleString()}
                </span>
              </div>
            </div>

            {isCurrentlyOpen && (
              <AnimatedButton
                onClick={() => setIsEditing(true)}
                variant="secondary"
                size="sm"
                className={`${isLight ? 'border-[#C8DCEB] text-[#0B2340]' : 'border-[#2B2B2B] text-[#FFFFFF]'}`}
              >
                UPDATE SUBMISSION
              </AnimatedButton>
            )}
          </div>

          {/* Submitted Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className={`${isLight ? 'p-4 bg-[#F5FAFE] rounded-xl border border-[#BFDBFE] space-y-1' : 'p-4 bg-[#0E0E0E] rounded-xl border border-[#555555] space-y-1'}`}>
              <span className={`${isLight ? 'text-[10px] text-[#52677D] font-extrabold uppercase block' : 'text-[10px] text-[#E5E5E5] font-extrabold uppercase block'}`}>PROJECT TITLE</span>
              <p className={`${isLight ? 'font-bold text-[#0B2340] text-sm' : 'font-bold text-white text-sm'}`}>{existingSubmission.projectTitle}</p>
            </div>

            <div className={`${isLight ? 'p-4 bg-[#F5FAFE] rounded-xl border border-[#BFDBFE] space-y-1' : 'p-4 bg-[#0E0E0E] rounded-xl border border-[#555555] space-y-1'}`}>
              <span className={`${isLight ? 'text-[10px] text-[#52677D] font-extrabold uppercase block' : 'text-[10px] text-[#E5E5E5] font-extrabold uppercase block'}`}>PUBLIC GITHUB REPOSITORY</span>
              <a
                href={existingSubmission.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="font-extrabold text-[#60A5FA] hover:underline truncate block"
              >
                {existingSubmission.githubUrl}
              </a>
            </div>

            <div className={`${isLight ? 'md:col-span-2 p-4 bg-[#F5FAFE] rounded-xl border border-[#BFDBFE] space-y-1' : 'md:col-span-2 p-4 bg-[#0E0E0E] rounded-xl border border-[#555555] space-y-1'}`}>
              <div className="flex justify-between items-center">
                <span className={`${isLight ? 'text-[10px] text-[#52677D] font-extrabold uppercase' : 'text-[10px] text-[#E5E5E5] font-extrabold uppercase'}`}>PROJECT ABSTRACT</span>
                <span className={`${isLight ? 'text-[10px] text-white bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded font-extrabold' : 'text-[10px] text-white bg-[#2B2B2B] border border-[#555555] px-2 py-0.5 rounded font-extrabold'}`}>
                  {countWords(existingSubmission.projectAbstract)} / 100 WORDS
                </span>
              </div>
              <p className={`${isLight ? 'text-xs text-[#52677D] leading-relaxed italic bg-white p-3 rounded-xl border border-[#BFDBFE] mt-1 font-sans' : 'text-xs text-[#E5E5E5] leading-relaxed italic bg-[#181818] p-3 rounded-xl border border-[#555555] mt-1 font-sans'}`}>
                "{existingSubmission.projectAbstract}"
              </p>
            </div>

            <div className={`${isLight ? 'md:col-span-2 p-4 bg-[#F5FAFE] rounded-xl border border-[#BFDBFE] flex items-center justify-between' : 'md:col-span-2 p-4 bg-[#0E0E0E] rounded-xl border border-[#555555] flex items-center justify-between'}`}>
              <div className="flex items-center gap-3">
                <FileCode className={`${isLight ? 'w-6 h-6 text-[#0B2340]' : 'w-6 h-6 text-white'}`} />
                <div>
                  <span className={`${isLight ? 'font-bold text-[#0B2340] text-xs block' : 'font-bold text-white text-xs block'}`}>{existingSubmission.originalFileName}</span>
                  <span className={`${isLight ? 'text-[10px] text-[#52677D] font-mono font-bold' : 'text-[10px] text-[#E5E5E5] font-mono font-bold'}`}>
                    Size: {(existingSubmission.fileSize / (1024 * 1024)).toFixed(2)} MB &bull; PowerPoint Presentation
                  </span>
                </div>
              </div>
              <a
                href={team?.id ? api.getAuthDownloadUrl(`/submissions/download/${team.id}`) : '#'}
                download
                className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] text-[#0E0E0E] text-xs font-bold font-mono flex items-center gap-1.5 hover:bg-[#D4D4D4]"
              >
                <Download className="w-4 h-4" />
                DOWNLOAD PPT
              </a>
            </div>
          </div>
        </AnimatedCard>
      )}

      {/* FORM INTERFACE */}
      {showForm && (
        <form onSubmit={handleOpenReview} className="space-y-6">
          <div className={`p-6 rounded-2xl border shadow-xl space-y-6 font-mono transition-colors duration-300 ${
            isLight
              ? 'bg-white border-[#C8DCEB] shadow-[0_8px_30px_rgba(30,80,120,0.08)] text-[#0B2340]'
              : 'bg-[#181818] border-[#2B2B2B] text-[#FFFFFF]'
          }`}>
            <div className={`border-b pb-3 flex justify-between items-center ${isLight ? 'border-[#C8DCEB]' : 'border-[#2B2B2B]'}`}>
              <div>
                <h2 className={`text-lg font-bold font-mono ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>
                  {hasSubmitted ? 'UPDATE PROJECT SUBMISSION' : 'SUBMIT PROJECT DELIVERABLES'}
                </h2>
                <p className={`text-xs ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
                  All fields are compulsory for team evaluation by jury panel.
                </p>
              </div>
              {hasSubmitted && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`text-xs underline ${isLight ? 'text-[#1687D9] hover:text-[#0B63B6]' : 'text-[#B3B3B3] hover:text-[#FFFFFF]'}`}
                >
                  Cancel Editing
                </button>
              )}
            </div>

            {/* 1. PROJECT TITLE */}
            <div className="space-y-1.5">
              <label className={`block text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>
                1. Project Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                disabled={!isCurrentlyOpen}
                placeholder="e.g. WellWare: AI-Powered Autonomous Health Diagnostic Engine"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                maxLength={150}
                className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none disabled:opacity-50 font-mono ${
                  isLight
                    ? 'bg-[#F5FAFE] border border-[#C8DCEB] text-[#0B2340] focus:border-[#1687D9] placeholder-[#94A3B8]'
                    : 'bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] focus:border-[#FFFFFF] placeholder:#B3B3B3'
                }`}
              />
              <div className={`${isLight ? 'flex justify-between text-[10px] text-[#52677D]' : 'flex justify-between text-[10px] text-[#B3B3B3]'}`}>
                <span>Minimum 3 characters, maximum 150 characters.</span>
                <span className={projectTitle.length > 150 ? 'text-rose-400 font-bold' : ''}>
                  {projectTitle.length} / 150 chars
                </span>
              </div>
            </div>

            {/* 2. PROJECT ABSTRACT (MAX 100 WORDS) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className={`${isLight ? 'block text-xs font-bold text-[#0B2340] uppercase tracking-wider' : 'block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider'}`}>
                  2. Project Abstract <span className="text-rose-400">*</span>
                </label>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                    isAbstractTooLong
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-500/40'
                      : wordCount > 0
                      ? 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555]'
                      : 'text-[#B3B3B3]'
                  }`}
                >
                  {wordCount} / 100 WORDS
                </span>
              </div>
              <textarea
                disabled={!isCurrentlyOpen}
                rows={5}
                placeholder="Enter concise project summary highlighting problem statement, tech stack, architecture, innovation, and key impact (strictly <= 100 words)..."
                value={projectAbstract}
                onChange={(e) => setProjectAbstract(e.target.value)}
                className={`w-full p-4 bg-[#0E0E0E] border rounded-xl text-xs text-[#FFFFFF] focus:outline-none placeholder:#B3B3B3 disabled:opacity-50 leading-relaxed font-sans ${
                  isAbstractTooLong
                    ? 'border-rose-500/60 focus:border-rose-500'
                    : 'border-[#2B2B2B] focus:border-[#FFFFFF]'
                }`}
              />
              {isAbstractTooLong && (
                <p className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  Abstract exceeds 100 words! Please trim {wordCount - 100} word(s) before submitting.
                </p>
              )}
            </div>

            {/* 3. PUBLIC GITHUB REPOSITORY URL */}
            <div className="space-y-1.5">
              <label className={`${isLight ? 'block text-xs font-bold text-[#0B2340] uppercase tracking-wider' : 'block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider'}`}>
                3. Public GitHub Repository URL <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Code2 className={`${isLight ? 'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#52677D]' : 'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B3B3B3]'}`} />
                <input
                  type="url"
                  disabled={!isCurrentlyOpen}
                  placeholder="https://github.com/your-username/your-repository"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#0E0E0E] border rounded-xl text-xs text-[#FFFFFF] focus:outline-none placeholder:#B3B3B3 disabled:opacity-50 font-mono ${
                    githubUrl && !isGitHubValid
                      ? 'border-rose-500/60 focus:border-rose-500'
                      : 'border-[#2B2B2B] focus:border-[#FFFFFF]'
                  }`}
                />
              </div>
              {githubUrl && !isGitHubValid && (
                <p className="text-[11px] text-rose-400 font-bold">
                  Must be a valid public GitHub URL starting with https://github.com/
                </p>
              )}
            </div>

            {/* 4. POWERPOINT PRESENTATION UPLOAD (PPT / PPTX) */}
            <div className="space-y-2">
              <label className={`${isLight ? 'block text-xs font-bold text-[#0B2340] uppercase tracking-wider' : 'block text-xs font-bold text-[#FFFFFF] uppercase tracking-wider'}`}>
                4. PowerPoint Presentation (.ppt / .pptx) <span className="text-rose-400">*</span>
              </label>

              {presentationUrl ? (
                <div className={`${isLight ? 'p-4 bg-[#F5FAFE] border-2 border-[#38BDF8] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md' : 'p-4 bg-[#0E0E0E] border-2 border-[#38BDF8] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md'}`}>
                  <div className="flex items-center gap-3">
                    <FileCode className="w-8 h-8 text-[#38BDF8]" />
                    <div>
                      <span className="font-extrabold text-[#F8FAFC] text-xs block font-mono">{originalFileName || 'presentation.pptx'}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#34D399] font-extrabold font-mono">✓ POWERPOINT ATTACHED</span>
                        <span className="text-[10px] text-[#CBD5E1] font-mono">({(fileSize / (1024 * 1024)).toFixed(2)} MB &bull; PowerPoint Presentation)</span>
                      </div>
                    </div>
                  </div>
                  {isCurrentlyOpen && (
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[#1E293B] border-2 border-[#64748B] text-[#F8FAFC] hover:bg-[#334155] hover:border-[#38BDF8] text-xs font-extrabold font-mono transition-all">
                      REPLACE FILE
                      <input
                        type="file"
                        accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/octet-stream"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              ) : (
                <div className={`${isLight ? 'border-2 border-dashed border-[#475569] hover:border-[#38BDF8] bg-[#F5FAFE] p-6 rounded-2xl text-center space-y-2 transition-all' : 'border-2 border-dashed border-[#475569] hover:border-[#38BDF8] bg-[#0E0E0E] p-6 rounded-2xl text-center space-y-2 transition-all'}`}>
                  <UploadCloud className="w-10 h-10 text-[#38BDF8] mx-auto" />
                  <div>
                    <p className="text-xs font-extrabold text-[#F8FAFC] font-mono">Click to select or drag & drop presentation file</p>
                    <p className="text-[10px] text-[#94A3B8] font-mono font-bold mt-0.5">ACCEPTED: .PPT / .PPTX &bull; MAXIMUM SIZE: 25 MB</p>
                  </div>
                  {isCurrentlyOpen && (
                    <label className="inline-block px-4 py-2 rounded-xl bg-[#0284C7] border-2 border-[#38BDF8] text-white font-extrabold hover:bg-[#0369A1] text-xs cursor-pointer shadow-md transition-all font-mono">
                      BROWSE FILES
                      <input
                        type="file"
                        accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/octet-stream"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading || !isCurrentlyOpen}
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="space-y-1 pt-1 font-mono">
                  <div className={`${isLight ? 'flex justify-between text-[10px] text-[#0B2340] font-bold' : 'flex justify-between text-[10px] text-[#FFFFFF] font-bold'}`}>
                    <span>UPLOADING PRESENTATION FILE...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className={`${isLight ? 'w-full h-1.5 bg-[#F5FAFE] rounded overflow-hidden border border-[#C8DCEB]' : 'w-full h-1.5 bg-[#0E0E0E] rounded overflow-hidden border border-[#2B2B2B]'}`}>
                    <div className="h-full bg-[#FFFFFF] transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <div className={`${isLight ? 'pt-4 border-t border-[#C8DCEB] flex justify-end' : 'pt-4 border-t border-[#2B2B2B] flex justify-end'}`}>
              <AnimatedButton
                type="submit"
                variant="primary"
                size="md"
                disabled={!canSubmit || submitMutation.isPending}
                className="w-full sm:w-auto px-8 bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
              >
                {submitMutation.isPending ? 'PROCESSING SUBMISSION...' : 'REVIEW & SUBMIT PROJECT'}
              </AnimatedButton>
            </div>
          </div>
        </form>
      )}

      {/* PRE-SUBMISSION CONFIRMATION MODAL */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <div className={`${isLight ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#F5FAFE]/80 backdrop-blur-md select-none font-mono' : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E0E0E]/80 backdrop-blur-md select-none font-mono'}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`${isLight ? 'bg-white border border-[#C8DCEB] p-6 rounded-2xl max-w-2xl w-full text-[#0B2340] space-y-5 shadow-2xl relative' : 'bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl max-w-2xl w-full text-[#FFFFFF] space-y-5 shadow-2xl relative'}`}
            >
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className={`${isLight ? 'absolute top-4 right-4 text-[#52677D] hover:text-[#0B2340]' : 'absolute top-4 right-4 text-[#B3B3B3] hover:text-[#FFFFFF]'}`}
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <span className={`${isLight ? 'text-[10px] font-bold text-[#0B2340] uppercase tracking-wider block' : 'text-[10px] font-bold text-[#FFFFFF] uppercase tracking-wider block'}`}>CONFIRMATION CHECK</span>
                <h3 className={`${isLight ? 'text-xl font-extrabold font-mono text-[#0B2340] mt-0.5' : 'text-xl font-extrabold font-mono text-[#FFFFFF] mt-0.5'}`}>
                  Review Project Deliverables
                </h3>
                <p className={`${isLight ? 'text-xs text-[#52677D]' : 'text-xs text-[#B3B3B3]'}`}>
                  Please verify your submitted project information before final lock.
                </p>
              </div>

              <div className="space-y-3 text-xs font-mono max-h-80 overflow-y-auto pr-1 hide-scrollbar">
                <div className={`${isLight ? 'p-4 bg-[#F5FAFE] rounded-xl border border-[#C8DCEB]' : 'p-4 bg-[#0E0E0E] rounded-xl border border-[#2B2B2B]'}`}>
                  <span className={`${isLight ? 'text-[9px] text-[#52677D] block uppercase font-bold' : 'text-[9px] text-[#B3B3B3] block uppercase font-bold'}`}>PROJECT TITLE</span>
                  <span className={`${isLight ? 'font-bold text-[#0B2340] text-sm' : 'font-bold text-[#FFFFFF] text-sm'}`}>{projectTitle}</span>
                </div>

                <div className={`${isLight ? 'p-4 bg-[#F5FAFE] rounded-xl border border-[#C8DCEB]' : 'p-4 bg-[#0E0E0E] rounded-xl border border-[#2B2B2B]'}`}>
                  <span className={`${isLight ? 'text-[9px] text-[#52677D] block uppercase font-bold' : 'text-[9px] text-[#B3B3B3] block uppercase font-bold'}`}>PUBLIC GITHUB REPOSITORY</span>
                  <span className={`${isLight ? 'font-bold text-[#0B2340]' : 'font-bold text-[#FFFFFF]'}`}>{githubUrl}</span>
                </div>

                <div className={`${isLight ? 'p-4 bg-[#F5FAFE] rounded-xl border border-[#C8DCEB]' : 'p-4 bg-[#0E0E0E] rounded-xl border border-[#2B2B2B]'}`}>
                  <span className={`${isLight ? 'text-[9px] text-[#52677D] block uppercase font-bold' : 'text-[9px] text-[#B3B3B3] block uppercase font-bold'}`}>POWERPOINT PRESENTATION</span>
                  <span className={`${isLight ? 'font-bold text-[#0B2340]' : 'font-bold text-[#FFFFFF]'}`}>{originalFileName} ({(fileSize / (1024 * 1024)).toFixed(2)} MB)</span>
                </div>

                <div className={`${isLight ? 'p-4 bg-[#F5FAFE] rounded-xl border border-[#C8DCEB]' : 'p-4 bg-[#0E0E0E] rounded-xl border border-[#2B2B2B]'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`${isLight ? 'text-[9px] text-[#52677D] uppercase font-bold' : 'text-[9px] text-[#B3B3B3] uppercase font-bold'}`}>PROJECT ABSTRACT</span>
                    <span className={`${isLight ? 'text-[9px] text-[#0B2340] font-bold' : 'text-[9px] text-[#FFFFFF] font-bold'}`}>{wordCount} / 100 WORDS</span>
                  </div>
                  <p className={`${isLight ? 'text-xs text-[#0B63B6] italic bg-white p-3 rounded-xl border border-[#C8DCEB] font-sans' : 'text-xs text-[#D4D4D4] italic bg-[#181818] p-3 rounded-xl border border-[#2B2B2B] font-sans'}`}>
                    "{projectAbstract}"
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2 font-mono">
                <AnimatedButton
                  onClick={() => setIsReviewModalOpen(false)}
                  variant="secondary"
                  size="md"
                  className={`${isLight ? 'flex-1 border-[#C8DCEB] text-[#0B2340]' : 'flex-1 border-[#2B2B2B] text-[#FFFFFF]'}`}
                >
                  CANCEL
                </AnimatedButton>
                <AnimatedButton
                  onClick={handleConfirmFinalSubmit}
                  disabled={submitMutation.isPending}
                  variant="primary"
                  size="md"
                  className="flex-1 bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
                >
                  {submitMutation.isPending ? 'SUBMITTING...' : 'CONFIRM & SUBMIT PROJECT'}
                </AnimatedButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StudentSubmissionPage;
