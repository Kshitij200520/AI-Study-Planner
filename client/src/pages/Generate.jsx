import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/useToast';

const levels = ['Complete Beginner', 'Beginner', 'Intermediate', 'Advanced'];
const durations = [7, 14, 21, 30];

const suggestions = [
  'Machine Learning', 'Web Development', 'Data Structures & Algorithms',
  'React.js', 'Python Programming', 'SQL & Databases', 'System Design',
  'Computer Networks', 'Operating Systems', 'Digital Marketing',
];

export default function Generate() {
  const [searchParams] = useSearchParams();
  const assessmentId = searchParams.get('assessmentId');
  const [form, setForm] = useState({
    topic: searchParams.get('topic') || '',
    durationDays: 14,
    currentKnowledgeLevel: searchParams.get('level') || 'Beginner',
    studyHoursPerDay: 2,
    examDate: '',
  });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.topic.trim()) return addToast('Please enter a topic!', 'error');
    setLoading(true);
    try {
      addToast('🤖 AI is generating your plan... this may take a few seconds', 'info');
      const res = await api.post('/planner/generate', { ...form, ...(assessmentId ? { assessmentId } : {}) });
      addToast('🎉 Study plan created!', 'success');
      navigate(`/plan/${res.data._id}`);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to generate plan. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 40 }}>
      <div className="glass generate-card" style={{ width: '100%', animation: 'fadeInUp 0.5s ease' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>✨</div>
          <h1 className="generate-title gradient-text">Generate AI Study Plan</h1>
          <p className="generate-subtitle">
            Tell us what you want to learn. Groq AI will craft a personalized roadmap{assessmentId ? ' using your diagnostic results' : ''}.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Topic */}
          <div className="form-group">
            <label className="label">📚 Topic / Subject</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Machine Learning, JavaScript, DBMS..."
              value={form.topic}
              onChange={e => setForm({ ...form, topic: e.target.value })}
              required
            />
            {/* Suggestion chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {suggestions.map(s => (
                <button
                  key={s} type="button"
                  onClick={() => setForm({ ...form, topic: s })}
                  style={{
                    padding: '5px 12px', borderRadius: 999, border: '1px solid var(--border)',
                    background: form.topic === s ? 'rgba(124,58,237,0.2)' : 'transparent',
                    borderColor: form.topic === s ? 'var(--accent-violet)' : 'var(--border)',
                    color: form.topic === s ? '#c4b5fd' : 'var(--text-secondary)',
                    fontSize: '0.8rem', cursor: 'pointer', transition: 'var(--transition)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="study-hours">Available study time per day</label>
            <input
              id="study-hours"
              className="input"
              type="number"
              min="0.5"
              max="12"
              step="0.5"
              value={form.studyHoursPerDay}
              onChange={(e) => setForm({ ...form, studyHoursPerDay: Number(e.target.value) })}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="exam-date">Exam date (optional)</label>
            <input
              id="exam-date"
              className="input"
              type="date"
              min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
              value={form.examDate}
              onChange={(e) => setForm({ ...form, examDate: e.target.value })}
            />
          </div>

          {/* Duration */}
          <div className="form-group">
            <label className="label">📅 Study Duration</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {durations.map(d => (
                <button
                  key={d} type="button"
                  onClick={() => setForm({ ...form, durationDays: d })}
                  style={{
                    padding: '14px 0', borderRadius: 10, border: '1px solid',
                    borderColor: form.durationDays === d ? 'var(--accent-violet)' : 'var(--border)',
                    background: form.durationDays === d ? 'rgba(124,58,237,0.2)' : 'var(--bg-card)',
                    color: form.durationDays === d ? '#c4b5fd' : 'var(--text-secondary)',
                    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div className="form-group">
            <label className="label">🎯 Current Knowledge Level</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {levels.map(l => (
                <button
                  key={l} type="button"
                  onClick={() => setForm({ ...form, currentKnowledgeLevel: l })}
                  style={{
                    padding: '14px 0', borderRadius: 10, border: '1px solid',
                    borderColor: form.currentKnowledgeLevel === l ? 'var(--accent-cyan)' : 'var(--border)',
                    background: form.currentKnowledgeLevel === l ? 'rgba(6,182,212,0.15)' : 'var(--bg-card)',
                    color: form.currentKnowledgeLevel === l ? '#67e8f9' : 'var(--text-secondary)',
                    fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="glass" style={{ padding: '16px 20px', marginBottom: 24, borderColor: 'rgba(139,92,246,0.2)' }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              🤖 Generating a <strong style={{ color: '#c4b5fd' }}>{form.durationDays}-day</strong> plan for{' '}
              <strong style={{ color: '#c4b5fd' }}>"{form.topic || 'your topic'}"</strong>{' '}
              for a <strong style={{ color: '#67e8f9' }}>{form.currentKnowledgeLevel}</strong> learner.
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1.05rem' }}
            disabled={loading}
          >
            {loading
              ? <><div className="spinner" /> AI is thinking...</>
              : '✨ Generate My Study Plan'}
          </button>
        </form>
      </div>
    </div>
  );
}
