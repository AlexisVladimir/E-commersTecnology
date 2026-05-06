-- ============================================================================
-- TechStore - Esquema de Base de Datos MySQL 8.0+
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ============================================================================

DROP DATABASE IF EXISTS techstore;
CREATE DATABASE techstore
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE techstore;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. USUARIOS Y AUTENTICACION
-- ============================================================================

CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email           VARCHAR(190) NOT NULL,
  password_hash   VARCHAR(255) NULL,                 -- NULL si solo OAuth
  first_name      VARCHAR(80)  NOT NULL,
  last_name       VARCHAR(80)  NOT NULL,
  phone           VARCHAR(30)  NULL,
  email_verified  TINYINT(1)   NOT NULL DEFAULT 0,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  status          ENUM('active','suspended','deleted') NOT NULL DEFAULT 'active',
  last_login_at   DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE user_oauth_accounts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  provider        ENUM('google','facebook','apple') NOT NULL,
  provider_user_id VARCHAR(190) NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_oauth_provider_user (provider, provider_user_id),
  KEY idx_oauth_user (user_id),
  CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_sessions (
  id              CHAR(36) NOT NULL,                  -- UUID
  user_id         BIGINT UNSIGNED NOT NULL,
  token_hash      CHAR(64) NOT NULL,                  -- SHA-256
  ip_address      VARCHAR(45) NULL,
  user_agent      VARCHAR(255) NULL,
  expires_at      DATETIME NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_token (token_hash),
  KEY idx_session_user (user_id),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE password_resets (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  token_hash      CHAR(64) NOT NULL,
  expires_at      DATETIME NOT NULL,
  used_at         DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_token (token_hash),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_settings (
  user_id              BIGINT UNSIGNED NOT NULL,
  email_notifications  TINYINT(1) NOT NULL DEFAULT 1,
  sms_notifications    TINYINT(1) NOT NULL DEFAULT 0,
  newsletter           TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 2. DIRECCIONES
-- ============================================================================

CREATE TABLE addresses (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NULL,
  label           VARCHAR(50) NOT NULL DEFAULT 'Shipping', -- "Home", "Office"
  recipient_name  VARCHAR(160) NOT NULL,
  phone           VARCHAR(30) NULL,
  line1           VARCHAR(255) NOT NULL,
  line2           VARCHAR(255) NULL,
  city            VARCHAR(100) NOT NULL,
  state           VARCHAR(100) NULL,
  zip             VARCHAR(20)  NOT NULL,
  country         VARCHAR(80)  NOT NULL DEFAULT 'United States',
  is_default      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_addr_user (user_id),
  CONSTRAINT fk_addr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 3. CATALOGO: CATEGORIAS, MARCAS, PRODUCTOS
-- ============================================================================

CREATE TABLE categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)  NOT NULL,                  -- Laptops, Smartphones...
  slug        VARCHAR(100) NOT NULL,
  icon        VARCHAR(50)  NULL,                      -- "Laptop", "Headphones"
  parent_id   INT UNSIGNED NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cat_slug (slug),
  KEY idx_cat_parent (parent_id),
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE brands (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name      VARCHAR(100) NOT NULL,
  slug      VARCHAR(120) NOT NULL,
  logo_url  VARCHAR(500) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brand_slug (slug),
  UNIQUE KEY uq_brand_name (name)
) ENGINE=InnoDB;

CREATE TABLE products (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku             VARCHAR(64)  NOT NULL,
  name            VARCHAR(200) NOT NULL,              -- "AeroBook Pro X1"
  slug            VARCHAR(220) NOT NULL,
  description     TEXT         NOT NULL,
  category_id     INT UNSIGNED NOT NULL,
  brand_id        INT UNSIGNED NULL,
  price           DECIMAL(10,2) NOT NULL,
  original_price  DECIMAL(10,2) NULL,                 -- precio antes de Sale
  badge           ENUM('New','Sale') NULL,            -- editorial; tambien derivable
  main_image      VARCHAR(500) NOT NULL,
  rating_avg      DECIMAL(3,2) NOT NULL DEFAULT 0.00, -- 0.00 - 5.00 (denormalizado)
  review_count    INT UNSIGNED NOT NULL DEFAULT 0,    -- denormalizado
  in_stock        TINYINT(1)   NOT NULL DEFAULT 1,
  stock_quantity  INT NOT NULL DEFAULT 5,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_sku (sku),
  UNIQUE KEY uq_product_slug (slug),
  KEY idx_product_cat (category_id),
  KEY idx_product_brand (brand_id),
  KEY idx_product_price (price),
  KEY idx_product_active_stock (is_active, in_stock),
  FULLTEXT KEY ft_product_search (name, description),
  CONSTRAINT fk_product_cat   FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_product_brand FOREIGN KEY (brand_id)    REFERENCES brands(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  BIGINT UNSIGNED NOT NULL,
  url         VARCHAR(500) NOT NULL,
  alt_text    VARCHAR(200) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_img_product (product_id),
  CONSTRAINT fk_img_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Specs en formato clave/valor (Processor, RAM, Storage, etc.)
CREATE TABLE product_specs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  BIGINT UNSIGNED NOT NULL,
  spec_key    VARCHAR(80)  NOT NULL,                  -- "Processor"
  spec_value  VARCHAR(255) NOT NULL,                  -- "Intel Core i9-13900H"
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_spec_product_key (product_id, spec_key),
  CONSTRAINT fk_spec_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- VARIANTES (color, almacenamiento, talla...)
-- Se modela atributo -> opcion -> variante de producto -> opciones de variante
-- ----------------------------------------------------------------------------

CREATE TABLE variant_attributes (
  id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(50) NOT NULL,                          -- "Color", "Storage", "Size"
  PRIMARY KEY (id),
  UNIQUE KEY uq_attr_name (name)
) ENGINE=InnoDB;

CREATE TABLE variant_options (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attribute_id  INT UNSIGNED NOT NULL,
  label         VARCHAR(80) NOT NULL,                  -- "Midnight Black", "1TB"
  value         VARCHAR(80) NOT NULL,                  -- "#1a1a1a", "1TB"
  PRIMARY KEY (id),
  UNIQUE KEY uq_attr_option (attribute_id, label),
  CONSTRAINT fk_opt_attribute FOREIGN KEY (attribute_id) REFERENCES variant_attributes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_variants (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id      BIGINT UNSIGNED NOT NULL,
  sku             VARCHAR(64) NOT NULL,
  price_override  DECIMAL(10,2) NULL,                  -- si NULL usa products.price
  stock_quantity  INT NOT NULL DEFAULT 0,
  image_url       VARCHAR(500) NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_variant_sku (sku),
  KEY idx_variant_product (product_id),
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_variant_options (
  variant_id  BIGINT UNSIGNED NOT NULL,
  option_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (variant_id, option_id),
  KEY idx_pvo_option (option_id),
  CONSTRAINT fk_pvo_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  CONSTRAINT fk_pvo_option  FOREIGN KEY (option_id)  REFERENCES variant_options(id)
) ENGINE=InnoDB;

-- ============================================================================
-- 4. CARRITO Y WISHLIST
-- ============================================================================

CREATE TABLE carts (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NULL,                    -- NULL para invitado
  session_id  CHAR(36) NULL,                           -- guest cart token
  status      ENUM('active','converted','abandoned') NOT NULL DEFAULT 'active',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cart_user (user_id),
  KEY idx_cart_session (session_id),
  CONSTRAINT fk_cart_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cart_id     BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  variant_id  BIGINT UNSIGNED NULL,
  variant_label VARCHAR(160) NOT NULL DEFAULT '',       -- "Midnight Black, 1TB"
  quantity    INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,                  -- precio al agregar
  added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_line (cart_id, product_id, variant_label),
  KEY idx_ci_product (product_id),
  KEY idx_ci_variant (variant_id),
  CONSTRAINT fk_ci_cart    FOREIGN KEY (cart_id)    REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_ci_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE wishlists (
  user_id     BIGINT UNSIGNED NOT NULL,
  product_id  BIGINT UNSIGNED NOT NULL,
  added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  KEY idx_wl_product (product_id),
  CONSTRAINT fk_wl_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_wl_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 5. METODOS DE PAGO (TOKENIZADOS)
-- ============================================================================

CREATE TABLE payment_methods (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NULL,
  brand           ENUM('visa','mastercard','amex','discover','other') NOT NULL,
  last4           CHAR(4) NOT NULL,
  exp_month       TINYINT UNSIGNED NOT NULL,
  exp_year        SMALLINT UNSIGNED NOT NULL,
  cardholder_name VARCHAR(160) NOT NULL,
  gateway         VARCHAR(40) NOT NULL DEFAULT 'stripe',
  gateway_token   VARCHAR(255) NOT NULL,               -- nunca el PAN real
  is_default      TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pm_user (user_id),
  CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 6. ORDENES
-- ============================================================================

CREATE TABLE orders (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number      VARCHAR(20) NOT NULL,              -- "TS-8X2K9M3A"
  user_id           BIGINT UNSIGNED NULL,
  status            ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded')
                      NOT NULL DEFAULT 'pending',
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  subtotal          DECIMAL(12,2) NOT NULL,
  shipping_cost     DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax               DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  total             DECIMAL(12,2) NOT NULL,
  -- Snapshot direccion (para no perder historial si se edita la direccion)
  ship_recipient    VARCHAR(160) NOT NULL,
  ship_email        VARCHAR(190) NOT NULL,
  ship_phone        VARCHAR(30)  NULL,
  ship_line1        VARCHAR(255) NOT NULL,
  ship_line2        VARCHAR(255) NULL,
  ship_city         VARCHAR(100) NOT NULL,
  ship_state        VARCHAR(100) NULL,
  ship_zip          VARCHAR(20)  NOT NULL,
  ship_country      VARCHAR(80)  NOT NULL,
  -- Referencias opcionales
  shipping_address_id BIGINT UNSIGNED NULL,
  payment_method_id   BIGINT UNSIGNED NULL,
  coupon_id           BIGINT UNSIGNED NULL,
  placed_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at           DATETIME NULL,
  shipped_at        DATETIME NULL,
  delivered_at      DATETIME NULL,
  cancelled_at      DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_number (order_number),
  KEY idx_order_user (user_id),
  KEY idx_order_status (status),
  KEY idx_order_placed (placed_at),
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_order_addr FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_pm   FOREIGN KEY (payment_method_id)   REFERENCES payment_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id        BIGINT UNSIGNED NOT NULL,
  product_id      BIGINT UNSIGNED NULL,                -- puede borrarse el producto
  variant_id      BIGINT UNSIGNED NULL,
  -- Snapshot al momento de la compra
  product_name    VARCHAR(200)  NOT NULL,
  variant_label   VARCHAR(160)  NULL,                  -- "Midnight Black, 1TB"
  product_sku     VARCHAR(64)   NOT NULL,
  product_image   VARCHAR(500)  NULL,
  unit_price      DECIMAL(10,2) NOT NULL,
  quantity        INT UNSIGNED  NOT NULL,
  line_total      DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_oi_order (order_id),
  KEY idx_oi_product (product_id),
  CONSTRAINT fk_oi_order   FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_oi_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    BIGINT UNSIGNED NOT NULL,
  status      ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded') NOT NULL,
  note        VARCHAR(255) NULL,
  changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_osh_order (order_id),
  CONSTRAINT fk_osh_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 7. PAGOS Y ENVIOS
-- ============================================================================

CREATE TABLE payments (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id          BIGINT UNSIGNED NOT NULL,
  payment_method_id BIGINT UNSIGNED NULL,
  amount            DECIMAL(12,2) NOT NULL,
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  gateway           VARCHAR(40) NOT NULL DEFAULT 'stripe',
  transaction_id    VARCHAR(100) NULL,
  status            ENUM('pending','authorized','captured','failed','refunded') NOT NULL DEFAULT 'pending',
  error_message     VARCHAR(255) NULL,
  paid_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pay_order (order_id),
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_pm    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE shipments (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id          BIGINT UNSIGNED NOT NULL,
  carrier           VARCHAR(60) NULL,                  -- UPS, FedEx, USPS...
  tracking_number   VARCHAR(100) NULL,
  status            ENUM('pending','in_transit','delivered','returned') NOT NULL DEFAULT 'pending',
  shipped_at        DATETIME NULL,
  delivered_at      DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_ship_order (order_id),
  CONSTRAINT fk_ship_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 8. RESEÑAS DE PRODUCTOS
-- ============================================================================

CREATE TABLE reviews (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  order_id    BIGINT UNSIGNED NULL,                    -- compra verificada
  rating      TINYINT UNSIGNED NOT NULL,               -- 1..5
  title       VARCHAR(160) NULL,
  body        TEXT NULL,
  is_approved TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_user_product_order (user_id, product_id, order_id),
  KEY idx_rev_product (product_id),
  KEY idx_rev_user (user_id),
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_rev_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_rev_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_rev_order   FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================================
-- 9. CUPONES / PROMOCIONES (opcional, soporta badge "Sale")
-- ============================================================================

CREATE TABLE coupons (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code            VARCHAR(40) NOT NULL,
  description     VARCHAR(255) NULL,
  discount_type   ENUM('percent','fixed') NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL,
  min_subtotal    DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses        INT UNSIGNED NULL,
  uses_count      INT UNSIGNED NOT NULL DEFAULT 0,
  valid_from      DATETIME NULL,
  valid_until     DATETIME NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupon_code (code)
) ENGINE=InnoDB;

ALTER TABLE orders
  ADD CONSTRAINT fk_order_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

-- ============================================================================
-- 10. SEED LOCAL DE PRODUCTOS (desde src/data/products.ts)
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

INSERT INTO categories (id, name, slug, icon, parent_id, sort_order) VALUES
(1, 'Laptops', 'laptops', 'Laptop', NULL, 1),
(2, 'Smartphones', 'smartphones', 'Smartphone', NULL, 2),
(3, 'Audio', 'audio', 'Headphones', NULL, 3),
(4, 'Wearables', 'wearables', 'Watch', NULL, 4),
(5, 'Peripherals', 'peripherals', 'Mouse', NULL, 5),
(6, 'Gaming', 'gaming', 'Gamepad2', NULL, 6),
(7, 'Storage', 'storage', 'HardDrive', NULL, 7),
(8, 'Accessories', 'accessories', 'Cable', NULL, 8),
(9, 'Monitors', 'monitors', NULL, NULL, 9),
(10, 'Tablets', 'tablets', NULL, NULL, 10);

INSERT INTO brands (id, name, slug, logo_url) VALUES
(1, 'TechStore', 'techstore', NULL),
(2, 'Aero', 'aero', NULL),
(3, 'Nova', 'nova', NULL),
(4, 'Sonic', 'sonic', NULL),
(5, 'Titan', 'titan', NULL),
(6, 'Pulse', 'pulse', NULL),
(7, 'Chroma', 'chroma', NULL);

INSERT INTO products (id, sku, name, slug, description, category_id, brand_id, price, original_price, badge, main_image, rating_avg, review_count, in_stock, stock_quantity, is_active)
VALUES
(1, 'SKU-1', 'AeroBook Pro X1', 'aerobook-pro-x1', 'Ultra-lightweight professional laptop with Intel Core i9, 32GB RAM, and 2TB SSD. Perfect for creative professionals who demand power without compromise. The 14-inch OLED display delivers stunning color accuracy with 100% DCI-P3 coverage.', 1, NULL, 1899.00, 2199.00, 'Sale', '/product-laptop-ultrabook.jpg', 4.80, 342, TRUE, 100, TRUE),
(2, 'SKU-2', 'Titan Gaming Laptop', 'titan-gaming-laptop', 'Dominate every battlefield with the Titan Gaming Laptop. Features RTX 4080 graphics, 240Hz display, and advanced cooling system for marathon gaming sessions without thermal throttling.', 1, NULL, 2499.00, NULL, 'New', '/product-gaming-laptop.jpg', 4.70, 189, TRUE, 100, TRUE),
(3, 'SKU-3', 'Nova Phone Ultra', 'nova-phone-ultra', 'The Nova Phone Ultra redefines mobile photography with a 200MP main sensor, 10x optical zoom, and AI-powered computational photography. The titanium frame and ceramic shield front deliver unmatched durability.', 2, NULL, 1099.00, 1299.00, 'Sale', '/product-smartphone.jpg', 4.90, 892, TRUE, 100, TRUE),
(4, 'SKU-4', 'Sonic Pro Headphones', 'sonic-pro-headphones', 'Immerse yourself in studio-quality sound with Sonic Pro. Active noise cancellation eliminates up to 45dB of ambient noise, while the 40mm beryllium drivers deliver pristine audio across the full frequency spectrum.', 3, NULL, 349.00, NULL, NULL, '/product-headphones.jpg', 4.60, 567, TRUE, 100, TRUE),
(5, 'SKU-5', 'Chroma Mechanical Keyboard', 'chroma-mechanical-keyboard', 'Precision-engineered mechanical keyboard with hot-swappable switches, aircraft-grade aluminum frame, and per-key RGB lighting. The gasket-mounted design provides a satisfying typing experience with reduced noise.', 5, NULL, 179.00, 229.00, 'Sale', '/product-keyboard.jpg', 4.80, 423, TRUE, 100, TRUE),
(6, 'SKU-6', 'Pulse Smartwatch', 'pulse-smartwatch', 'Your health companion reimagined. The Pulse Smartwatch features ECG monitoring, blood oxygen tracking, and sleep analysis with medical-grade accuracy. The titanium case and sapphire crystal ensure durability for any adventure.', 4, NULL, 399.00, NULL, 'New', '/product-smartwatch.jpg', 4.50, 234, TRUE, 100, TRUE),
(7, 'SKU-7', 'Aero Wireless Mouse', 'aero-wireless-mouse', 'Ultra-lightweight gaming mouse at just 58g. Features a PixArt PAW3395 sensor with 26K DPI, 1ms wireless latency, and 80-hour battery life. The translucent shell reveals precision-engineered internals.', 5, NULL, 89.00, NULL, NULL, '/product-mouse.jpg', 4.40, 678, TRUE, 100, TRUE),
(8, 'SKU-8', 'ViewMaster 4K Monitor', 'viewmaster-4k-monitor', 'Professional-grade 32-inch 4K monitor with 98% DCI-P3 color gamut, HDR1000 certification, and USB-C docking with 90W power delivery. The near-borderless design maximizes screen real estate for productivity.', 9, NULL, 699.00, 899.00, 'Sale', '/product-monitor.jpg', 4.70, 156, TRUE, 100, TRUE),
(9, 'SKU-9', 'Aurora Wireless Earbuds', 'aurora-wireless-earbuds', 'True wireless earbuds with adaptive ANC that adjusts to your environment in real-time. The custom 11mm drivers deliver deep bass and crystal-clear highs. 8-hour playback with 32 hours from the charging case.', 3, NULL, 199.00, NULL, 'New', '/product-earbuds.jpg', 4.60, 445, TRUE, 100, TRUE),
(10, 'SKU-10', 'UltraStore SSD 2TB', 'ultrastore-ssd-2tb', 'Pocket-sized powerhouse with 2000MB/s read speeds. The rugged aluminum enclosure survives drops from 3 meters and is IP55 dust and water resistant. Perfect for creators on the move.', 7, NULL, 249.00, NULL, NULL, '/product-ssd.jpg', 4.80, 321, TRUE, 100, TRUE),
(11, 'SKU-11', 'Vision VR Headset', 'vision-vr-headset', 'Step into new worlds with the Vision VR Headset. Dual 4K OLED displays at 90Hz deliver breathtaking immersion. Inside-out tracking with 6 cameras means no external sensors needed.', 6, NULL, 599.00, 799.00, 'Sale', '/product-vr.jpg', 4.30, 112, TRUE, 100, TRUE),
(12, 'SKU-12', 'Studio 4K Webcam', 'studio-4k-webcam', 'Professional streaming webcam with 4K resolution, AI auto-framing, and HDR support. The large Sony STARVIS sensor delivers exceptional low-light performance for crystal-clear video calls and streams.', 5, NULL, 149.00, NULL, NULL, '/product-webcam.jpg', 4.50, 289, TRUE, 100, TRUE),
(13, 'SKU-13', 'Create Tablet Pro', 'create-tablet-pro', 'The ultimate creative canvas. 12.9-inch Liquid Retina XDR display with ProMotion technology. The M2 chip handles complex 3D rendering and video editing with ease. Includes precision stylus with 4096 pressure levels.', 10, NULL, 1299.00, NULL, NULL, '/product-tablet.jpg', 4.70, 201, TRUE, 100, TRUE),
(14, 'SKU-14', 'Elite Game Controller', 'elite-game-controller', 'Pro-level precision with Hall Effect joysticks that never drift. Customizable back paddles, hair-trigger locks, and interchangeable D-pad. Connects via ultra-low-latency 2.4GHz wireless or USB-C.', 6, NULL, 179.00, NULL, NULL, '/product-controller.jpg', 4.60, 534, TRUE, 100, TRUE),
(15, 'SKU-15', 'DockMaster USB-C Hub', 'dockmaster-usb-c-hub', 'Expand your connectivity with 8 ports in one compact hub. HDMI 4K@60Hz, 2x USB-A 3.0, USB-C PD 100W passthrough, SD/microSD card reader, and Gigabit Ethernet. Aluminum unibody construction for maximum heat dissipation.', 8, NULL, 79.00, 99.00, 'Sale', '/product-hub.jpg', 4.40, 876, TRUE, 100, TRUE),
(16, 'SKU-16', 'HomePod Smart Speaker', 'homepod-smart-speaker', 'Room-filling sound with computational audio. The high-excursion woofer and five beamforming tweeters create an immersive soundstage. Built-in voice assistant with privacy-first on-device processing.', 3, NULL, 299.00, NULL, NULL, '/product-speaker.jpg', 4.50, 445, TRUE, 100, TRUE);

INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES
(1, '/product-laptop-ultrabook.jpg', 'AeroBook Pro X1', 0),
(2, '/product-gaming-laptop.jpg', 'Titan Gaming Laptop', 0),
(3, '/product-smartphone.jpg', 'Nova Phone Ultra', 0),
(4, '/product-headphones.jpg', 'Sonic Pro Headphones', 0),
(5, '/product-keyboard.jpg', 'Chroma Mechanical Keyboard', 0),
(6, '/product-smartwatch.jpg', 'Pulse Smartwatch', 0),
(7, '/product-mouse.jpg', 'Aero Wireless Mouse', 0),
(8, '/product-monitor.jpg', 'ViewMaster 4K Monitor', 0),
(9, '/product-earbuds.jpg', 'Aurora Wireless Earbuds', 0),
(10, '/product-ssd.jpg', 'UltraStore SSD 2TB', 0),
(11, '/product-vr.jpg', 'Vision VR Headset', 0),
(12, '/product-webcam.jpg', 'Studio 4K Webcam', 0),
(13, '/product-tablet.jpg', 'Create Tablet Pro', 0),
(14, '/product-controller.jpg', 'Elite Game Controller', 0),
(15, '/product-hub.jpg', 'DockMaster USB-C Hub', 0),
(16, '/product-speaker.jpg', 'HomePod Smart Speaker', 0);

INSERT INTO product_specs (product_id, spec_key, spec_value, sort_order) VALUES
(1, 'Processor', 'Intel Core i9-13900H', 0),
(1, 'RAM', '32GB LPDDR5X', 1),
(1, 'Storage', '2TB NVMe SSD', 2),
(1, 'Display', '14" OLED 2880x1800', 3),
(1, 'Battery', '72Wh, up to 18h', 4),
(1, 'Weight', '1.2kg', 5),
(2, 'Processor', 'AMD Ryzen 9 7945HX', 0),
(2, 'RAM', '64GB DDR5', 1),
(2, 'Storage', '2TB NVMe SSD', 2),
(2, 'Display', '17.3" QHD 240Hz', 3),
(2, 'Graphics', 'NVIDIA RTX 4080', 4),
(2, 'Cooling', 'Liquid metal + Vapor chamber', 5),
(3, 'Display', '6.8" LTPO AMOLED 120Hz', 0),
(3, 'Processor', 'Snapdragon 8 Gen 3', 1),
(3, 'Camera', '200MP main + 50MP ultra-wide', 2),
(3, 'Battery', '5500mAh, 120W charging', 3),
(3, 'Storage', '512GB', 4),
(3, 'OS', 'Android 14', 5),
(4, 'Drivers', '40mm Beryllium', 0),
(4, 'Noise Cancellation', '45dB ANC', 1),
(4, 'Battery Life', '40 hours', 2),
(4, 'Connectivity', 'Bluetooth 5.3, 3.5mm', 3),
(4, 'Weight', '250g', 4),
(4, 'Codecs', 'LDAC, aptX HD, AAC', 5),
(5, 'Switches', 'Hot-swappable 3/5-pin', 0),
(5, 'Layout', '75% ANSI', 1),
(5, 'Keycaps', 'PBT doubleshot', 2),
(5, 'Backlight', 'Per-key RGB', 3),
(5, 'Connectivity', 'USB-C, 2.4GHz, Bluetooth', 4),
(5, 'Battery', '3000mAh (wireless mode)', 5),
(6, 'Display', '1.5" AMOLED Always-on', 0),
(6, 'Sensors', 'ECG, SpO2, Body temp', 1),
(6, 'Battery Life', '14 days typical', 2),
(6, 'Water Resistance', '5ATM', 3),
(6, 'GPS', 'Dual-band L1+L5', 4),
(6, 'Compatibility', 'iOS 15+, Android 12+', 5),
(7, 'Sensor', 'PixArt PAW3395', 0),
(7, 'DPI', '100-26,000', 1),
(7, 'Polling Rate', '1000Hz', 2),
(7, 'Weight', '58g', 3),
(7, 'Battery', '80 hours', 4),
(7, 'Connectivity', '2.4GHz, Bluetooth, USB-C', 5),
(8, 'Display', '32" IPS 4K UHD', 0),
(8, 'Color Gamut', '98% DCI-P3, 100% sRGB', 1),
(8, 'HDR', 'HDR1000', 2),
(8, 'Refresh', '144Hz', 3),
(8, 'Connectivity', 'USB-C, HDMI 2.1, DP 1.4', 4),
(8, 'USB Hub', '4x USB 3.0', 5),
(9, 'Drivers', '11mm custom dynamic', 0),
(9, 'Noise Cancellation', 'Adaptive ANC', 1),
(9, 'Battery', '8h + 32h case', 2),
(9, 'Water Resistance', 'IPX7', 3),
(9, 'Connectivity', 'Bluetooth 5.3, multipoint', 4),
(9, 'Codecs', 'aptX Adaptive, AAC', 5),
(10, 'Capacity', '2TB', 0),
(10, 'Read Speed', '2000MB/s', 1),
(10, 'Write Speed', '1800MB/s', 2),
(10, 'Interface', 'USB-C 3.2 Gen 2x2', 3),
(10, 'Durability', '3m drop, IP55', 4),
(10, 'Encryption', 'AES-256 hardware', 5),
(11, 'Display', 'Dual 4K OLED 90Hz', 0),
(11, 'FOV', '110 degrees', 1),
(11, 'Tracking', '6-camera inside-out', 2),
(11, 'Audio', 'Spatial 3D audio', 3),
(11, 'Controllers', 'Tracked motion controllers', 4),
(11, 'Connectivity', 'USB-C, WiFi 6E', 5),
(12, 'Resolution', '4K@30fps, 1080p@60fps', 0),
(12, 'Sensor', 'Sony STARVIS 1/1.8"', 1),
(12, 'FOV', '90 degrees adjustable', 2),
(12, 'Auto Focus', 'AI-powered', 3),
(12, 'Privacy', 'Physical shutter', 4),
(12, 'Mounting', 'Monitor clip, tripod thread', 5),
(13, 'Display', '12.9" Liquid Retina XDR', 0),
(13, 'Processor', 'M2 chip', 1),
(13, 'RAM', '16GB', 2),
(13, 'Storage', '1TB', 3),
(13, 'Stylus', '4096 pressure levels', 4),
(13, 'Battery', '10 hours', 5),
(14, 'Joysticks', 'Hall Effect (no drift)', 0),
(14, 'Buttons', 'Mechanical switches', 1),
(14, 'Paddles', '4x programmable back', 2),
(14, 'Triggers', 'Hair-trigger locks', 3),
(14, 'Battery', '40 hours wireless', 4),
(14, 'Connectivity', '2.4GHz, Bluetooth, USB-C', 5),
(15, 'Ports', '8-in-1', 0),
(15, 'HDMI', '4K@60Hz', 1),
(15, 'USB-A', '2x USB 3.0', 2),
(15, 'USB-C PD', '100W passthrough', 3),
(15, 'Card Reader', 'SD + microSD UHS-II', 4),
(15, 'Ethernet', 'Gigabit', 5),
(16, 'Drivers', '1x woofer, 5x tweeters', 0),
(16, 'Audio', '360-degree soundstage', 1),
(16, 'Assistant', 'Built-in voice AI', 2),
(16, 'Connectivity', 'WiFi 6, Bluetooth 5.0', 3),
(16, 'Multi-room', 'Sync up to 8 speakers', 4),
(16, 'Size', '172mm x 142mm', 5);

INSERT INTO variant_attributes (id, name) VALUES
(1, 'Color'),
(2, 'Storage');

INSERT INTO variant_options (id, attribute_id, label, value) VALUES
(1, 1, 'Midnight Black', '#1a1a1a'),
(2, 1, 'Silver', '#c0c0c0'),
(3, 1, 'Stealth Black', '#0a0a0a'),
(4, 1, 'Phantom White', '#e8e8e8'),
(5, 1, 'Obsidian', '#1a1a2e'),
(6, 1, 'Titanium', '#8a8a8a'),
(7, 1, 'Ocean Blue', '#1e3a5f'),
(8, 1, 'Black', '#1a1a1a'),
(9, 1, 'White', '#f5f5f5'),
(10, 1, 'Graphite', '#2d2d2d'),
(11, 1, 'Space Gray', '#4a4a4a'),
(12, 2, '512GB', '512GB'),
(13, 2, '1TB', '1TB'),
(14, 2, '2TB', '2TB');

INSERT INTO product_variants (id, product_id, sku, price_override, stock_quantity, image_url, is_active) VALUES
(1, 1, 'SKU-1-COLOR-1', NULL, 100, NULL, TRUE),
(2, 1, 'SKU-1-COLOR-2', NULL, 100, NULL, TRUE),
(3, 1, 'SKU-1-STORAGE-1', NULL, 100, NULL, TRUE),
(4, 1, 'SKU-1-STORAGE-2', NULL, 100, NULL, TRUE),
(5, 1, 'SKU-1-STORAGE-3', NULL, 100, NULL, TRUE),
(6, 2, 'SKU-2-COLOR-1', NULL, 100, NULL, TRUE),
(7, 2, 'SKU-2-COLOR-2', NULL, 100, NULL, TRUE),
(8, 3, 'SKU-3-COLOR-1', NULL, 100, NULL, TRUE),
(9, 3, 'SKU-3-COLOR-2', NULL, 100, NULL, TRUE),
(10, 3, 'SKU-3-COLOR-3', NULL, 100, NULL, TRUE),
(11, 5, 'SKU-5-COLOR-1', NULL, 100, NULL, TRUE),
(12, 5, 'SKU-5-COLOR-2', NULL, 100, NULL, TRUE),
(13, 6, 'SKU-6-COLOR-1', NULL, 100, NULL, TRUE),
(14, 6, 'SKU-6-COLOR-2', NULL, 100, NULL, TRUE),
(15, 13, 'SKU-13-COLOR-1', NULL, 100, NULL, TRUE),
(16, 13, 'SKU-13-COLOR-2', NULL, 100, NULL, TRUE);

INSERT INTO product_variant_options (variant_id, option_id) VALUES
(1, 1),
(2, 2),
(3, 12),
(4, 13),
(5, 14),
(6, 3),
(7, 4),
(8, 5),
(9, 6),
(10, 7),
(11, 8),
(12, 9),
(13, 10),
(14, 11),
(15, 11),
(16, 2);

SET FOREIGN_KEY_CHECKS = 1;
