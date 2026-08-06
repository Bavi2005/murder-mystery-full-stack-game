import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, LoginCredentials, RegisterData } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string }) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // The server rotates (one-time-use) refresh tokens, so concurrent refresh
  // calls would invalidate each other. Dedupe in-flight refreshes.
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  // Access token is kept in memory (never persisted) for the socket handshake.
  // The refresh token lives only in an httpOnly cookie set by the server.
  const applyAuth = useCallback((access: string, u: User) => {
    setAccessToken(access);
    setUser(u);
    setIsAuthenticated(true);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('accessToken');
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const doRefresh = useCallback(async (): Promise<string | null> => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current;
    refreshInFlightRef.current = (async () => {
      try {
        const { data } = await authApi.refresh();
        setAccessToken(data.data.accessToken);
        return data.data.accessToken;
      } catch {
        clearAuth();
        return null;
      }
    })();
    try {
      return await refreshInFlightRef.current;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [clearAuth]);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await doRefresh();
      if (!token) return;
      try {
        const payload = await authApi.getProfile();
        const profile = payload.data?.data ?? payload.data?.user;
        if (profile) {
          setUser(profile);
          setIsAuthenticated(true);
        }
      } catch {
        // profile fetch failed; access token may still be valid
      }
    } finally {
      setIsLoading(false);
    }
  }, [doRefresh]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { data } = await authApi.login(credentials);
    applyAuth(data.data.accessToken, data.data.user);
  }, [applyAuth]);

  const register = useCallback(async (data: RegisterData) => {
    const { data: result } = await authApi.register(data);
    applyAuth(result.data.accessToken, result.data.user);
  }, [applyAuth]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const updateProfile = useCallback(async (data: { displayName?: string; bio?: string; avatarUrl?: string }) => {
    const { data: result } = await authApi.updateProfile(data);
    setUser(result.data);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{
      user,
      accessToken,
      isLoading,
      isAuthenticated,
      login,
      register,
      logout,
      updateProfile,
      checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
