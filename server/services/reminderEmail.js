const nodemailer = require('nodemailer');

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const createTransporter = () => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        const error = new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.');
        error.status = 503;
        throw error;
    }
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || 587);

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        family: 4,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });
};

const buildReminderEmail = ({ user, pending, settings, now = new Date(), dashboardUrl }) => {
    const date = new Intl.DateTimeFormat('en-US', { timeZone: settings.timezone, weekday: 'long', month: 'long', day: 'numeric' }).format(now);
    const greeting = escapeHtml(String(user.name || 'there').trim().split(/\s+/)[0]);
    const grouped = new Map();
    for (const task of pending.tasks) {
        if (!grouped.has(task.planId)) grouped.set(task.planId, { name: task.planName, id: task.planId, tasks: [] });
        grouped.get(task.planId).tasks.push(task);
    }
    const sections = [...grouped.values()].map((plan) => `
        <section style="margin:18px 0;padding:16px;border:1px solid #e3def5;border-radius:10px;background:#fbfaff">
          <h2 style="margin:0 0 10px;color:#282044;font-size:17px">${escapeHtml(plan.name)}</h2>
          <ul style="margin:0;padding-left:20px;color:#38344a">
            ${plan.tasks.map((task) => `<li style="margin:9px 0;line-height:1.5">${escapeHtml(task.title)}${task.estimatedMinutes ? ` <span style="color:#69647a">(${task.estimatedMinutes} min)</span>` : ''}${task.overdue ? ' <span style="color:#9a5d21">(overdue)</span>' : ''}</li>`).join('')}
          </ul>
          <a href="${escapeHtml(dashboardUrl)}/plan/${encodeURIComponent(plan.id)}" style="display:inline-block;margin-top:10px;color:#6941c6;font-weight:700">Open this study plan</a>
        </section>`).join('');
    const dateLine = `Your study plans have ${pending.tasks.length} pending task${pending.tasks.length === 1 ? '' : 's'} for ${escapeHtml(date)}${settings.includeOverdue && pending.overdue.length ? `, including ${pending.overdue.length} overdue` : ''}.`;
    const durationLine = pending.tasksWithoutEstimate
        ? `At least ${pending.remainingMinutes} minutes of estimated study time remain; ${pending.tasksWithoutEstimate} task${pending.tasksWithoutEstimate === 1 ? ' has' : 's have'} no saved duration.`
        : `About ${pending.remainingMinutes} minutes of estimated study time remain.`;

    return {
        subject: 'Your StudyAI study plan is waiting for you',
        text: `Hi ${String(user.name || 'there').trim().split(/\s+/)[0]},\n\n${dateLine} ${durationLine}\nYou can start with one small task and continue at your own pace.\n\nOpen your dashboard: ${dashboardUrl}/dashboard\nReminder settings: ${dashboardUrl}/settings/reminders`,
        html: `<!doctype html><html><body style="margin:0;background:#f4f2f9;font-family:Arial,sans-serif;color:#302b42"><main style="max-width:620px;margin:24px auto;padding:28px 22px;background:#fff;border:1px solid #e9e5f0;border-radius:14px"><div style="font-size:13px;font-weight:700;color:#6841c6">STUDYAI · DAILY CHECK-IN</div><h1 style="margin:14px 0 8px;font-size:24px;color:#211c32">Hi ${greeting}, take one small step</h1><p style="line-height:1.6;color:#575268">${dateLine} ${durationLine} You can start with one small task and continue at your own pace.</p>${sections}<p style="margin:22px 0"><a href="${escapeHtml(dashboardUrl)}/dashboard" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#7046cf;color:#fff;text-decoration:none;font-weight:700">Open StudyAI</a></p><footer style="padding-top:16px;border-top:1px solid #ece9f1;color:#797487;font-size:12px;line-height:1.6">This reminder is based on the task completion saved in your StudyAI account. <a href="${escapeHtml(dashboardUrl)}/settings/reminders" style="color:#6841c6">Manage reminder settings</a>.</footer></main></body></html>`,
    };
};

const sendMail = async ({ to, subject, text, html }) => {
    const transporter = createTransporter();
    try {
        return await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html });
    } finally {
        transporter.close();
    }
};

module.exports = { escapeHtml, createTransporter, buildReminderEmail, sendMail };