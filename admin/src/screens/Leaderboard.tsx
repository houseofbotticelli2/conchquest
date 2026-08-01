import { useEffect, useState } from 'react';
import { listLeaderboard, type LeaderboardEntry } from '../lib/api';

function initialsFrom(text: string): string {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function nameOf(entry: LeaderboardEntry): string {
  return entry.displayName || entry.email;
}

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listLeaderboard()
      .then(setEntries)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, []);

  const [first, second, third, ...rest] = entries;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Leaderboard 🐚</h1>
          <div className="desc">Just for fun -- ranked by total shells logged.</div>
        </div>
      </div>

      {error && <div className="error-note">{error}</div>}
      {loading && <div className="empty-note">Loading...</div>}

      {!loading && entries.length === 0 && <div className="empty-note">No finds logged yet.</div>}

      {!loading && entries.length > 0 && (
        <>
          {first && (
            <div className="podium">
              <PodiumCard entry={second} rank={2} medal="🥈 2nd" />
              <PodiumCard entry={first} rank={1} medal="🏆 Champion" />
              <PodiumCard entry={third} rank={3} medal="🥉 3rd" />
            </div>
          )}

          {rest.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <h2>Full ranking</h2>
              </div>
              <div className="lb-head">
                <span>Rank</span>
                <span></span>
                <span>Shells</span>
                <span>Rare</span>
                <span>Species</span>
              </div>
              {rest.map((entry, i) => (
                <div key={entry.id} className="lb-row">
                  <span className="lb-rank">{i + 4}</span>
                  <span>
                    <span className="lb-name">{nameOf(entry)}</span>
                    <br />
                    <span className="lb-beach">{entry.homeBeachName || '—'}</span>
                  </span>
                  <span className="lb-stat">
                    <b>{entry.findsCount}</b>
                  </span>
                  <span className="lb-stat">{entry.rareFindsCount}</span>
                  <span className="lb-stat">{entry.speciesCount}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PodiumCard({ entry, rank, medal }: { entry: LeaderboardEntry | undefined; rank: 1 | 2 | 3; medal: string }) {
  if (!entry) return <div />;
  return (
    <div className={`podium-card rank-${rank}`}>
      <div className="podium-medal">{medal}</div>
      <div className="podium-avatar">{initialsFrom(nameOf(entry))}</div>
      <div className="podium-name">{nameOf(entry)}</div>
      <div className="podium-count">{entry.findsCount}</div>
      <div className="podium-label">Shells logged</div>
    </div>
  );
}
