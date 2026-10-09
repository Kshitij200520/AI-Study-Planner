const test = require('node:test');
const assert = require('node:assert/strict');
const { getLocalDateParts, getPendingTasksForPlans, isReminderDue, validateTimezone } = require('../services/reminderTasks');

const samplePlan = (overrides = {}) => ({
    _id: 'plan-1',
    topic: 'JavaScript',
    startDate: new Date('2026-06-10T16:00:00Z'),
    createdAt: new Date('2026-06-10T16:00:00Z'),
    durationDays: 3,
    completedTaskIds: [],
    completedDayNumbers: [],
    progress: 0,
    dailyGoals: [
        { tasks: [{ id: 'one', text: 'Read variables', estimatedMinutes: 20 }, { id: 'two', text: 'Practice constants', estimatedMinutes: 30 }] },
        { tasks: [{ id: 'three', text: 'Review scope', estimatedMinutes: 15 }] },
        { tasks: [{ id: 'four', text: 'Functions', estimatedMinutes: 40 }] },
    ],
    ...overrides,
});

test('detects today based on the configured timezone and respects individual task completion', () => {
    const result = getPendingTasksForPlans([samplePlan({ completedTaskIds: ['one'] })], {
        timezone: 'America/Los_Angeles',
        now: new Date('2026-06-11T18:00:00Z'),
    });
    assert.equal(result.date, '2026-06-11');
    assert.deepEqual(result.today.map(({ id }) => id), ['three']);
    assert.equal(result.remainingMinutes, 15);
});

test('does not invent a schedule before start, after duration, or when date mapping is invalid', () => {
    assert.equal(getPendingTasksForPlans([samplePlan()], { timezone: 'UTC', now: new Date('2026-06-09T23:59:00Z') }).tasks.length, 0);
    assert.equal(getPendingTasksForPlans([samplePlan()], { timezone: 'UTC', now: new Date('2026-06-14T00:00:00Z') }).tasks.length, 0);
    assert.equal(getPendingTasksForPlans([samplePlan({ startDate: null, createdAt: null })], { timezone: 'UTC', now: new Date('2026-06-11T12:00:00Z') }).tasks.length, 0);
});

test('overdue mode includes prior incomplete tasks but still excludes completed tasks and days', () => {
    const plan = samplePlan({ completedTaskIds: ['one'], completedDayNumbers: [] });
    const result = getPendingTasksForPlans([plan], { timezone: 'UTC', now: new Date('2026-06-12T12:00:00Z'), includeOverdue: true });
    assert.deepEqual(result.tasks.map(({ id, overdue }) => [id, overdue]), [['two', true], ['three', true], ['four', false]]);
    assert.equal(result.remainingMinutes, 85);
});

test('completed days override any stale individual task list', () => {
    const result = getPendingTasksForPlans([samplePlan({ completedDayNumbers: [2] })], {
        timezone: 'UTC', now: new Date('2026-06-11T12:00:00Z'),
    });
    assert.deepEqual(result.tasks, []);
});

test('calendar day mapping handles DST changes and rejects unsupported timezone IDs', () => {
    assert.equal(getLocalDateParts(new Date('2026-03-08T07:30:00Z'), 'America/New_York').key, '2026-03-08');
    assert.equal(validateTimezone('America/New_York'), true);
    assert.equal(validateTimezone('Not/A_Real_Zone'), false);
    assert.throws(() => getPendingTasksForPlans([], { timezone: 'Not/A_Real_Zone' }), /Invalid timezone/);
});

test('reminder becomes due after the chosen wall-clock time in its timezone', () => {
    const settings = { enabled: true, time: '19:00', timezone: 'Asia/Kolkata' };
    assert.equal(isReminderDue(settings, new Date('2026-06-11T13:29:00Z')), false);
    assert.equal(isReminderDue(settings, new Date('2026-06-11T13:30:00Z')), true);
    assert.equal(isReminderDue({ ...settings, enabled: false }, new Date('2026-06-11T14:00:00Z')), false);
});

test('legacy plans without startDate map from their actual createdAt', () => {
    const result = getPendingTasksForPlans([samplePlan({ startDate: undefined, createdAt: new Date('2026-06-10T16:00:00Z') })], {
        timezone: 'UTC', now: new Date('2026-06-11T12:00:00Z'),
    });
    assert.deepEqual(result.today.map(({ id }) => id), ['three']);
});