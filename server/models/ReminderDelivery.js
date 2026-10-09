const mongoose = require('mongoose');

const ReminderDeliverySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    localDate: { type: String, required: true },
    status: { type: String, enum: ['sending', 'sent', 'failed'], required: true },
    attempts: { type: Number, default: 1 },
    leaseUntil: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
}, { timestamps: true });

ReminderDeliverySchema.index({ userId: 1, localDate: 1 }, { unique: true });
ReminderDeliverySchema.index({ status: 1, leaseUntil: 1 });
ReminderDeliverySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ReminderDelivery', ReminderDeliverySchema);