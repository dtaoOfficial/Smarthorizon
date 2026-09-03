import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

export type ToastFn = {
  (options: { type?: 'success' | 'error' | 'info' | 'warning'; title?: string; message: string }): void;
  success: (msg: string, title?: string) => void;
  error: (msg: string, title?: string) => void;
  info: (msg: string, title?: string) => void;
  warning: (msg: string, title?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
};

const ToastContext = createContext<ToastFn | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(({ type = 'info', title, message }: { type?: 'success' | 'error' | 'info' | 'warning'; title?: string; message: string }) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastFn: any = useCallback((options: any) => addToast(options), [addToast]);
  toastFn.success = (msg: string, title?: string) => addToast({ type: 'success', message: msg, title });
  toastFn.error = (msg: string, title?: string) => addToast({ type: 'error', message: msg, title });
  toastFn.info = (msg: string, title?: string) => addToast({ type: 'info', message: msg, title });
  toastFn.warning = (msg: string, title?: string) => addToast({ type: 'warning', message: msg, title });
  toastFn.showToast = (msg: string, type: any = 'info') => addToast({ type, message: msg });

  return (
    <ToastContext.Provider value={toastFn}>
      {children}
      {/* Toast Render Portal */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const getIcon = () => {
              switch (toast.type) {
                case 'success': return <CheckCircle2 className="w-5 h-5 text-[#FFFFFF] shrink-0 mt-0.5" />;
                case 'error': return <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />;
                case 'warning': return <AlertTriangle className="w-5 h-5 text-[#D4D4D4] shrink-0 mt-0.5" />;
                default: return <Info className="w-5 h-5 text-[#FFFFFF] shrink-0 mt-0.5" />;
              }
            };

            const getColors = () => {
              switch (toast.type) {
                case 'success': return 'bg-[#181818] border-[#555555] text-[#FFFFFF] shadow-2xl';
                case 'error': return 'bg-[#181818] border-rose-500/40 text-rose-200 shadow-2xl';
                case 'warning': return 'bg-[#181818] border-[#2B2B2B] text-[#D4D4D4] shadow-2xl';
                default: return 'bg-[#181818] border-[#2B2B2B] text-[#FFFFFF] shadow-2xl';
              }
            };

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-md flex items-start gap-3 shadow-xl ${getColors()}`}
              >
                {getIcon()}
                <div className="flex-1 text-left">
                  {toast.title && <h4 className="font-bold text-xs font-outfit text-white">{toast.title}</h4>}
                  <p className="text-xs text-[#D4D4D4] font-sans mt-0.5 leading-snug">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-[#B3B3B3] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastFn => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
