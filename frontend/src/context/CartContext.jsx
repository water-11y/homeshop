import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'homeshop_cart';

const readCart = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (err) {
    return [];
  }
};

const saveCart = (items) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const getItemKey = (productId, optionId = null) => `${productId}:${optionId || 'base'}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);

  const commit = (nextItems) => {
    setItems(nextItems);
    saveCart(nextItems);
  };

  const addItem = (product, quantity = 1, option = null) => {
    const nextItems = items.map((item) => ({
      ...item,
      key: item.key || getItemKey(item.product.id, item.option?.id)
    }));
    const itemKey = getItemKey(product.id, option?.id);
    const existing = nextItems.find((item) => item.key === itemKey);

    if (existing) {
      existing.quantity += quantity;
    } else {
      nextItems.push({ key: itemKey, product, quantity, option });
    }

    commit(nextItems);
  };

  const updateQuantity = (key, quantity) => {
    const nextItems = items
      .map((item) => ((item.key || getItemKey(item.product.id, item.option?.id)) === key ? { ...item, quantity } : item))
      .filter((item) => item.quantity > 0);
    commit(nextItems);
  };

  const removeItem = (key) => {
    commit(items.filter((item) => (item.key || getItemKey(item.product.id, item.option?.id)) !== key));
  };

  const clearCart = () => {
    commit([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.product.price) + Number(item.option?.extra_price || 0)) * item.quantity,
    0
  );

  const value = useMemo(
    () => ({ items, totalItems, totalAmount, addItem, updateQuantity, removeItem, clearCart }),
    [items, totalItems, totalAmount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
};
