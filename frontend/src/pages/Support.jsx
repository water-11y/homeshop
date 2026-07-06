import { HelpCircle, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import KakaoConsultButton from '../components/KakaoConsultButton.jsx';

export default function Support() {
  const [notices, setNotices] = useState([]);
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    Promise.all([
      apiRequest('/shop/notices'),
      apiRequest('/shop/faqs')
    ]).then(([noticeData, faqData]) => {
      setNotices(noticeData.notices || []);
      setFaqs(faqData.faqs || []);
    });
  }, []);

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Support</p>
          <h1>고객센터</h1>
        </div>
        <KakaoConsultButton label="카카오톡 상담하기" />
      </section>

      <section className="admin-analytics-layout">
        <article className="analytics-panel">
          <div className="panel-head">
            <h2><Megaphone size={20} aria-hidden="true" /> 공지사항</h2>
          </div>
          <div className="rank-list">
            {notices.length === 0 ? (
              <p className="muted">등록된 공지사항이 없습니다.</p>
            ) : (
              notices.map((notice) => (
                <article className="support-post" key={notice.id}>
                  <strong>{notice.title}</strong>
                  <p>{notice.content}</p>
                  <small>{new Date(notice.created_at).toLocaleDateString('ko-KR')}</small>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="analytics-panel wide">
          <div className="panel-head">
            <h2><HelpCircle size={20} aria-hidden="true" /> 자주 묻는 질문</h2>
          </div>
          <div className="faq-list">
            {faqs.length === 0 ? (
              <p className="muted">등록된 FAQ가 없습니다.</p>
            ) : (
              faqs.map((faq) => (
                <details className="faq-item" key={faq.id}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="notice-band">
        <span>
          서비스 문서:
          {' '}<Link to="/legal/terms">이용약관</Link>
          {' · '}
          <Link to="/legal/privacy">개인정보처리방침</Link>
        </span>
      </section>
    </main>
  );
}
