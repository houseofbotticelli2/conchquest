import { useEffect, useState } from 'react';
import { getMemberDetail, type MemberDetail as MemberDetailData } from '../lib/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function rarityPillClass(rarity: string | null): string {
  if (rarity === 'rare' || rarity === 'very_rare') return 'pill pill-critical';
  if (rarity === 'uncommon') return 'pill pill-warn';
  return 'pill pill-good';
}

export function MemberDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<MemberDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getMemberDetail(id)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load member'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 14 }}>
        ← Back to Members
      </button>

      {error && <div className="error-note">{error}</div>}
      {loading && <div className="empty-note">Loading...</div>}

      {!loading && data && (
        <>
          <div className="topbar">
            <div>
              <h1>
                {data.profile.displayName || '(no name)'} {data.profile.role === 'admin' && <span className="badge-admin">Admin</span>}
              </h1>
              <div className="desc">
                {data.profile.email} &middot; Member since {formatDate(data.profile.createdAt)} &middot; Last active {formatDateTime(data.profile.lastActiveAt)}
                {data.profile.shellingSinceYear ? ` · Shelling since ${data.profile.shellingSinceYear}` : ''}
              </div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-label">Shells logged</div>
              <div className="stat-value">{data.stats.findsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Rare finds</div>
              <div className="stat-value">{data.stats.rareFindsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Species</div>
              <div className="stat-value">{data.stats.speciesCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Saved beaches</div>
              <div className="stat-value">{data.stats.beachesCount}</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Saved beaches</h2>
            </div>
            {data.beaches.length === 0 ? (
              <div className="empty-note">No saved beaches.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>City</th>
                      <th>Alert</th>
                      <th>Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.beaches.map((b) => (
                      <tr key={b.id}>
                        <td className="name">
                          {b.name} {b.isHome && <span className="badge-admin">Home</span>}
                        </td>
                        <td>{b.city || '—'}</td>
                        <td>{b.alertThresholdScore != null ? `${b.alertThresholdScore}+` : '—'}</td>
                        <td className="mono">{formatDate(b.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Recent finds</h2>
                <div className="sub">Most recent {Math.min(data.finds.length, 100)} of {data.stats.findsCount}</div>
              </div>
            </div>
            {data.finds.length === 0 ? (
              <div className="empty-note">No finds logged.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {data.finds.map((f, i) => (
                  <li
                    key={f.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 18px',
                      borderBottom: i < data.finds.length - 1 ? '1px solid var(--border-soft)' : 'none',
                      alignItems: 'center',
                    }}
                  >
                    {f.photoUrl ? (
                      <img src={f.photoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--surface-alt)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13 }}>{f.speciesName || 'Unidentified shell'}</span>
                        {f.rarity && <span className={rarityPillClass(f.rarity)}>{f.rarity.replace('_', ' ')}</span>}
                        {f.isPrivate && <span className="pill pill-warn">Private</span>}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {formatDate(f.foundAt)}
                        {f.condition ? ` · ${f.condition}` : ''}
                        {f.notes ? ` · ${f.notes}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
