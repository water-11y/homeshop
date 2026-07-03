import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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
          {message && <p className="error">{message}</p>}
          <button className="button primary full" disabled={submitting} type="submit">
            <LogIn size={18} aria-hidden="true" />
            {submitting ? '확인 중...' : '로그인'}
          </button>
        </form>
        <p className="form-footnote">
          계정이 없나요? <Link to="/register">회원가입</Link>
        </p>
      </section>
    </main>
  );
}
