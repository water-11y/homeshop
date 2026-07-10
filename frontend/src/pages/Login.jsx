import { Download, KeyRound, LogIn, Search, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyFindForm = { name: '', email: '' };
const emptyResetForm = { name: '', email: '', username: '' };

const isStandaloneApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', remember: true });
  const [activePanel, setActivePanel] = useState('');
  const [findForm, setFindForm] = useState(emptyFindForm);
  const [resetForm, setResetForm] = useState(emptyResetForm);
  const [foundUsername, setFoundUsername] = useState('');
  const [resetResult, setResetResult] = useState(null);
  const [message, setMessage] = useState('');
  const [panelMessage, setPanelMessage] = useState('');
  const [installMessage, setInstallMessage] = useState('');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(() => isStandaloneApp());
  const [submitting, setSubmitting] = useState(false);
  const [panelSubmitting, setPanelSubmitting] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      setInstallMessage('');
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsAppInstalled(true);
      setInstallMessage('앱 설치가 완료되었습니다.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);

    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPanel = (panel) => {
    setActivePanel(panel);
    setPanelMessage('');
    setFoundUsername('');
    setResetResult(null);
  };

  const goBackToLogin = () => {
    setActivePanel('');
    setPanelMessage('');
  };

  const handleInstallClick = async () => {
    setInstallMessage('');

    if (isAppInstalled) {
      setInstallMessage('이미 앱으로 설치되어 있습니다.');
      return;
    }

    if (!installPrompt) {
      setInstallMessage('현재 브라우저에서는 메뉴에서 홈 화면에 추가를 선택해 설치할 수 있습니다.');
      return;
    }

    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === 'accepted') {
      setInstallMessage('앱 설치를 시작했습니다.');
    }
  };

  const handleFindUsername = async (event) => {
    event.preventDefault();
    setPanelMessage('');
    setPanelSubmitting(true);

    try {
      const data = await apiRequest('/auth/find-username', {
        method: 'POST',
        body: JSON.stringify(findForm)
      });
      setFoundUsername(data.username);
      setPanelMessage(data.message);
    } catch (err) {
      setPanelMessage(err.message);
    } finally {
      setPanelSubmitting(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();
    setPanelMessage('');
    setPanelSubmitting(true);

    try {
      const data = await apiRequest('/auth/password-reset', {
        method: 'POST',
        body: JSON.stringify(resetForm)
      });
      setResetResult(data);
      setPanelMessage(data.message);
    } catch (err) {
      setPanelMessage(err.message);
    } finally {
      setPanelSubmitting(false);
    }
  };

  return (
    <main className="page form-page">
      <section className="form-card auth-card">
        <p className="eyebrow dark">HomeShop</p>
        <h1>로그인</h1>
        <form onSubmit={handleSubmit}>
          <label>
            아이디
            <input name="username" value={form.username} onChange={handleChange} autoComplete="username" required />
          </label>
          <label>
            비밀번호
            <input name="password" type="password" value={form.password} onChange={handleChange} autoComplete="current-password" required />
          </label>
          <label className="checkbox-row auto-login-row">
            <input
              type="checkbox"
              name="remember"
              checked={form.remember}
              onChange={handleChange}
            />
            자동 로그인 유지
          </label>
          {message && <p className="error">{message}</p>}
          <button className="button primary full" disabled={submitting} type="submit">
            <LogIn size={18} aria-hidden="true" />
            {submitting ? '확인 중...' : '로그인'}
          </button>
          <button
            className="button subtle full pwa-install-button"
            disabled={isAppInstalled}
            type="button"
            onClick={handleInstallClick}
          >
            <Download size={18} aria-hidden="true" />
            {isAppInstalled ? '앱 설치됨' : '앱 다운로드'}
          </button>
          {installMessage && <p className="app-install-note">{installMessage}</p>}
        </form>

        <div className="auth-helper-actions">
          <button className="link-button" type="button" onClick={() => openPanel('findId')}>
            <Search size={16} aria-hidden="true" />
            아이디 찾기
          </button>
          <button className="link-button" type="button" onClick={() => openPanel('resetPassword')}>
            <KeyRound size={16} aria-hidden="true" />
            비밀번호 찾기
          </button>
        </div>

        {activePanel === 'findId' && (
          <section className="auth-recovery-panel">
            <div className="mini-section-head">
              <span><UserRound size={16} aria-hidden="true" /> 아이디 찾기</span>
            </div>
            <form onSubmit={handleFindUsername}>
              <label>
                이름
                <input
                  value={findForm.name}
                  onChange={(event) => setFindForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                이메일
                <input
                  type="email"
                  value={findForm.email}
                  onChange={(event) => setFindForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              {panelMessage && <p className={foundUsername ? 'success' : 'error'}>{panelMessage}</p>}
              {foundUsername && (
                <p className="found-account">아이디: <strong>{foundUsername}</strong></p>
              )}
              <button className="button primary full" disabled={panelSubmitting} type="submit">
                {panelSubmitting ? '확인 중...' : '아이디 확인'}
              </button>
              <button className="button subtle full" type="button" onClick={goBackToLogin}>
                로그인으로 돌아가기
              </button>
            </form>
          </section>
        )}

        {activePanel === 'resetPassword' && (
          <section className="auth-recovery-panel">
            <div className="mini-section-head">
              <span><KeyRound size={16} aria-hidden="true" /> 비밀번호 찾기</span>
            </div>
            <form onSubmit={handlePasswordReset}>
              <label>
                이름
                <input
                  value={resetForm.name}
                  onChange={(event) => setResetForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                이메일
                <input
                  type="email"
                  value={resetForm.email}
                  onChange={(event) => setResetForm((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                아이디
                <input
                  value={resetForm.username}
                  onChange={(event) => setResetForm((current) => ({ ...current, username: event.target.value }))}
                  required
                />
              </label>
              {panelMessage && <p className={resetResult ? 'success' : 'error'}>{panelMessage}</p>}
              {resetResult?.temporary_password && (
                <p className="found-account">개발용 임시 비밀번호: <strong>{resetResult.temporary_password}</strong></p>
              )}
              <button className="button primary full" disabled={panelSubmitting} type="submit">
                {panelSubmitting ? '발송 중...' : '임시 비밀번호 발송'}
              </button>
              <button className="button subtle full" type="button" onClick={goBackToLogin}>
                로그인으로 돌아가기
              </button>
            </form>
          </section>
        )}

        <p className="form-footnote">
          계정이 없나요? <Link to="/register">회원가입</Link>
        </p>
      </section>
    </main>
  );
}
