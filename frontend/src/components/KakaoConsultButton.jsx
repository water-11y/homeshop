import { MessageCircle } from 'lucide-react';
import { useState } from 'react';

const kakaoOpenChatUrl = import.meta.env.VITE_KAKAO_OPENCHAT_URL;

export default function KakaoConsultButton({ variant = 'inline', label = '카카오톡 상담하기' }) {
  const [notice, setNotice] = useState('');
  const isFloating = variant === 'floating';

  const openKakaoConsult = () => {
    setNotice('');

    if (!kakaoOpenChatUrl) {
      setNotice('카카오톡 오픈채팅 URL이 아직 설정되지 않았습니다.');
      return;
    }

    window.open(kakaoOpenChatUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={isFloating ? 'kakao-consult-wrap floating' : 'kakao-consult-wrap'}>
      <button
        className={isFloating ? 'kakao-floating-consult' : 'button kakao-consult'}
        type="button"
        onClick={openKakaoConsult}
      >
        <MessageCircle size={isFloating ? 20 : 18} aria-hidden="true" />
        <span>{label}</span>
      </button>
      {notice && <p className="kakao-consult-notice">{notice}</p>}
    </div>
  );
}
