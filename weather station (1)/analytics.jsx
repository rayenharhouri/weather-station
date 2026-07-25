// analytics.jsx — WeatherHub Analytics page (desktop)
// Multi-metric faceted line chart (small multiples) + per-metric summaries.
// Multi-metric view → strict line-only treatment (no area fills).

const { useState: useStateAn, useEffect: useEffectAn } = React;

// ─────────────────────────────────────────────────────────────
//  Icons (Lucide-aligned)
// ─────────────────────────────────────────────────────────────
const SVA = ({ size = 16, sw = 1.5, children, style, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const AI = {
  Dashboard: (p) => <SVA {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="14" width="7" height="7"/></SVA>,
  Activity:  (p) => <SVA {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></SVA>,
  Line:      (p) => <SVA {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></SVA>,
  Trend:     (p) => <SVA {...p}><path d="M22 7 13.5 15.5 9 11 2 18"/><path d="M16 7h6v6"/></SVA>,
  Bell:      (p) => <SVA {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></SVA>,
  Shield:    (p) => <SVA {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></SVA>,
  Tower:     (p) => <SVA {...p}><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8a6.14 6.14 0 0 1 .8 7.4"/><path d="M19.1 1.9a10.04 10.04 0 0 1 0 14.2"/><path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/></SVA>,
  Settings:  (p) => <SVA {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SVA>,
  Chevron:   (p) => <SVA {...p}><path d="m6 9 6 6 6-6"/></SVA>,
  ChevronR:  (p) => <SVA {...p}><path d="m9 18 6-6-6-6"/></SVA>,
  ArrowR:    (p) => <SVA {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></SVA>,
  ArrowDown: (p) => <SVA {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></SVA>,
  Search:    (p) => <SVA {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></SVA>,
  Download:  (p) => <SVA {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></SVA>,
  Compare:   (p) => <SVA {...p}><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/></SVA>,
  More:      (p) => <SVA {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></SVA>,
  Filter:    (p) => <SVA {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></SVA>,
  Plus:      (p) => <SVA {...p}><path d="M5 12h14"/><path d="M12 5v14"/></SVA>,
  Calendar:  (p) => <SVA {...p}><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></SVA>,
  Sigma:     (p) => <SVA {...p}><path d="M18 7V4H6l6 8-6 8h12v-3"/></SVA>,
};

// ─────────────────────────────────────────────────────────────
//  App shell
// ─────────────────────────────────────────────────────────────
function SidebarA() {
  const items = [
    { icon: AI.Dashboard, label: "Dashboard" },
    { icon: AI.Activity,  label: "Live" },
    { icon: AI.Line,      label: "Analytics", active: true },
    { icon: AI.Trend,     label: "Forecasts" },
    { icon: AI.Bell,      label: "Alerts", badge: "3" },
    { icon: AI.Shield,    label: "Integrity" },
    { icon: AI.Tower,     label: "Stations", badge: "12" },
    { icon: AI.Settings,  label: "Settings" },
  ];
  return (
    <aside style={{
      width: 240, height: "100%", borderRight: "1px solid var(--border-subtle)",
      display: "flex", flexDirection: "column", padding: "16px 12px", gap: 16,
      background: "var(--bg)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px" }}>
        <img src="logo.png" alt="WeatherHub" style={{ width: 28, height: 28, display: "block", objectFit: "contain" }} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>WeatherHub</span>
          <span style={{ fontSize: 11, color: "var(--fg-subtle)" }} className="mono">enit.weatherhub.tn</span>
        </div>
      </div>
      <hr className="hairline" />
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.1, textTransform: "uppercase", padding: "0 10px 6px" }}>Monitoring</div>
        {items.slice(0, 4).map((it) => (
          <div key={it.label} className={`nav-item${it.active ? " active" : ""}`}>
            <it.icon size={16} />
            <span>{it.label}</span>
            {it.badge && <span className="badge">{it.badge}</span>}
          </div>
        ))}
        <div style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.1, textTransform: "uppercase", padding: "16px 10px 6px" }}>Operations</div>
        {items.slice(4).map((it) => (
          <div key={it.label} className="nav-item">
            <it.icon size={16} />
            <span>{it.label}</span>
            {it.badge && <span className="badge">{it.badge}</span>}
          </div>
        ))}
      </nav>
      <div style={{ marginTop: "auto", padding: "0 4px" }}>
        <div className="card" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-muted)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sev-success)" }} />
            <span>11 of 12 reporting</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            <span style={{ fontSize: 10, color: "var(--fg-subtle)" }}>Fleet status</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-muted)" }}>92%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopbarA() {
  return (
    <header style={{
      height: 56, display: "flex", alignItems: "center", gap: 16,
      padding: "0 24px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--bg)",
    }}>
      <button className="btn btn-outline" style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}>
        <AI.Tower size={13} />
        <span style={{ fontSize: 13, color: "var(--fg-muted)", marginLeft: 2 }}>Station</span>
        <span style={{ fontSize: 13, color: "var(--fg)", marginLeft: 6 }}>Tunis-Campus</span>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 6 }} className="mono">/12</span>
        <AI.Chevron size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-subtle)", fontSize: 12 }}>
        <span>Tunis-Campus</span>
        <AI.ChevronR size={11} />
        <span style={{ color: "var(--fg-muted)" }}>Rooftop · Block A</span>
      </div>
      <div style={{ flex: 1 }} />
      <button className="btn btn-outline" style={{ height: 32, width: 220, justifyContent: "space-between", color: "var(--fg-subtle)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AI.Search size={13} />
          <span style={{ fontSize: 13 }}>Search stations, alerts…</span>
        </span>
        <span className="mono" style={{ fontSize: 10, padding: "1px 4px", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>⌘K</span>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", height: 32, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
        <span className="live-dot" />
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Live</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", paddingLeft: 6, borderLeft: "1px solid var(--border-subtle)" }}>SSE · 2.4 KB/s</span>
      </div>
      <button className="btn btn-ghost" style={{ height: 32, padding: 0, gap: 8 }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(0.6 0.14 280), oklch(0.55 0.18 255))",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 500,
        }}>YA</span>
      </button>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
//  Data — 144 points (24h at 10-min intervals)
// ─────────────────────────────────────────────────────────────
function seedRand(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function gen24h({ seed, peakHour = 14, min, max, noiseAmp = 1, dayOnly = false }) {
  const r = seedRand(seed);
  return Array.from({ length: 144 }, (_, i) => {
    const hour = i / 6;
    if (dayOnly) {
      if (hour < 6.5 || hour > 19.5) return 0;
      const dayPhase = ((hour - 6.5) / 13) * Math.PI;
      const wave = Math.sin(dayPhase);
      return Math.max(0, min + (max - min) * wave + (r() - 0.5) * noiseAmp);
    }
    const phase = ((hour - peakHour) * Math.PI) / 12;
    const wave = (Math.cos(phase) + 1) / 2;
    return min + (max - min) * wave + (r() - 0.5) * noiseAmp;
  });
}

const SERIES = {
  temp:     gen24h({ seed: 42,  peakHour: 14,  min: 18.5, max: 26.2, noiseAmp: 0.3 }),
  humidity: gen24h({ seed: 17,  peakHour: 4,   min: 52,   max: 71,   noiseAmp: 1.8 }),
  pressure: gen24h({ seed: 99,  peakHour: 10,  min: 1011, max: 1015, noiseAmp: 0.12 }),
  light:    gen24h({ seed: 7,   min: 0,    max: 940,  noiseAmp: 18, dayOnly: true }),
  aqi:      gen24h({ seed: 5,   peakHour: 17,  min: 32,   max: 48,   noiseAmp: 2.2 }),
};
// Add an AQI bump near 17:00 (rush hour) to make the anomaly believable
for (let i = 100; i < 110; i++) SERIES.aqi[i] += 12 - Math.abs(i - 105) * 2;

function stats(data, precision = 1) {
  const ignoreZero = data === SERIES.light; // light @ 0 at night isn't interesting
  const nonZero = ignoreZero ? data.filter(v => v > 1) : data;
  if (!nonZero.length) return { min: 0, max: 0, minIdx: 0, maxIdx: 0, avg: 0, sigma: 0, p95: 0 };
  const sorted = [...nonZero].sort((a, b) => a - b);
  const n = nonZero.length;
  const min = sorted[0], max = sorted[n - 1];
  const minIdx = data.indexOf(min), maxIdx = data.indexOf(max);
  const avg = nonZero.reduce((s, v) => s + v, 0) / n;
  const sigma = Math.sqrt(nonZero.reduce((s, v) => s + (v - avg) ** 2, 0) / n);
  const p95 = sorted[Math.floor(n * 0.95)];
  return { min, max, minIdx, maxIdx, avg, sigma, p95 };
}

function idxToTime(idx) {
  const hour = Math.floor(idx / 6);
  const minute = (idx % 6) * 10;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────
//  Metric chip toggle
// ─────────────────────────────────────────────────────────────
function MetricChip({ active, color, label, onClick }) {
  return (
    <button onClick={onClick} className="btn" style={{
      height: 30, padding: "0 12px", gap: 8,
      border: `1px solid ${active ? "var(--border-hover)" : "var(--border-subtle)"}`,
      background: active ? "var(--surface-2)" : "transparent",
      color: active ? "var(--fg)" : "var(--fg-muted)",
      opacity: active ? 1 : 0.55,
    }}>
      <span style={{
        width: 10, height: 10, borderRadius: 2, background: color,
        opacity: active ? 1 : 0.5,
      }} />
      <span style={{ fontSize: 13 }}>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  Segmented control (used for time-range + interval)
// ─────────────────────────────────────────────────────────────
function Segmented({ options, active, height = 28 }) {
  return (
    <div style={{ display: "flex", border: "1px solid var(--border-subtle)", borderRadius: 8, overflow: "hidden", height }}>
      {options.map((o, i) => (
        <button key={o} className="mono"
          style={{
            border: 0, padding: "0 10px", height: "100%",
            background: o === active ? "var(--surface-2)" : "transparent",
            color: o === active ? "var(--fg)" : "var(--fg-muted)",
            fontFamily: "inherit", fontSize: 12, cursor: "pointer",
            borderRight: i < options.length - 1 ? "1px solid var(--border-subtle)" : "none",
          }}>{o}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Faceted small-multiples chart (one big SVG)
// ─────────────────────────────────────────────────────────────
const STRIPS = [
  { key: "temp",     label: "Temperature", color: "var(--m-temp)",     unit: "°C",  precision: 1 },
  { key: "humidity", label: "Humidity",    color: "var(--m-humidity)", unit: "%",   precision: 1 },
  { key: "pressure", label: "Pressure",    color: "var(--m-pressure)", unit: "hPa", precision: 2 },
  { key: "light",    label: "Light",       color: "var(--m-light)",    unit: "lx",  precision: 0 },
  { key: "aqi",      label: "Air quality", color: "var(--m-aqi)",      unit: "AQI", precision: 0 },
];

const ANNOTATIONS = [
  { idx: 73,  severity: "critical", label: "ΔP threshold · 12:04" },
  { idx: 103, severity: "warn",     label: "AQI > 60 · 17:12" },
];

const sevColor = { info: "var(--sev-info)", warn: "var(--sev-warn)", critical: "var(--sev-critical)" };

function FacetedChart({ active, cursorIdx }) {
  const W = 1100;          // virtual width (scales to 100%)
  const labelColW = 132;
  const rangeColW = 116;
  const margin = { top: 36, right: 16, bottom: 18, left: 16 };
  const stripH = 92;
  const visible = STRIPS.filter(s => active.includes(s.key));
  const totalH = margin.top + visible.length * stripH + margin.bottom;

  const chartX0 = margin.left + labelColW;
  const chartX1 = W - margin.right - rangeColW;
  const chartW = chartX1 - chartX0;

  const n = SERIES.temp.length;
  const xToPx = (i) => chartX0 + (i / (n - 1)) * chartW;
  const monoFont = "Geist Mono, ui-monospace, monospace";

  return (
    <svg width="100%" height={totalH} viewBox={`0 0 ${W} ${totalH}`} preserveAspectRatio="none">
      {/* Top time-axis labels + vertical gridlines */}
      {[0, 4, 8, 12, 16, 20, 24].map((h) => {
        const x = chartX0 + (h / 24) * chartW;
        return (
          <g key={h}>
            <line x1={x} y1={margin.top} x2={x} y2={totalH - margin.bottom}
              stroke="var(--border-subtle)" strokeWidth="1"
              strokeDasharray={h === 0 || h === 24 ? "0" : "2 4"}
              shapeRendering="crispEdges" />
            <text x={x} y={margin.top - 12} textAnchor="middle"
              fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>
              {String(h).padStart(2, "0")}:00
            </text>
          </g>
        );
      })}

      {/* Annotation hairlines (severity-colored, dashed) */}
      {ANNOTATIONS.map((a, ai) => {
        const x = xToPx(a.idx);
        return (
          <g key={ai}>
            <line x1={x} y1={margin.top - 6} x2={x} y2={totalH - margin.bottom}
              stroke={sevColor[a.severity]} strokeWidth="1"
              strokeDasharray="3 3" opacity="0.55" />
            <g transform={`translate(${x}, ${margin.top - 22})`}>
              <rect x="-3" y="-8" width={a.label.length * 5.4 + 8} height="14"
                fill="var(--bg)" stroke={sevColor[a.severity]} strokeOpacity="0.5"
                rx="3" />
              <text x="1" y="2" fill={sevColor[a.severity]}
                fontSize="9.5" fontFamily={monoFont}>{a.label}</text>
            </g>
          </g>
        );
      })}

      {/* Strips */}
      {visible.map((s, si) => {
        const data = SERIES[s.key];
        const st = stats(data, s.precision);
        const isLight = s.key === "light";
        const yMinRaw = isLight ? 0 : st.min;
        const yMaxRaw = isLight ? st.max * 1.1 : st.max;
        const padY = (yMaxRaw - yMinRaw) * 0.12 || 1;
        const yMin = yMinRaw - padY;
        const yMax = yMaxRaw + padY;

        const stripTop = margin.top + si * stripH;
        const insetT = stripTop + 12;
        const insetH = stripH - 24;
        const yToPx = (v) => insetT + (1 - (v - yMin) / (yMax - yMin)) * insetH;

        const line = data.map((v, i) =>
          `${i === 0 ? "M" : "L"}${xToPx(i).toFixed(1)} ${yToPx(v).toFixed(1)}`).join(" ");

        const cursorVal = data[cursorIdx];

        return (
          <g key={s.key}>
            {/* Strip divider */}
            {si > 0 && (
              <line x1={margin.left} y1={stripTop}
                x2={W - margin.right} y2={stripTop}
                stroke="var(--border-subtle)" strokeWidth="1"
                shapeRendering="crispEdges" />
            )}

            {/* Mid baseline (very faint horizontal gridline) */}
            <line x1={chartX0} y1={stripTop + stripH / 2}
              x2={chartX1} y2={stripTop + stripH / 2}
              stroke="var(--border-subtle)" strokeWidth="1"
              strokeDasharray="2 6" opacity="0.5"
              shapeRendering="crispEdges" />

            {/* Label column (left) */}
            <g transform={`translate(${margin.left + 14}, ${stripTop + stripH / 2})`}>
              <rect x="0" y="-12" width="3" height="24" fill={s.color} rx="1" />
              <text x="14" y="-3" fill="var(--fg)" fontSize="13" fontWeight="500">{s.label}</text>
              <text x="14" y="13" fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>{s.unit}</text>
            </g>

            {/* Line */}
            <path d={line} stroke={s.color} strokeWidth="1.5"
              fill="none" strokeLinejoin="round" strokeLinecap="round" />

            {/* Min/max markers (small open circles on line) */}
            <circle cx={xToPx(st.minIdx)} cy={yToPx(st.min)} r="2.5"
              fill="var(--bg)" stroke={s.color} strokeWidth="1.2" />
            <circle cx={xToPx(st.maxIdx)} cy={yToPx(st.max)} r="2.5"
              fill="var(--bg)" stroke={s.color} strokeWidth="1.2" />

            {/* Cursor value + tag */}
            {cursorIdx != null && cursorVal != null && (
              <g>
                <circle cx={xToPx(cursorIdx)} cy={yToPx(cursorVal)} r="3.5" fill={s.color} />
              </g>
            )}

            {/* Range column (right) */}
            <g transform={`translate(${W - margin.right - rangeColW + 8}, ${stripTop + stripH / 2})`}>
              <text x="0" y="-14" fill="var(--fg-subtle)" fontSize="9" letterSpacing="0.05" textAnchor="start">MAX</text>
              <text x="32" y="-14" fill="var(--fg)" fontSize="11" fontFamily={monoFont} textAnchor="start">
                {st.max.toFixed(s.precision)} <tspan fill="var(--fg-subtle)" fontSize="9">{s.unit}</tspan>
              </text>
              <text x="0" y="0" fill="var(--fg-subtle)" fontSize="9" letterSpacing="0.05" textAnchor="start">AVG</text>
              <text x="32" y="0" fill="var(--fg-muted)" fontSize="11" fontFamily={monoFont} textAnchor="start">
                {st.avg.toFixed(s.precision)}
              </text>
              <text x="0" y="14" fill="var(--fg-subtle)" fontSize="9" letterSpacing="0.05" textAnchor="start">MIN</text>
              <text x="32" y="14" fill="var(--fg)" fontSize="11" fontFamily={monoFont} textAnchor="start">
                {st.min.toFixed(s.precision)}
              </text>
            </g>
          </g>
        );
      })}

      {/* Global vertical cursor — drawn after strips so it stays on top */}
      {cursorIdx != null && (
        <g>
          <line x1={xToPx(cursorIdx)} y1={margin.top - 6}
            x2={xToPx(cursorIdx)} y2={totalH - margin.bottom}
            stroke="var(--fg)" strokeOpacity="0.45" strokeWidth="1"
            strokeDasharray="2 3" shapeRendering="crispEdges" />
          {/* Top time pill */}
          <g transform={`translate(${xToPx(cursorIdx) - 24}, ${margin.top - 30})`}>
            <rect width="48" height="16" rx="4"
              fill="var(--surface-2)" stroke="var(--border-hover)" />
            <text x="24" y="11" textAnchor="middle"
              fill="var(--fg)" fontSize="10" fontFamily={monoFont}>
              {idxToTime(cursorIdx)}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
//  Per-metric stats card (footer row)
// ─────────────────────────────────────────────────────────────
function StatCard({ strip, current }) {
  const data = SERIES[strip.key];
  const st = stats(data, strip.precision);
  const delta24 = data[data.length - 1] - data[0];
  const deltaDir = delta24 > 0 ? "up" : delta24 < 0 ? "down" : "flat";
  const dArrow = deltaDir === "up" ? "▲" : deltaDir === "down" ? "▼" : "▬";
  return (
    <div className="card interactive" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: strip.color }} />
        <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>{strip.label}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--fg-subtle)" }} className="mono">{strip.unit}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="mono" style={{ fontSize: 22, color: "var(--fg)", fontWeight: 500, letterSpacing: -0.4, lineHeight: 1 }}>
          {current.toFixed(strip.precision)}
        </span>
        <span className={`chip ${deltaDir === "up" ? "up" : deltaDir === "down" ? "down" : "flat"}`} style={{ marginLeft: 4 }}>
          <span style={{ fontSize: 9 }}>{dArrow}</span>
          <span>{Math.abs(delta24).toFixed(strip.precision)}</span>
          <span style={{ color: "var(--fg-subtle)", marginLeft: 3, fontSize: 9 }}>24h</span>
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", paddingTop: 4, borderTop: "1px solid var(--border-subtle)" }}>
        <StatRow label="MIN" value={`${st.min.toFixed(strip.precision)}`} note={idxToTime(st.minIdx)} />
        <StatRow label="MAX" value={`${st.max.toFixed(strip.precision)}`} note={idxToTime(st.maxIdx)} />
        <StatRow label="AVG" value={`${st.avg.toFixed(strip.precision)}`} />
        <StatRow label="σ"   value={`${st.sigma.toFixed(2)}`} mono />
        <StatRow label="p95" value={`${st.p95.toFixed(strip.precision)}`} />
      </div>
    </div>
  );
}

function StatRow({ label, value, note }) {
  return (
    <React.Fragment>
      <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, lineHeight: 1.4 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", lineHeight: 1.4 }}>
        <span className="mono" style={{ fontSize: 12, color: "var(--fg)" }}>{value}</span>
        {note && <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>{note}</span>}
      </span>
    </React.Fragment>
  );
}

// ─────────────────────────────────────────────────────────────
//  Analytics page (desktop, 1440×900)
// ─────────────────────────────────────────────────────────────
function AnalyticsDesktop() {
  const active = ["temp", "humidity", "pressure", "light", "aqi"];
  const cursorIdx = 86; // 14:20

  return (
    <div className="wh-root" style={{ display: "flex", flexDirection: "column", width: 1440, height: 900, overflow: "hidden" }} data-screen-label="Analytics · Desktop">
      <TopbarA />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidebarA />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", gap: 14, overflow: "hidden", minWidth: 0 }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 2 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.2 }}>Analytics</h1>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }}>v1.4</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                Compare metrics across time and stations · 144 samples, 10-min aggregation
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Segmented options={["24h", "7d", "30d", "90d"]} active="24h" />
              <Segmented options={["1m", "5m", "15m", "1h", "1d"]} active="15m" />
              <button className="btn btn-outline btn-xs"><AI.Calendar size={11} /> Custom</button>
              <span style={{ width: 1, height: 16, background: "var(--border-subtle)" }} />
              <button className="btn btn-outline btn-xs"><AI.Compare size={11} /> Compare</button>
              <button className="btn btn-outline btn-xs"><AI.Download size={11} /> Export</button>
            </div>
          </div>

          {/* Chart card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
            {/* Chart toolbar: metric chips + station scope */}
            <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", gap: 10, borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase", marginRight: 4 }}>Metrics</span>
              <div style={{ display: "flex", gap: 6 }}>
                {STRIPS.map(s => (
                  <MetricChip key={s.key} active={active.includes(s.key)} color={s.color} label={s.label} />
                ))}
                <button className="btn btn-ghost btn-xs" style={{ height: 30, paddingLeft: 8 }}>
                  <AI.Plus size={11} /> Battery
                </button>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>Scope</span>
              <button className="btn btn-outline btn-xs">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sev-success)" }} />
                <span>Tunis-Campus</span>
                <AI.Chevron size={11} style={{ opacity: 0.6 }} />
              </button>
              <button className="btn btn-ghost btn-xs"><AI.Filter size={11} /></button>
            </div>

            {/* Faceted chart body */}
            <div style={{ flex: 1, padding: "8px 4px 4px 4px", overflow: "hidden", minHeight: 0 }}>
              <FacetedChart active={active} cursorIdx={cursorIdx} />
            </div>

            {/* Footer: cursor readout */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px", borderTop: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>At cursor</span>
              <span className="mono" style={{ fontSize: 13, color: "var(--fg)" }}>{idxToTime(cursorIdx)}</span>
              <span style={{ width: 1, height: 14, background: "var(--border-subtle)" }} />
              {STRIPS.filter(s => active.includes(s.key)).map(s => {
                const v = SERIES[s.key][cursorIdx];
                return (
                  <span key={s.key} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: s.color, alignSelf: "center" }} />
                    <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{s.label}</span>
                    <span className="mono" style={{ fontSize: 13, color: "var(--fg)" }}>{v.toFixed(s.precision)}</span>
                    <span style={{ fontSize: 10, color: "var(--fg-subtle)" }}>{s.unit}</span>
                  </span>
                );
              })}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-subtle)" }}>
                Drag to select range
              </span>
            </div>
          </div>

          {/* Stats cards row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
            {STRIPS.map(s => (
              <StatCard
                key={s.key}
                strip={s}
                current={SERIES[s.key][SERIES[s.key].length - 1]}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { AnalyticsDesktop });
