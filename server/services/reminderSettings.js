const { validateTimezone } = require('./reminderTasks');

const validateReminderSettings = (value) => {
    if (!value || typeof value.enabled !== 'boolean' || typeof value.includeOverdue !== 'boolean') {
        return { error: 'Reminder toggle settings must be true or false.' };
    }
    if (typeof value.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) {
        return { error: 'Choose a valid reminder time in HH:MM format.' };
    }
    if (typeof value.timezone !== 'string' || value.timezone.length > 80 || !validateTimezone(value.timezone)) {
        return { error: 'Choose a valid timezone.' };
    }
    return { value: { enabled: value.enabled, time: value.time, timezone: value.timezone, includeOverdue: value.includeOverdue } };
};

module.exports = { validateReminderSettings };