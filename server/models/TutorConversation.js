const mongoose = require('mongoose');

const TutorConversationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyPlan', required: true, index: true },
    messages: [{
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true, maxlength: 4000 },
        createdAt: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

TutorConversationSchema.index({ userId: 1, planId: 1, updatedAt: -1 });

module.exports = mongoose.model('TutorConversation', TutorConversationSchema);