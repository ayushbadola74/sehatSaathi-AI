import React, { useState } from 'react';
import { Activity, Mic, Search, AlertTriangle, ChevronRight, Stethoscope, HeartPulse } from 'lucide-react';
import { Mistral } from '@mistralai/mistralai';
import symptomCheckerLogo from '../assets/symptom-checker-logo.svg';
import { useLanguage } from '../contexts/LanguageContext';
import './SymptomChecker.css';

const SymptomChecker = () => {
  const { t, language } = useLanguage();
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const handleSetResults = (resObj) => {
    setResults(resObj);
    try {
      const historyEntry = {
        date: new Date().toISOString(),
        symptoms: symptoms,
        symptomsEn: symptoms,
        condition: resObj.condition,
        conditionEn: resObj.conditionEn,
        riskLevel: resObj.riskLevel,
        recommendedSpecialist: resObj.recommendedSpecialist,
        recommendedSpecialistEn: resObj.recommendedSpecialistEn,
        nextStepGuidance: resObj.nextSteps,
        nextStepGuidanceEn: resObj.nextStepsEn
      };
      const existingHistory = JSON.parse(localStorage.getItem('healthHistory') || '[]');
      existingHistory.push(historyEntry);
      localStorage.setItem('healthHistory', JSON.stringify(existingHistory.slice(-50)));
      window.dispatchEvent(new Event('healthHistoryUpdated'));
    } catch (e) {
      console.error("Failed to save health history", e);
    }
  };

  const handleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';

    // Explicit tuning constraints requested to prevent silent aborts
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("Listening started...");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log(`Captured speech: ${transcript}`);
      setSymptoms(transcript);
      setIsListening(false);
      handleAnalyze(transcript); // Immediately trigger the analysis
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert("Microphone access is required for voice input.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn("Recognition already started or error:", e);
    }
  };

  const handleAnalyze = async (overrideSymptoms = null) => {
    const textToAnalyze = typeof overrideSymptoms === 'string' ? overrideSymptoms : symptoms;
    if (!textToAnalyze.trim()) return;
    
    setIsAnalyzing(true);

    try {
      const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
      if (!apiKey || apiKey === 'your_secure_api_key_here') {
        throw new Error("Please configure your VITE_MISTRAL_API_KEY in the .env.local file.");
      }

      const client = new Mistral({ apiKey });

      let age = 'Unknown';
      let gender = 'Unknown';

      const savedData = localStorage.getItem('sehatSaathiUser');
      if (savedData) {
        const parsedUser = JSON.parse(savedData);
        age = parsedUser.age || 'Unknown';
        gender = parsedUser.gender || 'Unknown';
      }
      
      const prompt = `You are a clinical AI triage assistant for the SehatSaathi app.

Patient Profile: ${age}yo ${gender}
Patient Symptoms: "${textToAnalyze}"

Task: Analyze symptoms using contextual reasoning and infer the most medically appropriate condition.

Guidelines:
1. Respond ONLY in English. Do not use Hindi, Marathi, Bengali, or any other language.
2. Interpret full symptom sentences carefully.
3. Avoid generic fallback diagnoses unless symptoms clearly match.
4. Select correct specialist based on condition.
5. Use simple patient-friendly wording. Avoid panic wording.

Return structured JSON in this format:
{
  "condition": "",
  "riskLevel": "Low|Medium|High|Emergency",
  "recommendedSpecialist": "",
  "nextStepGuidance": ""
}`;

      let chatResponse;
      let attempt = 0;
      let maxRetries = 2;
      
      while (attempt <= maxRetries) {
        try {
          chatResponse = await client.chat.complete({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: 'json_object' },
            maxTokens: 800
          });
          break;
        } catch (err) {
          if ((err.status === 503 || (err.message && err.message.includes('503'))) && attempt < maxRetries) {
            attempt++;
            await new Promise(res => setTimeout(res, 1000 * attempt));
          } else {
            throw err;
          }
        }
      }
      
      const responseText = chatResponse.choices[0].message.content;
      const jsonStart = responseText.indexOf('{');
      const jsonEnd = responseText.lastIndexOf('}') + 1;
      const jsonStr = responseText.substring(jsonStart, jsonEnd);
      const parsedData = JSON.parse(jsonStr);

      let badgeClass = 'badge-low';
      let isHighRisk = false;

      const riskUpper = (parsedData.riskLevel || '').toUpperCase();
      if (riskUpper === 'EMERGENCY') {
         badgeClass = 'badge-emergency';
         isHighRisk = true;
      } else if (riskUpper === 'HIGH') {
         badgeClass = 'badge-high';
         isHighRisk = true;
      } else if (riskUpper === 'MEDIUM') {
         badgeClass = 'badge-medium';
      }

      if (parsedData.recommendedSpecialist) {
        localStorage.setItem('recommendedSpecialist', parsedData.recommendedSpecialist);
      }

      handleSetResults({
        condition: parsedData.condition,
        conditionEn: parsedData.condition,
        riskLevel: parsedData.riskLevel,
        badgeClass,
        isHighRisk,
        recommendedSpecialist: parsedData.recommendedSpecialist,
        recommendedSpecialistEn: parsedData.recommendedSpecialist,
        nextSteps: parsedData.nextStepGuidance || (isHighRisk 
          ? 'Call Emergency Services IMMEDIATELY. Do not drive yourself to the hospital.'
          : 'Monitor your symptoms for the next 24-48 hours. If they worsen, consult a doctor.'),
        nextStepsEn: parsedData.nextStepGuidance || (isHighRisk 
          ? 'Call Emergency Services IMMEDIATELY. Do not drive yourself to the hospital.'
          : 'Monitor your symptoms for the next 24-48 hours. If they worsen, consult a doctor.')
      });
    } catch (error) {
      console.warn("Mistral API failed after retries. Falling back to local diagnosis...", error);
      
      let riskLevel = 'Medium';
      let badgeClass = 'badge-medium';
      let condition = 'Indeterminate Condition (Network Error)';
      let isHighRisk = false;
      let recommendedSpecialist = 'General Physician';
      let nextStepGuidance = 'Our AI could not analyze your symptoms due to a network error. Please monitor your condition carefully and seek medical advice if you feel unwell.';

      localStorage.setItem('recommendedSpecialist', recommendedSpecialist);
      handleSetResults({
        condition,
        conditionEn: condition,
        riskLevel,
        badgeClass,
        isHighRisk,
        recommendedSpecialist,
        recommendedSpecialistEn: recommendedSpecialist,
        nextSteps: nextStepGuidance,
        nextStepsEn: nextStepGuidance
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="symptom-page">
      <div className="feature-header-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--card-bg, #fff)', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--primary-color, #1e40af)', borderRadius: '50%', display: 'flex' }}>
          <img src={symptomCheckerLogo} alt="Symptom Checker Icon" style={{ width: '32px', height: '32px', filter: 'invert(1)' }} />
        </div>
        <div>
          <h2 className="page-title" style={{ margin: '0 0 0.25rem 0' }}>{t('symptom', 'title')}</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('symptom', 'desc')}</p>
        </div>
      </div>
      
      <div className="symptom-input-card card">
        <div className="card-header">
          <Activity className="header-icon" />
          <h3>{t('symptom', 'inputTitle')}</h3>
        </div>
        
        <textarea 
          className="symptom-textarea" 
          placeholder={t('symptom', 'placeholder')}
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          rows={5}
        ></textarea>
        
        <div className="action-buttons">
          <button 
             className={`btn btn-outline ${isListening ? 'pulse-anim' : ''}`} 
             onClick={handleVoice}
             disabled={isListening}
          >
            <Mic size={20} color={isListening ? "red" : "currentColor"} />
            {isListening ? "Listening..." : "Speak Symptoms"}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => handleAnalyze()}
            disabled={isAnalyzing || !symptoms.trim()}
          >
            {isAnalyzing ? (
              <Activity className="spin-anim" size={20} />
            ) : (
              <Search size={20} />
            )}
            {isAnalyzing ? t('symptom', 'analyzingText') : t('symptom', 'analyzeBtn')}
          </button>
        </div>
      </div>

      {results && results.isHighRisk && (
        <div className="emergency-alert-panel pulse-anim" style={{backgroundColor: 'rgba(253, 126, 20, 0.1)', border: '1px solid var(--warning-color)', color: 'var(--text-dark)'}}>
          <AlertTriangle size={32} color="var(--warning-color)"/>
          <div className="alert-content">
            <h4 style={{margin: '0 0 0.25rem 0', fontWeight: 'bold', color: 'var(--warning-color)'}}>{t('symptom', 'emergencyBadge')}</h4>
            <p style={{margin: 0}}>The provided symptoms suggest you should seek professional medical assessment promptly to ensure your well-being.</p>
          </div>
        </div>
      )}

      {results && (
        <div className="results-dashboard grid-2">
          <div className="card result-card">
            <h4 className="result-label">{t('symptom', 'summaryTitle')}</h4>
            <div className="result-value condition">
              <Stethoscope className="text-blue" />
              <span>{results.condition}</span>
            </div>
          </div>
          
          <div className="card result-card">
            <h4 className="result-label">{t('symptom', 'priorityTitle')}</h4>
            <div className="result-value">
              <span className={`badge ${results.badgeClass} pulse-anim-if-high`}>
                {(() => {
                  const r = results.riskLevel ? results.riskLevel.toLowerCase() : '';
                  if (r === 'emergency') return t('symptom', 'emergencyBadge');
                  if (r === 'high') return t('symptom', 'highBadge');
                  if (r === 'medium') return t('symptom', 'medBadge');
                  return t('symptom', 'lowBadge');
                })()}
              </span>
            </div>
          </div>

          <div className="card result-card">
            <h4 className="result-label">{t('symptom', 'specialistTitle')}</h4>
            <div className="result-value specialist">
              <HeartPulse className="text-blue" />
              <span>{results.recommendedSpecialist}</span>
            </div>
          </div>

          <div className="card result-card">
            <h4 className="result-label">{t('symptom', 'guidanceTitle')}</h4>
            <div className="result-value guidance">
              <p>{results.nextSteps}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SymptomChecker;
