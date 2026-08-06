import { JwtPayload } from 'jsonwebtoken';

export interface TokenPayload extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
  tokenVersion: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  lastSeen: Date | null;
  createdAt: Date;
  updatedAt: Date;
  gameStats?: GameStatsProfile;
  friends?: FriendProfile[];
}

export interface GameStatsProfile {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  murdererWins: number;
  innocentWins: number;
  totalScore: number;
  cluesFound: number;
  votesCorrect: number;
  sabotagesSuccessful: number;
}

export interface FriendProfile {
  id: string;
  userId: string;
  friendId: string;
  friend: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
    lastSeen: Date | null;
  };
  status: FriendRequestStatus;
  createdAt: Date;
}

export enum FriendRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
}

export interface GameRoom {
  id: string;
  name: string;
  hostId: string;
  status: GameStatus;
  maxPlayers: number;
  currentPlayers: number;
  settings: GameSettings;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface GameSettings {
  maxPlayers: number;
  roundDuration: number;
  votingDuration: number;
  allowSpectators: boolean;
  map: GameMap;
  difficulty: GameDifficulty;
  customRules: CustomRules;
}

export enum GameMap {
  MANSION = 'MANSION',
  MANOR = 'MANOR',
  CASTLE = 'CASTLE',
  HOTEL = 'HOTEL',
  MUSEUM = 'MUSEUM',
}

export enum GameDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  EXPERT = 'EXPERT',
}

export interface CustomRules {
  allowSabotage: boolean;
  sabotageCooldown: number;
  maxSabotagesPerGame: number;
  clueRevealDelay: number;
  votingAnonymous: boolean;
  allowSpectatorChat: boolean;
}

export enum GameStatus {
  WAITING = 'WAITING',
  STARTING = 'STARTING',
  IN_PROGRESS = 'IN_PROGRESS',
  ROUND_END = 'ROUND_END',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

export enum RoundStatus {
  ACTIVE = 'ACTIVE',
  VOTING = 'VOTING',
  RESOLVED = 'RESOLVED',
  ENDED = 'ENDED',
}

export enum PlayerRole {
  INNOCENT = 'INNOCENT',
  MURDERER = 'MURDERER',
  DETECTIVE = 'DETECTIVE',
}

export interface GamePlayer {
  id: string;
  gameId: string;
  userId: string;
  role: PlayerRole;
  isAlive: boolean;
  position: Position;
  inventory: InventoryItem[];
  cluesFound: Clue[];
  sabotagesUsed: number;
  votesReceived: number;
  score: number;
  joinedAt: Date;
  eliminatedAt: Date | null;
  user: UserProfile;
}

export interface Position {
  x: number;
  y: number;
  roomId: string | null;
}

export interface InventoryItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  uses: number;
  maxUses: number;
  metadata: Record<string, unknown>;
}

export enum ItemType {
  KEY = 'KEY',
  FLASHLIGHT = 'FLASHLIGHT',
  CAMERA = 'CAMERA',
  NOTE = 'NOTE',
  EVIDENCE_BAG = 'EVIDENCE_BAG',
  LOCKPICK = 'LOCKPICK',
  RADIO = 'RADIO',
  MEDKIT = 'MEDKIT',
}

export interface Clue {
  id: string;
  gameId: string;
  roomId: string;
  type: ClueType;
  title: string;
  description: string;
  content: string;
  isRedHerring: boolean;
  discoveredBy: string | null;
  discoveredAt: Date | null;
  metadata: Record<string, unknown>;
}

export enum ClueType {
  PHYSICAL = 'PHYSICAL',
  TESTIMONY = 'TESTIMONY',
  DIGITAL = 'DIGITAL',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  RED_HERRING = 'RED_HERRING',
}

export interface Room {
  id: string;
  gameId: string;
  name: string;
  description: string;
  type: RoomType;
  position: Position;
  connections: string[];
  clues: Clue[];
  items: InventoryItem[];
  isLocked: boolean;
  requiredKey: string | null;
  cameras: Camera[];
  lights: boolean;
}

export enum RoomType {
  HALLWAY = 'HALLWAY',
  BEDROOM = 'BEDROOM',
  KITCHEN = 'KITCHEN',
  LIBRARY = 'LIBRARY',
  STUDY = 'STUDY',
  BALLROOM = 'BALLROOM',
  GARDEN = 'GARDEN',
  BASEMENT = 'BASEMENT',
  ATTIC = 'ATTIC',
  SECRET = 'SECRET',
}

export interface Camera {
  id: string;
  roomId: string;
  position: Position;
  isActive: boolean;
  isDisabled: boolean;
  disabledUntil: Date | null;
  feed: string | null;
}

export interface Sabotage {
  id: string;
  gameId: string;
  murdererId: string;
  type: SabotageType;
  targetId: string | null;
  roomId: string | null;
  status: SabotageStatus;
  createdAt: Date;
  executedAt: Date | null;
  expiresAt: Date | null;
  metadata: Record<string, unknown>;
}

export enum SabotageType {
  LIGHTS_OUT = 'LIGHTS_OUT',
  FAKE_EVIDENCE = 'FAKE_EVIDENCE',
  FRAME_PLAYER = 'FRAME_PLAYER',
  ERASE_FINGERPRINTS = 'ERASE_FINGERPRINTS',
  DISABLE_CAMERAS = 'DISABLE_CAMERAS',
  LOCK_DOORS = 'LOCK_DOORS',
  FALSE_ALARM = 'FALSE_ALARM',
}

export enum SabotageStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export interface Vote {
  id: string;
  gameId: string;
  roundId: string;
  voterId: string;
  targetId: string;
  isAnonymous: boolean;
  createdAt: Date;
}

export interface GameRound {
  id: string;
  gameId: string;
  roundNumber: number;
  status: RoundStatus;
  murdererId: string | null;
  victimId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  votingEndsAt: Date | null;
  votes: Vote[];
  cluesDiscovered: Clue[];
  sabotagesUsed: Sabotage[];
}

export interface GameResult {
  gameId: string;
  winner: PlayerRole;
  murdererId: string | null;
  survivors: string[];
  eliminated: GamePlayer[];
  mvp: string | null;
  scores: Record<string, number>;
  endedAt: Date;
}

export interface ChatMessage {
  id: string;
  gameId: string | null;
  senderId: string;
  receiverId: string | null;
  type: MessageType;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  sender: UserProfile;
}

export enum MessageType {
  CHAT = 'CHAT',
  SYSTEM = 'SYSTEM',
  GAME_EVENT = 'GAME_EVENT',
  PRIVATE = 'PRIVATE',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  sender: UserProfile;
  receiver: UserProfile;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPTED = 'FRIEND_ACCEPTED',
  GAME_INVITE = 'GAME_INVITE',
  GAME_STARTING = 'GAME_STARTING',
  YOUR_TURN = 'YOUR_TURN',
  GAME_ENDED = 'GAME_ENDED',
  ACHIEVEMENT = 'ACHIEVEMENT',
  SYSTEM = 'SYSTEM',
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
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

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta;
}

export interface SocketEvents {
  // Connection
  'connection': (socket: Socket) => void;
  'disconnect': (reason: string) => void;
  
  // Authentication
  'auth:login': (data: AuthLoginData) => void;
  'auth:logout': () => void;
  
  // Game Room
  'room:create': (data: CreateRoomData) => void;
  'room:join': (data: JoinRoomData) => void;
  'room:leave': () => void;
  'room:list': (data: ListRoomsData) => void;
  'room:update': (data: UpdateRoomData) => void;
  'room:delete': (data: DeleteRoomData) => void;
  'room:start': () => void;
  'room:state': (state: GameRoomState) => void;
  
  // Game Actions
  'game:move': (data: MoveData) => void;
  'game:interact': (data: InteractData) => void;
  'game:search': (data: SearchData) => void;
  'game:useItem': (data: UseItemData) => void;
  'game:sabotage': (data: SabotageData) => void;
  'game:vote': (data: VoteData) => void;
  'game:chat': (data: ChatData) => void;
  
  // Game Events (Server -> Client)
  'game:playerJoined': (player: GamePlayer) => void;
  'game:playerLeft': (playerId: string) => void;
  'game:playerMoved': (data: PlayerMovedData) => void;
  'game:clueFound': (data: ClueFoundData) => void;
  'game:itemFound': (data: ItemFoundData) => void;
  'game:playerEliminated': (data: PlayerEliminatedData) => void;
  'game:roundStarted': (round: GameRound) => void;
  'game:votingStarted': (data: VotingStartedData) => void;
  'game:voteCast': (data: VoteCastData) => void;
  'game:roundEnded': (data: RoundEndedData) => void;
  'game:gameEnded': (result: GameResult) => void;
  'game:sabotageActivated': (sabotage: Sabotage) => void;
  'game:sabotageExpired': (sabotageId: string) => void;
  'game:chatMessage': (message: ChatMessage) => void;
  'game:systemMessage': (message: string) => void;
  
  // Lobby
  'lobby:playerJoined': (player: UserProfile) => void;
  'lobby:playerLeft': (playerId: string) => void;
  'lobby:roomUpdated': (room: GameRoom) => void;
  'lobby:roomDeleted': (roomId: string) => void;
  'lobby:chatMessage': (message: ChatMessage) => void;
  
  // Notifications
  'notification:new': (notification: Notification) => void;
  'notification:read': (notificationId: string) => void;
  'notification:readAll': () => void;
  
  // Friends
  'friend:request': (request: FriendRequest) => void;
  'friend:accepted': (request: FriendRequest) => void;
  'friend:rejected': (requestId: string) => void;
  'friend:removed': (friendId: string) => void;
  'friend:online': (userId: string) => void;
  'friend:offline': (userId: string) => void;
  
  // Errors
  'error': (error: SocketError) => void;
}

export interface Socket extends NodeJS.EventEmitter {
  id: string;
  userId?: string;
  gameId?: string;
  roomId?: string;
  emit: <K extends keyof SocketEvents>(event: K, ...args: Parameters<SocketEvents[K]>) => boolean;
  on: <K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]) => this;
  off: <K extends keyof SocketEvents>(event: K, listener: SocketEvents[K]) => this;
  join: (room: string) => this;
  leave: (room: string) => this;
  to: (room: string) => Socket;
  disconnect: (close?: boolean) => void;
}

export interface AuthLoginData {
  token: string;
}

export interface CreateRoomData {
  name: string;
  maxPlayers: number;
  settings: GameSettings;
}

export interface JoinRoomData {
  roomId: string;
  password?: string;
}

export interface ListRoomsData {
  page: number;
  limit: number;
  status?: GameStatus;
}

export interface UpdateRoomData {
  roomId: string;
  settings?: Partial<GameSettings>;
  name?: string;
}

export interface DeleteRoomData {
  roomId: string;
}

export interface GameRoomState {
  room: GameRoom;
  players: GamePlayer[];
  currentRound: GameRound | null;
  gameState: GameState;
}

export interface GameState {
  phase: GamePhase;
  timeRemaining: number;
  currentPlayerId: string | null;
  availableActions: PlayerAction[];
}

export enum GamePhase {
  WAITING = 'WAITING',
  ROLE_ASSIGNMENT = 'ROLE_ASSIGNMENT',
  EXPLORATION = 'EXPLORATION',
  VOTING = 'VOTING',
  ROUND_RESOLUTION = 'ROUND_RESOLUTION',
  GAME_OVER = 'GAME_OVER',
}

export enum PlayerAction {
  MOVE = 'MOVE',
  SEARCH = 'SEARCH',
  INTERACT = 'INTERACT',
  USE_ITEM = 'USE_ITEM',
  SABOTAGE = 'SABOTAGE',
  VOTE = 'VOTE',
  CHAT = 'CHAT',
}

export interface MoveData {
  targetRoomId: string;
  path: string[];
}

export interface InteractData {
  targetId: string;
  interactionType: InteractionType;
}

export enum InteractionType {
  TALK = 'TALK',
  TRADE = 'TRADE',
  INSPECT = 'INSPECT',
  UNLOCK = 'UNLOCK',
  DISABLE = 'DISABLE',
  REPAIR = 'REPAIR',
}

export interface SearchData {
  roomId: string;
  searchType: SearchType;
}

export enum SearchType {
  QUICK = 'QUICK',
  THOROUGH = 'THOROUGH',
  CAMERA_CHECK = 'CAMERA_CHECK',
  FINGERPRINT = 'FINGERPRINT',
}

export interface UseItemData {
  itemId: string;
  targetId?: string;
  roomId?: string;
}

export interface SabotageData {
  type: SabotageType;
  targetId?: string;
  roomId?: string;
}

export interface VoteData {
  targetId: string;
}

export interface ChatData {
  content: string;
  type: MessageType;
  receiverId?: string;
}

export interface PlayerMovedData {
  playerId: string;
  fromRoomId: string | null;
  toRoomId: string;
  position: Position;
}

export interface ClueFoundData {
  clue: Clue;
  playerId: string;
  playerName: string;
}

export interface ItemFoundData {
  item: InventoryItem;
  playerId: string;
  playerName: string;
}

export interface PlayerEliminatedData {
  playerId: string;
  playerName: string;
  role: PlayerRole;
  eliminatedBy: string | null;
}

export interface VotingStartedData {
  roundId: string;
  candidates: GamePlayer[];
  endsAt: Date;
}

export interface VoteCastData {
  voterId: string;
  voterName: string;
  targetId: string;
  targetName: string;
  isAnonymous: boolean;
}

export interface RoundEndedData {
  round: GameRound;
  votes: Vote[];
  eliminated: GamePlayer | null;
  wasMurderer: boolean;
}

export interface SocketError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}