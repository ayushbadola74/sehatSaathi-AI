import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import EmergencySOSButton from './components/EmergencySOSButton';
import UserSetup from './pages/UserSetup';
import Home from './pages/Home';
import SymptomChecker from './pages/SymptomChecker';
import NearbyDoctors from './pages/NearbyDoctors';
import ReportAnalyzer from './pages/ReportAnalyzer';
import HealthHistory from './pages/HealthHistory';
import Settings from './pages/Settings';
import { LanguageProvider } from './contexts/LanguageContext';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/setup" />} />
              <Route path="/setup" element={<UserSetup />} />
              <Route path="/home" element={<Home />} />
              <Route path="/symptoms" element={<SymptomChecker />} />
              <Route path="/reports" element={<ReportAnalyzer />} />
              <Route path="/doctors" element={<NearbyDoctors />} />
              <Route path="/history" element={<HealthHistory />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
          <Footer />
          <EmergencySOSButton />
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
