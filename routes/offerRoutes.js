const express = require("express");
const router = express.Router();
const Offer = require("../models/Offer");

// 1. جلب كل العروض (للعميل والأدمن) - بيشيل المنتهية تلقائياً
router.get("/", async (req, res) => {
  try {
    const now = new Date();
    // بنجيب العروض اللي مش منتهية أو مالهاش تاريخ انتهاء
    const offers = await Offer.find({
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    }).sort({ createdAt: -1 });

    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: "فشل في جلب العروض" });
  }
});

// 2. جلب كل العروض للأدمن (حتى المنتهية)
router.get("/all", async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: "فشل في جلب العروض" });
  }
});

// 3. إضافة عرض جديد (الأدمن بس)
router.post("/", async (req, res) => {
  try {
    const { title, description, imageUrl, durationDays } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "عنوان العرض مطلوب" });
    }

    // لو فيه مدة بنحسب تاريخ الانتهاء
    let expiresAt = null;
    if (durationDays && Number(durationDays) > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(durationDays));
    }

    const newOffer = new Offer({
      title: title.trim(),
      description: description?.trim() || "",
      imageUrl: imageUrl?.trim() || "",
      durationDays: durationDays ? Number(durationDays) : null,
      expiresAt,
    });

    await newOffer.save();
    res.status(201).json({ message: "تم إضافة العرض بنجاح", offer: newOffer });
  } catch (error) {
    res.status(500).json({ message: "فشل في إضافة العرض" });
  }
});

// 4. حذف عرض (الأدمن بس)
router.delete("/:id", async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "العرض مش موجود" });
    }
    res.json({ message: `تم حذف "${offer.title}" بنجاح` });
  } catch (error) {
    res.status(500).json({ message: "فشل في حذف العرض" });
  }
});

module.exports = router;