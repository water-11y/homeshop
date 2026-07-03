import { MapPin, Navigation, Plus, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  label: '우리집',
  recipient: '',
  phone: '',
  address: '',
  latitude: '',
  longitude: '',
  is_default: true
};

export default function AddressBook() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, recipient: user?.name || '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAddresses = async () => {
    const data = await apiRequest('/shop/addresses');
    setAddresses(data.addresses || []);
  };

  useEffect(() => {
    loadAddresses().finally(() => setLoading(false));
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const useCurrentLocation = () => {
    setMessage('');
    if (!navigator.geolocation) {
      setMessage('이 기기에서는 위치 기능을 사용할 수 없습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm((current) => ({
          ...current,
          latitude: latitude.toFixed(7),
          longitude: longitude.toFixed(7),
          address: current.address || `현재 위치 좌표 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        }));
        setMessage('현재 위치를 가져왔습니다. 상세 주소를 확인해주세요.');
      },
      () => setMessage('위치 권한을 허용하면 현재 위치를 저장할 수 있습니다.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openMap = (address = form) => {
    const query = address.latitude && address.longitude
      ? `${address.latitude},${address.longitude}`
      : address.address;

    if (!query) {
      setMessage('지도에서 확인할 주소가 없습니다.');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await apiRequest('/shop/addresses', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setForm({ ...emptyForm, recipient: user?.name || '' });
      await loadAddresses();
      setMessage('배송지가 저장되었습니다.');
    } catch (err) {
      setMessage(err.message);
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
            <label>
              주소
              <input name="address" value={form.address} onChange={handleChange} placeholder="주소 또는 위치 설명" required />
            </label>
            <div className="map-action-row">
              <button className="button subtle" type="button" onClick={useCurrentLocation}>
                <Navigation size={17} aria-hidden="true" />
                현재 위치
              </button>
              <button className="button subtle" type="button" onClick={() => openMap()}>
                <MapPin size={17} aria-hidden="true" />
                지도 열기
              </button>
            </div>
            {(form.latitude && form.longitude) && (
              <p className="muted small">좌표: {form.latitude}, {form.longitude}</p>
            )}
            <label className="checkbox-row">
              <input name="is_default" type="checkbox" checked={form.is_default} onChange={handleChange} />
              기본 배송지로 저장
            </label>
            {message && <p className={message.includes('저장') || message.includes('가져') ? 'success' : 'error'}>{message}</p>}
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
                  <p>{address.address}</p>
                  {(address.latitude && address.longitude) && (
                    <small>{address.latitude}, {address.longitude}</small>
                  )}
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
