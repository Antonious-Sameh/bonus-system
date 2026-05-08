const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  customerCode: { type: String, default: "" },
  role: { type: String, enum: ['admin', 'customer'], default: 'customer' },
  points: { type: Number, default: 0 },
  // حقل لتخزين بيانات الـ Web Push Notification
  pushSubscription: { type: Object, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);