import { CreditCard, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

const linePrice = (item) => Number(item.product.price) + Number(item.option?.extra_price || 0);
const itemKey = (item) => item.key || `${item.product.id}:${item.option?.id || 'base'}`;

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shipping_name: user?.name || '',
    shipping_phone: '',
    shipping_address: '',
    memo: '',
    payment_method: 'mock_card'
  });
  const [couponCode, setCouponCode] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiRequest('/shop/coupons').then((data) => setCoupons(data.coupons)).catch(() => {});
  }, []);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const applyCoupon = async () => {
    setMessage('');
    setDiscount(0);

    try {
      const data = await apiRequest('/shop/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode, amount: totalAmount })
      });
      setDiscount(Number(data.discount || 0));
      setCouponCode(data.coupon.code);
      setMessage('Coupon applied.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          coupon_code: couponCode,
          items: items.map((item) => ({
            product_id: item.product.id,
            option_id: item.option?.id || null,
            quantity: item.quantity
          }))
        })
      });
      clearCart();
      navigate('/orders');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="page">
        <section className="empty-state">
          <h1>No products to order.</h1>
          <Link className="button primary" to="/products">Shop Products</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="checkout-layout">
        <div className="form-card wide">
          <h1>Checkout</h1>
          <form onSubmit={handleSubmit}>
            <label>
              Recipient
              <input name="shipping_name" value={form.shipping_name} onChange={handleChange} required />
            </label>
            <label>
              Phone
              <input name="shipping_phone" value={form.shipping_phone} onChange={handleChange} placeholder="010-0000-0000" required />
            </label>
            <label>
              Address
              <input name="shipping_address" value={form.shipping_address} onChange={handleChange} required />
            </label>
            <label>
              Delivery Memo
              <input name="memo" value={form.memo} onChange={handleChange} placeholder="Leave at the door." />
            </label>
            <label>
              Payment Method
              <select name="payment_method" value={form.payment_method} onChange={handleChange}>
                <option value="mock_card">Mock Card</option>
                <option value="mock_bank">Mock Bank Transfer</option>
                <option value="mock_phone">Mock Mobile Payment</option>
              </select>
            </label>
            {message && <p className={message.includes('applied') ? 'success' : 'error'}>{message}</p>}
            <button className="button primary full" type="submit" disabled={submitting}>
              <CreditCard size={18} aria-hidden="true" />
              {submitting ? 'Processing...' : 'Pay and Order'}
            </button>
          </form>
        </div>

        <aside className="summary">
          <h2>Order Products</h2>
          {items.map((item) => (
            <div key={itemKey(item)}>
              <span>
                {item.product.name} x {item.quantity}
                {item.option ? ` (${item.option.option_value})` : ''}
              </span>
              <strong>{formatPrice(linePrice(item) * item.quantity)}</strong>
            </div>
          ))}

          <div className="coupon-box">
            <label>
              Coupon
              <div className="inline-field">
                <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="WELCOME10" />
                <button className="button subtle" type="button" onClick={applyCoupon}>
                  <Tag size={16} aria-hidden="true" />
                  Apply
                </button>
              </div>
            </label>
            {coupons.length > 0 && (
              <div className="coupon-list">
                {coupons.map((coupon) => (
                  <button key={coupon.id} type="button" onClick={() => setCouponCode(coupon.code)}>
                    {coupon.code}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span>Subtotal</span>
            <strong>{formatPrice(totalAmount)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>-{formatPrice(discount)}</strong>
          </div>
          <div className="total">
            <span>Total</span>
            <strong>{formatPrice(Math.max(0, totalAmount - discount))}</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}
