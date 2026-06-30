import { pool } from '../config/db.js';
import { getCouponDiscount } from './shopFeatureController.js';

const publicOrderSql = `
  SELECT id, order_number, user_id, total_amount, discount_amount, coupon_code,
         payment_method, status, shipping_name, shipping_phone, shipping_address,
         memo, created_at, updated_at
  FROM orders
`;

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
      shipping_address,
      memo = '',
      coupon_code = '',
      payment_method = 'mock_card'
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
    const [orderResult] = await connection.query(
      `INSERT INTO orders
        (order_number, user_id, total_amount, discount_amount, coupon_code, payment_method,
         status, shipping_name, shipping_phone, shipping_address, memo)
       VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)`,
      [
        orderNumber,
        req.user.id,
        totalAmount,
        discountAmount,
        coupon?.code || null,
        payment_method,
        shipping_name,
        shipping_phone,
        shipping_address,
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

    res.json({ order: orders[0], items });
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
      `SELECT id, status FROM orders WHERE id = ?${ownerSql} LIMIT 1 FOR UPDATE`,
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
    await connection.commit();

    res.json({ message: 'Order cancelled.' });
  } catch (err) {
    await connection.rollback();
    res.status(400).json({ message: err.message || 'Cancel failed.' });
  } finally {
    connection.release();
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

export const updateOrderStatus = async (req, res, next) => {
  try {
    const allowed = ['paid', 'preparing', 'shipping', 'delivered', 'cancelled'];
    const { status } = req.body;

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status.' });
    }

    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Order status updated.' });
  } catch (err) {
    next(err);
  }
};
