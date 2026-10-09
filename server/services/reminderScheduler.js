const cron = require('node-cron');
const User = require('../models/User');
const StudyPlan = require('../models/StudyPlan');
const ReminderDelivery = require('../models/ReminderDelivery');
const { getPendingTasksForPlans, getLocalDateParts, isReminderDue } = require('./reminderTasks');
const { buildReminderEmail, sendMail } = require('./reminderEmail');

const LEASE_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const MAX_EMAILS_PER_TICK = 100;
let tickInProgress = false;

const claimDelivery = async (userId, localDate, now, deliveryModel = ReminderDelivery) => {
    const leaseUntil = new Date(now.getTime() + LEASE_MS);
    try {
        return await deliveryModel.create({ userId, localDate, status: 'sending', attempts: 1, leaseUntil });
    } catch (error) {
        if (error.code !== 11000) throw error;
    }

    return deliveryModel.findOneAndUpdate(
        {
            userId,
            localDate,
            attempts: { $lt: MAX_ATTEMPTS },
            $or: [
                { status: 'failed' },
                { status: 'sending', leaseUntil: { $lte: now } },
            ],
        },
        { $set: { status: 'sending', leaseUntil, lastError: '' }, $inc: { attempts: 1 } },
        { returnDocument: 'after' },
    );
};

const sendClaimedReminder = async ({ delivery, user, pending, settings, now, send = sendMail }) => {
    try {
        await send({
            to: user.email,
            ...buildReminderEmail({
                user,
                pending,
                settings,
                now,
                dashboardUrl: String(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
            }),
        });
        delivery.status = 'sent';
        delivery.sentAt = new Date();
        delivery.leaseUntil = null;
        delivery.lastError = '';
        await delivery.save();
        return { status: 'sent' };
    } catch (error) {
        delivery.status = 'failed';
        delivery.leaseUntil = null;
        delivery.lastError = String(error.message || 'Email delivery failed').slice(0, 300);
        await delivery.save();
        console.error(`Daily reminder delivery failed for user ${user._id}:`, error.message);
        return { status: 'failed' };
    }
};

const processReminderForUser = async (user, now = new Date()) => {
    const settings = user.reminderSettings || {};
    if (!settings.enabled || !isReminderDue(settings, now)) return { status: 'not-due' };
    const localDate = getLocalDateParts(now, settings.timezone).key;
    const plans = await StudyPlan.find({
        userId: user._id,
        $or: [{ startDate: { $lte: now } }, { startDate: { $exists: false } }],
    }).select('topic durationDays dailyGoals startDate createdAt completedTaskIds completedDayNumbers progress');
    const pending = getPendingTasksForPlans(plans, {
        timezone: settings.timezone,
        now,
        includeOverdue: Boolean(settings.includeOverdue),
    });
    if (!pending.tasks.length) return { status: 'no-tasks', localDate };

    const delivery = await claimDelivery(user._id, localDate, now);
    if (!delivery) return { status: 'already-claimed', localDate };
    try {
        const currentUser = await User.findById(user._id).select('name email reminderSettings');
        if (!currentUser || !currentUser.reminderSettings?.enabled) {
            delivery.status = 'failed';
            delivery.leaseUntil = null;
            delivery.lastError = 'Reminders disabled before delivery.';
            await delivery.save();
            return { status: 'disabled', localDate };
        }
        const sent = await sendClaimedReminder({ delivery, user: currentUser, pending, settings: currentUser.reminderSettings, now });
        return { ...sent, localDate, taskCount: sent.status === 'sent' ? pending.tasks.length : undefined };
    } catch (error) {
        delivery.status = 'failed';
        delivery.leaseUntil = null;
        delivery.lastError = String(error.message || 'Email delivery failed').slice(0, 300);
        await delivery.save();
        console.error(`Daily reminder delivery failed for user ${user._id}:`, error.message);
        return { status: 'failed', localDate };
    }
};

const runReminderTick = async (now = new Date()) => {
    if (tickInProgress) return [];
    tickInProgress = true;
    try {
        return await runReminderTickOnce(now);
    } finally {
        tickInProgress = false;
    }
};

const runReminderTickOnce = async (now) => {
    const users = await User.find({ 'reminderSettings.enabled': true })
        .select('name email reminderSettings');
    const results = [];
    let sentThisTick = 0;
    for (const user of users) {
        if (sentThisTick >= MAX_EMAILS_PER_TICK) break;
        try {
            if (!isReminderDue(user.reminderSettings, now)) continue;
            const result = await processReminderForUser(user, now);
            if (result.status === 'sent') sentThisTick += 1;
            results.push({ userId: String(user._id), ...result });
        } catch (error) {
            console.error(`Daily reminder check failed for user ${user._id}:`, error.message);
            results.push({ userId: String(user._id), status: 'failed' });
        }
    }
    return results;
};

const startReminderScheduler = () => {
    if (process.env.REMINDER_SCHEDULER_ENABLED === 'false') {
        console.log('Daily reminder scheduler disabled by configuration');
        return null;
    }
    return cron.schedule('* * * * *', () => {
        runReminderTick().catch((error) => console.error('Daily reminder scheduler tick failed:', error.message));
    });
};

module.exports = { claimDelivery, sendClaimedReminder, processReminderForUser, runReminderTick, startReminderScheduler, MAX_ATTEMPTS };