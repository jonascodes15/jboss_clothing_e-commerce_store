const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const sign = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = async (req, res) => {
  const { full_name, email, password, phone } = req.body;
  if (!full_name || !email || !password)
    return res.status(400).json({ message: 'Name, email and password are required' });
  const [existing] = await db.query('SELECT id FROM users WHERE email=?', [email]);
  if (existing.length) return res.status(409).json({ message: 'Email already registered' });
  const hash = await bcrypt.hash(password, 12);
  const [result] = await db.query(
    'INSERT INTO users (full_name,email,password_hash,phone,is_verified) VALUES (?,?,?,?,1)',
    [full_name.trim(), email.toLowerCase().trim(), hash, phone || null]
  );
  const user = { id: result.insertId, email: email.toLowerCase().trim(), role: 'customer' };
  return res.status(201).json({ token: sign(user), user: { ...user, full_name } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  const [rows] = await db.query(
    'SELECT id,full_name,email,password_hash,role FROM users WHERE email=?',
    [email.toLowerCase().trim()]
  );
  if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
  const user = rows[0];
  if (!await bcrypt.compare(password, user.password_hash))
    return res.status(401).json({ message: 'Invalid credentials' });
  const { password_hash, ...safe } = user;
  return res.json({ token: sign(safe), user: safe });
};

exports.me = async (req, res) => {
  const [rows] = await db.query(
    'SELECT id,full_name,email,phone,avatar_url,role,created_at FROM users WHERE id=?',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'User not found' });
  return res.json(rows[0]);
};

exports.updateProfile = async (req, res) => {
  const { full_name, phone } = req.body;
  await db.query('UPDATE users SET full_name=?,phone=? WHERE id=?', [full_name, phone, req.user.id]);
  return res.json({ message: 'Profile updated' });
};
