import { MapPin, Plus, Search, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { openPostcodeSearch } from '../utils/postcode.js';

const emptyForm = {
  label: '우리집',
  recipient: '',
  phone: '',
  postal_code: '',
  address: '',
  detail_address: '',
  latitude: '',
  longitude: '',
  is_default: true
};

export default function AddressBook() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, recipient: user?.name || '' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(true);

  const loadAddresses = async () => {
    const data = await apiRequest('/shop/addresses');
    setAddresses(data.addresses || []);
  };

  useEffect(() => {
    loadAddresses().finally(() => setLoading(false));
  }, []);

  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const searchAddress = async () => {
    showMessage('');

    try {
      await openPostcodeSearch(({ postalCode, address }) => {
        setForm((current) => ({
          ...current,
          postal_code: postalCode,
          address,
          detail_address: ''
        }));
      });
    } catch {
      showMessage('주소 검색 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', 'error');
    }
  };

  const openMap = (item = form) => {
    const query = [item.address, item.detail_address].filter(Boolean).join(' ');

    if (!query) {
      showMessage('지도에서 확인할 주소가 없습니다.', 'error');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    showMessage('');

    try {
      await apiRequest('/shop/addresses', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setForm({ ...emptyForm, recipient: user?.name || '' });
      await loadAddresses();
      showMessage('배송지가 저장되었습니다.', 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    }
  };

  const setDefault = async (id) => {
    await apiRequest(`/shop/addresses/${id}/default`, { method: 'PATCH' });
    await loadAddresses();
  };

  const removeAddress = async (id) => {
    await apiRequest(`/shop/addresses/${id}`, { method: 'DELETE' });
    await loadAddresses();
  };

  return (
    <main className="page">
      <section className="address-layout">
        <div className="form-card address-form-card">
          <p className="eyebrow dark">Address</p>
          <h1>배송지 관리</h1>
          <form onSubmit={handleSubmit}>
            <label>
              배송지 이름
              <input name="label" value={form.label} onChange={handleChange} required />
            </label>

            <div className="checkout-grid">
              <label>
                받는 사람
                <input name="recipient" value={form.recipient} onChange={handleChange} required />
              </label>
              <label>
                연락처
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="010-0000-0000" required />
              </label>
            </div>

            <div className="postcode-row">
              <label>
                우편번호
                <input name="postal_code" value={form.postal_code} readOnly required />
              </label>
              <button className="button subtle" type="button" onClick={searchAddress}>
                <Search size={17} aria-hidden="true" />
                우편번호 검색
              </button>
            </div>

            <label>
              기본 주소
              <input name="address" value={form.address} readOnly required />
            </label>
            <label>
              상세 주소
              <input name="detail_address" value={form.detail_address} onChange={handleChange} placeholder="동, 호수, 건물명 등" />
            </label>

            <div className="map-action-row">
              <button className="button subtle" type="button" onClick={() => openMap()}>
                <MapPin size={17} aria-hidden="true" />
                지도에서 확인
              </button>
            </div>

            <label className="checkbox-row">
              <input name="is_default" type="checkbox" checked={form.is_default} onChange={handleChange} />
              기본 배송지로 저장
            </label>
            {message && <p className={messageType === 'success' ? 'success' : 'error'}>{message}</p>}
            <button className="button primary full" type="submit">
              <Plus size={18} aria-hidden="true" />
              배송지 추가
            </button>
          </form>
        </div>

        <div className="address-list-panel">
          <div className="section-head compact">
            <div>
              <p className="eyebrow dark">Saved</p>
              <h2>저장된 배송지</h2>
            </div>
          </div>
          {loading ? (
            <p className="muted">배송지를 불러오는 중...</p>
          ) : addresses.length === 0 ? (
            <p className="muted">저장된 배송지가 없습니다.</p>
          ) : (
            <div className="address-card-list">
              {addresses.map((address) => (
                <article className="address-card" key={address.id}>
                  <div>
                    <strong>{address.label}</strong>
                    {address.is_default ? <span className="status-pill">기본</span> : null}
                  </div>
                  <p>{address.recipient} · {address.phone}</p>
                  <p>
                    {address.postal_code ? `(${address.postal_code}) ` : ''}
                    {address.address} {address.detail_address || ''}
                  </p>
                  <div className="row-actions">
                    <button className="button subtle" type="button" onClick={() => openMap(address)}>
                      <MapPin size={16} aria-hidden="true" />
                      지도
                    </button>
                    {!address.is_default && (
                      <button className="button subtle" type="button" onClick={() => setDefault(address.id)}>
                        <Star size={16} aria-hidden="true" />
                        기본 설정
                      </button>
                    )}
                    <button className="button danger" type="button" onClick={() => removeAddress(address.id)}>
                      <Trash2 size={16} aria-hidden="true" />
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
