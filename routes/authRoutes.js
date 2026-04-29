const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 1. تسجيل عميل جديد (ده الأدمن بس اللي هيستخدمه)
router.post("/register", async (req, res) => {
  try {
    // التعديل هنا: ضفنا customerCode عشان نستلمه من الفرونت إيند
    const { name, phone, password, role, customerCode } = req.body;

    const userExists = await User.findOne({ phone });
    if (userExists)
      return res.status(400).json({ message: "الرقم ده متسجل قبل كدة يا ريس" });

    // التعديل هنا: ضفنا customerCode داخل الـ newUser عشان يتسيف في الداتابيز
    const newUser = new User({ name, phone, password, role, customerCode });
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





// 3. تعديل بيانات الزبون (الاسم، الموبايل، النقاط، والكود)
router.put("/update-customer/:id", async (req, res) => {
  try {
    const { name, phone, points, customerCode } = req.body;

    // بنحدث البيانات بناءً على الـ ID اللي جاي في الـ URL
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, points, customerCode },
      { new: true } // عشان يرجعلك البيانات الجديدة بعد التعديل
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "الزبون ده مش موجود يا ريس" });
    }

    res.json({ message: "تم تحديث البيانات بنجاح", user: updatedUser });
  } catch (error) {
    console.error("خطأ في التعديل:", error);
    res.status(500).json({ message: "حصلت مشكلة وأحنا بنحدث البيانات" });
  }
});

module.exports = router;
