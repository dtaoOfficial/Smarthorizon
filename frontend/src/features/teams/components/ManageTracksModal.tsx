import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../shared/services/api';
import { Track } from '../../../context/TrackContext';

interface ManageTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  refetchTracks: () => Promise<void>;
}

export const ManageTracksModal: React.FC<ManageTracksModalProps> = ({
  isOpen,
  onClose,
  tracks,
  refetchTracks,
}) => {
  const queryClient = useQueryClient();
  const [newTrackName, setNewTrackName] = useState('');
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mutations
  const createTrackMutation = useMutation({
    mutationFn: (name: string) => api.post('/tracks', { name }),
    onSuccess: () => {
      setNewTrackName('');
      setErrorMessage(null);
      refetchTracks();
      queryClient.invalidateQueries({ queryKey: ['registration-teams'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to create track.');
    }
  });

  const editTrackMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.put(`/tracks/${id}`, { name }),
    onSuccess: () => {
      setEditingTrackId(null);
      setErrorMessage(null);
      refetchTracks();
      queryClient.invalidateQueries({ queryKey: ['registration-teams'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to edit track.');
    }
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tracks/${id}`),
    onSuccess: () => {
      setErrorMessage(null);
      refetchTracks();
      queryClient.invalidateQueries({ queryKey: ['registration-teams'] });
    },
    onError: (err: any) => {
      // Catches track safety warnings (assigned teams)
      setErrorMessage(err.message || 'Failed to delete track.');
    }
  });

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackName.trim()) return;
    createTrackMutation.mutate(newTrackName.trim());
  };

  const handleStartEdit = (track: Track) => {
    setEditingTrackId(track.id);
    setEditingName(track.name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;
    editTrackMutation.mutate({ id, name: editingName.trim() });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this track?')) {
      deleteTrackMutation.mutate(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#071A3D]/40 backdrop-blur-md" onClick={onClose} />

      {/* Modal Box */}
      <div className="bg-[#DCEEFF] border border-[#BFD4E8] p-6 rounded-3xl shadow-2xl w-full max-w-lg z-50 text-left space-y-4 text-[#071A3D]">
        <div className="flex justify-between items-center border-b border-[#BFD4E8] pb-2">
          <h3 className="text-xl font-bold font-display text-[#071A3D]">Manage Competition Tracks</h3>
          <button onClick={onClose} className="text-[#566781] hover:text-[#071A3D] p-1 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Display Error Message */}
        {errorMessage && (
          <div className="p-3.5 bg-red-500/10 text-red-700 border border-red-300 rounded-xl text-xs flex gap-2">
            <span className="material-symbols-outlined text-[16px] mt-0.5 text-red-600">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Create track form */}
        <form onSubmit={handleCreate} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-mono font-semibold text-[#566781] mb-1.5">Create New Theme Track</label>
            <input
              type="text"
              required
              className="w-full h-10 px-3.5 bg-[#EAF5FF] border border-[#BFD4E8] rounded-xl text-xs text-[#071A3D] focus:outline-none focus:ring-2 focus:ring-[#2F80ED]/50"
              placeholder="e.g. BioTech"
              value={newTrackName}
              onChange={(e) => setNewTrackName(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={createTrackMutation.isPending}
            className="bg-[#2F80ED] hover:bg-[#1B66C9] text-white font-bold px-4 h-10 rounded-xl text-xs shadow-sm transition-all whitespace-nowrap"
          >
            Create Track
          </button>
        </form>

        {/* Tracks List */}
        <div className="space-y-2 pt-2">
          <span className="block font-mono font-bold text-[#566781] uppercase tracking-wider text-[10px]">
            Active Event Tracks ({tracks.length})
          </span>
          <div className="border border-[#BFD4E8] rounded-2xl divide-y divide-[#BFD4E8] overflow-hidden max-h-[250px] overflow-y-auto bg-[#EAF5FF]">
            {tracks.length === 0 ? (
              <p className="p-4 text-center text-[#566781] text-xs font-mono">No tracks registered yet.</p>
            ) : (
              tracks.map((track) => (
                <div key={track.id} className="p-3 flex justify-between items-center bg-[#EAF5FF]">
                  {editingTrackId === track.id ? (
                    <input
                      type="text"
                      className="h-8 px-2 bg-[#DCEEFF] border border-[#BFD4E8] rounded-lg text-xs text-[#071A3D] focus:outline-none focus:ring-2 focus:ring-[#2F80ED] flex-1 mr-2"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                  ) : (
                    <span className="font-bold text-xs text-[#071A3D]">{track.name}</span>
                  )}

                  <div className="flex gap-1.5">
                    {editingTrackId === track.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(track.id)}
                          className="p-1 text-emerald-600 hover:bg-[#C7E2FA] rounded-lg"
                          title="Save Changes"
                        >
                          <span className="material-symbols-outlined text-[18px]">done</span>
                        </button>
                        <button
                          onClick={() => setEditingTrackId(null)}
                          className="p-1 text-[#566781] hover:bg-[#C7E2FA] rounded-lg"
                          title="Cancel"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(track)}
                          className="p-1 text-[#2F80ED] hover:bg-[#C7E2FA] rounded-lg"
                          title="Edit Name"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(track.id)}
                          className="p-1 text-rose-600 hover:bg-[#C7E2FA] rounded-lg"
                          title="Delete Track"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#BFD4E8]">
          <button
            onClick={onClose}
            className="border border-[#BFD4E8] bg-[#EAF5FF] hover:bg-[#C7E2FA] px-6 py-2 rounded-xl text-xs font-bold text-[#071A3D] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default ManageTracksModal;
