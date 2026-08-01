import { useEffect, useState } from 'react';
import { getDashboardStats, type DashboardStats } from '../lib/api';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load stats'));
  }, []);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="desc">How Conchquest is doing right now, at a glance.</div>
        </div>
      </div>

      {error && <div className="error-note">{error}</div>}

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">Members</div>
          <div className="stat-value">{stats ? stats.memberCount.toLocaleString() : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Finds logged</div>
          <div className="stat-value">{stats ? stats.findsCount.toLocaleString() : '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Saved beaches</div>
          <div className="stat-value">{stats ? stats.beachesCount.toLocaleString() : '—'}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>More to come</h2>
            <div className="sub">Content moderation, species library, config, service health, and the leaderboard are next.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
