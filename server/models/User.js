const mongoose = require('mongoose');

const ReminderSettingsSchema = new mongoose.Schema({
    enabled: { type: Boolean, default: false },
    time: { type: String, default: '19:00' },
    timezone: { type: String, default: 'UTC' },
    includeOverdue: { type: Boolean, default: false },
    lastTestEmailAt: { type: Date, default: null },
}, { _id: false });

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetOTP: { type: String, default: null },
    resetOTPExpires: { type: Date, default: null },
    reminderSettings: { type: ReminderSettingsSchema, default: () => ({}) },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
