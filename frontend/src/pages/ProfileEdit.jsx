import { Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProfileEdit() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    current_password: '',
    new_password: '',
    new_password_confirm: ''
  });
  const [message, setMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name || '',
      email: user?.email || ''
    }));
  }, [user?.id, user?.name, user?.email]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (form.new_password && form.new_password !== form.new_password_confirm) {
      setMessage('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          current_password: form.current_password,
          new_password: form.new_password
        })
      });
      await refreshUser();
      setMessage('개인정보가 수정되었습니다.');
      setForm((current) => ({
        ...current,
        current_password: '',
        new_password: '',
        new_password_confirm: ''
      }));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setMessage('');

    if (deleteConfirm !== user?.username) {
      setMessage(`탈퇴하려면 아이디 "${user?.username}"를 정확히 입력해주세요.`);
      return;
    }

    setDeleting(true);

    try {
      await apiRequest('/auth/me', { method: 'DELETE' });
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="page">
      <section className="form-card profile-edit-card">
        <p className="eyebrow dark">Profile</p>
        <h1>개인정보 수정</h1>
        <form onSubmit={handleSubmit}>
          <label>
            이름
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            이메일
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </label>
          <div className="password-edit-box">
            <strong><ShieldCheck size={18} aria-hidden="true" /> 비밀번호 변경</strong>
            <p className="muted">비밀번호를 바꾸지 않으려면 아래 칸은 비워두세요.</p>
            <label>
              현재 비밀번호
              <input
                name="current_password"
                type="password"
                value={form.current_password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </label>
            <label>
              새 비밀번호
              <input
                name="new_password"
                type="password"
                value={form.new_password}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </label>
            <label>
              새 비밀번호 확인
              <input
                name="new_password_confirm"
                type="password"
                value={form.new_password_confirm}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </label>
          </div>

          {message && <p className={message.includes('수정') ? 'success' : 'error'}>{message}</p>}
          <button className="button primary full" disabled={submitting} type="submit">
            <Save size={18} aria-hidden="true" />
            {submitting ? '저장 중...' : '수정 저장'}
          </button>
          <button className="button subtle full" type="button" onClick={() => navigate('/mypage')}>
            마이페이지로 돌아가기
          </button>
        </form>

        <section className="danger-zone">
          <div>
            <strong>회원 탈퇴</strong>
            <p>탈퇴하면 계정이 비활성화되고 배송지, 찜, 알림 정보가 삭제됩니다. 주문 기록은 정산 기록 보관을 위해 남습니다.</p>
          </div>
          <label>
            탈퇴 확인 아이디
            <input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={user?.username || '아이디 입력'}
            />
          </label>
          <button className="button danger full" disabled={deleting} type="button" onClick={handleDeleteAccount}>
            <Trash2 size={18} aria-hidden="true" />
            {deleting ? '탈퇴 처리 중...' : '회원 탈퇴'}
          </button>
        </section>
      </section>
    </main>
  );
}
