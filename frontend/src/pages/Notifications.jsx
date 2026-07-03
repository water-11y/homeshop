import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionMessage, setPermissionMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    const data = await apiRequest('/shop/notifications');
    setNotifications(data.notifications || []);
    setUnreadCount(Number(data.unread_count || 0));
  };

  useEffect(() => {
    loadNotifications().finally(() => setLoading(false));
  }, []);

  const requestBrowserNotification = async () => {
    if (!('Notification' in window)) {
      setPermissionMessage('이 환경에서는 브라우저 알림을 지원하지 않습니다.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPermissionMessage('알림 권한이 허용되었습니다.');
      new Notification('HomeShop 알림', { body: '새 주문/배송 알림을 받을 준비가 되었습니다.' });
    } else {
      setPermissionMessage('알림 권한이 허용되지 않았습니다.');
    }
  };

  const markRead = async (item) => {
    if (!item.is_read) {
      await apiRequest(`/shop/notifications/${item.id}/read`, { method: 'PATCH' });
      await loadNotifications();
    }
  };

  const markAllRead = async () => {
    await apiRequest('/shop/notifications/read-all', { method: 'PATCH' });
    await loadNotifications();
  };

  return (
    <main className="page">
      <section className="notifications-page">
        <div className="section-head compact">
          <div>
            <p className="eyebrow dark">Notifications</p>
            <h1>알림함</h1>
            <p className="muted">주문, 결제, 배송 상태 변경 알림을 확인할 수 있습니다.</p>
          </div>
          <div className="row-actions">
            <button className="button subtle" type="button" onClick={requestBrowserNotification}>
              <Bell size={17} aria-hidden="true" />
              알림 권한
            </button>
            <button className="button primary" type="button" onClick={markAllRead} disabled={unreadCount === 0}>
              <CheckCheck size={17} aria-hidden="true" />
              모두 읽음
            </button>
          </div>
        </div>

        {permissionMessage && <p className="success">{permissionMessage}</p>}
        {loading ? (
          <p className="muted">알림을 불러오는 중...</p>
        ) : notifications.length === 0 ? (
          <section className="empty-state">
            <Bell size={38} aria-hidden="true" />
            <h2>아직 알림이 없습니다.</h2>
            <p className="muted">주문을 완료하거나 배송 상태가 바뀌면 이곳에 표시됩니다.</p>
          </section>
        ) : (
          <div className="notification-list">
            {notifications.map((item) => (
              <article className={item.is_read ? 'notification-card' : 'notification-card unread'} key={item.id}>
                <button type="button" onClick={() => markRead(item)}>
                  <span className="notification-dot" aria-hidden="true" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{new Date(item.created_at).toLocaleString('ko-KR')}</small>
                  </div>
                </button>
                {item.link_url && (
                  <Link className="button subtle" to={item.link_url} onClick={() => markRead(item)}>
                    <ExternalLink size={15} aria-hidden="true" />
                    보기
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
