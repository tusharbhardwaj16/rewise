require("dotenv").config();
console.log("RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID);

const db = require("./db");

const express = require("express");
const app = express();

app.use(express.json());

app.use("/products", require("./routes/products"));
app.use("/payment", require("./routes/payment"));
app.use("/download", require("./routes/download"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
