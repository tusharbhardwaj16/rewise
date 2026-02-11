const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: "rzp_test_SDLsj1iUZuYEXP",
  key_secret: "3FQ7g7UPIM1P5hDO3K5O9wBm"
});

/* CREATE ORDER */
app.post("/api/create-order", async (req, res) => {
  try {
    const { product_id, amount } = req.body;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: product_id
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: "rzp_test_SDLsj1iUZuYEXP"
    });
  } catch (err) {
    res.status(500).json({ error: "Order creation failed" });
  }
});

/* VERIFY PAYMENT */
app.post("/api/verify-payment", (req, res) => {
  // stub for now
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
