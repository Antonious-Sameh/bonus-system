const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true }, // الموبايل هو المفتاح
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'customer'], default: 'customer' }, // عشان نفرق بين صاحب المحل والزبون
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);