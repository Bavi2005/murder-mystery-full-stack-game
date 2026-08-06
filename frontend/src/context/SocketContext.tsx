import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { GameSnapshot, ChatMessage } from '../types';

// In dev, Vite proxies /ws to the backend; in production nginx terminates TLS
// and maps /ws to the same backend. Never ship a hardcoded host.
const WS_URL = import.meta.env.VITE_WS_URL || (import.meta.env.DEV ? '/ws' : 'wss://localhost/ws');

export interface GameEventPayload {
  type: string;
  playerId: string | null;
  label: string;
  data: Record<string, unknown>;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinGame: (gameId: string) => void;
  leaveGame: () => void;
  rollDice: () => void;
  move: (to: string) => void;
  usePassage: () => void;
  suggest: (suspectId: string, weaponId: string) => void;
  reveal: (cardId: string) => void;
  accuse: (suspectId: string, weaponId: string, roomId: string) => void;
  endTurn: () => void;
  sendChat: (content: string, receiverId?: string) => void;
  onGameState: (callback: (state: GameSnapshot) => void) => () => void;
  onGameEvent: (callback: (event: GameEventPayload) => void) => () => void;
  onRevealRequest: (callback: (data: { cards: string[]; suspectId: string; weaponId: string; roomId: string }) => void) => () => void;
  onRevealedCard: (callback: (data: { playerId: string; cardId: string }) => void) => () => void;
  onChatMessage: (callback: (message: ChatMessage) => void) => () => void;
  onSocketError: (callback: (error: { code: string; message: string }) => void) => () => void;
  onPlayerJoined: (callback: (data: { username: string; userId: string }) => void) => () => void;
  onPlayerLeft: (callback: (data: { userId: string }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { accessToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const newSocket = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') newSocket.connect();
    });
    newSocket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

const on = useCallback(<T,>(event: string, callback: (data: T) => void) => {
    const s = socketRef.current;
    s?.on(event, callback as never);
    return () => {
      s?.off(event, callback as never);
    };
  }, []);

  const joinGame = useCallback((gameId: string) => emit('join:game', gameId), [emit]);
  const leaveGame = useCallback(() => emit('leave:game'), [emit]);
  const rollDice = useCallback(() => emit('game:roll'), [emit]);
  const move = useCallback((to: string) => emit('game:move', { to }), [emit]);
  const usePassage = useCallback(() => emit('game:passage'), [emit]);
  const suggest = useCallback((suspectId: string, weaponId: string) => emit('game:suggest', { suspectId, weaponId }), [emit]);
  const reveal = useCallback((cardId: string) => emit('game:reveal', { cardId }), [emit]);
  const accuse = useCallback((suspectId: string, weaponId: string, roomId: string) => emit('game:accuse', { suspectId, weaponId, roomId }), [emit]);
  const endTurn = useCallback(() => emit('game:endTurn'), [emit]);
  const sendChat = useCallback((content: string, receiverId?: string) => emit('game:chat', { content, receiverId }), [emit]);

  const createListener = useCallback(<T,>(event: string) => {
    return (callback: (data: T) => void) => on(event, callback);
  }, [on]);

  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      joinGame,
      leaveGame,
      rollDice,
      move,
      usePassage,
      suggest,
      reveal,
      accuse,
      endTurn,
      sendChat,
      onGameState: createListener<GameSnapshot>('game:state'),
      onGameEvent: createListener<GameEventPayload>('game:event'),
      onRevealRequest: createListener<{ cards: string[]; suspectId: string; weaponId: string; roomId: string }>('game:revealrequest'),
      onRevealedCard: createListener<{ playerId: string; cardId: string }>('game:revealedcard'),
      onChatMessage: createListener<ChatMessage>('game:chatMessage'),
      onSocketError: createListener<{ code: string; message: string }>('error'),
      onPlayerJoined: createListener<{ username: string; userId: string }>('game:playerJoined'),
      onPlayerLeft: createListener<{ userId: string }>('game:playerLeft'),
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
