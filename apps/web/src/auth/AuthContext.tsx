import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser, LoginResponse } from '@minsakthi/contracts';
import { API_BASE } from '../api';

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Silent refresh on mount
  useEffect(() => {
    let mounted = true;

    async function silentRefresh() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });

        if (res.ok) {
          const data = (await res.json()) as LoginResponse;
          if (mounted) {
            setAccessToken(data.accessToken);
            setUser(data.user);
            setStatus('authenticated');
          }
        } else {
          if (mounted) {
            setStatus('unauthenticated');
          }
        }
      } catch {
        if (mounted) {
          setStatus('unauthenticated');
        }
      }
    }

    silentRefresh();

    return () => {
      mounted = false;
    };
  }, []);

  // Refresh the short-lived token before expiry; keep bearer tokens in memory.
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/auth/refresh`,{ method:'POST',credentials:'include' });
        if (!response.ok) throw new Error('Session expired');
        const data = await response.json() as LoginResponse;
        if (active) { setAccessToken(data.accessToken); setUser(data.user); }
      } catch {
        if (active) { setAccessToken(null); setUser(null); setStatus('unauthenticated'); }
      }
    },4*60*1000);
    return () => { active=false; clearTimeout(timer); };
  },[accessToken]);

  const login = useCallback(async (email: string, pass: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Login failed. Please check credentials.');
        return false;
      }

      const data = (await res.json()) as LoginResponse;
      setAccessToken(data.accessToken);
      setUser(data.user);
      setStatus('authenticated');
      return true;
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        status,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextType | null {
  const ctx = useContext(AuthContext);
  return ctx ?? null;
}
