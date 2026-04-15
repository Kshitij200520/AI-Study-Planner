import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      addToast('Welcome back! 👋', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.response?.data?.error || 'Login failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-centered">
      <div className="glass auth-card">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
            borderRadius: 14, fontSize: '1.8rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>🧠</div>
          <h1 className="auth-title gradient-text">Welcome Back</h1>
          <p className="auth-subtitle">Login to continue your learning journey</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Email Address</label>
            <input
              className="input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? <><div className="spinner" /> Logging in...</> : '🚀 Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 24, fontSize: '0.9rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>Sign up free</Link>
        </p>
      </div>
    </div>
  );
}
