import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, ChevronRight, RefreshCw, Play, X, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/api';
import { LobbyRoom, GameStatus } from '../types';

const statusColors: Record<string, string> = {
  WAITING: 'badge-gold',
  STARTING: 'badge-blood',
  IN_PROGRESS: 'badge-blood',
  FINISHED: 'badge-mystery',
  CANCELLED: 'badge-mystery',
};

const statusLabels: Record<string, string> = {
  WAITING: 'Waiting',
  STARTING: 'Starting',
  IN_PROGRESS: 'In Progress',
  FINISHED: 'Finished',
  CANCELLED: 'Cancelled',
};

export const LobbyPage: React.FC = () => {
  const { user } = useAuth();
  const { fetchRoomsWithMeta, fetchRoom, joinRoom, createRoom, startGame, clearError } = useGame();
  const navigate = useNavigate();
  const toast = useToast();
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<GameStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    maxPlayers: 5,
  });

  const loadRooms = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setRooms([]);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const res = await fetchRoomsWithMeta(targetPage, 20, status);
      setRooms(Array.isArray(res?.data) ? res.data : []);
      const meta = res?.meta;
      if (meta) {
        setTotalPages(meta.totalPages || 1);
        setTotal(meta.total || 0);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load rooms'));
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, fetchRoomsWithMeta, toast]);

  useEffect(() => {
    loadRooms(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error('Room name is required');
      return;
    }
    try {
      const room = await createRoom({
        name: createForm.name.trim(),
        maxPlayers: createForm.maxPlayers,
        settings: { maxPlayers: createForm.maxPlayers },
      });
      toast.success('Room created!');
      setShowCreateModal(false);
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create room'));
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await joinRoom(roomId);
      const room = await fetchRoom(roomId);
      if (room) {
        navigate(`/rooms/${room.id}`);
      } else {
        navigate(`/rooms/${roomId}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to join room'));
    }
  };

  const handleQuickPlay = async () => {
    try {
      const waiting = rooms.find(r => r.status === 'WAITING' && r.currentPlayers < r.maxPlayers);
      if (waiting) {
        await handleJoinRoom(waiting.id);
        return;
      }
      const room = await createRoom({
        name: `${user?.displayName || user?.username || 'Detective'}'s Game`,
        maxPlayers: 5,
        settings: { maxPlayers: 5 },
      });
      toast.success('Room created!');
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create room'));
    }
  };

  const handleQuickJoin = handleQuickPlay;

  const handleSoloPlay = async () => {
    try {
      const room = await createRoom({
        name: 'Solo Detective',
        maxPlayers: 4,
        settings: { maxPlayers: 4, botCount: 3 },
      });
      await startGame(room.id);
      navigate(`/game/${room.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start solo game'));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-mystery-700/50 bg-mystery-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/lobby" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center shadow-gold">
              <Gamepad2 className="w-6 h-6 text-mystery-900" />
            </div>
            <span className="font-cinzel text-xl font-bold text-gradient">Mystery Mansion</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-mystery-800/50 rounded-lg border border-mystery-700">
              <Gamepad2 className="w-5 h-5 text-gold-400" />
              <span className="text-sm font-medium text-mystery-50">{total} rooms</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-ghost p-2" onClick={() => loadRooms(1)} title="Refresh" aria-label="Refresh rooms">
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Room</span>
              </button>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-mystery-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                ) : (
                  <span className="text-mystery-900 font-bold text-sm">
                    {(user?.displayName || user?.username || '?')[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="hidden sm:block text-sm font-medium text-mystery-50">{user?.displayName || user?.username}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="lg:w-64 flex-shrink-0">
              <div className="card p-4 sticky top-24 space-y-4">
                <h3 className="font-cinzel text-lg font-bold text-mystery-50 mb-4">Filters</h3>

                <button className="btn-primary w-full" onClick={handleQuickJoin}>
                  <Play className="w-4 h-4" /> Quick Start
                </button>

                <button className="btn-gold w-full" onClick={handleSoloPlay}>
                  <Gamepad2 className="w-4 h-4" /> Solo vs Bots
                </button>

                <div>
                  <label className="label">Search Rooms</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mystery-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setPage(1);
                          // server-side search not available; filter client-side
                        }
                      }}
                      className="input pl-10"
                      placeholder="Room name..."
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value as GameStatus | 'all'); setPage(1); }}
                    className="input"
                  >
                    <option value="all">All Statuses</option>
                    <option value="WAITING">Waiting</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="FINISHED">Finished</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-mystery-700">
                  <h4 className="font-medium text-mystery-300 mb-3">Quick Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-mystery-400">Active Games</span>
                      <span className="font-medium text-mystery-50">{rooms.filter(r => r.status === 'IN_PROGRESS').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-mystery-400">Waiting Rooms</span>
                      <span className="font-medium text-mystery-50">{rooms.filter(r => r.status === 'WAITING').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-mystery-400">Available Slots</span>
                      <span className="font-medium text-mystery-50">{rooms.reduce((acc, r) => acc + Math.max(0, r.maxPlayers - (r.currentPlayers || 0)), 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-cinzel text-2xl font-bold text-mystery-50">Game Rooms</h2>
                  <p className="text-mystery-400 text-sm mt-1">{total} rooms found</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-mystery-400">Page {page} of {totalPages || 1}</span>
                  <button className="btn-secondary p-2" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading} aria-label="Previous page">
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <button className="btn-secondary p-2" onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))} disabled={page >= totalPages || isLoading} aria-label="Next page">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isLoading && rooms.length === 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="card animate-pulse">
                      <div className="h-40 bg-mystery-700/50" />
                      <div className="p-4 space-y-3">
                        <div className="h-5 bg-mystery-700/50 rounded w-3/4" />
                        <div className="h-4 bg-mystery-700/50 rounded w-1/2" />
                        <div className="h-4 bg-mystery-700/50 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {rooms.length === 0 ? (
                    <div className="card p-12 text-center">
                      <Gamepad2 className="w-16 h-16 mx-auto text-mystery-600 mb-4" />
                      <h3 className="font-cinzel text-xl font-bold text-mystery-50 mb-2">No rooms found</h3>
                      <p className="text-mystery-400 mb-6">Be the first to create a game room!</p>
                      <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-5 h-5" /> Create Room
                      </button>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rooms.filter(r =>
                        !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase())
                      ).map((room, i) => (
                        <motion.div
                          key={room.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="card-hover group relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative p-4 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="font-cinzel font-bold text-mystery-50 truncate">{room.name}</h3>
                              <span className={`badge ${statusColors[room.status] || 'badge-mystery'}`}>{statusLabels[room.status] || room.status}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm text-mystery-400 mb-4">
                              <div>
                                <span className="block text-mystery-500 text-xs uppercase tracking-wider mb-0.5">Players</span>
                                <span className="font-medium text-mystery-50">{room.currentPlayers}/{room.maxPlayers}</span>
                              </div>
                              <div>
                                <span className="block text-mystery-500 text-xs uppercase tracking-wider mb-0.5">Host</span>
                                <span className="font-medium text-mystery-50 truncate">{room.host?.displayName || room.host?.username || 'Unknown'}</span>
                              </div>
                            </div>

                            <div className="mt-auto flex items-center justify-between pt-3 border-t border-mystery-700/50">
                              <span className="text-xs text-mystery-500">
                                {new Date(room.createdAt).toLocaleDateString()}
                              </span>
                              <button
                                className={`btn !px-4 !py-2 ${room.status === 'WAITING' && room.currentPlayers < room.maxPlayers ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handleJoinRoom(room.id)}
                                disabled={room.status !== 'WAITING' || room.currentPlayers >= room.maxPlayers}
                              >
                                {room.status === 'WAITING' && room.currentPlayers < room.maxPlayers ? 'Join' : 'View'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.form
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleCreateRoom}
              className="w-full max-w-md card p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-cinzel text-xl font-bold text-gradient">Create Game Room</h3>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-mystery-400 hover:text-mystery-50" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="label" htmlFor="room-name">Room Name</label>
                <input
                  id="room-name"
                  className="input"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="The Study Wing"
                  maxLength={100}
                  autoFocus
                />
              </div>

              <div>
                <label className="label" htmlFor="max-players">Max Players (3–6)</label>
                <select
                  id="max-players"
                  className="input"
                  value={createForm.maxPlayers}
                  onChange={(e) => setCreateForm({ ...createForm, maxPlayers: Number(e.target.value) })}
                >
                  {[3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n} players</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" className="btn-secondary flex-1" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  <Plus className="w-4 h-4" /> Create
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};