import { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('soporte_user') || 'null'));
  function startSession(nextUser, token) { localStorage.setItem('soporte_token', token); localStorage.setItem('soporte_user', JSON.stringify(nextUser)); setUser(nextUser); }
  function endSession() { localStorage.removeItem('soporte_token'); localStorage.removeItem('soporte_user'); setUser(null); }
  const value = useMemo(() => ({ user, startSession, endSession, authenticated: Boolean(user) }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
