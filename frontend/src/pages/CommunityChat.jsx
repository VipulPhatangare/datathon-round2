import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import { API_BASE_URL, SOCKET_URL } from '../api';
import { useToast } from '../components/ToastProvider';

function CommunityChat() {
  const toast = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/chat`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data.messages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // Setup Socket.io connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No token found');
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      setConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from chat server:', reason);
      setConnected(false);
    });

    newSocket.on('user-info', (data) => {
      console.log('User info:', data);
    });

    newSocket.on('new-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on('message-deleted', (data) => {
      setMessages((prev) => prev.filter(msg => msg._id !== data.messageId));
    });

    newSocket.on('user-typing', (data) => {
      setTypingUsers((prev) => new Set(prev).add(data.teamName));
      setTimeout(() => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.teamName);
          return newSet;
        });
      }, 3000);
    });

    newSocket.on('user-stop-typing', (data) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.teamName);
        return newSet;
      });
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !socket || !connected) {
      return;
    }

    socket.emit('send-message', { message: newMessage });
    setNewMessage('');

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('stop-typing');
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!socket || !connected) return;

    // Emit typing indicator
    socket.emit('typing');

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing');
    }, 2000);
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteMessage = async (messageId) => {
    if (!socket || !connected) {
      toast.warning('Not connected to chat server');
      return;
    }

    // Only use Socket.io for deletion (handles both delete and broadcast)
    socket.emit('delete-message', { messageId });
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="card" style={{ padding: 0, height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div style={{ 
          padding: '0.75rem 1rem', 
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#2c3e50' }}>Community Chat</h3>
            </div>
            <div style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              backgroundColor: connected ? '#d4edda' : '#fadbd8',
              color: connected ? '#155724' : '#c0392b'
            }}>
              {connected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem',
          backgroundColor: '#ffffff'
        }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#95a5a6' }}>
              No messages yet. Be the first to start the conversation!
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = String(msg.userId) === String(user?.id);
              const isAdmin = msg.isAdmin;

              return (
                <div
                  key={msg._id}
                  style={{
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    backgroundColor: isOwnMessage ? '#3498db' : isAdmin ? '#e74c3c' : '#ecf0f1',
                    color: isOwnMessage || isAdmin ? 'white' : '#2c3e50',
                    padding: '0.5rem 0.75rem',
                    borderRadius: isOwnMessage ? '12px 12px 0 12px' : '12px 12px 12px 0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    position: 'relative'
                  }}>
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      marginBottom: '0.15rem',
                      opacity: 0.85,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>{isAdmin ? '👑 ' : ''}{msg.teamName}{isAdmin && ' (Admin)'}</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <div style={{ 
                      wordBreak: 'break-word',
                      fontSize: '0.9rem',
                      lineHeight: '1.3'
                    }}>
                      {msg.message}
                    </div>
                  </div>
                  {(isOwnMessage || user?.role === 'admin') && (
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#e74c3c',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0.25rem',
                        opacity: 0.6,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.opacity = 1}
                      onMouseLeave={(e) => e.target.style.opacity = 0.6}
                      title="Delete message"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
          
          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <div style={{
              padding: '0.5rem',
              fontSize: '0.85rem',
              color: '#7f8c8d',
              fontStyle: 'italic'
            }}>
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </div>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder={connected ? "Type your message..." : "Connecting..."}
              disabled={!connected}
              className="form-input"
              style={{
                flex: 1,
                fontSize: '0.9rem',
                padding: '0.6rem 0.75rem'
              }}
            />
            <button
              type="submit"
              disabled={!connected || !newMessage.trim()}
              className="btn btn-primary"
              style={{
                padding: '0.6rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CommunityChat;
