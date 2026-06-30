import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

export default function Products() {
  const [products, setProducts] = useState([]);
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
            <article className="product-card" key={product.id}>
              <Link to={`/products/${product.id}`} className="product-image">
                <img src={product.image_url} alt={product.name} />
              </Link>
              <div className="product-body">
                <span className="category">{product.category}</span>
                <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
                <p>{product.brand} · ★ {product.rating}</p>
                <div className="price-row">
                  <strong>{formatPrice(product.price)}</strong>
                  {product.original_price && <del>{formatPrice(product.original_price)}</del>}
                </div>
                <button className="button compact" type="button" onClick={() => addItem(product)}>
                  장바구니 담기
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
