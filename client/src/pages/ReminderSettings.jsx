import { useEffect, useState } from 'react';
import { Bell, Check, Clock3, Mail, Save, Send } from 'lucide-react';
import api from '../utils/api';
import { useToast } from '../context/useToast';

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const fallbackTimezones = ['UTC', 'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
const timezones = [...new Set([...(typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : fallbackTimezones), browserTimezone, 'UTC'])].sort();

const defaults = { enabled: false, time: '19:00', timezone: browserTimezone, includeOverdue: false };

export default function ReminderSettings() {
  const [settings, setSettings] = useState(defaults);
  const [pending, setPending] = useState(null);
  const [nextReminder, setNextReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsResponse, pendingResponse] = await Promise.all([
        api.get('/reminders/settings'),
        api.get('/reminders/pending-tasks'),
      ]);
      setSettings({ ...defaults, ...settingsResponse.data });
      setNextReminder(settingsResponse.data.nextReminder);
      setPending(pendingResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not load reminder settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.put('/reminders/settings', settings);
      setSettings({ ...defaults, ...response.data });
      setNextReminder(response.data.nextReminder || (response.data.enabled ? `Daily at ${response.data.time} (${response.data.timezone})` : null));
      addToast('Reminder settings saved.', 'success');
      const pendingResponse = await api.get('/reminders/pending-tasks');
      setPending(pendingResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not save reminder settings.');
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    setTesting(true);
    setError('');
    try {
      const response = await api.post('/reminders/test-email');
      addToast(response.data.message || 'Test email sent.', 'success');
      await loadSettings();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Could not send a test email.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <main className="page"><div className="glass empty-state">Loading reminder settings…</div></main>;

  return (
    <main className="page reminder-settings-page">
      <header className="assessment-heading">
        <span className="eyebrow">STAY ON TRACK</span>
        <h1>Daily email reminders</h1>
        <p>Get a calm check-in when your scheduled study tasks are still waiting.</p>
      </header>

      <div className="reminder-settings-grid">
        <form className="reminder-settings-form glass" onSubmit={saveSettings}>
          <div className="reminder-setting-toggle">
            <div className="reminder-setting-icon"><Bell size={19} /></div>
            <div><strong>Daily study reminder</strong><small>Only sent when unfinished scheduled tasks are found.</small></div>
            <label className="switch-control" aria-label="Enable daily email reminders">
              <input type="checkbox" checked={settings.enabled} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} />
              <span className="switch-track" />
            </label>
          </div>

          <div className="reminder-form-fields">
            <div className="reminder-field">
              <label className="label" htmlFor="reminder-time"><Clock3 size={14} /> Preferred time</label>
              <input id="reminder-time" className="input" type="time" value={settings.time} onChange={(event) => setSettings({ ...settings, time: event.target.value })} disabled={!settings.enabled} required />
            </div>
            <div className="reminder-field">
              <label className="label" htmlFor="reminder-timezone">Timezone</label>
              <select id="reminder-timezone" className="input" value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} disabled={!settings.enabled}>
                {!timezones.includes(settings.timezone) && <option value={settings.timezone}>{settings.timezone}</option>}
                {timezones.map((timezone) => <option key={timezone} value={timezone}>{timezone.replaceAll('_', ' ')}</option>)}
              </select>
              <small>Detected from this browser: {browserTimezone}</small>
            </div>
          </div>

          <fieldset className="reminder-overdue-fieldset" disabled={!settings.enabled}>
            <legend>Tasks included in reminders</legend>
            <label className={`reminder-choice ${!settings.includeOverdue ? 'selected' : ''}`}>
              <input type="radio" name="overdue" checked={!settings.includeOverdue} onChange={() => setSettings({ ...settings, includeOverdue: false })} />
              <span><strong>Today’s tasks only</strong><small>Keep the reminder focused on today.</small></span>
            </label>
            <label className={`reminder-choice ${settings.includeOverdue ? 'selected' : ''}`}>
              <input type="radio" name="overdue" checked={settings.includeOverdue} onChange={() => setSettings({ ...settings, includeOverdue: true })} />
              <span><strong>Today plus overdue</strong><small>Also include unfinished tasks from earlier scheduled days.</small></span>
            </label>
          </fieldset>

          {error && <p className="reminder-error" role="alert">{error}</p>}
          <div className="reminder-form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : <><Save size={16} /> Save settings</>}</button>
            <button className="btn btn-secondary" type="button" onClick={sendTestEmail} disabled={testing}>{testing ? 'Sending…' : <><Send size={15} /> Send test email</>}</button>
          </div>
          <p className="reminder-email-note"><Mail size={14} /> Test messages are sent to the email on your account. A test is limited to once every 10 minutes.</p>
        </form>

        <aside className="reminder-preview-column">
          <section className="glass reminder-next-card">
            <span className="eyebrow">SCHEDULE</span>
            <h2>{settings.enabled ? 'Reminder schedule' : 'Reminders are off'}</h2>
            <p>{settings.enabled ? nextReminder || `Daily at ${settings.time} (${settings.timezone})` : 'Enable reminders to get a daily pending-task email.'}</p>
            {settings.enabled && <span className="reminder-status"><span /> Active · timezone aware</span>}
          </section>

          <section className="glass reminder-pending-card">
            <div className="pending-card-heading"><div><span className="eyebrow">LIVE TASK CHECK</span><h2>Pending tasks</h2></div><button type="button" className="pending-refresh" onClick={loadSettings} aria-label="Refresh pending tasks"><Check size={17} /></button></div>
            {pending ? <>
              <div className="pending-summary"><strong>{pending.tasks.length}</strong><span>pending task{pending.tasks.length === 1 ? '' : 's'}</span><small>{pending.remainingMinutes} estimated min{pending.tasksWithoutEstimate ? ` · ${pending.tasksWithoutEstimate} without estimate` : ''}</small></div>
              {pending.tasks.length ? <ul className="pending-task-list">{pending.tasks.slice(0, 6).map((task, index) => <li key={`${task.planId}-${task.id}-${index}`}><span>{task.title}</span><small>{task.planName}{task.estimatedMinutes ? ` · ${task.estimatedMinutes}m` : ''}{task.overdue ? ' · overdue' : ''}</small></li>)}</ul> : <p className="pending-empty">No incomplete scheduled tasks for this date and timezone.</p>}
              {pending.tasks.length > 6 && <small className="pending-more">And {pending.tasks.length - 6} more</small>}
            </> : <p className="pending-empty">Pending task status is unavailable.</p>}
            {pending && <small className="pending-date">{pending.date} · {pending.timezone}</small>}
          </section>
        </aside>
      </div>
    </main>
  );
}