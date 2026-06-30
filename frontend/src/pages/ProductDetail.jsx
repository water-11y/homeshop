import { Heart, Minus, Plus, ShoppingCart, Star, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

const emptyReview = { rating: 5, title: '', content: '' };

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [question, setQuestion] = useState('');
  const [privateQuestion, setPrivateQuestion] = useState(false);
  const [reviewForm, setReviewForm] = useState(emptyReview);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();
  const { user } = useAuth();

  const loadProduct = async () => {
    const data = await apiRequest(`/products/${id}`);
    setProduct(data.product);
    setSelectedImage(data.product.images?.[0]?.image_url || data.product.image_url);
    setSelectedOptionId(data.product.options?.[0]?.id ? String(data.product.options[0].id) : '');
  };

  const loadReviews = async () => {
    const data = await apiRequest(`/products/${id}/reviews`);
    setReviews(data.reviews);
    setDistribution(data.distribution);
  };

  const loadQuestions = async () => {
    const data = await apiRequest(`/products/${id}/questions`);
    setQuestions(data.questions);
  };

  useEffect(() => {
    Promise.all([loadProduct(), loadReviews(), loadQuestions()]).finally(() => setLoading(false));
  }, [id]);

  const selectedOption = useMemo(
    () => product?.options?.find((option) => String(option.id) === selectedOptionId) || null,
    [product, selectedOptionId]
  );
  const unitPrice = Number(product?.price || 0) + Number(selectedOption?.extra_price || 0);
  const myReview = reviews.find((review) => review.user_id === user?.id);

  useEffect(() => {
    if (myReview) {
      setReviewForm({
        rating: myReview.rating,
        title: myReview.title,
        content: myReview.content
      });
    } else {
      setReviewForm(emptyReview);
    }
  }, [myReview?.id]);

  if (loading) {
    return <main className="page"><p className="muted">Loading product...</p></main>;
  }

  if (!product) {
    return <main className="page"><p className="muted">Product was not found.</p></main>;
  }

  const maxQuantity = selectedOption ? selectedOption.stock : product.stock;

  const handleAddCart = () => {
    addItem(product, quantity, selectedOption);
    setMessage('Added to cart.');
  };

  const toggleWishlist = async () => {
    setMessage('');
    try {
      await apiRequest(`/products/${product.id}/wishlist`, { method: 'POST' });
      setMessage('Added to wishlist.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const path = myReview ? `/products/reviews/${myReview.id}` : `/products/${product.id}/reviews`;
      const method = myReview ? 'PUT' : 'POST';

      await apiRequest(path, {
        method,
        body: JSON.stringify(reviewForm)
      });

      await Promise.all([loadProduct(), loadReviews()]);
      setMessage('Review saved.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleReviewDelete = async () => {
    if (!myReview) return;

    setMessage('');
    try {
      await apiRequest(`/products/reviews/${myReview.id}`, { method: 'DELETE' });
      setReviewForm(emptyReview);
      await Promise.all([loadProduct(), loadReviews()]);
      setMessage('Review deleted.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleQuestionSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await apiRequest(`/products/${product.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({ question, is_private: privateQuestion })
      });
      setQuestion('');
      setPrivateQuestion(false);
      await loadQuestions();
      setMessage('Question submitted.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const distributionMap = new Map(distribution.map((item) => [Number(item.rating), Number(item.count)]));
  const maxDistribution = Math.max(1, ...distribution.map((item) => Number(item.count)));
  const images = product.images?.length ? product.images : [{ id: 'main', image_url: product.image_url }];

  return (
    <main className="page">
      <section className="detail-layout">
        <div className="gallery">
          <div className="detail-image">
            <img src={selectedImage || product.image_url} alt={product.name} />
          </div>
          <div className="thumb-row">
            {images.map((image) => (
              <button
                className={selectedImage === image.image_url ? 'thumb active' : 'thumb'}
                key={image.id}
                type="button"
                onClick={() => setSelectedImage(image.image_url)}
              >
                <img src={image.image_url} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-info">
          <span className="category">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="muted">{product.description}</p>
          <div className="meta-row">
            <span>Brand {product.brand}</span>
            <span>Rating {Number(product.rating).toFixed(1)} ({product.review_count})</span>
            <span>Stock {maxQuantity}</span>
          </div>
          <div className="detail-price">
            <strong>{formatPrice(unitPrice)}</strong>
            {product.original_price && <del>{formatPrice(product.original_price)}</del>}
          </div>

          {product.options?.length > 0 && (
            <label className="option-select">
              Option
              <select value={selectedOptionId} onChange={(event) => setSelectedOptionId(event.target.value)}>
                {product.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.option_name} - {option.option_value}
                    {Number(option.extra_price) > 0 ? ` (+${formatPrice(option.extra_price)})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="quantity-control">
            <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} title="Decrease">
              <Minus size={18} aria-hidden="true" />
            </button>
            <strong>{quantity}</strong>
            <button type="button" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} title="Increase">
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>

          {message && <p className={message.includes('saved') || message.includes('Added') || message.includes('submitted') || message.includes('deleted') ? 'success' : 'error'}>{message}</p>}

          <div className="actions">
            <button className="button primary" type="button" onClick={handleAddCart} disabled={maxQuantity < 1}>
              <ShoppingCart size={18} aria-hidden="true" />
              Add to Cart
            </button>
            <button className="button subtle" type="button" onClick={toggleWishlist}>
              <Heart size={18} aria-hidden="true" />
              Wishlist
            </button>
            <Link className="button subtle" to="/cart">View Cart</Link>
          </div>
        </div>
      </section>

      <section className="review-layout">
        <aside className="review-summary">
          <p className="eyebrow dark">Reviews</p>
          <strong>{Number(product.rating).toFixed(1)}</strong>
          <span>{product.review_count} reviews</span>
          <div className="rating-bars">
            {[5, 4, 3, 2, 1].map((score) => {
              const count = distributionMap.get(score) || 0;
              return (
                <div className="rating-bar" key={score}>
                  <span>{score}</span>
                  <div><i style={{ width: `${(count / maxDistribution) * 100}%` }} /></div>
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="review-panel">
          <form className="review-form" onSubmit={handleReviewSubmit}>
            <h2>{myReview ? 'Edit your review' : 'Write a review'}</h2>
            <label>
              Rating
              <select
                name="rating"
                value={reviewForm.rating}
                onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
              >
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </label>
            <label>
              Title
              <input
                name="title"
                value={reviewForm.title}
                onChange={(event) => setReviewForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </label>
            <label>
              Review
              <textarea
                name="content"
                value={reviewForm.content}
                onChange={(event) => setReviewForm((current) => ({ ...current, content: event.target.value }))}
                required
              />
            </label>
            <div className="row-actions">
              <button className="button primary" type="submit">
                <Star size={18} aria-hidden="true" />
                Save Review
              </button>
              {myReview && (
                <button className="button subtle" type="button" onClick={handleReviewDelete}>
                  <Trash2 size={18} aria-hidden="true" />
                  Delete
                </button>
              )}
            </div>
          </form>

          <div className="review-list">
            {reviews.length === 0 ? (
              <p className="muted">No reviews yet.</p>
            ) : (
              reviews.map((review) => (
                <article className="review-card" key={review.id}>
                  <div>
                    <strong>{review.rating} / 5</strong>
                    {review.is_verified_purchase ? <span className="verified">Verified purchase</span> : null}
                  </div>
                  <h3>{review.title}</h3>
                  <p>{review.content}</p>
                  <small>{review.name} - {new Date(review.created_at).toLocaleDateString('ko-KR')}</small>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="qa-section">
        <div className="section-head compact">
          <div>
            <p className="eyebrow dark">Q&A</p>
            <h2>Product Questions</h2>
          </div>
        </div>
        <form className="question-form" onSubmit={handleQuestionSubmit}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about delivery, options, or product details."
            required
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={privateQuestion}
              onChange={(event) => setPrivateQuestion(event.target.checked)}
            />
            Private question
          </label>
          <button className="button primary" type="submit">Submit Question</button>
        </form>
        <div className="question-list">
          {questions.length === 0 ? (
            <p className="muted">No questions yet.</p>
          ) : (
            questions.map((item) => (
              <article className="question-card" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <small>{new Date(item.created_at).toLocaleDateString('ko-KR')}</small>
                </div>
                <p>{item.is_private && item.user_id !== user.id && user.role !== 'admin' ? 'Private question' : item.question}</p>
                {item.answer ? <p className="answer">Answer: {item.answer}</p> : <p className="muted">Waiting for admin answer.</p>}
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
