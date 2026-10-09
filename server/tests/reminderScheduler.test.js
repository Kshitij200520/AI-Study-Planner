const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_ATTEMPTS } = require('../services/reminderScheduler');
const { getPendingTasksForPlans, isReminderDue } = require('../services/reminderTasks');

test('scheduler policy requires enabled reminders and a due local wall-clock time', () => {
    const now = new Date('2026-06-11T13:30:00Z');
    assert.equal(isReminderDue({ enabled: false, time: '19:00', timezone: 'Asia/Kolkata' }, now), false);
    assert.equal(isReminderDue({ enabled: true, time: '19:00', timezone: 'Asia/Kolkata' }, now), true);
    assert.equal(isReminderDue({ enabled: true, time: '23:00', timezone: 'Asia/Kolkata' }, now), false);
});

test('delivery retry policy is bounded', () => {
    assert.equal(MAX_ATTEMPTS, 3);
});

test('no reminder is emitted when all mapped tasks are complete', () => {
    const plans = [{
        _id: 'p', topic: 'Math', durationDays: 1, startDate: new Date('2026-06-11T00:00:00Z'), createdAt: new Date('2026-06-11T00:00:00Z'),
        completedDayNumbers: [1], completedTaskIds: ['d1'], dailyGoals: [{ tasks: [{ id: 'd1', text: 'Read', estimatedMinutes: 10 }] }],
    }];
    const result = getPendingTasksForPlans(plans, { timezone: 'UTC', now: new Date('2026-06-11T12:00:00Z') });
    assert.equal(result.tasks.length, 0);
});