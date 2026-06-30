import { Edit3, PackagePlus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { formatPrice } from '../utils/format.js';

const initialForm = {
  name: '',
  description: '',
  price: '',
  original_price: '',
  category: 'Kitchen',
  brand: '',
  image_url: '',
  stock: 10,
  is_featured: false
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = () => {
    apiRequest('/products?sort=newest').then((data) => setProducts(data.products));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      original_price: product.original_price || '',
      category: product.category,
      brand: product.brand,
      image_url: product.image_url,
      stock: product.stock,
      is_featured: Boolean(product.is_featured)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      await apiRequest(editingId ? `/products/${editingId}` : '/products', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(form)
      });
      resetForm();
      setMessage(editingId ? 'Product updated.' : 'Product created.');
      loadProducts();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (productId) => {
    setMessage('');
    try {
      await apiRequest(`/products/${productId}`, { method: 'DELETE' });
      setMessage('Product deleted.');
      loadProducts();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>Product Management</h1>
        </div>
      </section>

      <section className="admin-layout">
        <div className="form-card wide">
          <h2>{editingId ? 'Edit Product' : 'Create Product'}</h2>
          <form onSubmit={handleSubmit}>
            <label>
              Product Name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              Description
              <textarea name="description" value={form.description} onChange={handleChange} required />
            </label>
            <div className="form-grid">
              <label>
                Price
                <input name="price" type="number" value={form.price} onChange={handleChange} required />
              </label>
              <label>
                Original Price
                <input name="original_price" type="number" value={form.original_price} onChange={handleChange} />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Category
                <select name="category" value={form.category} onChange={handleChange}>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Living">Living</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Beauty">Beauty</option>
                </select>
              </label>
              <label>
                Stock
                <input name="stock" type="number" value={form.stock} onChange={handleChange} required />
              </label>
            </div>
            <label>
              Brand
              <input name="brand" value={form.brand} onChange={handleChange} required />
            </label>
            <label>
              Image URL
              <input name="image_url" value={form.image_url} onChange={handleChange} required />
            </label>
            <label className="check-row">
              <input name="is_featured" type="checkbox" checked={form.is_featured} onChange={handleChange} />
              Show as featured
            </label>
            {message && <p className={message.includes('created') || message.includes('updated') || message.includes('deleted') ? 'success' : 'error'}>{message}</p>}
            <div className="row-actions">
              <button className="button primary" type="submit" disabled={submitting}>
                <PackagePlus size={18} aria-hidden="true" />
                {submitting ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
              </button>
              {editingId && (
                <button className="button subtle" type="button" onClick={resetForm}>
                  <X size={18} aria-hidden="true" />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="admin-products">
          {products.map((product) => (
            <article className="mini-product" key={product.id}>
              <img src={product.image_url} alt={product.name} />
              <div>
                <span className="category">{product.category}</span>
                <h3>{product.name}</h3>
                <p>{formatPrice(product.price)} - Stock {product.stock}</p>
                <div className="row-actions">
                  <button className="button subtle" type="button" onClick={() => startEdit(product)}>
                    <Edit3 size={16} aria-hidden="true" />
                    Edit
                  </button>
                  <button className="button danger" type="button" onClick={() => deleteProduct(product.id)}>
                    <Trash2 size={16} aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
