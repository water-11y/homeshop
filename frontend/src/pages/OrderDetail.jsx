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
  const [refundRequest, setRefundRequest] = useState(null);
  const [refundForm, setRefundForm] = useState({ reason: '', detail: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrder = async () => {
    const data = await apiRequest(`/orders/${id}`);
    setOrder(data.order);
    setItems(data.items);
    setRefundRequest(data.refund_request || null);
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

  const requestRefund = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await apiRequest(`/orders/${id}/refund-request`, {
        method: 'POST',
        body: JSON.stringify(refundForm)
      });
      setRefundForm({ reason: '', detail: '' });
      await loadOrder();
      setMessage('환불 요청이 접수되었습니다.');
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
  const canRequestRefund = !refundRequest && ['paid', 'preparing', 'shipping', 'delivered'].includes(order.status);
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

      {message && <p className={message.includes('cancelled') || message.includes('접수') ? 'success' : 'error'}>{message}</p>}

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

          {refundRequest && (
            <section className="refund-status-box">
              <span className={`status-pill ${refundRequest.status === 'requested' ? 'pending' : refundRequest.status === 'approved' ? 'approved' : 'rejected'}`}>
                {refundRequest.status === 'requested' ? '환불 검토 중' : refundRequest.status === 'approved' ? '환불 승인' : '환불 거절'}
              </span>
              <h3>환불 요청 내역</h3>
              <p><strong>사유:</strong> {refundRequest.reason}</p>
              {refundRequest.detail && <p className="muted">{refundRequest.detail}</p>}
              {refundRequest.admin_note && <p><strong>관리자 메모:</strong> {refundRequest.admin_note}</p>}
            </section>
          )}

          {canRequestRefund && (
            <form className="refund-request-form" onSubmit={requestRefund}>
              <h3>환불 요청</h3>
              <label>
                환불 사유
                <input
                  value={refundForm.reason}
                  onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="예: 단순 변심, 상품 문제, 배송 문제"
                  required
                />
              </label>
              <label>
                상세 내용
                <textarea
                  value={refundForm.detail}
                  onChange={(event) => setRefundForm((current) => ({ ...current, detail: event.target.value }))}
                  placeholder="관리자가 확인할 수 있도록 내용을 적어주세요."
                />
              </label>
              <button className="button subtle" type="submit">환불 요청 접수</button>
            </form>
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
