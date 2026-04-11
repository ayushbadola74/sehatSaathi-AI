import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, Sparkles } from 'lucide-react';
import symptomCheckerLogo from '../assets/symptom-checker-logo.svg';
import reportAnalysisLogo from '../assets/report-analysis-logo.svg';
import emergencySosLogo from '../assets/emergency-sos-logo.svg';
import { useLanguage } from '../contexts/LanguageContext';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="home-dashboard">
      <div className="home-hero">
        <div className="hero-pill pulse-anim">
          <Sparkles size={16} />
          <span>{t('nav', 'appName')}</span>
        </div>
        
        <h1 className="welcome-title">
          {t('home', 'heroTitle')}
        </h1>
        
        <p className="welcome-subtitle">
          {t('home', 'heroSubtitle')}
        </p>

        <div className="hero-action-buttons">
          <button className="btn btn-primary btn-large" onClick={() => navigate('/symptoms')}>
            {t('home', 'startSymptom')} <ArrowRight size={18} />
          </button>
          <button className="btn btn-outline btn-large bg-white" onClick={() => navigate('/reports')}>
            {t('home', 'uploadReport')}
          </button>
        </div>
      </div>

      <div className="services-section">
        <div className="services-header">
          <h2>{t('home', 'features')}</h2>
          <p>{t('nav', 'appDesc')}</p>
        </div>

        <div className="feature-cards-container">
          <div 
            className="feature-card" 
            onClick={() => navigate('/symptoms')}
          >
            <div className="feature-icon-wrapper blue-bg">
              <img src={symptomCheckerLogo} alt="Symptom Checker" className="feature-icon" style={{filter: 'invert(30%) sepia(99%) saturate(1915%) hue-rotate(204deg) brightness(98%) contrast(93%)'}} />
            </div>
            <h3 className="feature-title">{t('home', 'featSymptomTitle')}</h3>
            <p className="feature-description">{t('home', 'featSymptomDesc')}</p>
          </div>

          <div 
            className="feature-card" 
            onClick={() => navigate('/reports')}
          >
            <div className="feature-icon-wrapper green-bg">
              <img src={reportAnalysisLogo} alt="Report Analyzer" className="feature-icon" style={{filter: 'invert(52%) sepia(49%) saturate(416%) hue-rotate(99deg) brightness(92%) contrast(93%)'}} />
            </div>
            <h3 className="feature-title">{t('home', 'featReportTitle')}</h3>
            <p className="feature-description">{t('home', 'featReportDesc')}</p>
          </div>

          <div 
            className="feature-card alert-card" 
            onClick={() => navigate('/doctors')}
          >
            <div className="feature-icon-wrapper red-bg">
              <img src={emergencySosLogo} alt="Emergency SOS" className="feature-icon" style={{filter: 'invert(37%) sepia(93%) saturate(1210%) hue-rotate(331deg) brightness(96%) contrast(92%)'}} />
            </div>
            <h3 className="feature-title">{t('home', 'featHospitalsTitle')}</h3>
            <p className="feature-description">{t('home', 'featHospitalsDesc')}</p>
          </div>

          <div 
            className="feature-card" 
            onClick={() => navigate('/history')}
          >
            <div className="feature-icon-wrapper purple-bg">
              <Clock className="feature-icon" color="var(--purple-color, #6f42c1)" size={32} />
            </div>
            <h3 className="feature-title">{t('home', 'featHistoryTitle')}</h3>
            <p className="feature-description">{t('home', 'featHistoryDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
