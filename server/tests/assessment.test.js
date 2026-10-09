const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAssessment, toPublicAssessment, scoreAssessment } = require('../services/assessment');

const sourceAssessment = {
    topic: 'JavaScript',
    questions: [
        { topic: 'Variables', prompt: 'Which keyword is block scoped?', options: [{ id: 'a', text: 'var' }, { id: 'b', text: 'let' }], correctOptionId: 'b', explanation: 'let is block scoped.' },
        { topic: 'Variables', prompt: 'Which declares a constant?', options: [{ id: 'a', text: 'const' }, { id: 'b', text: 'var' }], correctOptionId: 'a', explanation: 'const declares a binding that cannot be reassigned.' },
        { topic: 'Functions', prompt: 'How do you declare an arrow function?', options: [{ id: 'a', text: '() =>' }, { id: 'b', text: 'function =>' }], correctOptionId: 'a', explanation: 'Arrow functions use the => token.' },
    ],
};

test('public assessment omits answer keys and explanations', () => {
    const normalized = normalizeAssessment(sourceAssessment);
    const visible = JSON.stringify(toPublicAssessment(normalized));
    assert.equal(visible.includes('correctOptionId'), false);
    assert.equal(visible.includes('explanation'), false);
});

test('scores answers deterministically by topic and exposes explanations only after scoring', () => {
    const normalized = normalizeAssessment(sourceAssessment);
    const result = scoreAssessment(normalized.questions, [
        { questionId: 'q1', optionId: 'b' },
        { questionId: 'q2', optionId: 'b' },
        { questionId: 'q3', optionId: 'a' },
    ]);

    assert.equal(result.accuracy, 67);
    assert.deepEqual(result.strengths, ['Functions']);
    assert.deepEqual(result.needsWork, ['Variables']);
    assert.equal(result.topics.find(({ topic }) => topic === 'Variables').accuracy, 50);
    assert.equal(result.answers[1].explanation, 'const declares a binding that cannot be reassigned.');
});

test('rejects duplicate answers and malformed answer keys', () => {
    const normalized = normalizeAssessment(sourceAssessment);
    assert.throws(() => scoreAssessment(normalized.questions, [
        { questionId: 'q1', optionId: 'b' },
        { questionId: 'q1', optionId: 'a' },
        { questionId: 'q3', optionId: 'a' },
    ]), /invalid or duplicated/);

    assert.throws(() => normalizeAssessment({ ...sourceAssessment, questions: sourceAssessment.questions.map((question, index) => index ? question : { ...question, correctOptionId: 'missing' }) }), /invalid answer key/);
});