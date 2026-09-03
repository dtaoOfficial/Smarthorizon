import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  MapPin,
  MessageSquare,
  Search,
  Clock,
  User,
  Send,
} from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useTrack } from '../../../context/TrackContext';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import { AnimatedCard } from '../../../shared/components/AnimatedCard';
import { AnimatedButton } from '../../../shared/components/AnimatedButton';

export const QuestionsConsole: React.FC = () => {
  const { user } = useAuth();
  const { isLight } = useTheme();
  const { tracks } = useTrack();
  const queryClient = useQueryClient();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortAge, setSortAge] = useState<'desc' | 'asc'>('desc');

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('TECHNICAL');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newVenueLocation, setNewVenueLocation] = useState('');
  const [newContent, setNewContent] = useState('');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isStudent = user?.role === 'STUDENT';

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['help-desk-tickets', search, trackFilter, statusFilter, priorityFilter, categoryFilter, sortAge],
    queryFn: () => {
      let queryStr = `sortByAge=${sortAge}`;
      if (search) queryStr += `&search=${search}`;
      if (trackFilter) queryStr += `&trackId=${trackFilter}`;
      if (statusFilter) queryStr += `&status=${statusFilter}`;
      if (priorityFilter) queryStr += `&priority=${priorityFilter}`;
      if (categoryFilter) queryStr += `&category=${categoryFilter}`;
      return api.get(`/questions?${queryStr}`);
    },
  });

  const tickets = ticketsData?.questions || [];
  const overdueCount = ticketsData?.overdueCount || 0;

  const createTicketMutation = useMutation({
    mutationFn: (data: { category: string; title: string; venueLocation: string; content: string; priority: string }) =>
      api.post('/questions', data),
    onSuccess: (res: any) => {
      setErrorMsg(null);
      setNewTitle('');
      setNewVenueLocation('');
      setNewContent('');
      setNewPriority('MEDIUM');
      setSuccessMsg(res.routingAlert || 'Help ticket logged and sent to Organizers.');
      queryClient.invalidateQueries({ queryKey: ['help-desk-tickets'] });
      setTimeout(() => setSuccessMsg(null), 6000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to submit help request.');
    },
  });

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVenueLocation.trim()) {
      setErrorMsg('Venue / Seating location is compulsory (e.g. Lab 3, Hall B, Table 12).');
      return;
    }
    createTicketMutation.mutate({
      category: newCategory,
      title: newTitle,
      venueLocation: newVenueLocation.trim(),
      content: newContent,
      priority: newPriority,
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-[#181818] text-[#B3B3B3] border border-[#555555] font-extrabold';
      case 'HIGH':
        return 'bg-[#2B2B2B] text-[#D4D4D4] border border-[#555555] font-extrabold';
      case 'MEDIUM':
        return 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] font-extrabold';
      case 'LOW':
        return 'bg-[#0E0E0E] text-[#B3B3B3] border border-[#2B2B2B] font-bold';
      default:
        return 'bg-[#181818] text-[#FFFFFF] border border-[#2B2B2B] font-bold';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-[#2B2B2B] text-[#FFFFFF] border border-[#555555] font-extrabold';
      case 'Assigned':
        return 'bg-[#FFFFFF] text-[#0E0E0E] border border-[#FFFFFF] font-extrabold';
      case 'In Progress':
        return 'bg-[#2B2B2B] text-[#D4D4D4] border border-[#555555] font-extrabold';
      case 'Resolved':
        return 'bg-[#0E0E0E] text-[#B3B3B3] border border-[#2B2B2B] font-bold';
      default:
        return 'bg-[#181818] text-[#B3B3B3] border border-[#2B2B2B] font-bold';
    }
  };

  const metrics = {
    open: tickets.filter((t: any) => ['Open', 'Assigned', 'In Progress'].includes(t.status)).length,
    technical: tickets.filter(
      (t: any) => t.category === 'TECHNICAL' && ['Open', 'Assigned', 'In Progress'].includes(t.status)
    ).length,
    organizational: tickets.filter(
      (t: any) => t.category === 'ORGANIZATIONAL' && ['Open', 'Assigned', 'In Progress'].includes(t.status)
    ).length,
    resolved: tickets.filter((t: any) => t.status === 'Resolved').length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-left select-none max-w-[1600px] mx-auto text-[#FFFFFF] font-sans"
    >
      {/* SUPPORT DESK HEADER */}
      <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-mono">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#FFFFFF] animate-pulse" />
            <span className="text-[#FFFFFF] font-bold tracking-wider">SYS // HELPDESK & SUPPORT DESK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FFFFFF] tracking-tight">
            SUPPORT DESK <span className="text-[#D4D4D4]">//</span> QUESTIONS CONSOLE
          </h1>
          <p className="text-xs text-[#B3B3B3] mt-0.5 font-mono">
            REAL-TIME PARTICIPANT HELP REQUESTS, TECHNICAL DISPATCH & SLA TIMERS
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] rounded-2xl text-xs font-mono font-bold flex gap-2 items-center">
          <CheckCircle2 className="w-4 h-4 text-[#FFFFFF]" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-[#181818] border border-[#555555] text-[#B3B3B3] rounded-2xl text-xs font-mono font-bold flex gap-2 items-center">
          <AlertCircle className="w-4 h-4 text-[#555555]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-mono">
          <div className="bg-[#181818] border border-[#2B2B2B] p-6 rounded-2xl space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold uppercase text-[#FFFFFF] flex items-center gap-2 border-b border-[#2B2B2B] pb-3">
              <HelpCircle className="w-4 h-4 text-[#FFFFFF]" />
              <span>LOG SUPPORT TICKET</span>
            </h3>
            <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[#B3B3B3] uppercase font-bold mb-1">CATEGORY</label>
                <select
                  className="w-full h-10 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] font-bold focus:outline-none focus:border-[#FFFFFF]"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="TECHNICAL">TECHNICAL (ORGANIZERS)</option>
                  <option value="ORGANIZATIONAL">ORGANIZATIONAL (ORGANIZERS)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#B3B3B3] uppercase font-bold mb-1">PRIORITY</label>
                <select
                  className="w-full h-10 px-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] font-bold focus:outline-none focus:border-[#FFFFFF]"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="block text-[#B3B3B3] uppercase font-bold mb-1">
                  VENUE / SEATING LOCATION <span className="text-[#555555]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab 3 - Table #14, Ground Floor..."
                  className="w-full h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:text-[#555555] font-bold focus:outline-none focus:border-[#FFFFFF]"
                  value={newVenueLocation}
                  onChange={(e) => setNewVenueLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[#B3B3B3] uppercase font-bold mb-1">SUBJECT SUMMARY</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database connection timeout..."
                  className="w-full h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:text-[#555555] font-bold focus:outline-none focus:border-[#FFFFFF]"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[#B3B3B3] uppercase font-bold mb-1">DESCRIPTION</label>
                <textarea
                  required
                  placeholder="Explain your technical issue..."
                  className="w-full h-24 p-3 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] placeholder:text-[#555555] font-bold focus:outline-none focus:border-[#FFFFFF]"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>

              <AnimatedButton
                type="submit"
                disabled={createTicketMutation.isPending}
                variant="primary"
                size="md"
                className="w-full bg-[#FFFFFF] text-[#0E0E0E] font-bold hover:bg-[#D4D4D4]"
              >
                SUBMIT TICKET
              </AnimatedButton>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className={`${isLight ? 'text-xs font-bold font-mono text-[#0B2340] uppercase tracking-wider' : 'text-xs font-bold font-mono text-[#FFFFFF] uppercase tracking-wider'}`}>YOUR SUPPORT TICKETS ({tickets.length})</h3>
            {isLoading ? (
              <p className={`${isLight ? 'p-8 text-center text-[#52677D] font-mono animate-pulse text-xs' : 'p-8 text-center text-[#B3B3B3] font-mono animate-pulse text-xs'}`}>LOADING TICKETS...</p>
            ) : tickets.length === 0 ? (
              <div className={`${isLight ? 'p-12 text-center text-[#52677D] font-mono space-y-2 border border-dashed border-[#C8DCEB] rounded-2xl bg-white' : 'p-12 text-center text-[#B3B3B3] font-mono space-y-2 border border-dashed border-[#2B2B2B] rounded-2xl bg-[#181818]'}`}>
                <HelpCircle className={`${isLight ? 'w-10 h-10 text-[#52677D] mx-auto' : 'w-10 h-10 text-[#B3B3B3] mx-auto'}`} />
                <h4 className={`${isLight ? 'text-sm font-bold text-[#0B2340]' : 'text-sm font-bold text-[#FFFFFF]'}`}>NO ACTIVE TICKETS</h4>
                <p className="text-xs">Submit a support request on the left panel if your team needs help.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicketId(t.id);
                      setDrawerOpen(true);
                    }}
                    className={`${isLight ? 'p-5 bg-white border border-[#C8DCEB] rounded-2xl flex justify-between items-center cursor-pointer hover:border-[#BFDBFE] transition-colors font-mono' : 'p-5 bg-[#181818] border border-[#2B2B2B] rounded-2xl flex justify-between items-center cursor-pointer hover:border-[#555555] transition-colors font-mono'}`}
                  >
                    <div className="space-y-1">
                      <div className="flex gap-2 items-center">
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${getPriorityBadge(t.priority)}`}>
                          {t.priority}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${getStatusBadge(t.status)}`}>
                          {t.status}
                        </span>
                      </div>
                      <h4 className={`${isLight ? 'font-bold text-xs text-[#0B2340] font-sans' : 'font-bold text-xs text-[#FFFFFF] font-sans'}`}>{t.title}</h4>
                      <span className={`${isLight ? 'text-[10px] text-[#52677D] block font-mono' : 'text-[10px] text-[#B3B3B3] block font-mono'}`}>
                        CAT: {t.category} &bull; REPLIES: {t.replies.length} &bull; LOC: <strong className={`${isLight ? 'text-[#0B2340]' : 'text-[#FFFFFF]'}`}>{t.venueLocation}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 font-mono">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl space-y-1 shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-1 shadow-xl'}`}>
              <span className={`${isLight ? 'text-[10px] text-[#52677D] uppercase font-bold' : 'text-[10px] text-[#B3B3B3] uppercase font-bold'}`}>OPEN TICKETS</span>
              <span className={`${isLight ? 'text-2xl font-extrabold text-[#0B2340] block' : 'text-2xl font-extrabold text-[#FFFFFF] block'}`}>{metrics.open}</span>
            </div>

            <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl space-y-1 shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-1 shadow-xl'}`}>
              <span className={`${isLight ? 'text-[10px] text-[#52677D] uppercase font-bold' : 'text-[10px] text-[#B3B3B3] uppercase font-bold'}`}>TECHNICAL QUEUE</span>
              <span className={`${isLight ? 'text-2xl font-extrabold text-[#0B2340] block' : 'text-2xl font-extrabold text-[#FFFFFF] block'}`}>{metrics.technical}</span>
            </div>

            <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl space-y-1 shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-1 shadow-xl'}`}>
              <span className={`${isLight ? 'text-[10px] text-[#52677D] uppercase font-bold' : 'text-[10px] text-[#B3B3B3] uppercase font-bold'}`}>ORGANIZATIONAL</span>
              <span className={`${isLight ? 'text-2xl font-extrabold text-[#0B2340] block' : 'text-2xl font-extrabold text-[#FFFFFF] block'}`}>{metrics.organizational}</span>
            </div>

            <div className={`${isLight ? 'bg-white border border-[#C8DCEB] p-5 rounded-2xl space-y-1 shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] p-5 rounded-2xl space-y-1 shadow-xl'}`}>
              <span className={`${isLight ? 'text-[10px] text-[#52677D] uppercase font-bold' : 'text-[10px] text-[#B3B3B3] uppercase font-bold'}`}>OVERDUE (&gt;15M)</span>
              <span className={`${isLight ? 'text-2xl font-extrabold text-[#0B63B6] block' : 'text-2xl font-extrabold text-[#D4D4D4] block'}`}>{overdueCount}</span>
            </div>
          </section>

          {/* Directory Table */}
          <div className={`${isLight ? 'bg-white border border-[#C8DCEB] rounded-2xl overflow-hidden shadow-xl' : 'bg-[#181818] border border-[#2B2B2B] rounded-2xl overflow-hidden shadow-xl'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`${isLight ? 'bg-[#F5FAFE] border-b border-[#C8DCEB] text-[#52677D] text-[10px] uppercase font-bold' : 'bg-[#0E0E0E] border-b border-[#2B2B2B] text-[#B3B3B3] text-[10px] uppercase font-bold'}`}>
                    <th className="py-3 px-4">SUBJECT QUESTION</th>
                    <th className="py-3 px-4">VENUE LOCATION</th>
                    <th className="py-3 px-4">CATEGORY</th>
                    <th className="py-3 px-4">STUDENT TEAM</th>
                    <th className="py-3 px-4">PRIORITY</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">ASSIGNEE</th>
                    <th className="py-3 px-4">AGE</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className={`${isLight ? 'divide-y divide-[#2B2B2B] bg-white' : 'divide-y divide-[#2B2B2B] bg-[#181818]'}`}>
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className={`${isLight ? 'py-12 text-center text-[#52677D] font-mono animate-pulse' : 'py-12 text-center text-[#B3B3B3] font-mono animate-pulse'}`}>
                        SYNCING HELP DESK INBOX...
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={`${isLight ? 'py-12 text-center text-[#52677D] font-mono' : 'py-12 text-center text-[#B3B3B3] font-mono'}`}>
                        NO SUPPORT TICKETS LOGGED.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t: any) => (
                      <tr
                        key={t.id}
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setDrawerOpen(true);
                        }}
                        className={`${isLight ? 'hover:bg-[#EFF6FF]/60 transition-colors cursor-pointer group' : 'hover:bg-[#2B2B2B]/60 transition-colors cursor-pointer group'}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className={`${isLight ? 'font-bold text-[#0B2340] font-sans block group-hover:text-[#0B63B6] transition-colors' : 'font-bold text-[#FFFFFF] font-sans block group-hover:text-[#D4D4D4] transition-colors'}`}>
                              {t.title}
                            </span>
                            <span className={`${isLight ? 'text-[10px] text-[#52677D] truncate max-w-[200px] mt-0.5' : 'text-[10px] text-[#B3B3B3] truncate max-w-[200px] mt-0.5'}`}>
                              {t.content}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className={`${isLight ? 'inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F5FAFE] border border-[#C8DCEB] text-[#0B2340] text-[10px] font-bold rounded-full' : 'inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#0E0E0E] border border-[#2B2B2B] text-[#FFFFFF] text-[10px] font-bold rounded-full'}`}>
                            <MapPin className={`${isLight ? 'w-3 h-3 text-[#0B2340]' : 'w-3 h-3 text-[#FFFFFF]'}`} />
                            {t.venueLocation}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className={`${isLight ? 'px-2.5 py-0.5 bg-[#F5FAFE] border border-[#C8DCEB] text-[#0B63B6] text-[9px] font-bold rounded-full uppercase' : 'px-2.5 py-0.5 bg-[#0E0E0E] border border-[#2B2B2B] text-[#D4D4D4] text-[9px] font-bold rounded-full uppercase'}`}>
                            {t.category}
                          </span>
                        </td>
                        <td className={`${isLight ? 'py-3 px-4 font-bold text-[#0B2340] font-sans' : 'py-3 px-4 font-bold text-[#FFFFFF] font-sans'}`}>{t.teamName}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${getPriorityBadge(t.priority)}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${getStatusBadge(t.status)}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className={`${isLight ? 'py-3 px-4 text-[#52677D] font-mono' : 'py-3 px-4 text-[#B3B3B3] font-mono'}`}>{t.assigneeLabel}</td>
                        <td className={`${isLight ? 'py-3 px-4 font-mono font-bold text-[#0B2340]' : 'py-3 px-4 font-mono font-bold text-[#FFFFFF]'}`}>{t.ageMins} MINS</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedTicketId(t.id);
                              setDrawerOpen(true);
                            }}
                            className="px-3 py-1 bg-[#FFFFFF] text-[#0E0E0E] text-[10px] font-bold rounded-lg hover:bg-[#D4D4D4]"
                          >
                            REPLY
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <TicketDetailDrawer
        ticketId={selectedTicketId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </motion.div>
  );
};

export default QuestionsConsole;
