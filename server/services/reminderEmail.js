const nodemailer = require('nodemailer');
const dns = require('dns');

const lookupIPv4 = (hostname, options, callback) => {
    dns.resolve4(hostname, (err, addresses) => {
        if (err || !addresses || !addresses.length) {
            return dns.lookup(hostname, { ...options, family: 4 }, callback);
        }
        callback(null, addresses[0], 4);
    });
};

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const createTransporterForPort = (port) => {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER;
    const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
    const isGmail = host === 'smtp.gmail.com' || host === 'gmail';

    return nodemailer.createTransport({
        host: isGmail ? 'smtp.gmail.com' : host,
        port,
        secure: port === 465,
        auth: { user, pass },
        lookup: lookupIPv4,
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
    });
};

const createTransporter = () => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        const error = new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.');
        error.status = 503;
        throw error;
    }
    const host = process.env.SMTP_HOST;
    const isGmail = host === 'smtp.gmail.com' || host === 'gmail';
    const port = Number(process.env.SMTP_PORT || (isGmail ? 465 : 587));
    return createTransporterForPort(port);
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
    // Resend HTTPS API (Port 443 - Bypasses cloud SMTP port blocking)
    if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: process.env.SMTP_FROM || 'onboarding@resend.dev',
                to: Array.isArray(to) ? to : [to],
                subject,
                text,
                html,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || data.error?.message || 'Resend API send failed');
        }
        return data;
    }

    // Brevo HTTPS API (Port 443 - Bypasses cloud SMTP port blocking)
    if (process.env.BREVO_API_KEY) {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
            },
            body: JSON.stringify({
                sender: { email: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@studyai.app' },
                to: [{ email: to }],
                subject,
                textContent: text,
                htmlContent: html,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Brevo API send failed');
        }
        return data;
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        const error = new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.');
        error.status = 503;
        throw error;
    }
    const host = process.env.SMTP_HOST;
    const isGmail = host === 'smtp.gmail.com' || host === 'gmail';
    const configuredPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
    const portsToTry = configuredPort
        ? [configuredPort, configuredPort === 465 ? 587 : 465]
        : (isGmail ? [465, 587] : [465, 587]);

    let lastError = null;
    for (const port of portsToTry) {
        const transporter = createTransporterForPort(port);
        try {
            return await transporter.sendMail({
                from: process.env.SMTP_FROM || process.env.SMTP_USER,
                to,
                subject,
                text,
                html,
            });
        } catch (err) {
            lastError = err;
            console.warn(`SMTP send attempt on port ${port} failed: ${err.message}. Trying fallback port...`);
        } finally {
            transporter.close();
        }
    }
    throw lastError || new Error('All SMTP connection attempts failed.');
};

module.exports = { escapeHtml, createTransporter, buildReminderEmail, sendMail };