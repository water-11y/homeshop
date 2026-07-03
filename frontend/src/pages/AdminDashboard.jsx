import { AlertTriangle, MessageSquareText, PackagePlus, ReceiptText, Star, Ticket, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { formatPrice } from '../utils/format.js';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    apiRequest('/admin/dashboard').then((data) => setDashboard(data.dashboard));
  }, []);

  if (!dashboard) {
    return <main className="page"><p className="muted">Loading dashboard...</p></main>;
  }

  const cards = [
    {
      label: 'Dashboard',
      value: 'Admin',
      detail: '관리자 메뉴',
      icon: AlertTriangle,
      to: '/admin/dashboard'
    },
    {
      label: 'Sales',
      value: formatPrice(dashboard.orders.total_sales),
      detail: `${dashboard.orders.total_orders || 0} orders`,
      icon: ReceiptText,
      to: '/admin/orders'
    },
    {
      label: 'Users',
      value: dashboard.users.total_users || 0,
      detail: `${dashboard.users.pending_users || 0} pending approvals`,
      icon: UsersRound,
      to: '/admin/users'
    },
    {
      label: 'Products',
      value: dashboard.products.total_products || 0,
      detail: `${dashboard.products.low_stock_products || 0} low stock`,
      icon: PackagePlus,
      to: '/admin/products'
    },
    {
      label: 'Reviews',
      value: 'Review',
      detail: '리뷰 노출 관리',
      icon: Star,
      to: '/admin/reviews'
    },
    {
      label: 'Questions',
      value: dashboard.questions.total_questions || 0,
      detail: `${dashboard.questions.unanswered_questions || 0} unanswered`,
      icon: MessageSquareText,
      to: '/admin/questions'
    },
    {
      label: 'Coupons',
      value: 'Coupon',
      detail: '쿠폰 생성 및 상태 관리',
      icon: Ticket,
      to: '/admin/coupons'
    }
  ];

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>관리자 메뉴</h1>
        </div>
      </section>

      <section className="dashboard-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link className="dashboard-card" key={card.label} to={card.to}>
              <Icon size={22} aria-hidden="true" />
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </Link>
          );
        })}
      </section>

      <section className="notice-band">
        <AlertTriangle size={20} aria-hidden="true" />
        <span>Check pending approvals, unanswered questions, low stock products, and recent orders every day.</span>
      </section>
    </main>
  );
}
