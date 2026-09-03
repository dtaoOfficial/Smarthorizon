import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  studentTheme: ThemeMode;
  toggleStudentTheme: () => void;
  setStudentTheme: (theme: ThemeMode) => void;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [studentTheme, setStudentThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('smarthorizon_student_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  const setStudentTheme = (theme: ThemeMode) => {
    setStudentThemeState(theme);
    try {
      localStorage.setItem('smarthorizon_student_theme', theme);
    } catch (e) {}
  };

  const toggleStudentTheme = () => {
    const next = studentTheme === 'dark' ? 'light' : 'dark';
    setStudentTheme(next);
  };

  // Active theme is Light if user is a JUDGE or if student enabled 'light' theme
  const isLight = user?.role === 'JUDGE' || (user?.role === 'STUDENT' && studentTheme === 'light');

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, [isLight]);

  return (
    <ThemeContext.Provider
      value={{
        studentTheme,
        toggleStudentTheme,
        setStudentTheme,
        isLight,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      studentTheme: 'dark',
      toggleStudentTheme: () => {},
      setStudentTheme: () => {},
      isLight: false,
    };
  }
  return context;
};
