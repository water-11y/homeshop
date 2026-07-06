import { pool } from '../config/db.js';
import { listAllReviews, updateReviewVisibility } from './reviewController.js';

export const logAdminActivity = async (
  db,
  adminId,
  action,
  targetType = null,
  targetId = null,
  detail = null
) => {
  await db.query(
    `INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, detail)
     VALUES (?, ?, ?, ?, ?)`,
    [adminId || null, action, targetType, targetId || null, detail || null]
  );
};

export const getDashboard = async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days || 7)));
    const [
      [[users]],
      [[products]],
      [[orders]],
      [[reviews]],
      [[questions]],
      [[coupons]],
      [orderStatuses],
      [dailySales],
      [topProducts],
      [lowRatedProducts],
      [topWishlistProducts],
      [recentOrders]
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_users,
          COALESCE(SUM(approval_status = 'pending'), 0) AS pending_users,
          COALESCE(SUM(approval_status = 'approved'), 0) AS approved_users,
          COALESCE(SUM(role = 'admin'), 0) AS admin_users,
          COALESCE(SUM(DATE(created_at) = CURRENT_DATE()), 0) AS today_users,
          COALESCE(SUM(created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)), 0) AS week_users
        FROM users
      `, [days - 1]),
      pool.query(`
        SELECT
          COUNT(*) AS total_products,
          COALESCE(SUM(stock <= 5), 0) AS low_stock_products,
          COALESCE(SUM(stock <= 0), 0) AS out_of_stock_products,
          COALESCE(SUM(is_featured = 1), 0) AS featured_products
        FROM products
        WHERE is_active = 1
      `),
      pool.query(`
        SELECT
          COUNT(*) AS total_orders,
          COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS total_sales,
          COALESCE(SUM(CASE WHEN DATE(created_at) = CURRENT_DATE() THEN 1 ELSE 0 END), 0) AS today_orders,
          COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY) THEN 1 ELSE 0 END), 0) AS week_orders,
          COALESCE(SUM(CASE WHEN status <> 'cancelled' AND DATE(created_at) = CURRENT_DATE() THEN total_amount ELSE 0 END), 0) AS today_sales,
          COALESCE(SUM(CASE WHEN status <> 'cancelled' AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY) THEN total_amount ELSE 0 END), 0) AS week_sales,
          COALESCE(AVG(CASE WHEN status <> 'cancelled' THEN total_amount END), 0) AS average_order_amount,
          COALESCE(SUM(status = 'paid'), 0) AS paid_orders,
          COALESCE(SUM(status = 'preparing'), 0) AS preparing_orders,
          COALESCE(SUM(status = 'shipping'), 0) AS shipping_orders,
          COALESCE(SUM(status = 'delivered'), 0) AS delivered_orders,
          COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_orders
        FROM orders
      `, [days - 1, days - 1]),
      pool.query(`
        SELECT
          COUNT(*) AS total_reviews,
          COALESCE(AVG(rating), 0) AS average_rating,
          COALESCE(SUM(DATE(created_at) = CURRENT_DATE()), 0) AS today_reviews,
          COALESCE(SUM(rating = 5), 0) AS five_star_reviews,
          COALESCE(SUM(rating <= 2), 0) AS low_rating_reviews
        FROM reviews
        WHERE is_visible = 1
      `),
      pool.query(`
        SELECT
          COUNT(*) AS total_questions,
          COALESCE(SUM(answer IS NULL), 0) AS unanswered_questions,
          COALESCE(SUM(answer IS NOT NULL), 0) AS answered_questions,
          COALESCE(SUM(is_private = 1), 0) AS private_questions,
          COALESCE(SUM(DATE(created_at) = CURRENT_DATE()), 0) AS today_questions
        FROM product_questions
      `),
      pool.query(`
        SELECT
          COUNT(*) AS total_coupons,
          COALESCE(SUM(is_active = 1), 0) AS active_coupons,
          COALESCE(SUM(ends_at IS NOT NULL AND ends_at < NOW()), 0) AS expired_coupons
        FROM coupons
      `),
      pool.query(`
        SELECT status, COUNT(*) AS count
        FROM orders
        GROUP BY status
        ORDER BY FIELD(status, 'paid', 'preparing', 'shipping', 'delivered', 'cancelled')
      `),
      pool.query(`
        SELECT
          DATE(created_at) AS sales_date,
          COUNT(*) AS orders,
          COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS sales
        FROM orders
        WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY sales_date ASC
      `, [days - 1]),
      pool.query(`
        SELECT
          p.id,
          p.name,
          p.category,
          COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
          COALESCE(SUM(oi.line_total), 0) AS sales
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE o.status <> 'cancelled'
        GROUP BY p.id, p.name, p.category
        ORDER BY sold_quantity DESC, sales DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT id, name, category, rating, review_count, stock
        FROM products
        WHERE is_active = 1 AND review_count > 0
        ORDER BY rating ASC, review_count DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          p.id,
          p.name,
          p.category,
          COUNT(w.id) AS wishlist_count
        FROM wishlist_items w
        JOIN products p ON p.id = w.product_id
        GROUP BY p.id, p.name, p.category
        ORDER BY wishlist_count DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT
          o.id,
          o.order_number,
          o.status,
          o.total_amount,
          o.created_at,
          u.name AS customer_name
        FROM orders o
        JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT 5
      `)
    ]);

    res.json({
      dashboard: {
        users,
        products,
        orders,
        reviews,
        questions,
        coupons,
        order_statuses: orderStatuses,
        daily_sales: dailySales,
        top_products: topProducts,
        low_rated_products: lowRatedProducts,
        top_wishlist_products: topWishlistProducts,
        recent_orders: recentOrders
      }
    });
  } catch (err) {
    next(err);
  }
};

export const exportDashboardCsv = async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days || 30)));
    const [rows] = await pool.query(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*) AS orders,
         COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_amount ELSE 0 END), 0) AS sales,
         COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_orders
       FROM orders
       WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days - 1]
    );

    const csv = [
      'date,orders,sales,cancelled_orders',
      ...rows.map((row) => [
        new Date(row.date).toISOString().slice(0, 10),
        row.orders,
        row.sales,
        row.cancelled_orders
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="homeshop-dashboard-${days}days.csv"`);
    res.send(`\uFEFF${csv}`);
  } catch (err) {
    next(err);
  }
};

export const listActivityLogs = async (req, res, next) => {
  try {
    const [logs] = await pool.query(
      `SELECT l.id, l.action, l.target_type, l.target_id, l.detail, l.created_at,
              u.name AS admin_name, u.username AS admin_username
       FROM admin_activity_logs l
       LEFT JOIN users u ON u.id = l.admin_id
       ORDER BY l.created_at DESC
       LIMIT 80`
    );

    res.json({ logs });
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
    await logAdminActivity(
      pool,
      req.user.id,
      'user.approval.update',
      'user',
      req.params.id,
      `approval_status=${approval_status}`
    );

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
    await logAdminActivity(pool, req.user.id, 'user.role.update', 'user', req.params.id, `role=${role}`);

    res.json({ message: 'User role updated.' });
  } catch (err) {
    next(err);
  }
};

export { listAllReviews, updateReviewVisibility };
