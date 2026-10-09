const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateNextReview } = require('../services/revisionSchedule');

test('revision interval increases after consecutive successful reviews', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    assert.equal(calculateNextReview({ accuracy: 80, successfulReviews: 0, now }).intervalDays, 1);
    assert.equal(calculateNextReview({ accuracy: 100, successfulReviews: 1, now }).intervalDays, 3);
    assert.equal(calculateNextReview({ accuracy: 90, successfulReviews: 4, now }).intervalDays, 30);
});

test('a low score resets the interval and successful-review streak', () => {
    const result = calculateNextReview({ accuracy: 79, successfulReviews: 3, now: new Date('2026-01-01T00:00:00Z') });
    assert.equal(result.intervalDays, 1);
    assert.equal(result.successfulReviews, 0);
    assert.equal(result.nextReviewAt.toISOString(), '2026-01-02T00:00:00.000Z');
});