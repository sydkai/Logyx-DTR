import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';

const C = {
  bg: '#0a0c10',
  surface: '#111318',
  surface2: '#181b22',
  border: '#252830',
  accent: '#00e5a0',
  text: '#e8eaf0',
  muted: '#6b7280',
  warn: '#ff6b35',
};

export default function LoginOverlay() {
  const { loginSuccess, closeLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      loginSuccess(res.data.token, res.data.admin);
      closeLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: C.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img
            src="/logo.png"
            alt="LOGYX"
            style={{ display: 'inline-block', width: '100%', maxWidth: 220, height: 'auto' }}
          />
          <p style={{
            color: C.muted,
            fontSize: '0.75rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginTop: 6,
          }}>
            Daily Time Record System
          </p>
        </div>

        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 32,
        }}>
          <div style={{
            fontFamily: 'Segoe UI, sans-serif',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: C.muted,
            marginBottom: 24,
          }}>
            Admin Login
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@logyx.com"
                required
                autoFocus
                style={{
                  width: '100%',
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: C.text,
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 6,
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: C.text,
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
            {error && (
              <div style={{
                background: 'rgba(255,107,53,0.12)',
                border: '1px solid rgba(255,107,53,0.3)',
                borderRadius: 8,
                padding: '10px 14px',
                color: C.warn,
                fontSize: '0.82rem',
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: C.accent,
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: '13px',
                fontFamily: 'Segoe UI, sans-serif',
                fontWeight: 700,
                fontSize: '0.82rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginBottom: 12,
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={closeLogin}
              style={{
                width: '100%',
                background: 'transparent',
                color: C.muted,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '11px',
                fontFamily: 'Segoe UI, sans-serif',
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
