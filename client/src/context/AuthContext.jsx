import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('logyx_token');
    if (!token) { setLoading(false); return; }
    getMe()
      .then(res => setAdmin(res.data))
      .catch(() => localStorage.removeItem('logyx_token'))
      .finally(() => setLoading(false));
  }, []);

  const loginSuccess = (token, adminData) => {
    localStorage.setItem('logyx_token', token);
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem('logyx_token');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, loginSuccess, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);