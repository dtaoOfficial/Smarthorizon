import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../shared/services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMINISTRATOR' | 'CHECK_IN_ADMIN' | 'JUDGE' | 'STUDENT' | 'DATA_ENTRY';
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasRole: (roles: ('ADMINISTRATOR' | 'CHECK_IN_ADMIN' | 'JUDGE' | 'STUDENT' | 'DATA_ENTRY')[]) => boolean;
  setPasswordChanged: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setPasswordChanged = () => {
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
  };

  const checkAuth = async () => {
    const currentToken = localStorage.getItem('accessToken');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
    } catch (error) {
      console.error('Failed to verify user session:', error);
      if (localStorage.getItem('accessToken') === currentToken) {
        api.clearTokens();
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password }, { skipAuth: true });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('smarthorizon_last_activity_time', String(Date.now()));
      setUser(data.user);
      return data.user;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error on server:', error);
    } finally {
      api.clearTokens();
      setUser(null);
      setIsLoading(false);
    }
  };

  const hasRole = (roles: ('ADMINISTRATOR' | 'CHECK_IN_ADMIN' | 'JUDGE' | 'STUDENT' | 'DATA_ENTRY')[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      api.clearTokens();
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        checkAuth,
        hasRole,
        setPasswordChanged,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

