import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [progressSummary, setProgressSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dueRevisions, setDueRevisions] = useState([]);
  const [reminderSettings, setReminderSettings] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      api.get('/planner').then((res) => setPlans(res.data)),
      api.get('/analytics').then((res) => setAnalytics(res.data)),
      api.get('/revisions/due').then((res) => setDueRevisions(res.data)),
      api.get('/reminders/settings').then((res) => setReminderSettings(res.data)),
      api.post('/analytics/summary').then((res) => setProgressSummary(res.data.summary)),
    ]).finally(() => setLoading(false));
  }, []);

  const totalDays = plans.reduce((sum, p) => sum + p.durationDays, 0);
  const avgProgress = plans.length
    ? Math.round(plans.reduce((sum, p) => sum + p.progress, 0) / plans.length)
    : 0;
  const completed = plans.filter(p => p.progress === 100).length;
  const weeklyMax = Math.max(1, ...(analytics?.weeklyTrend || []).map((day) => day.completedTasks));

  const refreshSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await api.post('/analytics/summary');
      setProgressSummary(response.data.summary);
    } finally {
      setSummaryLoading(false);
    }
  };

  const stats = [
    { icon: '📚', label: 'Total Plans', value: plans.length, color: '#7c3aed' },
    { icon: '📅', label: 'Scheduled Days', value: totalDays, color: '#06b6d4' },
    { icon: '🎯', label: 'Average Plan Progress', value: `${avgProgress}%`, color: '#f59e0b' },
    { icon: '✅', label: 'Completed Plans', value: completed, color: '#22c55e' },
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
        <div className="dashboard-actions">
          <Link to="/syllabus" className="btn btn-secondary">Import syllabus</Link>
          <Link to="/generate" className="btn btn-primary" style={{ padding: '14px 28px' }}>✨ New Study Plan</Link>
        </div>
      </div>

      <section className="intelligence-section">
        <div className="intelligence-heading"><div><span className="eyebrow">LEARNING INTELLIGENCE</span><h2>Progress backed by your activity</h2></div><Link to="/assessment" className="btn btn-secondary">Take diagnostic</Link></div>
        {analytics && <div className="intelligence-grid">
          <article className="glass intelligence-card">
            <h3>Task completion</h3>
            <strong>{analytics.taskCompletion.completed} / {analytics.taskCompletion.total}</strong>
            <p>{analytics.taskCompletion.completedToday} task completions today · {analytics.taskCompletion.completedThisWeek} this week</p>
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${analytics.taskCompletion.accuracyPercent}%` }} /></div>
            <small>Current saved task checklist completion: {analytics.taskCompletion.accuracyPercent}%</small>
          </article>
          <article className="glass intelligence-card">
            <h3>Diagnostic topic accuracy</h3>
            {analytics.quizPerformance.topicPerformance.length ? analytics.quizPerformance.topicPerformance.slice(0, 5).map((item) => <div className="topic-metric" key={item.topic}><span>{item.topic}</span><strong>{item.accuracy}%</strong><div className="progress-bar"><div className="progress-fill" style={{ width: `${item.accuracy}%` }} /></div><small>{item.correct}/{item.total} correct · {item.attempts} attempt{item.attempts === 1 ? '' : 's'}</small></div>) : <p>No submitted diagnostic results yet.</p>}
            <small>Accuracy is from submitted assessment answers, not task completion.</small>
          </article>
          <article className="glass intelligence-card trend-card">
            <h3>Task completions · last 7 days</h3>
            <div className="trend-chart" role="img" aria-label="Daily completed tasks during the past seven days">
              {(analytics.weeklyTrend || []).map((day) => <div className="trend-day" key={day.date} title={`${day.date}: ${day.completedTasks} tasks`}><strong>{day.completedTasks}</strong><div className="trend-bar-track"><div className="trend-bar" style={{ height: `${(day.completedTasks / weeklyMax) * 100}%` }} /></div><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}</small></div>)}
            </div>
            <small>Based on saved task completion events.</small>
          </article>
          <article className="glass intelligence-card">
            <h3>Topics to revisit</h3>
            {analytics.weakTopics.length ? analytics.weakTopics.map((item) => <div className="weak-topic" key={item.topic}><span>{item.topic}</span><strong>{item.accuracy}% accuracy</strong></div>) : <p>{analytics.quizPerformance.submittedAssessments ? 'No topic is below 70% across recorded diagnostics.' : 'Complete a diagnostic to identify topics needing practice.'}</p>}
            <h3 className="revision-title">Revisions due <span>{analytics.revisionsDue}</span></h3>
            {dueRevisions.slice(0, 3).map((item) => <Link className="weak-topic due-topic" to={`/plan/${item.planId}`} key={item._id}><span>{item.topic}</span><strong>Review</strong></Link>)}
            {analytics.revisionsDue > 0 && <Link className="btn btn-secondary" to="/revisions">Open revision queue</Link>}
          </article>
          <article className="glass intelligence-card summary-card">
            <div className="intelligence-heading"><h3>Learning summary</h3><button className="btn btn-secondary" onClick={refreshSummary} disabled={summaryLoading}>{summaryLoading ? 'Updating…' : 'Refresh summary'}</button></div>
            <p>{progressSummary || 'Your summary will appear when available.'}</p>
            <small>{analytics.studyTime.message}</small>
          </article>
        </div>}
      </section>

      {reminderSettings && <section className={`dashboard-reminder-status glass ${reminderSettings.enabled ? 'enabled' : ''}`}>
        <div className="reminder-status-icon"><span /></div>
        <div className="dashboard-reminder-copy"><strong>{reminderSettings.enabled ? 'Daily reminders enabled' : 'Daily reminders are off'}</strong><small>{reminderSettings.enabled ? `Daily at ${reminderSettings.time} · ${reminderSettings.timezone}` : 'Get a reminder when scheduled tasks are still incomplete.'}</small></div>
        <Link to="/settings/reminders" className="btn btn-secondary">Reminder settings</Link>
      </section>}

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
