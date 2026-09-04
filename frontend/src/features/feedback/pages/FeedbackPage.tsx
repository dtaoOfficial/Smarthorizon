import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  CheckCircle2,
  Lock,
  Star,
  BarChart3,
  X,
  Info,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';

const SECTIONS: { title: string; questions: { id: string; num: number; title: string }[] }[] = [
  {
    title: 'A. Event Experience',
    questions: [
      { id: 'q1RegistrationComms', num: 1, title: 'Registration process and pre-event communication' },
      { id: 'q2BriefingClarity', num: 2, title: 'Clarity of briefing, rules, schedule and expected outcomes' },
      { id: 'q3ProblemStatementClarity', num: 3, title: 'Relevance and clarity of the problem statement selected' },
      { id: 'q4MentoringQuality', num: 4, title: 'Quality and usefulness of mentoring during the Hackathon' },
      { id: 'q5OrganiserSupport', num: 5, title: 'Responsiveness and support from organisers and volunteers' },
    ],
  },
  {
    title: 'B. Facilities & Arrangements',
    questions: [
      { id: 'q6WorkspaceTechFacilities', num: 6, title: 'Workspace, power supply, internet and technical facilities' },
      { id: 'q7FoodHospitality', num: 7, title: 'Food, refreshments, accommodation and hospitality' },
    ],
  },
  {
    title: 'C. Learning, Evaluation & Outcomes',
    questions: [
      { id: 'q8JuryFeedbackQuality', num: 8, title: 'Clarity and usefulness of the feedback provided by the jury' },
      { id: 'q9LearningGained', num: 9, title: 'Learning gained in technical skills, problem-solving and teamwork' },
      { id: 'q10NetworkingExposure', num: 10, title: 'Networking, industry exposure and interaction with other teams' },
      { id: 'q11OverallValue', num: 11, title: 'Overall quality and value of Smart Horizon 2026' },
    ],
  },
];

const ALL_QUESTIONS = SECTIONS.flatMap((s) => s.questions);

const KEY_OUTCOME_OPTIONS = [
  { value: 'NEW_SKILLS', label: 'New technical skills' },
  { value: 'TEAMWORK', label: 'Better teamwork/problem-solving' },
  { value: 'PROTOTYPE', label: 'Prototype developed' },
  { value: 'NETWORKING', label: 'Networking/industry exposure' },
];

const YES_MAYBE_NO_OPTIONS: { value: 'YES' | 'MAYBE' | 'NO'; label: string }[] = [
  { value: 'YES', label: 'Yes' },
  { value: 'MAYBE', label: 'Maybe' },
  { value: 'NO', label: 'No' },
];

const QUOTE_PERMISSION_OPTIONS: { value: 'NAMED' | 'ANONYMOUS' | 'NO'; label: string }[] = [
  { value: 'NAMED', label: 'Named' },
  { value: 'ANONYMOUS', label: 'Anonymous' },
  { value: 'NO', label: 'No' },
];

export const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const queryClient = useQueryClient();

  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, 5]))
  );
  const [mostValuableAspect, setMostValuableAspect] = useState('');
  const [suggestionsForImprovement, setSuggestionsForImprovement] = useState('');
  const [keyOutcomes, setKeyOutcomes] = useState<string[]>([]);
  const [wouldParticipateAgain, setWouldParticipateAgain] = useState<'YES' | 'MAYBE' | 'NO' | ''>('');
  const [wouldRecommend, setWouldRecommend] = useState<'YES' | 'MAYBE' | 'NO' | ''>('');
  const [quotePermission, setQuotePermission] = useState<'NAMED' | 'ANONYMOUS' | 'NO' | ''>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: fbStatusData } = useQuery({
    queryKey: ['feedback-status'],
    queryFn: () => api.get('/feedback/status'),
  });
  const feedbackEnabled = fbStatusData?.feedbackEnabled ?? false;

  const { data: myFeedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => api.get('/feedback/my-feedback'),
    enabled: user?.role === 'STUDENT',
  });

  useEffect(() => {
    const fb = myFeedbackData?.feedback;
    if (fb) {
      setRatings(Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, fb[q.id] || 5])));
      setMostValuableAspect(fb.mostValuableAspect || '');
      setSuggestionsForImprovement(fb.suggestionsForImprovement || '');
      setKeyOutcomes(fb.keyOutcomes ? fb.keyOutcomes.split(',').filter(Boolean) : []);
      setWouldParticipateAgain(fb.wouldParticipateAgain || '');
      setWouldRecommend(fb.wouldRecommend || '');
      setQuotePermission(fb.quotePermission || '');
    }
  }, [myFeedbackData]);

  const submitFeedbackMutation = useMutation({
    mutationFn: (payload: any) => api.post('/feedback/submit', payload),
    onSuccess: (res: any) => {
      setSuccessMessage(res.message || 'Thank you! Your feedback has been recorded.');
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-summary'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to submit feedback.');
    },
  });

  const handleRatingChange = (qId: string, val: number) => {
    setRatings((prev) => ({ ...prev, [qId]: val }));
  };

  const toggleKeyOutcome = (value: string) => {
    setKeyOutcomes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const currentAverage = Number(
    (Object.values(ratings).reduce((a, b) => a + b, 0) / ALL_QUESTIONS.length).toFixed(2)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setValidationError(null);

    if (!wouldParticipateAgain || !wouldRecommend || !quotePermission) {
      setValidationError('Please answer "Would you participate again", "Would you recommend", and "May we quote your comments" before submitting.');
      return;
    }

    submitFeedbackMutation.mutate({
      ...ratings,
      mostValuableAspect: mostValuableAspect.trim() || null,
      suggestionsForImprovement: suggestionsForImprovement.trim() || null,
      keyOutcomes,
      wouldParticipateAgain,
      wouldRecommend,
      quotePermission,
    });
  };

  if (feedbackLoading && user?.role === 'STUDENT') {
    return (
      <div className={`${isLight ? 'flex flex-col items-center justify-center p-16 bg-white border border-[#C8DCEB] rounded-2xl min-h-[360px] text-center font-mono' : 'flex flex-col items-center justify-center p-16 bg-[#181818] border border-[#2B2B2B] rounded-2xl min-h-[360px] text-center font-mono'}`}>
        <div className="w-10 h-10 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin mb-4" />
        <p className={`${isLight ? 'text-sm text-[#0B63B6] animate-pulse' : 'text-sm text-[#D4D4D4] animate-pulse'}`}>Loading feedback console...</p>
      </div>
    );
  }

  // Non-students cannot access feedback before admin enables it
  if (user?.role === 'STUDENT' && !feedbackEnabled) {
    return (
      <div className={`${isLight ? 'p-12 max-w-2xl mx-auto text-center space-y-6 bg-white border border-[#C8DCEB] rounded-2xl mt-12 shadow-2xl font-mono text-[#0B2340]' : 'p-12 max-w-2xl mx-auto text-center space-y-6 bg-[#181818] border border-[#2B2B2B] rounded-2xl mt-12 shadow-2xl font-mono text-[#FFFFFF]'}`}>
        <div className={`${isLight ? 'w-16 h-16 rounded-2xl bg-[#F5FAFE] border border-[#C8DCEB] text-[#0B2340] flex items-center justify-center mx-auto' : 'w-16 h-16 rounded-2xl bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] flex items-center justify-center mx-auto'}`}>
          <Lock className={`${isLight ? 'w-8 h-8 text-[#0B2340]' : 'w-8 h-8 text-[#FFFFFF]'}`} />
        </div>
        <h2 className={`${isLight ? 'text-2xl font-extrabold font-outfit text-[#0B2340]' : 'text-2xl font-extrabold font-outfit text-white'}`}>Feedback Portal Currently Disabled</h2>
        <p className={`${isLight ? 'text-sm text-[#0B63B6] font-sans leading-relaxed' : 'text-sm text-[#D4D4D4] font-sans leading-relaxed'}`}>
          The event feedback tab is currently locked and will only be enabled at the administrator's discretion during the hackathon. Please check back later when the administrator opens feedback collection!
        </p>
        <div className="pt-2">
          <AnimatedButton
            onClick={() => window.location.href = '/dashboard'}
            variant="primary"
            size="md"
            className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
          >
            Return to Main Dashboard
          </AnimatedButton>
        </div>
      </div>
    );
  }

  // Administrators do not submit feedback, they view the feedback database directly
  if (user?.role === 'ADMINISTRATOR') {
    return (
      <div className={`${isLight ? 'p-12 max-w-3xl mx-auto text-center space-y-6 bg-white border border-[#C8DCEB] rounded-2xl mt-8 shadow-xl font-mono text-[#0B2340]' : 'p-12 max-w-3xl mx-auto text-center space-y-6 bg-[#181818] border border-[#2B2B2B] rounded-2xl mt-8 shadow-xl font-mono text-[#FFFFFF]'}`}>
        <div className={`${isLight ? 'w-16 h-16 rounded-2xl bg-[#F5FAFE] border border-[#C8DCEB] text-[#0B2340] flex items-center justify-center mx-auto' : 'w-16 h-16 rounded-2xl bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] flex items-center justify-center mx-auto'}`}>
          <BarChart3 className={`${isLight ? 'w-8 h-8 text-[#0B2340]' : 'w-8 h-8 text-[#FFFFFF]'}`} />
        </div>
        <h2 className={`${isLight ? 'text-2xl font-bold font-outfit text-[#0B2340]' : 'text-2xl font-bold font-outfit text-[#FFFFFF]'}`}>Administrator Feedback Overview</h2>
        <p className={`${isLight ? 'text-sm text-[#0B63B6] font-sans leading-relaxed' : 'text-sm text-[#D4D4D4] font-sans leading-relaxed'}`}>
          Feedback submission is reserved for hackathon participants. As an administrator, you can view the complete feedback database in the Reports & Audit Desk.
        </p>
        <div className="pt-2">
          <AnimatedButton
            onClick={() => window.location.href = '/reports?tab=feedback'}
            variant="primary"
            size="lg"
            className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
          >
            Open Feedback Results Database
          </AnimatedButton>
        </div>
      </div>
    );
  }

  // Judges no longer submit through this form (participant feedback rubric only)
  if (user?.role !== 'STUDENT') {
    return (
      <div className={`${isLight ? 'p-12 max-w-2xl mx-auto text-center space-y-6 bg-white border border-[#C8DCEB] rounded-2xl mt-12 shadow-2xl font-mono text-[#0B2340]' : 'p-12 max-w-2xl mx-auto text-center space-y-6 bg-[#181818] border border-[#2B2B2B] rounded-2xl mt-12 shadow-2xl font-mono text-[#FFFFFF]'}`}>
        <div className={`${isLight ? 'w-16 h-16 rounded-2xl bg-[#F5FAFE] border border-[#C8DCEB] text-[#0B2340] flex items-center justify-center mx-auto' : 'w-16 h-16 rounded-2xl bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] flex items-center justify-center mx-auto'}`}>
          <Info className={`${isLight ? 'w-8 h-8 text-[#0B2340]' : 'w-8 h-8 text-[#FFFFFF]'}`} />
        </div>
        <h2 className={`${isLight ? 'text-2xl font-extrabold font-outfit text-[#0B2340]' : 'text-2xl font-extrabold font-outfit text-white'}`}>Feedback Form Not Applicable</h2>
        <p className={`${isLight ? 'text-sm text-[#0B63B6] font-sans leading-relaxed' : 'text-sm text-[#D4D4D4] font-sans leading-relaxed'}`}>
          The event feedback form is collected from student participants only.
        </p>
        <div className="pt-2">
          <AnimatedButton
            onClick={() => window.location.href = '/dashboard'}
            variant="primary"
            size="md"
            className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
          >
            Return to Main Dashboard
          </AnimatedButton>
        </div>
      </div>
    );
  }

  const isSubmitted = Boolean(myFeedbackData?.feedback);
  const ctx = myFeedbackData?.accountContext;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${isLight ? 'space-y-6 text-left select-none max-w-[1600px] mx-auto text-[#0B2340] font-sans' : 'space-y-6 text-left select-none max-w-[1600px] mx-auto text-[#FFFFFF] font-sans'}`}
    >
      {/* FEEDBACK HEADER */}
      <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono' : 'bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono'}`}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className={`${isLight ? 'text-[#0B2340] font-bold tracking-wider' : 'text-[#FFFFFF] font-bold tracking-wider'}`}>SYS // PARTICIPANT FEEDBACK PORTAL</span>
          </div>
          <h1 className={`${isLight ? 'text-2xl sm:text-3xl font-extrabold font-outfit text-[#0B2340] tracking-tight' : 'text-2xl sm:text-3xl font-extrabold font-outfit text-[#FFFFFF] tracking-tight'}`}>
            FEEDBACK <span className={`${isLight ? 'text-[#0B63B6]' : 'text-[#D4D4D4]'}`}>//</span> EVENT EVALUATION
          </h1>
          <p className={`${isLight ? 'text-xs text-[#52677D] mt-0.5 font-mono' : 'text-xs text-[#B3B3B3] mt-0.5 font-mono'}`}>
            RATE THE 11 HACKATHON PARAMETERS & SUBMIT YOUR REMARKS
          </p>
        </div>

        <div className={`${isLight ? 'bg-[#F5FAFE] border border-[#C8DCEB] p-4 rounded-xl flex items-center gap-3 shadow-xl shrink-0' : 'bg-[#0E0E0E] border border-[#2B2B2B] p-4 rounded-xl flex items-center gap-3 shadow-xl shrink-0'}`}>
          <div className="text-right font-mono">
            <span className={`${isLight ? 'text-[9px] text-[#52677D] uppercase block font-bold' : 'text-[9px] text-[#B3B3B3] uppercase block font-bold'}`}>OVERALL RATING (AUTO)</span>
            <span className={`${isLight ? 'text-xl font-extrabold text-[#0B2340]' : 'text-xl font-extrabold text-[#FFFFFF]'}`}>{currentAverage} / 5.0</span>
          </div>
          <div className={`${isLight ? 'w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#0B2340] font-bold text-lg' : 'w-9 h-9 rounded-lg bg-[#2B2B2B] border border-[#555555] flex items-center justify-center text-[#FFFFFF] font-bold text-lg'}`}>
            ★
          </div>
        </div>
      </div>

      {/* Auto-filled account context */}
      {ctx && (
        <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl shadow-xl grid grid-cols-2 sm:grid-cols-5 gap-4 font-mono' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl shadow-xl grid grid-cols-2 sm:grid-cols-5 gap-4 font-mono'}`}>
          {[
            { label: 'NAME', value: ctx.name || 'N/A' },
            { label: 'TEAM', value: `${ctx.teamName} (${ctx.teamRegistrationId})` },
            { label: 'INSTITUTION', value: ctx.institution },
            { label: 'THEME / PS NO.', value: ctx.theme },
            { label: 'ROLE', value: ctx.participantRole === 'TEAM_LEAD' ? 'Team Lead' : 'Member' },
          ].map((f) => (
            <div key={f.label}>
              <span className={`${isLight ? 'text-[9px] text-[#52677D] uppercase block font-bold' : 'text-[9px] text-[#B3B3B3] uppercase block font-bold'}`}>{f.label}</span>
              <span className={`${isLight ? 'text-xs text-[#0B2340] font-bold break-words' : 'text-xs text-[#FFFFFF] font-bold break-words'}`}>{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${isLight ? 'p-4 bg-[#EFF6FF] border border-[#BFDBFE] text-[#0B2340] rounded-2xl text-xs font-mono font-bold flex items-center justify-between' : 'p-4 bg-[#2B2B2B] border border-[#555555] text-[#FFFFFF] rounded-2xl text-xs font-mono font-bold flex items-center justify-between'}`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className={`${isLight ? 'text-[#52677D] hover:text-white' : 'text-[#B3B3B3] hover:text-white'}`}>
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {validationError && (
        <div className={`${isLight ? 'p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-mono font-bold' : 'p-4 bg-red-950 border border-red-800 text-red-300 rounded-2xl text-xs font-mono font-bold'}`}>
          {validationError}
        </div>
      )}

      {isSubmitted && !successMessage && (
        <div className={`${isLight ? 'p-4 bg-white border border-[#C8DCEB] text-[#0B2340] rounded-2xl text-xs font-mono font-bold flex items-center gap-2' : 'p-4 bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] rounded-2xl text-xs font-mono font-bold flex items-center gap-2'}`}>
          <Info className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
          <span>FEEDBACK RECORDED ON {new Date(myFeedbackData.feedback.updatedAt).toLocaleDateString()}. UPDATES PERMITTED.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 font-mono">
        {SECTIONS.map((section) => (
          <div key={section.title} className="space-y-3">
            <h2 className={`${isLight ? 'text-sm font-extrabold uppercase text-[#0B2340] tracking-wide' : 'text-sm font-extrabold uppercase text-[#FFFFFF] tracking-wide'}`}>
              {section.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.questions.map((q) => {
                const currentVal = ratings[q.id] || 5;
                return (
                  <div key={q.id} className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between'}`}>
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span className={`${isLight ? 'text-[10px] font-mono font-bold text-[#0B2340] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded' : 'text-[10px] font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] border border-[#555555] px-2.5 py-0.5 rounded'}`}>
                          Q{q.num}
                        </span>
                        <span className={`${isLight ? 'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border bg-[#F5FAFE] text-[#0B2340] border-[#C8DCEB]' : 'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border bg-[#0E0E0E] text-[#FFFFFF] border-[#2B2B2B]'}`}>
                          RATING: {currentVal} / 5
                        </span>
                      </div>
                      <h3 className={`${isLight ? 'text-sm font-bold font-sans text-[#0B2340] mt-2 leading-snug' : 'text-sm font-bold font-sans text-[#FFFFFF] mt-2 leading-snug'}`}>
                        {q.title}
                      </h3>
                    </div>
                    <div className={`${isLight ? 'pt-2 border-t border-[#C8DCEB]' : 'pt-2 border-t border-[#2B2B2B]'}`}>
                      <div className="flex items-center justify-between gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isSelected = currentVal === star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRatingChange(q.id, star)}
                              className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex flex-col items-center justify-center gap-0.5 border ${
                                isSelected
                                  ? 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555] shadow-md'
                                  : 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B] hover:border-[#555555] hover:text-[#FFFFFF]'
                              }`}
                            >
                              <span className={isSelected ? 'text-[#FFFFFF] text-xs' : 'text-[#B3B3B3] text-[10px]'}>★</span>
                              <span>{star}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Free text */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-6 rounded-2xl space-y-3 font-mono shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl space-y-3 font-mono shadow-xl'}`}>
            <h3 className={`${isLight ? 'text-xs font-bold uppercase text-[#0B2340] flex items-center gap-2' : 'text-xs font-bold uppercase text-[#FFFFFF] flex items-center gap-2'}`}>
              <MessageSquare className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
              <span>MOST VALUABLE / MEMORABLE ASPECT</span>
            </h3>
            <textarea
              value={mostValuableAspect}
              onChange={(e) => setMostValuableAspect(e.target.value)}
              placeholder="TYPE YOUR ANSWER HERE..."
              rows={4}
              className={`${isLight ? 'w-full p-4 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] focus:outline-none focus:border-[#FFFFFF] font-mono leading-relaxed' : 'w-full p-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF] font-mono leading-relaxed'}`}
            />
          </div>
          <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-6 rounded-2xl space-y-3 font-mono shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl space-y-3 font-mono shadow-xl'}`}>
            <h3 className={`${isLight ? 'text-xs font-bold uppercase text-[#0B2340] flex items-center gap-2' : 'text-xs font-bold uppercase text-[#FFFFFF] flex items-center gap-2'}`}>
              <MessageSquare className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
              <span>SUGGESTIONS FOR FUTURE EDITIONS</span>
            </h3>
            <textarea
              value={suggestionsForImprovement}
              onChange={(e) => setSuggestionsForImprovement(e.target.value)}
              placeholder="TYPE YOUR ANSWER HERE..."
              rows={4}
              className={`${isLight ? 'w-full p-4 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] focus:outline-none focus:border-[#FFFFFF] font-mono leading-relaxed' : 'w-full p-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF] font-mono leading-relaxed'}`}
            />
          </div>
        </div>

        {/* Key outcomes */}
        <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-6 rounded-2xl space-y-3 font-mono shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl space-y-3 font-mono shadow-xl'}`}>
          <h3 className={`${isLight ? 'text-xs font-bold uppercase text-[#0B2340]' : 'text-xs font-bold uppercase text-[#FFFFFF]'}`}>KEY OUTCOME(S) — SELECT ALL THAT APPLY</h3>
          <div className="flex flex-wrap gap-2">
            {KEY_OUTCOME_OPTIONS.map((opt) => {
              const isSelected = keyOutcomes.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleKeyOutcome(opt.value)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                    isSelected
                      ? 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
                      : isLight
                      ? 'bg-[#F5FAFE] text-[#0B2340] border-[#C8DCEB] hover:border-[#0B63B6]'
                      : 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B] hover:border-[#555555] hover:text-[#FFFFFF]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Would participate again / recommend / quote permission */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'WOULD YOU PARTICIPATE AGAIN?', value: wouldParticipateAgain, setValue: setWouldParticipateAgain, options: YES_MAYBE_NO_OPTIONS },
            { label: 'WOULD YOU RECOMMEND THIS HACKATHON?', value: wouldRecommend, setValue: setWouldRecommend, options: YES_MAYBE_NO_OPTIONS },
            { label: 'MAY WE QUOTE YOUR COMMENTS?', value: quotePermission, setValue: setQuotePermission, options: QUOTE_PERMISSION_OPTIONS },
          ].map((field) => (
            <div key={field.label} className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl space-y-3 font-mono shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-3 font-mono shadow-xl'}`}>
              <h3 className={`${isLight ? 'text-xs font-bold uppercase text-[#0B2340]' : 'text-xs font-bold uppercase text-[#FFFFFF]'}`}>{field.label}</h3>
              <div className="flex gap-2">
                {field.options.map((opt) => {
                  const isSelected = field.value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => (field.setValue as any)(opt.value)}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                        isSelected
                          ? 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
                          : isLight
                          ? 'bg-[#F5FAFE] text-[#0B2340] border-[#C8DCEB] hover:border-[#0B63B6]'
                          : 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B] hover:border-[#555555] hover:text-[#FFFFFF]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Actions */}
        <div className={`${isLight ? 'flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#C8DCEB] font-mono' : 'flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#2B2B2B] font-mono'}`}>
          <div className={`${isLight ? 'text-xs text-[#52677D]' : 'text-xs text-[#B3B3B3]'}`}>
            OVERALL RATING: <strong className={`${isLight ? 'text-[#0B2340] font-bold' : 'text-[#FFFFFF] font-bold'}`}>{currentAverage} / 5.0</strong> (AUTO-CALCULATED FROM 11 ANSWERS)
          </div>
          <AnimatedButton
            type="submit"
            disabled={submitFeedbackMutation.isPending}
            variant="primary"
            size="sm"
            className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
          >
            {submitFeedbackMutation.isPending ? 'SAVING...' : isSubmitted ? 'UPDATE & RESUBMIT FEEDBACK' : 'SUBMIT OFFICIAL FEEDBACK'}
          </AnimatedButton>
        </div>
      </form>
    </motion.div>
  );
};

export default FeedbackPage;
