import { pool } from '../config/db.js';
import { logAdminActivity } from './adminController.js';
import { createNotification, getCouponDiscount } from './shopFeatureController.js';

const publicOrderSql = `
  SELECT id, order_number, user_id, total_amount, discount_amount, coupon_code,
         payment_method, status, shipping_name, shipping_phone, shipping_address,
         shipping_postal_code, shipping_detail_address, shipping_lat, shipping_lng,
         memo, created_at, updated_at
  FROM orders
`;

const statusLabels = {
  paid: '결제 완료',
  preparing: '상품 준비 중',
  shipping: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소'
};

const normalizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const makeOrderNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${date}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

export const createOrder = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const {
      items,
      shipping_name,
      shipping_phone,
      shipping_postal_code = '',
      shipping_address,
      shipping_detail_address = '',
      shipping_lat = null,
      shipping_lng = null,
      memo = '',
      coupon_code = '',
      payment_method = 'mock_card',
      save_address = false,
      address_label = '기본 배송지'
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    if (!shipping_name || !shipping_phone || !shipping_address) {
      return res.status(400).json({ message: 'Shipping information is required.' });
    }

    await connection.beginTransaction();

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      const optionId = item.option_id ? Number(item.option_id) : null;

      if (!productId || !quantity || quantity < 1) {
        throw new Error('Invalid order item.');
      }

      const [products] = await connection.query(
        'SELECT id, name, price, stock FROM products WHERE id = ? AND is_active = 1 FOR UPDATE',
        [productId]
      );

      if (products.length === 0) {
        throw new Error('Product was not found.');
      }

      const product = products[0];
      let extraPrice = 0;
      let optionSummary = null;

      if (product.stock < quantity) {
        throw new Error(`${product.name} is out of stock.`);
      }

      if (optionId) {
        const [options] = await connection.query(
          'SELECT id, option_name, option_value, extra_price, stock FROM product_options WHERE id = ? AND product_id = ? AND is_active = 1 FOR UPDATE',
          [optionId, product.id]
        );

        if (options.length === 0) {
          throw new Error('Product option was not found.');
        }

        const option = options[0];
        if (option.stock < quantity) {
          throw new Error(`${product.name} option is out of stock.`);
        }

        extraPrice = Number(option.extra_price || 0);
        optionSummary = `${option.option_name}: ${option.option_value}`;

        await connection.query('UPDATE product_options SET stock = stock - ? WHERE id = ?', [
          quantity,
          option.id
        ]);
      }

      const unitPrice = Number(product.price) + extraPrice;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      orderItems.push({
        product_id: product.id,
        option_id: optionId,
        product_name: product.name,
        option_summary: optionSummary,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal
      });

      await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [
        quantity,
        product.id
      ]);
    }

    let coupon = null;
    let discountAmount = 0;
    const normalizedCoupon = String(coupon_code || '').trim().toUpperCase();

    if (normalizedCoupon) {
      const [coupons] = await connection.query(
        `SELECT id, code, discount_type, discount_value, min_order_amount
         FROM coupons
         WHERE code = ? AND is_active = 1
         LIMIT 1`,
        [normalizedCoupon]
      );

      if (coupons.length === 0) {
        throw new Error('Coupon was not found.');
      }

      coupon = coupons[0];
      discountAmount = getCouponDiscount(coupon, subtotal);

      if (discountAmount <= 0) {
        throw new Error('Coupon minimum order amount was not reached.');
      }
    }

    const totalAmount = Math.max(0, subtotal - discountAmount);
    const orderNumber = makeOrderNumber();
    const latitude = normalizeOptionalNumber(shipping_lat);
    const longitude = normalizeOptionalNumber(shipping_lng);
    const [orderResult] = await connection.query(
      `INSERT INTO orders
        (order_number, user_id, total_amount, discount_amount, coupon_code, payment_method,
         status, shipping_name, shipping_phone, shipping_postal_code, shipping_address,
         shipping_detail_address, shipping_lat, shipping_lng, memo)
       VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        req.user.id,
        totalAmount,
        discountAmount,
        coupon?.code || null,
        payment_method,
        shipping_name,
        shipping_phone,
        shipping_postal_code || null,
        shipping_address,
        shipping_detail_address || null,
        latitude,
        longitude,
        memo
      ]
    );

    for (const item of orderItems) {
      await connection.query(
        `INSERT INTO order_items
          (order_id, product_id, option_id, product_name, option_summary, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderResult.insertId,
          item.product_id,
          item.option_id,
          item.product_name,
          item.option_summary,
          item.quantity,
          item.unit_price,
          item.line_total
        ]
      );
    }

    if (coupon) {
      await connection.query(
        'INSERT INTO coupon_redemptions (coupon_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)',
        [coupon.id, req.user.id, orderResult.insertId, discountAmount]
      );
    }

    if (save_address) {
      const [countRows] = await connection.query(
        'SELECT COUNT(*) AS count FROM shipping_addresses WHERE user_id = ?',
        [req.user.id]
      );
      const shouldDefault = Number(countRows[0].count) === 0;

      await connection.query(
        `INSERT INTO shipping_addresses
          (user_id, label, recipient, phone, postal_code, address, detail_address, latitude, longitude, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          String(address_label || '배송지').trim(),
          shipping_name,
          shipping_phone,
          shipping_postal_code || null,
          shipping_address,
          shipping_detail_address || null,
          latitude,
          longitude,
          shouldDefault ? 1 : 0
        ]
      );
    }

    await createNotification(
      connection,
      req.user.id,
      'order',
      '주문이 완료되었습니다.',
      `${orderNumber} 주문이 접수되었습니다.`,
      `/orders/${orderResult.insertId}`
    );

    await connection.commit();

    res.status(201).json({
      message: 'Order completed.',
      order: {
        id: orderResult.insertId,
        order_number: orderNumber,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        status: 'paid'
      }
    });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message || 'Order failed.' });
  } finally {
    connection.release();
  }
};

export const listMyOrders = async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      `${publicOrderSql} WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

export const getOrder = async (req, res, next) => {
  try {
    const params = [req.params.id];
    const ownerSql = req.user.role === 'admin' ? '' : ' AND user_id = ?';

    if (req.user.role !== 'admin') {
      params.push(req.user.id);
    }

    const [orders] = await pool.query(`${publicOrderSql} WHERE id = ?${ownerSql} LIMIT 1`, params);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order was not found.' });
    }

    const [items] = await pool.query(
      'SELECT id, product_id, option_id, product_name, option_summary, quantity, unit_price, line_total FROM order_items WHERE order_id = ?',
      [req.params.id]
    );
    const [refunds] = await pool.query(
      `SELECT id, reason, detail, status, admin_note, reviewed_at, created_at
       FROM refund_requests
       WHERE order_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.id]
    );

    res.json({ order: orders[0], items, refund_request: refunds[0] || null });
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const params = [req.params.id];
    const ownerSql = req.user.role === 'admin' ? '' : ' AND user_id = ?';
    if (req.user.role !== 'admin') params.push(req.user.id);

    const [orders] = await connection.query(
      `SELECT id, user_id, order_number, status FROM orders WHERE id = ?${ownerSql} LIMIT 1 FOR UPDATE`,
      params
    );

    if (orders.length === 0) {
      throw new Error('Order was not found.');
    }

    if (!['paid', 'preparing'].includes(orders[0].status)) {
      throw new Error('This order cannot be cancelled.');
    }

    const [items] = await connection.query('SELECT product_id, option_id, quantity FROM order_items WHERE order_id = ?', [
      req.params.id
    ]);

    for (const item of items) {
      if (item.product_id) {
        await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [
          item.quantity,
          item.product_id
        ]);
      }
      if (item.option_id) {
        await connection.query('UPDATE product_options SET stock = stock + ? WHERE id = ?', [
          item.quantity,
          item.option_id
        ]);
      }
    }

    await connection.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [req.params.id]);
    await createNotification(
      connection,
      orders[0].user_id,
      'order',
      '주문이 취소되었습니다.',
      `${orders[0].order_number} 주문이 취소되었습니다.`,
      `/orders/${orders[0].id}`
    );
    await connection.commit();

    res.json({ message: 'Order cancelled.' });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message || 'Cancel failed.' });
  } finally {
    connection.release();
  }
};

export const createRefundRequest = async (req, res, next) => {
  try {
    const { reason, detail = '' } = req.body;

    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({ message: '환불 사유를 입력해주세요.' });
    }

    const [orders] = await pool.query(
      'SELECT id, user_id, order_number, status FROM orders WHERE id = ? AND user_id = ? LIMIT 1',
      [req.params.id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    if (!['paid', 'preparing', 'shipping', 'delivered'].includes(orders[0].status)) {
      return res.status(400).json({ message: '현재 상태에서는 환불 요청을 할 수 없습니다.' });
    }

    const [result] = await pool.query(
      `INSERT INTO refund_requests (order_id, user_id, reason, detail)
       VALUES (?, ?, ?, ?)`,
      [orders[0].id, req.user.id, String(reason).trim(), String(detail || '').trim()]
    );

    res.status(201).json({ message: '환불 요청이 접수되었습니다.', refund_id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: '이미 환불 요청이 접수된 주문입니다.' });
    }
    next(err);
  }
};

export const listAllOrders = async (req, res, next) => {
  try {
    const [orders] = await pool.query(`${publicOrderSql} ORDER BY created_at DESC`);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};

export const listRefundRequests = async (req, res, next) => {
  try {
    const [refunds] = await pool.query(
      `SELECT r.id, r.order_id, r.user_id, r.reason, r.detail, r.status, r.admin_note,
              r.reviewed_at, r.created_at, o.order_number, o.total_amount, o.status AS order_status,
              u.name AS customer_name, u.email AS customer_email
       FROM refund_requests r
       JOIN orders o ON o.id = r.order_id
       JOIN users u ON u.id = r.user_id
       ORDER BY
         CASE r.status WHEN 'requested' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
         r.created_at DESC`
    );

    res.json({ refunds });
  } catch (err) {
    next(err);
  }
};

export const reviewRefundRequest = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    const allowed = ['approved', 'rejected'];
    const { status, admin_note = '' } = req.body;

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: '환불 처리 상태가 올바르지 않습니다.' });
    }

    await connection.beginTransaction();

    const [refunds] = await connection.query(
      `SELECT r.id, r.order_id, r.user_id, r.status, o.order_number
       FROM refund_requests r
       JOIN orders o ON o.id = r.order_id
       WHERE r.id = ?
       LIMIT 1 FOR UPDATE`,
      [req.params.refundId]
    );

    if (refunds.length === 0) {
      throw new Error('환불 요청을 찾을 수 없습니다.');
    }

    if (refunds[0].status !== 'requested') {
      throw new Error('이미 처리된 환불 요청입니다.');
    }

    await connection.query(
      `UPDATE refund_requests
       SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, String(admin_note || '').trim(), req.user.id, req.params.refundId]
    );

    if (status === 'approved') {
      await connection.query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [refunds[0].order_id]);
      const [items] = await connection.query(
        'SELECT product_id, option_id, quantity FROM order_items WHERE order_id = ?',
        [refunds[0].order_id]
      );

      for (const item of items) {
        if (item.product_id) {
          await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
        if (item.option_id) {
          await connection.query('UPDATE product_options SET stock = stock + ? WHERE id = ?', [item.quantity, item.option_id]);
        }
      }
    }

    await createNotification(
      connection,
      refunds[0].user_id,
      'refund',
      status === 'approved' ? '환불 요청이 승인되었습니다.' : '환불 요청이 거절되었습니다.',
      `${refunds[0].order_number} 주문의 환불 요청 처리 결과를 확인해주세요.`,
      `/orders/${refunds[0].order_id}`
    );
    await logAdminActivity(
      connection,
      req.user.id,
      'refund.review',
      'refund_request',
      req.params.refundId,
      `status=${status}`
    );

    await connection.commit();
    res.json({ message: '환불 요청이 처리되었습니다.' });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message || '환불 요청 처리에 실패했습니다.' });
  } finally {
    connection.release();
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const allowed = ['paid', 'preparing', 'shipping', 'delivered', 'cancelled'];
    const { status } = req.body;

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status.' });
    }

    const [orders] = await pool.query(
      'SELECT id, user_id, order_number FROM orders WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order was not found.' });
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    await createNotification(
      pool,
      orders[0].user_id,
      'delivery',
      '배송 상태가 변경되었습니다.',
      `${orders[0].order_number} 주문 상태가 ${statusLabels[status] || status}(으)로 변경되었습니다.`,
      `/orders/${orders[0].id}`
    );
    res.json({ message: 'Order status updated.' });
  } catch (err) {
    next(err);
  }
};
