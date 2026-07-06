import { ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';

export default function AdminActivityLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    apiRequest('/admin/activity-logs').then((data) => setLogs(data.logs || []));
  }, []);

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>관리자 활동 로그</h1>
        </div>
      </section>

      <section className="analytics-panel">
        <div className="panel-head">
          <h2><ClipboardList size={20} aria-hidden="true" /> 최근 작업</h2>
        </div>
        <div className="recent-order-list">
          {logs.length === 0 ? (
            <p className="muted">관리자 활동 로그가 없습니다.</p>
          ) : (
            logs.map((log) => (
              <article className="recent-order-row static" key={log.id}>
                <span>
                  <strong>{log.action}</strong>
                  <small>{log.admin_name || log.admin_username || 'system'} · {new Date(log.created_at).toLocaleString('ko-KR')}</small>
                </span>
                <b>{log.target_type || '-'}</b>
                <em>{log.detail || '-'}</em>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
