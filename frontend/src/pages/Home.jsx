import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/LandingPage.css';

function Home() {
  const [competition, setCompetition] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdownStart, setCountdownStart] = useState(null);
  const [countdownEnd, setCountdownEnd] = useState(null);

  useEffect(() => {
    fetchCompetitionInfo();
    fetchConfig();
  }, []);

  const fetchCompetitionInfo = async () => {
    try {
      const response = await axios.get('http://localhost:4000/api/competition');
      setCompetition(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load competition info:', error);
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:4000/api/submissions/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  // Update countdown every second
  useEffect(() => {
    if (!config) return;

    // Calculate immediately
    if (config.competitionStartTime) {
      setCountdownStart(calculateCountdown(new Date(config.competitionStartTime)));
    }
    if (config.competitionEndTime) {
      setCountdownEnd(calculateCountdown(new Date(config.competitionEndTime)));
    }

    const timer = setInterval(() => {
      if (config.competitionStartTime) {
        setCountdownStart(calculateCountdown(new Date(config.competitionStartTime)));
      }
      if (config.competitionEndTime) {
        setCountdownEnd(calculateCountdown(new Date(config.competitionEndTime)));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [config]);

  const calculateCountdown = (targetDate) => {
    const now = new Date();
    const diff = targetDate - now;

    if (diff <= 0) {
      return null;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  };

  const isCompetitionStarted = config?.competitionStartTime && new Date() > new Date(config.competitionStartTime);
  const isCompetitionEnded = config?.competitionEndTime && new Date() > new Date(config.competitionEndTime);

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">Loading competition information...</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="card">
        <h1 className="card-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {competition?.title || 'Datathon Competition'}
        </h1>

        <div style={{ 
          padding: '2rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px', 
          marginBottom: '2rem',
          border: '2px solid #3498db'
        }}>
          <p style={{ fontSize: '1.1rem', color: '#2c3e50', marginBottom: '1rem' }}>
            {competition?.description || 'Welcome to the competition! Upload your predictions to compete.'}
          </p>

          {/* Competition Status and Countdown */}
          <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            {!config ? (
              <div style={{ textAlign: 'center', color: '#7f8c8d' }}>Loading schedule...</div>
            ) : isCompetitionEnded ? (
              <div style={{ padding: '1rem', backgroundColor: '#ffe0e0', borderLeft: '4px solid #e74c3c', borderRadius: '4px' }}>
                <h3 style={{ color: '#e74c3c', marginTop: 0 }}>⏹️ Competition Ended</h3>
                <p style={{ color: '#c0392b' }}>
                  The competition ended on {new Date(config.competitionEndTime).toLocaleString()}
                </p>
              </div>
            ) : isCompetitionStarted ? (
              <>
                <div style={{ padding: '1rem', backgroundColor: '#e8f5e9', borderLeft: '4px solid #27ae60', borderRadius: '4px', marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#27ae60', marginTop: 0 }}>Competition Started</h3>
                  <p style={{ color: '#229954', marginBottom: '1rem' }}>
                    The competition is now live! Submit your predictions to compete.
                  </p>
                </div>

                {countdownEnd && (
                  <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderLeft: '4px solid #f39c12', borderRadius: '4px' }}>
                    <h3 style={{ color: '#f39c12', marginTop: 0 }}>Time Remaining</h3>
                    <div className="countdown-grid">
                      <div className="countdown-item">
                        <div className="countdown-value">{countdownEnd.days}</div>
                        <small className="countdown-label">Days</small>
                      </div>
                      <div className="countdown-item">
                        <div className="countdown-value">{countdownEnd.hours}</div>
                        <small className="countdown-label">Hours</small>
                      </div>
                      <div className="countdown-item">
                        <div className="countdown-value">{countdownEnd.minutes}</div>
                        <small className="countdown-label">Minutes</small>
                      </div>
                      <div className="countdown-item">
                        <div className="countdown-value">{countdownEnd.seconds}</div>
                        <small className="countdown-label">Seconds</small>
                      </div>
                    </div>
                    <p style={{ marginTop: '1rem', color: '#d35400', marginBottom: 0 }}>
                      Deadline: {new Date(config.competitionEndTime).toLocaleString()}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ padding: '1rem', backgroundColor: '#e3f2fd', borderLeft: '4px solid #2196f3', borderRadius: '4px', marginBottom: '1.5rem' }}>
                  <h3 style={{ color: '#2196f3', marginTop: 0 }}>Coming Soon</h3>
                  <p style={{ color: '#1565c0', marginBottom: '1rem' }}>
                    The competition hasn't started yet. Check back soon to start competing!
                  </p>
                </div>

                {config?.competitionStartTime && countdownStart && (
                  <div style={{ padding: '1rem', backgroundColor: '#fce4ec', borderLeft: '4px solid #e91e63', borderRadius: '4px' }}>
                    <h3 style={{ color: '#e91e63', marginTop: 0 }}>Starting In</h3>
                    <div className="countdown-grid countdown-pink">
                      <div className="countdown-item">
                        <div className="countdown-value">{countdownStart.days}</div>
                        <small className="countdown-label">Days</small>
                      </div>
                      <div className="countdown-item">
                        <div className="countdown-value">{countdownStart.hours}</div>
                        <small className="countdown-label">Hours</small>
                      </div>
                      <div className="countdown-item">
                        <div className="countdown-value">{countdownStart.minutes}</div>
                        <small className="countdown-label">Minutes</small>
                      </div>
                      <div className="countdown-item">
                        <div className="countdown-value">{countdownStart.seconds}</div>
                        <small className="countdown-label">Seconds</small>
                      </div>
                    </div>
                    <p style={{ marginTop: '1rem', color: '#ad1457', marginBottom: 0 }}>
                      Start: {new Date(config.competitionStartTime).toLocaleString()}
                    </p>
                  </div>
                )}

                {config?.competitionStartTime && !countdownStart && (
                  <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderLeft: '4px solid #f39c12', borderRadius: '4px' }}>
                    <h3 style={{ color: '#f39c12', marginTop: 0 }}>⚡ Starting Very Soon!</h3>
                    <p style={{ color: '#d35400', marginBottom: 0 }}>
                      Competition starts at: {new Date(config.competitionStartTime).toLocaleString()}
                    </p>
                  </div>
                )}

                {!config?.competitionStartTime && (
                  <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', borderLeft: '4px solid #9e9e9e', borderRadius: '4px' }}>
                    <p style={{ color: '#757575', marginBottom: 0 }}>
                      Competition schedule not set yet. Please check back later.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#ecf0f1', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#2c3e50' }}>Quick Links</h3>
          <div className="quick-links-grid">
            <a href="/dashboard" className="btn btn-primary">Upload Predictions</a>
            <a href="/submissions" className="btn btn-secondary">My Submissions</a>
            <a href="/leaderboard" className="btn btn-secondary">Leaderboard</a>
            <a href="/competition" className="btn btn-secondary">Details</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
