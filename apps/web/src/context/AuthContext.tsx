import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; confirmPassword: string }) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthCtx = createContext<AuthState | null>(null);

/** Listeners (cart/wishlist) re-fetch when auth changes, e.g. to show a merged guest cart. */
export const authEvents = new EventTarget();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.get<User | null>('/api/auth/me'));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const u = await api.post<User>('/api/auth/login', { email, password });
    setUser(u);
    authEvents.dispatchEvent(new Event('change'));
    return u;
  };
  const register = async (data: { name: string; email: string; password: string; confirmPassword: string }) => {
    const u = await api.post<User>('/api/auth/register', data);
    setUser(u);
    authEvents.dispatchEvent(new Event('change'));
    return u;
  };
  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    authEvents.dispatchEvent(new Event('change'));
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
