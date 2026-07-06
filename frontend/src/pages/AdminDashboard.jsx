import {
  Activity,
  AlertTriangle,
  BarChart3,
  FileText,
  Heart,
  MessageSquareText,
  PackagePlus,
  ReceiptText,
  RotateCcw,
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
  paid: 'Paid',
  preparing: 'Preparing',
  shipping: 'Shipping',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const number = (value) => Number(value || 0);
const compactNumber = (value) => number(value).toLocaleString('ko-KR');
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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

function EmptyLine({ children = 'No data yet.' }) {
  return <p className="muted compact-empty">{children}</p>;
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setDashboard(null);
    apiRequest(`/admin/dashboard?days=${days}`).then((data) => setDashboard(data.dashboard));
  }, [days]);

  const maxDailySales = useMemo(() => {
    if (!dashboard?.daily_sales?.length) return 1;
    return Math.max(1, ...dashboard.daily_sales.map((item) => number(item.sales)));
  }, [dashboard?.daily_sales]);

  if (!dashboard) {
    return <main className="page"><p className="muted">Loading admin statistics...</p></main>;
  }

  const workQueue =
    number(dashboard.users.pending_users) +
    number(dashboard.questions.unanswered_questions) +
    number(dashboard.orders.preparing_orders) +
    number(dashboard.products.low_stock_products);

  const cards = [
    {
      label: 'Today Sales',
      value: formatPrice(dashboard.orders.today_sales),
      detail: `${compactNumber(dashboard.orders.today_orders)} orders today`,
      icon: TrendingUp,
      to: '/admin/orders'
    },
    {
      label: 'Total Sales',
      value: formatPrice(dashboard.orders.total_sales),
      detail: `Avg ${formatPrice(dashboard.orders.average_order_amount)}`,
      icon: ReceiptText,
      to: '/admin/orders'
    },
    {
      label: 'Users',
      value: compactNumber(dashboard.users.total_users),
      detail: `${compactNumber(dashboard.users.pending_users)} pending`,
      icon: UsersRound,
      to: '/admin/users',
      warning: number(dashboard.users.pending_users) > 0
    },
    {
      label: 'Products',
      value: compactNumber(dashboard.products.total_products),
      detail: `${compactNumber(dashboard.products.low_stock_products)} low stock`,
      icon: PackagePlus,
      to: '/admin/products',
      warning: number(dashboard.products.low_stock_products) > 0
    },
    {
      label: 'Orders',
      value: compactNumber(dashboard.orders.total_orders),
      detail: `${compactNumber(dashboard.orders.week_orders)} in ${days} days`,
      icon: Truck,
      to: '/admin/orders'
    },
    {
      label: 'Reviews',
      value: Number(dashboard.reviews.average_rating || 0).toFixed(1),
      detail: `${compactNumber(dashboard.reviews.total_reviews)} reviews`,
      icon: Star,
      to: '/admin/reviews'
    },
    {
      label: 'Q&A',
      value: compactNumber(dashboard.questions.unanswered_questions),
      detail: `${compactNumber(dashboard.questions.total_questions)} total`,
      icon: MessageSquareText,
      to: '/admin/questions',
      warning: number(dashboard.questions.unanswered_questions) > 0
    },
    {
      label: 'Coupons',
      value: compactNumber(dashboard.coupons.active_coupons),
      detail: `${compactNumber(dashboard.coupons.total_coupons)} total`,
      icon: Ticket,
      to: '/admin/coupons'
    },
    {
      label: 'Refunds',
      value: 'Review',
      detail: 'Refund requests',
      icon: RotateCcw,
      to: '/admin/refunds'
    },
    {
      label: 'Content',
      value: 'CMS',
      detail: 'Notice, FAQ, policy',
      icon: FileText,
      to: '/admin/content'
    },
    {
      label: 'Logs',
      value: 'Audit',
      detail: 'Admin activities',
      icon: Activity,
      to: '/admin/activity-logs'
    }
  ];

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>Admin Statistics</h1>
        </div>
        <div className="admin-period-actions">
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
          <a className="button subtle" href={`${apiBaseUrl}/admin/dashboard/export?days=${days}`}>CSV</a>
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
          Work queue {compactNumber(workQueue)}:
          pending users {compactNumber(dashboard.users.pending_users)},
          unanswered questions {compactNumber(dashboard.questions.unanswered_questions)},
          preparing orders {compactNumber(dashboard.orders.preparing_orders)},
          low stock {compactNumber(dashboard.products.low_stock_products)}
        </span>
      </section>

      <section className="admin-analytics-layout">
        <article className="analytics-panel wide">
          <div className="panel-head">
            <div>
              <p className="eyebrow dark">{days} Days</p>
              <h2>Sales Trend</h2>
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
                  <div><i style={{ width: `${Math.max(6, (number(item.sales) / maxDailySales) * 100)}%` }} /></div>
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
              <h2>Order Status</h2>
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
                  <strong>{compactNumber(item.count)}</strong>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="admin-analytics-layout">
        <article className="analytics-panel">
          <div className="panel-head"><h2>Top Products</h2><TrendingUp size={22} aria-hidden="true" /></div>
          <div className="rank-list">
            {dashboard.top_products.length === 0 ? <EmptyLine /> : dashboard.top_products.map((product, index) => (
              <Link className="rank-row" to={`/products/${product.id}`} key={`${product.id}-${index}`}>
                <b>{index + 1}</b>
                <span><strong>{product.name || 'Deleted product'}</strong><small>{compactNumber(product.sold_quantity)} sold</small></span>
                <em>{formatPrice(product.sales)}</em>
              </Link>
            ))}
          </div>
        </article>

        <article className="analytics-panel">
          <div className="panel-head"><h2>Low Ratings</h2><Star size={22} aria-hidden="true" /></div>
          <div className="rank-list">
            {dashboard.low_rated_products.length === 0 ? <EmptyLine /> : dashboard.low_rated_products.map((product, index) => (
              <Link className="rank-row" to={`/products/${product.id}`} key={product.id}>
                <b>{index + 1}</b>
                <span><strong>{product.name}</strong><small>{compactNumber(product.review_count)} reviews</small></span>
                <em>{Number(product.rating).toFixed(1)}</em>
              </Link>
            ))}
          </div>
        </article>

        <article className="analytics-panel">
          <div className="panel-head"><h2>Wishlist</h2><Heart size={22} aria-hidden="true" /></div>
          <div className="rank-list">
            {dashboard.top_wishlist_products.length === 0 ? <EmptyLine /> : dashboard.top_wishlist_products.map((product, index) => (
              <Link className="rank-row" to={`/products/${product.id}`} key={product.id}>
                <b>{index + 1}</b>
                <span><strong>{product.name}</strong><small>{product.category}</small></span>
                <em>{compactNumber(product.wishlist_count)}</em>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
