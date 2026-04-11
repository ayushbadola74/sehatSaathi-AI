import React, { createContext, useState, useEffect, useContext } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  return useContext(LanguageContext);
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('English');

  useEffect(() => {
    const handleStorageChange = () => {
      // Fallback initialization rule
      if (!localStorage.getItem('preferredLanguage')) {
        localStorage.setItem('preferredLanguage', 'English');
      }
      
      let activeLang = localStorage.getItem('preferredLanguage') || 'English';

      const savedData = localStorage.getItem('sehatSaathiUser');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.preferredLanguage && translations[parsed.preferredLanguage]) {
            activeLang = parsed.preferredLanguage;
            // Sync selector choices back to the top level 
            localStorage.setItem('preferredLanguage', activeLang);
          }
        } catch (e) {
          console.error("Language parsing error", e);
        }
      }
      
      setLanguage(translations[activeLang] ? activeLang : 'English');
    };

    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('languageUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageUpdated', handleStorageChange);
    };
  }, []);

  const t = (section, key) => {
    // Graceful fallback to English if missing
    if (!translations[language] || !translations[language][section] || !translations[language][section][key]) {
       return translations['English'][section]?.[key] || key;
    }
    return translations[language][section][key];
  };

  return (
    <LanguageContext.Provider value={{ language, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
