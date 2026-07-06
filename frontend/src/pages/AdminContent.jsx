import { BellRing, FileText, HelpCircle, Megaphone, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';

const emptyNotice = { title: '', content: '', is_published: true };
const emptyFaq = { category: 'general', question: '', answer: '', sort_order: 0, is_published: true };

export default function AdminContent() {
  const [notices, setNotices] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [noticeForm, setNoticeForm] = useState(emptyNotice);
  const [faqForm, setFaqForm] = useState(emptyFaq);
  const [legalSlug, setLegalSlug] = useState('terms');
  const [legalForm, setLegalForm] = useState({ title: '', content: '' });
  const [broadcast, setBroadcast] = useState({ title: '', message: '', link_url: '/notifications' });
  const [message, setMessage] = useState('');

  const loadContent = async () => {
    const [noticeData, faqData, legalData] = await Promise.all([
      apiRequest('/admin/notices'),
      apiRequest('/admin/faqs'),
      apiRequest(`/shop/legal/${legalSlug}`)
    ]);
    setNotices(noticeData.notices || []);
    setFaqs(faqData.faqs || []);
    setLegalForm({ title: legalData.page.title, content: legalData.page.content });
  };

  useEffect(() => {
    loadContent().catch((err) => setMessage(err.message));
  }, [legalSlug]);

  const saveNotice = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await apiRequest('/admin/notices', { method: 'POST', body: JSON.stringify(noticeForm) });
      setNoticeForm(emptyNotice);
      await loadContent();
      setMessage('공지사항이 등록되었습니다.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const saveFaq = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await apiRequest('/admin/faqs', { method: 'POST', body: JSON.stringify(faqForm) });
      setFaqForm(emptyFaq);
      await loadContent();
      setMessage('FAQ가 등록되었습니다.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const saveLegal = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      await apiRequest(`/admin/legal/${legalSlug}`, { method: 'PUT', body: JSON.stringify(legalForm) });
      setMessage('문서가 저장되었습니다.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const sendBroadcast = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const data = await apiRequest('/admin/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify(broadcast)
      });
      setBroadcast({ title: '', message: '', link_url: '/notifications' });
      setMessage(`${data.sent_count || 0}명에게 알림을 발송했습니다.`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const isSuccess = /등록|저장|발송/.test(message);

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>운영 콘텐츠 관리</h1>
        </div>
      </section>

      {message && <p className={isSuccess ? 'success' : 'error'}>{message}</p>}

      <section className="admin-analytics-layout">
        <form className="analytics-panel content-form" onSubmit={saveNotice}>
          <div className="panel-head">
            <h2><Megaphone size={20} aria-hidden="true" /> 공지사항</h2>
          </div>
          <input value={noticeForm.title} onChange={(event) => setNoticeForm((current) => ({ ...current, title: event.target.value }))} placeholder="공지 제목" required />
          <textarea value={noticeForm.content} onChange={(event) => setNoticeForm((current) => ({ ...current, content: event.target.value }))} placeholder="공지 내용" required />
          <label className="checkbox-row"><input type="checkbox" checked={noticeForm.is_published} onChange={(event) => setNoticeForm((current) => ({ ...current, is_published: event.target.checked }))} /> 공개</label>
          <button className="button primary" type="submit"><Save size={18} aria-hidden="true" /> 공지 등록</button>
        </form>

        <form className="analytics-panel content-form" onSubmit={saveFaq}>
          <div className="panel-head">
            <h2><HelpCircle size={20} aria-hidden="true" /> FAQ</h2>
          </div>
          <input value={faqForm.category} onChange={(event) => setFaqForm((current) => ({ ...current, category: event.target.value }))} placeholder="카테고리" required />
          <input value={faqForm.question} onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))} placeholder="질문" required />
          <textarea value={faqForm.answer} onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))} placeholder="답변" required />
          <button className="button primary" type="submit"><Save size={18} aria-hidden="true" /> FAQ 등록</button>
        </form>

        <form className="analytics-panel content-form" onSubmit={sendBroadcast}>
          <div className="panel-head">
            <h2><BellRing size={20} aria-hidden="true" /> 전체 알림</h2>
          </div>
          <input value={broadcast.title} onChange={(event) => setBroadcast((current) => ({ ...current, title: event.target.value }))} placeholder="알림 제목" required />
          <textarea value={broadcast.message} onChange={(event) => setBroadcast((current) => ({ ...current, message: event.target.value }))} placeholder="알림 내용" required />
          <input value={broadcast.link_url} onChange={(event) => setBroadcast((current) => ({ ...current, link_url: event.target.value }))} placeholder="연결 경로" />
          <button className="button primary" type="submit"><BellRing size={18} aria-hidden="true" /> 알림 발송</button>
        </form>
      </section>

      <section className="analytics-panel">
        <div className="panel-head">
          <h2><FileText size={20} aria-hidden="true" /> 약관 / 개인정보 문서</h2>
          <select value={legalSlug} onChange={(event) => setLegalSlug(event.target.value)}>
            <option value="terms">이용약관</option>
            <option value="privacy">개인정보처리방침</option>
          </select>
        </div>
        <form className="content-form" onSubmit={saveLegal}>
          <input value={legalForm.title} onChange={(event) => setLegalForm((current) => ({ ...current, title: event.target.value }))} placeholder="문서 제목" required />
          <textarea value={legalForm.content} onChange={(event) => setLegalForm((current) => ({ ...current, content: event.target.value }))} placeholder="문서 내용" required />
          <button className="button primary" type="submit"><Save size={18} aria-hidden="true" /> 문서 저장</button>
        </form>
      </section>

      <section className="admin-analytics-layout">
        <article className="analytics-panel">
          <h2>최근 공지</h2>
          <div className="rank-list">
            {notices.slice(0, 5).map((notice) => (
              <div className="rank-row static" key={notice.id}>
                <b>{notice.id}</b>
                <span><strong>{notice.title}</strong><small>{notice.is_published ? '공개' : '비공개'}</small></span>
              </div>
            ))}
          </div>
        </article>
        <article className="analytics-panel wide">
          <h2>FAQ 목록</h2>
          <div className="rank-list">
            {faqs.slice(0, 6).map((faq) => (
              <div className="rank-row static" key={faq.id}>
                <b>{faq.sort_order || faq.id}</b>
                <span><strong>{faq.question}</strong><small>{faq.category}</small></span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
