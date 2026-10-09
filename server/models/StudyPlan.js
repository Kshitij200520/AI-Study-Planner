const mongoose = require('mongoose');

const StudyPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', default: null },
    topic: { type: String, required: true },
    startDate: { type: Date, default: undefined, index: true },
    durationDays: { type: Number, required: true },
    dailyGoals: { type: Array, required: true },
    studyHoursPerDay: { type: Number, default: 1 },
    examDate: { type: Date, default: null },
    strongTopics: [{ type: String }],
    weakTopics: [{ type: String }],
    versions: [{
        revisedAt: { type: Date, default: Date.now },
        reason: { type: String },
        dailyGoals: { type: Array },
        completedTaskIds: { type: [String], default: [] },
        completedDayNumbers: { type: [Number], default: [] },
        progress: { type: Number, default: 0 },
        assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', default: null },
    }],
    completedTaskIds: { type: [String], default: [] },
    completedDayNumbers: { type: [Number], default: [] },
    archivedCompletedTasks: { type: [mongoose.Schema.Types.Mixed], default: [] },
    activity: [{
        kind: { type: String, enum: ['task', 'day'], required: true },
        itemId: { type: String, required: true },
        topic: { type: String, default: '' },
        completed: { type: Boolean, required: true },
        at: { type: Date, default: Date.now },
    }],
    progress: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('StudyPlan', StudyPlanSchema);
