const db      = require('../config/db');
const slugify = require('slugify');

exports.getAll = async (_req, res) => {
  const [rows] = await db.query(
    `SELECT c.*, COUNT(p.id) AS product_count
     FROM categories c LEFT JOIN products p ON p.category_id=c.id AND p.is_published=1
     WHERE c.is_active=1 GROUP BY c.id ORDER BY c.sort_order ASC`
  );
  return res.json(rows);
};

exports.create = async (req, res) => {
  const { name, description, sort_order } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  const slug = slugify(name, { lower: true, strict: true });
  const cover = req.savedImages?.[0]?.url || null;
  const [r] = await db.query(
    'INSERT INTO categories (name,slug,description,cover_image,sort_order) VALUES (?,?,?,?,?)',
    [name, slug, description||null, cover, sort_order||0]
  );
  return res.status(201).json({ id: r.insertId, slug });
};

exports.update = async (req, res) => {
  const { name, description, sort_order, is_active } = req.body;
  const updates = []; const values = [];
  if (name !== undefined)        { updates.push('name=?');        values.push(name); }
  if (description !== undefined) { updates.push('description=?'); values.push(description); }
  if (sort_order !== undefined)  { updates.push('sort_order=?');  values.push(sort_order); }
  if (is_active !== undefined)   { updates.push('is_active=?');   values.push(is_active?1:0); }
  if (req.savedImages?.[0])      { updates.push('cover_image=?'); values.push(req.savedImages[0].url); }
  if (!updates.length) return res.status(400).json({ message: 'Nothing to update' });
  values.push(req.params.id);
  await db.query(`UPDATE categories SET ${updates.join(',')} WHERE id=?`, values);
  return res.json({ message: 'Updated' });
};

exports.remove = async (req, res) => {
  const [[{ cnt }]] = await db.query('SELECT COUNT(*) AS cnt FROM products WHERE category_id=?', [req.params.id]);
  if (cnt > 0) return res.status(409).json({ message: 'Category has products. Reassign them first.' });
  await db.query('DELETE FROM categories WHERE id=?', [req.params.id]);
  return res.json({ message: 'Deleted' });
};
