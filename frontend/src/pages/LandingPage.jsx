import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../components/LoginModal';
import '../styles/LandingPage.css';

function LandingPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  const handleLeaderboardClick = () => {
    navigate('/leaderboard');
  };

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="nav-brand">DATATHON</div>
        <div className="nav-links">
          <button onClick={() => setShowLoginModal(true)} className="nav-btn">
            Login
          </button>
          <button onClick={handleLeaderboardClick} className="nav-btn">
            Leaderboard
          </button>
        </div>
      </nav>

      <div className="landing-content">
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome to DATATHON</h1>
          <h2 className="welcome-subtitle">Round Two</h2>
          <p className="welcome-description">
            Compete with teams, analyze data, and climb the leaderboard!
          </p>
          <button onClick={() => setShowLoginModal(true)} className="cta-button">
            Get Started
          </button>
        </div>
      </div>

      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
}

export default LandingPage;
