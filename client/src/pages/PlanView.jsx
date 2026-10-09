import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/useToast';

const TutorMarkdown = lazy(() => import('../components/TutorMarkdown'));

const renderTutorContent = (content) => {
  return <Suspense fallback={<p className="tutor-pending">Formatting response…</p>}><TutorMarkdown content={String(content)} /></Suspense>;
};

export default function PlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedDays, setCompletedDays] = useState(new Set());
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());
  const [recoveryProposal, setRecoveryProposal] = useState(null);
  const [remainingDays, setRemainingDays] = useState(7);
  const [dailyHours, setDailyHours] = useState(2);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [tutorMessages, setTutorMessages] = useState([]);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorStyle, setTutorStyle] = useState('beginner');
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorContext, setTutorContext] = useState(null);
  const [tutorError, setTutorError] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [tutorLoading, setTutorLoading] = useState(false);
  const tutorMessagesEndRef = useRef(null);
  const tutorLauncherRef = useRef(null);
  const tutorCloseRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/planner/${id}`)
      .then(res => {
        setPlan(res.data);
        setCompletedTaskIds(new Set(res.data.completedTaskIds || []));
        setRemainingDays(Math.max(1, res.data.durationDays - Math.floor((Date.now() - new Date(res.data.createdAt).getTime()) / 86400000)));
        setDailyHours(res.data.studyHoursPerDay || 2);
        const done = new Set((res.data.completedDayNumbers || []).map((day) => day - 1));
        if (!res.data.completedDayNumbers?.length) {
          const doneDays = Math.round((res.data.progress / 100) * res.data.durationDays);
          for (let i = 0; i < doneDays; i++) done.add(i);
        }
        setCompletedDays(done);
      })
        .catch(() => { addToast('Plan not found.', 'error'); navigate('/dashboard'); })
      .finally(() => setLoading(false));
      }, [id, addToast, navigate]);

      useEffect(() => {
        if (!tutorOpen) return undefined;
        const previousOverflow = document.body.style.overflow;
        const launcher = tutorLauncherRef.current;
        document.body.style.overflow = 'hidden';
        tutorCloseRef.current?.focus();
        const handleKeyDown = (event) => {
          if (event.key === 'Escape') setTutorOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
          document.body.style.overflow = previousOverflow;
          window.removeEventListener('keydown', handleKeyDown);
          launcher?.focus();
        };
      }, [tutorOpen]);

      useEffect(() => {
        if (tutorOpen) tutorMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, [tutorMessages, tutorLoading, tutorOpen]);

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
      const res = await api.put(`/planner/${id}/progress`, {
        progress,
        completedTaskIds: [...completedTaskIds],
        completedDayNumbers: [...completedDays].map((day) => day + 1),
      });
      setPlan(res.data);
      setCompletedTaskIds(new Set(res.data.completedTaskIds || []));
      addToast('Progress saved! 🎉', 'success');
    } catch {
      addToast('Failed to save progress.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewRecovery = async () => {
    setRecoveryLoading(true);
    try {
      const response = await api.post(`/planner/${id}/rebuild/preview`, { remainingDays, studyHoursPerDay: dailyHours });
      setRecoveryProposal(response.data);
    } catch (error) {
      addToast(error.response?.data?.error || 'Could not build a realistic catch-up schedule.', 'error');
    } finally { setRecoveryLoading(false); }
  };

  const approveRecovery = async () => {
    setRecoveryLoading(true);
    try {
      const response = await api.post(`/planner/${id}/rebuild/approve`, { approvalToken: recoveryProposal.approvalToken });
      setPlan(response.data);
      setCompletedDays(new Set());
      setCompletedTaskIds(new Set());
      setRecoveryProposal(null);
      addToast('Revised schedule approved. Previous version is preserved.', 'success');
    } catch (error) {
      addToast(error.response?.data?.error || 'Could not approve the revised plan.', 'error');
    } finally { setRecoveryLoading(false); }
  };

  const askTutor = async (event) => {
    event.preventDefault();
    if (!tutorInput.trim() || tutorLoading) return;
    const message = tutorInput.trim();
    setTutorError('');
    setTutorMessages((current) => [...current, { role: 'user', content: message }]);
    setTutorLoading(true);
    try {
      const response = await api.post(`/tutor/plans/${id}/messages`, {
        message,
        style: tutorStyle,
        ...(tutorContext ? { context: tutorContext } : {}),
        ...(conversationId ? { conversationId } : {}),
      });
      setConversationId(response.data.conversationId);
      setTutorMessages((current) => [...current, { role: 'assistant', content: response.data.reply }]);
      setTutorInput('');
    } catch (error) {
      setTutorError(error.response?.data?.error || 'Tutor request failed. Check your connection and retry.');
      setTutorMessages((current) => current.slice(0, -1));
    } finally { setTutorLoading(false); }
  };

  const openTutor = (context = null, suggestedQuestion = '') => {
    setTutorContext(context);
    setTutorError('');
    if (suggestedQuestion) setTutorInput(suggestedQuestion);
    setTutorOpen(true);
  };

  const setTutorSuggestion = (prompt) => setTutorInput(prompt);

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

      <section className="recovery-panel glass">
        <div className="recovery-heading"><div><span className="eyebrow">PLAN RECOVERY</span><h2>Fallen behind?</h2><p>Preview a realistic schedule for unfinished tasks. Completed work stays in your plan history.</p></div><div className="recovery-actions"><Link to={`/assessment?planId=${id}&topic=${encodeURIComponent(plan.topic)}`} className="btn btn-secondary">Reassess and adapt</Link><Link to="/revisions" className="btn btn-secondary">Due revisions</Link></div></div>
        <div className="recovery-controls">
          <label>Remaining days<input className="input" type="number" min="1" max="30" value={remainingDays} onChange={(event) => setRemainingDays(Number(event.target.value))} /></label>
          <label>Available hours per day<input className="input" type="number" min="0.5" max="12" step="0.5" value={dailyHours} onChange={(event) => setDailyHours(Number(event.target.value))} /></label>
          <button className="btn btn-secondary" onClick={previewRecovery} disabled={recoveryLoading}>{recoveryLoading ? 'Building preview…' : 'Preview rebuild'}</button>
        </div>
        {recoveryProposal && <div className="recovery-preview">
          <p>{recoveryProposal.explanation}</p>
          <div className="recovery-comparison"><section><h3>Current schedule</h3><p>{recoveryProposal.originalDailyGoals.length} days · {recoveryProposal.originalDailyGoals.reduce((sum, day) => sum + (day.tasks || []).length, 0)} tasks</p></section><section><h3>Proposed schedule</h3><p>{recoveryProposal.revisedDailyGoals.length} days · {recoveryProposal.pendingTaskCount} pending tasks · {recoveryProposal.requiredMinutes} minutes</p></section></div>
          <div className="recovery-days">{recoveryProposal.revisedDailyGoals.map((day) => <div key={day.day}><strong>Day {day.day}</strong><span>{day.estimatedMinutes}m · {day.tasks.map((task) => task.text).join('; ') || 'Flexible day'}</span></div>)}</div>
          <div className="recovery-actions"><button className="btn btn-primary" onClick={approveRecovery} disabled={recoveryLoading}>Approve revised schedule</button><button className="btn btn-secondary" onClick={() => setRecoveryProposal(null)}>Discard preview</button></div>
        </div>}
      </section>

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
                <button
                  type="button"
                  className="ask-ai-button"
                  aria-label={`Ask AI about day ${day.day}: ${day.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    const context = { day: day.day, topic: (day.focusTopics || [plan.topic]).join(', '), objective: day.learningObjective || '' };
                    openTutor(context, `Explain Day ${day.day}: ${day.title} in a simple way.`);
                  }}
                ><Sparkles size={15} /> Ask AI</button>
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
              {day.learningObjective && <p className="day-objective"><strong>Objective:</strong> {day.learningObjective}</p>}
              {day.estimatedMinutes && <p className="day-estimate">Planned study time: {day.estimatedMinutes} minutes</p>}

              {day.tasks && day.tasks.length > 0 && (
                <ul className="tasks-list">
                  {day.tasks.map((task, ti) => {
                    const taskId = typeof task === 'string' ? `day-${index + 1}-task-${ti + 1}` : task.id;
                    const taskText = typeof task === 'string' ? task : task.text;
                    return <li key={taskId} className="task-item" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Mark task complete: ${taskText}`}
                        checked={completedTaskIds.has(taskId)}
                        onChange={() => setCompletedTaskIds((previous) => {
                          const next = new Set(previous);
                          next.has(taskId) ? next.delete(taskId) : next.add(taskId);
                          return next;
                        })}
                      />
                      <span style={{ color: 'var(--text-secondary)', textDecoration: completedTaskIds.has(taskId) ? 'line-through' : 'none' }}>{taskText}</span>
                      {typeof task !== 'string' && <small>{task.estimatedMinutes}m · {task.type}</small>}
                      <button
                        type="button"
                        className="ask-task-button"
                        aria-label={`Ask AI about ${taskText}`}
                        onClick={() => openTutor({ day: day.day, topic: (day.focusTopics || [plan.topic]).join(', '), task: taskText, objective: day.learningObjective || '' }, `Help me understand this task: ${taskText}`)}
                      ><Sparkles size={14} /><span>Ask AI</span></button>
                    </li>
                  })}
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

      {plan.versions?.length > 0 && <details className="plan-history glass">
        <summary>Previous plan versions ({plan.versions.length})</summary>
        <div className="plan-version-list">{[...plan.versions].reverse().map((version, versionIndex) => <article key={`${version.revisedAt}-${versionIndex}`}>
          <div><strong>{new Date(version.revisedAt).toLocaleDateString()}</strong><span>{version.progress || 0}% progress · {(version.completedTaskIds || []).length} completed tasks · {(version.completedDayNumbers || []).length} completed days</span></div>
          <p>{version.reason}</p>
          <ul>{(version.dailyGoals || []).slice(0, 5).map((goal) => <li key={`${versionIndex}-${goal.day}`}>Day {goal.day}: {goal.title}</li>)}</ul>
          {(version.dailyGoals || []).length > 5 && <small>Showing the first 5 of {version.dailyGoals.length} prior days.</small>}
        </article>)}</div>
      </details>}

      <button
        type="button"
        className={`tutor-launcher ${tutorOpen ? 'is-open' : ''}`}
        ref={tutorLauncherRef}
        aria-label="Open AI Study Tutor"
        aria-expanded={tutorOpen}
        aria-controls="study-tutor-drawer"
        onClick={() => setTutorOpen(true)}
      ><MessageCircle size={21} /><span>AI Tutor</span></button>

      {tutorOpen && <>
        <button type="button" className="tutor-backdrop" aria-label="Close AI Study Tutor" onClick={() => setTutorOpen(false)} />
        <aside id="study-tutor-drawer" className="tutor-drawer" role="dialog" aria-modal="true" aria-labelledby="tutor-title">
          <header className="tutor-drawer-header">
            <div className="tutor-avatar"><Bot size={21} /></div>
            <div className="tutor-heading-copy"><h2 id="tutor-title">AI Study Tutor</h2><p>Your personal learning assistant</p></div>
            <button type="button" ref={tutorCloseRef} className="tutor-close" aria-label="Close AI Study Tutor" onClick={() => setTutorOpen(false)}><X size={19} /></button>
            <div className="tutor-plan-context"><span>{plan.topic}</span>{tutorContext?.day && <span>Day {tutorContext.day}</span>}{tutorContext?.task && <span className="tutor-context-task">{tutorContext.task}</span>}</div>
          </header>

          <div className="tutor-drawer-controls">
            <label className="sr-only" htmlFor="tutor-style">Explanation style</label>
            <select id="tutor-style" className="input tutor-style" value={tutorStyle} onChange={(event) => setTutorStyle(event.target.value)}>
              <option value="beginner">Beginner-Friendly</option><option value="detailed">Detailed</option><option value="interview">Interview Preparation</option>
            </select>
          </div>

          <div className="tutor-drawer-messages" aria-live="polite" aria-relevant="additions text">
            {!tutorMessages.length && <div className="tutor-empty-state"><div className="tutor-empty-icon"><Sparkles size={20} /></div><h3>What are you learning?</h3><p>Ask a question about {tutorContext?.task ? 'this task' : 'your plan'}, request an example, or get a quick quiz.</p><div className="tutor-suggestions"><button type="button" onClick={() => setTutorSuggestion(tutorContext?.task ? `Explain this task step by step: ${tutorContext.task}` : 'Explain the current topic in simple terms.')}>Explain this topic</button><button type="button" onClick={() => setTutorSuggestion(tutorContext?.task ? `Give me a practical example for: ${tutorContext.task}` : `Give me a practical example about ${plan.topic}.`)}>Give me a practical example</button><button type="button" onClick={() => setTutorSuggestion(tutorContext?.topic ? `Quiz me on ${tutorContext.topic}. Ask one question at a time.` : `Quiz me on ${plan.topic}. Ask one question at a time.`)}>Quiz me on this concept</button></div></div>}
            {tutorMessages.map((message, index) => <article className={`tutor-message ${message.role}`} key={`${message.role}-${index}`}><strong>{message.role === 'user' ? 'You' : 'Tutor'}</strong><div className="tutor-message-content">{renderTutorContent(message.content)}</div></article>)}
            {tutorLoading && <div className="tutor-loading-indicator" role="status"><span /><span /><span /><small>Tutor is thinking</small></div>}
            <div ref={tutorMessagesEndRef} />
          </div>

          <div className="tutor-composer-wrap">
            {tutorError && <div className="tutor-error" role="alert"><span>{tutorError}</span><button type="button" onClick={(event) => askTutor(event)} disabled={tutorLoading || !tutorInput.trim()}>Retry</button></div>}
            <form className="tutor-composer" onSubmit={askTutor}>
              <label className="sr-only" htmlFor="tutor-question">Message the AI tutor</label>
              <textarea id="tutor-question" className="input" value={tutorInput} onChange={(event) => setTutorInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (!tutorLoading && tutorInput.trim()) askTutor(event); } }} maxLength={1200} rows={2} placeholder="Ask about your study plan…" disabled={tutorLoading} />
              <button className="tutor-send" type="submit" aria-label="Send message" disabled={tutorLoading || !tutorInput.trim()}><Send size={17} /></button>
            </form>
            <small className="tutor-composer-hint">Enter to send · Shift+Enter for a new line</small>
          </div>
        </aside>
      </>}
    </div>
  );
}
