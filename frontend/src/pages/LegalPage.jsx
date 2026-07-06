import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client.js';

export default function LegalPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPage(null);
    setMessage('');
    apiRequest(`/shop/legal/${slug}`)
      .then((data) => setPage(data.page))
      .catch((err) => setMessage(err.message));
  }, [slug]);

  if (message) {
    return <main className="page"><p className="error">{message}</p></main>;
  }

  if (!page) {
    return <main className="page"><p className="muted">문서를 불러오는 중입니다...</p></main>;
  }

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Policy</p>
          <h1>{page.title}</h1>
        </div>
        <Link className="button subtle" to="/support">고객센터</Link>
      </section>

      <article className="analytics-panel legal-document">
        <FileText size={24} aria-hidden="true" />
        <p>{page.content}</p>
        <small>마지막 수정: {new Date(page.updated_at).toLocaleString('ko-KR')}</small>
      </article>
    </main>
  );
}
