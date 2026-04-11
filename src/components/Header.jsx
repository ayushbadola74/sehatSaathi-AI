import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Globe, Settings, PhoneCall } from 'lucide-react';
import heartbeatLogo from '../assets/heartbeat-logo.svg';
import { useLanguage } from '../contexts/LanguageContext';
import './Header.css';

const Header = () => {
  const { t, language } = useLanguage();

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    const savedData = localStorage.getItem('sehatSaathiUser');
    let parsed = {};
    if (savedData) parsed = JSON.parse(savedData);
    localStorage.setItem('sehatSaathiUser', JSON.stringify({ ...parsed, preferredLanguage: newLang }));
    window.dispatchEvent(new Event('languageUpdated'));
  };

  const triggerSOS = () => {
    const sosBtn = document.querySelector('.sos-button');
    if (sosBtn) sosBtn.click();
  };

  return (
    <header className="app-header">
      <div className="header-container">
        
        {/* Left Aligned - Logo */}
        <div className="logo-section pulse-anim">
          <img src={heartbeatLogo} alt="SehatSaathi Logo" width="38" height="38" className="brand-logo" />
          <div className="logo-text">
            <h1>{t('nav', 'appName')}</h1>
            <p>{t('nav', 'appDesc')}</p>
          </div>
        </div>

        {/* Center Aligned - Nav Links (Settings moved to right) */}
        <nav className="nav-menu">
          <NavLink to="/home" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{t('nav', 'home')}</NavLink>
          <NavLink to="/symptoms" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{t('nav', 'symptomChecker')}</NavLink>
          <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{t('nav', 'reportAnalyzer')}</NavLink>
          <NavLink to="/doctors" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{t('nav', 'hospitals')}</NavLink>
          <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{t('nav', 'history')}</NavLink>
        </nav>

        {/* Right Aligned - Actions */}
        <div className="header-actions">
          <div className="language-selector">
            <Globe size={18} className="icon" />
            <select value={language} onChange={handleLanguageChange}>
              <option value="English">{t('nav', 'langEn')}</option>
              <option value="Hindi">{t('nav', 'langHi')}</option>
              <option value="Marathi">{t('nav', 'langMr')}</option>
            </select>
          </div>
          
          <div className="action-icons">
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'icon-btn active' : 'icon-btn'} title={t('nav', 'settings')}>
              <Settings size={22} />
            </NavLink>
            <button className="icon-btn sos-nav-btn" onClick={triggerSOS} title={t('nav', 'sosTooltip')}>
              <PhoneCall size={22} />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;
