import { CreditCard, MapPin, Navigation, Tag, WalletCards } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { formatPrice } from '../utils/format.js';

const linePrice = (item) => Number(item.product.price) + Number(item.option?.extra_price || 0);
const itemKey = (item) => item.key || `${item.product.id}:${item.option?.id || 'base'}`;

const paymentMethods = [
  { value: 'mock_card', label: '신용/체크카드', description: '카드 승인 방식으로 결제합니다.' },
  { value: 'mock_easy', label: '간편결제', description: '앱 결제처럼 빠르게 진행합니다.' },
  { value: 'mock_bank', label: '계좌이체', description: '입금 확인 후 주문이 확정됩니다.' },
  { value: 'mock_phone', label: '휴대폰 결제', description: '휴대폰 인증 결제로 처리합니다.' }
];

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shipping_name: user?.name || '',
    shipping_phone: '',
    shipping_address: '',
    shipping_lat: '',
    shipping_lng: '',
    memo: '',
    payment_method: 'mock_card',
    save_address: true,
    address_label: '우리집'
  });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [message, setMessage] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalToPay = useMemo(() => Math.max(0, totalAmount - discount), [totalAmount, discount]);

  useEffect(() => {
    apiRequest('/shop/coupons').then((data) => setCoupons(data.coupons)).catch(() => {});
    apiRequest('/shop/addresses')
      .then((data) => {
        setAddresses(data.addresses || []);
        const defaultAddress = data.addresses?.find((item) => item.is_default) || data.addresses?.[0];
        if (defaultAddress) applyAddress(defaultAddress);
      })
      .catch(() => {});
  }, []);

  const applyAddress = (address) => {
    setSelectedAddressId(String(address.id));
    setForm((current) => ({
      ...current,
      shipping_name: address.recipient,
      shipping_phone: address.phone,
      shipping_address: address.address,
      shipping_lat: address.latitude || '',
      shipping_lng: address.longitude || '',
      address_label: address.label || current.address_label,
      save_address: false
    }));
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddressSelect = (event) => {
    const address = addresses.find((item) => String(item.id) === event.target.value);
    if (address) applyAddress(address);
  };

  const useCurrentLocation = () => {
    setLocationMessage('');

    if (!navigator.geolocation) {
      setLocationMessage('이 기기에서는 현재 위치를 가져올 수 없습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm((current) => ({
          ...current,
          shipping_lat: latitude.toFixed(7),
          shipping_lng: longitude.toFixed(7),
          shipping_address: current.shipping_address || `현재 위치 좌표 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
        }));
        setLocationMessage('현재 위치가 배송지에 연결되었습니다. 상세 주소는 직접 확인해주세요.');
      },
      () => setLocationMessage('위치 권한을 허용하면 현재 위치를 저장할 수 있습니다.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const openMap = () => {
    const query = form.shipping_lat && form.shipping_lng
      ? `${form.shipping_lat},${form.shipping_lng}`
      : form.shipping_address;

    if (!query) {
      setLocationMessage('먼저 주소나 현재 위치를 입력해주세요.');
      return;
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  };

  const applyCoupon = async () => {
    setMessage('');
    setDiscount(0);

    try {
      const data = await apiRequest('/shop/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode, amount: totalAmount })
      });
      setDiscount(Number(data.discount || 0));
      setCouponCode(data.coupon.code);
      setMessage('쿠폰이 적용되었습니다.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          coupon_code: couponCode,
          items: items.map((item) => ({
            product_id: item.product.id,
            option_id: item.option?.id || null,
            quantity: item.quantity
          }))
        })
      });
      clearCart();
      navigate('/orders');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="page">
        <section className="empty-state">
          <h1>주문할 상품이 없습니다.</h1>
          <Link className="button primary" to="/products">상품 보러가기</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="checkout-layout checkout-pro">
        <div className="form-card wide checkout-form-card">
          <div className="section-head compact">
            <div>
              <p className="eyebrow dark">Checkout</p>
              <h1>주문/결제</h1>
            </div>
            <Link className="button subtle" to="/addresses">배송지 관리</Link>
          </div>

          <form onSubmit={handleSubmit}>
            {addresses.length > 0 && (
              <label>
                저장된 배송지
                <select value={selectedAddressId} onChange={handleAddressSelect}>
                  <option value="">새 배송지 입력</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.is_default ? '[기본] ' : ''}{address.label} - {address.recipient}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="checkout-grid">
              <label>
                받는 사람
                <input name="shipping_name" value={form.shipping_name} onChange={handleChange} required />
              </label>
              <label>
                연락처
                <input name="shipping_phone" value={form.shipping_phone} onChange={handleChange} placeholder="010-0000-0000" required />
              </label>
            </div>

            <label>
              배송 주소
              <input name="shipping_address" value={form.shipping_address} onChange={handleChange} placeholder="주소를 입력하거나 현재 위치를 가져오세요." required />
            </label>

            <div className="map-action-row">
              <button className="button subtle" type="button" onClick={useCurrentLocation}>
                <Navigation size={17} aria-hidden="true" />
                현재 위치 가져오기
              </button>
              <button className="button subtle" type="button" onClick={openMap}>
                <MapPin size={17} aria-hidden="true" />
                지도에서 확인
              </button>
            </div>
            {(form.shipping_lat && form.shipping_lng) && (
              <p className="muted small">좌표: {form.shipping_lat}, {form.shipping_lng}</p>
            )}
            {locationMessage && <p className="success">{locationMessage}</p>}

            <label>
              배송 요청사항
              <input name="memo" value={form.memo} onChange={handleChange} placeholder="문 앞에 놓아주세요." />
            </label>

            <label className="checkbox-row save-address-row">
              <input
                type="checkbox"
                name="save_address"
                checked={form.save_address}
                onChange={handleChange}
              />
              이번 배송지를 저장하기
            </label>
            {form.save_address && (
              <label>
                배송지 이름
                <input name="address_label" value={form.address_label} onChange={handleChange} placeholder="우리집, 회사" />
              </label>
            )}

            <div className="payment-methods">
              {paymentMethods.map((method) => (
                <button
                  className={form.payment_method === method.value ? 'payment-card active' : 'payment-card'}
                  key={method.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, payment_method: method.value }))}
                >
                  <WalletCards size={20} aria-hidden="true" />
                  <strong>{method.label}</strong>
                  <span>{method.description}</span>
                </button>
              ))}
            </div>

            {message && <p className={message.includes('적용') ? 'success' : 'error'}>{message}</p>}
            <button className="button primary full checkout-pay-button" type="submit" disabled={submitting}>
              <CreditCard size={18} aria-hidden="true" />
              {submitting ? '결제 처리 중...' : `${formatPrice(totalToPay)} 결제하기`}
            </button>
          </form>
        </div>

        <aside className="summary checkout-summary">
          <h2>주문 상품</h2>
          {items.map((item) => (
            <div key={itemKey(item)}>
              <span>
                {item.product.name} x {item.quantity}
                {item.option ? ` (${item.option.option_value})` : ''}
              </span>
              <strong>{formatPrice(linePrice(item) * item.quantity)}</strong>
            </div>
          ))}

          <div className="coupon-box">
            <label>
              쿠폰
              <div className="inline-field">
                <input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="WELCOME10" />
                <button className="button subtle" type="button" onClick={applyCoupon}>
                  <Tag size={16} aria-hidden="true" />
                  적용
                </button>
              </div>
            </label>
            {coupons.length > 0 && (
              <div className="coupon-list">
                {coupons.map((coupon) => (
                  <button key={coupon.id} type="button" onClick={() => setCouponCode(coupon.code)}>
                    {coupon.code}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span>상품 금액</span>
            <strong>{formatPrice(totalAmount)}</strong>
          </div>
          <div>
            <span>할인</span>
            <strong>-{formatPrice(discount)}</strong>
          </div>
          <div>
            <span>배송비</span>
            <strong>무료</strong>
          </div>
          <div className="total">
            <span>최종 결제 금액</span>
            <strong>{formatPrice(totalToPay)}</strong>
          </div>
        </aside>
      </section>
    </main>
  );
}
