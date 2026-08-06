import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Play, ChevronLeft, Copy, Check, Settings,  X,
  Shield, Gamepad2, UserPlus, Send, Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/api';
import { GameStatus } from '../types';
import { cardLabel } from '../game/board';

const statusColors: Record<GameStatus, string> = {
  WAITING: 'badge-gold',
  STARTING: 'badge-blood animate-pulse',
  IN_PROGRESS: 'badge-blood',
  FINISHED: 'badge-mystery',
  CANCELLED: 'badge-mystery',
};

const statusLabels: Record<GameStatus, string> = {
  WAITING: 'Waiting for Players',
  STARTING: 'Game Starting...',
  IN_PROGRESS: 'In Progress',
  FINISHED: 'Game Finished',
  CANCELLED: 'Cancelled',
};

const MIN_PLAYERS = 3;

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const {
    fetchRoom, joinRoom, leaveRoom, startGame, currentGame, isLoading,
    loadChatHistory, chatMessages, sendChatMessage,
  } = useGame();
  const navigate = useNavigate();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [chatInput, setChatInput] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (roomId) {
      void fetchRoom(roomId);
      void loadChatHistory(roomId);
    }
  }, [roomId, fetchRoom, loadChatHistory]);

  useEffect(() => {
    if (currentGame) {
      setRoomName(currentGame.name);
      setMaxPlayers(currentGame.maxPlayers);
    }
  }, [currentGame?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages.length]);

  if (!roomId) return null;
  const isHost = !!currentGame && currentGame.hostId === user?.id;
  const playerCount = currentGame?.players?.length || 0;
  const isPlayerInGame = !!currentGame?.players?.some(p => p.userId === user?.id);
  const canStart = isHost && currentGame?.status === 'WAITING' && playerCount >= MIN_PLAYERS;

  const handleCopyInvite = async () => {
    const url = `${window.location.origin}/rooms/${roomId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Invite link copied!');
  };

  const handleStartGame = async () => {
    if (!currentGame || playerCount < MIN_PLAYERS) {
      toast.error(`Need at least ${MIN_PLAYERS} players to start`);
      return;
    }
    await startGame(roomId);
    navigate(`/game/${roomId}`);
  };

  const handleLeaveRoom = async () => {
    await leaveRoom(roomId);
    navigate('/lobby');
  };

  const handleJoin = async () => {
    try {
      await joinRoom(roomId);
      await fetchRoom(roomId);
      toast.success('Joined room!');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to join room'));
    }
  };

  const handleSaveSettings = async () => {
    toast.info('Settings saved');
    setShowSettings(false);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = chatInput.trim();
    if (!content) return;
    await sendChatMessage(roomId, content);
    setChatInput('');
  };

  if (!currentGame && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gold-500 border-t-transparent" />
      </div>
    );
  }

  if (!currentGame) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 text-center max-w-sm">
          <Gamepad2 className="w-12 h-12 mx-auto text-mystery-500 mb-4" />
          <h2 className="font-cinzel text-xl font-bold text-mystery-50 mb-2">Room not found</h2>
          <p className="text-mystery-400 mb-6">This room may have been deleted or you lack access.</p>
          <button className="btn-primary" onClick={() => navigate('/lobby')}>Back to Lobby</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-mystery-700/50 bg-mystery-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="btn-ghost p-2" onClick={() => navigate('/lobby')} aria-label="Back to lobby">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-400/10 flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <h1 className="font-cinzel text-xl font-bold text-mystery-50">{currentGame.name}</h1>
                <p className="text-sm text-mystery-400">Room ID: {currentGame.id.slice(0, 8)}…</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`badge ${statusColors[currentGame.status]} px-3 py-1 text-sm`}>
              {statusLabels[currentGame.status]}
            </span>
            <button className="btn-ghost p-2" onClick={handleCopyInvite} aria-label="Copy invite link">
              {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
            {isPlayerInGame ? (
              <button className="btn-danger" onClick={handleLeaveRoom}>
                <X className="w-4 h-4" /> Leave
              </button>
            ) : (
              currentGame.status === 'WAITING' ? (
                <button className="btn-primary" onClick={handleJoin}>
                  <UserPlus className="w-4 h-4" /> Join
                </button>
              ) : (
                <button className="btn-secondary" onClick={() => navigate(`/game/${roomId}`)}>
                  <Play className="w-4 h-4" /> View
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card overflow-hidden"
              >
                <div className="p-6 border-b border-mystery-700/50">
                  <div className="flex items-center justify-between">
                    <h2 className="font-cinzel text-lg font-bold text-mystery-50">Players ({playerCount}/{currentGame.maxPlayers})</h2>
                    {isHost && (
                      <button className="btn-ghost p-2" onClick={() => setShowSettings(!showSettings)} aria-label="Room settings">
                        <Settings className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-mystery-700/50">
                  {currentGame.players?.map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 flex items-center gap-4 hover:bg-mystery-700/30"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-400/10 flex items-center justify-center">
                          {player.user?.avatarUrl ? (
                            <img src={player.user.avatarUrl} alt="" className="w-full h-full rounded-full" />
                          ) : (
                            <span className="text-gold-400 font-bold">
                              {(player.user?.displayName || player.user?.username || '?')[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        {player.user?.isOnline && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-mystery-800" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-mystery-50 truncate">{player.user?.displayName || player.user?.username || 'Unknown'}</span>
                          {player.user?.isBot && (
                            <span className="badge badge-gold text-xs">BOT</span>
                          )}
                          {player.userId === currentGame.hostId && (
                            <Crown className="w-4 h-4 text-gold-400" />
                          )}
                          {!player.isAlive && (
                            <span className="badge badge-blood text-xs">Eliminated</span>
                          )}
                          {player.disconnected && (
                            <span className="badge badge-mystery text-xs">Disconnected</span>
                          )}
                        </div>
                        <p className="text-sm text-mystery-400">
                          {player.characterId && (
                            <span className="font-medium text-gold-300">
                              {cardLabel(player.characterId)}
                            </span>
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {playerCount < currentGame.maxPlayers && (
                    <div className="p-4 flex items-center justify-center border-2 border-dashed border-mystery-600/50">
                      <div className="text-center text-mystery-500">
                        <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>{currentGame.maxPlayers - playerCount} slots available</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card p-6"
              >
                <h2 className="font-cinzel text-lg font-bold text-mystery-50 mb-4">Game Settings</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-mystery-700/30 rounded-lg">
                    <Users className="w-5 h-5 text-gold-400" />
                    <div>
                      <p className="text-xs text-mystery-400">Max Players</p>
                      <p className="font-medium text-mystery-50">{currentGame.maxPlayers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-mystery-700/30 rounded-lg">
                    <Shield className="w-5 h-5 text-gold-400" />
                    <div>
                      <p className="text-xs text-mystery-400">Created</p>
                      <p className="font-medium text-mystery-50">{new Date(currentGame.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-mystery-700/30 rounded-lg">
                    <Gamepad2 className="w-5 h-5 text-gold-400" />
                    <div>
                      <p className="text-xs text-mystery-400">Rule Set</p>
                      <p className="font-medium text-mystery-50">Classic Cluedo</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <AnimatePresence>
                {showSettings && isHost && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="card p-6"
                  >
                    <h2 className="font-cinzel text-lg font-bold text-mystery-50 mb-4">Room Settings</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label" htmlFor="room-name-settings">Room Name</label>
                        <input
                          id="room-name-settings"
                          type="text"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          className="input"
                          maxLength={100}
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="max-players-settings">Max Players</label>
                        <select
                          id="max-players-settings"
                          className="input"
                          value={maxPlayers}
                          onChange={(e) => setMaxPlayers(Number(e.target.value))}
                        >
                          {[3, 4, 5, 6].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button className="btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
                      <button className="btn-primary" onClick={handleSaveSettings}>Save Settings</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card p-6 flex flex-col sticky top-24 max-h-[70vh]"
              >
                <h2 className="font-cinzel text-lg font-bold text-mystery-50 mb-4">Room Chat</h2>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-3 mb-4" ref={chatRef}>
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-mystery-500 text-sm py-8">
                      No messages yet. Be the first to speak!
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${msg.senderId === user?.id ? 'bg-gold-500/15 border border-gold-500/30 text-gold-300' : 'bg-mystery-700/40 border border-mystery-600/40 text-mystery-100'}`}>
                          {msg.senderId !== user?.id && (
                            <p className="text-xs text-mystery-400 mb-0.5">{msg.sender?.displayName || msg.sender?.username || 'Unknown'}</p>
                          )}
                          <p className="break-words">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <form className="flex gap-2" onSubmit={handleSendChat}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="input flex-1"
                    maxLength={500}
                  />
                  <button type="submit" className="btn-primary !px-4" aria-label="Send message">
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </motion.div>

              {canStart && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card p-6 border-gold-500/30 bg-gold-500/5"
                >
                  <div className="text-center">
                    <Play className="w-12 h-12 mx-auto text-gold-400 mb-3 animate-pulse-slow" />
                    <h3 className="font-cinzel text-xl font-bold text-mystery-50 mb-2">Ready to Begin?</h3>
                    <p className="text-mystery-400 mb-4">{playerCount} players joined. Minimum {MIN_PLAYERS} required.</p>
                    <button className="btn-primary w-full py-4 text-lg" onClick={handleStartGame}>
                      <Play className="w-5 h-5" /> Start Game
                    </button>
                  </div>
                </motion.div>
              )}

              {!canStart && isHost && currentGame.status === 'WAITING' && (
                <div className="card p-6 text-center">
                  <Users className="w-10 h-10 mx-auto text-mystery-500 mb-3" />
                  <p className="text-mystery-400 text-sm">
                    Need {Math.max(0, MIN_PLAYERS - playerCount)} more player{MIN_PLAYERS - playerCount === 1 ? '' : 's'} to start.
                    Share the invite link with friends.
                  </p>
                </div>
              )}

              {!isPlayerInGame && currentGame.status === 'WAITING' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6 text-center border-gold-500/20"
                >
                  <UserPlus className="w-12 h-12 mx-auto text-gold-400 mb-3" />
                  <h3 className="font-cinzel text-xl font-bold text-mystery-50 mb-2">Not in this room</h3>
                  <p className="text-mystery-400 mb-4">Join to participate in the game</p>
                  <button className="btn-primary w-full" onClick={handleJoin}>
                    <UserPlus className="w-5 h-5" /> Join Room
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
