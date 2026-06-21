import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('logyx_token');
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((res) => setAdmin(res.data))
      .catch(() => localStorage.removeItem('logyx_token'))
      .finally(() => setLoading(false));
  }, []);

  const loginSuccess = useCallback((token, adminData) => {
    localStorage.setItem('logyx_token', token);
    setAdmin(adminData);
    setLoginOpen(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('logyx_token');
    setAdmin(null);
    setLoginOpen(false);
  }, []);

  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  return (
    <AuthContext.Provider value={{
      admin,
      loading,
      loginOpen,
      loginSuccess,
      logout,
      openLogin,
      closeLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
