import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert, Gavel, Users, UserCheck, Loader2, Clock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';
import { BrandLogo } from '../../../shared/components/BrandLogo';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [inactivityNotice, setInactivityNotice] = useState<string | null>(() => {
    const reason = sessionStorage.getItem('inactivity_reason');
    if (reason) {
      sessionStorage.removeItem('inactivity_reason');
      return reason;
    }
    return null;
  });

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Authentication failed:', error);
      setServerError(error.message || 'Invalid credentials or backend session issue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0E0E0E] flex flex-col items-center justify-between py-8 px-4 sm:px-6 pb-20 sm:pb-28 overflow-y-auto select-none font-sans text-[#FFFFFF]">
      {/* Structural Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* CENTERED LOGIN CONTAINER */}
      <div className="flex-1 flex flex-col items-center justify-center w-full my-auto py-6 z-10 space-y-6">
        {/* Floating Header Branding */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center cursor-pointer flex flex-col items-center"
          onClick={() => navigate('/landing')}
        >
          <BrandLogo variant="login" />
          <p className="text-[11px] sm:text-xs text-[#D4D4D4] font-mono uppercase tracking-widest mt-3 font-bold">
            NHCE 25th Silver Jubilee &bull; 48-Hour International Hackathon
          </p>
        </motion.div>

        {/* Glass Login Card (Centerpiece) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-[440px] bg-[#181818] border border-[#2B2B2B] p-6 sm:p-8 rounded-2xl shadow-2xl text-[#FFFFFF]"
        >
          <div className="mb-6 flex justify-between items-center border-b border-[#2B2B2B] pb-4">
            <div>
              <h2 className="text-xl font-bold font-outfit text-[#FFFFFF]">Portal Login</h2>
              <p className="text-xs text-[#B3B3B3]">Enter your credentials to access workspace</p>
            </div>
            <Lock className="w-6 h-6 text-[#D4D4D4]" />
          </div>

          {inactivityNotice && (
            <div className="mb-4 p-3 rounded-xl bg-[#2B2B2B] border border-[#555555] text-[#FFFFFF] text-xs font-mono flex items-center gap-2 font-bold">
              <Clock className="w-4 h-4 text-[#D4D4D4]" />
              <span>{inactivityNotice}</span>
            </div>
          )}

          {serverError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono font-bold">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-mono text-[#D4D4D4] uppercase tracking-wider mb-1 font-bold">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="e.g. admin1@smarthorizon.com"
                autoComplete="off"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] placeholder:#B3B3B3 text-sm focus:outline-none focus:border-[#FFFFFF] transition-colors font-sans"
              />
              {errors.email && (
                <p className="text-rose-400 text-[11px] font-mono mt-1 font-bold">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-[#D4D4D4] uppercase tracking-wider mb-1 font-bold">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] placeholder:#B3B3B3 text-sm focus:outline-none focus:border-[#FFFFFF] transition-colors font-sans"
              />
              {errors.password && (
                <p className="text-rose-400 text-[11px] font-mono mt-1 font-bold">{errors.password.message}</p>
              )}
            </div>

            <div className="pt-2">
              <AnimatedButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center text-sm py-3 bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#0E0E0E]" />
                    Signing In...
                  </span>
                ) : (
                  'Sign In'
                )}
              </AnimatedButton>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-[11px] font-mono text-[#B3B3B3] text-center py-2 z-10 font-semibold">
        SmartHorizon 2026 International Hackathon &bull; New Horizon College of Engineering
      </div>
    </div>
  );
};

export default Login;
