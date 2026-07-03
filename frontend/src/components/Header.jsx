import {
  Heart,
  LogOut,
  Menu,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
} from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

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
          <NavLink to="/admin/dashboard" className="icon-link admin-tab">
            <Menu size={18} aria-hidden="true" />
            <span>Admin</span>
          </NavLink>
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
