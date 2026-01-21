import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const BASE_URL = API_URL.replace('/api', ''); // Remove /api suffix for socket connections

// Export URLs for use in other components
export const API_BASE_URL = API_URL;
export const SOCKET_URL = BASE_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set auth token helper
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Set token from localStorage on page load
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (oldPassword, newPassword) => api.put('/auth/change-password', { oldPassword, newPassword })
};

// Admin API
export const adminAPI = {
  // Users
  getUsers: () => api.get('/admin/users'),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  
  // Answer CSV
  uploadAnswerCSV: (file, idColumn = 'row_id', labelColumn = 'label', publicPercentage = 50) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('idColumn', idColumn);
    formData.append('labelColumn', labelColumn);
    formData.append('publicPercentage', publicPercentage);
    const token = localStorage.getItem('token');
    return api.post('/admin/answer-csv', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
  },
  getAnswerCSV: () => api.get('/admin/answer-csv'),
  
  // Datasets
  uploadTrainingDataset: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    return api.post('/admin/datasets/training', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
  },
  uploadTestingDataset: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    return api.post('/admin/datasets/testing', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
  },
  uploadSampleSubmissionDataset: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    return api.post('/admin/datasets/sample-submission', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
  },
  getDatasets: () => api.get('/admin/datasets'),
  deleteAnswerCSV: () => api.delete('/admin/answer-csv'),
  deleteTrainingDataset: () => api.delete('/admin/datasets/training'),
  deleteTestingDataset: () => api.delete('/admin/datasets/testing'),
  deleteSampleSubmissionDataset: () => api.delete('/admin/datasets/sample-submission'),
  
  // Config
  updateConfig: (key, value) => api.put('/admin/config', { key, value }),
  getConfig: (key) => api.get(`/admin/config/${key}`),
  getAllConfig: () => api.get('/admin/config'),
  
  // Competition Info
  getCompetitionInfo: () => api.get('/competition'),
  updateCompetitionInfo: (data) => api.put('/competition', data),
  
  // Submissions
  getAllSubmissions: () => api.get('/admin/submissions'),
  
  // Email
  sendEmailToAll: (subject, message, files = []) => {
    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('message', message);
    files.forEach(file => {
      formData.append('attachments', file);
    });
    const token = localStorage.getItem('token');
    return api.post('/admin/send-email/all', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
  },
  sendEmailToTeam: (userId, subject, message, files = []) => {
    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('message', message);
    files.forEach(file => {
      formData.append('attachments', file);
    });
    const token = localStorage.getItem('token');
    return api.post(`/admin/send-email/team/${userId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
  },
  getUsersEmails: () => api.get('/admin/users/emails'),
  
  // Send credentials to all teams
  sendCredentials: (adminPassword) => api.post('/admin/send-credentials', { adminPassword }),
  
  // Send credentials to a specific team
  sendCredentialsToTeam: (userId) => api.post(`/admin/send-credentials/team/${userId}`),
  
  // Delete all data
  deleteAllData: () => api.delete('/admin/delete-all-data')
};

// Submission API
export const submissionAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    return api.post('/submissions/upload', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    });
  },
  getMySubmissions: () => api.get('/submissions'),
  getSubmission: (id) => api.get(`/submissions/${id}`),
  getBestSubmission: () => api.get('/submissions/user/best'),
  getStatus: () => api.get('/submissions/status'),
  deleteSubmission: (id) => api.delete(`/submissions/${id}`),
  updateComments: (id, comments) => api.put(`/submissions/${id}/comments`, { comments })
};

// Leaderboard API
export const leaderboardAPI = {
  getLeaderboard: (limit = 50, includeRank = false) => 
    api.get('/leaderboard', { params: { limit, includeRank } })
};

export default api;
