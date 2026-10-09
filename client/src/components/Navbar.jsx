import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="navbar-brand-icon">🧠</div>
        <span className="gradient-text">StudyAI</span>
      </Link>

      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '8px 18px' }}>
              📚 My Plans
            </Link>
            <Link to="/assessment" className="btn btn-secondary" style={{ padding: '8px 18px' }}>
              🎯 Diagnostic
            </Link>
            <Link to="/syllabus" className="btn btn-secondary" style={{ padding: '8px 18px' }}>
              Syllabus
            </Link>
            <Link to="/settings/reminders" className="btn btn-secondary" style={{ padding: '8px 18px' }}>
              Reminders
            </Link>
            <Link to="/generate" className="btn btn-primary" style={{ padding: '8px 18px' }}>
              ✨ Generate Plan
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 18px' }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login"    className="btn btn-secondary" style={{ padding: '8px 18px' }}>Login</Link>
            <Link to="/register" className="btn btn-primary"   style={{ padding: '8px 18px' }}>Get Started</Link>
          </>
        )}
      </div>
    </nav>
  );
}
