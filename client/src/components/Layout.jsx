import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginOverlay from './LoginOverlay';

const C = {
  bg: '#0a0c10',
  surface: '#111318',
  border: '#252830',
  accent: '#00e5a0',
  muted: '#6b7280',
  out: '#ff6b35',
};

const NAV_PUBLIC = [
  { path: '/scanner', label: 'Scanner',       icon: '⬡' },
  { path: '/leave',   label: 'Leave Request', icon: '🗓' },
];

const NAV_ADMIN = [
  { path: '/records',   label: 'Records',   icon: '◈' },
  { path: '/employees', label: 'Employees', icon: '◉' },
  { path: '/barcodes',  label: 'Barcodes',  icon: '▦' },
  { path: '/leave-evaluation', label: 'Leave Evaluation', icon: '◎' },
];

export default function Layout() {
  const { admin, logout, loginOpen, openLogin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/scanner');
  };

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    borderRadius: 8,
    textDecoration: 'none',
    fontFamily: 'Segoe UI, sans-serif',
    fontWeight: 600,
    fontSize: '0.8rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: isActive ? C.accent : C.muted,
    background: isActive ? 'rgba(0,229,160,0.08)' : 'transparent',
    border: isActive ? '1px solid rgba(0,229,160,0.2)' : '1px solid transparent',
    transition: 'all 0.2s',
  });

  return (
    <>
      {loginOpen && <LoginOverlay />}

      <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
        <aside style={{
          width: 220,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          gap: 4,
          background: C.surface,
          borderRight: `1px solid ${C.border}`,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '4px 12px', marginBottom: 24 }}>
            <img
              src="/logo.png"
              alt="LOGYX"
              style={{ display: 'block', width: '100%', maxWidth: 160, height: 'auto' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {NAV_PUBLIC.map((n) => (
              <NavLink key={n.path} to={n.path} style={linkStyle}>
                <span>{n.icon}</span> {n.label}
              </NavLink>
            ))}
          </div>

          {admin && (
            <>
              <div style={{
                margin: '16px 16px 8px',
                fontSize: '0.6rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: C.muted,
                opacity: 0.5,
              }}>
                Admin
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {NAV_ADMIN.map((n) => (
                  <NavLink key={n.path} to={n.path} style={linkStyle}>
                    <span>{n.icon}</span> {n.label}
                  </NavLink>
                ))}
              </div>
            </>
          )}

          <div style={{ flex: 1 }} />

          {admin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                padding: '10px 16px',
                borderRadius: 8,
                background: 'rgba(0,229,160,0.06)',
                border: '1px solid rgba(0,229,160,0.15)',
                fontSize: '0.72rem',
                color: C.muted,
              }}>
                <div style={{ color: C.accent, fontWeight: 700, marginBottom: 2 }}>
                  {admin.name || admin.email}
                </div>
                Admin
              </div>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: 'rgba(255,107,53,0.08)',
                  border: '1px solid rgba(255,107,53,0.25)',
                  color: C.out,
                  fontFamily: 'Segoe UI, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                ⎋ Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'Segoe UI, sans-serif',
                fontWeight: 600,
                fontSize: '0.8rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: C.muted,
                background: 'rgba(167,139,250,0.06)',
                border: '1px solid rgba(167,139,250,0.2)',
              }}
            >
              🔐 Admin Login
            </button>
          )}
        </aside>

        <main style={{
          flex: 1,
          padding: '32px 36px',
          overflowY: 'auto',
          background: C.bg,
          color: '#e8eaf0',
        }}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
