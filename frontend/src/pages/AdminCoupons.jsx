import { Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { formatPrice } from '../utils/format.js';

const initialForm = {
  code: '',
  name: '',
  discount_type: 'percent',
  discount_value: '',
  min_order_amount: 0,
  is_active: true
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');

  const loadCoupons = () => {
    apiRequest('/admin/coupons').then((data) => setCoupons(data.coupons));
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const createCoupon = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await apiRequest('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setForm(initialForm);
      setMessage('Coupon created.');
      loadCoupons();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const toggleCoupon = async (coupon) => {
    setMessage('');
    try {
      await apiRequest(`/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...coupon, is_active: !coupon.is_active })
      });
      setMessage('Coupon updated.');
      loadCoupons();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>Coupon Management</h1>
        </div>
      </section>

      <section className="admin-layout">
        <div className="form-card wide">
          <h2>Create Coupon</h2>
          <form onSubmit={createCoupon}>
            <div className="form-grid">
              <label>
                Code
                <input name="code" value={form.code} onChange={handleChange} placeholder="SALE20" required />
              </label>
              <label>
                Name
                <input name="name" value={form.name} onChange={handleChange} required />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Type
                <select name="discount_type" value={form.discount_type} onChange={handleChange}>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </label>
              <label>
                Discount
                <input name="discount_value" type="number" value={form.discount_value} onChange={handleChange} required />
              </label>
            </div>
            <label>
              Minimum Order Amount
              <input name="min_order_amount" type="number" value={form.min_order_amount} onChange={handleChange} />
            </label>
            <label className="check-row">
              <input name="is_active" type="checkbox" checked={form.is_active} onChange={handleChange} />
              Active
            </label>
            {message && <p className={message.includes('created') || message.includes('updated') ? 'success' : 'error'}>{message}</p>}
            <button className="button primary full" type="submit">
              <Ticket size={18} aria-hidden="true" />
              Create Coupon
            </button>
          </form>
        </div>

        <div className="coupon-admin-list">
          {coupons.map((coupon) => (
            <article className="coupon-admin-row" key={coupon.id}>
              <div className="coupon-main">
                <span className="category">{coupon.is_active ? 'Active' : 'Disabled'}</span>
                <h2 title={coupon.code}>{coupon.code}</h2>
                <p title={coupon.name}>{coupon.name}</p>
              </div>
              <div className="coupon-stat">
                <span>Discount</span>
                <strong>
                  {coupon.discount_type === 'percent'
                    ? `${Number(coupon.discount_value)}%`
                    : formatPrice(coupon.discount_value)}
                </strong>
              </div>
              <div className="coupon-stat">
                <span>Minimum</span>
                <strong>{formatPrice(coupon.min_order_amount)}</strong>
              </div>
              <button className="button subtle coupon-toggle" type="button" onClick={() => toggleCoupon(coupon)}>
                {coupon.is_active ? 'Disable' : 'Enable'}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
