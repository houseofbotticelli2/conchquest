import { useEffect, useState } from 'react';
import { listConfig, updateConfig, type ConfigEntry } from '../lib/api';

const PROMPT_KEY = 'shelling_strategy_system_prompt';

export function SystemConfig({ onGoToPrompt }: { onGoToPrompt: () => void }) {
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    listConfig()
      .then((rows) => {
        setEntries(rows);
        setDrafts(Object.fromEntries(rows.map((r) => [r.key, String(r.value)])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load config'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleSave(entry: ConfigEntry) {
    const draft = drafts[entry.key] ?? '';
    const isNumber = typeof entry.value === 'number';
    const parsed = isNumber ? Number(draft) : draft;
    if (isNumber && !Number.isFinite(parsed)) {
      setError(`${entry.key} must be a number`);
      return;
    }

    setSaving(entry.key);
    setError(null);
    try {
      await updateConfig(entry.key, parsed);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  }

  const visibleEntries = entries.filter((e) => e.key !== PROMPT_KEY);
  const promptEntry = entries.find((e) => e.key === PROMPT_KEY);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>System Config</h1>
          <div className="desc">
            Values from <span className="mono">app_config</span>, cached for a few minutes on the API before a change takes effect.
          </div>
        </div>
      </div>

      {error && <div className="error-note">{error}</div>}
      {loading && <div className="empty-note">Loading...</div>}

      {!loading && (
        <div className="panel">
          {visibleEntries.map((entry) => (
            <div key={entry.key} className="config-row">
              <div>
                <div className="config-key">{entry.key}</div>
                <div className="config-desc">{entry.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="search-input"
                  style={{ width: 110, textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace" }}
                  value={drafts[entry.key] ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [entry.key]: e.target.value })}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => handleSave(entry)} disabled={saving === entry.key}>
                  {saving === entry.key ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && promptEntry && (
        <div className="panel">
          <div className="config-row" style={{ alignItems: 'center' }}>
            <div>
              <div className="config-key">{promptEntry.key}</div>
              <div className="config-desc">{promptEntry.description}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onGoToPrompt}>
              Edit &amp; test →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
