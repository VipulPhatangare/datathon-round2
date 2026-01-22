import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { submissionAPI, API_BASE_URL } from '../api';
import { useToast } from '../components/ToastProvider';

function SubmissionDetails() {
  const toast = useToast();
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [comments, setComments] = useState('');
  const [savingComments, setSavingComments] = useState(false);
  const [commentsSaved, setCommentsSaved] = useState(false);

  useEffect(() => {
    fetchSubmissionDetails();
  }, [submissionId]);

  const fetchSubmissionDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/submissions/${submissionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmission(response.data.submission);
      setComments(response.data.submission.comments || '');
    } catch (err) {
      setError('Failed to load submission details');
      console.error(err);
    } finally {
      setLoading(false);
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
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };
const saveComments = async () => {
    try {
      setSavingComments(true);
      await submissionAPI.updateComments(submissionId, comments);
      setCommentsSaved(true);
      setTimeout(() => setCommentsSaved(false), 3000);
    } catch (err) {
      console.error('Save comments error:', err);
      toast.error('Failed to save comments');
    } finally {
      setSavingComments(false);
    }
  };

  
  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">Loading submission details...</div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="main-content">
        <div className="card">
          <h1 className="card-title">Error</h1>
          <p>{error || 'Submission not found'}</p>
          <button onClick={() => navigate('/submissions')} className="btn btn-primary">
            Back to Submissions
          </button>
        </div>
      </div>
    );
  }

  const problemType = submission.problemType || 'classification';

  const formatNumber = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return parseFloat(value).toFixed(6);
  };

  return (
    <div className="main-content">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="card-title">Submission Details</h1>
            <p style={{ color: '#7f8c8d', marginTop: '0.5rem' }}>
              Attempt #{submission.attemptNumber} • {new Date(submission.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={downloadCSV}
              disabled={downloading}
              className="btn btn-success"
              style={{ padding: '0.6rem 1.2rem' }}
            >
              {downloading ? 'Downloading...' : 'Download CSV'}
            </button>
            <button onClick={() => navigate('/submissions')} className="btn btn-secondary">
              ← Back
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div style={{ 
          background: '#f8f9fa', 
          padding: '1rem', 
          borderRadius: '0.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Submission Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>Filename:</strong> {submission.filename}
            </div>
            <div>
              <strong>Uploaded:</strong> {new Date(submission.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div>
              <strong>Status:</strong> <span style={{ color: 'green' }}>{submission.status || 'Done'}</span>
            </div>
          </div>
        </div>

        {/* Metrics Tables */}
        {problemType === 'classification' ? (
          <>
            {/* Classification Metrics */}
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Performance Metrics</h3>
            
            {/* Public Metrics Table */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#2c3e50' }}>Your Submission Scores</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      <th>Accuracy</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1 Score</th>
                      <th>Macro F1</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#27ae60' }}>{formatNumber(submission.public_accuracy)}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatNumber(submission.public_precision)}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatNumber(submission.public_recall)}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#3498db' }}>{formatNumber(submission.public_f1)}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatNumber(submission.public_macro_f1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Regression Metrics */}
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Performance Metrics</h3>
            
            {/* Public Metrics Table */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#2c3e50' }}>Your Submission Scores</h4>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      <th>MAE</th>
                      <th>MSE</th>
                      <th>RMSE</th>
                      <th>R²</th>
                      <th>MAPE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#27ae60' }}>{formatNumber(submission.public_mae)}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatNumber(submission.public_mse)}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatNumber(submission.public_rmse)}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#3498db' }}>{formatNumber(submission.public_r2)}</td>
                      <td style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{formatNumber(submission.public_mape)}</td>
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Comments Section */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <h3 style={{ marginBottom: '1rem' }}>Notes & Comments</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Add notes about this submission for your reference
          </p>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="e.g., Used RandomForest with 100 trees, adjusted hyperparameters..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '1rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)'
            }}
          />
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={saveComments}
              disabled={savingComments}
              className="btn btn-success"
              style={{ padding: '0.5rem 1.5rem' }}
            >
              {savingComments ? 'Saving...' : 'Save Comments'}
            </button>
            {commentsSaved && (
              <span style={{ color: '#27ae60', fontSize: '0.9rem' }}>
                ✓ Comments saved successfully
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
          <button onClick={() => navigate('/submissions')} className="btn btn-secondary">
            ← Back to Submissions
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
            Upload Another File
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubmissionDetails;
