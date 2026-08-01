import { useEffect, useMemo, useState } from 'react';
import { listUsers, deleteUser, type AdminUser } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';
import { MemberDetail } from './MemberDetail';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function Members() {
  const { state } = useAuth();
  const selfId = state.status === 'ready' ? state.me.id : null;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    setError(null);
    listUsers()
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load members'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(query) || (u.displayName ?? '').toLowerCase().includes(query)
    );
  }, [users, search]);

  if (viewingId) {
    return <MemberDetail id={viewingId} onBack={() => setViewingId(null)} />;
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Members</h1>
          <div className="desc">{users.length} accounts. Deleting a member permanently removes their finds, photos, saved beaches, and login.</div>
        </div>
      </div>

      {error && <div className="error-note">{error}</div>}

      <div className="panel">
        <div className="search-row">
          <input className="search-input" type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="empty-note">Loading...</div>
          ) : visible.length === 0 ? (
            <div className="empty-note">No members match this search.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Finds</th>
                  <th>Beaches</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.id}>
                    <td className="name">
                      {u.displayName || '(no name)'}
                      {u.role === 'admin' && <span className="badge-admin">Admin</span>}
                    </td>
                    <td className="mono">{u.email}</td>
                    <td className="mono">{formatDate(u.createdAt)}</td>
                    <td className="num">{u.findsCount}</td>
                    <td className="num">{u.beachesCount}</td>
                    <td className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewingId(u.id)}>
                        View
                      </button>
                      {u.id === selfId ? (
                        <span className="self-label">You</span>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => setTarget(u)}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {target && (
        <DeleteUserModal
          user={target}
          onClose={() => setTarget(null)}
          onDeleted={() => {
            setTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function DeleteUserModal({ user, onClose, onDeleted }: { user: AdminUser; onClose: () => void; onDeleted: () => void }) {
  const phrase = `delete ${user.email}`;
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = input.trim() === phrase;

  async function handleConfirm() {
    if (!matches) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteUser(user.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete member');
      setSubmitting(false);
    }
  }

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
        <div className="modal-head">
          <h3 id="deleteTitle">Delete {user.displayName || user.email}?</h3>
        </div>
        <div className="modal-body">
          <div className="modal-warn">
            This permanently deletes, immediately and with no undo:
            <ul>
              <li>{user.findsCount} logged finds, including photos</li>
              <li>{user.beachesCount} saved beaches and alert settings</li>
              <li>Their profile, avatar, and push notification token</li>
              <li>Their login (Supabase Auth account)</li>
            </ul>
          </div>
          <div className="confirm-label">
            To confirm, type <span className="confirm-phrase">{phrase}</span> below:
          </div>
          <input
            className={`form-input ${matches ? 'match' : ''}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          {error && <div className="modal-error">{error}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleConfirm} disabled={!matches || submitting}>
            {submitting ? 'Deleting...' : 'Permanently delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
