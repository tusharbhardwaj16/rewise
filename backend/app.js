require("dotenv").config();

const db = require("./db");

const express = require("express");
const app = express();

const cors = require("cors");

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

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
