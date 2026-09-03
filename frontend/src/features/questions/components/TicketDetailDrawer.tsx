import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, X, Send, Paperclip } from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useAuth } from '../../../context/AuthContext';

interface TicketDetailDrawerProps {
  ticketId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TicketDetailDrawer: React.FC<TicketDetailDrawerProps> = ({
  ticketId,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [replyText, setReplyText] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [ticketPriority, setTicketPriority] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [ticketAssigneeId, setTicketAssigneeId] = useState('');

  // Fetch ticket list to locate this ticket's detailed properties
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['help-desk-tickets'],
    queryFn: () => api.get('/questions'),
    enabled: !!ticketId && isOpen,
  });

  const ticket = ticketsData?.questions?.find((t: any) => t.id === ticketId);

  // Sync state values when ticket updates
  useEffect(() => {
    if (ticket) {
      setInternalNotes(ticket.internalNotes || '');
      setTicketPriority(ticket.priority || 'MEDIUM');
      setTicketStatus(ticket.status || 'Open');
      setTicketAssigneeId(ticket.assigneeId || '');
    }
  }, [ticket]);

  // Fetch judges list for assignment dropdown
  const { data: judgesData } = useQuery({
    queryKey: ['judges-list-dropdown'],
    queryFn: () => api.get('/judges'),
    enabled: isOpen && user?.role !== 'STUDENT',
  });
  const judges = judgesData?.judges || [];

  // Mutations
  const replyMutation = useMutation({
    mutationFn: (content: string) => api.post(`/questions/${ticketId}/replies`, { content }),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['help-desk-tickets'] });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => api.put(`/questions/${ticketId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-desk-tickets'] });
    }
  });

  const updatePriorityMutation = useMutation({
    mutationFn: (priority: string) => api.put(`/questions/${ticketId}/priority`, { priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-desk-tickets'] });
    }
  });

  const updateAssigneeMutation = useMutation({
    mutationFn: (assignedToId: string) => api.put(`/questions/${ticketId}/assign`, { assignedToId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-desk-tickets'] });
    }
  });

  const updateNotesMutation = useMutation({
    mutationFn: (notes: string) => api.put(`/questions/${ticketId}/notes`, { internalNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-desk-tickets'] });
    }
  });

  if (!isOpen || !ticketId) return null;

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate(replyText);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-[#181818] text-[#B3B3B3] border-[#555555]';
      case 'HIGH':
        return 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]';
      case 'MEDIUM':
        return 'bg-[#181818] text-[#D4D4D4] border-[#2B2B2B]';
      case 'LOW':
        return 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B]';
      default:
        return 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B]';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]';
      case 'Assigned':
        return 'bg-[#2B2B2B] text-[#FFFFFF] border-[#555555]';
      case 'In Progress':
        return 'bg-[#181818] text-[#D4D4D4] border-[#2B2B2B]';
      case 'Resolved':
        return 'bg-[#0E0E0E] text-[#B3B3B3] border-[#2B2B2B]';
      default:
        return 'bg-[#181818] text-[#B3B3B3] border-[#2B2B2B]';
    }
  };

  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden font-mono select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#0E0E0E]/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Drawer Box */}
      <div className="relative w-full max-w-2xl bg-[#181818] h-full shadow-2xl flex flex-col z-50 border-l border-[#2B2B2B] text-[#FFFFFF]">
        {/* Header */}
        <div className="p-6 border-b border-[#2B2B2B] flex justify-between items-center bg-[#0E0E0E]">
          <div>
            <div className="flex gap-2 items-center">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${getPriorityBadge(ticket?.priority || 'MEDIUM')}`}>
                {ticket?.priority || 'MEDIUM'}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(ticket?.status || 'Open')}`}>
                {ticket?.status || 'Open'}
              </span>
            </div>
            <h2 className="text-xl font-bold font-outfit text-[#FFFFFF] mt-2">
              {ticket?.title || 'Help Ticket Details'}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#181818] border border-[#2B2B2B] text-[#FFFFFF] font-bold rounded-full">
                <MapPin className="w-3 h-3 text-[#FFFFFF]" />
                {ticket?.venueLocation || 'Main Venue Desk'}
              </span>
              <span className="text-[#B3B3B3]">
                Category: {ticket?.category} &bull; Asked by: {ticket?.authorName}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#181818] border border-[#2B2B2B] text-[#B3B3B3] hover:text-[#FFFFFF]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Canvas */}
        <div className="flex-1 overflow-y-auto p-6 pb-48 sm:pb-60 space-y-6 text-left">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-10 h-10 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-[#B3B3B3] text-xs font-mono animate-pulse">Loading conversation logs...</p>
            </div>
          )}

          {!isLoading && ticket && (
            <>
              {/* Ticket Content */}
              <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center border-b border-[#2B2B2B] pb-2">
                  <span className="text-[10px] font-bold text-[#B3B3B3] uppercase tracking-wider">Student Description</span>
                  <span className="text-[10px] font-bold text-[#FFFFFF] flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#FFFFFF]" />
                    {ticket.venueLocation}
                  </span>
                </div>
                <p className="text-xs text-[#FFFFFF] font-sans leading-relaxed whitespace-pre-wrap">{ticket.content}</p>
              </div>

              {/* Organizer control center */}
              {!isStudent && (
                <div className="bg-[#0E0E0E] border border-[#2B2B2B] p-5 rounded-xl space-y-4 font-mono text-xs">
                  <h4 className="font-bold text-sm text-[#FFFFFF]">Ticket Coordination Center</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {/* Status */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">Set Status</label>
                      <select
                        className="w-full h-9 px-3 bg-[#181818] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none"
                        value={ticketStatus}
                        onChange={(e) => {
                          setTicketStatus(e.target.value);
                          updateStatusMutation.mutate(e.target.value);
                        }}
                      >
                        <option value="Open">Open</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Waiting for Student">Waiting for Student</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">Set Priority</label>
                      <select
                        className="w-full h-9 px-3 bg-[#181818] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none"
                        value={ticketPriority}
                        disabled={user?.role !== 'ADMINISTRATOR' && user?.role !== 'CHECK_IN_ADMIN'}
                        onChange={(e) => {
                          setTicketPriority(e.target.value);
                          updatePriorityMutation.mutate(e.target.value);
                        }}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                    </div>

                    {/* Assignee */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#B3B3B3] mb-1">Assignee</label>
                      <select
                        className="w-full h-9 px-3 bg-[#181818] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none"
                        value={ticketAssigneeId}
                        onChange={(e) => {
                          setTicketAssigneeId(e.target.value);
                          updateAssigneeMutation.mutate(e.target.value);
                        }}
                      >
                        <option value="">Unassigned</option>
                        {judges.map((j: any) => (
                          <option key={j.id} value={j.id}>{j.name} (Judge)</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Private Internal Notes */}
                  <div className="space-y-1.5 pt-3 border-t border-[#2B2B2B]">
                    <label className="block text-[11px] font-bold text-[#B3B3B3] uppercase tracking-wider">Internal Notes (Hidden from Student)</label>
                    <div className="flex gap-2">
                      <textarea
                        className="flex-1 h-16 p-3 bg-[#181818] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none font-mono"
                        placeholder="Private details, progress codes, or warnings..."
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => updateNotesMutation.mutate(internalNotes)}
                        className="bg-[#FFFFFF] text-[#0E0E0E] font-bold text-xs px-4 rounded-xl hover:bg-[#D4D4D4]"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversation Log Thread */}
              <div className="space-y-4 font-mono">
                <h4 className="font-bold text-sm text-[#FFFFFF]">Conversation Thread</h4>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {ticket.replies.length === 0 ? (
                    <p className="text-[#B3B3B3] italic text-xs text-center py-4 bg-[#0E0E0E] rounded-xl border border-[#2B2B2B] border-dashed">
                      No thread responses yet. Send the first response below.
                    </p>
                  ) : (
                    ticket.replies.map((reply: any) => {
                      const isMe = reply.authorName === user?.name;
                      return (
                        <div key={reply.id} className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                          <div className={`p-4 rounded-xl border leading-relaxed text-xs ${
                            isMe
                              ? 'bg-[#FFFFFF] text-[#0E0E0E] border-[#FFFFFF]'
                              : 'bg-[#0E0E0E] text-[#FFFFFF] border-[#2B2B2B]'
                          }`}>
                            <p className="whitespace-pre-wrap font-sans">{reply.content}</p>
                          </div>
                          <span className="text-[10px] text-[#B3B3B3] mt-1 font-mono">
                            {reply.authorName} &bull; {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Send Response Form */}
              <form onSubmit={handlePostReply} className="space-y-3 pt-4 border-t border-[#2B2B2B] font-mono">
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder={isStudent ? 'Type response here...' : 'Reply to student leader...'}
                    className="flex-1 h-10 px-4 bg-[#0E0E0E] border border-[#2B2B2B] rounded-xl text-xs text-[#FFFFFF] focus:outline-none focus:border-[#FFFFFF]"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={replyMutation.isPending}
                    className="bg-[#FFFFFF] text-[#0E0E0E] font-bold px-5 rounded-xl hover:bg-[#D4D4D4] transition-colors text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </button>
                </div>

                {/* Attachments slot indicator */}
                <div className="text-[11px] text-[#B3B3B3] flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-[#B3B3B3]" />
                  <span>File attachments and AI Suggested replies coming in next phase.</span>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailDrawer;
