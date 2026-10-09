const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiRateLimit = require('../middleware/aiRateLimit');
const RevisionItem = require('../models/RevisionItem');
const StudyPlan = require('../models/StudyPlan');
const { requestJson } = require('../services/groq');
const { normalizeAssessment, scoreAssessment } = require('../services/assessment');
const { calculateNextReview } = require('../services/revisionSchedule');

router.use(auth);

router.get('/due', async (req, res) => {
    try {
        const items = await RevisionItem.find({ userId: req.user._id, nextReviewAt: { $lte: new Date() } })
            .sort({ nextReviewAt: 1 }).limit(50).select('planId topic nextReviewAt intervalDays successfulReviews revisionCount');
        res.json(items);
    } catch {
        res.status(500).json({ error: 'Unable to load due revisions.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const item = await RevisionItem.findOne({ _id: req.params.id, userId: req.user._id })
            .select('planId topic nextReviewAt intervalDays successfulReviews revisionCount history');
        if (!item) return res.status(404).json({ error: 'Revision item not found.' });
        res.json(item);
    } catch {
        res.status(400).json({ error: 'Invalid revision item ID.' });
    }
});

router.post('/:id/start', aiRateLimit, async (req, res) => {
    try {
        const item = await RevisionItem.findOne({ _id: req.params.id, userId: req.user._id });
        if (!item) return res.status(404).json({ error: 'Revision item not found.' });
        const plan = await StudyPlan.findOne({ _id: item.planId, userId: req.user._id });
        if (item.nextReviewAt > new Date()) return res.status(409).json({ error: 'This topic is not due for revision yet.', nextReviewAt: item.nextReviewAt });
        if (!plan) return res.status(404).json({ error: 'Study plan not found.' });
        const studyContext = plan.dailyGoals
            .filter((goal) => (goal.focusTopics || []).includes(item.topic))
            .map((goal) => ({ objective: goal.learningObjective, description: goal.description, tasks: goal.tasks }));
        const raw = await requestJson(
            'Generate 5 short retrieval-practice multiple-choice questions about the given revision topic using only the study context. Return JSON {"topic":"...","questions":[{"topic":"...","prompt":"...","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],"correctOptionId":"a","explanation":"..."}]}.',
            JSON.stringify({ topic: item.topic, context: studyContext }),
            3000,
        );
        const quiz = normalizeAssessment(raw);
        item.sessionQuestions = quiz.questions;
        item.sessionStartedAt = new Date();
        await item.save();
        res.json({
            topic: item.topic,
            flashcards: quiz.questions.map((question) => ({
                id: question.id,
                front: question.prompt,
                back: `${question.options.find((option) => option.id === question.correctOptionId).text}\n\n${question.explanation}`,
            })),
            questions: quiz.questions.map(({ id, topic, prompt, options }) => ({ id, topic, prompt, options })),
        });
    } catch (error) {
        res.status(error.status || 502).json({ error: error.status === 503 ? error.message : 'Could not start a revision quiz. Please try again.' });
    }
});

router.post('/:id/complete', async (req, res) => {
    try {
        const item = await RevisionItem.findOne({ _id: req.params.id, userId: req.user._id });
        if (!item) return res.status(404).json({ error: 'Revision item not found.' });
        if (!item.sessionQuestions.length || !item.sessionStartedAt || Date.now() - item.sessionStartedAt.getTime() > 30 * 60 * 1000) {
            return res.status(400).json({ error: 'Revision quiz expired. Start a new session.' });
        }
        const result = scoreAssessment(item.sessionQuestions, req.body.answers);
        const next = calculateNextReview({ accuracy: result.accuracy, successfulReviews: item.successfulReviews });
        item.successfulReviews = next.successfulReviews;
        item.intervalDays = next.intervalDays;
        item.nextReviewAt = next.nextReviewAt;
        item.revisionCount += 1;
        item.history.push({ accuracy: result.accuracy, reviewedAt: new Date(), intervalDays: next.intervalDays });
        item.sessionQuestions = [];
        item.sessionStartedAt = null;
        await item.save();
        res.json({ accuracy: result.accuracy, correct: result.correct, total: result.total, nextReviewAt: item.nextReviewAt, intervalDays: item.intervalDays });
    } catch (error) {
        res.status(400).json({ error: error.message || 'Unable to complete the revision.' });
    }
});

module.exports = router;