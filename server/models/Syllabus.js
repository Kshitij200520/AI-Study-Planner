const mongoose = require('mongoose');

const SyllabusSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, required: true, trim: true },
    fileName: { type: String, required: true },
    extractedText: { type: String, maxlength: 60000 },
    chapters: [{ title: String, topics: [String] }],
    targetDate: { type: Date, default: null },
    studyHoursPerDay: { type: Number, default: 2 },
    status: { type: String, enum: ['review', 'approved', 'planned'], default: 'review' },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyPlan', default: null },
}, { timestamps: true });

SyllabusSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Syllabus', SyllabusSchema);