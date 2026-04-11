import React, { useState, useRef } from 'react';
import { FileText, Activity, Search, UploadCloud, CheckCircle, BrainCircuit, ActivitySquare, AlertTriangle, Lightbulb, UserPlus } from 'lucide-react';
import { Mistral } from '@mistralai/mistralai';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import reportAnalysisLogo from '../assets/report-analysis-logo.svg';
import { useLanguage } from '../contexts/LanguageContext';
import './ReportAnalyzer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const ReportAnalyzer = () => {
  const { t } = useLanguage();
  
  // Section 1 State
  const [uploadedFileText, setUploadedFileText] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isAnalyzingParams, setIsAnalyzingParams] = useState(false);
  const [reportResults, setReportResults] = useState(null);
  const [errorMsgParams, setErrorMsgParams] = useState('');
  
  // Section 2 State
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryResults, setSummaryResults] = useState(null);
  const [errorMsgSummary, setErrorMsgSummary] = useState('');

  const fileInputRef = useRef(null);

  // --- SECTION 1 LOGIC ---
  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReportResults(null);
      setErrorMsgParams('');
      setUploadStatus('Extracting text from document, please wait...');

      try {
        let extracted = '';
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
             const page = await pdf.getPage(i);
             const textContent = await page.getTextContent();
             const pageText = textContent.items.map(item => item.str).join(' ');
             extracted += pageText + '\n';
          }
        } else if (file.type.startsWith('image/')) {
          setUploadStatus('Running optical character recognition (OCR), please wait...');
          const result = await Tesseract.recognize(file, 'eng');
          extracted = result.data.text;
        } else {
          const reader = new FileReader();
          extracted = await new Promise((resolve, reject) => {
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
          });
        }
        
        setUploadedFileText(extracted);
        setUploadStatus(`Successfully extracted data from ${file.name}. Reading parameters automatically...`);
        handleAnalyzeParams(extracted);
      } catch (err) {
        console.error("Extraction error: ", err);
        setErrorMsgParams('Error extracting text. Please paste text directly.');
        setUploadStatus('');
        setUploadedFileText('');
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const getClient = () => {
      const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
      if (!apiKey || apiKey === 'your_secure_api_key_here') {
        throw new Error("Please configure your VITE_MISTRAL_API_KEY.");
      }
      return new Mistral({ apiKey });
  }

  const getProfile = () => {
      let age = 'Unknown';
      let gender = 'Unknown';
      const savedData = localStorage.getItem('sehatSaathiUser');
      if (savedData) {
        const parsedUser = JSON.parse(savedData);
        age = parsedUser.age || 'Unknown';
        gender = parsedUser.gender || 'Unknown';
      }
      return { age, gender };
  }

  const handleAnalyzeParams = async (autoTriggerText = null) => {
    const analysisText = typeof autoTriggerText === 'string' ? autoTriggerText : uploadedFileText;
    if (!analysisText) return;
    
    setIsAnalyzingParams(true);
    setErrorMsgParams('');
    
    try {
      const client = getClient();
      const { age, gender } = getProfile();

      const selectedLanguage = localStorage.getItem("preferredLanguage") || "English";
      const strictLangRule = selectedLanguage === 'Hindi' ? 'Respond ONLY in Hindi' : selectedLanguage === 'Marathi' ? 'Respond ONLY in Marathi' : 'Respond ONLY in English';

      // Advanced Regex Prep before AI Fallback to filter noisy OCR
      const labRegex = /(hb|hgb|hemoglobin|wbc|tlc|platelet|plt|rbc|glucose|sugar|cholesterol|triglycerides|neutrophils|lymphocytes)[\s.:,-]*([\d]+(?:\.[\d]+)?)\s*([a-zA-Z/%\.]*)/gi;
      const matches = [...analysisText.matchAll(labRegex)];
      
      let extractionPayload = analysisText;
      if (matches.length > 0) {
         const pureData = matches.map(m => `${m[1].trim()}: ${m[2]} ${m[3].trim()}`).join('\n');
         extractionPayload = `Pre-Parsed Regex Values:\n${pureData}\n\nRaw Extracted Context:\n${analysisText.substring(0, 1000)}`;
      }

      const prompt = `You are a clinical AI triage assistant. 
Patient Profile: ${age}yo ${gender}. Target Language Output: ${selectedLanguage}.

Extract all laboratory test parameters from the following medical report text. Identify parameter name, numeric value, unit, and whether the value is Low, Normal, or High compared to standard adult reference ranges. Provide a contextually accurate "meaning" and "guidance" for each. 

Medical Report Text:
"${extractionPayload}"

Guidelines:
1. Provide the status as strictly "Low", "Normal", or "High".
2. ${strictLangRule} for the 'meaning' and 'guidance' fields. Provide a simple patient-friendly explanation. Avoid jargon.
3. Keep 'parameter', 'value', and 'status' firmly in English for system mapping.
4. Intelligently infer values even if OCR text formatting is irregular. Ensure you exhaustively detect variations like Hb, HGB, Hemoglobin, WBC, TLC, Platelet Count, PLT, Blood Sugar, Glucose, Cholesterol, Triglycerides, RBC, Neutrophils, Lymphocytes.

Return strictly a JSON array in this exact format (no markdown):
[
  {
    "parameter": "Hemoglobin",
    "value": "10.2 g/dL",
    "status": "Low",
    "meaning": "Explanation here",
    "guidance": "Guidance here"
  }
]`;

      const chatResponse = await client.chat.complete({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        responseFormat: { type: 'json_object' },
        maxTokens: 1000
      });
      
      const responseText = chatResponse.choices[0].message.content;
      
      let parsedData;
      try {
        const jsonStart = responseText.indexOf('[');
        const jsonEnd = responseText.lastIndexOf(']') + 1;
        if (jsonStart !== -1 && jsonEnd !== -1) {
            parsedData = JSON.parse(responseText.substring(jsonStart, jsonEnd));
        } else {
            parsedData = JSON.parse(responseText);
        }
        if (!Array.isArray(parsedData) && typeof parsedData === 'object') {
           const keys = Object.keys(parsedData);
           for (let key of keys) {
               if (Array.isArray(parsedData[key])) {
                   parsedData = parsedData[key];
                   break;
               }
           }
        }
      } catch (e) {
          throw new Error("Failed to parse AI response into parameter array.");
      }

      setReportResults(Array.isArray(parsedData) ? parsedData : []);

    } catch (error) {
      console.warn("API failed:", error);
      setErrorMsgParams("Failed to analyze medical report. Please try again.");
    } finally {
      setIsAnalyzingParams(false);
    }
  };


  // --- SECTION 2 LOGIC ---
  const handleGenerateSummary = async () => {
      setIsGeneratingSummary(true);
      setErrorMsgSummary('');
      setSummaryResults(null);

      try {
          const client = getClient();
          const { age, gender } = getProfile();
          const selectedLanguage = localStorage.getItem("preferredLanguage") || "English";
          const strictLangRule = selectedLanguage === 'Hindi' ? 'Respond ONLY in Hindi' : selectedLanguage === 'Marathi' ? 'Respond ONLY in Marathi' : 'Respond ONLY in English';

          // Extract last 15 history logs
          const historyArr = JSON.parse(localStorage.getItem('healthHistory') || '[]');
          const recentLogs = historyArr.slice(-15);
          
          if (recentLogs.length === 0) {
              throw new Error("No health history data available to summarize. Try using the Symptom Checker or Report Analyzer first.");
          }

          const historyPayload = JSON.stringify(recentLogs.map(log => ({
              date: log.date,
              condition: log.conditionEn,
              symptoms: log.symptomsEn,
              risk: log.riskLevel,
              specialist: log.recommendedSpecialistEn
          })));

          const prompt = `You are a Senior AI Medical Summarizer.
Patient Profile: ${age}yo ${gender}. Target Language Output: ${selectedLanguage}.

Analyze the following chronological health history logs:
${historyPayload}

Task: Generate intelligent structured insights on the patient's broad health status, analyzing conditions over time, identifying risks, offering preventive suggestions, and determining the optimal doctor recommendation.

Guidelines:
1. ${strictLangRule} for ALL outputs completely. Use clean, patient-friendly language. Avoid frightening medical jargon.
2. Return strictly a single JSON object with these exact keys:

{
  "recent_condition_trend": "Explain the general trend of their recent medical conditions.",
  "risk_pattern": "What recurring risks or severe anomalies are noticeable?",
  "preventive_suggestion": "What lifestyle or immediate physical action should they take?",
  "doctor_recommendation": "Based on history, what type of specialist is most urgent?"
}`;

          const chatResponse = await client.chat.complete({
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: 'json_object' },
            maxTokens: 1000
          });
          
          const responseText = chatResponse.choices[0].message.content;
          const jsonStart = responseText.indexOf('{');
          const jsonEnd = responseText.lastIndexOf('}') + 1;
          const parsedData = JSON.parse(responseText.substring(jsonStart, jsonEnd));

          setSummaryResults(parsedData);

      } catch (error) {
          console.warn("Summary generation failed:", error);
          setErrorMsgSummary(error.message || "Failed to generate Smart Summary. Please try again.");
      } finally {
          setIsGeneratingSummary(false);
      }
  };


  return (
    <div className="analyzer-page">
      {/* SECTION 1: REPORT CHECKER */}
      <div className="section-container">
        <div className="section-header">
           <FileText className="section-icon text-blue" />
           <h2 className="section-title">Doctor Medical Report Analyzer</h2>
        </div>
        
        <div className="upload-card modern-card">
          <p className="instructions-text">
            Upload a PDF, PNG, JPG, or TXT file to automatically check your lab values.
          </p>
          
          {uploadStatus && !errorMsgParams && (
            <div className="status-banner success-banner">
               <CheckCircle size={20} />
               {uploadStatus}
            </div>
          )}

          <div className="btn-group-auto">
            <div>
              <button className="btn btn-outline center-icon-btn" onClick={triggerFileInput}>
                <UploadCloud size={20} /> Upload Report
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".txt,.pdf,.jpg,.jpeg,.png" hidden />
            </div>
            
            <button 
              className="btn btn-primary center-icon-btn shadow-btn" 
              onClick={() => handleAnalyzeParams()}
              disabled={isAnalyzingParams || !uploadedFileText}
            >
              {isAnalyzingParams ? <Activity className="spin-anim" size={20} /> : <Search size={20} />}
              Check Report Values
            </button>
          </div>
          
          {errorMsgParams && <div className="status-banner error-banner">{errorMsgParams}</div>}
        </div>

        {reportResults && reportResults.length === 0 && !isAnalyzingParams && (
           <div className="empty-message modern-card">No recognizable lab parameters found in this report.</div>
        )}

        {reportResults && reportResults.length > 0 && (
          <div className="parameters-grid">
            {reportResults.map((param, idx) => {
              const stat = (param.status || 'NORMAL').toLowerCase();
              let statusTheme = 'normal-theme';
              if (stat.includes('high') || stat.includes('attention') || stat.includes('critical')) statusTheme = 'high-theme';
              else if (stat.includes('low') || stat.includes('moderate') || stat.includes('borderline')) statusTheme = 'moderate-theme';

              return (
                <div key={idx} className={`modern-card indicator-card ${statusTheme}`}>
                  <div className="card-top-row">
                    <h4 className="param-name">{param.parameter || param.name}</h4>
                    <span className="status-badge">{(param.status || 'Normal').toUpperCase()}</span>
                  </div>
                  <div className="param-value">{param.value}</div>
                  <div className="param-block">
                     <span className="param-label">Meaning</span>
                     <p className="param-desc">{param.meaning || "N/A"}</p>
                  </div>
                  <div className="param-block">
                     <span className="param-label">Guidance</span>
                     <p className="param-desc">{param.guidance || "N/A"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <hr className="section-divider" />

      {/* SECTION 2: SMART HEALTH SUMMARY */}
      <div className="section-container">
        <div className="section-header">
           <BrainCircuit className="section-icon text-purple" />
           <h2 className="section-title">AI Smart Health Summary</h2>
        </div>

        <div className="summary-controls-card modern-card">
           <p className="instructions-text" style={{textAlign: 'center', marginBottom: '1.5rem'}}>
             Analyze your historical timeline and local report evaluations to safely detect overarching risks.
           </p>
           <div style={{display: 'flex', justifyContent: 'center'}}>
               <button 
                  className="btn btn-purple center-icon-btn shadow-btn" 
                  onClick={handleGenerateSummary}
                  disabled={isGeneratingSummary}
                >
                  {isGeneratingSummary ? <Activity className="spin-anim" size={20} /> : <BrainCircuit size={20} />}
                  Generate Smart Summary
               </button>
           </div>
           {errorMsgSummary && <div className="status-banner error-banner" style={{marginTop: '1rem'}}>{errorMsgSummary}</div>}
        </div>

        {summaryResults && (
           <div className="summary-grid">
              <div className="modern-card indicator-card purple-theme">
                 <div className="card-top-row">
                    <ActivitySquare className="icon-purple" size={24} />
                    <h4 className="param-name">Recent Condition Trend</h4>
                 </div>
                 <p className="summary-desc">{summaryResults.recent_conditions || summaryResults.recent_condition_trend}</p>
              </div>

              <div className="modern-card indicator-card high-theme">
                 <div className="card-top-row">
                    <AlertTriangle className="icon-red" size={24} />
                    <h4 className="param-name">Risk Pattern</h4>
                 </div>
                 <p className="summary-desc">{summaryResults.risk_pattern}</p>
              </div>

              <div className="modern-card indicator-card normal-theme">
                 <div className="card-top-row">
                    <Lightbulb className="icon-green" size={24} />
                    <h4 className="param-name">Preventive Suggestion</h4>
                 </div>
                 <p className="summary-desc">{summaryResults.preventive_suggestion || summaryResults.preventive_suggestions}</p>
              </div>

              <div className="modern-card indicator-card blue-theme">
                 <div className="card-top-row">
                    <UserPlus className="icon-blue" size={24} />
                    <h4 className="param-name">Doctor Recommendation</h4>
                 </div>
                 <p className="summary-desc">{summaryResults.doctor_recommendation}</p>
              </div>
           </div>
        )}
      </div>

    </div>
  );
};

export default ReportAnalyzer;
