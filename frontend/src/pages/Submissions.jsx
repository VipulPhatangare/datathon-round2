import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { submissionAPI } from '../api';
import axios from 'axios';

function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [problemType, setProblemType] = useState('classification');
  const [downloading, setDownloading] = useState(false);
  const [competitionStatus, setCompetitionStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubmissions();
    fetchCompetitionStatus();
  }, []);

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

  async function fetchSubmissions() {
    try {
      const response = await submissionAPI.getMySubmissions();
      const subs = response.data.submissions;
      setSubmissions(subs);
      
      // Determine problem type from first submission
      if (subs.length > 0) {
        setProblemType(subs[0].problemType || 'classification');
      }
    } catch (err) {
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const toggleFinalSelection = async (submissionId, currentSelection) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `http://localhost:4000/api/submissions/${submissionId}/select-final`,
        { isSelected: !currentSelection },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchSubmissions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update selection');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteSubmission = async (submissionId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?\n\nNote: This submission will still count towards your submission limit.`)) {
      return;
    }

    try {
      const response = await submissionAPI.deleteSubmission(submissionId);
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(''), 5000);
      fetchSubmissions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete submission');
      setTimeout(() => setError(''), 3000);
    }
  };

  const downloadCSV = async () => {
    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:4000/api/submissions/download/csv',
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', response.headers['content-disposition']?.split('filename="')[1]?.split('"')[0] || 'submissions.csv');
      document.body.appendChild(link);
      link.click();
      link.parentChild.removeChild(link);
      
      setSuccessMessage('Submissions downloaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to download submissions');
      setTimeout(() => setError(''), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const viewDetails = (submissionId) => {
    navigate(`/submission/${submissionId}`);
  };

  const formatMetric = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return parseFloat(value).toFixed(6);
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="card">
        <h1 className="card-title">My Submissions</h1>

        {/* Competition Status Alert */}
        {!statusLoading && competitionStatus && competitionStatus.status === 'not_started' && (
          <>
            <div className="alert alert-error">
              <strong>Competition Not Started</strong>
              <br />
              {competitionStatus.competitionStartTime ? (
                <>
                  The competition will begin on {new Date(competitionStatus.competitionStartTime).toLocaleString()}.
                  <br />
                  Submissions are not available yet. Please come back after the competition starts.
                </>
              ) : (
                <>Competition schedule not set yet. Please check back later.</>
              )}
            </div>

            {/* Countdown Timer */}
            {countdown && (
              <div style={{ textAlign: 'center', margin: '2rem 0', padding: '2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: '#fff', boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>🏁 Competition Starts In</h3>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{countdown.days}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Days</div>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', opacity: 0.5 }}>:</div>
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{countdown.hours}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Hours</div>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', opacity: 0.5 }}>:</div>
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{countdown.minutes}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Minutes</div>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', opacity: 0.5 }}>:</div>
                  <div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{countdown.seconds}</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Seconds</div>
                  </div>
                </div>
              </div>
            )}

            {!competitionStatus.competitionStartTime && (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <h2 style={{ color: '#95a5a6' }}>⏰ Competition Not Started</h2>
                <p style={{ color: '#7f8c8d', fontSize: '1.1rem', marginTop: '1rem' }}>
                  The competition schedule has not been set yet
                </p>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="alert alert-success" style={{ background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }}>
            {successMessage}
          </div>
        )}

        {competitionStatus && competitionStatus.status !== 'not_started' && (
          <>
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              <strong>Final Submission Selection:</strong> You can select up to 2 submissions for the final private leaderboard.
              The private leaderboard will be revealed after the competition ends.
            </div>

            {submissions.length === 0 ? (
              <div className="text-center">
                <p className="text-muted">No submissions yet</p>
                <button onClick={() => navigate('/')} className="btn btn-primary mt-1">
                  Upload Your First Submission
                </button>
              </div>
            ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Attempt #</th>
                  <th>Time</th>
                  <th>Filename</th>
                  {problemType === 'classification' ? (
                    <>
                      <th style={{ background: '#f0f0f0' }}>Accuracy</th>
                      <th style={{ background: '#f0f0f0' }}>F1 Score</th>
                      <th style={{ background: '#f0f0f0' }}>Macro F1</th>
                      <th style={{ background: '#f0f0f0' }}>Precision</th>
                      <th style={{ background: '#f0f0f0' }}>Recall</th>
                    </>
                  ) : (
                    <>
                      <th style={{ background: '#f0f0f0' }}>MAE</th>
                      <th style={{ background: '#f0f0f0' }}>MSE</th>
                      <th style={{ background: '#f0f0f0' }}>RMSE</th>
                      <th style={{ background: '#f0f0f0' }}>R²</th>
                      <th style={{ background: '#f0f0f0' }}>MAPE</th>
                    </>
                  )}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  return (
                    <tr key={sub._id} style={{ background: sub.isSelectedForFinal ? '#fff3cd' : 'transparent' }}>
                      <td style={{ fontWeight: 'bold' }}>#{sub.attemptNumber}</td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(sub.uploadedAt).toLocaleTimeString()}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.filename}</td>
                      
                      {/* All Metrics */}
                      {problemType === 'classification' ? (
                        <>
                          <td style={{ background: '#f0f0f0', fontWeight: 'bold' }}>{formatMetric(sub.public_accuracy)}</td>
                          <td style={{ background: '#f0f0f0' }}>{formatMetric(sub.public_f1)}</td>
                          <td style={{ background: '#f0f0f0' }}>{formatMetric(sub.public_macro_f1)}</td>
                          <td style={{ background: '#f0f0f0' }}>{formatMetric(sub.public_precision)}</td>
                          <td style={{ background: '#f0f0f0' }}>{formatMetric(sub.public_recall)}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ background: '#f0f0f0', fontWeight: 'bold' }}>{formatMetric(sub.public_mae)}</td>
                          <td style={{ background: '#f0f0f0' }}>{formatMetric(sub.public_mse)}</td>
                          <td style={{ background: '#f0f0f0' }}>{formatMetric(sub.public_rmse)}</td>
                          <td style={{ background: '#f0f0f0' }}>{formatMetric(sub.public_r2)}</td>
                          <td style={{ background: '#f0f0f0' }}>{formatMetric(sub.public_mape)}</td>
                        </>
                      )}
                      
                      <td>
                        <button
                          onClick={() => toggleFinalSelection(sub._id, sub.isSelectedForFinal)}
                          className={sub.isSelectedForFinal ? 'btn btn-success' : 'btn btn-secondary'}
                          style={{ 
                            padding: '0.35rem 0.6rem', 
                            fontSize: '0.75rem',
                            background: sub.isSelectedForFinal ? '#28a745' : '#6c757d',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {sub.isSelectedForFinal ? '✓ Selected' : 'Select'}
                        </button>
                      </td>
                      <td>
                        <button 
                          onClick={() => viewDetails(sub._id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Legend */}
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                <strong>Note:</strong> Metrics shown are based on the public dataset. 
                Final rankings will be determined by private dataset scores after competition ends.
              </p>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}

export default Submissions;
