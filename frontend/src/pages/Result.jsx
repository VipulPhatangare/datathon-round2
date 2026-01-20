import { useLocation, useNavigate } from 'react-router-dom';

function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const submission = location.state?.submission;

  if (!submission) {
    return (
      <div className="main-content">
        <div className="card">
          <h1 className="card-title">No Results</h1>
          <p>No submission data found.</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  const problemType = submission.problemType || 'classification';

  const getMetricColor = (value, metric, problemType) => {
    if (problemType === 'classification') {
      // For classification: higher is better
      if (value >= 0.8) return 'good';
      if (value >= 0.6) return 'medium';
      return 'poor';
    } else {
      // For regression: depends on metric
      if (metric === 'r2') {
        // R²: higher is better (max 1.0)
        if (value >= 0.8) return 'good';
        if (value >= 0.6) return 'medium';
        return 'poor';
      } else {
        // Error metrics (MAE, MSE, RMSE, MAPE): lower is better
        // Color based on relative values - this is simplified
        return 'medium'; // Neutral color since we don't know the scale
      }
    }
  };

  const formatMetricValue = (value, metric) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (problemType === 'classification') {
      return `${(value * 100).toFixed(2)}%`;
    }
    
    if (metric === 'r2') {
      return value.toFixed(4);
    } else if (metric === 'mape') {
      return `${value.toFixed(2)}%`;
    } else {
      return value.toFixed(4);
    }
  };

  const { metrics, summary, preview } = submission;

  return (
    <div className="main-content">
      <div className="card">
        <h1 className="card-title">
          Submission Results
          <span style={{ fontSize: '0.8rem', marginLeft: '1rem', color: '#7f8c8d' }}>
            ({problemType === 'classification' ? 'Classification' : 'Regression'})
          </span>
        </h1>
        
        <div className="alert alert-success">
          <strong>Submission processed successfully!</strong>
          <br />
          Attempt #{submission.attemptNumber} - {submission.filename}
        </div>

        <h2 className="card-subtitle">Performance Metrics</h2>
        
        {problemType === 'classification' ? (
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Accuracy</div>
              <div className={`metric-value ${getMetricColor(metrics.accuracy, 'accuracy', problemType)}`}>
                {formatMetricValue(metrics.accuracy, 'accuracy')}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">F1 Score</div>
              <div className={`metric-value ${getMetricColor(metrics.f1, 'f1', problemType)}`}>
                {formatMetricValue(metrics.f1, 'f1')}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Macro F1 Score</div>
              <div className={`metric-value ${getMetricColor(metrics.macro_f1, 'macro_f1', problemType)}`}>
                {formatMetricValue(metrics.macro_f1, 'macro_f1')}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Precision</div>
              <div className={`metric-value ${getMetricColor(metrics.precision, 'precision', problemType)}`}>
                {formatMetricValue(metrics.precision, 'precision')}
              </div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Recall</div>
              <div className={`metric-value ${getMetricColor(metrics.recall, 'recall', problemType)}`}>
                {formatMetricValue(metrics.recall, 'recall')}
              </div>
            </div>
          </div>
        ) : (
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">RMSE</div>
              <div className={`metric-value ${getMetricColor(metrics.rmse, 'rmse', problemType)}`}>
                {formatMetricValue(metrics.rmse, 'rmse')}
              </div>
              <small style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>Lower is better</small>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">MAE</div>
              <div className={`metric-value ${getMetricColor(metrics.mae, 'mae', problemType)}`}>
                {formatMetricValue(metrics.mae, 'mae')}
              </div>
              <small style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>Lower is better</small>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">MSE</div>
              <div className={`metric-value ${getMetricColor(metrics.mse, 'mse', problemType)}`}>
                {formatMetricValue(metrics.mse, 'mse')}
              </div>
              <small style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>Lower is better</small>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">R² Score</div>
              <div className={`metric-value ${getMetricColor(metrics.r2, 'r2', problemType)}`}>
                {formatMetricValue(metrics.r2, 'r2')}
              </div>
              <small style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>Higher is better</small>
            </div>

            <div className="metric-card">
              <div className="metric-label">MAPE</div>
              <div className={`metric-value ${getMetricColor(metrics.mape, 'mape', problemType)}`}>
                {formatMetricValue(metrics.mape, 'mape')}
              </div>
              <small style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>Lower is better</small>
            </div>
          </div>
        )}

        <div className="flex gap-1 mt-2">
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Upload Another
          </button>
          <button onClick={() => navigate('/submissions')} className="btn btn-secondary">
            View All Submissions
          </button>
          <button onClick={() => navigate('/leaderboard')} className="btn btn-secondary">
            View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default Result;
