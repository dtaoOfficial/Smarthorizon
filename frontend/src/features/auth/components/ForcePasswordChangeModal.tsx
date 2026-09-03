import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../../shared/services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export const ForcePasswordChangeModal: React.FC = () => {
  const { user, setPasswordChanged } = useAuth();
  const { showToast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || !user.mustChangePassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === 'student123') {
      setError('New password cannot be the default temporary password (student123).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your entries.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/auth/change-password', { newPassword });
      showToast('Password updated successfully in the database!', 'success');
      setPasswordChanged();
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#071A3D]/40 backdrop-blur-xl select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#DCEEFF] border border-[#BFD4E8] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-[#071A3D]"
      >
        {/* Glow backdrop decorative effect */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-[#2F80ED]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-[#C7E2FA]/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2F80ED]/15 border border-[#2F80ED]/30 text-[#2F80ED] mb-2 shadow-sm">
            <span className="material-symbols-outlined text-3xl">key</span>
          </div>

          <h2 className="text-2xl font-black font-display text-[#071A3D] tracking-tight">
            Security Action Required
          </h2>

          <p className="text-xs text-[#566781] leading-relaxed font-sans">
            Welcome, <span className="text-[#2F80ED] font-semibold">{user.name}</span>! You logged in using your initial temporary password (`student123`). Please set a new password to activate your account.
          </p>

          {error && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-300 text-red-700 rounded-xl text-left font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left pt-2">
            <div>
              <label className="block text-xs font-mono font-bold text-[#566781] uppercase mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  className="w-full bg-[#EAF5FF] border border-[#BFD4E8] focus:border-[#2F80ED] rounded-xl px-4 py-2.5 text-sm text-[#071A3D] placeholder-[#566781] focus:outline-none transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#566781] hover:text-[#071A3D] text-xs"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-[#566781] uppercase mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full bg-[#EAF5FF] border border-[#BFD4E8] focus:border-[#2F80ED] rounded-xl px-4 py-2.5 text-sm text-[#071A3D] placeholder-[#566781] focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#2F80ED] hover:bg-[#1B66C9] text-white font-bold py-3 rounded-xl shadow-sm text-sm tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating Database...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">lock_reset</span>
                    Update & Save Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
