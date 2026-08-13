import { useEffect, useState } from 'react';
import { listReports, reviewReport, type ContentReport, type ReportStatus } from '../lib/api';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const REASON_LABELS: Record<string, string> = {
  inappropriate_content: 'Inappropriate photo or content',
  harassment: 'Harassment or abusive language',
  spam: 'Spam',
  other: 'Other',
};

const STATUS_TABS: { value: ReportStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'find_removed', label: 'Find removed' },
];

export function ContentModeration() {
  const [status, setStatus] = useState<ReportStatus>('pending');
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    setError(null);
    listReports(status)
      .then(setReports)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load reports'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [status]);

  async function handleDismiss(report: ContentReport) {
    setActingId(report.id);
    try {
      await reviewReport(report.id, 'dismiss');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to dismiss report');
    } finally {
      setActingId(null);
    }
  }

  async function handleRemoveFind(report: ContentReport) {
    if (!window.confirm('Remove this find? This permanently deletes it and its photo, and cannot be undone.')) return;
    setActingId(report.id);
    try {
      await reviewReport(report.id, 'remove_find');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove find');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Content Moderation</h1>
          <div className="desc">User reports from the community find map. Dismissing keeps the find; removing deletes it permanently.</div>
        </div>
      </div>

      {error && <div className="error-note">{error}</div>}

      <div className="panel">
        <div className="search-row">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={`btn btn-sm ${status === tab.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="empty-note">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="empty-note">No {STATUS_TABS.find((t) => t.value === status)?.label.toLowerCase()} reports.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Reported</th>
                  <th>Reason</th>
                  <th>Find</th>
                  <th>Reported user</th>
                  <th>Reporter</th>
                  {status === 'pending' && <th></th>}
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{formatDateTime(r.createdAt)}</td>
                    <td>
                      {REASON_LABELS[r.reason] ?? r.reason}
                      {r.notes && <div className="desc">{r.notes}</div>}
                    </td>
                    <td>
                      {r.find ? (
                        <>
                          {r.find.speciesName ?? 'Unidentified shell'}
                          {r.find.notes && <div className="desc">{r.find.notes}</div>}
                          {r.find.photoUrl && (
                            <a href={r.find.photoUrl} target="_blank" rel="noreferrer">
                              View photo
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="desc">Find already removed</span>
                      )}
                    </td>
                    <td className="mono">{r.reportedDisplayName || r.reportedEmail}</td>
                    <td className="mono">{r.reporterEmail}</td>
                    {status === 'pending' && (
                      <td className="row-actions">
                        <button className="btn btn-ghost btn-sm" disabled={actingId === r.id} onClick={() => handleDismiss(r)}>
                          Dismiss
                        </button>
                        {r.find && (
                          <button className="btn btn-ghost btn-sm" disabled={actingId === r.id} onClick={() => handleRemoveFind(r)}>
                            Remove find
                          </button>
                        )}
                      </td>
                    )}
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
