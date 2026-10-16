import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe } from '../services/authService.js';

const AuthContext = createContext(null);

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem('soporte_user') || 'null'); } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  // Con una sesión guardada, la app espera a confirmarla con el servidor antes de cargar datos.
  const [ready, setReady] = useState(() => !readStoredUser());
  function startSession(nextUser, token) { localStorage.setItem('soporte_token', token); localStorage.setItem('soporte_user', JSON.stringify(nextUser)); setUser(nextUser); setReady(true); }
  // Tras cambiar la contraseña el servidor invalida todos los tokens anteriores y entrega uno nuevo a quien la cambió.
  function replaceToken(token) { localStorage.setItem('soporte_token', token); }
  function endSession() { localStorage.removeItem('soporte_token'); localStorage.removeItem('soporte_user'); setUser(null); }

  useEffect(() => {
    if (!readStoredUser()) return undefined;
    let cancelled = false;
    getMe()
      .then((response) => { if (!cancelled) { localStorage.setItem('soporte_user', JSON.stringify(response.data)); setUser(response.data); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const expireSession = () => { localStorage.removeItem('soporte_token'); localStorage.removeItem('soporte_user'); setUser(null); };
    window.addEventListener('soporte:session-expired', expireSession);
    return () => window.removeEventListener('soporte:session-expired', expireSession);
  }, []);

  const value = useMemo(() => ({ user, ready, startSession, endSession, replaceToken, authenticated: Boolean(user) }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}