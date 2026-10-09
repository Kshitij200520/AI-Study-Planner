const revisionIntervals = [1, 3, 7, 14, 30];

const calculateNextReview = ({ accuracy, successfulReviews = 0, now = new Date() }) => {
    if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) throw new Error('Accuracy must be between 0 and 100.');
    const succeeded = accuracy >= 80;
    const nextSuccessfulReviews = succeeded ? successfulReviews + 1 : 0;
    const intervalDays = succeeded
        ? revisionIntervals[Math.min(nextSuccessfulReviews - 1, revisionIntervals.length - 1)]
        : revisionIntervals[0];
    return {
        successfulReviews: nextSuccessfulReviews,
        intervalDays,
        nextReviewAt: new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000),
    };
};

module.exports = { calculateNextReview, revisionIntervals };