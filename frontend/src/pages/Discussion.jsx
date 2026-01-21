import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import Navbar from '../components/Navbar';
import '../styles/Discussion.css';

const Discussion = () => {
  const toast = useToast();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: null
  });

  useEffect(() => {
    fetchDiscussions();
  }, [page]);

  const fetchDiscussions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/discussion?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDiscussions(response.data.discussions);
      setTotalPages(response.data.totalPages);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching discussions:', err);
      setError('Failed to load discussions');
      setLoading(false);
    }
  };

  const handlePostMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (newMessage.length > 2000) {
      setError('Message is too long (max 2000 characters)');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/discussion`,
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      setError('');
      fetchDiscussions();
    } catch (err) {
      console.error('Error posting message:', err);
      setError(err.response?.data?.error || 'Failed to post message');
    }
  };

  const handlePostReply = async (parentId) => {
    if (!replyMessage.trim()) return;

    if (replyMessage.length > 2000) {
      setError('Reply is too long (max 2000 characters)');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/discussion`,
        { message: replyMessage, parentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReplyMessage('');
      setReplyTo(null);
      setError('');
      fetchDiscussions();
    } catch (err) {
      console.error('Error posting reply:', err);
      setError(err.response?.data?.error || 'Failed to post reply');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      action: async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(`${API_BASE_URL}/discussion/${messageId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          toast.success('Message deleted successfully');
          fetchDiscussions();
        } catch (err) {
          console.error('Error deleting message:', err);
          toast.error(err.response?.data?.error || 'Failed to delete message');
        } finally {
          setConfirmModal({ isOpen: false, title: '', message: '', action: null });
        }
      }
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderMessage = (msg, isReply = false) => (
    <div key={msg._id} className={`message ${isReply ? 'reply' : ''} ${msg.isAdminReply ? 'admin-message' : ''}`}>
      <div className="message-header">
        <div className="message-author">
          <strong>{msg.teamName}</strong>
          {msg.isAdminReply && <span className="admin-badge">ADMIN</span>}
        </div>
        <div className="message-date">{formatDate(msg.createdAt)}</div>
      </div>
      <div className="message-content">{msg.message}</div>
      <div className="message-actions">
        <button 
          className="reply-btn"
          onClick={() => {
            setReplyTo(msg._id);
            setReplyMessage('');
          }}
        >
          Reply
        </button>
        {msg.canDelete && (
          <button 
            className="delete-btn"
            onClick={() => handleDeleteMessage(msg._id)}
          >
            Delete
          </button>
        )}
      </div>
      
      {replyTo === msg._id && (
        <div className="reply-form">
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Write your reply..."
            maxLength={2000}
          />
          <div className="reply-form-actions">
            <span className="char-count">{replyMessage.length}/2000</span>
            <button onClick={() => handlePostReply(msg._id)}>Post Reply</button>
            <button onClick={() => { setReplyTo(null); setReplyMessage(''); }}>Cancel</button>
          </div>
        </div>
      )}

      {msg.replies && msg.replies.length > 0 && (
        <div className="replies">
          {msg.replies.map(reply => renderMessage(reply, true))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="discussion-page">
          <div className="loading">Loading discussions...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="discussion-page">
        <div className="discussion-container">
          <h1>Discussion Forum</h1>

          {error && <div className="error-message">{error}</div>}

          <div className="new-message-section">
            <h2>Start a Discussion</h2>
            <form onSubmit={handlePostMessage}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Share your thoughts, ask questions, or start a discussion..."
                maxLength={2000}
                rows={4}
              />
              <div className="form-footer">
                <span className="char-count">{newMessage.length}/2000</span>
                <button type="submit" disabled={!newMessage.trim()}>
                  Post Message
                </button>
              </div>
            </form>
          </div>

          <div className="discussions-list">
            <h2>Recent Discussions</h2>
            {discussions.length === 0 ? (
              <p className="no-discussions">No discussions yet. Be the first to start one!</p>
            ) : (
              discussions.map(msg => renderMessage(msg))
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', action: null })}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </>
  );
};

export default Discussion;
