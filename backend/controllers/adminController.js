import { pool } from '../config/db.js';
import { listAllReviews, updateReviewVisibility } from './reviewController.js';

export const getDashboard = async (req, res, next) => {
  try {
    const [[users]] = await pool.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(approval_status = 'pending') AS pending_users
      FROM users
    `);
    const [[products]] = await pool.query(`
      SELECT
        COUNT(*) AS total_products,
        SUM(stock <= 5) AS low_stock_products
      FROM products
      WHERE is_active = 1
    `);
    const [[orders]] = await pool.query(`
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(total_amount), 0) AS total_sales,
        SUM(status = 'paid') AS paid_orders,
        SUM(status = 'shipping') AS shipping_orders,
        SUM(status = 'cancelled') AS cancelled_orders
      FROM orders
    `);
    const [[reviews]] = await pool.query(`
      SELECT COUNT(*) AS total_reviews, COALESCE(AVG(rating), 0) AS average_rating
      FROM reviews
      WHERE is_visible = 1
    `);
    const [[questions]] = await pool.query(`
      SELECT
        COUNT(*) AS total_questions,
        SUM(answer IS NULL) AS unanswered_questions
      FROM product_questions
    `);

    res.json({
      dashboard: {
        users,
        products,
        orders,
        reviews,
        questions
      }
    });
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT id, username, name, email, role, approval_status, face_photo_path, created_at
       FROM users
       ORDER BY
         CASE approval_status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
         created_at DESC`
    );

    const userIds = users.map((user) => user.id);
    let attachments = [];

    if (userIds.length > 0) {
      const [rows] = await pool.query(
        `SELECT id, user_id, file_name, file_path, file_type, file_size, created_at
         FROM user_attachments
         WHERE user_id IN (?)
         ORDER BY created_at DESC`,
        [userIds]
      );
      attachments = rows;
    }

    const attachmentsByUser = attachments.reduce((acc, file) => {
      if (!acc[file.user_id]) {
        acc[file.user_id] = [];
      }
      acc[file.user_id].push(file);
      return acc;
    }, {});

    res.json({
      users: users.map((user) => ({
        ...user,
        attachments: attachmentsByUser[user.id] || []
      }))
    });
  } catch (err) {
    next(err);
  }
};

export const updateUserApproval = async (req, res, next) => {
  try {
    const allowed = ['pending', 'approved', 'rejected'];
    const { approval_status } = req.body;

    if (!allowed.includes(approval_status)) {
      return res.status(400).json({ message: 'Invalid approval status.' });
    }

    if (Number(req.params.id) === req.user.id && approval_status !== 'approved') {
      return res.status(400).json({ message: 'Admin cannot reject their own account.' });
    }

    await pool.query('UPDATE users SET approval_status = ? WHERE id = ?', [
      approval_status,
      req.params.id
    ]);

    res.json({ message: 'User approval status updated.' });
  } catch (err) {
    next(err);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const allowed = ['user', 'admin'];
    const { role } = req.body;

    if (!allowed.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    await pool.query(
      "UPDATE users SET role = ?, approval_status = CASE WHEN ? = 'admin' THEN 'approved' ELSE approval_status END WHERE id = ?",
      [role, role, req.params.id]
    );

    res.json({ message: 'User role updated.' });
  } catch (err) {
    next(err);
  }
};

export { listAllReviews, updateReviewVisibility };
