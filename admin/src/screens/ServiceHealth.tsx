import { useEffect, useMemo, useRef, useState } from 'react';
import { listNoaaFailures, listCacheCleanupRuns, listFailingStations, type NoaaFailure, type CacheCleanupRun, type FailingStation } from '../lib/api';

const DAY_MS = 86_400_000;
const DAYS_SHOWN = 14;

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function sourceLabel(source: string): string {
  if (source === 'tide') return 'NOAA Tides';
  if (source === 'buoy') return 'NDBC Buoys';
  return source;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ServiceHealth() {
  const [failures, setFailures] = useState<NoaaFailure[]>([]);
  const [runs, setRuns] = useState<CacheCleanupRun[]>([]);
  const [stations, setStations] = useState<FailingStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([listNoaaFailures(), listCacheCleanupRuns(), listFailingStations()])
      .then(([f, r, s]) => {
        setFailures(f);
        setRuns(r);
        setStations(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load service health'))
      .finally(() => setLoading(false));
  }, []);

  // Bucket failures into the last 14 days, by source.
  const chartData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { key: string; label: string; tide: number; buoy: number; other: number }[] = [];
    for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      days.push({ key: d.toISOString().slice(0, 10), label: `${d.getMonth() + 1}/${d.getDate()}`, tide: 0, buoy: 0, other: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    failures.forEach((f) => {
      const bucket = byKey.get(dayKey(f.occurredAt));
      if (!bucket) return;
      if (f.source === 'tide') bucket.tide++;
      else if (f.source === 'buoy') bucket.buoy++;
      else bucket.other++;
    });
    return days;
  }, [failures]);

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    const tooltip = tooltipRef.current;
    if (!canvas || !tooltip) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const styles = getComputedStyle(document.documentElement);
    const cTide = styles.getPropertyValue('--cat-tide').trim();
    const cBuoy = styles.getPropertyValue('--cat-buoy').trim();
    const cWeather = styles.getPropertyValue('--cat-weather').trim();
    const cBorder = styles.getPropertyValue('--border-soft').trim();
    const cMuted = styles.getPropertyValue('--muted').trim();

    const padL = 26;
    const padB = 24;
    const padT = 8;
    const padR = 6;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    let maxVal = 1;
    chartData.forEach((d) => {
      maxVal = Math.max(maxVal, d.tide + d.buoy + d.other);
    });
    const niceMax = Math.max(4, Math.ceil(maxVal / 4) * 4);

    ctx.strokeStyle = cBorder;
    ctx.lineWidth = 1;
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillStyle = cMuted;
    const steps = 4;
    for (let g = 0; g <= steps; g++) {
      const y = padT + plotH - (plotH * g) / steps;
      ctx.beginPath();
      ctx.moveTo(padL, y + 0.5);
      ctx.lineTo(w - padR, y + 0.5);
      ctx.stroke();
      ctx.fillText(String(Math.round((niceMax * g) / steps)), 2, y + 3);
    }

    const n = chartData.length;
    const slot = plotW / n;
    const barW = Math.min(18, slot * 0.5);
    const bars: { x: number; w: number; day: (typeof chartData)[number] }[] = [];

    chartData.forEach((d, i) => {
      const cx = padL + slot * i + slot / 2;
      const x = cx - barW / 2;
      const yBase = padT + plotH;
      const segs = [
        { v: d.tide, color: cTide },
        { v: d.buoy, color: cBuoy },
        { v: d.other, color: cWeather },
      ];
      let y = yBase;
      segs.forEach((seg, segIdx) => {
        if (seg.v <= 0) return;
        const segH = (seg.v / niceMax) * plotH;
        ctx.fillStyle = seg.color;
        const top = y - segH;
        const isLast = segs.slice(segIdx + 1).every((s) => s.v <= 0);
        const r = 3;
        ctx.beginPath();
        if (isLast) {
          ctx.moveTo(x, top + r);
          ctx.arcTo(x, top, x + r, top, r);
          ctx.arcTo(x + barW, top, x + barW, top + r, r);
          ctx.lineTo(x + barW, y);
          ctx.lineTo(x, y);
          ctx.closePath();
        } else {
          ctx.rect(x, top, barW, segH);
        }
        ctx.fill();
        y = top - 2;
      });
      bars.push({ x: cx - slot / 2, w: slot, day: d });
      if (i % 2 === 0) {
        ctx.fillStyle = cMuted;
        ctx.textAlign = 'center';
        ctx.fillText(d.label, cx, h - 6);
        ctx.textAlign = 'left';
      }
    });

    canvas.onmousemove = (e) => {
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const hit = bars.find((b) => mx >= b.x && mx < b.x + b.w);
      if (!hit) {
        tooltip.style.opacity = '0';
        return;
      }
      const total = hit.day.tide + hit.day.buoy + hit.day.other;
      tooltip.innerHTML = `${hit.day.label} &middot; ${total} failures<br>Tides ${hit.day.tide} &middot; Buoys ${hit.day.buoy} &middot; Weather ${hit.day.other}`;
      tooltip.style.left = `${mx + 12}px`;
      tooltip.style.top = `${e.clientY - r.top - 10}px`;
      tooltip.style.opacity = '1';
    };
    canvas.onmouseleave = () => {
      tooltip.style.opacity = '0';
    };
  }, [chartData, loading]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Service Health</h1>
          <div className="desc">Failures calling NOAA, NDBC, and OpenWeather while building a conditions snapshot.</div>
        </div>
      </div>

      {error && <div className="error-note">{error}</div>}

      {!loading && (
        <>
          <div className="panel">
            <div className="panel-head">
              <h2>Failed requests, last 14 days</h2>
            </div>
            <div style={{ display: 'flex', gap: 16, padding: '4px 18px 2px', flexWrap: 'wrap' }}>
              <LegendItem color="var(--cat-tide)" label="NOAA Tides" />
              <LegendItem color="var(--cat-buoy)" label="NDBC Buoys" />
              <LegendItem color="var(--cat-weather)" label="OpenWeather / other" />
            </div>
            <div style={{ position: 'relative', padding: '6px 18px 16px' }}>
              <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} />
              <div
                ref={tooltipRef}
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  background: 'var(--ink)',
                  color: 'var(--pearl)',
                  padding: '7px 10px',
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontFamily: "'IBM Plex Mono', monospace",
                  opacity: 0,
                  transition: 'opacity 100ms ease',
                  whiteSpace: 'nowrap',
                  zIndex: 5,
                }}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Most-failing stations</h2>
                <div className="sub">
                  A 404 means NOAA/NDBC's own station list says this station is active, but its actual data feed doesn't exist right now -- an
                  upstream data-quality issue, not something wrong on our side. "First/last seen" shows whether it's an ongoing problem or a one-off.
                </div>
              </div>
            </div>
            {stations.length === 0 ? (
              <div className="empty-note">No failures recorded.</div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {stations.map((s, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 18px',
                      borderBottom: i < stations.length - 1 ? '1px solid var(--border-soft)' : 'none',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 12.5 }}>
                        {s.stationName ?? 'Unknown station'} <span className="mono" style={{ fontWeight: 500, color: 'var(--muted)' }}>({s.stationId})</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {s.errorMessage} &middot; {s.count} time{s.count === 1 ? '' : 's'} &middot; {formatDate(s.firstSeen)}
                        {s.firstSeen.slice(0, 10) !== s.lastSeen.slice(0, 10) ? ` – ${formatDate(s.lastSeen)}` : ''}
                        {s.lat != null && s.lon != null ? ` · ${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}` : ''}
                      </div>
                    </div>
                    <span className="pill pill-warn">{sourceLabel(s.source)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <h2>Cache cleanup runs</h2>
                <div className="sub">
                  Runs weekly (Sunday 3 AM). Only removes rows that have already expired in each cache table -- it never touches live/valid cached
                  data, it just stops these tables from growing forever. Each column is how many expired rows were found and deleted that run.
                </div>
              </div>
            </div>
            {runs.length === 0 ? (
              <div className="empty-note">No runs yet.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Run</th>
                      <th>Conditions</th>
                      <th>Strategy</th>
                      <th>Forecast</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.slice(0, 8).map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{formatDateTime(r.ranAt)}</td>
                        <td className="num">{r.conditionsCleared}</td>
                        <td className="num">{r.strategyCleared}</td>
                        <td className="num">{r.forecastCleared}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--body)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}
