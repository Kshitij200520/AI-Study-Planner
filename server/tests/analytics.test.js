const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAnalytics } = require('../services/analytics');

test('analytics derive quiz topic estimates and task completion only from stored evidence', () => {
    const now = new Date('2026-05-07T12:00:00Z');
    const data = buildAnalytics({
        now,
        plans: [{ durationDays: 7, progress: 50, completedTaskIds: ['task-1'], dailyGoals: [{ tasks: ['one', 'two'] }], activity: [{ kind: 'task', itemId: 'task-1', topic: 'Arrays', completed: true, at: now }] }],
        assessments: [{ status: 'submitted', result: { topics: [{ topic: 'Arrays', correct: 2, total: 4 }] } }, { status: 'in-progress' }],
        dueRevisions: 1,
    });
    assert.equal(data.taskCompletion.accuracyPercent, 50);
    assert.equal(data.taskCompletion.completedToday, 1);
    assert.equal(data.quizPerformance.submittedAssessments, 1);
    assert.equal(data.masteryEstimates[0].estimatePercent, 50);
    assert.deepEqual(data.weakTopics, [{ topic: 'Arrays', accuracy: 50 }]);
    assert.equal(data.studyTime.tracked, false);
    assert.equal(data.weeklyTrend.length, 7);
});

test('analytics keep empty records empty instead of inventing scores', () => {
    const data = buildAnalytics({ plans: [], assessments: [], dueRevisions: 0, now: new Date('2026-05-07T12:00:00Z') });
    assert.equal(data.plans.total, 0);
    assert.deepEqual(data.masteryEstimates, []);
    assert.deepEqual(data.weakTopics, []);
    assert.equal(data.taskCompletion.accuracyPercent, 0);
});

test('weekly completions count only completion transitions, not uncompletion transitions', () => {
    const now = new Date('2026-05-07T12:00:00Z');
    const data = buildAnalytics({
        now,
        plans: [{ durationDays: 7, progress: 0, completedTaskIds: [], dailyGoals: [{ tasks: ['one'] }], activity: [
            { kind: 'task', itemId: 'one', completed: true, at: now },
            { kind: 'task', itemId: 'one', completed: false, at: new Date(now.getTime() + 1000) },
        ] }],
        assessments: [],
        dueRevisions: 0,
    });
    assert.equal(data.taskCompletion.completedToday, 1);
    assert.equal(data.taskCompletion.completedThisWeek, 1);
});