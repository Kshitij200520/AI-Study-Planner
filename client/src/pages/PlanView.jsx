import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

export default function PlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedDays, setCompletedDays] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/planner/${id}`)
      .then(res => {
        setPlan(res.data);
        // Pre-fill completed days from saved progress
        const done = new Set();
        const total = res.data.durationDays;
        const pct = res.data.progress;
        const doneDays = Math.round((pct / 100) * total);
        for (let i = 0; i < doneDays; i++) done.add(i);
        setCompletedDays(done);
      })
      .catch(() => { addToast('Plan not found.', 'error'); navigate('/dashboard'); })
      .finally(() => setLoading(false));
  }, [id]);

  const toggleDay = (index) => {
    setCompletedDays(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const saveProgress = async () => {
    setSaving(true);
    try {
      const progress = plan.dailyGoals.length
        ? Math.round((completedDays.size / plan.dailyGoals.length) * 100)
        : 0;
      const res = await api.put(`/planner/${id}/progress`, { progress });
      setPlan(res.data);
      addToast('Progress saved! 🎉', 'success');
    } catch {
      addToast('Failed to save progress.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-logo">🧠</div>
      <div className="spinner" />
      <p style={{ color: 'var(--text-secondary)' }}>Loading your plan...</p>
    </div>
  );
  if (!plan) return null;

  const progress = plan.dailyGoals.length
    ? Math.round((completedDays.size / plan.dailyGoals.length) * 100)
    : 0;

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      {/* Back */}
      <Link to="/dashboard" className="btn btn-secondary" style={{ marginBottom: 32, padding: '8px 18px' }}>
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className="plan-header glass" style={{ padding: '32px', marginBottom: 30 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <span className="badge badge-purple">📚 {plan.durationDays} Days</span>
          {progress === 100 && <span className="badge badge-green">✅ Completed!</span>}
          <span className="badge badge-cyan">
            {new Date(plan.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <h1 className="plan-title gradient-text">{plan.topic}</h1>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: 10 }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {completedDays.size} of {plan.dailyGoals.length} days completed
          </span>
          <span style={{ fontWeight: 700, color: 'var(--accent-violet)' }}>{progress}%</span>
        </div>
        <div className="progress-bar" style={{ height: 12, marginBottom: 20 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <button
          className="btn btn-primary"
          onClick={saveProgress}
          disabled={saving}
          style={{ padding: '12px 28px' }}
        >
          {saving ? <><div className="spinner" /> Saving...</> : '💾 Save Progress'}
        </button>
      </div>

      {/* Daily Goals */}
      <div>
        {plan.dailyGoals.map((day, index) => {
          const done = completedDays.has(index);
          return (
            <div
              key={index}
              className={`glass day-card ${done ? 'completed' : ''}`}
              onClick={() => toggleDay(index)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <div className="day-header">
                <div>
                  <div className="day-number">Day {day.day}</div>
                  <div className="day-title">{day.title}</div>
                </div>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: `2px solid ${done ? '#22c55e' : 'var(--border)'}`,
                  background: done ? 'rgba(34,197,94,0.2)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', transition: 'var(--transition)',
                  flexShrink: 0,
                }}>
                  {done ? '✅' : ''}
                </div>
              </div>

              <p className="day-desc">{day.description}</p>

              {day.tasks && day.tasks.length > 0 && (
                <ul className="tasks-list">
                  {day.tasks.map((task, ti) => (
                    <li key={ti} className="task-item">
                      <div className="task-dot" />
                      <span style={{ color: 'var(--text-secondary)' }}>{task}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Save */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={saveProgress}
          disabled={saving}
          style={{ padding: '14px 40px', fontSize: '1rem' }}
        >
          {saving ? <><div className="spinner" /> Saving...</> : '💾 Save My Progress'}
        </button>
      </div>
    </div>
  );
}
