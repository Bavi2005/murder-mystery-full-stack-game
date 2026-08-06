// Shared frontend types for the Cluedo/Mystery Mansion game.
// Mirror the server-authoritative payloads (see backend/src/services/game.service.ts).

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  isBot?: boolean;
  lastSeen: string | null;
  createdAt: string;
  updatedAt: string;
  gameStats?: GameStats;
  friends?: User[];
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalScore: number;
  correctAccusations: number;
  wrongAccusations: number;
  cardsSeen: number;
}

export type GameStatus = 'WAITING' | 'STARTING' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

export interface GameSettings {
  maxPlayers: number;
}

export interface GameRoom {
  id: string;
  name: string;
  hostId: string;
  status: GameStatus;
  maxPlayers: number;
  settings: GameSettings;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  currentPlayers?: number;
  host?: User;
  players?: GamePlayer[];
}

export interface GamePlayer {
  id: string;
  gameId: string;
  userId: string;
  characterId: string;
  position: string;
  hand: string[];
  isAlive: boolean;
  disconnected: boolean;
  score: number;
  joinedAt: string;
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'isOnline' | 'isBot'>;
}

export interface PublicGamePlayer {
  id: string;
  userId: string;
  characterId: string;
  position: string;
  isAlive: boolean;
  disconnected: boolean;
  score: number;
  isBot?: boolean;
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'isOnline' | 'isBot'>;
}

// Per-player redacted snapshot of the running game (server-computed).
export interface GamePhaseState {
  phase: 'waiting' | 'playing' | 'finished';
  turnOrder: string[];
  turnIndex: number;
  dice: [number, number] | null;
  stepsRemaining: number;
  moved: boolean;
  suggestedThisTurn: boolean;
  accusedThisTurn: boolean;
  pendingSuggestion: {
    suggesterPlayerId: string;
    suspectId: string;
    weaponId: string;
    roomId: string;
    awaitingPlayerId: string | null;
  } | null;
  winnerId: string | null;
  envelopeRevealed: boolean;
}

export interface GameSnapshot {
  game: {
    id: string;
    name: string;
    status: GameStatus;
    winnerId: string | null;
    startedAt: string | null;
    endedAt: string | null;
  };
  players: PublicGamePlayer[];
  my: {
    playerId: string;
    hand: string[];
    canAct: boolean;
  };
  state: GamePhaseState;
  envelope: { suspectId: string; weaponId: string; roomId: string } | null;
  events: GameEvent[];
}

export interface GameEvent {
  id: string;
  gameId: string;
  playerId: string | null;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  gameId: string | null;
  senderId: string;
  receiverId: string | null;
  content: string;
  type: 'CHAT' | 'SYSTEM' | 'GAME_EVENT' | 'PRIVATE' | 'ANNOUNCEMENT';
  createdAt: string;
  sender?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
  sender?: User;
  receiver?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;  createdAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface LobbyRoom extends GameRoom {
  currentPlayers: number;
}
