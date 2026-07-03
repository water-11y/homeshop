import { pool } from './db.js';

export const ensureDatabase = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      role VARCHAR(20) DEFAULT 'user',
      approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
      face_photo_path VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_attachments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      file_type VARCHAR(100) NULL,
      file_size INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_user_attachments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(160) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      price DECIMAL(12, 2) NOT NULL,
      original_price DECIMAL(12, 2) NULL,
      category VARCHAR(50) NOT NULL,
      brand VARCHAR(80) NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      rating DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
      review_count INT NOT NULL DEFAULT 0,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_options (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      option_name VARCHAR(80) NOT NULL,
      option_value VARCHAR(120) NOT NULL,
      extra_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      stock INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_product_options_product FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(40) NOT NULL UNIQUE,
      user_id INT NOT NULL,
      total_amount DECIMAL(12, 2) NOT NULL,
      discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      coupon_code VARCHAR(40) NULL,
      payment_method VARCHAR(40) NOT NULL DEFAULT 'mock_card',
      status VARCHAR(20) NOT NULL DEFAULT 'paid',
      shipping_name VARCHAR(50) NOT NULL,
      shipping_phone VARCHAR(30) NOT NULL,
      shipping_address VARCHAR(255) NOT NULL,
      shipping_lat DECIMAL(10, 7) NULL,
      shipping_lng DECIMAL(10, 7) NULL,
      memo VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NULL,
      option_id INT NULL,
      product_name VARCHAR(120) NOT NULL,
      option_summary VARCHAR(255) NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(12, 2) NOT NULL,
      line_total DECIMAL(12, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
      CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id),
      CONSTRAINT fk_order_items_option FOREIGN KEY (option_id) REFERENCES product_options(id)
    )
  `);

  try {
    await pool.query("ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'");
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      throw err;
    }
  }

  try {
    await pool.query("ALTER TABLE users ADD COLUMN face_photo_path VARCHAR(255) NULL");
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      throw err;
    }
  }

  await pool.query("UPDATE users SET approval_status = 'approved' WHERE role = 'admin'");

  await pool.query(`
    INSERT IGNORE INTO products
      (id, name, slug, description, price, original_price, category, brand, image_url, stock, rating, review_count, is_featured)
    VALUES
      (1, 'AirCook Pro Oven', 'aircook-pro-oven', 'Compact steam oven for daily home cooking with presets and easy cleaning.', 189000, 239000, 'Kitchen', 'HomeChef', 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=80', 24, 4.8, 132, 1),
      (2, 'PureSleep Pillow Set', 'puresleep-pillow-set', 'Two premium pillows with breathable cover and balanced neck support.', 59000, 79000, 'Living', 'ComfyDay', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 48, 4.7, 89, 1),
      (3, 'DailyFit Walking Shoes', 'dailyfit-walking-shoes', 'Lightweight walking shoes for commuting, exercise, and weekend trips.', 89000, 119000, 'Fashion', 'DailyFit', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', 36, 4.6, 211, 1),
      (4, 'GlowCare Skin Kit', 'glowcare-skin-kit', 'A gentle toner, serum, and cream bundle for simple morning and night care.', 69000, 99000, 'Beauty', 'GlowCare', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80', 52, 4.9, 176, 1),
      (5, 'SmartBlend Mini Mixer', 'smartblend-mini-mixer', 'Portable mixer for smoothies, protein drinks, and quick sauces.', 49000, 69000, 'Kitchen', 'Blendly', 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=900&q=80', 64, 4.5, 73, 0),
      (6, 'CloudTouch Blanket', 'cloudtouch-blanket', 'Soft all-season blanket with washable fabric and calm neutral color.', 74000, 99000, 'Living', 'ComfyDay', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=80', 31, 4.8, 154, 0),
      (7, 'FreshBox Food Containers', 'freshbox-food-containers', 'Stackable food container set for meal prep and refrigerator storage.', 39000, 52000, 'Kitchen', 'FreshBox', 'https://images.unsplash.com/photo-1584473457409-cef2a27f5dd4?auto=format&fit=crop&w=900&q=80', 80, 4.4, 65, 0),
      (8, 'Urban Day Tote', 'urban-day-tote', 'Simple tote bag with laptop pocket, water-resistant lining, and daily storage.', 62000, 82000, 'Fashion', 'UrbanLine', 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80', 18, 4.7, 98, 0)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      user_id INT NOT NULL,
      rating INT NOT NULL,
      title VARCHAR(120) NOT NULL,
      content TEXT NOT NULL,
      is_visible TINYINT(1) NOT NULL DEFAULT 1,
      is_verified_purchase TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_review_product_user (product_id, user_id),
      CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id),
      CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_options (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      option_name VARCHAR(80) NOT NULL,
      option_value VARCHAR(120) NOT NULL,
      extra_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      stock INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_product_options_product FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wishlist_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_wishlist_user_product (user_id, product_id),
      CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shipping_addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      label VARCHAR(80) NOT NULL DEFAULT '기본 배송지',
      recipient VARCHAR(50) NOT NULL,
      phone VARCHAR(30) NOT NULL,
      address VARCHAR(255) NOT NULL,
      latitude DECIMAL(10, 7) NULL,
      longitude DECIMAL(10, 7) NULL,
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_shipping_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recently_viewed_products (
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, product_id),
      CONSTRAINT fk_recently_viewed_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_recently_viewed_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(40) NOT NULL DEFAULT 'info',
      title VARCHAR(120) NOT NULL,
      message VARCHAR(255) NOT NULL,
      link_url VARCHAR(255) NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      user_id INT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NULL,
      answered_by INT NULL,
      answered_at TIMESTAMP NULL,
      is_private TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_questions_product FOREIGN KEY (product_id) REFERENCES products(id),
      CONSTRAINT fk_questions_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_questions_admin FOREIGN KEY (answered_by) REFERENCES users(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(40) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percent',
      discount_value DECIMAL(12, 2) NOT NULL,
      min_order_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      starts_at TIMESTAMP NULL,
      ends_at TIMESTAMP NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      coupon_id INT NOT NULL,
      user_id INT NOT NULL,
      order_id INT NULL,
      discount_amount DECIMAL(12, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_redemptions_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id),
      CONSTRAINT fk_redemptions_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_redemptions_order FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);

  await pool.query(`
    INSERT IGNORE INTO coupons
      (id, code, name, discount_type, discount_value, min_order_amount, is_active)
    VALUES
      (1, 'WELCOME10', 'Welcome 10% coupon', 'percent', 10, 30000, 1),
      (2, 'FREESHIP', 'Free shipping style discount', 'fixed', 3000, 10000, 1)
  `);

  await pool.query(`
    INSERT IGNORE INTO product_images (id, product_id, image_url, sort_order)
    SELECT 1, p.id, 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=80', 0 FROM products p WHERE p.id = 1
    UNION ALL SELECT 2, p.id, 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80', 1 FROM products p WHERE p.id = 1
    UNION ALL SELECT 3, p.id, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 0 FROM products p WHERE p.id = 2
    UNION ALL SELECT 4, p.id, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80', 0 FROM products p WHERE p.id = 3
    UNION ALL SELECT 5, p.id, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=900&q=80', 0 FROM products p WHERE p.id = 4
  `);

  await pool.query(`
    INSERT IGNORE INTO product_options (id, product_id, option_name, option_value, extra_price, stock)
    SELECT 1, p.id, 'Color', 'Cream White', 0, 10 FROM products p WHERE p.id = 1
    UNION ALL SELECT 2, p.id, 'Color', 'Matte Black', 10000, 8 FROM products p WHERE p.id = 1
    UNION ALL SELECT 3, p.id, 'Set', 'Standard 2 Pack', 0, 20 FROM products p WHERE p.id = 2
    UNION ALL SELECT 4, p.id, 'Set', 'Family 4 Pack', 42000, 12 FROM products p WHERE p.id = 2
    UNION ALL SELECT 5, p.id, 'Size', '260', 0, 6 FROM products p WHERE p.id = 3
    UNION ALL SELECT 6, p.id, 'Size', '270', 0, 7 FROM products p WHERE p.id = 3
    UNION ALL SELECT 7, p.id, 'Type', 'Basic Kit', 0, 15 FROM products p WHERE p.id = 4
    UNION ALL SELECT 8, p.id, 'Type', 'Premium Kit', 18000, 9 FROM products p WHERE p.id = 4
  `);

  const alterIfMissing = async (sql) => {
    try {
      await pool.query(sql);
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        throw err;
      }
    }
  };

  await alterIfMissing("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(40) NULL");
  await alterIfMissing("ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0");
  await alterIfMissing("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(40) NOT NULL DEFAULT 'mock_card'");
  await alterIfMissing("ALTER TABLE orders ADD COLUMN shipping_lat DECIMAL(10, 7) NULL");
  await alterIfMissing("ALTER TABLE orders ADD COLUMN shipping_lng DECIMAL(10, 7) NULL");
  await alterIfMissing("ALTER TABLE order_items ADD COLUMN option_id INT NULL");
  await alterIfMissing("ALTER TABLE order_items ADD COLUMN option_summary VARCHAR(255) NULL");
};
