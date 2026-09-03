import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessDeniedModal: React.FC<AccessDeniedModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#0E0E0E]/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: 0 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: [0, -12, 12, -8, 8, -4, 4, 0],
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="bg-[#181818] border border-rose-500/40 p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl relative text-[#FFFFFF] select-none font-mono"
        >
          {/* Animated Error Shield Icon */}
          <div className="relative mx-auto w-20 h-20 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ShieldAlert className="w-10 h-10 text-rose-400" />
            </motion.div>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold font-outfit text-[#FFFFFF]">Access Denied</h3>
            <p className="text-sm font-bold text-rose-300 font-sans">
              You are not assigned to evaluate this team.
            </p>
            <p className="text-xs text-[#B3B3B3] leading-relaxed font-sans max-w-xs mx-auto">
              Verify your judge assignment queue or contact the hackathon administrator to request access.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <AnimatedButton onClick={onClose} variant="danger" size="md" className="bg-rose-950/40 text-rose-300 border-rose-500/40">
              Close & Dismiss
            </AnimatedButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AccessDeniedModal;
