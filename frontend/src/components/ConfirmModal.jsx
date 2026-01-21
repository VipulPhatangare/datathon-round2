import React from 'react';

function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onClose,
  isLoading,
  confirmText = 'Confirm',
  confirmColor = 'primary',
  loadingText = 'Processing...'
}) {
  if (!isOpen) return null;

  const buttonClass = `btn btn-${confirmColor}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <h2 style={{ marginBottom: '1rem', color: '#2c3e50' }}>{title}</h2>
        <p style={{ marginBottom: '2rem', color: '#34495e', fontSize: '1rem', whiteSpace: 'pre-line' }}>{message}</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isLoading}
            style={{ minWidth: '100px' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={buttonClass}
            disabled={isLoading}
            style={{ minWidth: '100px' }}
          >
            {isLoading ? loadingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
