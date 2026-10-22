const { Pool } = require("pg"), fs = require("fs"), path = require("path");
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set"); process.exit(1); }
const local = /localhost|127\.0\.0\.1/.test(url);
const pool = new Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 10 });
const init = () => pool.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
module.exports = { pool, init };
