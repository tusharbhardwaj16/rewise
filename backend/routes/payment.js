const express = require("express");
const router = express.Router();
const db = require("../db");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post("/create-order", async (req, res) => {
  const { productId } = req.body;
console.log("REQ BODY:", req.body);
  if (!productId) {
    return res.status(400).json({ error: "productId required" });
  }

  try {
    const productResult = await db.query(
      `SELECT id, price FROM products WHERE id = $1 AND active = true`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const product = productResult.rows[0];

    const order = await razorpay.orders.create({
      amount: product.price * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    await db.query(
      `INSERT INTO orders (razorpay_order_id, product_id, amount, payment_status)
       VALUES ($1, $2, $3, $4)`,
      [order.id, product.id, product.price, "created"]
    );

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});


const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

router.post("/verify", async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: "Signature verification failed" });
  }

  try {
    // Mark order as paid
    const orderResult = await db.query(
      `UPDATE orders
       SET payment_status = 'paid'
       WHERE razorpay_order_id = $1
       RETURNING id`,
      [razorpay_order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderId = orderResult.rows[0].id;

    // Generate one-time token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await db.query(
      `INSERT INTO download_tokens (token, order_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, orderId, expiresAt]
    );

    res.json({ downloadToken: token });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

module.exports = router;
