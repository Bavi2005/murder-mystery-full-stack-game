import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://localhost/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: string) => void; reject: (reason: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token lives in an httpOnly, SameSite=Strict cookie scoped to
        // /api/auth — the browser sends it automatically. Never store it in JS.
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        const { accessToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('accessToken');
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; username: string; password: string; displayName?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string; rememberMe?: boolean; twoFactorCode?: string }) =>
    api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  logoutAll: () => api.post('/auth/logout-all'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) =>
    api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  deleteAccount: (password: string) => api.delete('/auth/account', { data: { password } }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  enable2FA: () => api.post('/auth/2fa/enable'),
  verify2FA: (code: string) => api.post('/auth/2fa/verify', { code }),
  disable2FA: (code: string) => api.post('/auth/2fa/disable', { code }),
};

export const userApi = {
  getFriends: () => api.get('/users/friends'),
  sendFriendRequest: (receiverId: string) => api.post('/users/friends/request', { receiverId }),
  acceptFriendRequest: (requestId: string) => api.post(`/users/friends/${requestId}/accept`),
  rejectFriendRequest: (requestId: string) => api.post(`/users/friends/${requestId}/reject`),
  removeFriend: (friendId: string) => api.delete(`/users/friends/${friendId}`),
  getNotifications: (unreadOnly?: boolean) => api.get('/users/notifications', { params: { unread: unreadOnly } }),
  markNotificationRead: (notificationId: string) => api.post(`/users/notifications/${notificationId}/read`),
  markAllNotificationsRead: () => api.post('/users/notifications/read-all'),
  getGameStats: () => api.get('/users/stats'),
  getLeaderboard: (limit = 50) => api.get('/users/leaderboard', { params: { limit } }),
  searchUsers: (query: string) => api.get('/users/search', { params: { q: query } }),
};

export const gameApi = {
  listRooms: (params?: { page?: number; limit?: number; status?: string }) => api.get('/games/rooms', { params }),
  getRoom: (roomId: string) => api.get(`/games/rooms/${roomId}`),
  createRoom: (data: { name: string; maxPlayers: number; settings?: Record<string, unknown> }) => api.post('/games/rooms', data),
  joinRoom: (roomId: string, password?: string) => api.post(`/games/rooms/${roomId}/join`, { password }),
  leaveRoom: (roomId: string) => api.post(`/games/rooms/${roomId}/leave`),
  updateRoom: (roomId: string, data: Record<string, unknown>) => api.put(`/games/rooms/${roomId}`, data),
  startGame: (roomId: string) => api.post(`/games/rooms/${roomId}/start`),
  movePlayer: (roomId: string, targetRoomId: string, path: string[]) => api.post(`/games/rooms/${roomId}/move`, { targetRoomId, path }),
  searchRoom: (roomId: string, roomId2: string, searchType: string) => api.post(`/games/rooms/${roomId}/search`, { roomId: roomId2, searchType }),
  useItem: (roomId: string, itemId: string, targetId?: string, roomId2?: string) => api.post(`/games/rooms/${roomId}/use-item`, { itemId, targetId, roomId: roomId2 }),
  castVote: (roomId: string, targetId: string) => api.post(`/games/rooms/${roomId}/vote`, { targetId }),
  sendChatMessage: (roomId: string, content: string, type: string, receiverId?: string) => api.post(`/games/rooms/${roomId}/chat`, { content, type, receiverId }),
  getChatHistory: (roomId: string, limit = 50) => api.get(`/games/rooms/${roomId}/chat`, { params: { limit } }),
  useSabotage: (roomId: string, type: string, targetId?: string, roomId2?: string) => api.post(`/games/rooms/${roomId}/sabotage`, { type, targetId, roomId: roomId2 }),
};

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { error?: { message?: unknown } } } }).response;
    const message = res?.data?.error?.message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

export default api;