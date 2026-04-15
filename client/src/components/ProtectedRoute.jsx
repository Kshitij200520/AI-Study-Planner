import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">🧠</div>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
    </div>
  );

  return user ? children : <Navigate to="/login" replace />;
}
