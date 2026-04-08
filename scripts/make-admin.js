const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const { randomUUID } = require("crypto");

const db = new Database("./data/servicerequest.db");

const EMAIL = "vishek2333@outlook.com";
const PASSWORD = "Admin123!";

const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(EMAIL);
const hash = bcrypt.hashSync(PASSWORD, 12);

if (existing) {
  db.prepare("UPDATE users SET is_admin = 1, password_hash = ? WHERE email = ?").run(hash, EMAIL);
  console.log("Updated existing user to admin!");
} else {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, email_verified, is_admin, created_at)
    VALUES (?, ?, ?, 'Admin', 'consumer', 1, 1, datetime('now'))
  `).run(id, EMAIL, hash);
  console.log("Created new admin user!");
}

const user = db.prepare("SELECT email, is_admin FROM users WHERE email = ?").get(EMAIL);
console.log("Result:", user);
console.log("\nLogin with:");
console.log("  Email:   ", EMAIL);
console.log("  Password:", PASSWORD);
