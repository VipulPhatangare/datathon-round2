import { useState, useEffect } from 'react';
import { leaderboardAPI } from '../api';
import { useAuth } from '../AuthContext';
import axios from 'axios';

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [problemType, setProblemType] = useState('classification');
  const [leaderboardMetric, setLeaderboardMetric] = useState('accuracy');
  const [sortOrder, setSortOrder] = useState('desc');
  const [leaderboardType, setLeaderboardType] = useState('public');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enableUserPrivateLeaderboard, setEnableUserPrivateLeaderboard] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [competitionStatus, setCompetitionStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  
  const { user } = useAuth();

  useEffect(() => {
    fetchLeaderboard();
    fetchConfig();
    fetchCompetitionStatus();
  }, [leaderboardType]);

  // Update countdown every second
  useEffect(() => {
    if (!competitionStatus?.competitionStartTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const start = new Date(competitionStatus.competitionStartTime);
      const diff = start - now;

      if (diff <= 0) {
        setCountdown(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [competitionStatus]);

  const fetchCompetitionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:4000/api/submissions/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompetitionStatus(response.data);
    } catch (err) {
      console.error('Failed to load competition status');
    } finally {
      setStatusLoading(false);
    }
  };

  async function fetchConfig() {
    try {
      const response = await axios.get('http://localhost:4000/api/leaderboard/config');
      setEnableUserPrivateLeaderboard(response.data.enableUserPrivateLeaderboard || false);
    } catch (err) {
      console.error('Failed to load config');
    }
  };

  const toggleUserPrivateLeaderboard = async () => {
    try {
      setLoadingConfig(true);
      const newValue = !enableUserPrivateLeaderboard;
      await axios.put('http://localhost:4000/api/admin/config', {
        key: 'enableUserPrivateLeaderboard',
        value: newValue
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setEnableUserPrivateLeaderboard(newValue);
    } catch (err) {
      console.error('Failed to update config', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:4000/api/leaderboard?limit=50&includeRank=true&leaderboardType=${leaderboardType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeaderboard(response.data.leaderboard);
      setUserRank(response.data.userRank);
      setProblemType(response.data.problemType || 'classification');
      setLeaderboardMetric(response.data.leaderboardMetric || 'accuracy');
      setSortOrder(response.data.sortOrder || 'desc');
    } catch (err) {
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const formatMetricValue = (value, metric) => {
    if (value === null || value === undefined) return 'N/A';
    
    // For classification metrics (0-1 range), show as percentage
    if (problemType === 'classification') {
      return `${(value * 100).toFixed(2)}%`;
    }
    
    // For regression metrics
    if (metric === 'r2') {
      return value.toFixed(4);
    } else if (metric === 'mape') {
      return `${value.toFixed(2)}%`;
    } else {
      return value.toFixed(4);
    }
  };

  const getMetricDisplayName = (metric) => {
    const names = {
      accuracy: 'Accuracy',
      f1: 'F1 Score',
      macro_f1: 'Macro F1',
      precision: 'Precision',
      recall: 'Recall',
      mae: 'MAE',
      mse: 'MSE',
      rmse: 'RMSE',
      r2: 'R²',
      mape: 'MAPE'
    };
    return names[metric] || metric;
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="card">
        <div className="leaderboard-header">
          <h1 className="card-title" style={{ marginBottom: 0 }}>
            Leaderboard
          </h1>
          
          <div className="leaderboard-tabs">
            {user?.role === 'admin' && (
              <>
                <button
                  onClick={() => setLeaderboardType('public')}
                  className={leaderboardType === 'public' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.6rem 1rem' }}
                >
                  Public Leaderboard
                </button>
                <button
                  onClick={() => setLeaderboardType('private')}
                  className={leaderboardType === 'private' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.6rem 1rem' }}
                >
                  Private Leaderboard
                </button>
              </>
            )}
            {user?.role !== 'admin' && enableUserPrivateLeaderboard && (
              <>
                <button
                  onClick={() => setLeaderboardType('public')}
                  className={leaderboardType === 'public' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.6rem 1rem' }}
                >
                  📊 Public Leaderboard
                </button>
                <button
                  onClick={() => setLeaderboardType('private')}
                  className={leaderboardType === 'private' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '0.6rem 1rem' }}
                >
                  🔒 Private Leaderboard
                </button>
              </>
            )}
            {user?.role !== 'admin' && !enableUserPrivateLeaderboard && (
              <div className="alert alert-info" style={{ marginBottom: 0, padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                Public Leaderboard
              </div>
            )}
          </div>
        </div>

        {/* Competition Status Alert */}
        {!statusLoading && competitionStatus && competitionStatus.status === 'not_started' && (
          <>
            <div className="alert alert-error" style={{ marginTop: '1rem' }}>
              <strong>🚫 Competition Not Started</strong>
              <br />
              {competitionStatus.competitionStartTime ? (
                <>
                  The competition will begin on{' '}
                  <strong>{new Date(competitionStatus.competitionStartTime).toLocaleString()}</strong>.
                </>
              ) : (
                <>Competition schedule has not been set yet.</>
              )}
            </div>

            {/* Countdown Timer */}
            {countdown && (
              <div
                style={{
                  textAlign: 'center',
                  margin: '2rem 0',
                  padding: '2rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)'
                }}
              >
                <h3 style={{ marginTop: 0, fontSize: '1.5rem', fontWeight: '600' }}>
                  🏁 Competition Starts In
                </h3>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '2rem',
                    marginTop: '1.5rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{countdown.days}</div>
                    <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Days</div>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', opacity: '0.5' }}>:</div>
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{countdown.hours}</div>
                    <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Hours</div>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', opacity: '0.5' }}>:</div>
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{countdown.minutes}</div>
                    <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Minutes</div>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', opacity: '0.5' }}>:</div>
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{countdown.seconds}</div>
                    <div style={{ fontSize: '0.9rem', opacity: '0.9' }}>Seconds</div>
                  </div>
                </div>
              </div>
            )}

            {/* No Schedule Set */}
            {!competitionStatus.competitionStartTime && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#95a5a6' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏰ Competition Not Started</h2>
                <p style={{ fontSize: '1.1rem', color: '#7f8c8d' }}>
                  The competition schedule has not been set yet. Please check back later.
                </p>
              </div>
            )}
          </>
        )}

        {/* Leaderboard Content - Only show when competition has started */}
        {competitionStatus && competitionStatus.status !== 'not_started' && (
          <>
        {leaderboardType === 'private' && user?.role === 'admin' && (
          <div style={{ marginBottom: '1rem' }}>
            <div className="alert alert-info">
              <strong>Private Leaderboard:</strong> Only submissions selected for final evaluation are shown here.
              Participants can select up to 2 submissions.
            </div>
            <button 
              onClick={toggleUserPrivateLeaderboard}
              className={enableUserPrivateLeaderboard ? 'btn btn-success' : 'btn btn-secondary'}
              disabled={loadingConfig}
              style={{ marginTop: '0.5rem' }}
            >
              {loadingConfig ? 'Updating...' : (enableUserPrivateLeaderboard ? 'Allow Users to View Private Leaderboard' : 'Allow Users to View Private Leaderboard')}
            </button>
            <small style={{ display: 'block', marginTop: '0.5rem', color: '#666' }}>
              {enableUserPrivateLeaderboard 
                ? 'Users can now toggle between public and private leaderboards' 
                : 'Users will only see public leaderboard'}
            </small>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {userRank && (
          <div className="alert alert-info">
            <strong>Your Rank:</strong> #{userRank.rank} out of {userRank.totalUsers} participants
            <br />
            <strong>Your Best {getMetricDisplayName(leaderboardMetric)}:</strong> {formatMetricValue(userRank[leaderboardMetric], leaderboardMetric)}
            {sortOrder === 'asc' && ' (lower is better)'}
            {sortOrder === 'desc' && ' (higher is better)'}
          </div>
        )}

        {leaderboard.length === 0 ? (
          <div className="text-center">
            <p className="text-muted">No submissions yet</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team Name</th>
                  {problemType === 'classification' ? (
                    <>
                      <th>Accuracy</th>
                      <th>F1 Score</th>
                      <th>Macro F1</th>
                      <th>Precision</th>
                      <th>Recall</th>
                    </>
                  ) : (
                    <>
                      <th>RMSE</th>
                      <th>MAE</th>
                      <th>R²</th>
                      <th>MAPE</th>
                    </>
                  )}
                  <th>Submission Date</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => {
                  const isCurrentUser = user && entry.userId === user.id;
                  return (
                    <tr 
                      key={entry.userId} 
                      style={{
                        backgroundColor: isCurrentUser ? '#fff3cd' : 'transparent',
                        fontWeight: isCurrentUser ? 'bold' : 'normal'
                      }}
                    >
                      <td>
                        {entry.rank > 3 ? `#${entry.rank}` : `#${entry.rank}`}
                      </td>
                      <td>
                        {entry.teamName}
                        {isCurrentUser && ' (You)'}
                      </td>
                      {problemType === 'classification' ? (
                        <>
                          <td>
                            <strong style={{ color: entry.rank <= 3 ? '#27ae60' : 'inherit' }}>
                              {formatMetricValue(entry.accuracy, 'accuracy')}
                            </strong>
                          </td>
                          <td>{formatMetricValue(entry.f1, 'f1')}</td>
                          <td>{formatMetricValue(entry.macro_f1, 'macro_f1')}</td>
                          <td>{formatMetricValue(entry.precision, 'precision')}</td>
                          <td>{formatMetricValue(entry.recall, 'recall')}</td>
                        </>
                      ) : (
                        <>
                          <td>
                            <strong style={{ color: entry.rank <= 3 ? '#27ae60' : 'inherit' }}>
                              {formatMetricValue(entry.rmse, 'rmse')}
                            </strong>
                          </td>
                          <td>{formatMetricValue(entry.mae, 'mae')}</td>
                          <td>{formatMetricValue(entry.r2, 'r2')}</td>
                          <td>{formatMetricValue(entry.mape, 'mape')}</td>
                        </>
                      )}
                      <td>{new Date(entry.submissionDate).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
