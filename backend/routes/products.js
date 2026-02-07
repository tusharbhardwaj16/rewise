const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, exam, subject, title, price
       FROM products
       WHERE active = true
       ORDER BY exam, subject`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/grouped", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, exam, subject, title, price
       FROM products
       WHERE active = true
       ORDER BY exam, subject`
    );

    const grouped = {};

    for (const row of result.rows) {
      if (!grouped[row.exam]) {
        grouped[row.exam] = {};
      }

      if (!grouped[row.exam][row.subject]) {
        grouped[row.exam][row.subject] = [];
      }

      grouped[row.exam][row.subject].push({
        id: row.id,
        title: row.title,
        price: row.price
      });
    }

    res.json(grouped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch grouped products" });
  }
});

router.get("/:id", async (req, res) => {
  const productId = parseInt(req.params.id, 10);

  if (Number.isNaN(productId)) {
    return res.status(400).json({ error: "Invalid product id" });
  }

  try {
    const result = await db.query(
      `SELECT id, exam, subject, title, price
       FROM products
       WHERE id = $1 AND active = true`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});


module.exports = router;
