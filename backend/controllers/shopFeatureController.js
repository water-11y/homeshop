import { pool } from '../config/db.js';
import { logAdminActivity } from './adminController.js';

const normalizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const listWishlist = async (req, res, next) => {
  try {
    const [items] = await pool.query(
      `SELECT p.id, p.name, p.price, p.original_price, p.category, p.brand, p.image_url, p.rating, p.review_count
       FROM wishlist_items w
       JOIN products p ON p.id = w.product_id
       WHERE w.user_id = ? AND p.is_active = 1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    res.json({ items });
  } catch (err) {
    next(err);
  }
};

export const addWishlist = async (req, res, next) => {
  try {
    await pool.query('INSERT IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)', [
      req.user.id,
      req.params.productId
    ]);
    res.status(201).json({ message: 'Added to wishlist.' });
  } catch (err) {
    next(err);
  }
};

export const removeWishlist = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?', [
      req.user.id,
      req.params.productId
    ]);
    res.json({ message: 'Removed from wishlist.' });
  } catch (err) {
    next(err);
  }
};

export const listQuestions = async (req, res, next) => {
  try {
    const [questions] = await pool.query(
      `SELECT q.id, q.product_id, q.user_id, q.question, q.answer, q.is_private, q.created_at,
              u.name, u.username
       FROM product_questions q
       JOIN users u ON u.id = q.user_id
       WHERE q.product_id = ?
       ORDER BY q.created_at DESC`,
      [req.params.productId]
    );

    res.json({ questions });
  } catch (err) {
    next(err);
  }
};

export const createQuestion = async (req, res, next) => {
  try {
    const { question, is_private = false } = req.body;

    if (!question || question.trim().length < 5) {
      return res.status(400).json({ message: 'Question must be at least 5 characters.' });
    }

    await pool.query(
      'INSERT INTO product_questions (product_id, user_id, question, is_private) VALUES (?, ?, ?, ?)',
      [req.params.productId, req.user.id, question.trim(), is_private ? 1 : 0]
    );

    res.status(201).json({ message: 'Question submitted.' });
  } catch (err) {
    next(err);
  }
};

export const listAllQuestions = async (req, res, next) => {
  try {
    const [questions] = await pool.query(
      `SELECT q.id, q.product_id, q.question, q.answer, q.created_at, p.name AS product_name, u.name
       FROM product_questions q
       JOIN products p ON p.id = q.product_id
       JOIN users u ON u.id = q.user_id
       ORDER BY q.created_at DESC`
    );

    res.json({ questions });
  } catch (err) {
    next(err);
  }
};

export const answerQuestion = async (req, res, next) => {
  try {
    const { answer } = req.body;

    if (!answer || answer.trim().length < 2) {
      return res.status(400).json({ message: 'Answer is required.' });
    }

    await pool.query(
      'UPDATE product_questions SET answer = ?, answered_by = ?, answered_at = CURRENT_TIMESTAMP WHERE id = ?',
      [answer.trim(), req.user.id, req.params.questionId]
    );

    res.json({ message: 'Answer saved.' });
  } catch (err) {
    next(err);
  }
};

const getCouponDiscount = (coupon, amount) => {
  const numericAmount = Number(amount);
  if (!coupon || numericAmount < Number(coupon.min_order_amount)) return 0;
  if (coupon.discount_type === 'fixed') return Math.min(numericAmount, Number(coupon.discount_value));
  return Math.floor((numericAmount * Number(coupon.discount_value)) / 100);
};

export const listCoupons = async (req, res, next) => {
  try {
    const [coupons] = await pool.query(
      `SELECT id, code, name, discount_type, discount_value, min_order_amount
       FROM coupons
       WHERE is_active = 1
       ORDER BY created_at DESC`
    );
    res.json({ coupons });
  } catch (err) {
    next(err);
  }
};

export const listAllCoupons = async (req, res, next) => {
  try {
    const [coupons] = await pool.query(
      `SELECT id, code, name, discount_type, discount_value, min_order_amount, is_active, created_at
       FROM coupons
       ORDER BY created_at DESC`
    );
    res.json({ coupons });
  } catch (err) {
    next(err);
  }
};

export const validateCoupon = async (req, res, next) => {
  try {
    const { code, amount } = req.body;
    const [coupons] = await pool.query(
      `SELECT id, code, name, discount_type, discount_value, min_order_amount
       FROM coupons
       WHERE code = ? AND is_active = 1
       LIMIT 1`,
      [String(code || '').toUpperCase()]
    );

    if (coupons.length === 0) {
      return res.status(404).json({ message: 'Coupon was not found.' });
    }

    const discount = getCouponDiscount(coupons[0], amount);
    if (discount <= 0) {
      return res.status(400).json({ message: 'Minimum order amount was not reached.' });
    }

    res.json({ coupon: coupons[0], discount });
  } catch (err) {
    next(err);
  }
};

export const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      name,
      discount_type = 'percent',
      discount_value,
      min_order_amount = 0,
      is_active = true
    } = req.body;

    if (!code || !name || !discount_value) {
      return res.status(400).json({ message: 'Coupon fields are missing.' });
    }

    if (!['percent', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ message: 'Invalid discount type.' });
    }

    await pool.query(
      `INSERT INTO coupons
        (code, name, discount_type, discount_value, min_order_amount, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        String(code).trim().toUpperCase(),
        name,
        discount_type,
        Number(discount_value),
        Number(min_order_amount || 0),
        is_active ? 1 : 0
      ]
    );

    res.status(201).json({ message: 'Coupon created.' });
  } catch (err) {
    next(err);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const {
      name,
      discount_type,
      discount_value,
      min_order_amount = 0,
      is_active = true
    } = req.body;

    if (!name || !discount_type || !discount_value || !['percent', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ message: 'Invalid coupon data.' });
    }

    await pool.query(
      `UPDATE coupons
       SET name = ?, discount_type = ?, discount_value = ?, min_order_amount = ?, is_active = ?
       WHERE id = ?`,
      [
        name,
        discount_type,
        Number(discount_value),
        Number(min_order_amount || 0),
        is_active ? 1 : 0,
        req.params.couponId
      ]
    );

    res.json({ message: 'Coupon updated.' });
  } catch (err) {
    next(err);
  }
};

export const createNotification = async (
  db,
  userId,
  type,
  title,
  message,
  linkUrl = null
) => {
  await db.query(
    `INSERT INTO notifications (user_id, type, title, message, link_url)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title, message, linkUrl]
  );
};

export const listAddresses = async (req, res, next) => {
  try {
    const [addresses] = await pool.query(
      `SELECT id, label, recipient, phone, postal_code, address, detail_address,
              latitude, longitude, is_default, created_at
       FROM shipping_addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, updated_at DESC`,
      [req.user.id]
    );

    res.json({ addresses });
  } catch (err) {
    next(err);
  }
};

export const createAddress = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const {
      label = '기본 배송지',
      recipient,
      phone,
      postal_code = '',
      address,
      detail_address = '',
      latitude = null,
      longitude = null,
      is_default = false
    } = req.body;

    if (!recipient || !phone || !address) {
      return res.status(400).json({ message: '배송지 정보를 입력해주세요.' });
    }

    await connection.beginTransaction();

    const [countRows] = await connection.query(
      'SELECT COUNT(*) AS count FROM shipping_addresses WHERE user_id = ?',
      [req.user.id]
    );
    const shouldDefault = is_default || Number(countRows[0].count) === 0;

    if (shouldDefault) {
      await connection.query('UPDATE shipping_addresses SET is_default = 0 WHERE user_id = ?', [
        req.user.id
      ]);
    }

    const [result] = await connection.query(
      `INSERT INTO shipping_addresses
        (user_id, label, recipient, phone, postal_code, address, detail_address, latitude, longitude, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        String(label || '배송지').trim(),
        recipient,
        phone,
        postal_code || null,
        address,
        detail_address || null,
        normalizeOptionalNumber(latitude),
        normalizeOptionalNumber(longitude),
        shouldDefault ? 1 : 0
      ]
    );

    await connection.commit();
    res.status(201).json({ message: '배송지가 저장되었습니다.', id: result.insertId });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

export const updateAddress = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const {
      label = '배송지',
      recipient,
      phone,
      postal_code = '',
      address,
      detail_address = '',
      latitude = null,
      longitude = null,
      is_default = false
    } = req.body;

    if (!recipient || !phone || !address) {
      return res.status(400).json({ message: '배송지 정보를 입력해주세요.' });
    }

    await connection.beginTransaction();

    if (is_default) {
      await connection.query('UPDATE shipping_addresses SET is_default = 0 WHERE user_id = ?', [
        req.user.id
      ]);
    }

    const [result] = await connection.query(
      `UPDATE shipping_addresses
       SET label = ?, recipient = ?, phone = ?, postal_code = ?, address = ?, detail_address = ?,
           latitude = ?, longitude = ?,
           is_default = IF(?, 1, is_default)
       WHERE id = ? AND user_id = ?`,
      [
        String(label || '배송지').trim(),
        recipient,
        phone,
        postal_code || null,
        address,
        detail_address || null,
        normalizeOptionalNumber(latitude),
        normalizeOptionalNumber(longitude),
        is_default ? 1 : 0,
        req.params.addressId,
        req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      throw new Error('배송지를 찾을 수 없습니다.');
    }

    await connection.commit();
    res.json({ message: '배송지가 수정되었습니다.' });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message || '배송지 수정에 실패했습니다.' });
  } finally {
    connection.release();
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM shipping_addresses WHERE id = ? AND user_id = ?',
      [req.params.addressId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '배송지를 찾을 수 없습니다.' });
    }

    res.json({ message: '배송지가 삭제되었습니다.' });
  } catch (err) {
    next(err);
  }
};

export const setDefaultAddress = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query('UPDATE shipping_addresses SET is_default = 0 WHERE user_id = ?', [
      req.user.id
    ]);
    const [result] = await connection.query(
      'UPDATE shipping_addresses SET is_default = 1 WHERE id = ? AND user_id = ?',
      [req.params.addressId, req.user.id]
    );

    if (result.affectedRows === 0) {
      throw new Error('배송지를 찾을 수 없습니다.');
    }

    await connection.commit();
    res.json({ message: '기본 배송지로 설정되었습니다.' });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message || '기본 배송지 설정에 실패했습니다.' });
  } finally {
    connection.release();
  }
};

export const markRecentlyViewed = async (req, res, next) => {
  try {
    await pool.query(
      `INSERT INTO recently_viewed_products (user_id, product_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE viewed_at = CURRENT_TIMESTAMP`,
      [req.user.id, req.params.productId]
    );

    res.status(201).json({ message: '최근 본 상품에 저장되었습니다.' });
  } catch (err) {
    next(err);
  }
};

export const listRecentlyViewed = async (req, res, next) => {
  try {
    const [products] = await pool.query(
      `SELECT p.id, p.name, p.price, p.original_price, p.category, p.brand, p.image_url,
              p.rating, p.review_count, r.viewed_at
       FROM recently_viewed_products r
       JOIN products p ON p.id = r.product_id
       WHERE r.user_id = ? AND p.is_active = 1
       ORDER BY r.viewed_at DESC
       LIMIT 12`,
      [req.user.id]
    );

    res.json({ products });
  } catch (err) {
    next(err);
  }
};

export const listNotifications = async (req, res, next) => {
  try {
    const [notifications] = await pool.query(
      `SELECT id, type, title, message, link_url, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    const unread_count = notifications.filter((item) => !item.is_read).length;

    res.json({ notifications, unread_count });
  } catch (err) {
    next(err);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [
      req.params.notificationId,
      req.user.id
    ]);
    res.json({ message: '알림을 읽음 처리했습니다.' });
  } catch (err) {
    next(err);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ message: '모든 알림을 읽음 처리했습니다.' });
  } catch (err) {
    next(err);
  }
};

export const listNotices = async (req, res, next) => {
  try {
    const [notices] = await pool.query(
      `SELECT id, title, content, created_at, updated_at
       FROM notices
       WHERE is_published = 1
       ORDER BY created_at DESC`
    );
    res.json({ notices });
  } catch (err) {
    next(err);
  }
};

export const listFaqs = async (req, res, next) => {
  try {
    const [faqs] = await pool.query(
      `SELECT id, category, question, answer
       FROM faqs
       WHERE is_published = 1
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({ faqs });
  } catch (err) {
    next(err);
  }
};

export const getLegalPage = async (req, res, next) => {
  try {
    const [pages] = await pool.query(
      'SELECT slug, title, content, updated_at FROM legal_pages WHERE slug = ? LIMIT 1',
      [req.params.slug]
    );

    if (pages.length === 0) {
      return res.status(404).json({ message: '문서를 찾을 수 없습니다.' });
    }

    res.json({ page: pages[0] });
  } catch (err) {
    next(err);
  }
};

export const listAdminNotices = async (req, res, next) => {
  try {
    const [notices] = await pool.query(
      `SELECT id, title, content, is_published, created_at, updated_at
       FROM notices
       ORDER BY created_at DESC`
    );
    res.json({ notices });
  } catch (err) {
    next(err);
  }
};

export const saveNotice = async (req, res, next) => {
  try {
    const { title, content, is_published = true } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: '공지 제목과 내용을 입력해주세요.' });
    }

    if (req.params.noticeId) {
      await pool.query(
        'UPDATE notices SET title = ?, content = ?, is_published = ? WHERE id = ?',
        [title, content, is_published ? 1 : 0, req.params.noticeId]
      );
      await logAdminActivity(pool, req.user.id, 'notice.update', 'notice', req.params.noticeId, title);
      return res.json({ message: '공지사항이 수정되었습니다.' });
    }

    const [result] = await pool.query(
      'INSERT INTO notices (title, content, is_published, created_by) VALUES (?, ?, ?, ?)',
      [title, content, is_published ? 1 : 0, req.user.id]
    );
    await logAdminActivity(pool, req.user.id, 'notice.create', 'notice', result.insertId, title);
    res.status(201).json({ message: '공지사항이 등록되었습니다.', id: result.insertId });
  } catch (err) {
    next(err);
  }
};

export const listAdminFaqs = async (req, res, next) => {
  try {
    const [faqs] = await pool.query(
      `SELECT id, category, question, answer, sort_order, is_published
       FROM faqs
       ORDER BY sort_order ASC, id ASC`
    );
    res.json({ faqs });
  } catch (err) {
    next(err);
  }
};

export const saveFaq = async (req, res, next) => {
  try {
    const { category = 'general', question, answer, sort_order = 0, is_published = true } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: 'FAQ 질문과 답변을 입력해주세요.' });
    }

    if (req.params.faqId) {
      await pool.query(
        'UPDATE faqs SET category = ?, question = ?, answer = ?, sort_order = ?, is_published = ? WHERE id = ?',
        [category, question, answer, Number(sort_order || 0), is_published ? 1 : 0, req.params.faqId]
      );
      await logAdminActivity(pool, req.user.id, 'faq.update', 'faq', req.params.faqId, question);
      return res.json({ message: 'FAQ가 수정되었습니다.' });
    }

    const [result] = await pool.query(
      'INSERT INTO faqs (category, question, answer, sort_order, is_published) VALUES (?, ?, ?, ?, ?)',
      [category, question, answer, Number(sort_order || 0), is_published ? 1 : 0]
    );
    await logAdminActivity(pool, req.user.id, 'faq.create', 'faq', result.insertId, question);
    res.status(201).json({ message: 'FAQ가 등록되었습니다.', id: result.insertId });
  } catch (err) {
    next(err);
  }
};

export const updateLegalPage = async (req, res, next) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: '문서 제목과 내용을 입력해주세요.' });
    }

    await pool.query(
      `INSERT INTO legal_pages (slug, title, content)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content)`,
      [req.params.slug, title, content]
    );
    await logAdminActivity(pool, req.user.id, 'legal.update', 'legal_page', null, req.params.slug);
    res.json({ message: '문서가 저장되었습니다.' });
  } catch (err) {
    next(err);
  }
};

export const broadcastNotification = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const { title, message, link_url = '/notifications', type = 'notice' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: '알림 제목과 내용을 입력해주세요.' });
    }

    await connection.beginTransaction();
    const [users] = await connection.query("SELECT id FROM users WHERE approval_status = 'approved'");

    for (const user of users) {
      await createNotification(connection, user.id, type, title, message, link_url);
    }

    await logAdminActivity(connection, req.user.id, 'notification.broadcast', 'notification', null, title);
    await connection.commit();

    res.status(201).json({ message: '전체 알림이 발송되었습니다.', sent_count: users.length });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

export { getCouponDiscount };
