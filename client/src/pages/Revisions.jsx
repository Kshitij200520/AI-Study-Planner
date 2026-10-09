import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/useToast';

export default function Revisions() {
  const [items, setItems] = useState([]);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [revealedCards, setRevealedCards] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  const loadDue = () => api.get('/revisions/due').then((response) => setItems(response.data)).finally(() => setLoading(false));
  useEffect(() => { loadDue(); }, []);

  const start = async (item) => {
    setSubmitting(true);
    try {
      const response = await api.post(`/revisions/${item._id}/start`);
      setSession({ ...response.data, item });
      setAnswers({});
      setResult(null);
      setRevealedCards(new Set());
    } catch (error) {
      addToast(error.response?.data?.error || 'Could not start revision.', 'error');
    } finally { setSubmitting(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post(`/revisions/${session.item._id}/complete`, {
        answers: session.questions.map((question) => ({ questionId: question.id, optionId: answers[question.id] })),
      });
      setResult(response.data);
      await loadDue();
    } catch (error) {
      addToast(error.response?.data?.error || 'Could not score the revision quiz.', 'error');
    } finally { setSubmitting(false); }
  };

  if (session && !result) return (
    <main className="page assessment-page">
      <header className="assessment-heading"><span className="eyebrow">SPACED REVISION</span><h1>{session.topic}</h1><p>Answer the retrieval quiz; your score sets the next review interval.</p></header>
      <section className="flashcard-section"><h2>Flashcards</h2><p>Try recalling each answer, then reveal the back.</p><div className="flashcard-grid">{session.flashcards.map((card, index) => <article className={`flashcard glass ${revealedCards.has(card.id) ? 'revealed' : ''}`} key={card.id}><span className="eyebrow">{revealedCards.has(card.id) ? 'ANSWER' : `CARD ${index + 1}`}</span><p>{revealedCards.has(card.id) ? card.back : card.front}</p><button type="button" className="btn btn-secondary" onClick={() => setRevealedCards((current) => { const next = new Set(current); next.has(card.id) ? next.delete(card.id) : next.add(card.id); return next; })}>{revealedCards.has(card.id) ? 'Hide answer' : 'Reveal answer'}</button></article>)}</div></section>
      <form onSubmit={submit}>
        {session.questions.map((question, index) => <fieldset className="question-panel glass" key={question.id}>
          <legend><span>{index + 1} / {session.questions.length}</span> {question.prompt}</legend>
          {question.options.map((option) => <label className={`answer-option ${answers[question.id] === option.id ? 'selected' : ''}`} key={option.id}>
            <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers({ ...answers, [question.id]: option.id })} required />{option.text}
          </label>)}
        </fieldset>)}
        <button className="btn btn-primary" disabled={submitting || Object.keys(answers).length !== session.questions.length}>{submitting ? 'Scoring…' : 'Finish revision'}</button>
      </form>
    </main>
  );

  if (result) return <main className="page assessment-page">
    <header className="assessment-heading"><span className="eyebrow">REVISION SAVED</span><h1>{result.accuracy}% correct</h1><p>{result.correct} of {result.total} correct. Your next review is in {result.intervalDays} day{result.intervalDays === 1 ? '' : 's'}.</p></header>
    <button className="btn btn-primary" onClick={() => { setSession(null); setResult(null); }}>Back to due revisions</button>
  </main>;

  return <main className="page">
    <header className="assessment-heading"><span className="eyebrow">RETRIEVAL PRACTICE</span><h1>Due for revision</h1><p>Next intervals grow after strong quizzes and return to one day when you need more practice.</p></header>
    {loading ? <div className="glass empty-state">Loading due topics…</div> : items.length ? <div className="revision-list">
      {items.map((item) => <article className="revision-row glass" key={item._id}>
        <div><span className="eyebrow">{item.intervalDays}-DAY INTERVAL</span><h2>{item.topic}</h2><p>{item.revisionCount} completed review sessions</p></div>
        <div className="revision-actions"><Link to={`/plan/${item.planId}`} className="btn btn-secondary">Open plan</Link><button className="btn btn-primary" disabled={submitting} onClick={() => start(item)}>Start quiz</button></div>
      </article>)}
    </div> : <section className="glass empty-state"><h2>No revisions due</h2><p>Complete tasks in a study plan to add topics to your review queue.</p><Link className="btn btn-primary" to="/dashboard">Go to dashboard</Link></section>}
  </main>;
}