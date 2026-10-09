const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeStudyPlan, createPlanPrompt } = require('../services/planner');

const validDay = (day) => ({
    title: `Day ${day}`,
    description: 'Learn and practice a topic.',
    learningObjective: 'Explain the topic in your own words.',
    estimatedMinutes: 60,
    focusTopics: ['Arrays'],
    tasks: [{ text: 'Review arrays', estimatedMinutes: 30, type: 'learn' }, { text: 'Solve an exercise', estimatedMinutes: 30, type: 'practice' }],
});

test('normalizes a complete structured study plan and validates syllabus coverage', () => {
    const result = normalizeStudyPlan({ dailyGoals: [validDay(1), validDay(2)] }, { topic: 'Programming', durationDays: 2, studyHoursPerDay: 1, requiredTopics: ['Arrays'] });
    assert.equal(result.dailyGoals.length, 2);
    assert.equal(result.dailyGoals[0].tasks[0].id, 'day-1-task-1');
    assert.equal(result.dailyGoals[1].estimatedMinutes, 60);
});

test('rejects generated schedules that exceed daily time or omit approved topics', () => {
    const tooLong = validDay(1);
    tooLong.tasks[1].estimatedMinutes = 40;
    assert.throws(() => normalizeStudyPlan({ dailyGoals: [tooLong] }, { topic: 'Programming', durationDays: 1, studyHoursPerDay: 1 }), /exceed the daily plan/);
    assert.throws(() => normalizeStudyPlan({ dailyGoals: [validDay(1)] }, { topic: 'Programming', durationDays: 1, studyHoursPerDay: 1, requiredTopics: ['Functions'] }), /outside the approved syllabus/);
});

test('plan prompts use submitted diagnostic topics only when provided', () => {
    const prompt = createPlanPrompt({ topic: 'Programming', durationDays: 7, skillLevel: 'Beginner', studyHoursPerDay: 2, evidence: { topics: [{ topic: 'Arrays', accuracy: 40 }, { topic: 'Functions', accuracy: 90 }] } });
    assert.match(prompt, /Arrays/);
    assert.match(prompt, /Functions/);
    assert.doesNotMatch(createPlanPrompt({ topic: 'Programming', durationDays: 7, skillLevel: 'Beginner', studyHoursPerDay: 2, evidence: { accuracy: 50 } }), /undefined/);
});