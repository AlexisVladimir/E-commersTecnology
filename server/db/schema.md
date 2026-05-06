# TechStore — Esquema MySQL

Base de datos completa para la app TechStore (React + Vite). Incluye DDL (`CREATE`) e `INSERT` con datos sembrados a partir de [src/data/products.ts](../src/data/products.ts).

- **Motor:** InnoDB
- **Charset:** utf8mb4 / utf8mb4_unicode_ci
- **Versión MySQL:** 8.0+

> Ejecuta los bloques en orden. Cada sección crea tablas y luego inserta sus datos.

---

## 0. Crear base de datos

```sql
DROP DATABASE IF EXISTS techstore;
CREATE DATABASE techstore
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE techstore;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;
```

---

## 1. Usuarios y autenticación

### CREATE

```sql
CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email           VARCHAR(190) NOT NULL,
  password_hash   VARCHAR(255) NULL,
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
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  provider         ENUM('google','facebook','apple') NOT NULL,
  provider_user_id VARCHAR(190) NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_oauth_provider_user (provider, provider_user_id),
  KEY idx_oauth_user (user_id),
  CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_sessions (
  id          CHAR(36) NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  ip_address  VARCHAR(45) NULL,
  user_agent  VARCHAR(255) NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_token (token_hash),
  KEY idx_session_user (user_id),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE password_resets (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
```

### INSERT

```sql
-- Usuario demo (password = "password123" hash bcrypt placeholder)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, email_verified) VALUES
  (1, 'john@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'John', 'Doe', '+1 (555) 123-4567', 1),
  (2, 'jane@example.com', '$2b$10$zyxwvutsrqponmlkjihgfe', 'Jane', 'Smith', '+1 (555) 987-6543', 1);

INSERT INTO user_settings (user_id, email_notifications, sms_notifications, newsletter, two_factor_enabled) VALUES
  (1, 1, 0, 1, 0),
  (2, 1, 1, 1, 1);
```

> Nota: `user_settings` no tiene la columna `two_factor_enabled` en el DDL anterior — `2FA` vive en `users`. Usa este insert alternativo si seguiste el DDL exacto:

```sql
INSERT INTO user_settings (user_id, email_notifications, sms_notifications, newsletter) VALUES
  (1, 1, 0, 1),
  (2, 1, 1, 1);

UPDATE users SET two_factor_enabled = 1 WHERE id = 2;
```

---

## 2. Direcciones

### CREATE

```sql
CREATE TABLE addresses (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  label           VARCHAR(50)  NOT NULL,
  recipient_name  VARCHAR(160) NOT NULL,
  phone           VARCHAR(30)  NULL,
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
```

### INSERT

```sql
INSERT INTO addresses (id, user_id, label, recipient_name, phone, line1, city, state, zip, country, is_default) VALUES
  (1, 1, 'Home',   'John Doe', '+1 (555) 123-4567', '123 Main Street',  'New York',      'NY', '10001', 'United States', 1),
  (2, 1, 'Office', 'John Doe', '+1 (555) 123-4567', '456 Tech Blvd',    'San Francisco', 'CA', '94102', 'United States', 0),
  (3, 2, 'Home',   'Jane Smith','+1 (555) 987-6543','789 Market St',    'Seattle',       'WA', '98101', 'United States', 1);
```

---

## 3. Catálogo: categorías y marcas

### CREATE

```sql
CREATE TABLE categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(80)  NOT NULL,
  slug        VARCHAR(100) NOT NULL,
  icon        VARCHAR(50)  NULL,
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
```

### INSERT

```sql
INSERT INTO categories (id, name, slug, icon, sort_order) VALUES
  (1,  'Laptops',     'laptops',     'Laptop',      1),
  (2,  'Smartphones', 'smartphones', 'Smartphone',  2),
  (3,  'Audio',       'audio',       'Headphones',  3),
  (4,  'Wearables',   'wearables',   'Watch',       4),
  (5,  'Peripherals', 'peripherals', 'Mouse',       5),
  (6,  'Gaming',      'gaming',      'Gamepad2',    6),
  (7,  'Storage',     'storage',     'HardDrive',   7),
  (8,  'Accessories', 'accessories', 'Cable',       8),
  (9,  'Monitors',    'monitors',    'Monitor',     9),
  (10, 'Tablets',     'tablets',     'Tablet',     10);

INSERT INTO brands (id, name, slug) VALUES
  (1, 'TechStore', 'techstore'),
  (2, 'Aero',      'aero'),
  (3, 'Nova',      'nova'),
  (4, 'Sonic',     'sonic'),
  (5, 'Titan',     'titan'),
  (6, 'Pulse',     'pulse'),
  (7, 'Chroma',    'chroma');
```

---

## 4. Productos, imágenes y especificaciones

### CREATE

```sql
CREATE TABLE products (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sku             VARCHAR(64)  NOT NULL,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(220) NOT NULL,
  description     TEXT         NOT NULL,
  category_id     INT UNSIGNED NOT NULL,
  brand_id        INT UNSIGNED NULL,
  price           DECIMAL(10,2) NOT NULL,
  original_price  DECIMAL(10,2) NULL,
  badge           ENUM('New','Sale') NULL,
  main_image      VARCHAR(500) NOT NULL,
  rating_avg      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count    INT UNSIGNED NOT NULL DEFAULT 0,
  in_stock        TINYINT(1)   NOT NULL DEFAULT 1,
  stock_quantity  INT NOT NULL DEFAULT 0,
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

CREATE TABLE product_specs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  BIGINT UNSIGNED NOT NULL,
  spec_key    VARCHAR(80)  NOT NULL,
  spec_value  VARCHAR(255) NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_spec_product_key (product_id, spec_key),
  CONSTRAINT fk_spec_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### INSERT — productos (16)

```sql
INSERT INTO products (id, sku, name, slug, description, category_id, brand_id, price, original_price, badge, main_image, rating_avg, review_count, in_stock, stock_quantity) VALUES
  (1,  'TS-AERO-X1',     'AeroBook Pro X1',           'aerobook-pro-x1',           'Ultra-lightweight professional laptop with Intel Core i9, 32GB RAM, and 2TB SSD. Perfect for creative professionals who demand power without compromise. The 14-inch OLED display delivers stunning color accuracy with 100% DCI-P3 coverage.', 1, 2, 1899.00, 2199.00, 'Sale', '/product-laptop-ultrabook.jpg', 4.80, 342, 1, 50),
  (2,  'TS-TITAN-GL',    'Titan Gaming Laptop',       'titan-gaming-laptop',       'Dominate every battlefield with the Titan Gaming Laptop. Features RTX 4080 graphics, 240Hz display, and advanced cooling system for marathon gaming sessions without thermal throttling.', 1, 5, 2499.00, NULL,    'New',  '/product-gaming-laptop.jpg',   4.70, 189, 1, 30),
  (3,  'TS-NOVA-ULT',    'Nova Phone Ultra',          'nova-phone-ultra',          'The Nova Phone Ultra redefines mobile photography with a 200MP main sensor, 10x optical zoom, and AI-powered computational photography. The titanium frame and ceramic shield front deliver unmatched durability.', 2, 3, 1099.00, 1299.00, 'Sale', '/product-smartphone.jpg',      4.90, 892, 1, 120),
  (4,  'TS-SONIC-PRO',   'Sonic Pro Headphones',      'sonic-pro-headphones',      'Immerse yourself in studio-quality sound with Sonic Pro. Active noise cancellation eliminates up to 45dB of ambient noise, while the 40mm beryllium drivers deliver pristine audio across the full frequency spectrum.', 3, 4,  349.00, NULL,    NULL,   '/product-headphones.jpg',      4.60, 567, 1, 80),
  (5,  'TS-CHROMA-KB',   'Chroma Mechanical Keyboard','chroma-mechanical-keyboard','Precision-engineered mechanical keyboard with hot-swappable switches, aircraft-grade aluminum frame, and per-key RGB lighting. The gasket-mounted design provides a satisfying typing experience with reduced noise.', 5, 7,  179.00,  229.00, 'Sale', '/product-keyboard.jpg',        4.80, 423, 1, 100),
  (6,  'TS-PULSE-SW',    'Pulse Smartwatch',          'pulse-smartwatch',          'Your health companion reimagined. The Pulse Smartwatch features ECG monitoring, blood oxygen tracking, and sleep analysis with medical-grade accuracy. The titanium case and sapphire crystal ensure durability for any adventure.', 4, 6,  399.00, NULL,    'New',  '/product-smartwatch.jpg',      4.50, 234, 1, 60),
  (7,  'TS-AERO-MOUSE',  'Aero Wireless Mouse',       'aero-wireless-mouse',       'Ultra-lightweight gaming mouse at just 58g. Features a PixArt PAW3395 sensor with 26K DPI, 1ms wireless latency, and 80-hour battery life. The translucent shell reveals precision-engineered internals.', 5, 2,   89.00, NULL,    NULL,   '/product-mouse.jpg',           4.40, 678, 1, 200),
  (8,  'TS-VIEW-4K',     'ViewMaster 4K Monitor',     'viewmaster-4k-monitor',     'Professional-grade 32-inch 4K monitor with 98% DCI-P3 color gamut, HDR1000 certification, and USB-C docking with 90W power delivery. The near-borderless design maximizes screen real estate for productivity.', 9, 1,  699.00,  899.00, 'Sale', '/product-monitor.jpg',         4.70, 156, 1, 40),
  (9,  'TS-AURORA-EB',   'Aurora Wireless Earbuds',   'aurora-wireless-earbuds',   'True wireless earbuds with adaptive ANC that adjusts to your environment in real-time. The custom 11mm drivers deliver deep bass and crystal-clear highs. 8-hour playback with 32 hours from the charging case.', 3, 1,  199.00, NULL,    'New',  '/product-earbuds.jpg',         4.60, 445, 1, 150),
  (10, 'TS-ULTRA-SSD',   'UltraStore SSD 2TB',        'ultrastore-ssd-2tb',        'Pocket-sized powerhouse with 2000MB/s read speeds. The rugged aluminum enclosure survives drops from 3 meters and is IP55 dust and water resistant. Perfect for creators on the move.', 7, 1,  249.00, NULL,    NULL,   '/product-ssd.jpg',             4.80, 321, 1, 90),
  (11, 'TS-VISION-VR',   'Vision VR Headset',         'vision-vr-headset',         'Step into new worlds with the Vision VR Headset. Dual 4K OLED displays at 90Hz deliver breathtaking immersion. Inside-out tracking with 6 cameras means no external sensors needed.', 6, 1,  599.00,  799.00, 'Sale', '/product-vr.jpg',              4.30, 112, 1, 25),
  (12, 'TS-STUDIO-CAM',  'Studio 4K Webcam',          'studio-4k-webcam',          'Professional streaming webcam with 4K resolution, AI auto-framing, and HDR support. The large Sony STARVIS sensor delivers exceptional low-light performance for crystal-clear video calls and streams.', 5, 1,  149.00, NULL,    NULL,   '/product-webcam.jpg',          4.50, 289, 1, 75),
  (13, 'TS-CREATE-TAB',  'Create Tablet Pro',         'create-tablet-pro',         'The ultimate creative canvas. 12.9-inch Liquid Retina XDR display with ProMotion technology. The M2 chip handles complex 3D rendering and video editing with ease. Includes precision stylus with 4096 pressure levels.',10, 1, 1299.00, NULL,    NULL,   '/product-tablet.jpg',          4.70, 201, 1, 35),
  (14, 'TS-ELITE-CTRL',  'Elite Game Controller',     'elite-game-controller',     'Pro-level precision with Hall Effect joysticks that never drift. Customizable back paddles, hair-trigger locks, and interchangeable D-pad. Connects via ultra-low-latency 2.4GHz wireless or USB-C.', 6, 1,  179.00, NULL,    NULL,   '/product-controller.jpg',      4.60, 534, 1, 110),
  (15, 'TS-DOCK-USBC',   'DockMaster USB-C Hub',      'dockmaster-usb-c-hub',      'Expand your connectivity with 8 ports in one compact hub. HDMI 4K@60Hz, 2x USB-A 3.0, USB-C PD 100W passthrough, SD/microSD card reader, and Gigabit Ethernet. Aluminum unibody construction for maximum heat dissipation.', 8, 1,   79.00,   99.00, 'Sale', '/product-hub.jpg',             4.40, 876, 1, 220),
  (16, 'TS-HOMEPOD-SP',  'HomePod Smart Speaker',     'homepod-smart-speaker',     'Room-filling sound with computational audio. The high-excursion woofer and five beamforming tweeters create an immersive soundstage. Built-in voice assistant with privacy-first on-device processing.', 3, 1,  299.00, NULL,    NULL,   '/product-speaker.jpg',         4.50, 445, 1, 65);
```

### INSERT — `product_images` (imagen principal repetida como galería)

```sql
INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES
  (1,  '/product-laptop-ultrabook.jpg', 'AeroBook Pro X1',            0),
  (2,  '/product-gaming-laptop.jpg',    'Titan Gaming Laptop',        0),
  (3,  '/product-smartphone.jpg',       'Nova Phone Ultra',           0),
  (4,  '/product-headphones.jpg',       'Sonic Pro Headphones',       0),
  (5,  '/product-keyboard.jpg',         'Chroma Mechanical Keyboard', 0),
  (6,  '/product-smartwatch.jpg',       'Pulse Smartwatch',           0),
  (7,  '/product-mouse.jpg',            'Aero Wireless Mouse',        0),
  (8,  '/product-monitor.jpg',          'ViewMaster 4K Monitor',      0),
  (9,  '/product-earbuds.jpg',          'Aurora Wireless Earbuds',    0),
  (10, '/product-ssd.jpg',              'UltraStore SSD 2TB',         0),
  (11, '/product-vr.jpg',               'Vision VR Headset',          0),
  (12, '/product-webcam.jpg',           'Studio 4K Webcam',           0),
  (13, '/product-tablet.jpg',           'Create Tablet Pro',          0),
  (14, '/product-controller.jpg',       'Elite Game Controller',      0),
  (15, '/product-hub.jpg',              'DockMaster USB-C Hub',       0),
  (16, '/product-speaker.jpg',          'HomePod Smart Speaker',      0);
```

### INSERT — `product_specs`

```sql
INSERT INTO product_specs (product_id, spec_key, spec_value, sort_order) VALUES
  -- 1. AeroBook Pro X1
  (1, 'Processor', 'Intel Core i9-13900H',     1),
  (1, 'RAM',       '32GB LPDDR5X',             2),
  (1, 'Storage',   '2TB NVMe SSD',             3),
  (1, 'Display',   '14" OLED 2880x1800',       4),
  (1, 'Battery',   '72Wh, up to 18h',          5),
  (1, 'Weight',    '1.2kg',                    6),
  -- 2. Titan Gaming Laptop
  (2, 'Processor', 'AMD Ryzen 9 7945HX',                 1),
  (2, 'RAM',       '64GB DDR5',                          2),
  (2, 'Storage',   '2TB NVMe SSD',                       3),
  (2, 'Display',   '17.3" QHD 240Hz',                    4),
  (2, 'Graphics',  'NVIDIA RTX 4080',                    5),
  (2, 'Cooling',   'Liquid metal + Vapor chamber',       6),
  -- 3. Nova Phone Ultra
  (3, 'Display',   '6.8" LTPO AMOLED 120Hz',             1),
  (3, 'Processor', 'Snapdragon 8 Gen 3',                 2),
  (3, 'Camera',    '200MP main + 50MP ultra-wide',       3),
  (3, 'Battery',   '5500mAh, 120W charging',             4),
  (3, 'Storage',   '512GB',                              5),
  (3, 'OS',        'Android 14',                         6),
  -- 4. Sonic Pro Headphones
  (4, 'Drivers',            '40mm Beryllium',            1),
  (4, 'Noise Cancellation', '45dB ANC',                  2),
  (4, 'Battery Life',       '40 hours',                  3),
  (4, 'Connectivity',       'Bluetooth 5.3, 3.5mm',      4),
  (4, 'Weight',             '250g',                      5),
  (4, 'Codecs',             'LDAC, aptX HD, AAC',        6),
  -- 5. Chroma Mechanical Keyboard
  (5, 'Switches',     'Hot-swappable 3/5-pin',           1),
  (5, 'Layout',       '75% ANSI',                        2),
  (5, 'Keycaps',      'PBT doubleshot',                  3),
  (5, 'Backlight',    'Per-key RGB',                     4),
  (5, 'Connectivity', 'USB-C, 2.4GHz, Bluetooth',        5),
  (5, 'Battery',      '3000mAh (wireless mode)',         6),
  -- 6. Pulse Smartwatch
  (6, 'Display',          '1.5" AMOLED Always-on',       1),
  (6, 'Sensors',          'ECG, SpO2, Body temp',        2),
  (6, 'Battery Life',     '14 days typical',             3),
  (6, 'Water Resistance', '5ATM',                        4),
  (6, 'GPS',              'Dual-band L1+L5',             5),
  (6, 'Compatibility',    'iOS 15+, Android 12+',        6),
  -- 7. Aero Wireless Mouse
  (7, 'Sensor',       'PixArt PAW3395',                  1),
  (7, 'DPI',          '100-26,000',                      2),
  (7, 'Polling Rate', '1000Hz',                          3),
  (7, 'Weight',       '58g',                             4),
  (7, 'Battery',      '80 hours',                        5),
  (7, 'Connectivity', '2.4GHz, Bluetooth, USB-C',        6),
  -- 8. ViewMaster 4K Monitor
  (8, 'Display',      '32" IPS 4K UHD',                  1),
  (8, 'Color Gamut',  '98% DCI-P3, 100% sRGB',           2),
  (8, 'HDR',          'HDR1000',                         3),
  (8, 'Refresh',      '144Hz',                           4),
  (8, 'Connectivity', 'USB-C, HDMI 2.1, DP 1.4',         5),
  (8, 'USB Hub',      '4x USB 3.0',                      6),
  -- 9. Aurora Wireless Earbuds
  (9, 'Drivers',            '11mm custom dynamic',       1),
  (9, 'Noise Cancellation', 'Adaptive ANC',              2),
  (9, 'Battery',            '8h + 32h case',             3),
  (9, 'Water Resistance',   'IPX7',                      4),
  (9, 'Connectivity',       'Bluetooth 5.3, multipoint', 5),
  (9, 'Codecs',             'aptX Adaptive, AAC',        6),
  -- 10. UltraStore SSD 2TB
  (10, 'Capacity',    '2TB',                             1),
  (10, 'Read Speed',  '2000MB/s',                        2),
  (10, 'Write Speed', '1800MB/s',                        3),
  (10, 'Interface',   'USB-C 3.2 Gen 2x2',               4),
  (10, 'Durability',  '3m drop, IP55',                   5),
  (10, 'Encryption',  'AES-256 hardware',                6),
  -- 11. Vision VR Headset
  (11, 'Display',      'Dual 4K OLED 90Hz',              1),
  (11, 'FOV',          '110 degrees',                    2),
  (11, 'Tracking',     '6-camera inside-out',            3),
  (11, 'Audio',        'Spatial 3D audio',               4),
  (11, 'Controllers',  'Tracked motion controllers',     5),
  (11, 'Connectivity', 'USB-C, WiFi 6E',                 6),
  -- 12. Studio 4K Webcam
  (12, 'Resolution', '4K@30fps, 1080p@60fps',            1),
  (12, 'Sensor',     'Sony STARVIS 1/1.8"',              2),
  (12, 'FOV',        '90 degrees adjustable',            3),
  (12, 'Auto Focus', 'AI-powered',                       4),
  (12, 'Privacy',    'Physical shutter',                 5),
  (12, 'Mounting',   'Monitor clip, tripod thread',      6),
  -- 13. Create Tablet Pro
  (13, 'Display',   '12.9" Liquid Retina XDR',           1),
  (13, 'Processor', 'M2 chip',                           2),
  (13, 'RAM',       '16GB',                              3),
  (13, 'Storage',   '1TB',                               4),
  (13, 'Stylus',    '4096 pressure levels',              5),
  (13, 'Battery',   '10 hours',                          6),
  -- 14. Elite Game Controller
  (14, 'Joysticks',    'Hall Effect (no drift)',         1),
  (14, 'Buttons',      'Mechanical switches',            2),
  (14, 'Paddles',      '4x programmable back',           3),
  (14, 'Triggers',     'Hair-trigger locks',             4),
  (14, 'Battery',      '40 hours wireless',              5),
  (14, 'Connectivity', '2.4GHz, Bluetooth, USB-C',       6),
  -- 15. DockMaster USB-C Hub
  (15, 'Ports',       '8-in-1',                          1),
  (15, 'HDMI',        '4K@60Hz',                         2),
  (15, 'USB-A',       '2x USB 3.0',                      3),
  (15, 'USB-C PD',    '100W passthrough',                4),
  (15, 'Card Reader', 'SD + microSD UHS-II',             5),
  (15, 'Ethernet',    'Gigabit',                         6),
  -- 16. HomePod Smart Speaker
  (16, 'Drivers',      '1x woofer, 5x tweeters',         1),
  (16, 'Audio',        '360-degree soundstage',          2),
  (16, 'Assistant',    'Built-in voice AI',              3),
  (16, 'Connectivity', 'WiFi 6, Bluetooth 5.0',          4),
  (16, 'Multi-room',   'Sync up to 8 speakers',          5),
  (16, 'Size',         '172mm x 142mm',                  6);
```

---

## 5. Variantes (atributo / opción / variante de producto)

### CREATE

```sql
CREATE TABLE variant_attributes (
  id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attr_name (name)
) ENGINE=InnoDB;

CREATE TABLE variant_options (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attribute_id  INT UNSIGNED NOT NULL,
  label         VARCHAR(80) NOT NULL,
  value         VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attr_option (attribute_id, label),
  CONSTRAINT fk_opt_attribute FOREIGN KEY (attribute_id) REFERENCES variant_attributes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_variants (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id      BIGINT UNSIGNED NOT NULL,
  sku             VARCHAR(64) NOT NULL,
  price_override  DECIMAL(10,2) NULL,
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
```

### INSERT

```sql
INSERT INTO variant_attributes (id, name) VALUES
  (1, 'Color'),
  (2, 'Storage'),
  (3, 'Size');

-- Color (attribute_id=1)
INSERT INTO variant_options (id, attribute_id, label, value) VALUES
  (1,  1, 'Midnight Black', '#1a1a1a'),
  (2,  1, 'Silver',         '#c0c0c0'),
  (3,  1, 'Stealth Black',  '#0a0a0a'),
  (4,  1, 'Phantom White',  '#e8e8e8'),
  (5,  1, 'Obsidian',       '#1a1a2e'),
  (6,  1, 'Titanium',       '#8a8a8a'),
  (7,  1, 'Ocean Blue',     '#1e3a5f'),
  (8,  1, 'Black',          '#1a1a1a'),
  (9,  1, 'White',          '#f5f5f5'),
  (10, 1, 'Graphite',       '#2d2d2d'),
  (11, 1, 'Space Gray',     '#4a4a4a');

-- Storage (attribute_id=2)
INSERT INTO variant_options (id, attribute_id, label, value) VALUES
  (20, 2, '512GB', '512GB'),
  (21, 2, '1TB',   '1TB'),
  (22, 2, '2TB',   '2TB');

-- Variantes por producto (una por color para simplicidad; AeroBook con cartesian color×storage)
INSERT INTO product_variants (id, product_id, sku, price_override, stock_quantity, image_url) VALUES
  -- Producto 1 — AeroBook Pro X1 (color × storage)
  (1,  1, 'TS-AERO-X1-MB-512',  1899.00, 5,  '/product-laptop-ultrabook.jpg'),
  (2,  1, 'TS-AERO-X1-MB-1TB',  2099.00, 8,  '/product-laptop-ultrabook.jpg'),
  (3,  1, 'TS-AERO-X1-MB-2TB',  2399.00, 4,  '/product-laptop-ultrabook.jpg'),
  (4,  1, 'TS-AERO-X1-SV-512',  1899.00, 5,  '/product-laptop-ultrabook.jpg'),
  (5,  1, 'TS-AERO-X1-SV-1TB',  2099.00, 6,  '/product-laptop-ultrabook.jpg'),
  (6,  1, 'TS-AERO-X1-SV-2TB',  2399.00, 3,  '/product-laptop-ultrabook.jpg'),
  -- Producto 2 — Titan Gaming Laptop
  (7,  2, 'TS-TITAN-GL-SB',     NULL,    15, '/product-gaming-laptop.jpg'),
  (8,  2, 'TS-TITAN-GL-PW',     NULL,    15, '/product-gaming-laptop.jpg'),
  -- Producto 3 — Nova Phone Ultra
  (9,  3, 'TS-NOVA-ULT-OB',     NULL,    40, '/product-smartphone.jpg'),
  (10, 3, 'TS-NOVA-ULT-TI',     NULL,    40, '/product-smartphone.jpg'),
  (11, 3, 'TS-NOVA-ULT-OC',     NULL,    40, '/product-smartphone.jpg'),
  -- Producto 5 — Chroma Mechanical Keyboard
  (12, 5, 'TS-CHROMA-KB-BK',    NULL,    50, '/product-keyboard.jpg'),
  (13, 5, 'TS-CHROMA-KB-WT',    NULL,    50, '/product-keyboard.jpg'),
  -- Producto 6 — Pulse Smartwatch
  (14, 6, 'TS-PULSE-SW-GR',     NULL,    30, '/product-smartwatch.jpg'),
  (15, 6, 'TS-PULSE-SW-SV',     NULL,    30, '/product-smartwatch.jpg'),
  -- Producto 13 — Create Tablet Pro
  (16, 13,'TS-CREATE-TAB-SG',   NULL,    18, '/product-tablet.jpg'),
  (17, 13,'TS-CREATE-TAB-SV',   NULL,    17, '/product-tablet.jpg');

-- Asignación variante <-> opciones
INSERT INTO product_variant_options (variant_id, option_id) VALUES
  -- AeroBook (color + storage)
  (1, 1), (1, 20),   -- Midnight Black + 512GB
  (2, 1), (2, 21),   -- Midnight Black + 1TB
  (3, 1), (3, 22),   -- Midnight Black + 2TB
  (4, 2), (4, 20),   -- Silver + 512GB
  (5, 2), (5, 21),   -- Silver + 1TB
  (6, 2), (6, 22),   -- Silver + 2TB
  -- Titan (color)
  (7, 3),            -- Stealth Black
  (8, 4),            -- Phantom White
  -- Nova Phone (color)
  (9, 5),            -- Obsidian
  (10, 6),           -- Titanium
  (11, 7),           -- Ocean Blue
  -- Chroma KB (color)
  (12, 8),           -- Black
  (13, 9),           -- White
  -- Pulse SW (color)
  (14, 10),          -- Graphite
  (15, 2),           -- Silver
  -- Create Tablet (color)
  (16, 11),          -- Space Gray
  (17, 2);           -- Silver
```

---

## 6. Carrito y wishlist

### CREATE

```sql
CREATE TABLE carts (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NULL,
  session_id  CHAR(36) NULL,
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
  quantity    INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,
  added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cart_line (cart_id, product_id, variant_id),
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
```

### INSERT

```sql
-- Carrito activo de John (replica el estado inicial del StoreContext)
INSERT INTO carts (id, user_id, status) VALUES (1, 1, 'active');

INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, unit_price) VALUES
  (1, 1, 2,  1, 1899.00),  -- AeroBook Pro X1 (Midnight Black, 1TB)
  (1, 5, 12, 1,  179.00),  -- Chroma Mechanical Keyboard (Black)
  (1, 9, NULL, 2, 199.00); -- Aurora Wireless Earbuds

-- Wishlist de John (lo que muestra AccountPage mock)
INSERT INTO wishlists (user_id, product_id) VALUES
  (1, 11),  -- Vision VR Headset
  (1, 8);   -- ViewMaster 4K Monitor
```

---

## 7. Métodos de pago

### CREATE

```sql
CREATE TABLE payment_methods (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  brand           ENUM('visa','mastercard','amex','discover','other') NOT NULL,
  last4           CHAR(4) NOT NULL,
  exp_month       TINYINT UNSIGNED NOT NULL,
  exp_year        SMALLINT UNSIGNED NOT NULL,
  cardholder_name VARCHAR(160) NOT NULL,
  gateway         VARCHAR(40) NOT NULL DEFAULT 'stripe',
  gateway_token   VARCHAR(255) NOT NULL,
  is_default      TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pm_user (user_id),
  CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### INSERT

```sql
INSERT INTO payment_methods (id, user_id, brand, last4, exp_month, exp_year, cardholder_name, gateway, gateway_token, is_default) VALUES
  (1, 1, 'visa',       '4242', 12, 2028, 'John Doe',   'stripe', 'tok_visa_demo_4242',  1),
  (2, 1, 'mastercard', '5555', 6,  2027, 'John Doe',   'stripe', 'tok_mc_demo_5555',    0),
  (3, 2, 'amex',       '0005', 3,  2029, 'Jane Smith', 'stripe', 'tok_amex_demo_0005',  1);
```

---

## 8. Cupones (necesarios antes de `orders` por la FK)

### CREATE

```sql
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
```

### INSERT

```sql
INSERT INTO coupons (id, code, description, discount_type, discount_value, min_subtotal, valid_from, valid_until) VALUES
  (1, 'WELCOME10', '10% off para primer compra',   'percent', 10.00,   0.00, '2026-01-01 00:00:00', '2026-12-31 23:59:59'),
  (2, 'FREESHIP',  'Envío gratis sobre $200',      'fixed',   15.00, 200.00, '2026-01-01 00:00:00', '2026-12-31 23:59:59'),
  (3, 'TECH50',    '$50 off en pedidos sobre $500','fixed',   50.00, 500.00, '2026-01-01 00:00:00', '2026-12-31 23:59:59');
```

---

## 9. Órdenes, items, historial, pagos y envíos

### CREATE

```sql
CREATE TABLE orders (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_number        VARCHAR(20) NOT NULL,
  user_id             BIGINT UNSIGNED NOT NULL,
  status              ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded')
                        NOT NULL DEFAULT 'pending',
  currency            CHAR(3) NOT NULL DEFAULT 'USD',
  subtotal            DECIMAL(12,2) NOT NULL,
  shipping_cost       DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax                 DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount            DECIMAL(10,2) NOT NULL DEFAULT 0,
  total               DECIMAL(12,2) NOT NULL,
  ship_recipient      VARCHAR(160) NOT NULL,
  ship_email          VARCHAR(190) NOT NULL,
  ship_phone          VARCHAR(30)  NULL,
  ship_line1          VARCHAR(255) NOT NULL,
  ship_line2          VARCHAR(255) NULL,
  ship_city           VARCHAR(100) NOT NULL,
  ship_state          VARCHAR(100) NULL,
  ship_zip            VARCHAR(20)  NOT NULL,
  ship_country        VARCHAR(80)  NOT NULL,
  shipping_address_id BIGINT UNSIGNED NULL,
  payment_method_id   BIGINT UNSIGNED NULL,
  coupon_id           BIGINT UNSIGNED NULL,
  placed_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at             DATETIME NULL,
  shipped_at          DATETIME NULL,
  delivered_at        DATETIME NULL,
  cancelled_at        DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_number (order_number),
  KEY idx_order_user (user_id),
  KEY idx_order_status (status),
  KEY idx_order_placed (placed_at),
  CONSTRAINT fk_order_user   FOREIGN KEY (user_id)             REFERENCES users(id),
  CONSTRAINT fk_order_addr   FOREIGN KEY (shipping_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_pm     FOREIGN KEY (payment_method_id)   REFERENCES payment_methods(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_coupon FOREIGN KEY (coupon_id)           REFERENCES coupons(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id        BIGINT UNSIGNED NOT NULL,
  product_id      BIGINT UNSIGNED NULL,
  variant_id      BIGINT UNSIGNED NULL,
  product_name    VARCHAR(200)  NOT NULL,
  variant_label   VARCHAR(160)  NULL,
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
  CONSTRAINT fk_pay_order FOREIGN KEY (order_id)          REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_pm    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE shipments (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id          BIGINT UNSIGNED NOT NULL,
  carrier           VARCHAR(60) NULL,
  tracking_number   VARCHAR(100) NULL,
  status            ENUM('pending','in_transit','delivered','returned') NOT NULL DEFAULT 'pending',
  shipped_at        DATETIME NULL,
  delivered_at      DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_ship_order (order_id),
  CONSTRAINT fk_ship_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### INSERT — órdenes mock de [AccountPage](../src/pages/AccountPage.tsx)

```sql
INSERT INTO orders (id, order_number, user_id, status, currency, subtotal, shipping_cost, tax, total,
  ship_recipient, ship_email, ship_phone, ship_line1, ship_city, ship_state, ship_zip, ship_country,
  shipping_address_id, payment_method_id, placed_at, paid_at, shipped_at, delivered_at) VALUES
  (1, 'TS-8X2K9M3A', 1, 'delivered', 'USD', 1899.00,  0.00, 151.92, 2050.92,
     'John Doe', 'john@example.com', '+1 (555) 123-4567', '123 Main Street', 'New York', 'NY', '10001', 'United States',
     1, 1, '2026-04-28 10:00:00', '2026-04-28 10:01:00', '2026-04-29 09:00:00', '2026-05-01 14:30:00'),
  (2, 'TS-7J4P2L1Q', 1, 'shipped',   'USD',  349.00, 15.00,  29.12,  393.12,
     'John Doe', 'john@example.com', '+1 (555) 123-4567', '123 Main Street', 'New York', 'NY', '10001', 'United States',
     1, 1, '2026-04-15 12:00:00', '2026-04-15 12:01:00', '2026-04-16 09:00:00', NULL),
  (3, 'TS-6R5N8W4E', 1, 'delivered', 'USD', 1298.00,  0.00, 103.84, 1401.84,
     'John Doe', 'john@example.com', '+1 (555) 123-4567', '123 Main Street', 'New York', 'NY', '10001', 'United States',
     1, 1, '2026-03-30 15:00:00', '2026-03-30 15:01:00', '2026-03-31 09:00:00', '2026-04-02 11:00:00');

INSERT INTO order_items (order_id, product_id, variant_id, product_name, variant_label, product_sku, product_image, unit_price, quantity, line_total) VALUES
  (1, 1, 2, 'AeroBook Pro X1', 'Midnight Black, 1TB', 'TS-AERO-X1-MB-1TB', '/product-laptop-ultrabook.jpg', 1899.00, 1, 1899.00),
  (2, 4, NULL, 'Sonic Pro Headphones', NULL,           'TS-SONIC-PRO',     '/product-headphones.jpg',       349.00, 1,  349.00),
  (3, 5, 12, 'Chroma Mechanical Keyboard', 'Black',    'TS-CHROMA-KB-BK',  '/product-keyboard.jpg',         179.00, 1,  179.00),
  (3, 7, NULL, 'Aero Wireless Mouse', NULL,            'TS-AERO-MOUSE',    '/product-mouse.jpg',             89.00, 1,   89.00),
  (3, 16, NULL, 'HomePod Smart Speaker', NULL,         'TS-HOMEPOD-SP',    '/product-speaker.jpg',          299.00, 1,  299.00);

INSERT INTO order_status_history (order_id, status, note, changed_at) VALUES
  (1, 'pending',   'Order placed',          '2026-04-28 10:00:00'),
  (1, 'paid',      'Payment captured',      '2026-04-28 10:01:00'),
  (1, 'shipped',   'Handed to UPS',         '2026-04-29 09:00:00'),
  (1, 'delivered', 'Delivered to recipient','2026-05-01 14:30:00'),
  (2, 'pending',   'Order placed',          '2026-04-15 12:00:00'),
  (2, 'paid',      'Payment captured',      '2026-04-15 12:01:00'),
  (2, 'shipped',   'Handed to FedEx',       '2026-04-16 09:00:00'),
  (3, 'pending',   'Order placed',          '2026-03-30 15:00:00'),
  (3, 'paid',      'Payment captured',      '2026-03-30 15:01:00'),
  (3, 'shipped',   'Handed to USPS',        '2026-03-31 09:00:00'),
  (3, 'delivered', 'Delivered to recipient','2026-04-02 11:00:00');

INSERT INTO payments (order_id, payment_method_id, amount, currency, gateway, transaction_id, status, paid_at) VALUES
  (1, 1, 2050.92, 'USD', 'stripe', 'pi_1Abc...001', 'captured', '2026-04-28 10:01:00'),
  (2, 1,  393.12, 'USD', 'stripe', 'pi_1Abc...002', 'captured', '2026-04-15 12:01:00'),
  (3, 1, 1401.84, 'USD', 'stripe', 'pi_1Abc...003', 'captured', '2026-03-30 15:01:00');

INSERT INTO shipments (order_id, carrier, tracking_number, status, shipped_at, delivered_at) VALUES
  (1, 'UPS',   '1Z999AA10123456784', 'delivered',  '2026-04-29 09:00:00', '2026-05-01 14:30:00'),
  (2, 'FedEx', '794612345678',       'in_transit', '2026-04-16 09:00:00', NULL),
  (3, 'USPS',  '9400110298765432109','delivered',  '2026-03-31 09:00:00', '2026-04-02 11:00:00');
```

---

## 10. Reseñas

### CREATE

```sql
CREATE TABLE reviews (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  order_id    BIGINT UNSIGNED NULL,
  rating      TINYINT UNSIGNED NOT NULL,
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
```

### INSERT

```sql
INSERT INTO reviews (product_id, user_id, order_id, rating, title, body) VALUES
  (1, 1, 1, 5, 'Increíble laptop',          'El OLED es espectacular y rinde 18h reales.'),
  (4, 1, 2, 5, 'ANC de otro nivel',         'Cancela todo el ruido del metro.'),
  (5, 1, 3, 4, 'Buen teclado',              'Switches suaves y RGB bien implementado.'),
  (7, 1, 3, 4, 'Ligera y precisa',          'Para gaming es excelente.'),
  (16,1, 3, 5, 'Sonido envolvente',         'Muy buen audio para el tamaño.');
```

---

## 11. Verificación

```sql
-- Conteos rápidos
SELECT 'users'      AS t, COUNT(*) FROM users
UNION ALL SELECT 'categories',         COUNT(*) FROM categories
UNION ALL SELECT 'brands',             COUNT(*) FROM brands
UNION ALL SELECT 'products',           COUNT(*) FROM products
UNION ALL SELECT 'product_specs',      COUNT(*) FROM product_specs
UNION ALL SELECT 'product_variants',   COUNT(*) FROM product_variants
UNION ALL SELECT 'addresses',          COUNT(*) FROM addresses
UNION ALL SELECT 'orders',             COUNT(*) FROM orders
UNION ALL SELECT 'order_items',        COUNT(*) FROM order_items
UNION ALL SELECT 'reviews',            COUNT(*) FROM reviews;
```

Resultado esperado:

| tabla | filas |
|---|---|
| users | 2 |
| categories | 10 |
| brands | 7 |
| products | 16 |
| product_specs | 96 |
| product_variants | 17 |
| addresses | 3 |
| orders | 3 |
| order_items | 5 |
| reviews | 5 |
