import {
  Bell,
  HelpCircle,
  Heart,
  LogOut,
  Menu,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Header() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    apiRequest('/shop/notifications')
      .then((data) => setUnreadCount(Number(data.unread_count || 0)))
      .catch(() => {});
  }, []);

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

      <nav className={`nav ${user?.role === 'admin' ? 'nav-admin' : 'nav-user'}`} aria-label="Main navigation">
        <NavLink to="/products" className="icon-link">
          <Store size={18} aria-hidden="true" />
          <span>Shop</span>
        </NavLink>
        <NavLink to="/cart" className="icon-link">
          <ShoppingCart size={18} aria-hidden="true" />
          <span>Cart</span>
          {totalItems > 0 && <span className="badge">{totalItems}</span>}
        </NavLink>
        <NavLink to="/wishlist" className="icon-link">
          <Heart size={18} aria-hidden="true" />
          <span>Wishlist</span>
        </NavLink>
        <NavLink to="/orders" className="icon-link">
          <ReceiptText size={18} aria-hidden="true" />
          <span>Orders</span>
        </NavLink>
        <NavLink to="/notifications" className="icon-link notification-link">
          <Bell size={18} aria-hidden="true" />
          <span>Alerts</span>
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </NavLink>
        <NavLink to="/support" className="icon-link support-link">
          <HelpCircle size={18} aria-hidden="true" />
          <span>Support</span>
        </NavLink>

        {user?.role === 'admin' && (
          <NavLink to="/admin/dashboard" className="icon-link admin-tab">
            <Menu size={18} aria-hidden="true" />
            <span>Admin</span>
          </NavLink>
        )}

        <NavLink to="/mypage" className="user-link">
          <User size={18} aria-hidden="true" />
          <span className="desktop-label">{user.name}</span>
          <span className="mobile-label">My</span>
        </NavLink>
        <button className="icon-button" onClick={handleLogout} type="button" title="Logout">
          <LogOut size={18} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </nav>
    </header>
  );
}
