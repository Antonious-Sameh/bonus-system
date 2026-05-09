const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");

// 1. العميل يبعت طلب جديد
router.post("/", async (req, res) => {
  try {
    const { phone, request } = req.body;

    if (!request || request.trim() === "") {
      return res.status(400).json({ message: "لازم تكتب الطلب" });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "المستخدم مش موجود" });
    }

    const newOrder = new Order({
      customerId: user._id,
      customerName: user.name,
      customerPhone: user.phone,
      request: request.trim(),
    });

    await newOrder.save();
    res.status(201).json({ message: "تم إرسال طلبك بنجاح!", order: newOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "فشل في إرسال الطلب" });
  }
});

// 2. الأدمن يجيب كل الطلبات (مرتبة: الجديدة الأول)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "فشل في جلب الطلبات" });
  }
});

// 3. الأدمن يغير حالة الطلب (pending → seen → done)
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "seen", "done"].includes(status)) {
      return res.status(400).json({ message: "حالة غير صحيحة" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "الطلب مش موجود" });
    res.json({ message: "تم تحديث حالة الطلب", order });
  } catch (error) {
    res.status(500).json({ message: "فشل في تحديث الحالة" });
  }
});

// 4. الأدمن يحذف طلب
router.delete("/:id", async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "تم حذف الطلب" });
  } catch (error) {
    res.status(500).json({ message: "فشل في الحذف" });
  }
});

module.exports = router;