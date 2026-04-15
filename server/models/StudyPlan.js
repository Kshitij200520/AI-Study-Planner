const mongoose = require('mongoose');

const StudyPlanSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, required: true },
    durationDays: { type: Number, required: true },
    dailyGoals: { type: Array, required: true },
    progress: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('StudyPlan', StudyPlanSchema);
