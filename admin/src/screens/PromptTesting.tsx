import { useEffect, useState } from 'react';
import { listConfig, updateConfig, testPrompt, type PromptScenario } from '../lib/api';

const PROMPT_KEY = 'shelling_strategy_system_prompt';
const TEMPERATURE_KEY = 'shelling_strategy_temperature';
const MAX_TOKENS_KEY = 'shelling_strategy_max_tokens';

const SCENARIOS: { value: PromptScenario; label: string }[] = [
  { value: 'strong', label: 'Strong day, clear tide window (Sanibel Lighthouse Beach, 3 days out)' },
  { value: 'thin', label: 'Low confidence, thin buoy data (Blind Pass, today)' },
  { value: 'rain', label: "Rainy afternoon + rare find nearby (Bowman's Beach, tomorrow)" },
  { value: 'night', label: "No window, restricted to daylight -- low tide's real but at night (Turner Beach, today)" },
  { value: 'nightWindow', label: 'Real window after dark, night windows allowed (Turner Beach, today)' },
];

export function PromptTesting() {
  const [prompt, setPrompt] = useState('');
  const [savedPrompt, setSavedPrompt] = useState('');
  const [temperature, setTemperature] = useState<number | null>(null);
  const [maxTokens, setMaxTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [scenario, setScenario] = useState<PromptScenario>('strong');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    listConfig()
      .then((rows) => {
        const promptEntry = rows.find((r) => r.key === PROMPT_KEY);
        if (promptEntry) {
          setPrompt(String(promptEntry.value));
          setSavedPrompt(String(promptEntry.value));
        } else {
          setLoadError(`${PROMPT_KEY} not found in app_config`);
        }

        const temperatureEntry = rows.find((r) => r.key === TEMPERATURE_KEY);
        if (typeof temperatureEntry?.value === 'number') setTemperature(temperatureEntry.value);

        const maxTokensEntry = rows.find((r) => r.key === MAX_TOKENS_KEY);
        if (typeof maxTokensEntry?.value === 'number') setMaxTokens(maxTokensEntry.value);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Failed to load prompt'))
      .finally(() => setLoading(false));
  }, []);

  async function handleRunTest() {
    setRunning(true);
    setRunError(null);
    setOutput(null);
    try {
      const result = await testPrompt(prompt, scenario);
      setOutput(result.strategy);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setRunning(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      await updateConfig(PROMPT_KEY, prompt);
      setSavedPrompt(prompt);
      setSaveMessage('Saved. Live Shelling Strategy generations will use this from now on.');
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setPrompt(savedPrompt);
    setSaveMessage(null);
  }

  const hasChanges = prompt !== savedPrompt;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Prompt Testing</h1>
          <div className="desc">The live system prompt behind the Shelling Strategy card, with sample conditions to test changes against before saving.</div>
        </div>
      </div>

      {loadError && <div className="error-note">{loadError}</div>}

      {!loading && (
        <div className="two-col">
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>System prompt</h2>
                <div className="sub mono">app_config.{PROMPT_KEY}</div>
              </div>
            </div>
            <div className="panel-body">
              <textarea className="form-textarea" style={{ minHeight: 320, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, fontSize: 11, color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                <span>
                  Model: <b style={{ color: 'var(--body)' }}>gpt-4o-mini</b>
                </span>
                <span>
                  Temperature: <b style={{ color: 'var(--body)' }}>{temperature ?? '—'}</b>
                </span>
                <span>
                  Max tokens: <b style={{ color: 'var(--body)' }}>{maxTokens ?? '—'}</b>
                </span>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving || !hasChanges}>
                  {saving ? 'Saving...' : 'Save prompt'}
                </button>
                <button className="btn btn-ghost" onClick={handleCancel} disabled={saving || !hasChanges}>
                  Cancel
                </button>
              </div>
              {saveMessage && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--body)' }}>{saveMessage}</div>}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Test against a scenario</h2>
            </div>
            <div className="panel-body">
              <label className="form-label">Sample conditions</label>
              <select className="form-select" value={scenario} onChange={(e) => setScenario(e.target.value as PromptScenario)}>
                {SCENARIOS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 14 }}>
                <button className="btn btn-primary" onClick={handleRunTest} disabled={running}>
                  {running ? 'Running...' : 'Run test'}
                </button>
              </div>
              <div style={{ marginTop: 16 }}>
                <label className="form-label">Generated strategy</label>
                {runError ? (
                  <div className="error-note">{runError}</div>
                ) : (
                  <div className="config-desc" style={{ background: 'var(--pearl)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: 16, fontSize: 13.5, color: 'var(--ink)', minHeight: 110, maxWidth: 'none' }}>
                    {output ?? <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Choose a scenario and run the test to see the generated strategy here.</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
