import React, { useState, useEffect } from 'react';
import { History, Download, Activity, FileText, Calendar, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import { useLanguage } from '../contexts/LanguageContext';
import './HealthHistory.css';

const HealthHistory = () => {
  const { t } = useLanguage();
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    const loadHistory = () => {
      try {
        const storedHistory = JSON.parse(localStorage.getItem('healthHistory') || '[]');
        setHistoryData(storedHistory);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };

    // Initial load
    loadHistory();

    // Listen to inter-tab storage modifications natively
    window.addEventListener('storage', loadHistory);
    // Listen to intra-tab custom dispatch modifications seamlessly
    window.addEventListener('healthHistoryUpdated', loadHistory);

    return () => {
      window.removeEventListener('storage', loadHistory);
      window.removeEventListener('healthHistoryUpdated', loadHistory);
    };
  }, []);

  const handleExport = () => {
    if (historyData.length === 0) {
      alert("No medical history available to export.");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Styled Header setup
      doc.setFillColor(34, 114, 255); // Brand Primary Blue
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.text("SehatSaathi AI", 20, 22);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Personal Medical Summary Report", 20, 32);
      
      // Fetch user profile
      let patientInfo = "Patient Profile: Not configured";
      const savedUser = localStorage.getItem('sehatSaathiUser');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          patientInfo = `Patient Profile: Age ${parsedUser.age || 'Unknown'}, Gender: ${parsedUser.gender || 'Unknown'}`;
        } catch (e) {}
      }
      
      doc.setTextColor(33, 37, 41);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(patientInfo, 20, 50);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(108, 117, 125);
      doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 20, 57);

      doc.setDrawColor(220, 220, 220);
      doc.line(20, 62, 190, 62);

      let verticalOffset = 72;
      
      historyData.forEach((entry, index) => {
        if (verticalOffset > pageHeight - 40) {
          doc.addPage();
          verticalOffset = 30; // reset for new page
        }

        const recordDate = new Date(entry.date).toLocaleString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        });

        // SAFETY LOCK: Strictly extracting English strings for the doctor export.
        const englishCondition = entry.conditionEn || entry.condition || "Unknown Condition";
        const englishSymptoms = entry.symptomsEn || entry.symptoms || "Unknown Symptoms";
        const englishSpecialist = entry.recommendedSpecialistEn || entry.recommendedSpecialist || "Unknown Specialist";
        const englishGuidance = entry.nextStepGuidanceEn || entry.nextStepGuidance || entry.nextStepsEn || entry.nextSteps || "None";
        const englishExplanation = entry.explanationEn || entry.explanation || "";

        // 1. Condition Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(33, 37, 41);
        doc.text(`${index + 1}. ${englishCondition}`, 20, verticalOffset);
        
        // 2. Color-Coded Risk Badge
        let riskColor = [40, 167, 69]; // Green for Low
        const riskU = entry.riskLevel ? entry.riskLevel.toUpperCase() : '';
        if (riskU === 'EMERGENCY' || riskU === 'HIGH') riskColor = [220, 53, 69]; // Red
        else if (riskU === 'MEDIUM') riskColor = [253, 126, 20]; // Orange

        const conditionWidth = doc.getTextWidth(`${index + 1}. ${englishCondition}`);
        const badgeX = 20 + conditionWidth + 5;
        
        doc.setFillColor(riskColor[0], riskColor[1], riskColor[2]);
        doc.roundedRect(badgeX, verticalOffset - 5, 25, 6, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(`${entry.riskLevel || 'LOW'}`, badgeX + 12.5, verticalOffset - 1, { align: 'center' }); // Centered inside badge
        
        verticalOffset += 7;
        
        // 3. Render Timestamp
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(108, 117, 125);
        doc.text(`Recorded: ${recordDate}`, 20, verticalOffset);
        verticalOffset += 10;
        
        // 4. Content Attributes
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(52, 58, 64);
        doc.text(`Symptoms:`, 25, verticalOffset);
        
        doc.setFont("helvetica", "normal");
        const symptomLines = doc.splitTextToSize(englishSymptoms, 130);
        doc.text(symptomLines, 55, verticalOffset);
        verticalOffset += (symptomLines.length * 6);
        
        if (englishExplanation) {
          doc.setFont("helvetica", "bold");
          doc.text(`Explanation:`, 25, verticalOffset);
          doc.setFont("helvetica", "normal");
          const expLines = doc.splitTextToSize(englishExplanation, 130);
          doc.text(expLines, 55, verticalOffset);
          verticalOffset += (expLines.length * 6) + 2;
        }

        doc.setFont("helvetica", "bold");
        doc.text(`Specialist:`, 25, verticalOffset);
        doc.setFont("helvetica", "normal");
        doc.text(`${englishSpecialist}`, 55, verticalOffset);
        verticalOffset += 8;
        
        doc.setFont("helvetica", "bold");
        doc.text(`Guidance:`, 25, verticalOffset);
        doc.setFont("helvetica", "normal");
        const guidanceLines = doc.splitTextToSize(englishGuidance, 130);
        doc.text(guidanceLines, 55, verticalOffset);
        verticalOffset += (guidanceLines.length * 6) + 5;
        
        doc.setDrawColor(240, 240, 240);
        doc.line(20, verticalOffset, 190, verticalOffset);
        verticalOffset += 10;
      });

      // Render Global Footer overlay across all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        const footerStr = `SehatSaathi AI - Medical Summary - Generated ${new Date().toLocaleString()} - Page ${i} of ${totalPages}`;
        doc.text(footerStr, pageWidth / 2, pageHeight - 15, { align: 'center' });
      }

      doc.save("SehatSaathi_Medical_Summary.pdf");
      
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF document.");
    }
  };

  return (
    <div className="history-page">
      <div className="feature-header-card history-header-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--card-bg, #fff)', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--purple-color, #6f42c1)', borderRadius: '50%', display: 'flex' }}>
            <Clock size={32} color="white" />
          </div>
          <div>
            <h2 className="page-title" style={{ margin: '0 0 0.25rem 0' }}>{t('history', 'title')}</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('history', 'desc')}</p>
          </div>
        </div>
        <button className="btn btn-outline" onClick={handleExport}>
          <Download size={18} />
          {t('history', 'exportBtn')}
        </button>
      </div>

      <div className="timeline-container">
        {historyData.length === 0 ? (
          <div className="text-center" style={{padding: '3rem', color: 'var(--text-muted)'}}>
            <History size={48} style={{margin: '0 auto 1rem', opacity: 0.5}} />
            <p>{t('history', 'noHistory')}</p>
          </div>
        ) : (
          historyData.map((item, index) => {
            const formattedDate = new Date(item.date).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });
            
            // Reassign to translated variants or fallback to main if missing.
            const uiCondition = item.condition || item.conditionLocal || "Condition Unknown";
            const uiSymptoms = item.symptoms || item.symptomsLocal || "Symptoms Unknown";
            const uiSpecialist = item.recommendedSpecialist || item.recommendedSpecialistLocal || "Unknown Specialist";
            const uiGuidance = item.nextStepGuidance || item.nextStepGuidanceLocal || item.nextSteps || "No guidance available";

            let riskU = (item.riskLevel || '').toUpperCase();
            let badgeClass = 'badge-low';
            if (riskU === 'EMERGENCY') badgeClass = 'badge-emergency';
            else if (riskU === 'HIGH') badgeClass = 'badge-high';
            else if (riskU === 'MEDIUM') badgeClass = 'badge-medium';

            // Localize risk tags
            let riskTranslatedText = t('symptom', 'lowBadge');
            if (riskU === 'EMERGENCY') riskTranslatedText = t('symptom', 'emergencyBadge');
            else if (riskU === 'HIGH') riskTranslatedText = t('symptom', 'highBadge');
            else if (riskU === 'MEDIUM') riskTranslatedText = t('symptom', 'medBadge');

            return (
              <div key={index} className="timeline-item">
                <div className="timeline-icon-wrap flex items-center justify-center">
                  <Activity size={20} className="text-white" />
                </div>
                
                <div className="timeline-content card">
                  <div className="item-header">
                    <div className="item-title-group">
                      <h3>{uiCondition}</h3>
                      <div className="item-date">
                        <Calendar size={14} className="text-muted" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                    <span className={`badge ${badgeClass}`}>
                      {riskTranslatedText}
                    </span>
                  </div>
                  
                  <div className="item-details">
                    <div className="detail-row">
                      <span className="label">{t('history', 'labelSymptoms')}</span>
                      <span className="val italic">"{uiSymptoms}"</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">{t('history', 'labelSpecialist')}</span>
                      <span className="val font-semibold">{uiSpecialist}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">{t('history', 'labelGuidance')}</span>
                      <p className="val">{uiGuidance}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HealthHistory;
