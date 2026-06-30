import { pool } from '../config/db.js';

const productFields = `
  id, name, slug, description, price, original_price, category, brand,
  image_url, stock, rating, review_count, is_featured, is_active,
  created_at, updated_at
`;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const makeSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
};

export const listProducts = async (req, res, next) => {
  try {
    const { q = '', category = '', sort = 'featured' } = req.query;
    const params = [];
    const where = ['is_active = 1'];

    if (q) {
      where.push('(name LIKE ? OR brand LIKE ? OR description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (category) {
      where.push('category = ?');
      params.push(category);
    }

    const sortSql = {
      price_asc: 'price ASC',
      price_desc: 'price DESC',
      newest: 'created_at DESC',
      rating: 'rating DESC, review_count DESC',
      featured: 'is_featured DESC, created_at DESC'
    }[sort] || 'is_featured DESC, created_at DESC';

    const [products] = await pool.query(
      `SELECT ${productFields} FROM products WHERE ${where.join(' AND ')} ORDER BY ${sortSql}`,
      params
    );

    res.json({ products });
  } catch (err) {
    next(err);
  }
};

export const listCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT category, COUNT(*) AS product_count FROM products WHERE is_active = 1 GROUP BY category ORDER BY category ASC'
    );

    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req, res, next) => {
  try {
    const [products] = await pool.query(
      `SELECT ${productFields} FROM products WHERE id = ? AND is_active = 1 LIMIT 1`,
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: 'Product was not found.' });
    }

    const [images] = await pool.query(
      'SELECT id, image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
      [req.params.id]
    );
    const [options] = await pool.query(
      'SELECT id, option_name, option_value, extra_price, stock FROM product_options WHERE product_id = ? AND is_active = 1 ORDER BY option_name ASC, id ASC',
      [req.params.id]
    );

    res.json({ product: { ...products[0], images, options } });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      original_price,
      category,
      brand,
      image_url,
      stock,
      is_featured
    } = req.body;

    if (!name || !description || !price || !category || !brand || !image_url) {
      return res.status(400).json({ message: 'Required product fields are missing.' });
    }

    const slug = `${makeSlug(name)}-${Date.now()}`;

    const [result] = await pool.query(
      `INSERT INTO products
        (name, slug, description, price, original_price, category, brand, image_url, stock, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        slug,
        description,
        toNumber(price),
        original_price ? toNumber(original_price) : null,
        category,
        brand,
        image_url,
        toNumber(stock, 0),
        is_featured ? 1 : 0
      ]
    );

    const [created] = await pool.query(`SELECT ${productFields} FROM products WHERE id = ?`, [
      result.insertId
    ]);

    res.status(201).json({ message: 'Product created.', product: created[0] });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      price,
      original_price,
      category,
      brand,
      image_url,
      stock,
      is_featured,
      is_active
    } = req.body;

    const [existing] = await pool.query('SELECT id FROM products WHERE id = ? LIMIT 1', [req.params.id]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Product was not found.' });
    }

    await pool.query(
      `UPDATE products
       SET name = ?, description = ?, price = ?, original_price = ?, category = ?, brand = ?,
           image_url = ?, stock = ?, is_featured = ?, is_active = ?
       WHERE id = ?`,
      [
        name,
        description,
        toNumber(price),
        original_price ? toNumber(original_price) : null,
        category,
        brand,
        image_url,
        toNumber(stock, 0),
        is_featured ? 1 : 0,
        is_active === false ? 0 : 1,
        req.params.id
      ]
    );

    const [updated] = await pool.query(`SELECT ${productFields} FROM products WHERE id = ?`, [
      req.params.id
    ]);

    res.json({ message: 'Product updated.', product: updated[0] });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    await pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
};
