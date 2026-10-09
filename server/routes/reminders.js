const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiRateLimit = require('../middleware/aiRateLimit');
const User = require('../models/User');
const StudyPlan = require('../models/StudyPlan');
const { getPendingTasksForPlans, getLocalDateParts, validateTimezone } = require('../services/reminderTasks');
const { validateReminderSettings } = require('../services/reminderSettings');
const { sendMail, escapeHtml } = require('../services/reminderEmail');

router.use(auth);

const getSettings = (user) => ({
    enabled: Boolean(user.reminderSettings?.enabled),
    time: user.reminderSettings?.time || '19:00',
    timezone: user.reminderSettings?.timezone || 'UTC',
    includeOverdue: Boolean(user.reminderSettings?.includeOverdue),
    lastTestEmailAt: user.reminderSettings?.lastTestEmailAt || null,
});

router.get('/settings', async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('reminderSettings');
        if (!user) return res.status(404).json({ error: 'Account not found.' });
        const settings = getSettings(user);
        const now = new Date();
        const local = new Intl.DateTimeFormat('en-GB', { timeZone: settings.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
        const dueToday = settings.enabled && local >= settings.time;
        const date = getLocalDateParts(now, settings.timezone).key;
        res.json({ ...settings, nextReminder: !settings.enabled ? null : dueToday ? 'Next scheduler check (may be today)' : `${date} ${settings.time} (${settings.timezone})` });
    } catch {
        res.status(500).json({ error: 'Unable to load reminder settings.' });
    }
});

router.put('/settings', async (req, res) => {
    const validation = validateReminderSettings(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });
    const { enabled, time, timezone, includeOverdue } = validation.value;
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { 'reminderSettings.enabled': enabled, 'reminderSettings.time': time, 'reminderSettings.timezone': timezone, 'reminderSettings.includeOverdue': includeOverdue } },
            { returnDocument: 'after', runValidators: true, select: 'reminderSettings' },
        );
        if (!user) return res.status(404).json({ error: 'Account not found.' });
        res.json(getSettings(user));
    } catch {
        res.status(500).json({ error: 'Unable to save reminder settings.' });
    }
});

router.get('/pending-tasks', async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('reminderSettings');
        if (!user) return res.status(404).json({ error: 'Account not found.' });
        const settings = getSettings(user);
        const timezone = typeof req.query.timezone === 'string' ? req.query.timezone : settings.timezone;
        if (!validateTimezone(timezone)) return res.status(400).json({ error: 'Choose a valid timezone.' });
        const plans = await StudyPlan.find({ userId: req.user._id, $or: [{ startDate: { $lte: new Date() } }, { startDate: { $exists: false } }] }).select('topic durationDays dailyGoals startDate createdAt completedTaskIds completedDayNumbers progress');
        res.json(getPendingTasksForPlans(plans, { timezone, includeOverdue: settings.includeOverdue }));
    } catch {
        res.status(500).json({ error: 'Unable to inspect pending study tasks.' });
    }
});

router.post('/test-email', aiRateLimit, async (req, res) => {
    try {
        const cooldownMs = 2 * 60 * 1000; // 2 minutes cooldown
        const windowStart = new Date(Date.now() - cooldownMs);
        const user = await User.findById(req.user._id).select('name email reminderSettings.lastTestEmailAt');
        if (!user) return res.status(404).json({ error: 'Account not found.' });

        const lastTestEmailAt = user.reminderSettings?.lastTestEmailAt || null;
        if (lastTestEmailAt && lastTestEmailAt > windowStart) {
            const remainingSec = Math.max(1, Math.ceil((lastTestEmailAt.getTime() - windowStart.getTime()) / 1000));
            return res.status(429).json({ error: `A test email was requested recently. Please wait ${remainingSec} seconds before trying again.` });
        }

        await sendMail({
            to: user.email,
            subject: 'StudyAI reminder email test',
            text: `Hi ${user.name},\n\nYour StudyAI reminder email is configured correctly. Daily reminders are sent only when pending study tasks are found.`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;padding:24px;border:1px solid #e9e5f0;border-radius:12px"><p style="color:#6841c6;font-weight:bold">STUDYAI · EMAIL TEST</p><h1 style="font-size:22px;color:#211c32">Your email is connected</h1><p style="color:#575268;line-height:1.6">Hi ${escapeHtml(user.name)}, StudyAI can send your daily pending-task reminders. This was a test; no study activity was included.</p><a href="${String(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/settings/reminders" style="color:#6841c6">Reminder settings</a></div>`,
        });

        await User.findByIdAndUpdate(req.user._id, { $set: { 'reminderSettings.lastTestEmailAt': new Date() } });

        res.json({ message: 'Test email sent to your account email address.' });
    } catch (error) {
        console.error('Reminder test email failed:', error.message);
        res.status(error.status || 502).json({ error: error.status === 503 ? error.message : `Could not send test email: ${error.message}` });
    }
});

module.exports = router;