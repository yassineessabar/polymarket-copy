'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import type { User } from '../types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('polyx_token');
  }, []);

  // Check existing token on mount
  useEffect(() => {
    const stored = localStorage.getItem('polyx_token');
    if (stored) {
      setToken(stored);
      api
        .get<User>('/api/auth/me')
        .then((u) => {
          if (u && u.user_id) {
            setUser(u);
          } else {
            localStorage.removeItem('polyx_token');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('polyx_token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async () => {
    if (!address || !isConnected) return;
    try {
      setIsLoading(true);
      // 1. Get nonce (GET request with query parameter)
      const { nonce } = await api.get<{ nonce: string }>(
        `/api/auth/nonce?address=${address}`
      );
      // 2. Build SIWE message
      const message = `Sign in to PolyX\n\nWallet: ${address}\nNonce: ${nonce}`;
      // 3. Sign
      const signature = await signMessageAsync({ message });
      // 4. Verify — API returns { token, user_id, wallet_address, is_new }
      const verifyResult = await api.post<{
        token: string;
        user_id: number;
        wallet_address: string;
        is_new: boolean;
      }>('/api/auth/verify', {
        message,
        signature,
      });
      const jwt = verifyResult.token;
      setToken(jwt);
      localStorage.setItem('polyx_token', jwt);
      // 5. Fetch full user profile
      const fullUser = await api.get<User>('/api/auth/me');
      setUser(fullUser);
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, signMessageAsync]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
