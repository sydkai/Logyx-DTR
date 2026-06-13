import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/scanner');
  };

  const linkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 8, textDecoration: 'none',
    fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.8rem',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: isActive ? 'var(--accent)' : 'var(--muted)',
    background: isActive ? 'rgba(0,229,160,0.08)' : 'transparent',
    border: isActive ? '1px solid rgba(0,229,160,0.2)' : '1px solid transparent',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column',
        padding: '24px 16px', gap: 4,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>

        {/* Logo */}
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 800,
          color: 'var(--accent)', letterSpacing: '0.05em',
          padding: '8px 16px', marginBottom: 24,
        }}>
          LOGYX
        </div>

        {/* Public nav — always visible */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_PUBLIC.map(n => (
            <NavLink key={n.path} to={n.path} style={linkStyle}>
              <span>{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </div>

        {/* Admin nav — only visible when logged in */}
        {admin && (
          <>
            <div style={{
              margin: '16px 16px 8px', fontSize: '0.6rem',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              color: 'var(--muted)', opacity: 0.5,
            }}>
              Admin
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NAV_ADMIN.map(n => (
                <NavLink key={n.path} to={n.path} style={linkStyle}>
                  <span>{n.icon}</span> {n.label}
                </NavLink>
              ))}
            </div>
          </>
        )}

        {/* Push login/logout to bottom */}
        <div style={{ flex: 1 }} />

        {/* Bottom: show admin info + logout OR login link */}
        {admin ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Admin badge */}
            <div style={{
              padding: '10px 16px', borderRadius: 8,
              background: 'rgba(0,229,160,0.06)',
              border: '1px solid rgba(0,229,160,0.15)',
              fontSize: '0.72rem', color: 'var(--muted)',
            }}>
              <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 2 }}>
                {admin.name || admin.email}
              </div>
              Admin
            </div>
            {/* Logout */}
            <button onClick={handleLogout} style={{
              padding: '10px 16px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(255,107,53,0.08)',
              border: '1px solid rgba(255,107,53,0.25)',
              color: 'var(--out-color)', fontFamily: 'Syne, sans-serif',
              fontWeight: 700, fontSize: '0.75rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              ⎋ Logout
            </button>
          </div>
        ) : (
          /* Admin Login link — always visible at bottom when logged out */
          <NavLink to="/login" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 8, textDecoration: 'none',
            fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.8rem',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: isActive ? 'var(--accent)' : 'var(--muted)',
            background: 'rgba(167,139,250,0.06)',
            border: '1px solid rgba(167,139,250,0.2)',
            transition: 'all 0.2s',
          })}>
            🔐 Admin Login
          </NavLink>
        )}
      </aside>

      {/* ── Main content area ── */}
      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}