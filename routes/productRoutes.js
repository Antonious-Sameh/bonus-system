const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// 1. جلب كل المنتجات (للعميل والأدمن)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "فشل في جلب المنتجات" });
  }
});

// 2. إضافة منتج جديد (الأدمن بس)
router.post("/", async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "اسم المنتج مطلوب" });
    }

    const newProduct = new Product({
      name: name.trim(),
      description: description?.trim() || "",
      imageUrl: imageUrl?.trim() || "",
    });

    await newProduct.save();
    res.status(201).json({ message: "تم إضافة المنتج بنجاح", product: newProduct });
  } catch (error) {
    res.status(500).json({ message: "فشل في إضافة المنتج" });
  }
});

// 3. حذف منتج (الأدمن بس)
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "المنتج مش موجود" });
    }
    res.json({ message: `تم حذف "${product.name}" بنجاح` });
  } catch (error) {
    res.status(500).json({ message: "فشل في حذف المنتج" });
  }
});

module.exports = router;