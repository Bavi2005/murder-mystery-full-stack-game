import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameRoom, GameSnapshot, GamePlayer, ChatMessage, GameEvent } from '../types';
import { gameApi, getErrorMessage } from '../services/api';

interface LobbyRoomType extends GameRoom {
  currentPlayers: number;
}

interface GameContextType {
  currentGame: GameRoom | null;
  snapshot: GameSnapshot | null;
  players: GamePlayer[];
  myPlayerId: string | null;
  myHand: string[];
  canAct: boolean;
  chatMessages: ChatMessage[];
  events: GameEvent[];
  isLoading: boolean;
  error: string | null;
  fetchRooms: (page?: number, limit?: number, status?: string) => Promise<LobbyRoomType[]>;
  fetchRoomsWithMeta: (page?: number, limit?: number, status?: string) => Promise<{ data: LobbyRoomType[]; meta: { page: number; limit?: number; total: number; totalPages: number } }>;
  fetchRoom: (roomId: string) => Promise<GameRoom | null>;
  createRoom: (data: { name: string; maxPlayers: number; password?: string; settings?: Record<string, unknown> }) => Promise<GameRoom>;
  joinRoom: (roomId: string, password?: string) => Promise<GameRoom>;
  leaveRoom: (roomId: string) => Promise<void>;
  startGame: (roomId: string) => Promise<void>;
  loadChatHistory: (roomId: string) => Promise<void>;
  sendChatMessage: (roomId: string, content: string, type?: string, receiverId?: string) => Promise<void>;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: React.ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [currentGame, setCurrentGame] = useState<GameRoom | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myHand, setMyHand] = useState<string[]>([]);
  const [canAct, setCanAct] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const fetchRooms = useCallback(async (page = 1, limit = 20, status?: string) => {
    setIsLoading(true);
    try {
      const res = await gameApi.listRooms({ page, limit, status });
      return res.data.data as LobbyRoomType[];
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch rooms'));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRoomsWithMeta = useCallback(async (page = 1, limit = 20, status?: string) => {
    try {
      const res = await gameApi.listRooms({ page, limit, status });
      return res.data as { data: LobbyRoomType[]; meta: { page: number; limit?: number; total: number; totalPages: number } };
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch rooms'));
      return { data: [], meta: { page: 1, totalPages: 1, total: 0 } };
    }
  }, []);

  const fetchRoom = useCallback(async (roomId: string) => {
    setIsLoading(true);
    try {
      const res = await gameApi.getRoom(roomId);
      setCurrentGame(res.data.data);
      return res.data.data;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch room'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRoom = useCallback(async (data: { name: string; maxPlayers: number; password?: string; settings?: Record<string, unknown> }) => {
    setIsLoading(true);
    try {
      const res = await gameApi.createRoom(data);
      setCurrentGame(res.data.data);
      return res.data.data;
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to create room');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const joinRoom = useCallback(async (roomId: string, password?: string) => {
    setIsLoading(true);
    try {
      const res = await gameApi.joinRoom(roomId, password);
      setCurrentGame(res.data.data);
      return res.data.data;
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to join room');
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const leaveRoom = useCallback(async (roomId: string) => {
    setIsLoading(true);
    try {
      await gameApi.leaveRoom(roomId);
      setCurrentGame(null);
      setSnapshot(null);
      setPlayers([]);
      setMyPlayerId(null);
      setMyHand([]);
      setCanAct(false);
      setChatMessages([]);
      setEvents([]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to leave room'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startGame = useCallback(async (roomId: string) => {
    setIsLoading(true);
    try {
      const res = await gameApi.startGame(roomId);
      setCurrentGame(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to start game'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadChatHistory = useCallback(async (roomId: string) => {
    try {
      const res = await gameApi.getChatHistory(roomId);
      setChatMessages(res.data.data);
    } catch (err) {
      setChatMessages([]);
    }
  }, []);

  const sendChatMessage = useCallback(async (roomId: string, content: string, type = 'CHAT', receiverId?: string) => {
    try {
      await gameApi.sendChatMessage(roomId, content, type, receiverId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send message'));
    }
  }, []);

  return (
    <GameContext.Provider value={{
      currentGame,
      snapshot,
      players,
      myPlayerId,
      myHand,
      canAct,
      chatMessages,
      events,
      isLoading,
      error,
      fetchRooms,
      fetchRoomsWithMeta,
      fetchRoom,
      createRoom,
      joinRoom,
      leaveRoom,
      startGame,
      loadChatHistory,
      sendChatMessage,
      clearError,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
};
