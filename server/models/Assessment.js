const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, required: true, trim: true },
    selectedTopics: [{ type: String, trim: true }],
    skillLevel: { type: String, required: true },
    status: { type: String, enum: ['in-progress', 'submitted'], default: 'in-progress', index: true },
    questions: [{
        id: { type: String, required: true },
        topic: { type: String, required: true },
        prompt: { type: String, required: true },
        options: [{ id: { type: String, required: true }, text: { type: String, required: true } }],
        correctOptionId: { type: String, required: true },
        explanation: { type: String, required: true },
    }],
    answers: [{ questionId: String, optionId: String }],
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    submittedAt: { type: Date, default: null },
}, { timestamps: true });

AssessmentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Assessment', AssessmentSchema);