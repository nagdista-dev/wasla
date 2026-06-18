import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadSetting, saveSetting } from '../storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('wasla_theme') as Theme | null;
    if (saved) return saved;
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    saveSetting('wasla_theme', theme);
  }, [theme]);

  useEffect(() => {
    loadSetting<Theme>('wasla_theme').then((saved) => {
      if (saved) {
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');
      }
    });
  }, []);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
