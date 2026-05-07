const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  imageUrl: { type: String, default: "" },
  durationDays: { type: Number, default: null }, // عدد أيام العرض (اختياري)
  expiresAt: { type: Date, default: null },       // تاريخ الانتهاء المحسوب
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Offer', offerSchema);