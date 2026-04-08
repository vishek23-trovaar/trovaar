const b = require('bcryptjs');
const D = require('better-sqlite3');
const db = new D('./data/servicerequest.db');
const u = db.prepare('SELECT email, password_hash FROM users WHERE email = ?').get('vishek2333@outlook.com');
console.log('has hash:', !!u.password_hash);
console.log('hash preview:', u.password_hash?.substring(0, 20));
console.log('verify:', b.compareSync('Admin123!', u.password_hash));
