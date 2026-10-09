import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/useToast';

const defaultTargetDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
};

export default function Syllabus() {
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState(null);
  const [syllabus, setSyllabus] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [targetDate, setTargetDate] = useState(defaultTargetDate);
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(2);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const uploadSyllabus = async (event) => {
    event.preventDefault();
    if (!file) return addToast('Choose a PDF file first.', 'error');
    const body = new FormData();
    body.append('file', file);
    body.append('topic', topic);
    setLoading(true);
    try {
      const response = await api.post('/syllabus/upload', body);
      setSyllabus(response.data);
      setChapters(response.data.chapters);
      if (response.data.textTruncated) addToast('Only the first 60,000 characters were extracted. Review the outline before approving.', 'info');
    } catch (error) {
      addToast(error.response?.data?.error || 'Could not read this PDF.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateChapter = (index, updates) => setChapters((current) => current.map((chapter, chapterIndex) => chapterIndex === index ? { ...chapter, ...updates } : chapter));

  const approveAndGenerate = async () => {
    setLoading(true);
    try {
      await api.put(`/syllabus/${syllabus._id}/approve`, { topic, chapters, targetDate, studyHoursPerDay });
      const response = await api.post(`/syllabus/${syllabus._id}/generate`);
      addToast('Syllabus-aligned plan created.', 'success');
      navigate(`/plan/${response.data._id}`);
    } catch (error) {
      addToast(error.response?.data?.error || 'Could not create a plan from this syllabus.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page syllabus-page">
      <header className="assessment-heading">
        <span className="eyebrow">CURRICULUM IMPORT</span>
        <h1>Build from your syllabus</h1>
        <p>Review the extracted outline before it is used to create a study schedule.</p>
      </header>
      {!syllabus ? (
        <form className="assessment-form glass" onSubmit={uploadSyllabus}>
          <label className="label" htmlFor="syllabus-topic">Subject</label>
          <input id="syllabus-topic" className="input" value={topic} onChange={(event) => setTopic(event.target.value)} minLength={2} maxLength={100} placeholder="e.g. Computer Networks" required />
          <label className="label" htmlFor="syllabus-file">Syllabus PDF (up to 5 MB)</label>
          <input id="syllabus-file" className="input file-input" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Extracting outline…' : 'Upload and extract'}</button>
          <p className="assessment-privacy">Scanned PDFs need OCR; this version extracts selectable PDF text only.</p>
        </form>
      ) : (
        <div className="syllabus-review">
          <div className="syllabus-file glass"><strong>{syllabus.fileName}</strong><span>{chapters.length} extracted sections · Review and correct before approval</span></div>
          <label className="label" htmlFor="subject-edit">Subject</label>
          <input id="subject-edit" className="input" value={topic} onChange={(event) => setTopic(event.target.value)} />
          {chapters.map((chapter, index) => (
            <section className="syllabus-chapter glass" key={`${syllabus._id}-${index}`}>
              <label className="label" htmlFor={`chapter-${index}`}>Chapter {index + 1} title</label>
              <input id={`chapter-${index}`} className="input" value={chapter.title} onChange={(event) => updateChapter(index, { title: event.target.value })} />
              <label className="label" htmlFor={`topics-${index}`}>Topics (one per line)</label>
              <textarea id={`topics-${index}`} className="input syllabus-topics" value={chapter.topics.join('\n')} onChange={(event) => updateChapter(index, { topics: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) })} />
            </section>
          ))}
          <section className="syllabus-settings glass">
            <div><label className="label" htmlFor="target-date">Target completion date (within 30 days)</label><input id="target-date" className="input" type="date" value={targetDate} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} max={new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)} onChange={(event) => setTargetDate(event.target.value)} /></div>
            <div><label className="label" htmlFor="syllabus-hours">Study hours per day</label><input id="syllabus-hours" className="input" type="number" min="0.5" max="12" step="0.5" value={studyHoursPerDay} onChange={(event) => setStudyHoursPerDay(Number(event.target.value))} /></div>
          </section>
          <button className="btn btn-primary" onClick={approveAndGenerate} disabled={loading}>{loading ? 'Building schedule…' : 'Approve outline and create plan'}</button>
        </div>
      )}
    </main>
  );
}