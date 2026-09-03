import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, Megaphone, HelpCircle, Mail, X } from 'lucide-react';
import { api } from '../services/api';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export const NotificationCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [search, setSearch] = useState('');

  // 1. Fetch Notification Feed
  const { data } = useQuery({
    queryKey: ['user-notifications'],
    queryFn: () => api.get('/notifications'),
    refetchInterval: 10000,
  });

  const notifications: NotificationItem[] = data?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const toast = data?.toastNotification;

  // 2. Mark as read mutation
  const readMutation = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  // 3. Mark all as read mutation
  const readAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
    },
  });

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.read) {
      readMutation.mutate(n.id);
    }
    if (n.link) {
      setIsOpen(false);
      navigate(n.link);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'read' && !n.read) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    }
    return true;
  });

  // Group notifications by date
  const groups: Record<string, NotificationItem[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  const todayStr = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  filtered.forEach((n) => {
    const d = new Date(n.createdAt).toDateString();
    let group = 'Earlier';
    if (d === todayStr) group = 'Today';
    else if (d === yesterdayStr) group = 'Yesterday';

    if (!groups[group]) groups[group] = [];
    groups[group].push(n);
  });

  return (
    <>
      {/* Top Navbar Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] hover:bg-[#2B2B2B] transition-all select-none shadow-sm"
        id="notifications-bell"
      >
        <Bell className="w-5 h-5 text-[#FFFFFF]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FFFFFF] text-[#0E0E0E] text-[10px] font-extrabold font-mono rounded-full flex items-center justify-center border-2 border-[#0E0E0E] shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Motion Toast Alert Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="fixed top-6 right-6 z-50 bg-[#181818] backdrop-blur-2xl border border-[#2B2B2B] p-4 rounded-2xl shadow-2xl w-80 flex gap-3 text-[#FFFFFF] select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-[#FFFFFF]" />
            </div>
            <div className="text-left font-sans">
              <h4 className="font-bold text-xs text-[#FFFFFF]">{toast.title}</h4>
              <p className="text-[11px] text-[#D4D4D4] mt-0.5 leading-snug">{toast.content}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#0E0E0E]/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative w-80 sm:w-96 bg-[#181818] border-l border-[#2B2B2B] h-full shadow-2xl flex flex-col z-50 text-[#FFFFFF] select-none"
            >
              {/* Header */}
              <div className="p-5 border-b border-[#2B2B2B] flex justify-between items-center bg-[#0E0E0E]">
                <h3 className="text-base font-bold font-outfit text-[#FFFFFF]">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => readAllMutation.mutate()}
                      className="text-xs text-[#FFFFFF] hover:underline font-mono font-bold"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-[#B3B3B3] hover:text-[#FFFFFF] p-1 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Filter buttons & Search */}
              <div className="p-4 border-b border-[#2B2B2B] space-y-3 shrink-0 bg-[#0E0E0E]">
                <input
                  type="text"
                  placeholder="Search alerts..."
                  className="w-full h-9 px-3 bg-[#181818] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:#B3B3B3 focus:outline-none focus:border-[#FFFFFF]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex gap-2">
                  {(['all', 'unread', 'read'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-extrabold uppercase transition-all ${
                        filter === f
                          ? 'bg-white text-[#0E0E0E]'
                          : 'bg-[#181818] border border-[#555555] text-[#E5E5E5] hover:text-white hover:bg-[#2B2B2B]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left hide-scrollbar bg-[#181818]">
                {filtered.length === 0 ? (
                  <p className="text-center text-[#E5E5E5] font-mono text-xs py-8">
                    No notifications found.
                  </p>
                ) : (
                  (['Today', 'Yesterday', 'Earlier'] as const).map((group) => {
                    const items = groups[group];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={group} className="space-y-2">
                        <span className="block text-[10px] font-mono font-extrabold text-[#E5E5E5] uppercase tracking-wider">
                          {group}
                        </span>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleNotificationClick(item)}
                              className={`p-4 border rounded-xl cursor-pointer transition-all relative flex gap-3 ${
                                item.read
                                  ? 'border-[#2B2B2B] bg-[#0E0E0E] hover:bg-[#2B2B2B]/60'
                                  : 'border-[#555555] bg-[#2B2B2B] font-semibold shadow-md'
                              }`}
                            >
                              {!item.read && (
                                <span className="absolute top-3.5 right-3.5 w-2 h-2 bg-[#FFFFFF] rounded-full animate-ping" />
                              )}
                              {item.type === 'ANNOUNCEMENT' ? (
                                <Megaphone className="w-5 h-5 text-[#FFFFFF] shrink-0 mt-0.5" />
                              ) : item.type === 'QUESTION_REPLY' ? (
                                <HelpCircle className="w-5 h-5 text-[#FFFFFF] shrink-0 mt-0.5" />
                              ) : (
                                <Mail className="w-5 h-5 text-[#FFFFFF] shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className="font-bold text-xs text-[#FFFFFF] block leading-snug pr-4">
                                  {item.title}
                                </span>
                                <p className="text-[11px] text-[#D4D4D4] mt-1 leading-relaxed pr-4 font-sans">
                                  {item.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationCenter;
