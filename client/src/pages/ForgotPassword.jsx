import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/useToast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      addToast('Please enter your email address.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      addToast(res.data.message || 'OTP sent successfully.', 'success');
      if (res.data.demoOtp) {
        addToast(`Demo OTP for testing: ${res.data.demoOtp}`, 'info');
      }
      setOtpSent(true);
    } catch (err) {
      addToast(err.response?.data?.error || 'Unable to send OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      addToast('Please enter the OTP you received.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email,
        otp,
        password: newPassword,
      });
      addToast(res.data.message || 'Password reset successfully.', 'success');
      navigate('/login');
    } catch (err) {
      addToast(err.response?.data?.error || 'Password reset failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-centered">
      <div className="glass auth-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
            borderRadius: 14, fontSize: '1.8rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>🔐</div>
          <h1 className="auth-title gradient-text">Reset Password</h1>
          <p className="auth-subtitle">Enter your email to receive a verification OTP</p>
        </div>

        {!otpSent ? (
          <form onSubmit={handleSendOTP}>
            <div className="form-group">
              <label className="label">Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <><div className="spinner" /> Sending OTP...</> : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="label">Email Address</label>
              <input className="input" type="email" value={email} readOnly />
            </div>

            <div className="form-group">
              <label className="label">OTP</label>
              <input
                className="input"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">New Password</label>
              <input
                className="input"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <><div className="spinner" /> Resetting password...</> : 'Reset Password'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 24, fontSize: '0.9rem' }}>
          Back to{' '}
          <Link to="/login" style={{ color: 'var(--accent-violet)', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
