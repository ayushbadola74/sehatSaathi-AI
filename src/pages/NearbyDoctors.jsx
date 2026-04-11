import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Star, Phone, Navigation, Loader2 } from 'lucide-react';
import emergencySosLogo from '../assets/emergency-sos-logo.svg';
import { useLanguage } from '../contexts/LanguageContext';
import './NearbyDoctors.css';

const NearbyDoctors = () => {
  const { t } = useLanguage();
  const [recommendedSpecialist, setRecommendedSpecialist] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const savedSpecialist = localStorage.getItem('recommendedSpecialist') || 'Hospital';
    setRecommendedSpecialist(savedSpecialist);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchHospitals(position.coords.latitude, position.coords.longitude, savedSpecialist);
        },
        (error) => {
          console.error(error);
          if (error.code === error.PERMISSION_DENIED) {
            setErrorMsg(t('hospitals', 'error') + ' (Displaying demo hospitals)');
            fetchHospitals(28.6139, 77.2090, savedSpecialist); // Fallback: New Delhi
          } else {
            setErrorMsg(t('hospitals', 'error'));
            setIsLoading(false);
          }
        }
      );
    } else {
      setErrorMsg(t('hospitals', 'error'));
      setIsLoading(false);
    }
  }, [t]);

  const fetchHospitals = async (lat, lon, specialist) => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    try {
      setIsLoading(true);
      const overpassQuery = `[out:json];(node["amenity"~"hospital|clinic"](around:2000,${lat},${lon});way["amenity"~"hospital|clinic"](around:2000,${lat},${lon});relation["amenity"~"hospital|clinic"](around:2000,${lat},${lon}););out center;`;

      let response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);

      if (response.status === 429 || response.status === 504) {
        console.warn(`Primary Overpass API returned error. Retrying...`);
        response = await fetch(`https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
      }

      const overpassJson = await response.json();
      const data = overpassJson.elements ? overpassJson.elements.map(el => {
        let rawTags = "";
        if (el.tags) {
          rawTags = Object.values(el.tags).join(" ").toLowerCase();
        }
        return {
          place_id: el.id,
          name: (el.tags && el.tags.name) ? el.tags.name : 'Medical Center',
          lat: el.lat || (el.center && el.center.lat),
          lon: el.lon || (el.center && el.center.lon),
          rawTags
        };
      }).filter(el => el.lat && el.lon) : [];

      if (data && data.length > 0) {
        const mappedData = data.map((item, index) => {
          const R = 6371;
          const dLat = (item.lat - lat) * Math.PI / 180;
          const dLon = (item.lon - lon) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat * Math.PI / 180) * Math.cos(item.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = (R * c).toFixed(1);

          let matchScore = 0;
          if (specialist && specialist !== 'Hospital') {
            const specLower = specialist.toLowerCase();
            const tags = item.rawTags || "";
            if (tags.includes(specLower) || (specLower.includes('cardio') && tags.includes('cardio')) || (specLower.includes('neuro') && tags.includes('neuro'))) {
              matchScore = 2;
            } else if (tags.includes('clinic') || tags.includes('emergency')) {
              matchScore = 1;
            }
          }

          return {
            id: item.place_id || index,
            name: item.name || 'Medical Center',
            specialist: specialist !== 'Hospital' ? specialist : 'General Hospital',
            distance: `${distance} km`,
            rating: (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1),
            contact: '+91 XXXX XXXX XX',
            lat: item.lat,
            lon: item.lon,
            matchScore,
            rawDistance: parseFloat(distance)
          };
        });

        mappedData.sort((a, b) => b.matchScore !== a.matchScore ? b.matchScore - a.matchScore : a.rawDistance - b.rawDistance);
        setDoctors(mappedData.slice(0, 5));
      } else {
        if (lat === 28.6139 && lon === 77.2090) {
          setDoctors([{ id: 101, name: 'City Care Hospital', specialist: specialist !== 'Hospital' ? specialist : 'General Physician', distance: '1.2 km', rating: 4.8, contact: '+91 9876543210', lat: 28.6139, lon: 77.2090 }]);
        } else {
          setDoctors([]);
          setErrorMsg(t('hospitals', 'noResults'));
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(t('hospitals', 'error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenMap = (lat, lon) => {
    if (lat && lon) window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, '_blank');
  };

  return (
    <div className="doctors-page">
      <div className="feature-header-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--card-bg, #fff)', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-color, #dc3545)', borderRadius: '50%', display: 'flex' }}>
          <img src={emergencySosLogo} alt="Emergency SOS Icon" style={{ width: '32px', height: '32px', filter: 'invert(1)' }} />
        </div>
        <div>
          <h2 className="page-title" style={{ margin: '0 0 0.25rem 0' }}>
            {recommendedSpecialist !== 'Hospital' ? `${recommendedSpecialist}` : t('hospitals', 'title')}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('hospitals', 'desc')}</p>
        </div>
      </div>

      {errorMsg && (
        <div style={{ color: 'var(--danger-color)', textAlign: 'center', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="loading-state" style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 className="spin-anim" size={48} style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
          <p>{t('hospitals', 'finding')}</p>
        </div>
      ) : (
        <div className="doctors-list grid-2">
          {doctors.map(doc => (
            <div key={doc.id} className="card doctor-card">
              <div className="doc-header">
                <div className="doc-icon-wrap">
                  <MapPin className="doc-icon pulse-anim" />
                </div>
                <div className="doc-title-info">
                  <h3>{doc.name}</h3>
                  <span className="specialist-tag" style={{ textTransform: 'capitalize' }}>{doc.specialist}</span>
                </div>
              </div>

              <div className="doc-details">
                <div className="detail-item">
                  <Navigation size={18} className="text-muted" />
                  <span>{doc.distance}</span>
                </div>
                <div className="detail-item">
                  <Star size={18} className="text-warning" fill="currentColor" />
                  <span>{doc.rating}</span>
                </div>
                <div className="detail-item">
                  <Phone size={18} className="text-muted" />
                  <span>{doc.contact}</span>
                </div>
              </div>

              <button className="btn btn-primary doc-action-btn" onClick={() => handleOpenMap(doc.lat, doc.lon)}>
                <MapPin size={18} />
                {t('hospitals', 'navBtn')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NearbyDoctors;
