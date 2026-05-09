const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { sendNotificationToUser } = require("./pushRoutes");

// 1. إضافة نقاط لعميل
router.post("/add-points", async (req, res) => {
  try {
    const { phone, amount, note } = req.body;

    const user = await User.findOne({ phone });
    if (!user)
      return res.status(404).json({ message: "الزبون ده مش متسجل عندنا يا ريس" });

    const pointsToAdd = Math.floor(amount / 10);
    user.points += pointsToAdd;
    await user.save();

    const newTransaction = new Transaction({
      customerId: user._id,
      amount: amount,
      pointsAdded: pointsToAdd,
      note: note || "عملية شراء",
    });
    await newTransaction.save();

    await sendNotificationToUser(phone, {
      title: "🎉 نسر البرية — نقاط جديدة!",
      body: `تم إضافة ${pointsToAdd} نقطة لحسابك! رصيدك الحالي: ${user.points} نقطة 🦅`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      url: `/customer/${phone}`,
    });

    res.json({
      message: `تم إضافة ${pointsToAdd} نقطة بنجاح لـ ${user.name}`,
      currentPoints: user.points,
    });
  } catch (error) {
    res.status(500).json({ message: "حصل خطأ وأنا بضيف النقاط" });
  }
});

// 2. استبدال نقاط — الأدمن يخصم نقاط من عميل
router.post("/redeem-points", async (req, res) => {
  try {
    const { phone, pointsToRedeem, redeemNote } = req.body;

    if (!phone || !pointsToRedeem || pointsToRedeem <= 0) {
      return res.status(400).json({ message: "بيانات ناقصة أو غير صحيحة" });
    }

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "الزبون مش موجود" });

    if (user.points < pointsToRedeem) {
      return res.status(400).json({
        message: `النقاط مش كفاية! عنده ${user.points} نقطة بس`,
      });
    }

    user.points -= pointsToRedeem;
    await user.save();

    // نسجل العملية كـ transaction بقيمة سالبة
    const newTransaction = new Transaction({
      customerId: user._id,
      amount: -pointsToRedeem,           // سالب عشان استبدال
      pointsAdded: -pointsToRedeem,
      note: redeemNote || `استبدال ${pointsToRedeem} نقطة`,
    });
    await newTransaction.save();

    // notification للعميل
    await sendNotificationToUser(phone, {
      title: "🛍️ نسر البرية — تم الاستبدال!",
      body: `تم خصم ${pointsToRedeem} نقطة من رصيدك. رصيدك الحالي: ${user.points} نقطة`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      url: `/customer/${phone}`,
    });

    res.json({
      message: `تم استبدال ${pointsToRedeem} نقطة بنجاح من ${user.name}`,
      currentPoints: user.points,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "فشل في استبدال النقاط" });
  }
});

// 2. عرض كل الزبائن بالترتيب (Leaderboard) + إحصائيات سريعة
// 2. عرض كل الزبائن بالترتيب (Leaderboard) + إحصائيات سريعة
router.get("/leaderboard", async (req, res) => {
  try {
    // جلب الزبائن - تم إضافة _id و code لضمان ظهور البيانات كاملة
    const users = await User.find({ role: "customer" })
      .sort({ points: -1 })
      .select("name phone points customerCode _id"); // تأكدنا إن الـ ID والكود هيرجعوا

    // حساب مبيعات اليوم
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayTransactions = await Transaction.find({
      date: { $gte: startOfToday },
    });

    const todaySales = todayTransactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      customers: users,
      stats: {
        todaySales: todaySales,
        totalCustomers: users.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "مشكلة في جلب بيانات لوحة التحكم" });
  }
});

// 3. جلب بيانات عميل معين - (تم التعديل هنا لضمان وصول الملاحظات)
router.get("/customer/:phone", async (req, res) => {
  try {
    const phone = req.params.phone;
    const user = await User.findOne({ phone }).select("-password");
    if (!user) return res.status(404).json({ message: "الزبون مش موجود" });

    const allCustomers = await User.find({ role: "customer" }).sort({
      points: -1,
    });
    const rank = allCustomers.findIndex((c) => c.phone === phone) + 1;
    const totalCustomers = allCustomers.length;

    // جلب العمليات مع التأكد من جلب خانة note و pointsAdded
    const transactions = await Transaction.find({ customerId: user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    // تحويل البيانات لشكل يفهمه الـ Frontend بوضوح
    const history = transactions.map((t) => ({
      amount: t.amount,
      pointsAdded: t.pointsAdded,
      note: t.note || "عملية شراء",
      date: t.createdAt || t.date,
    }));

    res.json({ user, history, rank, totalCustomers });
  } catch (error) {
    res.status(500).json({ message: "مشكلة في جلب بيانات الزبون" });
  }
});

// 4. تقرير المبيعات اليومي التفصيلي
router.get("/sales-report", async (req, res) => {
  try {
    // لو الأدمن بعت date نستخدمها، لو لأ نجيب النهارده
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // جلب عمليات اليوم المطلوب (بدون الاستبدال اللي قيمته سالبة)
    const transactions = await Transaction.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      amount: { $gt: 0 }, // بس العمليات الحقيقية مش الاستبدال
    })
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 });

    // جلب عمليات الاستبدال بشكل منفصل
    const redeemTransactions = await Transaction.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      amount: { $lt: 0 },
    })
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 });

    const totalSales  = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalPoints = transactions.reduce((sum, t) => sum + t.pointsAdded, 0);
    const totalRedeem = redeemTransactions.reduce((sum, t) => sum + Math.abs(t.pointsAdded), 0);

    // بيانات الأمس للمقارنة
    const yesterday = new Date(targetDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const yesterdayTx = await Transaction.find({
      createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
      amount: { $gt: 0 },
    });
    const yesterdaySales = yesterdayTx.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      date: targetDate.toISOString(),
      summary: {
        totalSales,
        totalPoints,
        ordersCount: transactions.length,
        totalRedeem,
        yesterdaySales,
      },
      transactions: transactions.map((t) => ({
        id: t._id,
        customerName:  t.customerId ? t.customerId.name  : "زبون غير معروف",
        customerPhone: t.customerId ? t.customerId.phone : "-",
        amount:  t.amount,
        points:  t.pointsAdded,
        note:    t.note,
        time:    t.createdAt,
      })),
      redeemTransactions: redeemTransactions.map((t) => ({
        id: t._id,
        customerName:  t.customerId ? t.customerId.name  : "زبون غير معروف",
        customerPhone: t.customerId ? t.customerId.phone : "-",
        points: Math.abs(t.pointsAdded),
        note:   t.note,
        time:   t.createdAt,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "فشل في تحميل تقرير المبيعات" });
  }
});

// 5. تعديل بيانات زبون (نقاط، اسم، موبايل)
router.put("/update-customer/:id", async (req, res) => {
  try {
    const { name, phone, points, customerCode } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, points, customerCode },
      { new: true }, // عشان يرجعلك البيانات الجديدة بعد التعديل
    );

    if (!updatedUser)
      return res.status(404).json({ message: "الزبون مش موجود" });

    res.json({ message: "تم تحديث البيانات بنجاح", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "فشل في تعديل بيانات الزبون" });
  }
});

// 6. تغيير كلمة سر زبون (من الأدمن)
router.put("/change-password/:id", async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ message: "كلمة السر لازم تكون 4 حروف على الأقل" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: newPassword.trim() },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "الزبون مش موجود" });
    }

    res.json({ message: `تم تغيير كلمة سر ${user.name} بنجاح` });
  } catch (error) {
    console.error("خطأ في تغيير الباسورد:", error);
    res.status(500).json({ message: "فشل في تغيير كلمة السر" });
  }
});

// 7. حذف زبون نهائياً مع تاريخ عملياته
router.delete("/delete-customer/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. حذف الزبون
    const user = await User.findByIdAndDelete(userId);
    if (!user)
      return res.status(404).json({ message: "الزبون مش موجود أصلاً" });

    // 2. حذف كل العمليات المرتبطة بيه عشان ننظف الداتابيز
    await Transaction.deleteMany({ customerId: userId });

    res.json({ message: `تم حذف ${user.name} وكل بياناته بنجاح` });
  } catch (error) {
    res.status(500).json({ message: "فشل في حذف الزبون" });
  }
});

module.exports = router;