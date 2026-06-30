import { pool } from './db.js';

export const ensureDatabase = async () => {
  try {
    await pool.query("ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'");
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') {
      throw err;
    }
  }

  await pool.query("UPDATE users SET approval_status = 'approved' WHERE role = 'admin'");

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
  await alterIfMissing("ALTER TABLE order_items ADD COLUMN option_id INT NULL");
  await alterIfMissing("ALTER TABLE order_items ADD COLUMN option_summary VARCHAR(255) NULL");
};
