import { useEffect, useState } from 'react';
import { listAuditLog, type AuditLogEntry } from '../lib/api';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAuditLog()
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Audit Log</h1>
          <div className="desc">Every admin action that changes data or configuration, newest first.</div>
        </div>
      </div>

      {error && <div className="error-note">{error}</div>}

      <div className="panel">
        <div className="table-wrap">
          {loading ? (
            <div className="empty-note">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="empty-note">No admin actions recorded yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="mono">{formatDateTime(e.createdAt)}</td>
                    <td>{e.adminEmail}</td>
                    <td>{e.action}</td>
                    <td className="mono">{e.target ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
