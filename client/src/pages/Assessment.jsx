import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/useToast';

const levels = ['Complete Beginner', 'Beginner', 'Intermediate', 'Advanced'];

export default function Assessment() {
  const [searchParams] = useSearchParams();
  const existingPlanId = searchParams.get('planId');
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [topicsInput, setTopicsInput] = useState('');
  const [skillLevel, setSkillLevel] = useState(searchParams.get('level') || 'Beginner');
  const [assessment, setAssessment] = useState(null);
  const [setupError, setSetupError] = useState('');
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adaptationProposal, setAdaptationProposal] = useState(null);
  const [adapting, setAdapting] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const startAssessment = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const topics = topicsInput.split(',').map((value) => value.trim()).filter(Boolean);
      const response = await api.post('/assessments', { topic, topics, skillLevel });
      setAssessment(response.data);
      setSetupError('');
      setResult(null);
      setAnswers({});
    } catch (error) {
      const message = error.response?.data?.error || 'Could not create the assessment.';
      addToast(message, 'error');
      if (message.toLowerCase().includes('groq model') || message.toLowerCase().includes('api key')) setSetupError(message);
    } finally {
      setLoading(false);
    }
  };

  const submitAssessment = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post(`/assessments/${assessment.id}/submit`, {
        answers: assessment.questions.map((question) => ({ questionId: question.id, optionId: answers[question.id] })),
      });
      setAssessment(response.data);
      setResult(response.data.result);
    } catch (error) {
      addToast(error.response?.data?.error || 'Could not submit your answers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const previewAdaptation = async () => {
    setAdapting(true);
    try {
      const response = await api.post(`/planner/${existingPlanId}/adapt/preview`, { assessmentId: assessment.id });
      setAdaptationProposal(response.data);
    } catch (error) {
      addToast(error.response?.data?.error || 'Could not create a revised plan preview.', 'error');
    } finally { setAdapting(false); }
  };

  const approveAdaptation = async () => {
    setAdapting(true);
    try {
      await api.post(`/planner/${existingPlanId}/adapt/approve`, { approvalToken: adaptationProposal.approvalToken });
      addToast('Adaptive schedule approved. Completed work and prior version are preserved.', 'success');
      navigate(`/plan/${existingPlanId}`);
    } catch (error) {
      addToast(error.response?.data?.error || 'Could not approve this revised schedule.', 'error');
    } finally { setAdapting(false); }
  };

  if (result) {
    return (
      <main className="page assessment-page">
        <header className="assessment-heading">
          <span className="eyebrow">DIAGNOSTIC RESULTS</span>
          <h1>{assessment.topic}</h1>
          <p>Evidence from this attempt will be used to tailor your study plan.</p>
        </header>
        <section className="assessment-score glass" aria-label="Assessment score">
          <strong>{result.accuracy}%</strong>
          <span>{result.correct} of {result.total} correct</span>
        </section>
        <section className="topic-results" aria-label="Topic results">
          {result.topics.map((item) => (
            <article className="topic-result glass" key={item.topic}>
              <div><strong>{item.topic}</strong><span>{item.correct}/{item.total} correct</span></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${item.accuracy}%` }} /></div>
              <small>{item.accuracy}% diagnostic accuracy</small>
            </article>
          ))}
        </section>
        <div className="assessment-result-columns">
          <section><h2>Stronger areas</h2>{result.strengths.length ? result.strengths.join(', ') : 'No topic reached 70% in this attempt.'}</section>
          <section><h2>Needs more practice</h2>{result.needsWork.length ? result.needsWork.join(', ') : 'No weak topics identified in this attempt.'}</section>
        </div>
        <div className="assessment-actions">
          {existingPlanId ? <button className="btn btn-primary" onClick={previewAdaptation} disabled={adapting}>{adapting ? 'Preparing revised plan…' : 'Preview changes to existing plan'}</button> : <button className="btn btn-primary" onClick={() => navigate(`/generate?assessmentId=${assessment.id}&topic=${encodeURIComponent(assessment.topic)}&level=${encodeURIComponent(assessment.skillLevel)}`)}>Build my adaptive plan</button>}
          <Link to="/dashboard" className="btn btn-secondary">Dashboard</Link>
        </div>
        {adaptationProposal && <section className="adaptation-preview glass">
          <span className="eyebrow">PROPOSED PLAN UPDATE</span><h2>Review before replacing your schedule</h2><p>{adaptationProposal.explanation}</p>
          <div className="recovery-comparison"><section><h3>Current plan</h3><p>{adaptationProposal.originalDailyGoals.length} days · {adaptationProposal.completedTasks.length} completed tasks will be archived</p></section><section><h3>Diagnostic-based revision</h3><p>{adaptationProposal.revisedDailyGoals.length} days · {result.needsWork.length ? `Focus: ${result.needsWork.join(', ')}` : 'Balanced from measured scores'}</p></section></div>
          <div className="recovery-days">{adaptationProposal.revisedDailyGoals.slice(0, 7).map((day) => <div key={day.day}><strong>Day {day.day}</strong><span>{day.title} · {day.estimatedMinutes}m · {day.focusTopics.join(', ')}</span></div>)}</div>
          {adaptationProposal.revisedDailyGoals.length > 7 && <small>Showing the first 7 days of the {adaptationProposal.revisedDailyGoals.length}-day revised plan.</small>}
          <div className="recovery-actions"><button className="btn btn-primary" onClick={approveAdaptation} disabled={adapting}>Approve revised plan</button><button className="btn btn-secondary" onClick={() => setAdaptationProposal(null)}>Discard preview</button></div>
        </section>}
        <section className="answer-review">
          <h2>Answer review</h2>
          {result.answers.map((answer, index) => {
            const question = assessment.questions.find(({ id }) => id === answer.questionId);
            const correct = question.options.find(({ id }) => id === answer.correctOptionId)?.text;
            return <article key={answer.questionId}><h3>{index + 1}. {question.prompt}</h3><p>{answer.isCorrect ? 'Correct' : `Correct answer: ${correct}`}. {answer.explanation}</p></article>;
          })}
        </section>
      </main>
    );
  }

  if (assessment) {
    return (
      <main className="page assessment-page">
        <header className="assessment-heading">
          <span className="eyebrow">QUICK DIAGNOSTIC</span>
          <h1>{assessment.topic}</h1>
          <p>{assessment.questions.length} questions. Your answers are scored after submission.</p>
        </header>
        <form onSubmit={submitAssessment}>
          {assessment.questions.map((question, index) => (
            <fieldset className="question-panel glass" key={question.id}>
              <legend><span>{String(index + 1).padStart(2, '0')} / {assessment.questions.length}</span> {question.prompt}</legend>
              <small>{question.topic}</small>
              <div className="answer-options">
                {question.options.map((option) => (
                  <label className={`answer-option ${answers[question.id] === option.id ? 'selected' : ''}`} key={option.id}>
                    <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers({ ...answers, [question.id]: option.id })} required />
                    <span>{option.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button className="btn btn-primary" type="submit" disabled={loading || Object.keys(answers).length !== assessment.questions.length}>
            {loading ? 'Scoring assessment…' : 'Submit diagnostic'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="page assessment-page">
      <header className="assessment-heading">
        <span className="eyebrow">START WITH WHAT YOU KNOW</span>
        <h1>Check your starting point</h1>
        <p>A short diagnostic helps the planner focus on topics where your answers show you need more practice.</p>
      </header>
      <form className="assessment-form glass" onSubmit={startAssessment}>
        <label className="label" htmlFor="subject">Subject</label>
        <input id="subject" className="input" value={topic} onChange={(event) => setTopic(event.target.value)} minLength={2} maxLength={100} placeholder="e.g. JavaScript" required />
        <label className="label" htmlFor="topics">Topics <span>(comma separated, optional)</span></label>
        <input id="topics" className="input" value={topicsInput} onChange={(event) => setTopicsInput(event.target.value)} placeholder="Variables, functions, arrays" />
        <label className="label" htmlFor="level">Current knowledge level</label>
        <select id="level" className="input" value={skillLevel} onChange={(event) => setSkillLevel(event.target.value)}>
          {levels.map((level) => <option key={level}>{level}</option>)}
        </select>
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Preparing questions…' : 'Generate diagnostic'}</button>
        <p className="assessment-privacy">Correct answers and explanations remain hidden until you submit.</p>
        {setupError && <p className="assessment-setup-error" role="alert">{setupError}</p>}
      </form>
    </main>
  );
}