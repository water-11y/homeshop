import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import { useAuth } from './context/AuthContext.jsx';
import AdminCoupons from './pages/AdminCoupons.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminProducts from './pages/AdminProducts.jsx';
import AdminOrders from './pages/AdminOrders.jsx';
import AdminQuestions from './pages/AdminQuestions.jsx';
import AdminReviews from './pages/AdminReviews.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AddressBook from './pages/AddressBook.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Login from './pages/Login.jsx';
import MyOrders from './pages/MyOrders.jsx';
import MyPage from './pages/MyPage.jsx';
import Notifications from './pages/Notifications.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import ProfileEdit from './pages/ProfileEdit.jsx';
import Products from './pages/Products.jsx';
import Register from './pages/Register.jsx';
import Wishlist from './pages/Wishlist.jsx';

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <main className="page"><p className="muted">Checking session...</p></main>;
  }

  return user ? <Navigate to="/products" replace /> : children;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <main className="page"><p className="muted">Checking session...</p></main>;
  }

  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <main className="page"><p className="muted">Checking permission...</p></main>;
  }

  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <>
      {user && <Header />}
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/products"
          element={
            <PrivateRoute>
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <PrivateRoute>
              <ProductDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <PrivateRoute>
              <Cart />
            </PrivateRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <PrivateRoute>
              <Wishlist />
            </PrivateRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <PrivateRoute>
              <Checkout />
            </PrivateRoute>
          }
        />
        <Route
          path="/addresses"
          element={
            <PrivateRoute>
              <AddressBook />
            </PrivateRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <PrivateRoute>
              <Notifications />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <MyOrders />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <PrivateRoute>
              <OrderDetail />
            </PrivateRoute>
          }
        />
        <Route
          path="/mypage"
          element={
            <PrivateRoute>
              <MyPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <PrivateRoute>
              <ProfileEdit />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/products"
          element={
            <AdminRoute>
              <AdminProducts />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/questions"
          element={
            <AdminRoute>
              <AdminQuestions />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/coupons"
          element={
            <AdminRoute>
              <AdminCoupons />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/reviews"
          element={
            <AdminRoute>
              <AdminReviews />
            </AdminRoute>
          }
        />
      </Routes>
    </>
  );
}
