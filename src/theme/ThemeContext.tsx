import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ColorTokens,
  darkColors,
  lightColors,
  updateStaticColors,
  getThemedShadows,
} from './tokens';

export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = '@memorial:theme_mode';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ColorTokens;
  shadows: ReturnType<typeof getThemedShadows>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  isDark: true,
  colors: darkColors,
  shadows: getThemedShadows(true),
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  // Carrega a preferência persistida
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') {
          setThemeModeState(stored);
          updateStaticColors(stored === 'light' ? lightColors : darkColors);
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar tema do Memorial:', err);
      });
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      updateStaticColors(mode === 'light' ? lightColors : darkColors);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (err) {
      console.warn('Erro ao salvar tema do Memorial:', err);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    await setThemeMode(nextMode);
  }, [themeMode, setThemeMode]);

  const colors = useMemo(() => {
    return themeMode === 'dark' ? darkColors : lightColors;
  }, [themeMode]);

  const shadows = useMemo(() => {
    return getThemedShadows(themeMode === 'dark');
  }, [themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark: themeMode === 'dark',
      colors,
      shadows,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, colors, shadows, setThemeMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
