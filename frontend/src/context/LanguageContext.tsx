import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import en from '../locales/en';
import ar from '../locales/ar';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = { en, ar };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('wasla_language') as Language | null;
    if (saved) return saved;
    return navigator.language.startsWith('ar') ? 'ar' : 'en';
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    localStorage.setItem('wasla_language', language);
  }, [language, isRTL]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[language];
      let value = dict[key];
      if (value === undefined) {
        value = translations['en'][key] ?? key;
      }
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v));
        }
      }
      return value;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isRTL, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
