import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { formatPrice, statusLabel } from '../utils/format.js';

const statuses = ['paid', 'preparing', 'shipping', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');

  const loadOrders = () => {
    apiRequest('/orders/admin').then((data) => setOrders(data.orders));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (id, status) => {
    setMessage('');
    try {
      await apiRequest(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      loadOrders();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>Order Management</h1>
        </div>
      </section>

      {message && <p className="error">{message}</p>}

      <div className="table-list">
        {orders.map((order) => (
          <article className="order-row" key={order.id}>
            <div>
              <span className="category">{statusLabel(order.status)}</span>
              <h2>{order.order_number}</h2>
              <p>{order.shipping_name} · {order.shipping_phone}</p>
            </div>
            <strong>{formatPrice(order.total_amount)}</strong>
            <select value={order.status} onChange={(event) => updateStatus(order.id, event.target.value)}>
              {statuses.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </article>
        ))}
      </div>
    </main>
  );
}
