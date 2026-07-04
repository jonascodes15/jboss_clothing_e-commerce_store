const db      = require('../config/db');
const slugify = require('slugify');

// ── Public ────────────────────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  const { category, availability, featured, search, sort = 'newest', page = 1, limit = 12 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = ['p.is_published = 1'];
  const params = [];
  if (category)     { where.push('c.slug = ?');                             params.push(category); }
  if (availability) { where.push('p.availability = ?');                      params.push(availability); }
  if (featured === 'true') { where.push('p.is_featured = 1'); }
  if (search)       { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const orderMap = {
    newest: 'p.created_at DESC', oldest: 'p.created_at ASC',
    price_asc: 'COALESCE(p.sale_price,p.price) ASC', price_desc: 'COALESCE(p.sale_price,p.price) DESC',
    popular: 'p.views DESC',
  };
  const whereStr = `WHERE ${where.join(' AND ')}`;
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.slug, p.price, p.sale_price, p.availability, p.is_featured,
            c.name AS category_name, c.slug AS category_slug,
            (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=1 LIMIT 1) AS primary_image,
            (SELECT GROUP_CONCAT(DISTINCT color ORDER BY color) FROM product_variants WHERE product_id=p.id AND stock_qty>0) AS available_colors,
            (SELECT GROUP_CONCAT(DISTINCT size ORDER BY FIELD(size,'XS','S','M','L','XL','XXL','XXXL') ) FROM product_variants WHERE product_id=p.id AND stock_qty>0) AS available_sizes
     FROM products p JOIN categories c ON c.id=p.category_id
     ${whereStr} ORDER BY ${orderMap[sort] || orderMap.newest} LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM products p JOIN categories c ON c.id=p.category_id ${whereStr}`, params
  );
  return res.json({ products: rows, total, page: Number(page), pages: Math.ceil(total / limit) });
};

exports.getOne = async (req, res) => {
  const [[product]] = await db.query(
    `SELECT p.*, c.name AS category_name, c.slug AS category_slug
     FROM products p JOIN categories c ON c.id=p.category_id
     WHERE p.slug=? AND p.is_published=1`, [req.params.slug]
  );
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const [images] = await db.query(
    'SELECT id,url,alt_text,is_primary,sort_order FROM product_images WHERE product_id=? ORDER BY is_primary DESC, sort_order ASC',
    [product.id]
  );
  const [variants] = await db.query(
    'SELECT id,size,color,color_hex,stock_qty FROM product_variants WHERE product_id=? ORDER BY FIELD(size,"XS","S","M","L","XL","XXL","XXXL"), color',
    [product.id]
  );
  const [reviews] = await db.query(
    `SELECT r.rating,r.title,r.body,r.created_at,u.full_name
     FROM reviews r JOIN users u ON u.id=r.user_id
     WHERE r.product_id=? AND r.is_approved=1 ORDER BY r.created_at DESC LIMIT 10`,
    [product.id]
  );
  db.query('UPDATE products SET views=views+1 WHERE id=?', [product.id]).catch(() => {});
  return res.json({ ...product, images, variants, reviews });
};

// ── Admin ─────────────────────────────────────────────────────────────────────

exports.adminGetAll = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  let where = []; const params = [];
  if (search) { where.push('(p.name LIKE ? OR p.slug LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT p.id,p.name,p.slug,p.price,p.availability,p.is_published,p.is_featured,p.created_at,
            c.name AS category_name,
            (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=1 LIMIT 1) AS primary_image,
            (SELECT COUNT(*) FROM product_variants WHERE product_id=p.id) AS variant_count,
            (SELECT SUM(stock_qty) FROM product_variants WHERE product_id=p.id) AS total_stock
     FROM products p JOIN categories c ON c.id=p.category_id
     ${whereStr} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM products p ${whereStr}`, params);
  return res.json({ products: rows, total });
};

exports.adminGetOne = async (req, res) => {
  const [[product]] = await db.query(
    `SELECT p.*,c.name AS category_name FROM products p
     JOIN categories c ON c.id=p.category_id WHERE p.id=?`, [req.params.id]
  );
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const [images]   = await db.query('SELECT * FROM product_images WHERE product_id=? ORDER BY is_primary DESC,sort_order', [product.id]);
  const [variants] = await db.query('SELECT * FROM product_variants WHERE product_id=? ORDER BY FIELD(size,"XS","S","M","L","XL","XXL","XXXL"),color', [product.id]);
  return res.json({ ...product, images, variants });
};

exports.create = async (req, res) => {
  const { category_id, name, description, material, care_instructions,
          price, sale_price, availability, lead_time_days, is_featured, is_published } = req.body;
  if (!name || !category_id || !price)
    return res.status(400).json({ message: 'name, category_id and price are required' });
  let slug = slugify(name, { lower: true, strict: true });
  const [existing] = await db.query('SELECT id FROM products WHERE slug LIKE ?', [`${slug}%`]);
  if (existing.length) slug = `${slug}-${Date.now()}`;
  const [result] = await db.query(
    `INSERT INTO products (category_id,name,slug,description,material,care_instructions,price,sale_price,availability,lead_time_days,is_featured,is_published)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [category_id, name, slug, description||null, material||null, care_instructions||null,
     price, sale_price||null, availability||'buy', lead_time_days||null, is_featured?1:0, is_published?1:0]
  );
  if (req.savedImages?.length) {
    const vals = req.savedImages.map((img,i) => [result.insertId, img.url, i===0?1:0, i, img.fileSize]);
    await db.query('INSERT INTO product_images (product_id,url,is_primary,sort_order,file_size) VALUES ?', [vals]);
  }
  // Parse and insert variants
  let variants = [];
  try { variants = JSON.parse(req.body.variants || '[]'); } catch {}
  if (variants.length) {
    const vVals = variants.map(v => [result.insertId, v.size, v.color, v.color_hex||null, v.stock_qty||0, v.sku||null]);
    await db.query('INSERT INTO product_variants (product_id,size,color,color_hex,stock_qty,sku) VALUES ?', [vVals]);
  }
  return res.status(201).json({ id: result.insertId, slug });
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const fields = ['category_id','name','description','material','care_instructions',
                  'price','sale_price','availability','lead_time_days','is_featured','is_published'];
  const updates = []; const values = [];
  fields.forEach(f => { if (req.body[f] !== undefined) { updates.push(`${f}=?`); values.push(req.body[f]); } });
  if (updates.length) {
    values.push(id);
    await db.query(`UPDATE products SET ${updates.join(',')} WHERE id=?`, values);
  }
  if (req.savedImages?.length) {
    const vals = req.savedImages.map((img,i) => [id, img.url, 0, i, img.fileSize]);
    await db.query('INSERT INTO product_images (product_id,url,is_primary,sort_order,file_size) VALUES ?', [vals]);
  }
  // Replace variants if provided
  let variants = [];
  try { variants = JSON.parse(req.body.variants || 'null'); } catch {}
  if (variants !== null && Array.isArray(variants)) {
    await db.query('DELETE FROM product_variants WHERE product_id=?', [id]);
    if (variants.length) {
      const vVals = variants.map(v => [id, v.size, v.color, v.color_hex||null, v.stock_qty||0, v.sku||null]);
      await db.query('INSERT INTO product_variants (product_id,size,color,color_hex,stock_qty,sku) VALUES ?', [vVals]);
    }
  }
  return res.json({ message: 'Updated' });
};

exports.deleteProduct = async (req, res) => {
  await db.query('DELETE FROM products WHERE id=?', [req.params.id]);
  return res.json({ message: 'Deleted' });
};

exports.deleteImage = async (req, res) => {
  const [[img]] = await db.query('SELECT * FROM product_images WHERE id=?', [req.params.imageId]);
  if (!img) return res.status(404).json({ message: 'Image not found' });
  const fs = require('fs'); const path = require('path');
  const fp = path.join(__dirname, '..', img.url);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  await db.query('DELETE FROM product_images WHERE id=?', [req.params.imageId]);
  return res.json({ message: 'Deleted' });
};

exports.setPrimaryImage = async (req, res) => {
  const [[img]] = await db.query('SELECT product_id FROM product_images WHERE id=?', [req.params.imageId]);
  if (!img) return res.status(404).json({ message: 'Not found' });
  await db.query('UPDATE product_images SET is_primary=0 WHERE product_id=?', [img.product_id]);
  await db.query('UPDATE product_images SET is_primary=1 WHERE id=?', [req.params.imageId]);
  return res.json({ message: 'Primary set' });
};
