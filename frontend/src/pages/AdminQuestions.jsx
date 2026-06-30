import { Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client.js';

export default function AdminQuestions() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [message, setMessage] = useState('');

  const loadQuestions = () => {
    apiRequest('/admin/questions').then((data) => {
      setQuestions(data.questions);
      setAnswers(Object.fromEntries(data.questions.map((item) => [item.id, item.answer || ''])));
    });
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const saveAnswer = async (questionId) => {
    setMessage('');
    try {
      await apiRequest(`/admin/questions/${questionId}/answer`, {
        method: 'PATCH',
        body: JSON.stringify({ answer: answers[questionId] })
      });
      setMessage('Answer saved.');
      loadQuestions();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>Product Questions</h1>
        </div>
      </section>

      {message && <p className={message.includes('saved') ? 'success' : 'error'}>{message}</p>}

      <div className="table-list">
        {questions.map((item) => (
          <article className="question-admin-row" key={item.id}>
            <div>
              <span className="category">{item.answer ? 'Answered' : 'Waiting'}</span>
              <h2>{item.product_name}</h2>
              <p>{item.question}</p>
              <small>{item.name} - {new Date(item.created_at).toLocaleString('ko-KR')}</small>
            </div>
            <textarea
              value={answers[item.id] || ''}
              onChange={(event) => setAnswers((current) => ({ ...current, [item.id]: event.target.value }))}
              placeholder="Write an answer."
            />
            <div className="row-actions">
              <button className="button primary" type="button" onClick={() => saveAnswer(item.id)}>
                <Send size={18} aria-hidden="true" />
                Save
              </button>
              <Link className="button subtle" to={`/products/${item.product_id}`}>View Product</Link>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
