const test = require('node:test');
const assert = require('node:assert/strict');
const { claimDelivery, sendClaimedReminder, MAX_ATTEMPTS } = require('../services/reminderScheduler');
const { validateReminderSettings } = require('../services/reminderSettings');

const createFakeDeliveryModel = (now = new Date()) => {
    let document = null;
    return {
        async create(input) {
            if (document) {
                const error = new Error('duplicate key');
                error.code = 11000;
                throw error;
            }
            document = { ...input, async save() {} };
            return document;
        },
        async findOneAndUpdate(filter) {
            const retryable = document && document.attempts < MAX_ATTEMPTS && (
                document.status === 'failed' ||
                (document.status === 'sending' && document.leaseUntil <= now)
            );
            if (!retryable || filter.userId !== document.userId || filter.localDate !== document.localDate) return null;
            document.status = 'sending';
            document.attempts += 1;
            document.leaseUntil = new Date(Date.now() + 60_000);
            return document;
        },
        get document() { return document; },
    };
};

test('concurrent claims for the same user/date create only one active delivery', async () => {
    const now = new Date('2026-06-11T19:00:00Z');
    const model = createFakeDeliveryModel(now);
    const claims = await Promise.all([
        claimDelivery('user-1', '2026-06-11', now, model),
        claimDelivery('user-1', '2026-06-11', now, model),
    ]);
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(model.document.attempts, 1);
});

test('failed SMTP delivery marks the record failed so a later claim can retry', async () => {
    const delivery = {
        status: 'sending', attempts: 1, leaseUntil: new Date(Date.now() + 60_000),
        async save() {},
    };
    const result = await sendClaimedReminder({
        delivery,
        user: { _id: 'user-1', name: 'Study User', email: 'user@example.invalid' },
        pending: { tasks: [], remainingMinutes: 0, tasksWithoutEstimate: 0, overdue: [] },
        settings: { timezone: 'UTC', includeOverdue: false },
        now: new Date(),
        send: async () => { throw new Error('SMTP unavailable'); },
    });
    assert.equal(result.status, 'failed');
    assert.equal(delivery.status, 'failed');
    assert.equal(delivery.leaseUntil, null);
    const model = createFakeDeliveryModel();
    const first = await claimDelivery('user-2', '2026-06-11', new Date(), model);
    first.status = 'failed';
    const retry = await claimDelivery('user-2', '2026-06-11', new Date(), model);
    assert.equal(retry.attempts, 2);
});

test('reminder settings validate time, IANA timezone and preference types', () => {
    assert.deepEqual(validateReminderSettings({ enabled: true, time: '19:00', timezone: 'Asia/Kolkata', includeOverdue: false }).value, {
        enabled: true, time: '19:00', timezone: 'Asia/Kolkata', includeOverdue: false,
    });
    assert.match(validateReminderSettings({ enabled: true, time: '25:00', timezone: 'UTC', includeOverdue: false }).error, /time/);
    assert.match(validateReminderSettings({ enabled: true, time: '19:00', timezone: 'No/SuchZone', includeOverdue: false }).error, /timezone/);
    assert.match(validateReminderSettings({ enabled: 'yes', time: '19:00', timezone: 'UTC', includeOverdue: false }).error, /true or false/);
});