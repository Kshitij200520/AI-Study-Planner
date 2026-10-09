const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReminderEmail, escapeHtml } = require('../services/reminderEmail');

test('email includes only pending plan tasks, estimates, totals, links, and safe escaped text', () => {
    const message = buildReminderEmail({
        user: { name: '<Ava>', email: 'hidden@example.invalid' },
        pending: {
            date: '2026-06-11',
            tasks: [{ planId: 'plan-1', planName: '<JavaScript>', title: 'Read & practice', estimatedMinutes: 25, overdue: false }],
            overdue: [],
            remainingMinutes: 25,
            tasksWithoutEstimate: 0,
        },
        settings: { timezone: 'UTC', includeOverdue: false },
        now: new Date('2026-06-11T19:00:00Z'),
        dashboardUrl: 'https://study.example',
    });
    assert.match(message.subject, /study plan is waiting/);
    assert.match(message.html, /&lt;Ava&gt;/);
    assert.match(message.html, /&lt;JavaScript&gt;/);
    assert.match(message.html, /Read &amp; practice/);
    assert.match(message.html, /25 minutes/);
    assert.match(message.html, /https:\/\/study\.example\/plan\/plan-1/);
    assert.doesNotMatch(message.html, /hidden@example/);
});

test('HTML escaping blocks markup and quotes in user-provided content', () => {
    assert.equal(escapeHtml('<script a="b">&\'x\'</script>'), '&lt;script a=&quot;b&quot;&gt;&amp;&#39;x&#39;&lt;/script&gt;');
});