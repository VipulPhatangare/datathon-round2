import { useState, useEffect } from 'react';
import { adminAPI } from '../api';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';

function AdminDashboard() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('teams');
  const [users, setUsers] = useState([]);
  const [answerCSV, setAnswerCSV] = useState(null);
  const [datasets, setDatasets] = useState({
    training: null,
    testing: null,
    sampleSubmission: null
  });
  const [config, setConfig] = useState(null);
  const [competition, setCompetition] = useState({
    title: '',
    description: '',
    evaluationCriteria: '',
    rules: [''],
    prizes: [{ position: '', reward: '' }],
    timeline: {
      startDate: '',
      endDate: '',
      finalSubmissionDate: ''
    },
    dataDescription: {
      overview: '',
      files: [{ name: '', description: '' }],
      columns: [{ name: '', type: '', description: '' }]
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Email state
  const [emailForm, setEmailForm] = useState({
    recipient: 'all',
    selectedUserId: '',
    subject: '',
    message: '',
    attachments: []
  });
  const [emailUsers, setEmailUsers] = useState([]);

  // Credentials modal state
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    password: '',
    loading: false
  });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmColor: 'primary',
    loadingText: 'Processing...',
    action: null
  });

  // CSV upload form state
  const [csvForm, setCsvForm] = useState({
    idColumn: 'row_id',
    labelColumn: 'label',
    publicPercentage: 50
  });

  // User form state
  const [userForm, setUserForm] = useState({
    teamName: '',
    leaderName: '',
    leaderEmail: '',
    password: '',
    memberName: '',
    memberEmail: ''
  });
  const [addMember, setAddMember] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  // Fetch data on initial mount based on active tab
  useEffect(() => {
    if (activeTab === 'teams') {
      fetchUsers();
    } else if (activeTab === 'answer-csv') {
      fetchAnswerCSV();
    } else if (activeTab === 'datasets') {
      fetchDatasets();
    } else if (activeTab === 'config') {
      fetchConfig();
    } else if (activeTab === 'competition') {
      fetchCompetitionInfo();
    } else if (activeTab === 'email') {
      fetchEmailUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data.users);
    } catch (err) {
      setError('Failed to load users');
    }
  };

  const fetchAnswerCSV = async () => {
    try {
      const response = await adminAPI.getAnswerCSV();
      setAnswerCSV(response.data.answerCSV);
      setError('');
    } catch (err) {
      console.error('Failed to load answer CSV:', err.message);
      setError('');
      setAnswerCSV(null);
    }
  };

  const fetchDatasets = async () => {
    try {
      const response = await adminAPI.getDatasets();
      setDatasets(response.data);
    } catch (err) {
      setError('Failed to load datasets');
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await adminAPI.getAllConfig();
      setConfig({ 
        defaultUploadLimit: response.data.defaultUploadLimit || 15,
        competitionStartTime: response.data.competitionStartTime ? new Date(response.data.competitionStartTime).toISOString().slice(0, 16) : '',
        competitionEndTime: response.data.competitionEndTime ? new Date(response.data.competitionEndTime).toISOString().slice(0, 16) : '',
        problemType: response.data.problemType || 'classification',
        displayMetrics: response.data.displayMetrics || ['accuracy', 'f1', 'macro_f1', 'precision', 'recall'],
        leaderboardMetric: response.data.leaderboardMetric || 'accuracy',
        enableUserPrivateLeaderboard: response.data.enableUserPrivateLeaderboard || false
      });
    } catch (err) {
      setError('Failed to load configuration');
    }
  };

  const fetchEmailUsers = async () => {
    try {
      const response = await adminAPI.getUsersEmails();
      setEmailUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
    }
  };

  const fetchCompetitionInfo = async () => {
    try {
      const response = await adminAPI.getCompetitionInfo();
      const data = response.data;
      setCompetition({
        title: data.title || '',
        description: data.description || '',
        evaluationCriteria: data.evaluationCriteria || '',
        rules: data.rules && data.rules.length > 0 ? data.rules : [''],
        prizes: data.prizes && data.prizes.length > 0 ? data.prizes : [{ position: '', reward: '' }],
        timeline: {
          startDate: data.timeline?.startDate || '',
          endDate: data.timeline?.endDate || '',
          finalSubmissionDate: data.timeline?.finalSubmissionDate || ''
        },
        dataDescription: {
          overview: data.dataDescription?.overview || '',
          files: data.dataDescription?.files && data.dataDescription.files.length > 0 
            ? data.dataDescription.files 
            : [{ name: '', description: '' }],
          columns: data.dataDescription?.columns && data.dataDescription.columns.length > 0 
            ? data.dataDescription.columns 
            : [{ name: '', type: '', description: '' }]
        }
      });
    } catch (err) {
      setError('Failed to load competition info');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userData = {
        teamName: userForm.teamName,
        leaderName: userForm.leaderName,
        leaderEmail: userForm.leaderEmail,
        password: userForm.password,
        memberName: addMember ? userForm.memberName : null,
        memberEmail: addMember ? userForm.memberEmail : null
      };
      
      await adminAPI.createUser(userData);
      setSuccess('Team created successfully');
      setUserForm({ teamName: '', leaderName: '', leaderEmail: '', password: '', memberName: '', memberEmail: '' });
      setAddMember(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!emailForm.subject || !emailForm.message) {
        setError('Subject and message are required');
        setLoading(false);
        return;
      }

      if (emailForm.recipient === 'all') {
        await adminAPI.sendEmailToAll(emailForm.subject, emailForm.message, emailForm.attachments);
        setSuccess('Email sent successfully to all teams');
      } else {
        if (!emailForm.selectedUserId) {
          setError('Please select a team');
          setLoading(false);
          return;
        }
        await adminAPI.sendEmailToTeam(emailForm.selectedUserId, emailForm.subject, emailForm.message, emailForm.attachments);
        setSuccess('Email sent successfully to selected team');
      }

      setEmailForm({ recipient: 'all', selectedUserId: '', subject: '', message: '', attachments: [] });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const password = credentialsModal.password;
    if (!password) {
      setError('Please enter admin password');
      return;
    }

    setCredentialsModal(prev => ({ ...prev, loading: true }));

    try {
      const response = await adminAPI.sendCredentials(password);
      const { successCount, failedCount, results } = response.data;
      
      setSuccess(`Credentials sent! Success: ${successCount}, Failed: ${failedCount}`);
      
      // Show detailed results
      if (results && results.length > 0) {
        const failedTeams = results.filter(r => !r.success);
        if (failedTeams.length > 0) {
          console.log('Failed to send to:', failedTeams);
        }
      }
      
      setCredentialsModal({ isOpen: false, password: '', loading: false });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send credentials');
      setCredentialsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userData = {
        teamName: userForm.teamName,
        leaderName: userForm.leaderName,
        leaderEmail: userForm.leaderEmail,
        password: userForm.password || undefined,
        memberName: addMember ? userForm.memberName : null,
        memberEmail: addMember ? userForm.memberEmail : null
      };
      
      await adminAPI.updateUser(editingUserId, userData);
      setSuccess('Team updated successfully');
      setEditingUserId(null);
      setUserForm({ teamName: '', leaderName: '', leaderEmail: '', password: '', memberName: '', memberEmail: '' });
      setAddMember(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  const startEditUser = (user) => {
    setEditingUserId(user._id);
    setUserForm({
      teamName: user.teamName,
      leaderName: user.leaderName,
      leaderEmail: user.leaderEmail,
      password: '', // Don't populate password
      memberName: user.memberName || '',
      memberEmail: user.memberEmail || ''
    });
    setAddMember(!!user.memberName || !!user.memberEmail);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setUserForm({ teamName: '', leaderName: '', leaderEmail: '', password: '', memberName: '', memberEmail: '' });
    setAddMember(false);
  };

  const handleSendCredentialsToTeam = async (userId, teamName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Send Credentials',
      message: `Send login credentials to ${teamName}?`,
      confirmText: 'Send',
      confirmColor: 'primary',
      loadingText: 'Sending...',
      action: async () => {
        try {
      setLoading(true);
      setError('');
      setSuccess('');
      
        const response = await adminAPI.sendCredentialsToTeam(userId);
        toast.success(`Credentials sent successfully to ${teamName}!`);
      } catch (err) {
        toast.error(err.response?.data?.error || `Failed to send credentials to ${teamName}`);
      } finally {
        setLoading(false);
        setConfirmModal({ isOpen: false, title: '', message: '', action: null });
      }
      }
    });
  };

  const handleDeleteUser = async (userId) => {
    const user = users.find(u => u._id === userId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Team',
      message: `Are you sure you want to delete ${user?.teamName || 'this team'}? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmColor: 'danger',
      loadingText: 'Deleting...',
      action: async () => {
        try {
          await adminAPI.deleteUser(userId);
          toast.success('Team deleted successfully');
          fetchUsers();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to delete team');
        } finally {
          setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Confirm', confirmColor: 'primary', loadingText: 'Processing...', action: null });
        }
      }
    });
  };

  const [uploadingAnswerCSV, setUploadingAnswerCSV] = useState(false);
  const [uploadingDataset, setUploadingDataset] = useState({ training: false, testing: false, sample: false });

  const handleUploadAnswerCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadingAnswerCSV(true);

    try {
      const response = await adminAPI.uploadAnswerCSV(
        file, 
        csvForm.idColumn, 
        csvForm.labelColumn,
        csvForm.publicPercentage
      );
      setSuccess(`Answer CSV uploaded successfully! ${response.data.rowCount} total rows (${response.data.publicCount} public, ${response.data.privateCount} private).`);
      fetchAnswerCSV();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload answer CSV');
    } finally {
      setUploadingAnswerCSV(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleUploadDataset = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadingDataset({ ...uploadingDataset, [type]: true });

    try {
      let response;
      let datasetName;
      
      switch(type) {
        case 'training':
          response = await adminAPI.uploadTrainingDataset(file);
          datasetName = 'Training';
          break;
        case 'testing':
          response = await adminAPI.uploadTestingDataset(file);
          datasetName = 'Testing';
          break;
        case 'sample':
          response = await adminAPI.uploadSampleSubmissionDataset(file);
          datasetName = 'Sample Submission';
          break;
      }
      
      setSuccess(`${datasetName} dataset uploaded successfully!`);
      fetchDatasets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload dataset');
    } finally {
      setUploadingDataset({ ...uploadingDataset, [type]: false });
      e.target.value = ''; // Reset file input
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Update all config values
      await adminAPI.updateConfig('defaultUploadLimit', parseInt(config.defaultUploadLimit));
      
      if (config.competitionStartTime) {
        await adminAPI.updateConfig('competitionStartTime', new Date(config.competitionStartTime).toISOString());
      } else {
        await adminAPI.updateConfig('competitionStartTime', null);
      }
      
      if (config.competitionEndTime) {
        await adminAPI.updateConfig('competitionEndTime', new Date(config.competitionEndTime).toISOString());
      } else {
        await adminAPI.updateConfig('competitionEndTime', null);
      }

      // Update problem type and metrics config
      await adminAPI.updateConfig('problemType', config.problemType);
      await adminAPI.updateConfig('displayMetrics', config.displayMetrics);
      await adminAPI.updateConfig('leaderboardMetric', config.leaderboardMetric);
      await adminAPI.updateConfig('enableUserPrivateLeaderboard', config.enableUserPrivateLeaderboard);
      
      setSuccess('Configuration updated successfully');
    } catch (err) {
      console.error('Config update error:', err);
      setError(err.response?.data?.error || 'Failed to update configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    const confirmation = prompt('This will delete all users (except admins), submissions, and answer CSV. Type "DELETE" to confirm:');
    
    if (confirmation !== 'DELETE') {
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await adminAPI.deleteAllData();
      setSuccess(`Data deleted successfully! ${response.data.deletedCounts.users} users, ${response.data.deletedCounts.submissions} submissions, ${response.data.deletedCounts.answerCSV} answer CSV deleted.`);
      // Refresh data
      if (activeTab === 'teams') fetchUsers();
      if (activeTab === 'answer-csv') fetchAnswerCSV();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnswerCSV = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Answer CSV',
      message: 'Are you sure you want to delete the answer CSV? This cannot be undone.',
      action: 'deleteAnswerCSV'
    });
  };

  const handleDeleteDataset = (type) => {
    let datasetName;
    switch(type) {
      case 'training':
        datasetName = 'Training';
        break;
      case 'testing':
        datasetName = 'Testing';
        break;
      case 'sample':
        datasetName = 'Sample Submission';
        break;
    }

    setConfirmModal({
      isOpen: true,
      title: `Delete ${datasetName} Dataset`,
      message: `Are you sure you want to delete the ${datasetName} dataset? This cannot be undone.`,
      action: 'deleteDataset',
      datasetType: type
    });
  };

  const executeDelete = async () => {
    const { action, datasetType } = confirmModal;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (action === 'deleteAnswerCSV') {
        await adminAPI.deleteAnswerCSV();
        setSuccess('Answer CSV deleted successfully');
        fetchAnswerCSV();
      } else if (action === 'deleteDataset') {
        switch(datasetType) {
          case 'training':
            await adminAPI.deleteTrainingDataset();
            setSuccess('Training dataset deleted successfully');
            break;
          case 'testing':
            await adminAPI.deleteTestingDataset();
            setSuccess('Testing dataset deleted successfully');
            break;
          case 'sample':
            await adminAPI.deleteSampleSubmissionDataset();
            setSuccess('Sample submission dataset deleted successfully');
            break;
        }
        fetchDatasets();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    } finally {
      setLoading(false);
      setConfirmModal({ isOpen: false, title: '', message: '', action: null });
    }
  };

  const handleUpdateCompetition = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await adminAPI.updateCompetitionInfo(competition);
      setSuccess('Competition information updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update competition info');
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    setCompetition({ ...competition, rules: [...competition.rules, ''] });
  };

  const removeRule = (index) => {
    const newRules = competition.rules.filter((_, i) => i !== index);
    setCompetition({ ...competition, rules: newRules });
  };

  const updateRule = (index, value) => {
    const newRules = [...competition.rules];
    newRules[index] = value;
    setCompetition({ ...competition, rules: newRules });
  };

  const addPrize = () => {
    setCompetition({ ...competition, prizes: [...competition.prizes, { position: '', reward: '' }] });
  };

  const removePrize = (index) => {
    const newPrizes = competition.prizes.filter((_, i) => i !== index);
    setCompetition({ ...competition, prizes: newPrizes });
  };

  const updatePrize = (index, field, value) => {
    const newPrizes = [...competition.prizes];
    newPrizes[index][field] = value;
    setCompetition({ ...competition, prizes: newPrizes });
  };

  const addFile = () => {
    setCompetition({ 
      ...competition, 
      dataDescription: {
        ...competition.dataDescription,
        files: [...competition.dataDescription.files, { name: '', description: '' }]
      }
    });
  };

  const removeFile = (index) => {
    const newFiles = competition.dataDescription.files.filter((_, i) => i !== index);
    setCompetition({ 
      ...competition, 
      dataDescription: { ...competition.dataDescription, files: newFiles }
    });
  };

  const updateFile = (index, field, value) => {
    const newFiles = [...competition.dataDescription.files];
    newFiles[index][field] = value;
    setCompetition({ 
      ...competition, 
      dataDescription: { ...competition.dataDescription, files: newFiles }
    });
  };

  const addColumn = () => {
    setCompetition({ 
      ...competition, 
      dataDescription: {
        ...competition.dataDescription,
        columns: [...competition.dataDescription.columns, { name: '', type: '', description: '' }]
      }
    });
  };

  const removeColumn = (index) => {
    const newColumns = competition.dataDescription.columns.filter((_, i) => i !== index);
    setCompetition({ 
      ...competition, 
      dataDescription: { ...competition.dataDescription, columns: newColumns }
    });
  };

  const updateColumn = (index, field, value) => {
    const newColumns = [...competition.dataDescription.columns];
    newColumns[index][field] = value;
    setCompetition({ 
      ...competition, 
      dataDescription: { ...competition.dataDescription, columns: newColumns }
    });
  };

  return (
    <div className="main-content">
      <div className="card">
        <h1 className="card-title">Admin Dashboard</h1>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            Manage Teams
          </button>
          <button 
            className={`tab ${activeTab === 'answer-csv' ? 'active' : ''}`}
            onClick={() => setActiveTab('answer-csv')}
          >
            Answer CSV
          </button>
          <button 
            className={`tab ${activeTab === 'datasets' ? 'active' : ''}`}
            onClick={() => setActiveTab('datasets')}
          >
            Datasets
          </button>
          <button 
            className={`tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Configuration
          </button>
          <button 
            className={`tab ${activeTab === 'competition' ? 'active' : ''}`}
            onClick={() => setActiveTab('competition')}
          >
            Competition Info
          </button>
          <button 
            className={`tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            Send Email
          </button>
        </div>

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div>
            <h2 className="card-subtitle">
              {editingUserId ? 'Edit Team' : 'Create New Team'}
            </h2>
            
            <form onSubmit={editingUserId ? handleUpdateUser : handleCreateUser}>
              <div className="form-group">
                <label className="form-label">Team Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={userForm.teamName}
                  onChange={(e) => setUserForm({ ...userForm, teamName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Leader Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={userForm.leaderName}
                  onChange={(e) => setUserForm({ ...userForm, leaderName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Leader Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={userForm.leaderEmail}
                  onChange={(e) => setUserForm({ 
                    ...userForm, 
                    leaderEmail: e.target.value,
                    password: editingUserId ? userForm.password : e.target.value
                  })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Password {editingUserId && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  required={!editingUserId}
                />
              </div>

              {!addMember ? (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setAddMember(true)}
                  style={{ marginBottom: '1rem' }}
                >
                  + Add Team Member (Optional)
                </button>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Member Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={userForm.memberName}
                      onChange={(e) => setUserForm({ ...userForm, memberName: e.target.value })}
                      placeholder="Enter member name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Member Email</label>
                    <div className="flex gap-1">
                      <input
                        type="email"
                        className="form-input"
                        value={userForm.memberEmail}
                        onChange={(e) => setUserForm({ ...userForm, memberEmail: e.target.value })}
                        placeholder="Enter member email"
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-danger"
                        onClick={() => {
                          setAddMember(false);
                          setUserForm({ ...userForm, memberName: '', memberEmail: '' });
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-1">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {editingUserId ? 'Update Team' : 'Create Team'}
                </button>
                {editingUserId && (
                  <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <h2 className="card-subtitle mt-2">All Teams</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Team Name</th>
                    <th>Leader Name</th>
                    <th>Leader Email</th>
                    <th>Member Name</th>
                    <th>Member Email</th>
                    <th>Submissions</th>
                    <th>Best Accuracy</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>{user.teamName}</td>
                      <td>{user.leaderName}</td>
                      <td>{user.leaderEmail}</td>
                      <td>{user.memberName || '-'}</td>
                      <td>{user.memberEmail || '-'}</td>
                      <td>{user.submissionCount}</td>
                      <td>
                        {user.bestAccuracy 
                          ? `${(user.bestAccuracy * 100).toFixed(2)}%`
                          : 'N/A'
                        }
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSendCredentialsToTeam(user._id, user.teamName)}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                            disabled={loading}
                          >
                            📧 Send Credentials
                          </button>
                          <button
                            onClick={() => startEditUser(user)}
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="btn btn-danger"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Answer CSV Tab */}
        {activeTab === 'answer-csv' && (
          <div>
            <h2 className="card-subtitle">Upload Canonical Answer CSV</h2>
            
            <div className="alert alert-info">
              <strong>Note:</strong> Uploading a new answer CSV will replace the current one.
              Specify the column names that contain the ID and Label data.
            </div>

            {answerCSV && (
              <div className="alert alert-success">
                <strong>Current Answer CSV:</strong>
                <br />
                Filename: {answerCSV.filename}
                <br />
                ID Column: <strong>{answerCSV.idColumn}</strong>
                <br />
                Label Column: <strong>{answerCSV.labelColumn}</strong>
                <br />
                Uploaded by: {answerCSV.uploadedBy?.email}
                <br />
                <strong>Total Rows:</strong> {answerCSV.totalRows}
                <br />
                <strong style={{ color: '#27ae60' }}>Public Rows:</strong> {answerCSV.publicRows} ({answerCSV.publicPercentage}%)
                <br />
                <strong style={{ color: '#e74c3c' }}>Private Rows:</strong> {answerCSV.privateRows} ({100 - answerCSV.publicPercentage}%)
                <br />
                Date: {new Date(answerCSV.uploadedAt).toLocaleString()}
                <br />
                <button 
                  type="button"
                  onClick={handleDeleteAnswerCSV}
                  className="btn btn-danger"
                  style={{ marginTop: '0.75rem', display: 'block' }}
                  disabled={loading}
                >
                  Delete Answer CSV
                </button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">ID Column Name *</label>
              <input
                type="text"
                className="form-input"
                value={csvForm.idColumn}
                onChange={(e) => setCsvForm({ ...csvForm, idColumn: e.target.value })}
                placeholder="e.g., row_id, id, student_id"
                required
              />
              <small className="text-muted">
                The name of the column that contains unique IDs
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Label Column Name *</label>
              <input
                type="text"
                className="form-input"
                value={csvForm.labelColumn}
                onChange={(e) => setCsvForm({ ...csvForm, labelColumn: e.target.value })}
                placeholder="e.g., label, class, category"
                required
              />
              <small className="text-muted">
                The name of the column that contains the labels/predictions
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Public Data Percentage</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                value={csvForm.publicPercentage}
                onChange={(e) => {
                  let val = parseInt(e.target.value);
                  if (isNaN(val)) val = 50;
                  if (val < 0) val = 0;
                  if (val > 100) val = 100;
                  setCsvForm({ ...csvForm, publicPercentage: val });
                }}
                placeholder="Enter percentage (0-100)"
              />
              <small className="text-muted">
                Percentage of data rows to be visible on public leaderboard. <strong style={{ color: '#27ae60' }}>Public {csvForm.publicPercentage}%</strong> | <strong style={{ color: '#e74c3c' }}>Private {100 - csvForm.publicPercentage}%</strong>
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleUploadAnswerCSV}
                className="form-input"
                disabled={uploadingAnswerCSV}
              />
              {uploadingAnswerCSV && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f4f8', borderRadius: '8px', textAlign: 'center' }}>
                  <div className="spinner" style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid #3498db', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <p style={{ marginTop: '0.5rem', color: '#2980b9', fontWeight: 'bold' }}>Uploading Answer CSV...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Datasets Tab */}
        {activeTab === 'datasets' && (
          <div>
            <h2 className="card-subtitle">Dataset Management</h2>
            
            <div className="alert alert-info">
              <strong>Note:</strong> Upload the competition datasets here. These files will be available for participants to download.
            </div>

            {/* Training Dataset */}
            <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Training Dataset</h3>
              
              {datasets.training ? (
                <div className="alert alert-success">
                  <strong>Current File:</strong> {datasets.training.filename}
                  <br />
                  Size: {(datasets.training.size / 1024).toFixed(2)} KB
                  <br />
                  Uploaded: {new Date(datasets.training.uploadedAt).toLocaleString()}
                  <br />
                  {datasets.training.columns && datasets.training.columns.length > 0 && (
                    <>
                      <strong>Columns ({datasets.training.columns.length}):</strong>
                      <br />
                      <div style={{ backgroundColor: '#ecf0f1', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', wordBreak: 'break-word' }}>
                        {datasets.training.columns.join(', ')}
                      </div>
                      <br />
                    </>
                  )}
                  <button 
                    type="button"
                    onClick={() => handleDeleteDataset('training')}
                    className="btn btn-danger"
                    style={{ marginTop: '0.75rem', display: 'block' }}
                    disabled={loading}
                  >
                    Delete Training Dataset
                  </button>
                </div>
              ) : (
                <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>No training dataset uploaded yet.</p>
              )}

              <div className="form-group">
                <label className="form-label">Upload Training Dataset</label>
                <input
                  type="file"
                  accept=".csv,.zip,.txt,.json"
                  onChange={(e) => handleUploadDataset(e, 'training')}
                  className="form-input"
                  disabled={uploadingDataset.training}
                />
                {uploadingDataset.training && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f4f8', borderRadius: '8px', textAlign: 'center' }}>
                    <div className="spinner" style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid #3498db', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '0.5rem', color: '#2980b9', fontWeight: 'bold' }}>Uploading Training Dataset...</p>
                  </div>
                )}
                <small className="text-muted">
                  Accepted formats: CSV, ZIP, TXT, JSON
                </small>
              </div>
            </div>

            {/* Testing Dataset */}
            <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Testing Dataset</h3>
              
              {datasets.testing ? (
                <div className="alert alert-success">
                  <strong>Current File:</strong> {datasets.testing.filename}
                  <br />
                  Size: {(datasets.testing.size / 1024).toFixed(2)} KB
                  <br />
                  Uploaded: {new Date(datasets.testing.uploadedAt).toLocaleString()}
                  <br />
                  {datasets.testing.columns && datasets.testing.columns.length > 0 && (
                    <>
                      <strong>Columns ({datasets.testing.columns.length}):</strong>
                      <br />
                      <div style={{ backgroundColor: '#ecf0f1', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', wordBreak: 'break-word' }}>
                        {datasets.testing.columns.join(', ')}
                      </div>
                      <br />
                    </>
                  )}
                  <button 
                    type="button"
                    onClick={() => handleDeleteDataset('testing')}
                    className="btn btn-danger"
                    style={{ marginTop: '0.75rem', display: 'block' }}
                    disabled={loading}
                  >
                    Delete Testing Dataset
                  </button>
                </div>
              ) : (
                <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>No testing dataset uploaded yet.</p>
              )}

              <div className="form-group">
                <label className="form-label">Upload Testing Dataset</label>
                <input
                  type="file"
                  accept=".csv,.zip,.txt,.json"
                  onChange={(e) => handleUploadDataset(e, 'testing')}
                  className="form-input"
                  disabled={uploadingDataset.testing}
                />
                {uploadingDataset.testing && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f4f8', borderRadius: '8px', textAlign: 'center' }}>
                    <div className="spinner" style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid #3498db', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '0.5rem', color: '#2980b9', fontWeight: 'bold' }}>Uploading Testing Dataset...</p>
                  </div>
                )}
                <small className="text-muted">
                  Accepted formats: CSV, ZIP, TXT, JSON
                </small>
              </div>
            </div>

            {/* Sample Submission Dataset */}
            <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Sample Submission</h3>
              
              {datasets.sampleSubmission ? (
                <div className="alert alert-success">
                  <strong>Current File:</strong> {datasets.sampleSubmission.filename}
                  <br />
                  Size: {(datasets.sampleSubmission.size / 1024).toFixed(2)} KB
                  <br />
                  Uploaded: {new Date(datasets.sampleSubmission.uploadedAt).toLocaleString()}
                  <br />
                  {datasets.sampleSubmission.columns && datasets.sampleSubmission.columns.length > 0 && (
                    <>
                      <strong>Columns ({datasets.sampleSubmission.columns.length}):</strong>
                      <br />
                      <div style={{ backgroundColor: '#ecf0f1', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', wordBreak: 'break-word' }}>
                        {datasets.sampleSubmission.columns.join(', ')}
                      </div>
                      <br />
                    </>
                  )}
                  <button 
                    type="button"
                    onClick={() => handleDeleteDataset('sample')}
                    className="btn btn-danger"
                    style={{ marginTop: '0.75rem', display: 'block' }}
                    disabled={loading}
                  >
                    Delete Sample Submission
                  </button>
                </div>
              ) : (
                <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>No sample submission uploaded yet.</p>
              )}

              <div className="form-group">
                <label className="form-label">Upload Sample Submission</label>
                <input
                  type="file"
                  accept=".csv,.zip,.txt,.json"
                  onChange={(e) => handleUploadDataset(e, 'sample')}
                  className="form-input"
                  disabled={uploadingDataset.sample}
                />
                {uploadingDataset.sample && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f4f8', borderRadius: '8px', textAlign: 'center' }}>
                    <div className="spinner" style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid #3498db', borderTop: '3px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ marginTop: '0.5rem', color: '#2980b9', fontWeight: 'bold' }}>Uploading Sample Submission...</p>
                  </div>
                )}
                <small className="text-muted">
                  Accepted formats: CSV, ZIP, TXT, JSON
                </small>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div>
            <h2 className="card-subtitle">Global Configuration</h2>
            
            {!config ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="loading">Loading configuration...</div>
              </div>
            ) : (
            <>
            <form onSubmit={handleUpdateConfig}>
              <div className="form-group">
                <label className="form-label">Default Upload Limit</label>
                <input
                  type="number"
                  className="form-input"
                  value={config.defaultUploadLimit}
                  onChange={(e) => setConfig({ ...config, defaultUploadLimit: parseInt(e.target.value) })}
                  min="1"
                  required
                />
                <small className="text-muted">
                  This is the default number of submissions allowed per user.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Competition Start Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={config.competitionStartTime}
                  onChange={(e) => setConfig({ ...config, competitionStartTime: e.target.value })}
                />
                <small className="text-muted">
                  Users cannot submit before this time. Leave empty for no restriction.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Competition End Time</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={config.competitionEndTime}
                  onChange={(e) => setConfig({ ...config, competitionEndTime: e.target.value })}
                />
                <small className="text-muted">
                  Users cannot submit after this time. Leave empty for no restriction.
                </small>
              </div>

              {/* Problem Type Section */}
              <div style={{ marginTop: '2rem', padding: '1.5rem', border: '2px solid #3498db', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '1rem' }}>Problem Type & Metrics</h3>
                
                <div className="form-group">
                  <label className="form-label">Problem Type</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="problemType"
                        value="classification"
                        checked={config.problemType === 'classification'}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setConfig({ 
                            ...config, 
                            problemType: newType,
                            displayMetrics: newType === 'classification' 
                              ? ['accuracy', 'f1', 'precision', 'recall']
                              : ['rmse', 'mae', 'r2', 'mape'],
                            leaderboardMetric: newType === 'classification' ? 'accuracy' : 'rmse'
                          });
                        }}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <span style={{ fontWeight: config.problemType === 'classification' ? 'bold' : 'normal' }}>
                        Classification
                      </span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="problemType"
                        value="regression"
                        checked={config.problemType === 'regression'}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setConfig({ 
                            ...config, 
                            problemType: newType,
                            displayMetrics: newType === 'classification' 
                              ? ['accuracy', 'f1', 'macro_f1', 'precision', 'recall']
                              : ['rmse', 'mae', 'r2', 'mape'],
                            leaderboardMetric: newType === 'classification' ? 'accuracy' : 'rmse'
                          });
                        }}
                        style={{ marginRight: '0.5rem' }}
                      />
                      <span style={{ fontWeight: config.problemType === 'regression' ? 'bold' : 'normal' }}>
                        Regression
                      </span>
                    </label>
                  </div>
                  <small className="text-muted">
                    Choose the type of machine learning problem for this competition.
                  </small>
                </div>

                {/* Display Metrics Selection */}
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label" style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Display Metrics (User Results Page)
                  </label>
                  <small className="text-muted" style={{ display: 'block', marginBottom: '1rem' }}>
                    Select which metrics to show to users on their submission results page.
                  </small>
                  
                  {config.problemType === 'classification' ? (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '0.75rem',
                      padding: '1rem',
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px'
                    }}>
                      {['accuracy', 'f1', 'macro_f1', 'precision', 'recall'].map(metric => (
                        <label 
                          key={metric} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: 'pointer',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: config.displayMetrics.includes(metric) ? '#e3f2fd' : '#f8f9fa',
                            border: config.displayMetrics.includes(metric) ? '2px solid #2196f3' : '1px solid #dee2e6',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease',
                            fontWeight: config.displayMetrics.includes(metric) ? '600' : 'normal'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={config.displayMetrics.includes(metric)}
                            onChange={(e) => {
                              const newMetrics = e.target.checked
                                ? [...config.displayMetrics, metric]
                                : config.displayMetrics.filter(m => m !== metric);
                              setConfig({ ...config, displayMetrics: newMetrics });
                            }}
                            style={{ 
                              marginRight: '0.5rem',
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer'
                            }}
                          />
                          <span style={{ fontSize: '0.95rem' }}>
                            {metric === 'macro_f1' ? 'Macro F1 Score' : 
                             metric === 'f1' ? 'F1 Score' :
                             metric.charAt(0).toUpperCase() + metric.slice(1)}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.75rem',
                      padding: '1rem',
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '6px'
                    }}>
                      {['mae', 'mse', 'rmse', 'r2', 'mape'].map(metric => (
                        <label 
                          key={metric} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            cursor: 'pointer',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: config.displayMetrics.includes(metric) ? '#e3f2fd' : '#f8f9fa',
                            border: config.displayMetrics.includes(metric) ? '2px solid #2196f3' : '1px solid #dee2e6',
                            borderRadius: '4px',
                            transition: 'all 0.2s ease',
                            fontWeight: config.displayMetrics.includes(metric) ? '600' : 'normal'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={config.displayMetrics.includes(metric)}
                            onChange={(e) => {
                              const newMetrics = e.target.checked
                                ? [...config.displayMetrics, metric]
                                : config.displayMetrics.filter(m => m !== metric);
                              setConfig({ ...config, displayMetrics: newMetrics });
                            }}
                            style={{ 
                              marginRight: '0.5rem',
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer'
                            }}
                          />
                          <span style={{ fontSize: '0.95rem' }}>
                            {metric === 'mae' ? 'MAE (Mean Absolute Error)' :
                             metric === 'mse' ? 'MSE (Mean Squared Error)' :
                             metric === 'rmse' ? 'RMSE (Root Mean Squared Error)' :
                             metric === 'r2' ? 'R² (R-squared)' :
                             'MAPE (Mean Absolute Percentage Error)'}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Leaderboard Metric Selection */}
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label" style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    Leaderboard Ranking Metric
                  </label>
                  <select
                    className="form-input"
                    value={config.leaderboardMetric}
                    onChange={(e) => setConfig({ ...config, leaderboardMetric: e.target.value })}
                    style={{ 
                      fontSize: '0.95rem',
                      padding: '0.6rem',
                      fontWeight: '500'
                    }}
                  >
                    {config.problemType === 'classification' ? (
                      <>
                        <option value="accuracy">Accuracy</option>
                        <option value="f1">F1 Score</option>
                        <option value="macro_f1">Macro F1 Score</option>
                        <option value="precision">Precision</option>
                        <option value="recall">Recall</option>
                      </>
                    ) : (
                      <>
                        <option value="rmse">RMSE (lower is better)</option>
                        <option value="mae">MAE (lower is better)</option>
                        <option value="mse">MSE (lower is better)</option>
                        <option value="r2">R² (higher is better)</option>
                        <option value="mape">MAPE (lower is better)</option>
                      </>
                    )}
                  </select>
                  <small className="text-muted">
                    This metric will be used to rank teams on the leaderboard.
                  </small>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
                Update Configuration
              </button>
            </form>

            {/* Quick Actions During Competition */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', border: '2px solid #3498db', borderRadius: '8px', backgroundColor: '#ecf0f1' }}>
              <h3 style={{ color: '#3498db', marginTop: 0, marginBottom: '1.5rem' }}>Quick Actions (Modify During Competition)</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Increase Submission Limit */}
                <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #3498db' }}>
                  <h4 style={{ marginTop: 0, color: '#2980b9' }}>Increase Submission Limit</h4>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Current limit: <strong>{config.defaultUploadLimit} submissions</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="number"
                      min="1"
                      placeholder="New limit"
                      id="newSubmissionLimit"
                      className="form-input"
                      style={{ flex: 1 }}
                      defaultValue={config.defaultUploadLimit}
                    />
                    <button
                      onClick={() => {
                        const newLimit = parseInt(document.getElementById('newSubmissionLimit').value);
                        if (newLimit > 0) {
                          setConfig({ ...config, defaultUploadLimit: newLimit });
                          handleUpdateConfig({ preventDefault: () => {}, target: { onsubmit: null } });
                        }
                      }}
                      className="btn btn-success"
                      disabled={loading}
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Extend Deadline */}
                <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e74c3c' }}>
                  <h4 style={{ marginTop: 0, color: '#c0392b' }}>⏱️ Extend Deadline</h4>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Current deadline: <strong>{config.competitionEndTime ? new Date(config.competitionEndTime).toLocaleString() : 'Not set'}</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexDirection: 'column' }}>
                    <input
                      type="datetime-local"
                      id="newDeadline"
                      className="form-input"
                      defaultValue={config.competitionEndTime}
                    />
                    <button
                      onClick={() => {
                        const newDeadline = document.getElementById('newDeadline').value;
                        if (newDeadline) {
                          setConfig({ ...config, competitionEndTime: newDeadline });
                          setTimeout(() => {
                            handleUpdateConfig({ preventDefault: () => {}, target: { onsubmit: null } });
                          }, 0);
                        }
                      }}
                      className="btn btn-warning"
                      disabled={loading}
                    >
                      Extend
                    </button>
                  </div>
                </div>

                {/* Add Hours to Deadline */}
                <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #27ae60' }}>
                  <h4 style={{ marginTop: 0, color: '#1e8449' }}>⏰ Add Hours to Deadline</h4>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                    Quick extend by hours
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {[1, 2, 6].map(hours => (
                      <button
                        key={hours}
                        onClick={() => {
                          const currentEnd = new Date(config.competitionEndTime);
                          currentEnd.setHours(currentEnd.getHours() + hours);
                          const newDate = currentEnd.toISOString().slice(0, 16);
                          setConfig({ ...config, competitionEndTime: newDate });
                          setTimeout(() => {
                            handleUpdateConfig({ preventDefault: () => {}, target: { onsubmit: null } });
                          }, 0);
                        }}
                        className="btn btn-secondary"
                        disabled={loading}
                        style={{ padding: '0.5rem' }}
                      >
                        +{hours}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', border: '2px solid #e74c3c', borderRadius: '8px' }}>
              <h3 style={{ color: '#e74c3c', marginBottom: '1rem' }}>Danger Zone</h3>
              <p style={{ marginBottom: '1rem' }}>Delete all users (except admins), submissions, and answer CSV. This action cannot be undone!</p>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={handleDeleteAllData}
                disabled={loading}
              >
                Delete All Data
              </button>
            </div>
            </>
            )}
          </div>
        )}

        {/* Competition Info Tab */}
        {activeTab === 'competition' && (
          <div>
            <h2 className="card-subtitle">Competition Information</h2>
            <form onSubmit={handleUpdateCompetition}>
              
              {/* Basic Information */}
              <div className="form-group">
                <label className="form-label">Competition Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={competition.title}
                  onChange={(e) => setCompetition({ ...competition, title: e.target.value })}
                  placeholder="e.g., Data Science Challenge 2026"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={competition.description}
                  onChange={(e) => setCompetition({ ...competition, description: e.target.value })}
                  rows="6"
                  placeholder="Provide a detailed description of the competition..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Evaluation Criteria</label>
                <textarea
                  className="form-input"
                  value={competition.evaluationCriteria}
                  onChange={(e) => setCompetition({ ...competition, evaluationCriteria: e.target.value })}
                  rows="4"
                  placeholder="Explain how submissions will be evaluated..."
                />
              </div>

              {/* Timeline */}
              <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#333' }}>Timeline</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={competition.timeline?.startDate || ''}
                    onChange={(e) => setCompetition({ 
                      ...competition, 
                      timeline: { ...competition.timeline, startDate: e.target.value }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={competition.timeline?.endDate || ''}
                    onChange={(e) => setCompetition({ 
                      ...competition, 
                      timeline: { ...competition.timeline, endDate: e.target.value }
                    })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Final Submission Date</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={competition.timeline?.finalSubmissionDate || ''}
                    onChange={(e) => setCompetition({ 
                      ...competition, 
                      timeline: { ...competition.timeline, finalSubmissionDate: e.target.value }
                    })}
                  />
                </div>
              </div>

              {/* Rules */}
              <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#333' }}>Rules</h3>
              {(competition.rules || []).map((rule, index) => (
                <div key={index} className="form-group">
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={rule}
                      onChange={(e) => updateRule(index, e.target.value)}
                      placeholder={`Rule ${index + 1}`}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-danger" onClick={() => removeRule(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addRule}>
                + Add Rule
              </button>

              {/* Prizes */}
              <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#333' }}>Prizes</h3>
              {(competition.prizes || []).map((prize, index) => (
                <div key={index} className="form-group">
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={prize.position}
                      onChange={(e) => updatePrize(index, 'position', e.target.value)}
                      placeholder="Position (e.g., 1st Place)"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={prize.reward}
                      onChange={(e) => updatePrize(index, 'reward', e.target.value)}
                      placeholder="Reward (e.g., $1000)"
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-danger" onClick={() => removePrize(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addPrize}>
                + Add Prize
              </button>

              {/* Data Description */}
              <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#333' }}>Data Description</h3>
              <div className="form-group">
                <label className="form-label">Overview</label>
                <textarea
                  className="form-input"
                  value={competition.dataDescription?.overview || ''}
                  onChange={(e) => setCompetition({ 
                    ...competition, 
                    dataDescription: { ...competition.dataDescription, overview: e.target.value }
                  })}
                  rows="4"
                  placeholder="Provide an overview of the dataset..."
                />
              </div>

              <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', color: '#555' }}>Files</h4>
              {(competition.dataDescription?.files || []).map((file, index) => (
                <div key={index} className="form-group">
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={file.name}
                      onChange={(e) => updateFile(index, 'name', e.target.value)}
                      placeholder="File name (e.g., train.csv)"
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-danger" onClick={() => removeFile(index)}>
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    value={file.description}
                    onChange={(e) => updateFile(index, 'description', e.target.value)}
                    placeholder="File description"
                  />
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addFile}>
                + Add File
              </button>

              <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', color: '#555' }}>Columns</h4>
              {(competition.dataDescription?.columns || []).map((column, index) => (
                <div key={index} className="form-group">
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={column.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                      placeholder="Column name"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={column.type}
                      onChange={(e) => updateColumn(index, 'type', e.target.value)}
                      placeholder="Type (e.g., integer, string)"
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-danger" onClick={() => removeColumn(index)}>
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    value={column.description}
                    onChange={(e) => updateColumn(index, 'description', e.target.value)}
                    placeholder="Column description"
                  />
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addColumn}>
                + Add Column
              </button>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '2rem' }}>
                Save Competition Information
              </button>
            </form>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Send Email to Teams</h2>
              <button 
                type="button" 
                onClick={() => setCredentialsModal({ isOpen: true, password: '', loading: false })}
                className="btn btn-primary"
                style={{ 
                  fontSize: '0.95rem', 
                  padding: '0.6rem 1.2rem',
                  background: 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)'
                }}
              >
                📧 Send All Credentials
              </button>
            </div>
            <form onSubmit={handleSendEmail}>
              <div className="form-group">
                <label htmlFor="recipient">Recipient</label>
                <select
                  id="recipient"
                  className="form-input"
                  value={emailForm.recipient}
                  onChange={(e) => setEmailForm({ ...emailForm, recipient: e.target.value, selectedUserId: '' })}
                  required
                >
                  <option value="all">All Teams</option>
                  <option value="specific">Specific Team</option>
                </select>
              </div>

              {emailForm.recipient === 'specific' && (
                <div className="form-group">
                  <label htmlFor="selectedUser">Select Team</label>
                  <select
                    id="selectedUser"
                    className="form-input"
                    value={emailForm.selectedUserId}
                    onChange={(e) => setEmailForm({ ...emailForm, selectedUserId: e.target.value })}
                    required
                  >
                    <option value="">Choose a team...</option>
                    {emailUsers.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.teamName} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  className="form-input"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Email subject"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  className="form-input"
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  placeholder="Email message"
                  rows="10"
                  required
                  style={{ resize: 'vertical', minHeight: '200px' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="attachments">Attachments (Optional, max 5 files)</label>
                <input
                  type="file"
                  id="attachments"
                  className="form-input"
                  onChange={(e) => setEmailForm({ ...emailForm, attachments: Array.from(e.target.files) })}
                  multiple
                  accept="*/*"
                  style={{ padding: '0.5rem' }}
                />
                {emailForm.attachments.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                    {emailForm.attachments.length} file(s) selected:
                    <ul style={{ marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
                      {emailForm.attachments.map((file, index) => (
                        <li key={index}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Email'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Credentials Password Modal */}
      {credentialsModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            borderRadius: '12px',
            padding: '2rem',
            width: '90%',
            maxWidth: '450px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            color: '#ecf0f1'
          }}>
            <h2 style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.5rem',
              color: '#3498db'
            }}>
              Confirm Admin Password
            </h2>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              color: '#bdc3c7',
              fontSize: '0.95rem'
            }}>
              This will send login credentials (email + password) to all teams. 
              Passwords will be set to each team's leader email.
              Enter your admin password to confirm.
            </p>
            <form onSubmit={handleSendCredentials}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#ecf0f1' }}>Admin Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={credentialsModal.password}
                  onChange={(e) => setCredentialsModal(prev => ({ ...prev, password: e.target.value }))}
                  required
                  autoFocus
                  disabled={credentialsModal.loading}
                  style={{
                    background: '#34495e',
                    border: '1px solid #4a5f7f',
                    color: '#ecf0f1'
                  }}
                />
              </div>
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'flex-end',
                marginTop: '1.5rem'
              }}>
                <button
                  type="button"
                  onClick={() => setCredentialsModal({ isOpen: false, password: '', loading: false })}
                  disabled={credentialsModal.loading}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '6px',
                    border: '2px solid #7f8c8d',
                    background: 'transparent',
                    color: '#ecf0f1',
                    cursor: credentialsModal.loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={credentialsModal.loading}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: credentialsModal.loading 
                      ? '#7f8c8d' 
                      : 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)',
                    color: '#fff',
                    cursor: credentialsModal.loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)'
                  }}
                >
                  {credentialsModal.loading ? 'Sending...' : '📧 Send Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmColor={confirmModal.confirmColor}
        loadingText={confirmModal.loadingText}
        onConfirm={executeDelete}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Confirm', confirmColor: 'primary', loadingText: 'Processing...', action: null })}
        isLoading={loading}
      />
    </div>
  );
}

export default AdminDashboard;
