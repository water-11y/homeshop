import { Camera, Check, FileUp, ShieldCheck, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const attachmentAccept = 'image/*,.pdf,.doc,.docx,.hwp,.hwpx,.txt';

const agreementItems = [
  {
    key: 'terms',
    required: true,
    title: '이용약관 동의',
    description: '서비스 이용, 주문 처리, 회원 관리, 부정 이용 방지에 필요한 기본 약관입니다.'
  },
  {
    key: 'privacy',
    required: true,
    title: '개인정보 수집 및 이용 동의',
    description: '아이디, 이름, 이메일, 얼굴 사진, 첨부파일 등 회원 확인과 서비스 제공에 필요한 정보를 수집합니다.'
  },
  {
    key: 'emailMarketing',
    required: false,
    title: '이메일 혜택/이벤트 수신 동의',
    description: '할인 쿠폰, 이벤트, 쇼핑 혜택 안내를 이메일로 받을 수 있습니다.'
  },
  {
    key: 'snsMarketing',
    required: false,
    title: 'SMS/SNS 혜택/이벤트 수신 동의',
    description: '주요 혜택과 알림성 이벤트 안내를 문자 또는 SNS 채널로 받을 수 있습니다.'
  }
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    passwordConfirm: '',
    name: '',
    email: ''
  });
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    emailMarketing: false,
    snsMarketing: false
  });
  const [facePhoto, setFacePhoto] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const setAgreement = (key, checked) => {
    setAgreements((current) => ({ ...current, [key]: checked }));
  };

  const setAllAgreements = (checked) => {
    setAgreements({
      terms: checked,
      privacy: checked,
      emailMarketing: checked,
      snsMarketing: checked
    });
  };

  const setRequiredAgreements = () => {
    setAgreements((current) => ({
      ...current,
      terms: true,
      privacy: true
    }));
  };

  const handleFacePhotoChange = (event) => {
    setFacePhoto(event.target.files?.[0] || null);
  };

  const handleAttachmentsChange = (event) => {
    setAttachments(Array.from(event.target.files || []));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (form.password !== form.passwordConfirm) {
      setMessage('비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    if (!facePhoto) {
      setMessage('얼굴 사진 1장을 첨부해주세요.');
      return;
    }

    if (!agreements.terms || !agreements.privacy) {
      setMessage('필수 약관과 개인정보 수집 및 이용에 동의해주세요.');
      return;
    }

    const payload = new FormData();
    payload.append('username', form.username);
    payload.append('password', form.password);
    payload.append('name', form.name);
    payload.append('email', form.email);
    payload.append('terms_agreed', String(agreements.terms));
    payload.append('privacy_agreed', String(agreements.privacy));
    payload.append('email_marketing_consent', String(agreements.emailMarketing));
    payload.append('sns_marketing_consent', String(agreements.snsMarketing));
    payload.append('facePhoto', facePhoto);
    attachments.forEach((file) => payload.append('attachments', file));

    setSubmitting(true);

    try {
      await register(payload);
      navigate('/login');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const allChecked = Object.values(agreements).every(Boolean);
  const requiredChecked = agreements.terms && agreements.privacy;

  return (
    <main className="page form-page">
      <section className="form-card auth-card">
        <p className="eyebrow dark">HomeShop</p>
        <h1>회원가입</h1>
        <form onSubmit={handleSubmit}>
          <label>
            아이디
            <input name="username" value={form.username} onChange={handleChange} autoComplete="username" required />
          </label>
          <label>
            이름
            <input name="name" value={form.name} onChange={handleChange} autoComplete="name" required />
          </label>
          <label>
            이메일
            <input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" required />
          </label>
          <label>
            비밀번호
            <input name="password" type="password" minLength="8" value={form.password} onChange={handleChange} autoComplete="new-password" required />
          </label>
          <label>
            비밀번호 확인
            <input name="passwordConfirm" type="password" minLength="8" value={form.passwordConfirm} onChange={handleChange} autoComplete="new-password" required />
          </label>

          <label className="upload-field">
            <span>
              <Camera size={17} aria-hidden="true" />
              얼굴 사진 1장
            </span>
            <input name="facePhoto" type="file" accept="image/*" capture="user" onChange={handleFacePhotoChange} required />
            <small>모바일 앱에서는 카메라가 열리고, 웹에서는 이미지 파일을 선택합니다.</small>
          </label>
          {facePhoto && <p className="file-note">선택됨: {facePhoto.name}</p>}

          <label className="upload-field">
            <span>
              <FileUp size={17} aria-hidden="true" />
              추가 첨부파일
            </span>
            <input name="attachments" type="file" accept={attachmentAccept} multiple onChange={handleAttachmentsChange} />
            <small>이미지와 문서를 여러 개 첨부할 수 있습니다.</small>
          </label>
          {attachments.length > 0 && (
            <ul className="file-list">
              {attachments.map((file) => (
                <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
              ))}
            </ul>
          )}

          <section className="terms-box">
            <div className="terms-title">
              <ShieldCheck size={18} aria-hidden="true" />
              <strong>약관 동의</strong>
            </div>
            <div className="terms-actions">
              <button className={allChecked ? 'button primary' : 'button subtle'} type="button" onClick={() => setAllAgreements(!allChecked)}>
                <Check size={17} aria-hidden="true" />
                {allChecked ? '전체 동의 완료' : '전체 동의하기'}
              </button>
              <button className={requiredChecked ? 'button subtle active' : 'button subtle'} type="button" onClick={setRequiredAgreements}>
                필수 동의하기
              </button>
            </div>
            {agreementItems.map((item) => (
              <article className={agreements[item.key] ? 'terms-card agreed' : 'terms-card'} key={item.key}>
                <div>
                  <strong>{item.required ? '[필수]' : '[선택]'} {item.title}</strong>
                  <p>{item.description}</p>
                </div>
                <button
                  className={agreements[item.key] ? 'agreement-button agreed' : 'agreement-button'}
                  type="button"
                  onClick={() => setAgreement(item.key, !agreements[item.key])}
                  aria-pressed={agreements[item.key]}
                >
                  {agreements[item.key] ? '동의 완료' : '동의하기'}
                </button>
              </article>
            ))}
          </section>

          {message && <p className="error">{message}</p>}
          <button className="button primary full" disabled={submitting} type="submit">
            <UserPlus size={18} aria-hidden="true" />
            {submitting ? '처리 중...' : '회원가입'}
          </button>
        </form>
        <p className="form-footnote">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </p>
      </section>
    </main>
  );
}
