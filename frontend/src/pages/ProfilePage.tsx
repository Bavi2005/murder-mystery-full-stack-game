import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi, getErrorMessage } from '../services/api';
import { GameStats } from '../types';

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [stats, setStats] = useState<GameStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void userApi.getGameStats()
      .then(res => setStats(res.data.data))
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({ displayName: displayName || undefined, bio: bio || undefined });
      setMessage('Profile updated');
    } catch (err) {
      setMessage(getErrorMessage(err, 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const rows: Array<[string, number]> = stats ? [
    ['Games Played', stats.gamesPlayed],
    ['Games Won', stats.gamesWon],
    ['Games Lost', stats.gamesLost],
    ['Total Score', stats.totalScore],
    ['Correct Accusations', stats.correctAccusations],
    ['Wrong Accusations', stats.wrongAccusations],
    ['Cards Seen', stats.cardsSeen],
  ] : [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-cinzel text-3xl font-bold text-gradient mb-6">Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-mystery-800/60 border border-mystery-700/60 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center text-mystery-900 font-cinzel text-2xl font-bold">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                (user?.displayName?.[0] || user?.username?.[0] || '?').toUpperCase()
              )}
            </div>
            <div>
              <p className="text-mystery-100 font-semibold">{user?.displayName || user?.username}</p>
              <p className="text-mystery-400 text-sm">@{user?.username}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-mystery-400 mb-1">Display Name</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-dark w-full text-sm"
                maxLength={50}
              />
            </div>
            <div>
              <label className="block text-xs text-mystery-400 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="input-dark w-full text-sm resize-none"
                rows={3}
                maxLength={300}
              />
            </div>
            <button onClick={save} disabled={saving} className="btn-gold w-full">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            {message && <p className="text-sm text-gold-400 text-center">{message}</p>}
          </div>
        </div>

        <div className="bg-mystery-800/60 border border-mystery-700/60 rounded-xl p-6">
          <h2 className="font-cinzel text-lg text-gold-300 mb-4">Statistics</h2>
          {!stats ? (
            <p className="text-mystery-400 text-sm">No games played yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-mystery-300">{label}</span>
                  <span className="text-mystery-100 font-semibold tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
