const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "tushar",
  database: "exam_store",
});

module.exports = pool;
