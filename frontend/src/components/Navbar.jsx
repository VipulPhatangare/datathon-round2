import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useState, useEffect } from 'react';
import { submissionAPI } from '../api';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user && user.role === 'user') {
      fetchSubmissionInfo();
    }
  }, [user]);

  const fetchSubmissionInfo = async () => {
    try {
      const response = await submissionAPI.getStatus();
      setSubmissionInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch submission info:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} className="navbar-brand">
          <img src="/gfg_logo.png" alt="GFG Logo" style={{ height: '35px', marginRight: '10px' }} />
          DATATHON
        </Link>
        
        {/* Hamburger menu button for mobile */}
        <button 
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>

      <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
        {/* Mobile sidebar header */}
        <div className="sidebar-header">
          <img src="/gfg_logo.png" alt="GFG Logo" style={{ height: '30px', marginRight: '10px' }} />
          <span className="sidebar-title">DATATHON</span>
          <button className="sidebar-close" onClick={closeMobileMenu}>✕</button>
        </div>
        
        <div className="sidebar-user-info">
          {user.role === 'user' ? (
            <Link 
              to="/profile" 
              onClick={closeMobileMenu}
              style={{ 
                color: '#bdc3c7', 
                textDecoration: 'none',
                fontWeight: 'bold'
              }}
            >
              {user.teamName}
            </Link>
          ) : (
            <strong>{user.teamName}</strong>
          )}
        </div>
        
        {user.role === 'user' && (
          <>
            <Link to="/home" className="navbar-link" onClick={closeMobileMenu}>
              Home
            </Link>
            <Link to="/dashboard" className="navbar-link" onClick={closeMobileMenu}>
              Upload
            </Link>
            <Link to="/submissions" className="navbar-link" onClick={closeMobileMenu}>
              My Submissions
            </Link>
            <Link to="/competition" className="navbar-link" onClick={closeMobileMenu}>
              Competition Info
            </Link>
            <Link to="/chat" className="navbar-link" onClick={closeMobileMenu}>
              Community Chat
            </Link>
          </>
        )}
        
        {user.role === 'admin' && (
          <>
            <Link to="/admin/dashboard" className="navbar-link" onClick={closeMobileMenu}>
              Dashboard
            </Link>
            <Link to="/chat" className="navbar-link" onClick={closeMobileMenu}>
              Community Chat
            </Link>
          </>
        )}
        
        <Link to="/leaderboard" className="navbar-link" onClick={closeMobileMenu}>
          Leaderboard
        </Link>
        
        <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
