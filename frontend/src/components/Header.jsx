import {
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PackagePlus,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  User,
  UsersRound
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: UsersRound },
  { to: '/admin/products', label: 'Products', icon: PackagePlus },
  { to: '/admin/orders', label: 'Orders', icon: ReceiptText },
  { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareText },
  { to: '/admin/questions', label: 'Questions', icon: MessageSquareText },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket }
];

export default function Header() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="site-header">
      <Link className="brand" to="/products">
        <ShoppingBag size={23} aria-hidden="true" />
        HomeShop
      </Link>

      <nav className="nav" aria-label="Main navigation">
        <NavLink to="/products">Shop</NavLink>
        <NavLink to="/cart" className="icon-link">
          <ShoppingCart size={18} aria-hidden="true" />
          Cart
          {totalItems > 0 && <span className="badge">{totalItems}</span>}
        </NavLink>
        <NavLink to="/wishlist" className="icon-link">
          <Heart size={18} aria-hidden="true" />
          Wishlist
        </NavLink>
        <NavLink to="/orders" className="icon-link">
          <ReceiptText size={18} aria-hidden="true" />
          Orders
        </NavLink>

        {user?.role === 'admin' && (
          <details className="nav-menu">
            <summary>
              <Menu size={18} aria-hidden="true" />
              Admin
            </summary>
            <div className="nav-menu-panel">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink key={link.to} to={link.to} className="menu-link">
                    <Icon size={17} aria-hidden="true" />
                    {link.label}
                  </NavLink>
                );
              })}
            </div>
          </details>
        )}

        <NavLink to="/mypage" className="user-link">
          <User size={18} aria-hidden="true" />
          {user.name}
        </NavLink>
        <button className="icon-button" onClick={handleLogout} type="button" title="Logout">
          <LogOut size={18} aria-hidden="true" />
          Logout
        </button>
      </nav>
    </header>
  );
}
