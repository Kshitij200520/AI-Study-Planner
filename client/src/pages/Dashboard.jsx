import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/planner').then(res => setPlans(res.data)).finally(() => setLoading(false));
  }, []);

  const totalDays = plans.reduce((sum, p) => sum + p.durationDays, 0);
  const avgProgress = plans.length
    ? Math.round(plans.reduce((sum, p) => sum + p.progress, 0) / plans.length)
    : 0;
  const completed = plans.filter(p => p.progress === 100).length;

  const stats = [
    { icon: '📚', label: 'Total Plans', value: plans.length, color: '#7c3aed' },
    { icon: '📅', label: 'Study Days',  value: totalDays,    color: '#06b6d4' },
    { icon: '🎯', label: 'Avg Progress', value: `${avgProgress}%`, color: '#f59e0b' },
    { icon: '✅', label: 'Completed',   value: completed,    color: '#22c55e' },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <div className="badge badge-purple" style={{ marginBottom: 10 }}>
            👋 Welcome back!
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 4 }}>
            Hey, {user?.name?.split(' ')[0]}! 🚀
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Here's an overview of your learning journey.
          </p>
        </div>
        <Link to="/generate" className="btn btn-primary" style={{ padding: '14px 28px' }}>
          ✨ New Study Plan
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="glass stat-card" style={{ animation: `fadeInUp 0.4s ease ${i * 0.08}s both` }}>
            <div className="stat-icon" style={{ background: `${s.color}22` }}>
              {s.icon}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Plans */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 24 }}>My Study Plans</h2>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      ) : plans.length === 0 ? (
        <div className="glass empty-state">
          <div className="empty-icon">📖</div>
          <div className="empty-title">No study plans yet</div>
          <div className="empty-text">Create your first AI-powered study plan and start learning smarter!</div>
          <Link to="/generate" className="btn btn-primary">✨ Generate My First Plan</Link>
        </div>
      ) : (
        <div className="plans-grid">
          {plans.map((plan, i) => (
            <Link
              to={`/plan/${plan._id}`}
              key={plan._id}
              className="glass plan-card"
              style={{ textDecoration: 'none', color: 'inherit', animation: `fadeInUp 0.4s ease ${i * 0.08}s both` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span className="badge badge-purple">📚 {plan.durationDays} days</span>
                {plan.progress === 100 && <span className="badge badge-green">✅ Done</span>}
              </div>
              <div className="plan-topic">{plan.topic}</div>
              <div className="plan-meta" style={{ marginBottom: 16 }}>
                {new Date(plan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                <span>Progress</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-violet)' }}>{plan.progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${plan.progress}%` }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
