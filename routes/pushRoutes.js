const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const User = require("../models/User");

// ── إعداد VAPID Keys ──
// اتولدت مرة واحدة وبنحطها في .env
// لو مش موجودة في .env بنستخدم قيم تجريبية (لازم تولد الـ keys الحقيقية)
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@nsrlbryia.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

// 1. إرجاع الـ Public Key للفرونت اند
router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC });
});

// 2. حفظ subscription للعميل
router.post("/subscribe/:phone", async (req, res) => {
  try {
    const { subscription } = req.body;
    const { phone } = req.params;

    if (!subscription) {
      return res.status(400).json({ message: "الـ subscription مطلوبة" });
    }

    await User.findOneAndUpdate(
      { phone },
      { pushSubscription: subscription }
    );

    res.json({ message: "تم حفظ الـ subscription بنجاح" });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ message: "فشل في حفظ الـ subscription" });
  }
});

// 3. إرسال notification لعميل معين (بيتنادى من add-points)
const sendNotificationToUser = async (phone, payload) => {
  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

    const user = await User.findOne({ phone });
    if (!user || !user.pushSubscription) return;

    await webpush.sendNotification(
      user.pushSubscription,
      JSON.stringify(payload)
    );
  } catch (error) {
    // لو الـ subscription انتهت صلاحيتها نمسحها
    if (error.statusCode === 410 || error.statusCode === 404) {
      await User.findOneAndUpdate({ phone }, { pushSubscription: null });
    }
    console.error("Push error:", error.message);
  }
};

module.exports = { router, sendNotificationToUser };