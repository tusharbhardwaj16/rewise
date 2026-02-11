const express = require("express");
const router = express.Router();
const db = require("../db");
const path = require("path");
const fs = require("fs");

router.get("/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const result = await db.query(
      `SELECT p.file_key
	FROM orders o
	JOIN products p ON p.id = o.product_id
	WHERE o.download_token = $1
  	AND o.payment_status = 'paid'`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: "Invalid token" });
    }

    const row = result.rows[0];

    if (row.used) {
      return res.status(403).json({ error: "Token already used" });
    }

    if (new Date(row.expires_at) < new Date()) {
      return res.status(403).json({ error: "Token expired" });
    }

    const filePath = path.join(
      __dirname,
      "..",
      "files",
      row.file_key
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Mark token as used
    await db.query(
      `UPDATE download_tokens SET used = true WHERE token = $1`,
      [token]
    );

    res.download(filePath);

  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    res.status(500).json({ error: "Download failed" });
  }
});

module.exports = router;
