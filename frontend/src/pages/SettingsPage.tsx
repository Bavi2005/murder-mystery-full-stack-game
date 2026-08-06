import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, getErrorMessage } from '../services/api';

const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const changePassword = async () => {
    if (!currentPassword || !newPassword) {
      setMessage('Fill in both fields');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setMessage('Password changed — you have been signed out of all devices');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setMessage(getErrorMessage(err, 'Password change failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="font-cinzel text-3xl font-bold text-gradient mb-6">Settings</h1>

      <div className="bg-mystery-800/60 border border-mystery-700/60 rounded-xl p-6 space-y-4">
        <h2 className="font-cinzel text-lg text-gold-300">Change Password</h2>
        <div>
          <label className="block text-xs text-mystery-400 mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="input-dark w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-mystery-400 mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="input-dark w-full text-sm"
          />
        </div>
        <button onClick={changePassword} disabled={busy} className="btn-gold w-full">
          {busy ? 'Updating…' : 'Update Password'}
        </button>
        {message && <p className="text-sm text-gold-400 text-center">{message}</p>}
      </div>

      <div className="bg-mystery-800/60 border border-mystery-700/60 rounded-xl p-6 mt-4">
        <h2 className="font-cinzel text-lg text-gold-300 mb-2">Account</h2>
        <p className="text-mystery-400 text-sm mb-4">
          Signed in as <span className="text-mystery-100">{user?.email}</span>
        </p>
        <button onClick={logout} className="btn-danger w-full">Sign Out</button>
      </div>
    </div>
  );
};

export default SettingsPage;
