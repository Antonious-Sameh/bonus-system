const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  pointsAdded: { type: Number, required: true },
  // السطر اللي جاي ده هو اللي كان ناقص يا بطل 💡
  note: { type: String, default: "عملية شراء" }, 
  date: { type: Date, default: Date.now }
}, { timestamps: true }); // دي بتعرفنا وقت العملية بالظبط

module.exports = mongoose.model('Transaction', transactionSchema);