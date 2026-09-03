import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../shared/services/api';
import { Track } from '../../../context/TrackContext';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
}

const teamFormSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  trackId: z.string().min(1, 'Track selection is required'),
  registrationId: z.string().optional(),
  collegeName: z.string().optional(),
  domain: z.string().optional(),
  selectedPsId: z.string().optional(),
  mentorName1: z.string().optional(),
  leadName: z.string().min(1, 'Lead name is required'),
  leadEmail: z.string().email('Invalid email address'),
  leadMobile: z.string().optional(),
  leadUsn: z.string().optional(),
  paymentStatusFinal: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).default('PENDING'),
  status: z.string().default('Registered'),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({
  isOpen,
  onClose,
  tracks,
}) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: '',
      trackId: '',
      registrationId: '',
      collegeName: '',
      domain: '',
      selectedPsId: '',
      mentorName1: '',
      leadName: '',
      leadEmail: '',
      leadMobile: '',
      leadUsn: '',
      paymentStatusFinal: 'PENDING',
      status: 'Registered',
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: (data: TeamFormValues) => api.post('/teams', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-teams'] });
      queryClient.invalidateQueries({ queryKey: ['teams-directory'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary'] });
      reset();
      onClose();
    },
  });

  if (!isOpen) return null;

  const onSubmit = (values: TeamFormValues) => {
    createTeamMutation.mutate(values);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#000000]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-3xl w-full max-w-2xl shadow-2xl z-50 text-left space-y-5 text-[#FFFFFF] select-none max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-3">
            <div>
              <h3 className="text-xl font-bold font-display text-[#FFFFFF]">Register New Team</h3>
              <p className="text-xs text-[#B3B3B3]">Add registration details, problem statement, lead contacts &amp; payment status.</p>
            </div>
            <button onClick={onClose} className="text-[#B3B3B3] hover:text-[#FFFFFF] p-1 rounded-lg">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {createTeamMutation.error && (
            <div className="p-3.5 bg-red-900/30 text-red-400 rounded-xl border border-red-800 text-xs font-mono flex gap-2">
              <span className="material-symbols-outlined text-red-400 text-base shrink-0 mt-0.5">error</span>
              <span>{(createTeamMutation.error as any).message || 'Failed to create team.'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">REGISTRATION ID</label>
                <input
                  type="text"
                  {...register('registrationId')}
                  className="w-full h-10 px-3.5 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]"
                  placeholder="e.g. SH26-REG-1001 (Auto-generated if empty)"
                />
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">TEAM NAME *</label>
                <input
                  type="text"
                  {...register('name')}
                  className={`w-full h-10 px-3.5 bg-[#0E0E0E] border rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]
                    ${errors.name ? 'border-red-500/70' : 'border-[#2B2B2B]'}`}
                  placeholder="e.g. Team Horizon"
                />
                {errors.name && <p className="mt-1 text-red-400 font-semibold">{errors.name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">TRACK THEME *</label>
                <select
                  {...register('trackId')}
                  className="w-full h-10 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-[#FFFFFF] font-mono focus:outline-none focus:border-[#FFFFFF]"
                >
                  <option value="">Select track...</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {errors.trackId && <p className="mt-1 text-red-400 font-semibold">{errors.trackId.message}</p>}
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">COLLEGE / UNIVERSITY</label>
                <input
                  type="text"
                  {...register('collegeName')}
                  className="w-full h-10 px-3.5 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]"
                  placeholder="e.g. Stanford University"
                />
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">DOMAIN</label>
                <input
                  type="text"
                  {...register('domain')}
                  className="w-full h-10 px-3.5 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]"
                  placeholder="e.g. FinTech"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">PROBLEM STATEMENT ID</label>
                <input
                  type="text"
                  {...register('selectedPsId')}
                  className="w-full h-10 px-3.5 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]"
                  placeholder="e.g. PS-2026-001"
                />
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">MENTOR NAME</label>
                <input
                  type="text"
                  {...register('mentorName1')}
                  className="w-full h-10 px-3.5 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]"
                  placeholder="e.g. Dr. Alan Turing"
                />
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">PAYMENT STATUS</label>
                <select
                  {...register('paymentStatusFinal')}
                  className="w-full h-10 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-[#FFFFFF] font-mono focus:outline-none focus:border-[#FFFFFF]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>
            </div>

            <div className="border-t border-[#2B2B2B] pt-3 space-y-3">
              <h4 className="font-mono font-bold uppercase text-[#FFFFFF]">Team Lead Contact Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">LEAD NAME *</label>
                  <input
                    type="text"
                    {...register('leadName')}
                    className={`w-full h-10 px-3.5 bg-[#0E0E0E] border rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]
                      ${errors.leadName ? 'border-red-500/70' : 'border-[#2B2B2B]'}`}
                    placeholder="e.g. Alice Smith"
                  />
                  {errors.leadName && <p className="mt-1 text-red-400 font-semibold">{errors.leadName.message}</p>}
                </div>

                <div>
                  <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">LEAD EMAIL *</label>
                  <input
                    type="email"
                    {...register('leadEmail')}
                    className={`w-full h-10 px-3.5 bg-[#0E0E0E] border rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]
                      ${errors.leadEmail ? 'border-red-500/70' : 'border-[#2B2B2B]'}`}
                    placeholder="alice@gmail.com"
                  />
                  {errors.leadEmail && <p className="mt-1 text-red-400 font-semibold">{errors.leadEmail.message}</p>}
                </div>

                <div>
                  <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">LEAD MOBILE</label>
                  <input
                    type="text"
                    {...register('leadMobile')}
                    className="w-full h-10 px-3.5 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]"
                    placeholder="+15550192837"
                  />
                </div>

                <div>
                  <label className="block font-mono font-semibold text-[#B3B3B3] mb-1">LEAD USN</label>
                  <input
                    type="text"
                    {...register('leadUsn')}
                    className="w-full h-10 px-3.5 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-[#FFFFFF] placeholder:text-[#737373] focus:outline-none focus:border-[#FFFFFF]"
                    placeholder="USN2026-LD-001"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#2B2B2B]">
              <AnimatedButton type="button" onClick={onClose} variant="outline" size="sm" className="bg-[#181818] border border-[#555555] text-[#FFFFFF] hover:bg-[#2B2B2B]">
                Cancel
              </AnimatedButton>
              <AnimatedButton
                type="submit"
                disabled={createTeamMutation.isPending}
                variant="primary"
                size="sm"
                className="bg-[#FFFFFF] text-[#0E0E0E] font-extrabold hover:bg-[#D4D4D4] border border-[#FFFFFF]"
              >
                {createTeamMutation.isPending ? 'Registering...' : 'Register Team'}
              </AnimatedButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateTeamModal;
