import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/auth';
import { useEffect } from 'react';

export default function LoginPage() {
  const { admin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (admin) navigate('/scanner');
  }, [admin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await login(email, password);
      loginSuccess(res.data.token, res.data.admin);
      navigate('/scanner');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', position:'relative', zIndex:1 }}>
      <div style={{ width:'100%', maxWidth:400, padding:'0 20px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:'2.5rem', fontWeight:800,
            color:'var(--accent)', letterSpacing:'0.05em' }}>LOGYX</div>
          <p style={{ color:'var(--muted)', fontSize:'0.75rem', letterSpacing:'0.15em',
            textTransform:'uppercase', marginTop:6 }}>Daily Time Record System</p>
        </div>

        <div style={{ background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:16, padding:32 }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:'0.75rem', fontWeight:700,
            letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--muted)',
            marginBottom:24 }}>Admin Login</div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', fontSize:'0.7rem', color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@logyx.com" required
                style={{ width:'100%', background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:8, padding:'12px 14px', color:'var(--text)', fontSize:'0.9rem',
                  outline:'none' }} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:'0.7rem', color:'var(--muted)',
                textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{ width:'100%', background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:8, padding:'12px 14px', color:'var(--text)', fontSize:'0.9rem',
                  outline:'none' }} />
            </div>
            {error && <div style={{ background:'rgba(255,107,53,0.12)', border:'1px solid rgba(255,107,53,0.3)',
              borderRadius:8, padding:'10px 14px', color:'var(--warn)', fontSize:'0.82rem',
              marginBottom:16 }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ width:'100%', background:'var(--accent)', color:'#000', border:'none',
                borderRadius:8, padding:'13px', fontFamily:'Syne,sans-serif', fontWeight:700,
                fontSize:'0.82rem', letterSpacing:'0.08em', textTransform:'uppercase',
                opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}