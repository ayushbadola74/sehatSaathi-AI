import React, { useState, useEffect, useRef } from 'react';
import { PhoneCall, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './EmergencySOSButton.css';

const EmergencySOSButton = () => {
  const { t } = useLanguage();
  const [showAlert, setShowAlert] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isSent, setIsSent] = useState(false);
  const timerRef = useRef(null);

  const executeEmergencyProtocol = () => {
    setIsSent(true);
    const contactNumber = localStorage.getItem('emergencyContact') || '';
    
    const sendSms = (locationLink) => {
      try {
        const historyEntry = {
          date: new Date().toISOString(),
          symptoms: `Emergency SOS Alert Triggered`,
          condition: `Location: ${locationLink || 'Unavailable'}`,
          riskLevel: `Emergency`,
          recommendedSpecialist: `Emergency Contact notified`,
          nextStepGuidance: "Wait for emergency response or head to hospital."
        };
        const existingHistory = JSON.parse(localStorage.getItem('sosHistory') || '[]');
        existingHistory.push(historyEntry);
        localStorage.setItem('sosHistory', JSON.stringify(existingHistory.slice(-50)));
        window.dispatchEvent(new Event('sosHistoryUpdated'));
      } catch (error) {
        console.error("Failed to log SOS event:", error);
      }

      // STRICTLY ENFORCING ENGLISH LOCALE FOR SMS OUTPUT (Safety/Compatibility Constraint)
      const baseMessage = "EMERGENCY ALERT: I need immediate assistance!";
      const message = locationLink 
        ? `${baseMessage} My current location is: ${locationLink}`
        : `${baseMessage} (Location unavailable)`;
      
      const smsUrl = `sms:${contactNumber}?body=${encodeURIComponent(message)}`;
      window.location.href = smsUrl;
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
          sendSms(mapLink);
        },
        (error) => {
          console.error("Geolocation error:", error);
          sendSms(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      sendSms(null);
    }
  };

  const handleSosClick = () => {
    if (showAlert) return;
    setIsSent(false);
    setCountdown(5);
    setShowAlert(true);
  };

  const handleCancel = () => {
    clearTimeout(timerRef.current);
    setShowAlert(false);
  };

  useEffect(() => {
    if (showAlert && !isSent && countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showAlert && !isSent && countdown === 0) {
      executeEmergencyProtocol();
    }
    return () => clearTimeout(timerRef.current);
  }, [showAlert, countdown, isSent]);

  return (
    <>
      <button className="sos-button pulse-anim" onClick={handleSosClick}>
        <PhoneCall size={28} />
        <span>{t('sos', 'btnText')}</span>
      </button>

      {showAlert && (
        <div className="sos-alert-popup">
          <div className="sos-alert-content">
            <button className="close-btn" onClick={handleCancel}>
              <X size={20} />
            </button>
            
            {!isSent ? (
              <>
                <div className="sos-icon-large pulse-anim">
                  <PhoneCall size={48} color="white" />
                </div>
                <h3>{t('sos', 'popupTitle')}</h3>
                <p>
                  {t('sos', 'popupDesc')} <strong style={{fontSize: '1.2em', color: 'var(--danger-color, #dc3545)'}}>{countdown}</strong> {t('sos', 'sec')}
                </p>
                <button 
                  onClick={handleCancel} 
                  style={{
                    marginTop: '1.5rem', 
                    padding: '0.6rem 2.5rem', 
                    backgroundColor: 'var(--bg-light, #f8f9fa)', 
                    color: 'var(--text-dark, #333)', 
                    border: '2px solid var(--border-color, #dee2e6)', 
                    borderRadius: '50px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t('sos', 'cancel')}
                </button>
              </>
            ) : (
              <>
                <div className="sos-icon-large" style={{ backgroundColor: 'var(--success-color, #10b981)', animation: 'none' }}>
                  <PhoneCall size={48} color="white" />
                </div>
                <h3 style={{ color: 'var(--success-color, #10b981)' }}>{t('sos', 'successTitle')}</h3>
                <p>{t('sos', 'successDesc')}</p>
                <button 
                  onClick={handleCancel} 
                  style={{
                    marginTop: '1.5rem', 
                    padding: '0.6rem 2.5rem', 
                    backgroundColor: 'var(--primary-color, #2563eb)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '50px', 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Okay
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencySOSButton;
