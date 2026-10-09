const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCatchUpSchedule } = require('../services/recovery');

const goals = [
    { day: 1, focusTopics: ['Arrays'], tasks: [{ id: 'a', text: 'Study arrays', estimatedMinutes: 30, type: 'learn' }, { id: 'b', text: 'Practice arrays', estimatedMinutes: 30, type: 'practice' }] },
    { day: 2, focusTopics: ['Functions'], tasks: [{ id: 'c', text: 'Study functions', estimatedMinutes: 45, type: 'learn' }] },
];

test('catch-up schedule keeps completed work out of pending tasks and respects daily time cap', () => {
    const proposal = buildCatchUpSchedule({ dailyGoals: goals, completedTaskIds: ['a'], remainingDays: 2, studyHoursPerDay: 1 });
    assert.equal(proposal.pendingTaskCount, 2);
    assert.deepEqual(proposal.completedTasks.map(({ id }) => id), ['a']);
    assert.ok(proposal.revisedDailyGoals.every(({ estimatedMinutes }) => estimatedMinutes <= 60));
    assert.equal(proposal.requiredMinutes, 75);
});

test('catch-up schedule rejects unrealistic total workload', () => {
    assert.throws(
        () => buildCatchUpSchedule({ dailyGoals: goals, remainingDays: 1, studyHoursPerDay: 1 }),
        (error) => error.status === 422 && error.requiredMinutes === 105,
    );
});

test('completed days are preserved and excluded from the new schedule', () => {
    const proposal = buildCatchUpSchedule({ dailyGoals: goals, completedDayNumbers: [1], remainingDays: 1, studyHoursPerDay: 1 });
    assert.equal(proposal.completedTasks.length, 2);
    assert.deepEqual(proposal.revisedDailyGoals[0].tasks.map(({ text }) => text), ['Study functions']);
});

test('measured weak topics are scheduled before lower-priority topics', () => {
    const proposal = buildCatchUpSchedule({ dailyGoals: goals, topicPriorities: ['Functions', 'Arrays'], remainingDays: 2, studyHoursPerDay: 1 });
    assert.match(proposal.revisedDailyGoals[0].tasks[0].text, /functions/i);
});

test('catch-up packer accepts workloads that fit when small tasks fill schedule gaps', () => {
    const proposal = buildCatchUpSchedule({
        dailyGoals: [{ tasks: [40, 40, 20, 20].map((estimatedMinutes, index) => ({ id: `task-${index}`, text: `Task ${index}`, estimatedMinutes })) }],
        remainingDays: 2,
        studyHoursPerDay: 1,
    });
    assert.deepEqual(proposal.revisedDailyGoals.map(({ estimatedMinutes }) => estimatedMinutes), [60, 60]);
});