const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 1. تسجيل عميل جديد (ده الأدمن بس اللي هيستخدمه)
router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;

    // نأكد إن الموبايل مش متسجل قبل كدة
    const userExists = await User.findOne({ phone });
    if (userExists)
      return res.status(400).json({ message: "الرقم ده متسجل قبل كدة يا ريس" });

    const newUser = new User({ name, phone, password, role });
    await newUser.save();

    res.status(201).json({ message: "تم تسجيل العميل بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "حصلت مشكلة في التسجيل" });
  }
});

// 2. تسجيل الدخول (للأدمن والزبون)
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    // بنطبع في الكونسول عشان نراقب العملية (بص على الـ Terminal وأنت بتجرب)
    console.log("محاولة دخول برقم:", phone);

    // بنستخدم trim() عشان نشيل أي مسافات فاضية دخلت غلط
    const user = await User.findOne({ phone: phone.trim() });

    if (!user) {
      console.log("❌ الرقم ده مش موجود في الداتابيز أصلاً");
      return res
        .status(401)
        .json({ message: "البيانات غلط.. المستخدم مش موجود" });
    }

    // بنقارن الباسورد ونشيل المسافات برضو
    if (user.password.toString().trim() !== password.toString().trim()) {
      console.log(
        "❌ الباسورد غلط. اللي في الداتا:",
        user.password,
        "واللي مكتوب:",
        password,
      );
      return res.status(401).json({ message: "الباسورد غلط يا ريس" });
    }

    console.log("✅ نورت يا", user.name);

    res.json({
      message: "نورت المحل يا بطل",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        points: user.points || 0,
      },
    });
  } catch (error) {
    console.error("خطأ سيرفر:", error);
    res.status(500).json({ message: "مشكلة في السيرفر" });
  }
});

module.exports = router;
