const router  = require('express').Router();
const auth    = require('../middleware/auth');
const ah      = require('../middleware/asyncHandler');
const { upload, compressAndSave } = require('../middleware/upload');
const db      = require('../config/db');

const authCtrl     = require('../controllers/authController');
const productCtrl  = require('../controllers/productController');
const categoryCtrl = require('../controllers/categoryController');
const orderCtrl    = require('../controllers/orderController');
const cartCtrl     = require('../controllers/cartController');

const wrapAll = (ctrl) => Object.fromEntries(Object.entries(ctrl).map(([k,fn]) => [k, ah(fn)]));
const authC     = wrapAll(authCtrl);
const productC  = wrapAll(productCtrl);
const categoryC = wrapAll(categoryCtrl);
const orderC    = wrapAll(orderCtrl);
const cartC     = wrapAll(cartCtrl);

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post('/auth/register', authC.register);
router.post('/auth/login',    authC.login);
router.get('/auth/me',        auth.protect, authC.me);
router.patch('/auth/profile', auth.protect, authC.updateProfile);

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories', categoryC.getAll);
router.post('/admin/categories', auth.protect, auth.adminOnly, upload.single('cover_image'), compressAndSave, categoryC.create);
router.patch('/admin/categories/:id', auth.protect, auth.adminOnly, upload.single('cover_image'), compressAndSave, categoryC.update);
router.delete('/admin/categories/:id', auth.protect, auth.adminOnly, categoryC.remove);

// ── Products (public) ─────────────────────────────────────────────────────────
router.get('/products',       productC.getAll);
router.get('/products/:slug', productC.getOne);

// ── Products (admin) ──────────────────────────────────────────────────────────
router.get('/admin/products',        auth.protect, auth.adminOnly, productC.adminGetAll);
router.get('/admin/products/:id',    auth.protect, auth.adminOnly, productC.adminGetOne);
router.post('/admin/products',       auth.protect, auth.adminOnly, upload.array('images',8), compressAndSave, productC.create);
router.patch('/admin/products/:id',  auth.protect, auth.adminOnly, upload.array('images',8), compressAndSave, productC.update);
router.delete('/admin/products/:id', auth.protect, auth.adminOnly, productC.deleteProduct);
router.delete('/admin/images/:imageId',        auth.protect, auth.adminOnly, productC.deleteImage);
router.patch('/admin/images/:imageId/primary', auth.protect, auth.adminOnly, productC.setPrimaryImage);

// ── Cart ──────────────────────────────────────────────────────────────────────
router.get('/cart',        auth.protect, cartC.getCart);
router.post('/cart',       auth.protect, cartC.addToCart);
router.patch('/cart/:id',  auth.protect, cartC.updateCart);
router.delete('/cart/:id', auth.protect, cartC.removeFromCart);
router.delete('/cart',     auth.protect, cartC.clearCart);

// ── Orders ────────────────────────────────────────────────────────────────────
router.post('/orders/initialize',  auth.protect, orderC.initializeOrder);
router.get('/orders/verify',       auth.protect, orderC.verifyPayment);
router.get('/orders/mine',         auth.protect, orderC.myOrders);
router.get('/orders/:ref',         auth.protect, orderC.getOrderDetail);
router.get('/admin/orders',        auth.protect, auth.adminOnly, orderC.adminGetOrders);
router.patch('/admin/orders/:ref', auth.protect, auth.adminOnly, orderC.updateOrderStatus);

// ── Addresses ─────────────────────────────────────────────────────────────────
router.get('/addresses', auth.protect, ah(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC', [req.user.id]);
  res.json(rows);
}));
router.post('/addresses', auth.protect, ah(async (req, res) => {
  const { label, full_name, phone, street, city, state, country, is_default } = req.body;
  if (is_default) await db.query('UPDATE addresses SET is_default=0 WHERE user_id=?', [req.user.id]);
  const [r] = await db.query(
    'INSERT INTO addresses (user_id,label,full_name,phone,street,city,state,country,is_default) VALUES (?,?,?,?,?,?,?,?,?)',
    [req.user.id, label||'Home', full_name, phone, street, city, state, country||'Nigeria', is_default?1:0]
  );
  res.status(201).json({ id: r.insertId });
}));
router.delete('/addresses/:id', auth.protect, ah(async (req, res) => {
  await db.query('DELETE FROM addresses WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  res.json({ message: 'Deleted' });
}));

// ── Wishlist ──────────────────────────────────────────────────────────────────
router.get('/wishlist', auth.protect, ah(async (req, res) => {
  const [rows] = await db.query(
    `SELECT w.id, p.id AS product_id, p.name, p.slug, p.price, p.sale_price, p.availability,
            (SELECT url FROM product_images WHERE product_id=p.id AND is_primary=1 LIMIT 1) AS image
     FROM wishlists w JOIN products p ON p.id=w.product_id WHERE w.user_id=?`,
    [req.user.id]
  );
  res.json(rows);
}));
router.post('/wishlist', auth.protect, ah(async (req, res) => {
  await db.query('INSERT IGNORE INTO wishlists (user_id,product_id) VALUES (?,?)', [req.user.id, req.body.product_id]);
  res.json({ message: 'Saved' });
}));
router.delete('/wishlist/:productId', auth.protect, ah(async (req, res) => {
  await db.query('DELETE FROM wishlists WHERE user_id=? AND product_id=?', [req.user.id, req.params.productId]);
  res.json({ message: 'Removed' });
}));

// ── Admin stats ───────────────────────────────────────────────────────────────
router.get('/admin/stats', auth.protect, auth.adminOnly, ah(async (_req, res) => {
  const [[{ total_products }]] = await db.query("SELECT COUNT(*) AS total_products FROM products");
  const [[{ total_orders }]]   = await db.query("SELECT COUNT(*) AS total_orders FROM orders");
  const [[{ total_revenue }]]  = await db.query("SELECT COALESCE(SUM(total_amount),0) AS total_revenue FROM orders WHERE status NOT IN ('pending_payment','payment_failed','cancelled')");
  const [[{ total_users }]]    = await db.query("SELECT COUNT(*) AS total_users FROM users WHERE role='customer'");
  const [recent_orders]        = await db.query(
    `SELECT o.order_ref,o.status,o.total_amount,o.created_at,u.full_name
     FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 8`
  );
  res.json({ total_products, total_orders, total_revenue, total_users, recent_orders });
}));

// ── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', ah(async (_req, res) => {
  const [rows] = await db.query("SELECT `key`,`value` FROM settings WHERE `key` NOT LIKE '%secret%'");
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])));
}));
router.patch('/admin/settings', auth.protect, auth.adminOnly, ah(async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await db.query("INSERT INTO settings (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=?", [key, value, value]);
  }
  res.json({ message: 'Saved' });
}));

module.exports = router;
