const db    = require('../config/db');
const https = require('https');

function paystackRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.paystack.co', port: 443, path, method,
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function genRef() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  return `JBC-${date}-${Math.floor(Math.random()*90000+10000)}`;
}

exports.initializeOrder = async (req, res) => {
  const { items, address_id, delivery_note } = req.body;
  if (!items?.length) return res.status(400).json({ message: 'Cart is empty' });

  // Fetch variant + product prices server-side
  const variantIds = items.map(i => i.variant_id);
  const [variants] = await db.query(
    `SELECT pv.id, pv.size, pv.color, pv.stock_qty,
            p.id AS product_id, p.name, p.price, p.sale_price, p.availability
     FROM product_variants pv JOIN products p ON p.id=pv.product_id
     WHERE pv.id IN (?) AND p.is_published=1`,
    [variantIds]
  );
  const varMap = Object.fromEntries(variants.map(v => [v.id, v]));

  let subtotal = 0;
  const lineItems = [];
  for (const item of items) {
    const v = varMap[item.variant_id];
    if (!v) return res.status(400).json({ message: `Variant ${item.variant_id} not available` });
    if (v.stock_qty < item.quantity) return res.status(409).json({ message: `Not enough stock for ${v.name} (${v.size}/${v.color})` });
    const unit = parseFloat(v.sale_price || v.price);
    lineItems.push({ product_id: v.product_id, variant_id: v.id, product_name: v.name, size: v.size, color: v.color, unit_price: unit, quantity: item.quantity, line_total: unit*item.quantity, availability: v.availability });
    subtotal += unit * item.quantity;
  }

  const [settings] = await db.query("SELECT `key`,`value` FROM settings WHERE `key` IN ('delivery_fee')");
  const deliveryFee = parseFloat(settings.find(s => s.key === 'delivery_fee')?.value || 0);
  const total = subtotal + deliveryFee;
  const orderType = lineItems.some(i => i.availability === 'preorder') ? 'preorder' : 'buy';
  const orderRef = genRef();

  const [[user]] = await db.query('SELECT email,full_name FROM users WHERE id=?', [req.user.id]);

  const [orderResult] = await db.query(
    `INSERT INTO orders (user_id,address_id,order_ref,order_type,status,subtotal,delivery_fee,total_amount,delivery_note)
     VALUES (?,?,?,?,'pending_payment',?,?,?,?)`,
    [req.user.id, address_id||null, orderRef, orderType, subtotal, deliveryFee, total, delivery_note||null]
  );
  const orderId = orderResult.insertId;

  const itemVals = lineItems.map(i => [orderId, i.product_id, i.variant_id, i.product_name, i.size, i.color, i.unit_price, i.quantity, i.line_total]);
  await db.query('INSERT INTO order_items (order_id,product_id,variant_id,product_name,size,color,unit_price,quantity,line_total) VALUES ?', [itemVals]);

  const psRes = await paystackRequest('POST', '/transaction/initialize', {
    email: user.email, amount: Math.round(total * 100), reference: orderRef,
    metadata: { order_id: orderId, customer_name: user.full_name },
    callback_url: `${process.env.CLIENT_URL}/order/verify?ref=${orderRef}`,
  });

  if (!psRes.status) {
    await db.query("UPDATE orders SET status='payment_failed' WHERE id=?", [orderId]);
    return res.status(502).json({ message: 'Payment gateway error' });
  }
  await db.query('UPDATE orders SET paystack_ref=? WHERE id=?', [orderRef, orderId]);
  return res.json({ authorization_url: psRes.data.authorization_url, order_ref: orderRef, total });
};

exports.verifyPayment = async (req, res) => {
  const { ref } = req.query;
  if (!ref) return res.status(400).json({ message: 'Reference required' });
  const result = await paystackRequest('GET', `/transaction/verify/${ref}`);
  if (!result.status || result.data.status !== 'success') {
    await db.query("UPDATE orders SET status='payment_failed',paystack_status=? WHERE order_ref=?", [result.data?.status||'failed', ref]);
    return res.status(402).json({ message: 'Payment not successful' });
  }
  await db.query("UPDATE orders SET status='paid',paystack_status='success',paid_at=NOW() WHERE order_ref=?", [ref]);
  // Deduct stock
  const [[order]] = await db.query('SELECT id,user_id FROM orders WHERE order_ref=?', [ref]);
  if (order) {
    const [items] = await db.query('SELECT variant_id,quantity FROM order_items WHERE order_id=?', [order.id]);
    for (const item of items) {
      await db.query('UPDATE product_variants SET stock_qty=GREATEST(0,stock_qty-?) WHERE id=?', [item.quantity, item.variant_id]);
    }
    await db.query('DELETE FROM cart_items WHERE user_id=?', [order.user_id]);
  }
  return res.json({ message: 'Payment confirmed', order_ref: ref });
};

exports.myOrders = async (req, res) => {
  const [orders] = await db.query(
    `SELECT o.id,o.order_ref,o.order_type,o.status,o.total_amount,o.created_at,COUNT(oi.id) AS item_count
     FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
     WHERE o.user_id=? GROUP BY o.id ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  return res.json(orders);
};

exports.getOrderDetail = async (req, res) => {
  const [[order]] = await db.query(
    `SELECT o.*,a.street,a.city,a.state FROM orders o
     LEFT JOIN addresses a ON a.id=o.address_id
     WHERE o.order_ref=? AND o.user_id=?`,
    [req.params.ref, req.user.id]
  );
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const [items] = await db.query('SELECT * FROM order_items WHERE order_id=?', [order.id]);
  return res.json({ ...order, items });
};

exports.adminGetOrders = async (req, res) => {
  const { status, page=1, limit=20 } = req.query;
  const offset = (Number(page)-1)*Number(limit);
  let where = []; const params = [];
  if (status) { where.push('o.status=?'); params.push(status); }
  const whereStr = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [orders] = await db.query(
    `SELECT o.id,o.order_ref,o.order_type,o.status,o.total_amount,o.created_at,u.full_name,u.email,u.phone
     FROM orders o JOIN users u ON u.id=o.user_id ${whereStr} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM orders o ${whereStr}`, params);
  return res.json({ orders, total });
};

exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['confirmed','processing','shipped','delivered','cancelled','refunded'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  await db.query('UPDATE orders SET status=? WHERE order_ref=?', [status, req.params.ref]);
  return res.json({ message: 'Updated' });
};
