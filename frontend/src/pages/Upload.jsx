import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { submissionAPI, API_BASE_URL } from '../api';
import axios from 'axios';

function Upload() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [columnConfig, setColumnConfig] = useState({ idColumn: 'row_id', labelColumn: 'label' });
  const [configLoading, setConfigLoading] = useState(true);
  const [competitionStatus, setCompetitionStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [countdown, setCountdown] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchColumnConfig();
    fetchCompetitionStatus();
  }, []);

  // Update countdown every second
  useEffect(() => {
    // Show countdown to START when not started, or to END when active
    const targetTime = competitionStatus?.status === 'not_started' 
      ? competitionStatus?.competitionStartTime
      : competitionStatus?.competitionEndTime;

    if (!targetTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(targetTime);
      const diff = target - now;

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
      const response = await submissionAPI.getStatus();
      setCompetitionStatus(response.data);
    } catch (err) {
      console.error('Failed to fetch competition status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchColumnConfig = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/submissions/column-config`);
      if (response.data.idColumn && response.data.labelColumn) {
        setColumnConfig({
          idColumn: response.data.idColumn,
          labelColumn: response.data.labelColumn
        });
      }
    } catch (err) {
      console.error('Failed to fetch column config:', err);
      // Keep defaults if fetch fails
    } finally {
      setConfigLoading(false);
    }
  };

  const validateCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        preview: 1,
        complete: (results) => {
          const columns = results.meta.fields;
          
          if (!columns.includes(columnConfig.idColumn)) {
            reject(`CSV must contain a "${columnConfig.idColumn}" column`);
            return;
          }
          
          if (!columns.includes(columnConfig.labelColumn)) {
            reject(`CSV must contain a "${columnConfig.labelColumn}" column`);
            return;
          }
          
          resolve(true);
        },
        error: (error) => {
          reject('Failed to parse CSV file');
        }
      });
    });
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    await processFile(selectedFile);
  };

  const processFile = async (selectedFile) => {
    setError('');
    setValidationError('');
    
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Check file type
    if (!selectedFile.name.endsWith('.csv')) {
      setValidationError('Please select a CSV file');
      setFile(null);
      return;
    }

    // Validate CSV structure
    try {
      await validateCSV(selectedFile);
      setFile(selectedFile);
      setValidationError('');
    } catch (err) {
      setValidationError(err);
      setFile(null);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await submissionAPI.upload(file);
      // Navigate to results page with submission data
      navigate('/result', { state: { submission: response.data.submission } });
      // Refresh status after successful submission
      fetchCompetitionStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="card">
        <h1 className="card-title">Upload Submission</h1>
        
        {/* Loading State */}
        {statusLoading && (
          <div className="alert alert-info">
            Loading competition status...
          </div>
        )}
        
        {/* Competition Status Alert */}
        {!statusLoading && competitionStatus && (
          <>
            {competitionStatus.status === 'not_started' && (
              <>
                <div className="alert alert-error">
                  <strong>🚫 Competition Not Started</strong>
                  <br />
                  {competitionStatus.competitionStartTime ? (
                    <>
                      The competition will begin on{' '}
                      <strong>{new Date(competitionStatus.competitionStartTime).toLocaleString()}</strong>.
                    </>
                  ) : (
                    <>Competition schedule not set yet.</>
                  )}
                  <br />
                  Submissions are not accepted yet. Please come back after the competition starts.
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
            
            {competitionStatus.status === 'ended' && (
              <>
                <div className="alert alert-error">
                  <strong>Competition Ended</strong>
                  <br />
                  The competition ended on {new Date(competitionStatus.competitionEndTime).toLocaleString()}.
                  <br />
                  No more submissions are accepted.
                </div>
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <h2 style={{ color: '#95a5a6' }}>🏁 Competition Ended</h2>
                  <p style={{ color: '#7f8c8d', fontSize: '1.1rem', marginTop: '1rem' }}>
                    Thank you for participating!
                  </p>
                </div>
              </>
            )}
          </>
        )}
        
        {/* Only show upload form when competition is active */}
        {!statusLoading && competitionStatus?.status === 'active' && (
          <>
            {/* Status and Countdown Section */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ 
                padding: '1.5rem', 
                backgroundColor: '#e8f5e9', 
                borderLeft: '4px solid #27ae60', 
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ marginTop: 0, color: '#27ae60', fontSize: '1.2rem' }}>✅ Competition Active</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <p style={{ margin: '0.5rem 0', color: '#2c3e50', fontSize: '0.95rem' }}>
                      <strong>Submissions Used:</strong> {competitionStatus.submissionCount} / {competitionStatus.uploadLimit}
                    </p>
                    <p style={{ margin: '0.5rem 0', color: '#27ae60', fontSize: '1.1rem', fontWeight: 'bold' }}>
                      ✓ {competitionStatus.remainingSubmissions} remaining
                    </p>
                  </div>
                </div>
              </div>

              {/* Countdown Timer */}
              {countdown && (
                <div style={{ 
                  padding: '1.5rem', 
                  backgroundColor: '#fff3cd',
                  borderLeft: '4px solid #f39c12',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ marginTop: 0, color: '#f39c12', fontSize: '1.2rem' }}>⏱️ Time Remaining</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '1rem',
                    marginTop: '1rem'
                  }}>
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '2px solid #f39c12',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e67e22' }}>
                        {countdown.days}
                      </div>
                      <div style={{ color: '#d35400', fontSize: '0.9rem', fontWeight: '500' }}>Days</div>
                    </div>
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '2px solid #f39c12',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e67e22' }}>
                        {countdown.hours}
                      </div>
                      <div style={{ color: '#d35400', fontSize: '0.9rem', fontWeight: '500' }}>Hours</div>
                    </div>
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '2px solid #f39c12',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#e67e22' }}>
                        {countdown.minutes}
                      </div>
                      <div style={{ color: '#d35400', fontSize: '0.9rem', fontWeight: '500' }}>Minutes</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {competitionStatus.remainingSubmissions === 0 && (
              <div className="alert alert-error">
                <strong>Upload Limit Reached</strong>
                <br />
                You have used all {competitionStatus.uploadLimit} allowed submissions.
              </div>
            )}
        
            <div className="alert alert-info">
              <strong>Instructions:</strong>
              <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                <li>Upload a CSV file with your predictions</li>
                <li>File must contain <strong>"{columnConfig.idColumn}"</strong> and <strong>"{columnConfig.labelColumn}"</strong> columns</li>
                <li>Predictions will be compared against the canonical answer set</li>
              </ul>
            </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {validationError && (
          <div className="alert alert-error">
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select or Drop CSV File</label>
            
            {/* Drag and Drop Zone */}
            <div
              className={`drag-drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="file-input-hidden"
                disabled={loading}
              />
              
              {loading ? (
                <div className="drag-drop-content">
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ 
                      display: 'inline-block', 
                      width: '50px', 
                      height: '50px',
                      border: '4px solid #f3f3f3',
                      borderTop: '4px solid #3498db',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '1rem'
                    }}></div>
                    <div style={{ color: '#3498db', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      Uploading...
                    </div>
                    <div style={{ color: '#7f8c8d', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                      Please wait while your file is being analyzed
                    </div>
                  </div>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              ) : (
                <div className="drag-drop-content">
                  {file ? (
                    <>
                      <div className="file-icon">📄</div>
                      <div className="file-name">{file.name}</div>
                      {!validationError && (
                        <div className="file-valid">✓ Valid CSV file</div>
                      )}
                      <div className="file-hint">Click to change file</div>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">☁️</div>
                      <div className="upload-text">
                        <strong>Drag & drop your CSV file here</strong>
                      </div>
                      <div className="upload-or">or</div>
                      <button type="button" className="browse-button">
                        Browse Files
                      </button>
                      <div className="upload-hint">
                        Required columns: <strong>{columnConfig.idColumn}</strong>, <strong>{columnConfig.labelColumn}</strong>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !file || validationError || !competitionStatus?.canSubmit}
          >
            {loading ? 'Uploading...' : 'Upload and Analyze'}
          </button>
          
          {competitionStatus && !competitionStatus.canSubmit && competitionStatus.status === 'active' && (
            <p style={{ marginTop: '1rem', color: '#e74c3c' }}>
              Upload disabled: You have reached your submission limit.
            </p>
          )}
        </form>
          </>
        )}
      </div>
    </div>
  );
}

export default Upload;
