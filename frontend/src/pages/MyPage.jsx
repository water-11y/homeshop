import { LogOut, Mail, Shield, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function MyPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const joinedAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <main className="page">
      <section className="profile">
        <div>
          <p className="eyebrow">My Page</p>
          <h1>{user.name}</h1>
        </div>
        <dl className="profile-list">
          <div>
            <dt><User size={18} aria-hidden="true" /> 아이디</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt><Mail size={18} aria-hidden="true" /> 이메일</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt><Shield size={18} aria-hidden="true" /> 권한</dt>
            <dd>{user.role}</dd>
          </div>
          <div>
            <dt>가입일</dt>
            <dd>{joinedAt}</dd>
          </div>
        </dl>
        <div className="actions">
          <Link className="button primary" to="/orders">주문내역 보기</Link>
          <Link className="button subtle" to="/products">쇼핑 계속하기</Link>
          <button className="button danger" type="button" onClick={handleLogout}>
            <LogOut size={18} aria-hidden="true" />
            로그아웃
          </button>
        </div>
      </section>
    </main>
  );
}
