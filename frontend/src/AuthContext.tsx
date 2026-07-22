import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { getToken, setToken as setStoredToken } from './api/client';

interface AuthContextValue {
  autenticado: boolean;
  definirToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());

  const definirToken = (novoToken: string | null) => {
    setStoredToken(novoToken);
    setTokenState(novoToken);
  };

  const value = useMemo(() => ({ autenticado: !!token, definirToken }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
