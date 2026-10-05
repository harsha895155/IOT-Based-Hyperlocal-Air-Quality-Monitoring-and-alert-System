import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEME_PRESETS = [
  { id: 'obsidian', name: 'Midnight Obsidian', description: 'Deep space glassmorphic dark mode' },
  { id: 'neon', name: 'Cyberpunk Neon', description: 'Electric emerald & violet glowing accents' },
  { id: 'slate', name: 'Titanium Slate', description: 'Minimalist industrial matte dark mode' },
  { id: 'light', name: 'Ceramic Light', description: 'Ultra-clean frosted daylight theme' },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('airguard_theme') || 'obsidian';
  });

  const [resolvedTheme, setResolvedTheme] = useState('obsidian');

  useEffect(() => {
    localStorage.setItem('airguard_theme', theme);

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(isDark ? 'obsidian' : 'light');
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'obsidian' : 'light'));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        presets: THEME_PRESETS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
