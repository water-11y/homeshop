import {
  AlertTriangle,
  BarChart3,
  Heart,
  MessageSquareText,
  PackagePlus,
  ReceiptText,
  Star,
  Ticket,
  TrendingUp,
  Truck,
  UsersRound
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { formatPrice } from '../utils/format.js';

const statusLabels = {
  paid: '결제 완료',
  preparing: '상품 준비',
  shipping: '배송 중',
  delivered: '배송 완료',
  cancelled: '주문 취소'
};

const number = (value) => Number(value || 0);
const compactNumber = (value) => number(value).toLocaleString('ko-KR');

function MetricCard({ card }) {
  const Icon = card.icon;

  return (
    <Link className={card.warning ? 'dashboard-card warning' : 'dashboard-card'} to={card.to}>
      <Icon size={22} aria-hidden="true" />
      <span>{card.label}</span>
      <strong>{card.value}</strong>
      <p>{card.detail}</p>
    </Link>
  );
}

function EmptyLine({ children = '표시할 데이터가 없습니다.' }) {
  return <p className="muted compact-empty">{children}</p>;
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    apiRequest('/admin/dashboard').then((data) => setDashboard(data.dashboard));
  }, []);

  const maxDailySales = useMemo(() => {
    if (!dashboard?.daily_sales?.length) return 1;
    return Math.max(1, ...dashboard.daily_sales.map((item) => number(item.sales)));
  }, [dashboard?.daily_sales]);

  if (!dashboard) {
    return <main className="page"><p className="muted">관리자 통계를 불러오는 중입니다...</p></main>;
  }

  const workQueue =
    number(dashboard.users.pending_users) +
    number(dashboard.questions.unanswered_questions) +
    number(dashboard.orders.preparing_orders) +
    number(dashboard.products.low_stock_products);

  const cards = [
    {
      label: '오늘 매출',
      value: formatPrice(dashboard.orders.today_sales),
      detail: `오늘 주문 ${compactNumber(dashboard.orders.today_orders)}건`,
      icon: TrendingUp,
      to: '/admin/orders'
    },
    {
      label: '총 매출',
      value: formatPrice(dashboard.orders.total_sales),
      detail: `평균 주문 ${formatPrice(dashboard.orders.average_order_amount)}`,
      icon: ReceiptText,
      to: '/admin/orders'
    },
    {
      label: '회원',
      value: compactNumber(dashboard.users.total_users),
      detail: `승인 대기 ${compactNumber(dashboard.users.pending_users)}명`,
      icon: UsersRound,
      to: '/admin/users',
      warning: number(dashboard.users.pending_users) > 0
    },
    {
      label: '상품',
      value: compactNumber(dashboard.products.total_products),
      detail: `재고 부족 ${compactNumber(dashboard.products.low_stock_products)}개`,
      icon: PackagePlus,
      to: '/admin/products',
      warning: number(dashboard.products.low_stock_products) > 0
    },
    {
      label: '주문',
      value: compactNumber(dashboard.orders.total_orders),
      detail: `최근 7일 ${compactNumber(dashboard.orders.week_orders)}건`,
      icon: Truck,
      to: '/admin/orders'
    },
    {
      label: '리뷰',
      value: Number(dashboard.reviews.average_rating || 0).toFixed(1),
      detail: `리뷰 ${compactNumber(dashboard.reviews.total_reviews)}개`,
      icon: Star,
      to: '/admin/reviews'
    },
    {
      label: '문의',
      value: compactNumber(dashboard.questions.unanswered_questions),
      detail: `전체 문의 ${compactNumber(dashboard.questions.total_questions)}개`,
      icon: MessageSquareText,
      to: '/admin/questions',
      warning: number(dashboard.questions.unanswered_questions) > 0
    },
    {
      label: '쿠폰',
      value: compactNumber(dashboard.coupons.active_coupons),
      detail: `전체 쿠폰 ${compactNumber(dashboard.coupons.total_coupons)}개`,
      icon: Ticket,
      to: '/admin/coupons'
    }
  ];

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>관리자 통계</h1>
        </div>
      </section>

      <section className="dashboard-grid">
        {cards.map((card) => (
          <MetricCard card={card} key={card.label} />
        ))}
      </section>

      <section className="notice-band">
        <AlertTriangle size={20} aria-hidden="true" />
        <span>
          오늘 처리할 항목 {compactNumber(workQueue)}개:
          승인 대기 {compactNumber(dashboard.users.pending_users)}명,
          답변 대기 {compactNumber(dashboard.questions.unanswered_questions)}건,
          배송 준비 {compactNumber(dashboard.orders.preparing_orders)}건,
          재고 부족 {compactNumber(dashboard.products.low_stock_products)}개
        </span>
      </section>

      <section className="admin-analytics-layout">
        <article className="analytics-panel wide">
          <div className="panel-head">
            <div>
              <p className="eyebrow dark">7 Days</p>
              <h2>최근 7일 매출</h2>
            </div>
            <BarChart3 size={22} aria-hidden="true" />
          </div>
          {dashboard.daily_sales.length === 0 ? (
            <EmptyLine />
          ) : (
            <div className="sales-bars">
              {dashboard.daily_sales.map((item) => (
                <div className="sales-bar-row" key={item.sales_date}>
                  <span>{new Date(item.sales_date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
                  <div>
                    <i style={{ width: `${Math.max(6, (number(item.sales) / maxDailySales) * 100)}%` }} />
                  </div>
                  <strong>{formatPrice(item.sales)}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="analytics-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow dark">Status</p>
              <h2>주문 상태</h2>
            </div>
            <Truck size={22} aria-hidden="true" />
          </div>
          <div className="status-stat-list">
            {dashboard.order_statuses.length === 0 ? (
              <EmptyLine />
            ) : (
              dashboard.order_statuses.map((item) => (
                <div className="status-stat-row" key={item.status}>
                  <span>{statusLabels[item.status] || item.status}</span>
                  <strong>{compactNumber(item.count)}건</strong>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="admin-analytics-layout">
        <article className="analytics-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow dark">Top Sales</p>
              <h2>많이 팔린 상품</h2>
            </div>
            <TrendingUp size={22} aria-hidden="true" />
          </div>
          <div className="rank-list">
            {dashboard.top_products.length === 0 ? (
              <EmptyLine />
            ) : (
              dashboard.top_products.map((product, index) => (
                <Link className="rank-row" to={`/products/${product.id}`} key={`${product.id}-${index}`}>
                  <b>{index + 1}</b>
                  <span>
                    <strong>{product.name || '삭제된 상품'}</strong>
                    <small>{product.category || '기타'} · {compactNumber(product.sold_quantity)}개 판매</small>
                  </span>
                  <em>{formatPrice(product.sales)}</em>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="analytics-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow dark">Care</p>
              <h2>평점 관리 필요 상품</h2>
            </div>
            <Star size={22} aria-hidden="true" />
          </div>
          <div className="rank-list">
            {dashboard.low_rated_products.length === 0 ? (
              <EmptyLine />
            ) : (
              dashboard.low_rated_products.map((product, index) => (
                <Link className="rank-row" to={`/products/${product.id}`} key={product.id}>
                  <b>{index + 1}</b>
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.category} · 리뷰 {compactNumber(product.review_count)}개</small>
                  </span>
                  <em>{Number(product.rating).toFixed(1)}점</em>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="analytics-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow dark">Interest</p>
              <h2>찜 많은 상품</h2>
            </div>
            <Heart size={22} aria-hidden="true" />
          </div>
          <div className="rank-list">
            {dashboard.top_wishlist_products.length === 0 ? (
              <EmptyLine />
            ) : (
              dashboard.top_wishlist_products.map((product, index) => (
                <Link className="rank-row" to={`/products/${product.id}`} key={product.id}>
                  <b>{index + 1}</b>
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.category}</small>
                  </span>
                  <em>{compactNumber(product.wishlist_count)}명</em>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="analytics-panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow dark">Recent</p>
            <h2>최근 주문</h2>
          </div>
          <ReceiptText size={22} aria-hidden="true" />
        </div>
        <div className="recent-order-list">
          {dashboard.recent_orders.length === 0 ? (
            <EmptyLine />
          ) : (
            dashboard.recent_orders.map((order) => (
              <Link className="recent-order-row" to={`/orders/${order.id}`} key={order.id}>
                <span>
                  <strong>{order.order_number}</strong>
                  <small>{order.customer_name} · {new Date(order.created_at).toLocaleString('ko-KR')}</small>
                </span>
                <b>{statusLabels[order.status] || order.status}</b>
                <em>{formatPrice(order.total_amount)}</em>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
