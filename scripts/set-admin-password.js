const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const db = new Database("./data/trovaar.db");
const hash = bcrypt.hashSync("Admin123!", 12);

db.prepare("UPDATE users SET password_hash = ? WHERE email = 'vishek23@gmail.com'").run(hash);

const user = db.prepare("SELECT email, is_admin FROM users WHERE email = 'vishek23@gmail.com'").get();
console.log("Done!", user);
