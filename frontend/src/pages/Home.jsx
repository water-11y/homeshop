import { ArrowRight, BadgePercent, Truck, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    apiRequest('/products?sort=featured')
      .then((data) => setProducts(data.products.slice(0, 4)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="page home">
      <section className="shop-hero">
        <div className="hero-copy">
          <p className="eyebrow">Live Home Shopping</p>
          <h1>오늘 필요한 생활 상품을 한 번에</h1>
          <p>
            주방, 생활, 패션, 뷰티 상품을 둘러보고 장바구니와 주문까지 바로 테스트할 수 있는
            홈쇼핑 기본 웹입니다.
          </p>
          <div className="actions">
            <Link className="button primary" to="/products">
              상품 보러가기
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button secondary" to="/cart">장바구니</Link>
          </div>
        </div>
        <aside className="live-panel">
          <Tv size={30} aria-hidden="true" />
          <span>오늘의 방송 특가</span>
          <strong>최대 30% 할인</strong>
          <p>회원가입 후 바로 주문 흐름을 확인해보세요.</p>
        </aside>
      </section>

      <section className="benefit-grid">
        <article>
          <BadgePercent size={22} aria-hidden="true" />
          <h2>특가 상품</h2>
          <p>원가와 판매가를 함께 보여주는 홈쇼핑형 상품 카드입니다.</p>
        </article>
        <article>
          <Truck size={22} aria-hidden="true" />
          <h2>주문 관리</h2>
          <p>회원 주문 생성, 내 주문 조회, 관리자 주문 상태 변경 구조를 갖췄습니다.</p>
        </article>
        <article>
          <Tv size={22} aria-hidden="true" />
          <h2>확장 가능</h2>
          <p>방송 편성, 리뷰, 쿠폰, 이미지 업로드 기능을 이어 붙이기 쉬운 구조입니다.</p>
        </article>
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow dark">Featured</p>
          <h2>추천 상품</h2>
        </div>
        <Link to="/products">전체보기</Link>
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
                <p>{product.brand}</p>
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
