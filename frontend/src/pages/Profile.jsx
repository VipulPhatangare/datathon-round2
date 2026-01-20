import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { authAPI } from '../api';

function Profile() {
  const { user, setUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [teamForm, setTeamForm] = useState({
    leaderName: '',
    memberName: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setTeamForm({
        leaderName: user.leaderName || '',
        memberName: user.memberName || ''
      });
    }
  }, [user]);

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.updateProfile(teamForm);
      setSuccess('Profile updated successfully');
      setEditMode(false);
      
      // Update user context
      const updatedUser = { ...user, ...teamForm };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await authAPI.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
      setSuccess('Password changed successfully');
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    }
  };

  return (
    <div className="main-content">
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1>Team Profile</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ borderBottom: '2px solid #3498db', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Profile Information</h2>
          
          <div className="form-group">
            <label>Team Name</label>
            <input
              type="text"
              className="form-input"
              value={user?.teamName || ''}
              disabled
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#666' }}>Team name cannot be changed</small>
          </div>

          <div className="form-group">
            <label>Leader Email</label>
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
            />
            <small style={{ color: '#666' }}>Email cannot be changed</small>
          </div>

          {editMode ? (
            <form onSubmit={handleUpdateTeam}>
              <div className="form-group">
                <label>Leader Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={teamForm.leaderName}
                  onChange={(e) => setTeamForm({ ...teamForm, leaderName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Member Name (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={teamForm.memberName}
                  onChange={(e) => setTeamForm({ ...teamForm, memberName: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary">Save Changes</button>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setEditMode(false);
                  setTeamForm({
                    leaderName: user.leaderName || '',
                    memberName: user.memberName || ''
                  });
                }}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <div className="form-group">
                <label>Leader Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.leaderName || 'Not set'}
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </div>

              <div className="form-group">
                <label>Member Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={user?.memberName || 'Not set'}
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </div>

              <button className="btn btn-primary" onClick={() => setEditMode(true)}>
                Edit Profile
              </button>
            </>
          )}
        </div>

        <div>
          <h2 style={{ borderBottom: '2px solid #3498db', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Change Password</h2>
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasswords.oldPassword ? "text" : "password"}
                  className="form-input"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  required
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, oldPassword: !showPasswords.oldPassword })}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: '#666',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPasswords.oldPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasswords.newPassword ? "text" : "password"}
                  className="form-input"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength="6"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, newPassword: !showPasswords.newPassword })}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: '#666',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPasswords.newPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPasswords.confirmPassword ? "text" : "password"}
                  className="form-input"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                  minLength="6"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: '#666',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPasswords.confirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary">Change Password</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
