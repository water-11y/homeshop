import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState('');

  const loadReviews = () => {
    apiRequest('/admin/reviews').then((data) => setReviews(data.reviews));
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const toggleVisibility = async (review) => {
    setMessage('');

    try {
      await apiRequest(`/admin/reviews/${review.id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ is_visible: !review.is_visible })
      });
      loadReviews();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>Review Management</h1>
        </div>
      </section>

      {message && <p className="error">{message}</p>}

      <div className="table-list">
        {reviews.map((review) => (
          <article className="order-row admin-review-row" key={review.id}>
            <div>
              <span className="category">{review.is_visible ? 'visible' : 'hidden'}</span>
              <h2>{'★'.repeat(review.rating)} {review.title}</h2>
              <p>{review.content}</p>
              <p>{review.name} · Product #{review.product_id}</p>
            </div>
            <strong>{review.is_verified_purchase ? 'Verified' : 'General'}</strong>
            <div className="row-actions">
              <button className="button subtle" type="button" onClick={() => toggleVisibility(review)}>
                {review.is_visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                {review.is_visible ? 'Hide' : 'Show'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
