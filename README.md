# Jboss Clothing — E-commerce Web App

**"Wear what you are."**

Mobile-first clothing e-commerce app. React (Vite) + Node.js/Express + MySQL + Paystack.

---

## Key difference from a furniture app: Variants

Every product has **size × color combinations**, each with its own stock count.  
When a customer adds to cart, they must pick a size AND a color first.  
Stock is deducted per-variant when payment is confirmed (not when order is placed).

---

## 1. Project Structure

```
jboss-clothing/
├── server/
│   ├── config/
│   │   ├── db.js          — MySQL connection pool
│   │   └── schema.sql     — Run this first in MySQL Workbench
│   ├── controllers/       — authController, productController, cartController,
│   │                        categoryController, orderController
│   ├── middleware/
│   │   ├── asyncHandler.js — Catches async errors, prevents server crash
│   │   ├── auth.js         — JWT protect + adminOnly guards
│   │   └── upload.js       — Multer + Sharp, compresses images to ≤100KB WebP
│   ├── routes/index.js    — All API routes
│   ├── uploads/products/  — Compressed images saved here
│   ├── .env.example
│   ├── index.js
│   └── package.json
│
└── client/
    ├── src/
    │   ├── components/    — BottomNav, ProductCard (with color dots)
    │   ├── context/store.js — Zustand: auth + cart state
    │   ├── pages/
    │   │   ├── Home.jsx        — Hero, categories, featured, new arrivals
    │   │   ├── Shop.jsx        — Grid with filters
    │   │   ├── ProductDetail.jsx — Size picker + color swatch picker ← KEY
    │   │   ├── Cart.jsx        — Shows size/color per item
    │   │   ├── Checkout.jsx    — Address + Paystack
    │   │   ├── Auth.jsx        — Login + Register
    │   │   ├── Account.jsx     — Profile, orders, wishlist links
    │   │   └── SubPages.jsx    — Orders, OrderDetail, OrderVerify,
    │   │                         Wishlist, Addresses, About
    │   └── pages/admin/
    │       ├── AdminLayout.jsx
    │       ├── AdminPages.jsx  — Dashboard, Products list, Categories,
    │       │                     Orders, Settings
    │       └── AdminProductForm.jsx — Create/edit with variant builder ← KEY
    └── package.json
```

---

## 2. Database Setup

1. Open MySQL Workbench → connect to your local server
2. Open `server/config/schema.sql` as a new SQL tab
3. Run the full script — creates `jboss_clothing` database with all tables
4. Seeds: 6 clothing categories (Tops, Bottoms, Outerwear, Sets, Accessories, Drops)
5. Update the admin password immediately:

```bash
# In your server folder terminal:
node -e "console.log(require('bcryptjs').hashSync('YourPassword123', 12))"
```

Then in MySQL Workbench:
```sql
UPDATE users
SET password_hash = '<paste the hash here>'
WHERE email = 'admin@jbossclothing.com';
```

---

## 3. Backend Setup

```bash
cd server
npm install
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux
```

Edit `.env`:
```
DB_PASSWORD=your_mysql_password
JWT_SECRET=any_long_random_string_here
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
```

Start the server:
```bash
npm run dev
```

Runs on `http://localhost:5000`. Test: `http://localhost:5000/health`

---

## 4. Frontend Setup

```bash
cd client
npm install
npm run dev
```

Runs on `http://localhost:5173`.  
Vite auto-proxies `/api` and `/uploads` to your backend — no CORS issues locally.

---

## 5. How Variants Work

### Admin side (adding a product):
1. Go to `/admin/products/new`
2. Fill in name, category, price
3. In the **Sizes & Colors** section:
   - Pick a size (XS–XXXL or custom)
   - Pick a colour from presets or enter custom + colour picker
   - Set stock qty for that combination
   - Click **Add** — it appears in the variant list
   - Repeat for every size/colour you want to offer
4. Publish the product

### Customer side:
1. Opens product page — sees colour swatches
2. Taps a colour → size grid updates to show which sizes exist in that colour
3. Taps a size → "Add to Cart" becomes active
4. Out-of-stock combos are shown strikethrough and can't be selected
5. If they try to checkout without selecting → clear error shown

### Stock management:
- Stock is deducted per-variant **only after Paystack confirms payment**
- If someone adds to cart but never pays, stock is NOT deducted
- Admin can edit stock qty any time from the product edit form

---

## 6. Image Compression

Sharp compresses every upload to ≤100KB WebP automatically. Works great with phone photos — no need for professional photography setup. The compression loop:
1. Resize to max 1200px wide
2. Convert to WebP at quality 82
3. If still >100KB, reduce quality by 5 and try again
4. Stops when ≤100KB or quality hits 10

---

## 7. Paystack Flow

`POST /api/orders/initialize` → validates stock server-side → creates pending order → redirects to Paystack  
Customer pays → Paystack redirects to `/order/verify?ref=...`  
`GET /api/orders/verify` → confirms with Paystack → marks order paid → deducts variant stock → clears cart

Pre-orders go through the exact same flow. Admin tracks them under Orders with status `confirmed → processing → shipped → delivered`.

---

## 8. Admin Dashboard

Login at `/admin` with `admin@jbossclothing.com` (after updating password).

- **Dashboard** — Stats (products, orders, revenue, customers) + recent orders
- **Products** — List all, toggle Live/Draft, click to edit
- **New/Edit Product** — Images (multi-upload, auto-compress), variants builder, availability toggle
- **Categories** — Add/remove clothing categories
- **Orders** — Filter by status, update fulfillment status per order
- **Settings** — Tagline, delivery fee, Instagram, WhatsApp, about text

---

## 9. Adding Your Logo

Drop your logo file at:
```
client/src/assets/logo.png
```

Then in `Home.jsx` replace the text wordmark:
```jsx
// Replace this line in the hero footer:
<p className="home-footer__logo">JBOSS</p>

// With:
import logo from '../assets/logo.png';
<img src={logo} alt="Jboss Clothing" style={{ height: 40 }} />
```

Do the same in `AdminLayout.jsx` header if desired.

---

## 10. Deploying Later

When ready to go live:
- **Backend** → Render or Railway (free tiers work fine to start)
- **Frontend** → Vercel (drag and drop the `client` folder, set `VITE_API_URL` env var)  
- **Database** → Railway MySQL or PlanetScale
- Update `CLIENT_URL` in server `.env` to your Vercel URL
- Add your live Paystack keys (swap `sk_test_` for `sk_live_`)
