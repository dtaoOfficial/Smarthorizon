import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../shared/services/api';
import { useAuth } from './AuthContext';

export interface Track {
  id: string;
  name: string;
  hackathonId: string;
  resultsLocked?: boolean;
  leaderboardVisibility?: string;
  exposeScoresToStudents?: boolean;
}

interface TrackContextType {
  selectedTrackId: string | null;
  selectedTrackName: string;
  tracks: Track[];
  setSelectedTrackId: (id: string | null) => void;
  isLoading: boolean;
  refetchTracks: () => Promise<void>;
}

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export const TrackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedTrackId, setSelectedTrackIdState] = useState<string | null>(() => {
    return localStorage.getItem('selectedTrackId');
  });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();

  const fetchTracks = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await api.get('/tracks');
      setTracks(data.tracks || []);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setSelectedTrackId = (id: string | null) => {
    setSelectedTrackIdState(id);
    if (id === null) {
      localStorage.removeItem('selectedTrackId');
    } else {
      localStorage.setItem('selectedTrackId', id);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTracks();
    } else {
      setTracks([]);
      setSelectedTrackIdState(null);
      localStorage.removeItem('selectedTrackId');
    }
  }, [isAuthenticated]);

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const selectedTrackName = selectedTrack ? selectedTrack.name : 'All Tracks';

  return (
    <TrackContext.Provider
      value={{
        selectedTrackId,
        selectedTrackName,
        tracks,
        setSelectedTrackId,
        isLoading,
        refetchTracks: fetchTracks,
      }}
    >
      {children}
    </TrackContext.Provider>
  );
};

export const useTrack = (): TrackContextType => {
  const context = useContext(TrackContext);
  if (!context) {
    throw new Error('useTrack must be used within a TrackProvider');
  }
  return context;
};
