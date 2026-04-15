import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: '✨', title: 'AI-Powered Plans', desc: 'Gemini AI generates a personalized, day-by-day study roadmap just for you.' },
  { icon: '📅', title: 'Day-by-Day Goals', desc: 'Clear daily tasks and milestones to keep you focused and on track.' },
  { icon: '📊', title: 'Track Progress', desc: 'Mark days complete and visualize your learning journey with a progress bar.' },
  { icon: '🚀', title: 'Any Topic, Any Level', desc: 'From beginner to advanced — StudyAI adapts to your current knowledge level.' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section style={{
        minHeight: '90vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '60px 24px',
      }}>
        <div className="badge badge-purple animate-fadeIn" style={{ marginBottom: 24 }}>
          🤖 Powered by Google Gemini AI
        </div>

        <h1 style={{
          fontSize: 'clamp(2.5rem, 7vw, 5rem)',
          fontWeight: 900, lineHeight: 1.1,
          marginBottom: 24, maxWidth: 800,
        }} className="animate-fadeInUp">
          Study Smarter with{' '}
          <span className="gradient-text">AI-Powered</span>{' '}
          Study Plans
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
          color: 'var(--text-secondary)', maxWidth: 600,
          lineHeight: 1.7, marginBottom: 40,
        }} className="animate-fadeInUp">
          Tell our AI your topic, duration, and skill level. Get a complete, structured study plan in seconds. Track your progress day by day.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }} className="animate-fadeInUp">
          {user ? (
            <Link to="/generate" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '14px 32px' }}>
              ✨ Generate a Plan
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '14px 32px' }}>
                🚀 Get Started Free
              </Link>
              <Link to="/login" className="btn btn-secondary" style={{ fontSize: '1.05rem', padding: '14px 32px' }}>
                Login
              </Link>
            </>
          )}
        </div>

        {/* Floating UI Preview */}
        <div className="glass animate-fadeInUp" style={{
          marginTop: 64, padding: '28px 32px', maxWidth: 540, width: '100%',
          textAlign: 'left', boxShadow: 'var(--glow-purple)',
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['#ef4444','#f59e0b','#22c55e'].map(c => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
            ))}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>
            🤖 Generating your plan for <span style={{ color: 'var(--accent-violet)' }}>Machine Learning</span>...
          </div>
          {[
            { day: 'Day 1', title: 'Introduction & Python Basics', pct: '100%' },
            { day: 'Day 2', title: 'NumPy & Pandas Fundamentals', pct: '100%' },
            { day: 'Day 3', title: 'Data Visualization', pct: '60%' },
            { day: 'Day 4', title: 'Supervised Learning Algorithms', pct: '0%' },
          ].map((d, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{d.day} · {d.title}</span>
                <span style={{ color: d.pct === '100%' ? '#86efac' : 'var(--text-muted)' }}>{d.pct}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: d.pct }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 800, marginBottom: 10 }}>
          Everything you need to ace your studies
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 50 }}>
          AI plans, progress tracking, and more — all in one beautiful app.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} className="glass stat-card" style={{ animation: `fadeInUp 0.5s ease ${i * 0.1}s both` }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div className="glass" style={{
          display: 'inline-block', padding: '60px 80px',
          boxShadow: 'var(--glow-purple)', maxWidth: 600, width: '100%',
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>
            Ready to study smarter?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
            Create your first AI study plan in 30 seconds.
          </p>
          <Link to={user ? '/generate' : '/register'} className="btn btn-primary" style={{ fontSize: '1rem', padding: '14px 36px' }}>
            {user ? '✨ Generate a Plan' : '🚀 Start for Free'}
          </Link>
        </div>
      </section>
    </div>
  );
}
