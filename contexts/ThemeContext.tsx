import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  accent: string;
  accentLight: string;
  success: string;
  warning: string;
  error: string;
  errorLight: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  inputBackground: string;
  inputBorder: string;
  modalOverlay: string;
  shadowColor: string;
  statusBar: 'light' | 'dark';
}

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  backgroundSecondary: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#1C1C1E',
  textMuted: '#8E8E93',
  border: '#E5E5EA',
  divider: '#E5E5EA',
  accent: '#007AFF',
  accentLight: '#E5F2FF',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  errorLight: '#FFEBEE',
  tabBar: '#FFFFFF',
  tabBarActive: '#007AFF',
  tabBarInactive: 'rgba(0, 0, 0, 0.4)',
  inputBackground: '#F9F9F9',
  inputBorder: '#DDD',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  shadowColor: '#000',
  statusBar: 'dark',
};

const darkColors: ThemeColors = {
  background: '#0A0A0A',
  backgroundSecondary: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#E5E5EA',
  textMuted: '#8E8E93',
  border: '#38383A',
  divider: '#38383A',
  accent: '#0A84FF',
  accentLight: '#1A3A5C',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  errorLight: '#3A1A1A',
  tabBar: '#0A0A0A',
  tabBarActive: '#FFFFFF',
  tabBarInactive: 'rgba(255, 255, 255, 0.6)',
  inputBackground: '#1C1C1E',
  inputBorder: '#38383A',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
  shadowColor: '#000',
  statusBar: 'light',
};

interface ThemeContextType {
  theme: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const { user } = useAuth();

  const colors = theme === 'dark' ? darkColors : lightColors;
  const isDark = theme === 'dark';

  useEffect(() => {
    if (user?.id) {
      loadThemePreference();
    }
  }, [user?.id]);

  const loadThemePreference = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('theme_preference')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading theme preference:', error);
        return;
      }

      if (data?.theme_preference) {
        setThemeState(data.theme_preference as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (newTheme: ThemeMode) => {
    if (!user?.id) return;

    try {
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('user_preferences')
          .update({ theme_preference: newTheme })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_preferences')
          .insert({ user_id: user.id, theme_preference: newTheme });
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    saveThemePreference(newTheme);
  }, [user?.id]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [theme, setTheme]);

  const value = {
    theme,
    colors,
    isDark,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
