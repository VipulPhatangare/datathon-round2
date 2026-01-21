import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api';
import Navbar from '../components/Navbar';
import '../styles/CompetitionInfo.css';

const CompetitionInfo = () => {
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState({ training: false, testing: false, sample: false });
  const [competitionStatus, setCompetitionStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetchCompetitionInfo();
    fetchCompetitionStatus();
  }, []);

  const fetchCompetitionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/submissions/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompetitionStatus(response.data);
    } catch (err) {
      console.error('Failed to load competition status');
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchCompetitionInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/competition`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompetition(response.data.competition);
    } catch (err) {
      console.error('Error fetching competition info:', err);
      setError('Failed to load competition information');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDataset = async (type) => {
    try {
      setDownloading({ ...downloading, [type]: true });
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_BASE_URL}/admin/datasets/download/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from content-disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${type}_dataset.csv`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Error downloading ${type} dataset:`, err);
      alert(`Failed to download ${type} dataset. Please try again.`);
    } finally {
      setDownloading({ ...downloading, [type]: false });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="competition-info">
          <div className="loading">Loading competition information...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="competition-info">
          <div className="error">{error}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="competition-info">
        <div className="competition-container">
          <h1 className="competition-title">{competition.title}</h1>
          
          {/* Competition Status Messages */}
          {!statusLoading && competitionStatus && (
            <>
              {competitionStatus.status === 'not_started' && (
                <div style={{ 
                  padding: '1.5rem', 
                  backgroundColor: '#fff3cd',
                  borderLeft: '4px solid #f39c12',
                  borderRadius: '8px',
                  marginBottom: '2rem'
                }}>
                  <h3 style={{ marginTop: 0, color: '#f39c12', fontSize: '1.2rem' }}>🚫 Competition Not Started</h3>
                  {competitionStatus.competitionStartTime ? (
                    <p style={{ margin: '0.5rem 0', color: '#856404' }}>
                      The competition will begin on{' '}
                      <strong>{new Date(competitionStatus.competitionStartTime).toLocaleString()}</strong>.
                      <br />
                      Datasets will be available once the competition starts.
                    </p>
                  ) : (
                    <p style={{ margin: '0.5rem 0', color: '#856404' }}>
                      Competition schedule not set yet. Datasets will be available once the competition starts.
                    </p>
                  )}
                </div>
              )}
              
              {competitionStatus.status === 'ended' && (
                <div style={{ 
                  padding: '1.5rem', 
                  backgroundColor: '#f8d7da',
                  borderLeft: '4px solid #e74c3c',
                  borderRadius: '8px',
                  marginBottom: '2rem'
                }}>
                  <h3 style={{ marginTop: 0, color: '#e74c3c', fontSize: '1.2rem' }}>🏁 Competition Ended</h3>
                  <p style={{ margin: '0.5rem 0', color: '#721c24' }}>
                    The competition ended on{' '}
                    <strong>{new Date(competitionStatus.competitionEndTime).toLocaleString()}</strong>.
                  </p>
                </div>
              )}
            </>
          )}
          
          {/* Download Datasets Section - Only show when competition is active */}
          {!statusLoading && competitionStatus?.status === 'active' && (
            <div className="info-section" style={{ backgroundColor: '#e8f4f8', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <h2 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Download Datasets</h2>
              <p style={{ marginBottom: '1rem', color: '#34495e' }}>Download the competition datasets to get started with your analysis and predictions.</p>
            <div className="download-buttons-grid">
              <button 
                onClick={() => handleDownloadDataset('training')}
                disabled={downloading.training}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: downloading.training ? '#95a5a6' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: downloading.training ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.3s'
                }}
              >
                {downloading.training ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Downloading...
                  </>
                ) : (
                  <>Training Dataset</>
                )}
              </button>
              
              <button 
                onClick={() => handleDownloadDataset('testing')}
                disabled={downloading.testing}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: downloading.testing ? '#95a5a6' : '#2ecc71',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: downloading.testing ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.3s'
                }}
              >
                {downloading.testing ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Downloading...
                  </>
                ) : (
                  <>Testing Dataset</>
                )}
              </button>
              
              <button 
                onClick={() => handleDownloadDataset('sample')}
                disabled={downloading.sample}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: downloading.sample ? '#95a5a6' : '#9b59b6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: downloading.sample ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'background-color 0.3s'
                }}
              >
                {downloading.sample ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Downloading...
                  </>
                ) : (
                  <>Sample Submission</>
                )}
              </button>
            </div>
          </div>
          )}

          <div className="info-section">
            <h2>Description</h2>
            <p className="description">{competition.description}</p>
          </div>

          {competition.timeline && (
            <div className="info-section timeline">
              <h2>Timeline</h2>
              <div className="timeline-grid">
                <div className="timeline-item">
                  <span className="timeline-label">Start Date:</span>
                  <span className="timeline-value">{formatDate(competition.timeline.startDate)}</span>
                </div>
                <div className="timeline-item">
                  <span className="timeline-label">End Date:</span>
                  <span className="timeline-value">{formatDate(competition.timeline.endDate)}</span>
                </div>
                <div className="timeline-item">
                  <span className="timeline-label">Final Submission Deadline:</span>
                  <span className="timeline-value">{formatDate(competition.timeline.finalSubmissionDate)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="info-section">
            <h2>Evaluation Criteria</h2>
            <p className="evaluation">{competition.evaluationCriteria}</p>
          </div>

          {competition.rules && competition.rules.length > 0 && (
            <div className="info-section">
              <h2>Rules</h2>
              <ul className="rules-list">
                {competition.rules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            </div>
          )}

          {competition.prizes && competition.prizes.length > 0 && (
            <div className="info-section prizes">
              <h2>Prizes</h2>
              <ul className="prizes-list">
                {competition.prizes.map((prize, index) => (
                  <li key={index}>
                    <strong>{prize.position}:</strong> {prize.reward}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {competition.dataDescription && (
            <div className="info-section">
              <h2>Data Description</h2>
              <div className="data-description">
                <p><strong>Overview:</strong> {competition.dataDescription.overview}</p>
                
                {competition.dataDescription.files && competition.dataDescription.files.length > 0 && (
                  <div className="files-section">
                    <h3>Files</h3>
                    <ul>
                      {competition.dataDescription.files.map((file, index) => (
                        <li key={index}>
                          <strong>{file.name}:</strong> {file.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {competition.dataDescription.columns && competition.dataDescription.columns.length > 0 && (
                  <div className="columns-section">
                    <h3>Columns</h3>
                    <ul>
                      {competition.dataDescription.columns.map((col, index) => (
                        <li key={index}>
                          <strong>{col.name}</strong> ({col.type}): {col.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CompetitionInfo;
