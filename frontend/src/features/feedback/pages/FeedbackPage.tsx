import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  CheckCircle2,
  Lock,
  Star,
  LayoutDashboard,
  BarChart3,
  X,
  Info,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';

const PARAMETERS = [
  { id: 'q1Organization', num: 1, title: 'Overall Organization & Management', desc: 'Overall organization and management of the hackathon' },
  { id: 'q2ProblemRelevance', num: 2, title: 'Problem Statement / Theme Quality', desc: 'Relevance and quality of the problem statement/theme' },
  { id: 'q3RegistrationSupport', num: 3, title: 'Registration & Communication', desc: 'Registration process, communication, and pre-event support' },
  { id: 'q4FacilitiesTech', num: 4, title: 'Venue Facilities & Technical Infrastructure', desc: 'Venue facilities, internet connectivity, power supply, and technical infrastructure' },
  { id: 'q5MentoringGuidance', num: 5, title: 'Mentoring & Guidance', desc: 'Mentoring, guidance, and support provided during the hackathon' },
  { id: 'q6FairnessTransparency', num: 6, title: 'Fairness & Transparency of Evaluation', desc: 'Fairness and transparency of the evaluation process' },
  { id: 'q7FoodHospitality', num: 7, title: 'Food & Hospitality Arrangements', desc: 'Quality of food, refreshments, accommodation, and hospitality arrangements' },
  { id: 'q8VolunteerSupport', num: 8, title: 'Volunteer & Organizing Support', desc: 'Volunteer support and responsiveness of organizing committees' },
  { id: 'q9LearningNetworking', num: 9, title: 'Learning & Networking Experience', desc: 'Learning experience, networking opportunities, and knowledge gained' },
  { id: 'q10OverallSatisfaction', num: 10, title: 'Overall Hackathon Satisfaction', desc: 'Overall satisfaction with the Smart Horizon 48Hour International Hackathon' },
];

export const FeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const queryClient = useQueryClient();

  const [ratings, setRatings] = useState<Record<string, number>>({
    q1Organization: 5,
    q2ProblemRelevance: 5,
    q3RegistrationSupport: 5,
    q4FacilitiesTech: 5,
    q5MentoringGuidance: 5,
    q6FairnessTransparency: 5,
    q7FoodHospitality: 5,
    q8VolunteerSupport: 5,
    q9LearningNetworking: 5,
    q10OverallSatisfaction: 5,
  });

  const [comments, setComments] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch feedback enabled status
  const { data: fbStatusData } = useQuery({
    queryKey: ['feedback-status'],
    queryFn: () => api.get('/feedback/status'),
  });

  const feedbackEnabled = fbStatusData?.feedbackEnabled ?? false;

  // Fetch current user's existing feedback
  const { data: myFeedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['my-feedback'],
    queryFn: () => api.get('/feedback/my-feedback'),
    enabled: user?.role !== 'ADMINISTRATOR',
  });

  useEffect(() => {
    if (myFeedbackData?.feedback) {
      const fb = myFeedbackData.feedback;
      setRatings({
        q1Organization: fb.q1Organization || 5,
        q2ProblemRelevance: fb.q2ProblemRelevance || 5,
        q3RegistrationSupport: fb.q3RegistrationSupport || 5,
        q4FacilitiesTech: fb.q4FacilitiesTech || 5,
        q5MentoringGuidance: fb.q5MentoringGuidance || 5,
        q6FairnessTransparency: fb.q6FairnessTransparency || 5,
        q7FoodHospitality: fb.q7FoodHospitality || 5,
        q8VolunteerSupport: fb.q8VolunteerSupport || 5,
        q9LearningNetworking: fb.q9LearningNetworking || 5,
        q10OverallSatisfaction: fb.q10OverallSatisfaction || 5,
      });
      if (fb.comments) {
        setComments(fb.comments);
      }
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
    }
  });

  const handleRatingChange = (paramId: string, val: number) => {
    setRatings((prev) => ({ ...prev, [paramId]: val }));
  };

  const currentAverage = Number(
    (
      Object.values(ratings).reduce((a, b) => a + b, 0) / PARAMETERS.length
    ).toFixed(2)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (!comments || comments.trim().length < 5) {
      alert('Written feedback remarks are compulsory (minimum 5 characters required).');
      return;
    }

    submitFeedbackMutation.mutate({
      ...ratings,
      comments: comments.trim(),
    });
  };

  if (feedbackLoading) {
    return (
      <div className={`${isLight ? 'flex flex-col items-center justify-center p-16 bg-white border border-[#C8DCEB] rounded-2xl min-h-[360px] text-center font-mono' : 'flex flex-col items-center justify-center p-16 bg-[#181818] border border-[#2B2B2B] rounded-2xl min-h-[360px] text-center font-mono'}`}>
        <div className="w-10 h-10 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin mb-4" />
        <p className={`${isLight ? 'text-sm text-[#0B63B6] animate-pulse' : 'text-sm text-[#D4D4D4] animate-pulse'}`}>Loading feedback console...</p>
      </div>
    );
  }

  // Non-administrators cannot access feedback before admin enables it
  if (user?.role !== 'ADMINISTRATOR' && !feedbackEnabled) {
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
          Feedback submission is reserved for hackathon students and judges. As an administrator, you can view the complete feedback database separated by students and judges in the Reports & Audit Desk.
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

  const isSubmitted = Boolean(myFeedbackData?.feedback);

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
            RATE THE 10 HACKATHON OPERATIONAL PARAMETERS & SUBMIT VERIFIED REMARKS
          </p>
        </div>

        {/* Average Score Badge */}
        <div className={`${isLight ? 'bg-[#F5FAFE] border border-[#C8DCEB] p-4 rounded-xl flex items-center gap-3 shadow-xl shrink-0' : 'bg-[#0E0E0E] border border-[#2B2B2B] p-4 rounded-xl flex items-center gap-3 shadow-xl shrink-0'}`}>
          <div className="text-right font-mono">
            <span className={`${isLight ? 'text-[9px] text-[#52677D] uppercase block font-bold' : 'text-[9px] text-[#B3B3B3] uppercase block font-bold'}`}>OVERALL RATING</span>
            <span className={`${isLight ? 'text-xl font-extrabold text-[#0B2340]' : 'text-xl font-extrabold text-[#FFFFFF]'}`}>{currentAverage} / 5.0</span>
          </div>
          <div className={`${isLight ? 'w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#0B2340] font-bold text-lg' : 'w-9 h-9 rounded-lg bg-[#2B2B2B] border border-[#555555] flex items-center justify-center text-[#FFFFFF] font-bold text-lg'}`}>
            ★
          </div>
        </div>
      </div>

      {/* Success Notification */}
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
          <button
            onClick={() => setSuccessMessage(null)}
            className={`${isLight ? 'text-[#52677D] hover:text-white' : 'text-[#B3B3B3] hover:text-white'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {isSubmitted && !successMessage && (
        <div className={`${isLight ? 'p-4 bg-white border border-[#C8DCEB] text-[#0B2340] rounded-2xl text-xs font-mono font-bold flex items-center gap-2' : 'p-4 bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] rounded-2xl text-xs font-mono font-bold flex items-center gap-2'}`}>
          <Info className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
          <span>FEEDBACK RECORDED ON {new Date(myFeedbackData.feedback.updatedAt).toLocaleDateString()}. UPDATES PERMITTED.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 font-mono">
        {/* 10 Rating Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PARAMETERS.map((param) => {
            const currentVal = ratings[param.id] || 5;

            return (
              <div key={param.id} className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between'}`}>
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span className={`${isLight ? 'text-[10px] font-mono font-bold text-[#0B2340] bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded' : 'text-[10px] font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] border border-[#555555] px-2.5 py-0.5 rounded'}`}>
                      PARAM #{param.num}
                    </span>
                    <span className={`${isLight ? 'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border bg-[#F5FAFE] text-[#0B2340] border-[#C8DCEB]' : 'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border bg-[#0E0E0E] text-[#FFFFFF] border-[#2B2B2B]'}`}>
                      RATING: {currentVal} / 5
                    </span>
                  </div>

                  <h3 className={`${isLight ? 'text-sm font-bold font-mono text-[#0B2340] mt-2' : 'text-sm font-bold font-mono text-[#FFFFFF] mt-2'}`}>
                    {param.title}
                  </h3>
                  <p className={`${isLight ? 'text-xs text-[#0B63B6] font-sans mt-1 leading-relaxed' : 'text-xs text-[#D4D4D4] font-sans mt-1 leading-relaxed'}`}>
                    {param.desc}
                  </p>
                </div>

                {/* 1 to 5 Rating Buttons */}
                <div className={`${isLight ? 'pt-2 border-t border-[#C8DCEB]' : 'pt-2 border-t border-[#2B2B2B]'}`}>
                  <div className="flex items-center justify-between gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isSelected = currentVal === star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingChange(param.id, star)}
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

        {/* Comments & Suggestions Box */}
        <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-6 rounded-2xl space-y-3 font-mono shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl space-y-3 font-mono shadow-xl'}`}>
          <div className="flex items-center justify-between">
            <h3 className={`${isLight ? 'text-xs font-bold uppercase text-[#0B2340] flex items-center gap-2' : 'text-xs font-bold uppercase text-[#FFFFFF] flex items-center gap-2'}`}>
              <MessageSquare className={`${isLight ? 'w-4 h-4 text-[#0B2340]' : 'w-4 h-4 text-[#FFFFFF]'}`} />
              <span>COMPULSORY REMARKS & SUGGESTIONS</span>
            </h3>
            <span className={`${isLight ? 'text-[9px] font-mono font-bold text-[#0B2340] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded' : 'text-[9px] font-mono font-bold text-[#FFFFFF] bg-[#2B2B2B] border border-[#555555] px-2 py-0.5 rounded'}`}>
              REQUIRED
            </span>
          </div>
          <p className={`${isLight ? 'text-xs text-[#52677D] font-sans' : 'text-xs text-[#B3B3B3] font-sans'}`}>
            Provide feedback regarding mentor support, infrastructure, logistics, or general experience.
          </p>
          <textarea
            required
            minLength={5}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="TYPE REMARKS HERE (MINIMUM 5 CHARACTERS REQUIRED)..."
            rows={4}
            className={`${isLight ? 'w-full p-4 bg-[#F5FAFE] border border-[#C8DCEB] rounded-xl text-xs text-[#0B2340] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF] font-mono leading-relaxed' : 'w-full p-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF] font-mono leading-relaxed'}`}
          />
        </div>

        {/* Submit Actions */}
        <div className={`${isLight ? 'flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#C8DCEB] font-mono' : 'flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#2B2B2B] font-mono'}`}>
          <div className={`${isLight ? 'text-xs text-[#52677D]' : 'text-xs text-[#B3B3B3]'}`}>
            OVERALL SCORE: <strong className={`${isLight ? 'text-[#0B2340] font-bold' : 'text-[#FFFFFF] font-bold'}`}>{currentAverage} / 5.0</strong> (10 PARAMETERS ANSWERED)
          </div>

          <AnimatedButton
            type="submit"
            disabled={submitFeedbackMutation.isPending}
            variant="primary"
            size="sm"
            className="bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
          >
            {submitFeedbackMutation.isPending
              ? 'SAVING...'
              : isSubmitted
              ? 'UPDATE & RESUBMIT FEEDBACK'
              : 'SUBMIT OFFICIAL FEEDBACK'}
          </AnimatedButton>
        </div>
      </form>
    </motion.div>
  );
};

export default FeedbackPage;
