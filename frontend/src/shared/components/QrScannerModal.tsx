import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as animeModule from 'animejs';
import { X, QrCode, AlertCircle } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const getAnime = (): any => {
  const mod: any = animeModule;
  if (typeof mod === 'function') return mod;
  if (typeof mod?.default === 'function') return mod.default;
  if (typeof mod?.anime === 'function') return mod.anime;
  return mod?.default || mod;
};

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => Promise<void>;
  scanError: string | null;
  setScanError: (err: string | null) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  scanError,
  setScanError,
}) => {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const isJudge = user?.role === 'JUDGE';

  const [scanCodeInput, setScanCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scanLineRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (code: string) => {
    setIsSubmitting(true);
    try {
      await onScan(code);
      setScanCodeInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !scanLineRef.current) return;

    const anime = getAnime();
    let anim: any = null;

    if (typeof anime === 'function') {
      anim = anime({
        targets: scanLineRef.current,
        translateY: ['0%', '1800%'],
        easing: 'easeInOutQuad',
        duration: 1800,
        direction: 'alternate',
        loop: true,
      });
    }

    return () => {
      if (anim && typeof anim.pause === 'function') {
        anim.pause();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let activeStream: MediaStream | null = null;
    let animationFrameId: number;
    let isProcessingQR = false;

    const startCamera = async () => {
      setScanError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        activeStream = stream;
        const videoEl = document.getElementById('scanner-video') as HTMLVideoElement;
        
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.setAttribute("playsinline", "true");
          
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d", { willReadFrequently: true });

          const tick = async () => {
            if (!isOpen) return;

            if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA && context && !isProcessingQR) {
              canvas.height = videoEl.videoHeight;
              canvas.width = videoEl.videoWidth;
              context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
              
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              
              const jsQR = (await import('jsqr')).default;
              
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              });

              if (code && code.data) {
                isProcessingQR = true;
                await handleSubmit(code.data);
                
                setTimeout(() => {
                  isProcessingQR = false;
                }, 2500);
              }
            }
            
            animationFrameId = requestAnimationFrame(tick);
          };
          animationFrameId = requestAnimationFrame(tick);
        }
      } catch (err) {
        console.warn('Camera stream blocked or unavailable:', err);
        setScanError('Camera access required or not connected. Use manual code entry below.');
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Scan Team QR Code"
        className={`fixed inset-0 backdrop-blur-md z-50 flex items-center justify-center p-4 ${
          isLight ? 'bg-[#0B2340]/40' : 'bg-[#0E0E0E]/80'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className={`p-6 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl relative select-none font-mono border ${
            isJudge
              ? 'bg-white border-[#C8DCEB] text-[#0B2340]'
              : 'bg-[#181818] border-[#2B2B2B] text-[#FFFFFF]'
          }`}
        >
          <button
            onClick={onClose}
            type="button"
            className={`absolute top-4 right-4 ${isLight ? 'text-[#52677D] hover:text-[#0B2340]' : 'text-[#B3B3B3] hover:text-[#FFFFFF]'}`}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-1 text-left">
            <div className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase border ${
              isJudge
                ? 'bg-[#EFF6FF] text-[#0B63B6] border-[#BFDBFE]'
                : 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isLight ? 'bg-[#1687D9]' : 'bg-[#FFFFFF]'}`} />
              <span>LIVE QR RETICLE</span>
            </div>
            <h3 className={`text-2xl font-extrabold font-outfit mt-1 ${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>
              Scan Team QR Code
            </h3>
            <p className={`text-xs font-sans ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
              Point your camera at a team QR badge to launch active scorecard.
            </p>
          </div>

          <div className={`relative aspect-video rounded-xl overflow-hidden border shadow-inner flex items-center justify-center ${
            isLight ? 'bg-[#F5FAFE] border-[#C8DCEB]' : 'bg-[#0E0E0E] border-[#2B2B2B]'
          }`}>
            <video id="scanner-video" autoPlay playsInline muted className="w-full h-full object-cover" />

            <div
              ref={scanLineRef}
              className={`absolute inset-x-4 top-2 h-1 bg-gradient-to-r from-transparent to-transparent shadow-[0_0_15px_rgba(22,135,217,0.9)] rounded-full z-10 pointer-events-none ${
                isLight ? 'via-[#1687D9]' : 'via-[#FFFFFF]'
              }`}
            />

            <div className={`absolute inset-6 border pointer-events-none rounded-xl ${
              isLight ? 'border-[#1687D9]/30' : 'border-[#FFFFFF]/30'
            }`}>
              <div className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 rounded-tl ${isLight ? 'border-[#1687D9]' : 'border-[#FFFFFF]'}`} />
              <div className={`absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 rounded-tr ${isLight ? 'border-[#1687D9]' : 'border-[#FFFFFF]'}`} />
              <div className={`absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 rounded-bl ${isLight ? 'border-[#1687D9]' : 'border-[#FFFFFF]'}`} />
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 rounded-br ${isLight ? 'border-[#1687D9]' : 'border-[#FFFFFF]'}`} />
            </div>
          </div>

          {scanError && (
            <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          <div className="space-y-3 text-left">
            <label className={`block text-[10px] font-mono uppercase font-bold ${isLight ? 'text-[#52677D]' : 'text-[#B3B3B3]'}`}>
              MANUAL TEAM CODE / QR VALUE ENTRY
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste code e.g. REG-1049"
                value={scanCodeInput}
                onChange={(e) => setScanCodeInput(e.target.value)}
                className={`flex-1 h-10 px-3 border rounded-xl text-xs font-mono font-bold focus:outline-none ${
                  isJudge
                    ? 'bg-[#F5FAFE] border-[#C8DCEB] text-[#0B2340] focus:border-[#1687D9]'
                    : 'bg-[#0E0E0E] border-[#2B2B2B] text-[#FFFFFF] focus:border-[#FFFFFF]'
                }`}
              />
              <AnimatedButton
                disabled={!scanCodeInput.trim() || isSubmitting}
                onClick={() => handleSubmit(scanCodeInput.trim())}
                variant="primary"
                size="sm"
                className={isLight ? 'bg-[#1687D9] text-white font-bold hover:bg-[#0B63B6]' : 'bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]'}
              >
                {isSubmitting ? 'VALIDATING...' : 'SUBMIT'}
              </AnimatedButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QrScannerModal;
