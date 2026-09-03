import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Pause, Play, Terminal } from 'lucide-react';

export interface TelemetryLog {
  id: string;
  timestamp: string;
  source: string;
  action: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'CHECKED_IN' | 'PUBLISHED' | 'EVALUATING' | 'ONLINE' | 'STANDBY';
  track: string;
}

const INITIAL_LOGS: TelemetryLog[] = [
  { id: 'l0', timestamp: '00:00:00', source: 'ADMIN SYSTEM', action: 'System Initialized. Awaiting live event telemetry...', status: 'STANDBY', track: 'GLOBAL' },
];

export const LiveTelemetryStream: React.FC = () => {
  const [logs, setLogs] = useState<TelemetryLog[]>(INITIAL_LOGS);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Live telemetry will begin when actual event activity occurs.
  }, [isPaused]);

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-[#0E0E0E] border border-[#2B2B2B] overflow-hidden shadow-2xl flex flex-col font-mono text-[#FFFFFF]">
      <div className="flex justify-between items-center px-6 py-4 border-b border-[#2B2B2B] bg-[#181818]">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-[#FFFFFF]" />
          <div>
            <h3 className="font-extrabold tracking-wider text-sm uppercase">LIVE OPERATION TELEMETRY</h3>
            <p className="text-[10px] text-[#B3B3B3] uppercase">Event Stream Pipeline // STANDBY</p>
          </div>
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-2 rounded-xl bg-[#2B2B2B] text-[#FFFFFF] hover:bg-[#333333] transition-colors border border-[#555555]"
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 p-6 relative overflow-hidden bg-[#000000] min-h-[320px]">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FFFFFF] via-transparent to-transparent"></div>
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-[#2B2B2B] last:border-0"
            >
              <div className="flex items-center gap-3 min-w-[120px]">
                <span className="text-[11px] text-[#B3B3B3] font-bold">{log.timestamp}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFFFFF]" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-xs font-extrabold text-[#FFFFFF] bg-[#2B2B2B] px-2 py-0.5 rounded border border-[#555555]">
                    {log.source}
                  </span>
                  <span className="text-xs text-[#D4D4D4] break-words">{log.action}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0 min-w-[140px] justify-end">
                <span className="text-[10px] font-bold text-[#B3B3B3] uppercase">{log.track}</span>
                <span className="text-[10px] font-extrabold px-2 py-1 rounded-lg bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] whitespace-nowrap">
                  {log.status}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
