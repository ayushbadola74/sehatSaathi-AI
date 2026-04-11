import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Globe, Users, ShieldAlert, Trash2, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './Settings.css';

const Settings = () => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState({
    language: 'English',
    enableSOS: true,
  });
  const [toast, setToast] = useState('');

  useEffect(() => {
    const savedData = localStorage.getItem('sehatSaathiUser');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setSettings({
        language: parsed.preferredLanguage || 'English',
        enableSOS: parsed.enableSOS !== undefined ? parsed.enableSOS : true
      });
    }
  }, []);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSettings(prev => ({ ...prev, language: newLang }));
    updateLocalStorage({ preferredLanguage: newLang });
    window.dispatchEvent(new Event('languageUpdated'));
    showToast('Language updated successfully');
  };

  const handleSOSToggle = () => {
    const newSOS = !settings.enableSOS;
    setSettings(prev => ({ ...prev, enableSOS: newSOS }));
    updateLocalStorage({ enableSOS: newSOS });
    showToast(newSOS ? 'SOS Alerts Enabled' : 'SOS Alerts Disabled');
  };

  const updateLocalStorage = (updates) => {
    const savedData = localStorage.getItem('sehatSaathiUser');
    let parsed = {};
    if (savedData) parsed = JSON.parse(savedData);
    localStorage.setItem('sehatSaathiUser', JSON.stringify({ ...parsed, ...updates }));
  };

  const clearData = () => {
    if (window.confirm("Are you sure you want to clear your Health History? This will not affect your SOS History or Profile. This cannot be undone.")) {
      localStorage.removeItem('healthHistory');
      window.dispatchEvent(new Event('healthHistoryUpdated'));
      showToast('Health History cleared successfully');
    }
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <SettingsIcon size={32} className="text-blue" />
        <h2 className="page-title" style={{marginBottom: 0}}>{t('settings', 'title')}</h2>
      </div>

      <div className="settings-panel card">
        {/* Language Option */}
        <div className="settings-item">
          <div className="settings-item-info">
            <Globe className="settings-icon text-blue" />
            <div>
              <h3>{t('settings', 'langTitle')}</h3>
              <p>{t('settings', 'langDesc')}</p>
            </div>
          </div>
          <select 
            className="input-field settings-select"
            value={settings.language}
            onChange={handleLanguageChange}
          >
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Marathi">Marathi</option>
          </select>
        </div>

        {/* Update Contacts */}
        <div className="settings-item">
          <div className="settings-item-info">
            <Users className="settings-icon text-blue" />
            <div>
              <h3>{t('settings', 'contactTitle')}</h3>
              <p>{t('settings', 'contactDesc')}</p>
            </div>
          </div>
          <button className="btn btn-outline" onClick={() => window.location.href='/setup'}>
            {t('settings', 'editContactsBtn')}
          </button>
        </div>

        {/* SOS Toggle */}
        <div className="settings-item">
          <div className="settings-item-info">
            <ShieldAlert className="settings-icon text-danger" />
            <div>
              <h3>{t('settings', 'sosTitle')}</h3>
              <p>{t('settings', 'sosDesc')}</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input 
              type="checkbox" 
              checked={settings.enableSOS}
              onChange={handleSOSToggle}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Clear Data */}
        <div className="settings-item border-none">
          <div className="settings-item-info">
            <Trash2 className="settings-icon text-danger" />
            <div>
              <h3>{t('settings', 'clearTitle')}</h3>
              <p>{t('settings', 'clearDesc')}</p>
            </div>
          </div>
          <button className="btn btn-danger" onClick={clearData}>
            {t('settings', 'clearBtn')}
          </button>
        </div>
      </div>

      {toast && (
        <div className="toast-notification">
          <CheckCircle size={20} />
          {toast}
        </div>
      )}
    </div>
  );
};

export default Settings;
