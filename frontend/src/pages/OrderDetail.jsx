import { XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { formatPrice, statusLabel } from '../utils/format.js';

const deliverySteps = [
  { key: 'paid', label: 'Paid', detail: 'Payment confirmed' },
  { key: 'preparing', label: 'Preparing', detail: 'Packing products' },
  { key: 'shipping', label: 'Shipping', detail: 'On the way' },
  { key: 'delivered', label: 'Delivered', detail: 'Delivery complete' }
];

const statusIndex = {
  paid: 0,
  preparing: 1,
  shipping: 2,
  delivered: 3
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    const data = await apiRequest(`/orders/${id}`);
    setOrder(data.order);
    setItems(data.items);
  };

  useEffect(() => {
    loadOrder().finally(() => setLoading(false));
  }, [id]);

  const cancelOrder = async () => {
    setMessage('');
    try {
      await apiRequest(`/orders/${id}/cancel`, { method: 'PATCH' });
      await loadOrder();
      setMessage('Order cancelled.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (loading) {
    return <main className="page"><p className="muted">Loading order...</p></main>;
  }

  if (!order) {
    return <main className="page"><p className="muted">Order was not found.</p></main>;
  }

  const canCancel = ['paid', 'preparing'].includes(order.status);
  const currentStep = statusIndex[order.status] ?? -1;
  const trackingNumber = `HS-${String(order.order_number).replace(/[^A-Z0-9]/g, '').slice(-10)}`;

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Order Detail</p>
          <h1>{order.order_number}</h1>
        </div>
        <Link className="button subtle" to="/orders">Back</Link>
      </section>

      {message && <p className={message.includes('cancelled') ? 'success' : 'error'}>{message}</p>}

      <section className="checkout-layout">
        <div className="form-card wide">
          <h2>Status: {statusLabel(order.status)}</h2>
          <p className="muted">{new Date(order.created_at).toLocaleString('ko-KR')}</p>
          <section className="delivery-tracker">
            <div className="tracker-head">
              <div>
                <span className="category">Delivery Status</span>
                <h3>{order.status === 'cancelled' ? 'Order Cancelled' : statusLabel(order.status)}</h3>
              </div>
              <strong>{order.status === 'shipping' || order.status === 'delivered' ? trackingNumber : 'Tracking pending'}</strong>
            </div>
            {order.status === 'cancelled' ? (
              <p className="muted">This order was cancelled. Restocked items are available again.</p>
            ) : (
              <ol className="tracker-steps">
                {deliverySteps.map((step, index) => (
                  <li className={index <= currentStep ? 'done' : ''} key={step.key}>
                    <i>{index + 1}</i>
                    <div>
                      <strong>{step.label}</strong>
                      <span>{step.detail}</span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <div className="order-info-grid">
            <div><span>Recipient</span><strong>{order.shipping_name}</strong></div>
            <div><span>Phone</span><strong>{order.shipping_phone}</strong></div>
            <div><span>Payment</span><strong>{order.payment_method}</strong></div>
            <div><span>Coupon</span><strong>{order.coupon_code || '-'}</strong></div>
          </div>
          <p>{order.shipping_address}</p>
          {order.memo && <p className="muted">{order.memo}</p>}
          {canCancel && (
            <button className="button danger" type="button" onClick={cancelOrder}>
              <XCircle size={18} aria-hidden="true" />
              Cancel Order
            </button>
          )}
        </div>

        <aside className="summary">
          <h2>Items</h2>
          {items.map((item) => (
            <div key={item.id}>
              <span>
                {item.product_name} x {item.quantity}
                {item.option_summary ? ` (${item.option_summary})` : ''}
              </span>
              <strong>{formatPrice(item.line_total)}</strong>
            </div>
          ))}
          <div>
            <span>Discount</span>
            <strong>-{formatPrice(order.discount_amount || 0)}</strong>
          </div>
          <div className="total">
            <span>Total</span>
            <strong>{formatPrice(order.total_amount)}</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}
