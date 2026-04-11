import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, CheckCircle, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './UserSetup.css';

const UserSetup = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    emergencyContact: '',
    alternateContact: '',
    age: '',
    gender: 'Prefer not to say',
    preferredLanguage: 'English',
    enableSOS: true
  });

  useEffect(() => {
    const savedData = localStorage.getItem('sehatSaathiUser');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('sehatSaathiUser', JSON.stringify(formData));
    localStorage.setItem('emergencyContact', formData.alternateContact || formData.emergencyContact);
    window.dispatchEvent(new Event('languageUpdated'));
    navigate('/home');
  };

  return (
    <div className="setup-page">
      <div className="setup-container card">
        <div className="setup-header">
          <div className="icon-container pulse-anim">
            <User size={32} color="var(--primary-blue)" />
          </div>
          <h2 className="page-title" style={{marginBottom: '0.5rem'}}>{t('setup', 'title')}</h2>
          <p className="subtitle">{t('setup', 'desc')}</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="fullName">{t('setup', 'name')}</label>
              <input 
                type="text" 
                id="fullName" 
                name="fullName" 
                className="input-field" 
                placeholder={t('setup', 'namePlaceholder')}
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="mobileNumber">{t('setup', 'phone')}</label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input 
                  type="tel" 
                  id="mobileNumber" 
                  name="mobileNumber" 
                  className="input-field pl-10" 
                  placeholder={t('setup', 'phonePlaceholder')}
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="emergencyContact">{t('setup', 'contactTitle')} (Primary)</label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon danger-icon" />
                <input 
                  type="tel" 
                  id="emergencyContact" 
                  name="emergencyContact" 
                  className="input-field pl-10" 
                  placeholder={t('setup', 'contactDesc')}
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="alternateContact">{t('setup', 'contactTitle')} (Alternate)</label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon warning-icon" />
                <input 
                  type="tel" 
                  id="alternateContact" 
                  name="alternateContact" 
                  className="input-field pl-10" 
                  placeholder={t('setup', 'contactDesc')}
                  value={formData.alternateContact}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="age">{t('setup', 'age')}</label>
              <input 
                type="number" 
                id="age" 
                name="age" 
                className="input-field" 
                placeholder={t('setup', 'agePlaceholder')}
                value={formData.age}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="gender">{t('setup', 'gender')}</label>
              <select 
                id="gender" 
                name="gender" 
                className="input-field"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Male">{t('setup', 'genderOptions')?.[1] || "Male"}</option>
                <option value="Female">{t('setup', 'genderOptions')?.[2] || "Female"}</option>
                <option value="Other">{t('setup', 'genderOptions')?.[3] || "Other"}</option>
                <option value="Prefer not to say">{t('setup', 'genderOptions')?.[4] || "Prefer not to say"}</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="preferredLanguage">{t('setup', 'lang')}</label>
              <select 
                id="preferredLanguage" 
                name="preferredLanguage" 
                className="input-field"
                value={formData.preferredLanguage}
                onChange={handleChange}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
              </select>
            </div>
          </div>

          <div className="sos-toggle-section">
            <div className="sos-toggle-info">
              <ShieldAlert size={24} color="var(--danger-red)" />
              <div>
                <h4>{t('settings', 'sosTitle')}</h4>
                <p>{t('settings', 'sosDesc')}</p>
              </div>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                name="enableSOS"
                checked={formData.enableSOS}
                onChange={handleChange}
              />
              <span className="slider"></span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary submit-btn">
            <CheckCircle size={20} />
            {t('setup', 'setupCompleteBtn')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserSetup;
