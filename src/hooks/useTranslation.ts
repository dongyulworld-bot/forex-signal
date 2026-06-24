'use client';

import { useState, useEffect } from 'react';
import { translations, Locale } from '@/lib/translations';

export function useTranslation() {
  const [locale, setLocale] = useState<Locale>('ko');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('locale') as Locale;
    if (saved === 'ko' || saved === 'en') {
      setLocale(saved);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'locale' && (e.newValue === 'ko' || e.newValue === 'en')) {
        setLocale(e.newValue as Locale);
      }
    };
    
    const handleLocalChange = () => {
      const current = localStorage.getItem('locale') as Locale;
      if (current === 'ko' || current === 'en') {
        setLocale(current);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localeChange', handleLocalChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localeChange', handleLocalChange);
    };
  }, []);

  const t = (key: keyof typeof translations['ko']) => {
    return translations[locale][key] || translations['ko'][key];
  };

  const changeLanguage = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    window.dispatchEvent(new Event('localeChange'));
  };

  return { locale, t, changeLanguage, isMounted };
}
