const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. استدعاء ملفات الـ Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes'); // ضفنا ده

// 2. الـ Middleware
app.use(express.json()); 
app.use(cors()); 

// 3. استخدام الـ Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); // وضفنا ده كمان

// 4. توصيل قاعدة البيانات (MongoDB)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ مبروك يا توني الداتابيز اشتغلت'))
  .catch((err) => console.log('❌ فيه مشكلة في الداتابيز:', err));

// 5. أول Route للتجربة
app.get('/', (req, res) => {
  res.send('السيستم شغال يا ريس.. نورت المنيا!');
});

// 6. تشغيل السيرفر
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 السيرفر قايم على بورت ${PORT}`);
});