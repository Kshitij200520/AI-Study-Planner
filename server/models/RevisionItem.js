const mongoose = require('mongoose');

const RevisionItemSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyPlan', required: true },
    topic: { type: String, required: true, trim: true },
    nextReviewAt: { type: Date, required: true, index: true },
    intervalDays: { type: Number, default: 1 },
    successfulReviews: { type: Number, default: 0 },
    revisionCount: { type: Number, default: 0 },
    sessionQuestions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    sessionStartedAt: { type: Date, default: null },
    history: [{
        accuracy: Number,
        reviewedAt: { type: Date, default: Date.now },
        intervalDays: Number,
    }],
}, { timestamps: true });

RevisionItemSchema.index({ userId: 1, planId: 1, topic: 1 }, { unique: true });
RevisionItemSchema.index({ userId: 1, nextReviewAt: 1 });

module.exports = mongoose.model('RevisionItem', RevisionItemSchema);