import { CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { formatPrice, statusLabel } from '../utils/format.js';

const refundStatusLabel = {
  requested: '처리 대기',
  approved: '승인',
  rejected: '거절'
};

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [notes, setNotes] = useState({});
  const [message, setMessage] = useState('');

  const loadRefunds = () => {
    apiRequest('/orders/admin/refunds').then((data) => {
      setRefunds(data.refunds || []);
      setNotes(Object.fromEntries((data.refunds || []).map((item) => [item.id, item.admin_note || ''])));
    });
  };

  useEffect(() => {
    loadRefunds();
  }, []);

  const reviewRefund = async (refundId, status) => {
    setMessage('');
    try {
      await apiRequest(`/orders/admin/refunds/${refundId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, admin_note: notes[refundId] || '' })
      });
      setMessage('환불 요청을 처리했습니다.');
      loadRefunds();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>환불 요청 관리</h1>
        </div>
      </section>

      {message && <p className={message.includes('처리') ? 'success' : 'error'}>{message}</p>}

      <div className="table-list">
        {refunds.length === 0 ? (
          <p className="muted">접수된 환불 요청이 없습니다.</p>
        ) : (
          refunds.map((refund) => (
            <article className="refund-row" key={refund.id}>
              <div>
                <span className={`status-pill ${refund.status === 'requested' ? 'pending' : refund.status === 'approved' ? 'approved' : 'rejected'}`}>
                  {refundStatusLabel[refund.status] || refund.status}
                </span>
                <h2>{refund.order_number}</h2>
                <p>{refund.customer_name} · {refund.customer_email}</p>
                <p><strong>사유:</strong> {refund.reason}</p>
                {refund.detail && <p className="muted">{refund.detail}</p>}
                <Link to={`/orders/${refund.order_id}`}>주문 상세 보기</Link>
              </div>
              <strong>{formatPrice(refund.total_amount)}</strong>
              <span>{statusLabel(refund.order_status)}</span>
              <div className="refund-actions">
                <textarea
                  value={notes[refund.id] || ''}
                  onChange={(event) => setNotes((current) => ({ ...current, [refund.id]: event.target.value }))}
                  placeholder="관리자 메모"
                  disabled={refund.status !== 'requested'}
                />
                {refund.status === 'requested' && (
                  <div className="row-actions">
                    <button className="button primary" type="button" onClick={() => reviewRefund(refund.id, 'approved')}>
                      <CheckCircle size={18} aria-hidden="true" />
                      승인
                    </button>
                    <button className="button danger" type="button" onClick={() => reviewRefund(refund.id, 'rejected')}>
                      <XCircle size={18} aria-hidden="true" />
                      거절
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
