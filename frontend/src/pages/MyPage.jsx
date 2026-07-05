import { Bell, LogOut, Mail, MapPin, PackageCheck, Shield, Store, User, UserCog } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { assetUrl } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function MyPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const joinedAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-';
  const facePhotoUrl = assetUrl(user?.face_photo_path);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <main className="page">
      <section className="profile profile-enhanced">
        <div className="profile-hero">
          <div className="profile-photo-card">
            {facePhotoUrl ? (
              <img src={facePhotoUrl} alt={`${user.name} 얼굴 사진`} />
            ) : (
              <User size={54} aria-hidden="true" />
            )}
          </div>
          <div className="profile-title">
            <p className="eyebrow">My Page</p>
            <h1>{user.name}</h1>
            <p>{user.approval_status === 'approved' ? '승인 완료 회원' : '승인 대기 회원'}</p>
          </div>
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

        <div className="quick-actions-grid">
          <Link className="quick-action-card" to="/profile/edit">
            <UserCog size={22} aria-hidden="true" />
            <strong>개인정보 수정</strong>
            <span>이름, 이메일, 비밀번호 변경</span>
          </Link>
          <Link className="quick-action-card" to="/orders">
            <PackageCheck size={22} aria-hidden="true" />
            <strong>주문내역</strong>
            <span>결제/배송 현황 확인</span>
          </Link>
          <Link className="quick-action-card" to="/addresses">
            <MapPin size={22} aria-hidden="true" />
            <strong>배송지 관리</strong>
            <span>현재 위치와 주소 저장</span>
          </Link>
          <Link className="quick-action-card" to="/notifications">
            <Bell size={22} aria-hidden="true" />
            <strong>알림함</strong>
            <span>주문/배송 알림 확인</span>
          </Link>
          <Link className="quick-action-card" to="/products">
            <Store size={22} aria-hidden="true" />
            <strong>쇼핑 계속하기</strong>
            <span>상품 목록으로 이동</span>
          </Link>
        </div>

        <div className="actions">
          <button className="button danger" type="button" onClick={handleLogout}>
            <LogOut size={18} aria-hidden="true" />
            로그아웃
          </button>
        </div>
      </section>
    </main>
  );
}
