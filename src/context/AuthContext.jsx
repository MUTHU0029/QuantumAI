import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    setSession({ token: result.token, user: result.user });
    return result.user;
  }, []);

  const register = useCallback((details) => authService.register(details), []);
  const logout = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      login,
      register,
      logout,
    }),
    [session, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
