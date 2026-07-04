-- ============================================================
--  JBOSS CLOTHING — DATABASE SCHEMA
--  MySQL 8.0+  |  Run once in MySQL Workbench
-- ============================================================

CREATE DATABASE IF NOT EXISTS jboss_clothing
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jboss_clothing;

-- ─────────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(120)      NOT NULL,
  email         VARCHAR(180)      NOT NULL UNIQUE,
  password_hash VARCHAR(255)      NOT NULL,
  phone         VARCHAR(20)       NULL,
  avatar_url    VARCHAR(500)      NULL,
  role          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  is_verified   TINYINT(1)        NOT NULL DEFAULT 0,
  created_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email (email),
  INDEX idx_role  (role)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  CATEGORIES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)   NOT NULL UNIQUE,
  slug        VARCHAR(80)   NOT NULL UNIQUE,
  description TEXT          NULL,
  cover_image VARCHAR(500)  NULL,
  sort_order  INT           NOT NULL DEFAULT 0,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_slug (slug)
) ENGINE=InnoDB;

INSERT INTO categories (name, slug, description, sort_order) VALUES
  ('Tops',        'tops',        'Shirts, tees, and everything up top',      1),
  ('Bottoms',     'bottoms',     'Trousers, joggers, and shorts',            2),
  ('Outerwear',   'outerwear',   'Jackets, hoodies, and coats',              3),
  ('Sets',        'sets',        'Coordinated two-piece and full sets',      4),
  ('Accessories', 'accessories', 'Caps, bags, and finishing touches',        5),
  ('Drops',       'drops',       'Limited releases — get them while they last', 6);

-- ─────────────────────────────────────────────
--  PRODUCTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               INT UNSIGNED          NOT NULL AUTO_INCREMENT,
  category_id      INT UNSIGNED          NOT NULL,
  name             VARCHAR(200)          NOT NULL,
  slug             VARCHAR(220)          NOT NULL UNIQUE,
  description      TEXT                  NULL,
  material         VARCHAR(200)          NULL,
  care_instructions VARCHAR(300)         NULL,
  price            DECIMAL(12,2)         NOT NULL DEFAULT 0.00,
  sale_price       DECIMAL(12,2)         NULL,
  availability     ENUM('buy','preorder','sold_out') NOT NULL DEFAULT 'buy',
  lead_time_days   SMALLINT UNSIGNED     NULL,
  is_featured      TINYINT(1)            NOT NULL DEFAULT 0,
  is_published     TINYINT(1)            NOT NULL DEFAULT 0,
  views            INT UNSIGNED          NOT NULL DEFAULT 0,
  created_at       DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_category   (category_id),
  INDEX idx_slug       (slug),
  INDEX idx_featured   (is_featured),
  INDEX idx_published  (is_published),
  CONSTRAINT fk_product_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  PRODUCT VARIANTS (size + color combos)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  product_id  INT UNSIGNED  NOT NULL,
  size        VARCHAR(20)   NOT NULL,   -- XS, S, M, L, XL, XXL, Free Size, etc.
  color       VARCHAR(50)   NOT NULL,   -- Black, White, Olive, etc.
  color_hex   VARCHAR(7)    NULL,       -- #000000 for the color swatch UI
  stock_qty   SMALLINT      NOT NULL DEFAULT 0,
  sku         VARCHAR(80)   NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_variant (product_id, size, color),
  INDEX idx_product (product_id),
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  PRODUCT IMAGES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  product_id  INT UNSIGNED  NOT NULL,
  url         VARCHAR(500)  NOT NULL,
  alt_text    VARCHAR(200)  NULL,
  is_primary  TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  INT           NOT NULL DEFAULT 0,
  file_size   INT UNSIGNED  NULL,
  uploaded_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_product (product_id),
  CONSTRAINT fk_img_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  ADDRESSES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS addresses (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED  NOT NULL,
  label       VARCHAR(50)   NOT NULL DEFAULT 'Home',
  full_name   VARCHAR(120)  NOT NULL,
  phone       VARCHAR(20)   NOT NULL,
  street      VARCHAR(300)  NOT NULL,
  city        VARCHAR(100)  NOT NULL,
  state       VARCHAR(100)  NOT NULL,
  country     VARCHAR(80)   NOT NULL DEFAULT 'Nigeria',
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user (user_id),
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  ORDERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  INT UNSIGNED          NOT NULL AUTO_INCREMENT,
  user_id             INT UNSIGNED          NOT NULL,
  address_id          INT UNSIGNED          NULL,
  order_ref           VARCHAR(30)           NOT NULL UNIQUE,
  order_type          ENUM('buy','preorder') NOT NULL DEFAULT 'buy',
  status              ENUM(
                        'pending_payment','payment_failed','paid',
                        'confirmed','processing','shipped','delivered',
                        'cancelled','refunded'
                      )                     NOT NULL DEFAULT 'pending_payment',
  subtotal            DECIMAL(12,2)         NOT NULL,
  delivery_fee        DECIMAL(12,2)         NOT NULL DEFAULT 0.00,
  total_amount        DECIMAL(12,2)         NOT NULL,
  paystack_ref        VARCHAR(120)          NULL UNIQUE,
  paystack_status     VARCHAR(50)           NULL,
  paid_at             DATETIME              NULL,
  delivery_note       TEXT                  NULL,
  estimated_ready_at  DATE                  NULL,
  created_at          DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME              NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user      (user_id),
  INDEX idx_order_ref (order_ref),
  INDEX idx_status    (status),
  CONSTRAINT fk_order_user    FOREIGN KEY (user_id)    REFERENCES users     (id) ON DELETE RESTRICT,
  CONSTRAINT fk_order_address FOREIGN KEY (address_id) REFERENCES addresses (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  ORDER ITEMS  (stores variant snapshot)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_id     INT UNSIGNED   NOT NULL,
  product_id   INT UNSIGNED   NOT NULL,
  variant_id   INT UNSIGNED   NULL,
  product_name VARCHAR(200)   NOT NULL,
  size         VARCHAR(20)    NULL,
  color        VARCHAR(50)    NULL,
  unit_price   DECIMAL(12,2)  NOT NULL,
  quantity     SMALLINT       NOT NULL DEFAULT 1,
  line_total   DECIMAL(12,2)  NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_order   (order_id),
  INDEX idx_product (product_id),
  CONSTRAINT fk_item_order   FOREIGN KEY (order_id)   REFERENCES orders   (id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  CART  (stores variant selection)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED  NOT NULL,
  product_id  INT UNSIGNED  NOT NULL,
  variant_id  INT UNSIGNED  NOT NULL,
  quantity    SMALLINT      NOT NULL DEFAULT 1,
  added_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_variant (user_id, variant_id),
  CONSTRAINT fk_cart_user    FOREIGN KEY (user_id)    REFERENCES users            (id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products         (id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  WISHLIST
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED  NOT NULL,
  product_id  INT UNSIGNED  NOT NULL,
  saved_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist (user_id, product_id),
  CONSTRAINT fk_wl_user    FOREIGN KEY (user_id)    REFERENCES users    (id) ON DELETE CASCADE,
  CONSTRAINT fk_wl_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  REVIEWS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  product_id  INT UNSIGNED  NOT NULL,
  user_id     INT UNSIGNED  NOT NULL,
  order_id    INT UNSIGNED  NULL,
  rating      TINYINT       NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(150)  NULL,
  body        TEXT          NULL,
  is_approved TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review (user_id, product_id),
  INDEX idx_product (product_id),
  CONSTRAINT fk_rev_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_user    FOREIGN KEY (user_id)    REFERENCES users    (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  ADMIN LOGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id    INT UNSIGNED    NOT NULL,
  action      VARCHAR(100)    NOT NULL,
  target_type VARCHAR(50)     NULL,
  target_id   INT UNSIGNED    NULL,
  meta        JSON            NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_admin (admin_id),
  CONSTRAINT fk_log_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────
--  SETTINGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  `key`       VARCHAR(80)   NOT NULL,
  `value`     TEXT          NULL,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB;

INSERT INTO settings (`key`, `value`) VALUES
  ('site_name',           'Jboss Clothing'),
  ('tagline',             'Wear what you are.'),
  ('instagram_handle',    '@jboss_clothing'),
  ('delivery_fee',        '3000'),
  ('currency',            'NGN'),
  ('paystack_public_key', ''),
  ('whatsapp_number',     ''),
  ('about_text',          'No hype. No gatekeeping. Just clean clothes made with intention — for people who know what they want before the world tells them.');

-- ─────────────────────────────────────────────
--  DEFAULT ADMIN  (update password immediately!)
--  Run: node -e "console.log(require('bcryptjs').hashSync('YourPassword',12))"
--  Then: UPDATE users SET password_hash='<hash>' WHERE email='admin@jbossclothing.com';
-- ─────────────────────────────────────────────
INSERT INTO users (full_name, email, password_hash, role, is_verified) VALUES
  ('Jboss Admin', 'admin@jbossclothing.com',
   '$2b$12$PLACEHOLDER_CHANGE_THIS_IMMEDIATELY_00000000000000000000',
   'admin', 1);
