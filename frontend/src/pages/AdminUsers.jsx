import { FileText, Image, ShieldCheck, ShieldX, UserCog, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { assetUrl, apiRequest } from '../api/client.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  const loadUsers = () => {
    apiRequest('/admin/users').then((data) => setUsers(data.users));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateApproval = async (id, approval_status) => {
    setMessage('');
    try {
      await apiRequest(`/admin/users/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ approval_status })
      });
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const updateRole = async (id, role) => {
    setMessage('');
    try {
      await apiRequest(`/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>회원 승인 관리</h1>
        </div>
      </section>

      {message && <p className="error">{message}</p>}

      <div className="table-list">
        {users.map((user) => {
          const facePhotoUrl = assetUrl(user.face_photo_path);
          const attachments = user.attachments || [];

          return (
            <article className="admin-user-card" key={user.id}>
              <div className="admin-user-main">
                <div className="admin-user-photo">
                  {facePhotoUrl ? (
                    <img src={facePhotoUrl} alt={`${user.name} 얼굴 사진`} />
                  ) : (
                    <UserRound size={42} aria-hidden="true" />
                  )}
                </div>
                <div className="admin-user-summary">
                  <div>
                    <span className={`status-pill ${user.approval_status}`}>{user.approval_status}</span>
                    <span className="status-pill role">{user.role}</span>
                  </div>
                  <h2>{user.name}</h2>
                  <p>{user.username} · {user.email}</p>
                </div>
              </div>

              <div className="admin-user-files">
                <strong>
                  <Image size={16} aria-hidden="true" />
                  얼굴 사진
                </strong>
                {facePhotoUrl ? (
                  <a href={facePhotoUrl} target="_blank" rel="noreferrer">원본 보기</a>
                ) : (
                  <span>첨부 없음</span>
                )}

                <strong>
                  <FileText size={16} aria-hidden="true" />
                  추가 첨부파일
                </strong>
                {attachments.length > 0 ? (
                  <div className="attachment-links">
                    {attachments.map((file) => (
                      <a href={assetUrl(file.file_path)} target="_blank" rel="noreferrer" key={file.id}>
                        {file.file_name}
                      </a>
                    ))}
                  </div>
                ) : (
                  <span>첨부 없음</span>
                )}
              </div>

              <div className="row-actions">
                <button className="button compact" type="button" onClick={() => updateApproval(user.id, 'approved')}>
                  <ShieldCheck size={16} aria-hidden="true" />
                  승인
                </button>
                <button className="button subtle" type="button" onClick={() => updateApproval(user.id, 'rejected')}>
                  <ShieldX size={16} aria-hidden="true" />
                  거절
                </button>
                <button
                  className="button subtle"
                  type="button"
                  onClick={() => updateRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                >
                  <UserCog size={16} aria-hidden="true" />
                  {user.role === 'admin' ? '사용자로 변경' : '관리자로 변경'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
