import { ShieldCheck, ShieldX, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');

  const loadUsers = () => {
    apiRequest('/admin/users').then((data) => setUsers(data.users));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateApproval = async (id, approval_status) => {
    setMessage('');
    try {
      await apiRequest(`/admin/users/${id}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ approval_status })
      });
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const updateRole = async (id, role) => {
    setMessage('');
    try {
      await apiRequest(`/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      });
      loadUsers();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <main className="page">
      <section className="section-head">
        <div>
          <p className="eyebrow dark">Admin</p>
          <h1>User Approval</h1>
        </div>
      </section>

      {message && <p className="error">{message}</p>}

      <div className="table-list">
        {users.map((user) => (
          <article className="order-row admin-user-row" key={user.id}>
            <div>
              <span className="category">{user.approval_status}</span>
              <h2>{user.name} ({user.username})</h2>
              <p>{user.email}</p>
            </div>
            <strong>{user.role}</strong>
            <div className="row-actions">
              <button className="button compact" type="button" onClick={() => updateApproval(user.id, 'approved')}>
                <ShieldCheck size={16} aria-hidden="true" />
                Approve
              </button>
              <button className="button subtle" type="button" onClick={() => updateApproval(user.id, 'rejected')}>
                <ShieldX size={16} aria-hidden="true" />
                Reject
              </button>
              <button
                className="button subtle"
                type="button"
                onClick={() => updateRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
              >
                <UserCog size={16} aria-hidden="true" />
                {user.role === 'admin' ? 'Make User' : 'Make Admin'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
