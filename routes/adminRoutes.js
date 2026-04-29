const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// 1. إضافة نقاط لعميل (العملية الأساسية) مع إضافة "ملاحظة"
router.post('/add-points', async (req, res) => {
    try {
        const { phone, amount, note } = req.body;

        const user = await User.findOne({ phone });
        if (!user) return res.status(404).json({ message: 'الزبون ده مش متسجل عندنا يا ريس' });

        const pointsToAdd = Math.floor(amount / 10);

        user.points += pointsToAdd;
        await user.save();

        const newTransaction = new Transaction({
            customerId: user._id,
            amount: amount,
            pointsAdded: pointsToAdd,
            note: note || "عملية شراء" 
        });
        await newTransaction.save();

        res.json({ 
            message: `تم إضافة ${pointsToAdd} نقطة بنجاح لـ ${user.name}`,
            currentPoints: user.points 
        });
    } catch (error) {
        res.status(500).json({ message: 'حصل خطأ وأنا بضيف النقاط' });
    }
});

// 2. عرض كل الزبائن بالترتيب (Leaderboard) + إحصائيات سريعة
// 2. عرض كل الزبائن بالترتيب (Leaderboard) + إحصائيات سريعة
router.get('/leaderboard', async (req, res) => {
    try {
        // جلب الزبائن - تم إضافة _id و code لضمان ظهور البيانات كاملة
        const users = await User.find({ role: 'customer' })
                                .sort({ points: -1 })
                                .select('name phone points code _id'); // تأكدنا إن الـ ID والكود هيرجعوا

        // حساب مبيعات اليوم
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const todayTransactions = await Transaction.find({
            date: { $gte: startOfToday }
        });

        const todaySales = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

        res.json({
            customers: users,
            stats: {
                todaySales: todaySales,
                totalCustomers: users.length
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'مشكلة في جلب بيانات لوحة التحكم' });
    }
});

// 3. جلب بيانات عميل معين - (تم التعديل هنا لضمان وصول الملاحظات)
router.get('/customer/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;
        const user = await User.findOne({ phone }).select('-password');
        if (!user) return res.status(404).json({ message: 'الزبون مش موجود' });

        const allCustomers = await User.find({ role: 'customer' }).sort({ points: -1 });
        const rank = allCustomers.findIndex(c => c.phone === phone) + 1;
        const totalCustomers = allCustomers.length;
        
        // جلب العمليات مع التأكد من جلب خانة note و pointsAdded
        const transactions = await Transaction.find({ customerId: user._id })
                                              .sort({ createdAt: -1 })
                                              .limit(10);
        
        // تحويل البيانات لشكل يفهمه الـ Frontend بوضوح
        const history = transactions.map(t => ({
            amount: t.amount,
            pointsAdded: t.pointsAdded,
            note: t.note || "عملية شراء",
            date: t.createdAt || t.date
        }));
        
        res.json({ user, history, rank, totalCustomers });
    } catch (error) {
        res.status(500).json({ message: 'مشكلة في جلب بيانات الزبون' });
    }
});





// 4. تقرير المبيعات اليومي التفصيلي
router.get('/sales-report', async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // جلب كل عمليات اليوم مع اسم الزبون ورقم موبايله
        const transactions = await Transaction.find({
            date: { $gte: startOfToday }
        })
        .populate('customerId', 'name phone') // دي بتجيب بيانات الزبون بدل الـ ID بس
        .sort({ createdAt: -1 });

        const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);
        const totalPoints = transactions.reduce((sum, t) => sum + t.pointsAdded, 0);

        res.json({
            summary: {
                totalSales,
                totalPoints,
                ordersCount: transactions.length
            },
            transactions: transactions.map(t => ({
                id: t._id,
                customerName: t.customerId ? t.customerId.name : "زبون غير معروف",
                customerPhone: t.customerId ? t.customerId.phone : "-",
                amount: t.amount,
                points: t.pointsAdded,
                note: t.note,
                time: t.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'فشل في تحميل تقرير المبيعات' });
    }
});






// 5. تعديل بيانات زبون (نقاط، اسم، موبايل)
router.put('/update-customer/:id', async (req, res) => {
    try {
        const { name, phone, points } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, phone, points },
            { new: true } // عشان يرجعلك البيانات الجديدة بعد التعديل
        );

        if (!updatedUser) return res.status(404).json({ message: 'الزبون مش موجود' });

        res.json({ message: 'تم تحديث البيانات بنجاح', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'فشل في تعديل بيانات الزبون' });
    }
});





// 6. تغيير كلمة سر زبون
router.put('/change-password/:id', async (req, res) => {
    try {
        const { newPassword } = req.body;
        // لو بتستخدم bcrypt لتشفير الباسورد لازم تشفره هنا الأول
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
        
        res.json({ message: 'تم تغيير كلمة السر بنجاح' });
    } catch (error) {
        res.status(500).json({ message: 'فشل في تغيير كلمة السر' });
    }
});









// 7. حذف زبون نهائياً مع تاريخ عملياته
router.delete('/delete-customer/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // 1. حذف الزبون
        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ message: 'الزبون مش موجود أصلاً' });

        // 2. حذف كل العمليات المرتبطة بيه عشان ننظف الداتابيز
        await Transaction.deleteMany({ customerId: userId });

        res.json({ message: `تم حذف ${user.name} وكل بياناته بنجاح` });
    } catch (error) {
        res.status(500).json({ message: 'فشل في حذف الزبون' });
    }
});







module.exports = router;