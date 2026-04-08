const bcrypt = require('bcryptjs');
const D = require('better-sqlite3');
const db = new D('./data/servicerequest.db');

// Use async hash like the app does
const password = 'Test1234';
const hash = bcrypt.hashSync(password, 12);
db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'vishek2333@outlook.com');

// Verify
const u = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('vishek2333@outlook.com');
console.log('verify:', bcrypt.compareSync(password, u.password_hash));
console.log('Password set to: Test1234');
