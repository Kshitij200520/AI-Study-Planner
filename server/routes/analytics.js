const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const aiRateLimit = require('../middleware/aiRateLimit');
const StudyPlan = require('../models/StudyPlan');
const Assessment = require('../models/Assessment');
const RevisionItem = require('../models/RevisionItem');
const { requestJson } = require('../services/groq');
const { buildAnalytics } = require('../services/analytics');

router.use(auth);

router.get('/', async (req, res) => {
    try {
        const [plans, assessments, revisionsDue] = await Promise.all([
            StudyPlan.find({ userId: req.user._id }).select('durationDays progress dailyGoals completedTaskIds activity'),
            Assessment.find({ userId: req.user._id, status: 'submitted' }).select('status result'),
            RevisionItem.countDocuments({ userId: req.user._id, nextReviewAt: { $lte: new Date() } }),
        ]);
        res.json(buildAnalytics({ plans, assessments, dueRevisions: revisionsDue }));
    } catch {
        res.status(500).json({ error: 'Unable to calculate learning analytics.' });
    }
});

router.post('/summary', aiRateLimit, async (req, res) => {
    try {
        const [plans, assessments, revisionsDue] = await Promise.all([
            StudyPlan.find({ userId: req.user._id }).select('durationDays progress dailyGoals completedTaskIds activity'),
            Assessment.find({ userId: req.user._id, status: 'submitted' }).select('status result'),
            RevisionItem.countDocuments({ userId: req.user._id, nextReviewAt: { $lte: new Date() } }),
        ]);
        const analytics = buildAnalytics({ plans, assessments, dueRevisions: revisionsDue });
        if (!plans.length && !assessments.length) {
            return res.json({ summary: 'Create a study plan and complete a diagnostic assessment to begin building an evidence-based learning summary.' });
        }
        const output = await requestJson(
            'Write one concise, supportive learning progress summary from the supplied data. Distinguish task completion from diagnostic quiz accuracy. Do not infer ability without quiz evidence and do not invent data. Return JSON {"summary":"string"}.',
            JSON.stringify(analytics),
            300,
        );
        if (typeof output.summary !== 'string' || output.summary.trim().length < 8 || output.summary.length > 500) {
            return res.status(502).json({ error: 'AI returned an invalid progress summary.' });
        }
        res.json({ summary: output.summary.trim() });
    } catch (error) {
        console.error('Analytics summary failed:', error.message);
        res.status(error.status || 502).json({ error: error.status === 503 ? error.message : 'Could not create an AI progress summary right now.' });
    }
});

module.exports = router;