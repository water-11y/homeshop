import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { formatPrice, statusLabel } from '../utils/format.js';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/orders/my')
      .then((data) => setOrders(data.orders))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Orders</p>
          <h1>My Orders</h1>
        </div>
      </section>

      {loading ? (
        <p className="muted">Loading orders...</p>
      ) : orders.length === 0 ? (
        <section className="empty-state">
          <h2>No orders yet.</h2>
          <Link className="button primary" to="/products">Shop Products</Link>
        </section>
      ) : (
        <div className="table-list">
          {orders.map((order) => (
            <article className="order-row" key={order.id}>
              <div>
                <span className="category">{statusLabel(order.status)}</span>
                <h2>{order.order_number}</h2>
                <p>{new Date(order.created_at).toLocaleString('ko-KR')}</p>
              </div>
              <strong>{formatPrice(order.total_amount)}</strong>
              <p>{order.shipping_address}</p>
              <Link className="button subtle" to={`/orders/${order.id}`}>Details</Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
