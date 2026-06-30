import { pool } from '../config/db.js';

const reviewSelect = `
  SELECT r.id, r.product_id, r.user_id, r.rating, r.title, r.content,
         r.is_visible, r.is_verified_purchase, r.created_at, r.updated_at,
         u.username, u.name
  FROM reviews r
  JOIN users u ON u.id = r.user_id
`;

const refreshProductRating = async (productId) => {
  const [[summary]] = await pool.query(
    `SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS rating, COUNT(*) AS review_count
     FROM reviews
     WHERE product_id = ? AND is_visible = 1`,
    [productId]
  );

  await pool.query('UPDATE products SET rating = ?, review_count = ? WHERE id = ?', [
    summary.rating,
    summary.review_count,
    productId
  ]);
};

const hasPurchased = async (userId, productId) => {
  const [rows] = await pool.query(
    `SELECT oi.id
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('paid', 'preparing', 'shipping', 'delivered')
     LIMIT 1`,
    [userId, productId]
  );

  return rows.length > 0;
};

const validateReview = ({ rating, title, content }) => {
  const parsedRating = Number(rating);

  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return 'Rating must be between 1 and 5.';
  }

  if (!title || title.trim().length < 2) {
    return 'Review title is required.';
  }

  if (!content || content.trim().length < 5) {
    return 'Review content must be at least 5 characters.';
  }

  return null;
};

export const listProductReviews = async (req, res, next) => {
  try {
    const [reviews] = await pool.query(
      `${reviewSelect}
       WHERE r.product_id = ? AND r.is_visible = 1
       ORDER BY r.created_at DESC`,
      [req.params.productId]
    );

    const [distribution] = await pool.query(
      `SELECT rating, COUNT(*) AS count
       FROM reviews
       WHERE product_id = ? AND is_visible = 1
       GROUP BY rating
       ORDER BY rating DESC`,
      [req.params.productId]
    );

    res.json({ reviews, distribution });
  } catch (err) {
    next(err);
  }
};

export const createReview = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    const { rating, title, content } = req.body;
    const validationError = validateReview({ rating, title, content });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const verifiedPurchase = await hasPurchased(req.user.id, productId);

    await pool.query(
      `INSERT INTO reviews (product_id, user_id, rating, title, content, is_verified_purchase)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         rating = VALUES(rating),
         title = VALUES(title),
         content = VALUES(content),
         is_visible = 1,
         is_verified_purchase = VALUES(is_verified_purchase)`,
      [
        productId,
        req.user.id,
        Number(rating),
        title.trim(),
        content.trim(),
        verifiedPurchase ? 1 : 0
      ]
    );

    await refreshProductRating(productId);

    res.status(201).json({ message: 'Review saved.' });
  } catch (err) {
    next(err);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { rating, title, content } = req.body;
    const validationError = validateReview({ rating, title, content });

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const [reviews] = await pool.query('SELECT product_id, user_id FROM reviews WHERE id = ? LIMIT 1', [
      req.params.reviewId
    ]);

    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review was not found.' });
    }

    if (reviews[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can edit only your review.' });
    }

    await pool.query(
      `UPDATE reviews
       SET rating = ?, title = ?, content = ?, is_visible = 1
       WHERE id = ?`,
      [Number(rating), title.trim(), content.trim(), req.params.reviewId]
    );

    await refreshProductRating(reviews[0].product_id);

    res.json({ message: 'Review updated.' });
  } catch (err) {
    next(err);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const [reviews] = await pool.query('SELECT product_id, user_id FROM reviews WHERE id = ? LIMIT 1', [
      req.params.reviewId
    ]);

    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review was not found.' });
    }

    if (reviews[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can delete only your review.' });
    }

    await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.reviewId]);
    await refreshProductRating(reviews[0].product_id);

    res.json({ message: 'Review deleted.' });
  } catch (err) {
    next(err);
  }
};

export const listAllReviews = async (req, res, next) => {
  try {
    const [reviews] = await pool.query(
      `${reviewSelect}
       ORDER BY r.created_at DESC`
    );

    res.json({ reviews });
  } catch (err) {
    next(err);
  }
};

export const updateReviewVisibility = async (req, res, next) => {
  try {
    const { is_visible } = req.body;
    const [reviews] = await pool.query('SELECT product_id FROM reviews WHERE id = ? LIMIT 1', [
      req.params.reviewId
    ]);

    if (reviews.length === 0) {
      return res.status(404).json({ message: 'Review was not found.' });
    }

    await pool.query('UPDATE reviews SET is_visible = ? WHERE id = ?', [
      is_visible ? 1 : 0,
      req.params.reviewId
    ]);

    await refreshProductRating(reviews[0].product_id);

    res.json({ message: 'Review visibility updated.' });
  } catch (err) {
    next(err);
  }
};
