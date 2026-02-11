const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const db = require("../db");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* ================================
   CREATE ORDER
================================ */

router.post("/create-order", async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId required" });
    }

    const productResult = await db.query(
      `SELECT id, price
       FROM products
       WHERE id = $1 AND active = true`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = productResult.rows[0];

    const razorpayOrder = await razorpay.orders.create({
      amount: product.price * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    await db.query(
      `INSERT INTO orders
       (razorpay_order_id, product_id, amount, payment_status)
       VALUES ($1, $2, $3, $4)`,
      [
        razorpayOrder.id,
        product.id,
        product.price,
        "created"
      ]
    );

    return res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
});

/* ================================
   VERIFY PAYMENT
================================ */

router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment data" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const downloadToken = crypto.randomBytes(32).toString("hex");

    const updateResult = await db.query(
      `UPDATE orders
       SET payment_status = 'paid',
           download_token = $1
       WHERE razorpay_order_id = $2
       RETURNING id`,
      [downloadToken, razorpay_order_id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(400).json({ error: "Order not found for verification" });
    }

    return res.json({
      success: true,
      downloadToken
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return res.status(500).json({ error: "Verify failed" });
  }
});

module.exports = router;
