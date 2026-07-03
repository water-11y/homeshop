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
  Store,
  Ticket,
  User,
  UsersRound
} from 'lucide-react';
import { useState } from 'react';
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
  const [adminOpen, setAdminOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const closeAdminMenu = () => {
    setAdminOpen(false);
  };

  return (
    <header className="site-header">
      <Link className="brand" to="/products">
        <ShoppingBag size={23} aria-hidden="true" />
        HomeShop
      </Link>

      <nav className="nav" aria-label="Main navigation">
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

        {user?.role === 'admin' && (
          <div className={`nav-menu ${adminOpen ? 'open' : ''}`}>
            <button
              className="admin-menu-button"
              type="button"
              onClick={() => setAdminOpen((current) => !current)}
              aria-expanded={adminOpen}
              aria-controls="admin-menu-panel"
            >
              <Menu size={18} aria-hidden="true" />
              <span>Admin</span>
            </button>
            {adminOpen && <button className="nav-menu-backdrop" type="button" aria-label="Close admin menu" onClick={closeAdminMenu} />}
            <div className="nav-menu-panel" id="admin-menu-panel" hidden={!adminOpen}>
              {adminLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink key={link.to} to={link.to} className="menu-link" onClick={closeAdminMenu}>
                    <Icon size={17} aria-hidden="true" />
                    {link.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}

        <NavLink to="/mypage" className="user-link">
          <User size={18} aria-hidden="true" />
          <span>{user.name}</span>
        </NavLink>
        <button className="icon-button" onClick={handleLogout} type="button" title="Logout">
          <LogOut size={18} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </nav>
    </header>
  );
}
