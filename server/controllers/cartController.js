const db = require('../config/db');

exports.getCart = async (req, res) => {
  const [items] = await db.query(
    `SELECT ci.id, ci.quantity, ci.product_id, ci.variant_id,
            p.name, p.price, p.sale_price, p.availability, p.slug,
            pv.size, pv.color, pv.color_hex, pv.stock_qty,
            (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=1 LIMIT 1) AS image
     FROM cart_items ci
     JOIN products p  ON p.id  = ci.product_id
     JOIN product_variants pv ON pv.id = ci.variant_id
     WHERE ci.user_id=? AND p.is_published=1`,
    [req.user.id]
  );
  return res.json(items);
};

exports.addToCart = async (req, res) => {
  const { product_id, variant_id, quantity = 1 } = req.body;
  if (!product_id || !variant_id)
    return res.status(400).json({ message: 'product_id and variant_id are required' });
  // Check stock
  const [[variant]] = await db.query('SELECT stock_qty FROM product_variants WHERE id=? AND product_id=?', [variant_id, product_id]);
  if (!variant) return res.status(404).json({ message: 'Variant not found' });
  if (variant.stock_qty < 1) return res.status(409).json({ message: 'This size/color is out of stock' });
  await db.query(
    `INSERT INTO cart_items (user_id,product_id,variant_id,quantity) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)`,
    [req.user.id, product_id, variant_id, quantity]
  );
  return res.json({ message: 'Added to cart' });
};

exports.updateCart = async (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) {
    await db.query('DELETE FROM cart_items WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    return res.json({ message: 'Removed' });
  }
  await db.query('UPDATE cart_items SET quantity=? WHERE id=? AND user_id=?', [quantity, req.params.id, req.user.id]);
  return res.json({ message: 'Updated' });
};

exports.removeFromCart = async (req, res) => {
  await db.query('DELETE FROM cart_items WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  return res.json({ message: 'Removed' });
};

exports.clearCart = async (req, res) => {
  await db.query('DELETE FROM cart_items WHERE user_id=?', [req.user.id]);
  return res.json({ message: 'Cleared' });
};
