import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import { useGame } from '../context/GameContext';
import {
  ROOMS, CORRIDORS, START_SQUARES, NODE_MAP, SUSPECT_MAP, SUSPECTS,
  WEAPONS, WEAPON_LABELS, ROOM_LABELS, cardLabel, cardCategory, PASSAGES,
} from '../game/board';
import { GameSnapshot, ChatMessage } from '../types';

const BOARD_SIZE = 630;

interface PendingAction {
  kind: 'move' | 'suggest' | 'accuse';
}

interface RevealRequest {
  cards: string[];
  suspectId: string;
  weaponId: string;
  roomId: string;
}

interface AccuseData {
  suspectId: string;
  weaponId: string;
  roomId: string;
}

// ---- reusable panel --------------------------------------------------------

const Panel: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`bg-mystery-800/60 border border-mystery-700/60 rounded-xl backdrop-blur ${className || ''}`}>
    {title && <div className="px-4 py-2.5 border-b border-mystery-700/60 font-cinzel text-sm text-gold-300 tracking-wide">{title}</div>}
    <div className="p-3">{children}</div>
  </div>
);

// ---- main page -------------------------------------------------------------

export const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { fetchRoom, currentGame, snapshot, myPlayerId, myHand, canAct } = useGame();
  const socket = useSocket();

  const [snap, setSnap] = useState<GameSnapshot | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [revealReq, setRevealReq] = useState<RevealRequest | null>(null);
  const [accuseData, setAccuseData] = useState<AccuseData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const state = useMemo(() => snap?.state ?? null, [snap]);
  const myCharacter = useMemo(() => {
    if (!snap || !myPlayerId) return null;
    const me = snap.players.find(p => p.id === myPlayerId);
    return me ? SUSPECT_MAP[me.characterId] : null;
  }, [snap, myPlayerId]);

  const myPosition = useMemo(() => {
    if (!snap || !myPlayerId) return null;
    const me = snap.players.find(p => p.id === myPlayerId);
    return me?.position ?? null;
  }, [snap, myPlayerId]);

  const currentPlayer = useMemo(() => {
    if (!snap || !state || !state.turnOrder.length) return null;
    return snap.players.find(p => p.id === state.turnOrder[state.turnIndex]) || null;
  }, [snap, state]);

  const isMyTurn = useMemo(
    () => !!state && state.phase === 'playing' && !!currentPlayer && !!myPlayerId && currentPlayer.id === myPlayerId && canAct,
    [state, currentPlayer, myPlayerId, canAct]
  );

  // ---- socket wiring --------------------------------------------------------

  useEffect(() => {
    if (!roomId) return;
    socket.joinGame(roomId);
    return () => {
      socket.leaveGame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    void fetchRoom(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    const offState = socket.onGameState((s) => {
      setSnap(s);
      setPending(null);
    });
    const offEvent = socket.onGameEvent((e) => {
      showToast(e.label);
      if (e.type === 'WIN' && e.data?.envelope) {
        const env = e.data.envelope as { suspectId: string; weaponId: string; roomId: string };
        showToast(`The solution was ${cardLabel(env.suspectId)}, ${cardLabel(env.weaponId)}, ${cardLabel(env.roomId)}`);
      }
    });
    const offReveal = socket.onRevealRequest((data) => setRevealReq(data));
    const offRevealed = socket.onRevealedCard((data) => {
      showToast(`They showed you: ${cardLabel(data.cardId)}`);
    });
    const offChat = socket.onChatMessage((m) => {
      setChat(prev => [...prev, m]);
    });
    const offErr = socket.onSocketError((err) => {
      showToast(err.message || 'Action failed');
    });
    const offJoin = socket.onPlayerJoined(() => showToast('A player joined the room'));
    const offLeft = socket.onPlayerLeft(() => showToast('A player left the room'));

    return () => {
      offState(); offEvent(); offReveal(); offRevealed(); offChat(); offErr(); offJoin(); offLeft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, showToast]);

  useEffect(() => {
    if (snapshot) setSnap(snapshot);
  }, [snapshot]);

  // ---- actions ---------------------------------------------------------------

  const clickNode = (nodeId: string) => {
    if (!isMyTurn) return;
    const node = NODE_MAP[nodeId];
    if (!node || node.kind === 'start') return;

    if (node.kind === 'corridor') {
      socket.move(nodeId);
      return;
    }

    // room: decide move vs suggest vs accuse
    if (!pending) {
      socket.move(nodeId);
    } else if (pending.kind === 'move') {
      setPending(null);
    }
  };

  const [suspectPick, setSuspectPick] = useState<string | null>(null);
  const [weaponPick, setWeaponPick] = useState<string | null>(null);

  const startSuggest = () => {
    setPending({ kind: 'suggest' });
    setSuspectPick(null);
    setWeaponPick(null);
  };

  const confirmSuggest = () => {
    if (!suspectPick || !weaponPick || !myPosition) return;
    socket.suggest(suspectPick, weaponPick);
    setPending(null);
  };

  const startAccuse = () => {
    setAccuseData({ suspectId: '', weaponId: '', roomId: myPosition || '' });
  };

  const confirmAccuse = () => {
    if (!accuseData?.suspectId || !accuseData.weaponId || !accuseData.roomId) return;
    socket.accuse(accuseData.suspectId, accuseData.weaponId, accuseData.roomId);
    setAccuseData(null);
  };

  const confirmReveal = (cardId: string) => {
    socket.reveal(cardId);
    setRevealReq(null);
  };

  // ---- derived ---------------------------------------------------------------

  const meOnBoard = useMemo(() => {
    if (!snap) return [];
    return snap.players
      .filter(p => p.isAlive)
      .map(p => ({ ...p, suspect: SUSPECT_MAP[p.characterId] }));
  }, [snap]);

  const playersByNode = useMemo(() => {
    const map: Record<string, typeof meOnBoard> = {};
    for (const p of meOnBoard) {
      (map[p.position] ||= []).push(p);
    }
    return map;
  }, [meOnBoard]);

  const canUsePassage = useMemo(
    () => !!myPosition && !!PASSAGES[myPosition] && isMyTurn && !!state && state.stepsRemaining > 0,
    [myPosition, isMyTurn, state]
  );

  const phaseLabel = useMemo(() => {
    if (!snap) return 'Loading…';
    const g = snap.game;
    if (g.status === 'WAITING') return 'Waiting for host to start';
    if (g.status === 'FINISHED') return `Game over${g.winnerId ? ' — winner announced' : ''}`;
    if (!state) return '…';
    if (state.phase === 'finished') return 'Game over';
    const who = snap.players.find(p => p.id === state.turnOrder[state.turnIndex]);
    const label = who ? SUSPECT_MAP[who.characterId]?.label ?? 'Unknown' : '?';
    return `Turn: ${label}${state.dice ? ` — ${state.dice[0]} + ${state.dice[1]} = ${state.dice[0] + state.dice[1]}` : ''}${state.stepsRemaining > 0 ? ` (${state.stepsRemaining} steps left)` : ''}`;
  }, [snap, state]);

  const sendChat = () => {
    const content = chatInput.trim();
    if (!content || !roomId) return;
    socket.sendChat(content);
    setChatInput('');
  };

  const revealPending = !!state?.pendingSuggestion && !!myPlayerId && state.pendingSuggestion.awaitingPlayerId === myPlayerId;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-mystery-800/95 border border-gold-500/40 text-mystery-50 px-5 py-2.5 rounded-lg shadow-2xl text-sm font-medium backdrop-blur"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-cinzel text-2xl font-bold text-gradient">{currentGame?.name || 'Mystery Mansion'}</h1>
          <p className="text-mystery-400 text-sm mt-0.5">{phaseLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {isMyTurn && state?.dice === null && (
            <button
              onClick={socket.rollDice}
              className="btn-gold"
            >
              Roll Dice
            </button>
          )}
          {isMyTurn && !revealPending && (
            <button
              onClick={socket.endTurn}
              disabled={!!state?.pendingSuggestion}
              className="btn-ghost"
            >
              End Turn
            </button>
          )}
          <button onClick={() => navigate(`/rooms/${roomId}`)} className="btn-ghost">Room</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        {/* board */}
        <div className="bg-mystery-800/40 border border-mystery-700/60 rounded-2xl p-3 backdrop-blur">
          <Board
            players={meOnBoard}
            playersByNode={playersByNode}
            isMyTurn={isMyTurn}
            stepsRemaining={state?.stepsRemaining ?? 0}
            onNodeClick={clickNode}
            myPosition={myPosition}
            canUsePassage={canUsePassage}
            onPassage={socket.usePassage}
          />
        </div>

        {/* sidebar */}
        <div className="flex flex-col gap-4">
          {/* my hand */}
          <Panel title={`Your hand${myCharacter ? ` — ${myCharacter.label}` : ''}`}>
            {myHand.length === 0 ? (
              <p className="text-mystery-400 text-sm">No cards yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {myHand.map(card => (
                  <span
                    key={card}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                      cardCategory(card) === 'suspect' ? 'border-red-500/40 bg-red-500/10 text-red-300'
                      : cardCategory(card) === 'weapon' ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                      : 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                    }`}
                  >
                    {cardLabel(card)}
                  </span>
                ))}
              </div>
            )}
          </Panel>

          {/* actions */}
          <Panel title="Actions">
            {!snap ? (
              <p className="text-mystery-400 text-sm">Connecting to game…</p>
            ) : !isMyTurn ? (
              <p className="text-mystery-400 text-sm">Waiting for your turn.</p>
            ) : revealPending ? (
              <p className="text-mystery-400 text-sm">A suggestion is being resolved — hold your cards if asked.</p>
            ) : (
              <div className="space-y-2">
                <button onClick={startSuggest} className="btn-gold w-full" disabled={!myPosition || !ROOM_LABELS[myPosition]}>
                  Suggest
                </button>
                <button onClick={startAccuse} className="btn-danger w-full" disabled={!myPosition || !ROOM_LABELS[myPosition]}>
                  Accuse
                </button>
                <p className="text-mystery-500 text-xs leading-relaxed">
                  Move by clicking a square or room. Suggest/accuse from inside a room.
                </p>
              </div>
            )}
          </Panel>

          {/* players */}
          <Panel title="Players">
            <div className="space-y-1.5">
              {snap?.players.map(p => {
                const s = SUSPECT_MAP[p.characterId];
                const isCurrent = currentPlayer?.id === p.id;
                return (
                  <div key={p.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm ${isCurrent ? 'bg-gold-500/10 border border-gold-500/30' : 'bg-mystery-900/40'}`}>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s?.color ?? '#666' }} />
                    <span className={`font-medium ${p.isAlive ? 'text-mystery-100' : 'text-mystery-500 line-through'}`}>{s?.label ?? '?'}</span>
                    {p.isBot && <span className="text-gold-400 text-xs font-semibold">BOT</span>}
                    {p.user && <span className="text-mystery-400 text-xs truncate ml-auto">@{p.user.username}</span>}
                    {isCurrent && <span className="text-gold-400 text-xs">●</span>}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* chat */}
          <Panel title="Chat">
            <div className="flex flex-col h-64">
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mb-2">
                {chat.length === 0 && <p className="text-mystery-500 text-xs text-center mt-4">No messages yet</p>}
                {chat.map((m, i) => (
                  <div key={m.id || i} className="text-xs">
                    <span className="text-gold-400 font-medium">{m.sender?.username ?? 'System'}: </span>
                    <span className="text-mystery-200">{m.content}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
                  placeholder="Type a message…"
                  maxLength={500}
                  className="input-dark flex-1 text-sm"
                />
                <button onClick={sendChat} className="btn-gold px-3">Send</button>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* suggest modal */}
      <Modal open={pending?.kind === 'suggest'} onClose={() => setPending(null)} title="Make a Suggestion">
        <p className="text-sm text-mystery-400 mb-3">
          Who committed the murder, and with what weapon, in this room?
        </p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {SUSPECTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSuspectPick(s.id)}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                suspectPick === s.id ? 'border-gold-500 bg-gold-500/20 text-gold-300' : 'border-mystery-700 text-mystery-300 hover:border-mystery-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {WEAPONS.map(w => (
            <button
              key={w}
              onClick={() => setWeaponPick(w)}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                weaponPick === w ? 'border-gold-500 bg-gold-500/20 text-gold-300' : 'border-mystery-700 text-mystery-300 hover:border-mystery-500'
              }`}
            >
              {WEAPON_LABELS[w]}
            </button>
          ))}
        </div>
        <button onClick={confirmSuggest} disabled={!suspectPick || !weaponPick} className="btn-gold w-full">
          Suggest
        </button>
      </Modal>

      {/* accuse modal */}
      <Modal open={!!accuseData} onClose={() => setAccuseData(null)} title="Make an Accusation">
        <p className="text-sm text-mystery-400 mb-3">
          Final answer? A wrong accusation eliminates you from the game.
        </p>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {SUSPECTS.map(s => (
            <button
              key={s.id}
              onClick={() => setAccuseData(prev => prev ? { ...prev, suspectId: s.id } : prev)}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                accuseData?.suspectId === s.id ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-mystery-700 text-mystery-300 hover:border-mystery-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {WEAPONS.map(w => (
            <button
              key={w}
              onClick={() => setAccuseData(prev => prev ? { ...prev, weaponId: w } : prev)}
              className={`px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                accuseData?.weaponId === w ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-mystery-700 text-mystery-300 hover:border-mystery-500'
              }`}
            >
              {WEAPON_LABELS[w]}
            </button>
          ))}
        </div>
        <button onClick={confirmAccuse} disabled={!accuseData?.suspectId || !accuseData.weaponId} className="btn-danger w-full">
          Make the Accusation
        </button>
      </Modal>

      {/* reveal card modal */}
      <Modal open={!!revealReq} onClose={() => setRevealReq(null)} title="Show a Card">
        <p className="text-sm text-mystery-400 mb-3">
          {revealReq ? `You must disprove the suggestion about ${cardLabel(revealReq.suspectId)}. Show one of: ` : ''}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {revealReq?.cards.map(c => (
            <button
              key={c}
              onClick={() => confirmReveal(c)}
              className="px-3 py-2 rounded-lg text-xs font-medium border border-gold-500/40 bg-gold-500/10 text-gold-300 hover:bg-gold-500/20"
            >
              {cardLabel(c)}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

// ---- board renderer ----------------------------------------------------------

interface BoardProps {
  players: Array<{ id: string; characterId: string; position: string; isAlive: boolean; user?: { username?: string } }>;
  playersByNode: Record<string, Array<{ id: string; characterId: string; isAlive: boolean; user?: { username?: string } }>>;
  isMyTurn: boolean;
  stepsRemaining: number;
  onNodeClick: (nodeId: string) => void;
  myPosition: string | null;
  canUsePassage: boolean;
  onPassage: () => void;
}

const Board: React.FC<BoardProps> = ({ playersByNode, isMyTurn, stepsRemaining, onNodeClick, myPosition, canUsePassage, onPassage }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const cell = BOARD_SIZE / 7;

  // simple reachability: any node within stepsRemaining via BFS (approximation for UX)
  const reachable = useMemo(() => {
    if (!isMyTurn || !myPosition) return new Set<string>();
    const adj: Record<string, string[]> = {};
    for (const [a, b] of EDGES_PLAIN) {
      (adj[a] ||= []).push(b);
      (adj[b] ||= []).push(a);
    }
    const seen = new Set<string>([myPosition]);
    let frontier = [myPosition];
    let steps = 0;
    while (frontier.length && steps < stepsRemaining) {
      const next: string[] = [];
      steps++;
      for (const n of frontier) {
        for (const m of adj[n] || []) {
          if (!seen.has(m)) { seen.add(m); next.push(m); }
        }
      }
      frontier = next;
    }
    return seen;
  }, [isMyTurn, myPosition, stepsRemaining]);

  const renderPieces = (nodeId: string) => {
    const ps = playersByNode[nodeId] || [];
    if (!ps.length) return null;
    const baseX = NODE_MAP[nodeId].x * cell;
    const baseY = NODE_MAP[nodeId].y * cell;
    const offsets = [[22, 22], [cell - 22, 22], [22, cell - 22], [cell - 22, cell - 22]];
    return (
      <g pointerEvents="none">
        {ps.slice(0, 4).map((p, i) => {
          const s = SUSPECT_MAP[p.characterId];
          return (
            <circle
              key={p.id}
              cx={baseX + offsets[i][0]}
              cy={baseY + offsets[i][1]}
              r="9"
              fill={s?.color ?? '#888'}
              stroke="#1a1210"
              strokeWidth="2"
              opacity={p.isAlive ? 1 : 0.35}
            >
              <title>{s?.label}</title>
            </circle>
          );
        })}
      </g>
    );
  };

  return (
    <svg viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`} className="w-full h-auto select-none" role="img" aria-label="Mystery Mansion board">
      <defs>
        <pattern id="wood" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#2a1e12" />
          <path d="M0 8 L40 8 M0 24 L40 24" stroke="#3a2c1a" strokeWidth="2" />
        </pattern>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5d77a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f5d77a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* backdrop */}
      <rect width={BOARD_SIZE} height={BOARD_SIZE} rx="20" fill="#1a1210" />
      <rect x={cell * 0.5} y={cell * 0.5} width={BOARD_SIZE - cell} height={BOARD_SIZE - cell} rx="12" fill="url(#wood)" />

      {/* corridors */}
      {CORRIDORS.map(c => {
        const hover = hovered === c.id;
        const clickable = isMyTurn && (reachable.has(c.id) || c.id === myPosition);
        return (
          <g
            key={c.id}
            onClick={() => onNodeClick(c.id)}
            onMouseEnter={() => setHovered(c.id)}
            onMouseLeave={() => setHovered(null)}
            className={clickable ? 'cursor-pointer' : ''}
          >
            <rect
              x={c.x * cell + 6}
              y={c.y * cell + 6}
              width={cell - 12}
              height={cell - 12}
              rx="10"
              fill={hover ? '#4a3a22' : '#33261a'}
              stroke={clickable ? '#f5d77a' : '#4a3a28'}
              strokeWidth={clickable ? 2 : 1}
            />
            {renderPieces(c.id)}
          </g>
        );
      })}

      {/* start squares */}
      {START_SQUARES.map(s => (
        <rect
          key={s.id}
          x={s.x * cell + 10}
          y={s.y * cell + 10}
          width={cell - 20}
          height={cell - 20}
          rx="14"
          fill="#241d14"
          stroke="#4a3a28"
          strokeWidth="1"
        />
      ))}

      {/* rooms */}
      {ROOMS.map(r => {
        const hover = hovered === r.id;
        const clickable = isMyTurn && (reachable.has(r.id) || r.id === myPosition);
        const hasPlayers = (playersByNode[r.id]?.length || 0) > 0;
        return (
          <g
            key={r.id}
            onClick={() => onNodeClick(r.id)}
            onMouseEnter={() => setHovered(r.id)}
            onMouseLeave={() => setHovered(null)}
            className={clickable ? 'cursor-pointer' : ''}
          >
            <rect
              x={r.x * cell + 4}
              y={r.y * cell + 4}
              width={cell - 8}
              height={cell - 8}
              rx="14"
              fill={hover ? '#3d2f1a' : '#2c2116'}
              stroke={clickable ? '#f5d77a' : '#6b5540'}
              strokeWidth={clickable ? 2.5 : 1.5}
            />
            <text
              x={r.x * cell + cell / 2}
              y={r.y * cell + cell / 2 + 4}
              textAnchor="middle"
              className="board-room-label"
            >
              {r.label}
            </text>
            {hasPlayers && <circle cx={r.x * cell + cell - 18} cy={r.y * cell + 18} r="10" fill="url(#glow)" />}
            {renderPieces(r.id)}
          </g>
        );
      })}

      {/* secret passage glyphs */}
      {Object.entries(PASSAGES).map(([from, to]) => {
        const a = NODE_MAP[from];
        const b = NODE_MAP[to];
        if (!a || !b) return null;
        return (
          <g key={from}>
            <circle cx={a.x * cell + 14} cy={a.y * cell + 14} r="4" fill="#f5d77a" opacity="0.8" />
            <circle cx={b.x * cell + cell - 14} cy={b.y * cell + cell - 14} r="4" fill="#f5d77a" opacity="0.8" />
          </g>
        );
      })}

      {/* my position marker */}
      {myPosition && (
        <rect
          x={NODE_MAP[myPosition].x * cell}
          y={NODE_MAP[myPosition].y * cell}
          width={cell}
          height={cell}
          fill="none"
          stroke="#f5d77a"
          strokeWidth="3"
          rx="14"
          strokeDasharray="6 4"
          opacity="0.9"
        >
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </rect>
      )}

      {/* passage button */}
      {canUsePassage && (
        <g className="cursor-pointer" onClick={onPassage}>
          <rect x={BOARD_SIZE - 150} y={BOARD_SIZE - 44} width="140" height="34" rx="8" fill="#5c3a1e" stroke="#f5d77a" strokeWidth="1.5" />
          <text x={BOARD_SIZE - 80} y={BOARD_SIZE - 22} textAnchor="middle" fontSize="12" fill="#f5d77a" fontWeight="600">
            Secret Passage
          </text>
        </g>
      )}

      {/* turn hint */}
      {isMyTurn && stepsRemaining > 0 && (
        <text x={BOARD_SIZE / 2} y={26} textAnchor="middle" fontSize="13" fill="#f5d77a" fontWeight="700">
          {stepsRemaining} step{stepsRemaining > 1 ? 's' : ''} remaining — click a highlighted square
        </text>
      )}
    </svg>
  );
};

// plain edges without secret passages (for UX reachability preview)
const EDGES_PLAIN: [string, string][] = [
  ['kitchen', 'k_b'], ['k_b', 'ballroom'], ['ballroom', 'b_c'], ['b_c', 'conservatory'],
  ['kitchen', 'k_d'], ['k_d', 'dining_room'], ['dining_room', 'd_b'], ['d_b', 'billiard_room'],
  ['conservatory', 'c_b'], ['c_b', 'billiard_room'], ['conservatory', 'c_l'], ['c_l', 'library'],
  ['billiard_room', 'b_l'], ['b_l', 'library'], ['dining_room', 'd_lg'], ['d_lg', 'lounge'],
  ['lounge', 'lg_h'], ['lg_h', 'hall'], ['hall', 'h_s'], ['h_s', 'study'],
  ['billiard_room', 'b_s'], ['b_s', 'study'], ['library', 'l_s'], ['l_s', 'study'],
];

// ---- modal ------------------------------------------------------------

const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          onClick={e => e.stopPropagation()}
          className="bg-mystery-800 border border-mystery-600 rounded-2xl p-5 w-full max-w-md shadow-2xl"
        >
          <h3 className="font-cinzel text-lg text-gold-300 mb-3">{title}</h3>
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default GamePage;
