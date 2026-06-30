import { HeartOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { formatPrice } from '../utils/format.js';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = () => {
    apiRequest('/shop/wishlist')
      .then((data) => setItems(data.items))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const remove = async (productId) => {
    await apiRequest(`/products/${productId}/wishlist`, { method: 'DELETE' });
    loadWishlist();
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Wishlist</p>
          <h1>Saved Products</h1>
        </div>
      </section>

      {loading ? (
        <p className="muted">Loading wishlist...</p>
      ) : items.length === 0 ? (
        <section className="empty-state">
          <h2>No saved products.</h2>
          <Link className="button primary" to="/products">Shop Products</Link>
        </section>
      ) : (
        <section className="product-grid">
          {items.map((product) => (
            <article className="product-card" key={product.id}>
              <Link to={`/products/${product.id}`}>
                <img src={product.image_url} alt={product.name} />
              </Link>
              <div className="product-body">
                <span className="category">{product.category}</span>
                <h2>{product.name}</h2>
                <p>{product.brand}</p>
                <div className="price-row">
                  <strong>{formatPrice(product.price)}</strong>
                  <span>{Number(product.rating).toFixed(1)} / 5</span>
                </div>
                <button className="button subtle full" type="button" onClick={() => remove(product.id)}>
                  <HeartOff size={18} aria-hidden="true" />
                  Remove
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
