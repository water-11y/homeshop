import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (form.password !== form.passwordConfirm) {
      setMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    setSubmitting(true);

    try {
      await register({
        username: form.username,
        password: form.password,
        name: form.name,
        email: form.email
      });
      navigate('/login');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page form-page">
      <section className="form-card">
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
