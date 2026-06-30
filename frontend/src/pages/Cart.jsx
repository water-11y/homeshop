import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

const linePrice = (item) => Number(item.product.price) + Number(item.option?.extra_price || 0);
const itemKey = (item) => item.key || `${item.product.id}:${item.option?.id || 'base'}`;

export default function Cart() {
  const { items, totalAmount, updateQuantity, removeItem } = useCart();

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Cart</p>
          <h1>Shopping Cart</h1>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="empty-state">
          <h2>Your cart is empty.</h2>
          <Link className="button primary" to="/products">Shop Products</Link>
        </section>
      ) : (
        <section className="cart-layout">
          <div className="cart-list">
            {items.map((item) => (
              <article className="cart-item" key={itemKey(item)}>
                <img src={item.product.image_url} alt={item.product.name} />
                <div>
                  <span className="category">{item.product.category}</span>
                  <h2>{item.product.name}</h2>
                  {item.option && (
                    <p className="muted">
                      {item.option.option_name}: {item.option.option_value}
                    </p>
                  )}
                  <p>{formatPrice(linePrice(item))}</p>
                </div>
                <div className="quantity-control small">
                  <button type="button" onClick={() => updateQuantity(itemKey(item), item.quantity - 1)} title="Decrease">
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <strong>{item.quantity}</strong>
                  <button type="button" onClick={() => updateQuantity(itemKey(item), item.quantity + 1)} title="Increase">
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
                <strong>{formatPrice(linePrice(item) * item.quantity)}</strong>
                <button className="icon-only" type="button" onClick={() => removeItem(itemKey(item))} title="Remove">
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
          <aside className="summary">
            <h2>Order Summary</h2>
            <div>
              <span>Products</span>
              <strong>{formatPrice(totalAmount)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>Free</strong>
            </div>
            <div className="total">
              <span>Estimated Total</span>
              <strong>{formatPrice(totalAmount)}</strong>
            </div>
            <Link className="button primary full" to="/checkout">Checkout</Link>
          </aside>
        </section>
      )}
    </main>
  );
}
