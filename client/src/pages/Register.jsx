import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      return addToast('Password must be at least 6 characters', 'error');
    }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      addToast('Account created! 🎉', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(err.response?.data?.error || 'Registration failed.', 'error');
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
          <h1 className="auth-title gradient-text">Create Account</h1>
          <p className="auth-subtitle">Join thousands of students learning smarter</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Full Name</label>
            <input className="input" type="text" placeholder="John Doe"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="label">Email Address</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min 6 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? <><div className="spinner" /> Creating account...</> : '✨ Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 24, fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
