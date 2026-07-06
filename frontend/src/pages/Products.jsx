import { Clock, Search, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import KakaoConsultButton from '../components/KakaoConsultButton.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

function ProductCard({ product, onAdd }) {
  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-image">
        <img src={product.image_url} alt={product.name} />
      </Link>
      <div className="product-body">
        <span className="category">{product.category}</span>
        <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
        <p>{product.brand} · ★ {Number(product.rating).toFixed(1)}</p>
        <div className="price-row">
          <strong>{formatPrice(product.price)}</strong>
          {product.original_price && <del>{formatPrice(product.original_price)}</del>}
        </div>
        <button className="button compact" type="button" onClick={() => onAdd(product)}>
          장바구니 담기
        </button>
      </div>
    </article>
  );
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [recentProducts, setRecentProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ q: '', category: '', sort: 'featured' });
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    apiRequest('/products/categories').then((data) => setCategories(data.categories));
    apiRequest('/shop/recently-viewed').then((data) => setRecentProducts(data.products || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    apiRequest(`/products?${query}`)
      .then((data) => setProducts(data.products))
      .finally(() => setLoading(false));
  }, [query]);

  const handleChange = (event) => {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Shop</p>
          <h1>전체 상품</h1>
        </div>
      </section>

      {recentProducts.length > 0 && (
        <section className="recent-products-panel">
          <div className="mini-section-head">
            <span><Clock size={16} aria-hidden="true" /> 최근 본 상품</span>
            <small>방금 둘러본 상품을 빠르게 다시 볼 수 있어요.</small>
          </div>
          <div className="recent-products-strip">
            {recentProducts.slice(0, 6).map((product) => (
              <Link className="recent-product-chip" to={`/products/${product.id}`} key={product.id}>
                <img src={product.image_url} alt={product.name} />
                <span>{product.name}</span>
                <small><Star size={12} aria-hidden="true" /> {Number(product.rating).toFixed(1)}</small>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="toolbar">
        <label className="search-box">
          <Search size={18} aria-hidden="true" />
          <input name="q" value={filters.q} onChange={handleChange} placeholder="상품명, 브랜드 검색" />
        </label>
        <select name="category" value={filters.category} onChange={handleChange}>
          <option value="">전체 카테고리</option>
          {categories.map((item) => (
            <option key={item.category} value={item.category}>
              {item.category} ({item.product_count})
            </option>
          ))}
        </select>
        <select name="sort" value={filters.sort} onChange={handleChange}>
          <option value="featured">추천순</option>
          <option value="newest">신상품순</option>
          <option value="rating">평점순</option>
          <option value="price_asc">낮은 가격순</option>
          <option value="price_desc">높은 가격순</option>
        </select>
      </section>

      {loading ? (
        <p className="muted">상품을 불러오는 중...</p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard product={product} onAdd={addItem} key={product.id} />
          ))}
        </div>
      )}
      <KakaoConsultButton variant="floating" label="카톡 상담" />
    </main>
  );
}
