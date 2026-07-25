// live.jsx — WeatherHub Live stream page (desktop)
// Self-contained: defines its own icons + chart primitives so it can ship
// alongside dashboard.jsx without coupling.

const { useState: useStateLv, useEffect: useEffectLv, useRef: useRefLv } = React;

// ─────────────────────────────────────────────────────────────
//  Icons (Lucide-aligned, 1.5px stroke) — duplicated from dashboard.jsx
//  to keep this page deployable on its own.
// ─────────────────────────────────────────────────────────────
const SVL = ({ size = 16, sw = 1.5, children, style, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const LI = {
  Dashboard: (p) => <SVL {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="14" width="7" height="7"/></SVL>,
  Activity:  (p) => <SVL {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></SVL>,
  Line:      (p) => <SVL {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></SVL>,
  Trend:     (p) => <SVL {...p}><path d="M22 7 13.5 15.5 9 11 2 18"/><path d="M16 7h6v6"/></SVL>,
  Bell:      (p) => <SVL {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></SVL>,
  Shield:    (p) => <SVL {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></SVL>,
  Tower:     (p) => <SVL {...p}><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8a6.14 6.14 0 0 1 .8 7.4"/><path d="M19.1 1.9a10.04 10.04 0 0 1 0 14.2"/><path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/></SVL>,
  Settings:  (p) => <SVL {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SVL>,
  Thermo:    (p) => <SVL {...p}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></SVL>,
  Droplet:   (p) => <SVL {...p}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5-2 1.6-3 3.5-3 5.5a7 7 0 0 0 7 7z"/></SVL>,
  Gauge:     (p) => <SVL {...p}><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></SVL>,
  Wind:      (p) => <SVL {...p}><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></SVL>,
  Chevron:   (p) => <SVL {...p}><path d="m6 9 6 6 6-6"/></SVL>,
  ChevronR:  (p) => <SVL {...p}><path d="m9 18 6-6-6-6"/></SVL>,
  ArrowR:    (p) => <SVL {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></SVL>,
  Search:    (p) => <SVL {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></SVL>,
  Pause:     (p) => <SVL {...p}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></SVL>,
  Play:      (p) => <SVL {...p}><polygon points="6 3 20 12 6 21" fill="currentColor"/></SVL>,
  Download:  (p) => <SVL {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></SVL>,
  Maximize:  (p) => <SVL {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></SVL>,
  More:      (p) => <SVL {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></SVL>,
  Filter:    (p) => <SVL {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></SVL>,
  Copy:      (p) => <SVL {...p}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></SVL>,
};

// ─────────────────────────────────────────────────────────────
//  Sidebar + topbar (matched to dashboard, but "Live" is active)
// ─────────────────────────────────────────────────────────────
function SidebarLive() {
  const items = [
    { icon: LI.Dashboard, label: "Dashboard" },
    { icon: LI.Activity,  label: "Live", active: true },
    { icon: LI.Line,      label: "Analytics" },
    { icon: LI.Trend,     label: "Forecasts" },
    { icon: LI.Bell,      label: "Alerts", badge: "3" },
    { icon: LI.Shield,    label: "Integrity" },
    { icon: LI.Tower,     label: "Stations", badge: "12" },
    { icon: LI.Settings,  label: "Settings" },
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

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
        <div className="card" style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-muted)" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sev-success)" }} />
            <span>11 of 12 reporting</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
            <span style={{ fontSize: 10, color: "var(--fg-subtle)" }}>Fleet status</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-muted)" }}>92%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopbarLive() {
  return (
    <header style={{
      height: 56, display: "flex", alignItems: "center", gap: 16,
      padding: "0 24px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--bg)",
    }}>
      <button className="btn btn-outline" style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}>
        <LI.Tower size={13} />
        <span style={{ fontSize: 13, color: "var(--fg-muted)", marginLeft: 2 }}>Station</span>
        <span style={{ fontSize: 13, color: "var(--fg)", marginLeft: 6 }}>Tunis-Campus</span>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 6 }} className="mono">/12</span>
        <LI.Chevron size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-subtle)", fontSize: 12 }}>
        <span>Tunis-Campus</span>
        <LI.ChevronR size={11} />
        <span style={{ color: "var(--fg-muted)" }}>Rooftop · Block A</span>
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn btn-outline" style={{ height: 32, width: 220, justifyContent: "space-between", color: "var(--fg-subtle)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LI.Search size={13} />
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
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 500,
        }}>YA</span>
      </button>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
//  Seeded random + time-series generator
// ─────────────────────────────────────────────────────────────
function seedRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function genSeries({ seed, base, amp, n = 120, smoothing = 0.18, mean = 0.02 }) {
  const r = seedRand(seed);
  const out = [];
  let v = base + (r() - 0.5) * amp * 0.4;
  for (let i = 0; i < n; i++) {
    v += (r() - 0.5) * amp * smoothing - (v - base) * mean;
    out.push(v);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
//  Live chart card (single metric, area fill, hairline gridlines)
// ─────────────────────────────────────────────────────────────
function LiveChartCard({ icon: Icon, color, label, value, unit, delta, deltaDir, data, precision = 1, yPad = 0.15, lastUpdate, statusText }) {
  // Layout
  const W = 466;
  const H = 248;
  const pad = { top: 14, right: 16, bottom: 24, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = (max - min) || 1;
  const yMin = min - rng * yPad;
  const yMax = max + rng * yPad;

  const yToPx = (v) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const xToPx = (i) => pad.left + (i / (data.length - 1)) * innerW;

  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(yMin + ((yMax - yMin) * i) / tickCount);
  }

  const line = data.map((v, i) =>
    `${i === 0 ? "M" : "L"}${xToPx(i).toFixed(1)} ${yToPx(v).toFixed(1)}`).join(" ");
  const lastIdx = data.length - 1;
  const lastX = xToPx(lastIdx);
  const lastY = yToPx(data[lastIdx]);
  const area = line + ` L${xToPx(lastIdx).toFixed(1)} ${(pad.top + innerH).toFixed(1)} L${pad.left.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;

  const xLabels = [
    { t: "5m", x: pad.left + 0.00 * innerW },
    { t: "4m", x: pad.left + 0.20 * innerW },
    { t: "3m", x: pad.left + 0.40 * innerW },
    { t: "2m", x: pad.left + 0.60 * innerW },
    { t: "1m", x: pad.left + 0.80 * innerW },
    { t: "now", x: pad.left + 1.00 * innerW },
  ];

  const dArrow = deltaDir === "up" ? "▲" : deltaDir === "down" ? "▼" : "▬";
  const dClass = deltaDir === "up" ? "up" : deltaDir === "down" ? "down" : "flat";
  const monoFont = "Geist Mono, ui-monospace, monospace";

  return (
    <div className="card interactive" style={{ padding: 18, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color, display: "flex" }}><Icon size={18} /></span>
          <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span className={`chip ${dClass}`}>
            <span style={{ fontSize: 10 }}>{dArrow}</span>
            <span>{delta}</span>
            <span style={{ color: "var(--fg-subtle)", marginLeft: 4, fontSize: 9 }}>/5m</span>
          </span>
          <button className="btn btn-ghost btn-xs" style={{ width: 22, height: 22, padding: 0 }}>
            <LI.Maximize size={11} />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
        <span className="mono" style={{ fontSize: 40, color: "var(--fg)", fontWeight: 500, letterSpacing: -0.8, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>{unit}</span>
        {statusText && (
          <span style={{ fontSize: 11, color: "var(--fg-muted)", marginLeft: 8 }}>{statusText}</span>
        )}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-subtle)" }} className="mono">
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
          {lastUpdate}
        </span>
      </div>

      {/* Chart */}
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginTop: 4 }}>
        {/* Horizontal gridlines */}
        {yTicks.map((tv, i) => {
          const y = yToPx(tv);
          return (
            <g key={i}>
              <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y}
                stroke="var(--border-subtle)" strokeWidth="1" shapeRendering="crispEdges" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end"
                fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>
                {tv.toFixed(precision)}
              </text>
            </g>
          );
        })}

        {/* Area + line */}
        <path d={area} fill={color} fillOpacity="0.10" />
        <path d={line} fill="none" stroke={color} strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Last point — halo + solid dot. No animation (one-pulse-per-view
            budget is already on the topbar Live indicator). */}
        <circle cx={lastX} cy={lastY} r="7" fill={color} fillOpacity="0.16" />
        <circle cx={lastX} cy={lastY} r="3" fill={color} />

        {/* X-axis labels */}
        {xLabels.map((xl, i) => (
          <text key={i} x={xl.x} y={pad.top + innerH + 14} textAnchor="middle"
            fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>{xl.t}</text>
        ))}

        {/* X-axis baseline */}
        <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH}
          stroke="var(--border-subtle)" strokeWidth="1" shapeRendering="crispEdges" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Stream tape — vertical feed of incoming readings
// ─────────────────────────────────────────────────────────────
const tapeEntries = [
  { ts: "14:32:08.221", metric: "T", color: "var(--m-temp)",     value: "23.41", unit: "°C",  delta: "+0.04" },
  { ts: "14:32:07.890", metric: "H", color: "var(--m-humidity)", value: "64.21", unit: "%",   delta: "−0.13" },
  { ts: "14:32:07.555", metric: "P", color: "var(--m-pressure)", value: "1013.04", unit: "hPa", delta: "+0.02" },
  { ts: "14:32:07.220", metric: "A", color: "var(--m-aqi)",      value: "37",     unit: "AQI", delta: "−1" },
  { ts: "14:32:06.890", metric: "T", color: "var(--m-temp)",     value: "23.37", unit: "°C",  delta: "+0.02" },
  { ts: "14:32:06.555", metric: "H", color: "var(--m-humidity)", value: "64.34", unit: "%",   delta: "+0.04" },
  { ts: "14:32:06.222", metric: "L", color: "var(--m-light)",    value: "412",    unit: "lx",  delta: "+2" },
  { ts: "14:32:05.890", metric: "P", color: "var(--m-pressure)", value: "1013.02", unit: "hPa", delta: "−0.01" },
  { ts: "14:32:05.555", metric: "A", color: "var(--m-aqi)",      value: "38",     unit: "AQI", delta: "0" },
  { ts: "14:32:05.221", metric: "T", color: "var(--m-temp)",     value: "23.35", unit: "°C",  delta: "−0.01" },
  { ts: "14:32:04.890", metric: "H", color: "var(--m-humidity)", value: "64.30", unit: "%",   delta: "−0.05" },
  { ts: "14:32:04.555", metric: "P", color: "var(--m-pressure)", value: "1013.03", unit: "hPa", delta: "+0.01" },
  { ts: "14:32:04.221", metric: "T", color: "var(--m-temp)",     value: "23.36", unit: "°C",  delta: "+0.01" },
  { ts: "14:32:03.890", metric: "A", color: "var(--m-aqi)",      value: "38",     unit: "AQI", delta: "+1" },
  { ts: "14:32:03.555", metric: "L", color: "var(--m-light)",    value: "410",    unit: "lx",  delta: "−2" },
  { ts: "14:32:03.221", metric: "H", color: "var(--m-humidity)", value: "64.35", unit: "%",   delta: "+0.07" },
  { ts: "14:32:02.890", metric: "P", color: "var(--m-pressure)", value: "1013.02", unit: "hPa", delta: "0.00" },
  { ts: "14:32:02.555", metric: "T", color: "var(--m-temp)",     value: "23.35", unit: "°C",  delta: "+0.03" },
];

function TapeRow({ entry, fade }) {
  const dColor =
    entry.delta.startsWith("+") ? "var(--sev-success)" :
    entry.delta.startsWith("−") ? "var(--sev-critical)" :
    "var(--fg-subtle)";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "78px 16px 1fr auto",
      alignItems: "center",
      gap: 8,
      padding: "6px 14px",
      borderBottom: "1px solid var(--border-subtle)",
      opacity: fade,
    }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>{entry.ts}</span>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 16, height: 16, borderRadius: 3,
        background: entry.color, opacity: 0.18,
        position: "relative",
      }}>
        <span className="mono" style={{ position: "absolute", fontSize: 9, fontWeight: 600, color: entry.color, opacity: 1 / 0.18 * 0.9 }}>{entry.metric}</span>
      </span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 3, minWidth: 0 }}>
        <span className="mono" style={{ fontSize: 12, color: "var(--fg)" }}>{entry.value}</span>
        <span style={{ fontSize: 10, color: "var(--fg-subtle)" }}>{entry.unit}</span>
      </span>
      <span className="mono" style={{ fontSize: 11, color: dColor, minWidth: 36, textAlign: "right" }}>{entry.delta}</span>
    </div>
  );
}

function StreamTape() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>Stream tape</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)", marginLeft: 8 }}>· 9,287 msgs</span>
        <button className="btn btn-ghost btn-xs" style={{ marginLeft: "auto", height: 22, padding: "0 6px" }}>
          <LI.Filter size={11} />
        </button>
        <button className="btn btn-ghost btn-xs" style={{ height: 22, padding: "0 6px" }}>
          <LI.Pause size={11} />
        </button>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tapeEntries.map((e, i) => (
          <TapeRow key={i} entry={e} fade={Math.max(0.35, 1 - i * 0.04)} />
        ))}
      </div>
      <div style={{ padding: "6px 14px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-subtle)" }}>
        <span>Showing latest 18</span>
        <button className="btn btn-ghost btn-xs" style={{ height: 18, padding: 0, color: "var(--fg-muted)" }}>
          <LI.Download size={10} /> Export
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SSE connection panel — endpoint, throughput, cadence, latency histogram
// ─────────────────────────────────────────────────────────────
function LatencyHistogram({ width = 260, height = 36 }) {
  // 20 buckets, fake distribution
  const buckets = [2, 4, 8, 15, 24, 38, 42, 36, 28, 21, 14, 9, 6, 4, 3, 2, 1, 1, 1, 0];
  const max = Math.max(...buckets);
  const bw = width / buckets.length;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {buckets.map((c, i) => {
        const h = (c / max) * (height - 2);
        return (
          <rect key={i}
            x={i * bw + 0.5} y={height - h}
            width={bw - 1} height={h}
            fill="var(--accent-brand)" fillOpacity={i < 6 ? 0.85 : i < 12 ? 0.55 : 0.30}
            shapeRendering="crispEdges" />
        );
      })}
    </svg>
  );
}

function SSEPanel() {
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="live-dot" />
        <span style={{ fontSize: 13, color: "var(--fg)", fontWeight: 500 }}>Connected</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-subtle)" }} className="mono">38m 14s</span>
      </div>

      <div className="mono" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: "var(--surface-2)", border: "1px solid var(--border-inset)", borderRadius: 6, fontSize: 10, color: "var(--fg-muted)", overflow: "hidden" }}>
        <span style={{ color: "var(--fg-subtle)" }}>GET</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>/api/stream/live?station=tunis-campus</span>
        <button className="btn btn-ghost btn-xs" style={{ marginLeft: "auto", height: 18, width: 18, padding: 0, color: "var(--fg-subtle)" }}>
          <LI.Copy size={11} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingTop: 2 }}>
        <KV label="Throughput" value="2.4 KB/s" />
        <KV label="Cadence" value="4.2 msg/s" />
        <KV label="p50 latency" value="142 ms" />
        <KV label="p95 latency" value="312 ms" />
      </div>

      <div style={{ paddingTop: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>Latency distribution</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>0–500ms</span>
        </div>
        <LatencyHistogram />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4, borderTop: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Last heartbeat</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>14:32:08.221</span>
      </div>
    </div>
  );
}

function KV({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>{label}</span>
      <span className="mono" style={{ fontSize: 13, color: "var(--fg)" }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Live page (desktop, 1440×900)
// ─────────────────────────────────────────────────────────────
function LiveDesktop() {
  const tempSeries     = genSeries({ seed: 42,  base: 23.4,  amp: 1.4, smoothing: 0.20, n: 120 });
  const humiditySeries = genSeries({ seed: 211, base: 64.0,  amp: 3.2, smoothing: 0.22, n: 120 });
  const pressureSeries = genSeries({ seed: 911, base: 1013,  amp: 0.6, smoothing: 0.14, n: 120 });
  const aqiSeries      = genSeries({ seed: 31,  base: 38,    amp: 4,   smoothing: 0.28, n: 120 });

  return (
    <div className="wh-root" style={{ display: "flex", flexDirection: "column", width: 1440, height: 900, overflow: "hidden" }} data-screen-label="Live · Desktop">
      <TopbarLive />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidebarLive />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", gap: 16, overflow: "hidden", minWidth: 0 }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.2 }}>Live stream</h1>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, padding: "1px 7px", border: "1px solid var(--border-subtle)", borderRadius: 999, color: "var(--sev-success)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sev-success)" }} />
                  Streaming
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)" }}>since 13:54:12</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                Sub-second SSE · Tunis-Campus · Rooftop Block A · interpolated every 250ms
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", border: "1px solid var(--border-subtle)", borderRadius: 8, overflow: "hidden", height: 28 }}>
                {["5m", "15m", "1h"].map((w, i) => (
                  <button key={w}
                    className="mono"
                    style={{
                      border: 0, padding: "0 10px", height: "100%",
                      background: w === "5m" ? "var(--surface-2)" : "transparent",
                      color: w === "5m" ? "var(--fg)" : "var(--fg-muted)",
                      fontFamily: "inherit", fontSize: 12, cursor: "pointer",
                      borderRight: i < 2 ? "1px solid var(--border-subtle)" : "none",
                    }}>{w}</button>
                ))}
              </div>
              <button className="btn btn-outline btn-xs"><LI.Pause size={11} /> Pause</button>
              <button className="btn btn-outline btn-xs"><LI.Download size={11} /> Snapshot</button>
              <button className="btn btn-ghost btn-xs" style={{ width: 24, padding: 0 }}>
                <LI.More size={13} />
              </button>
            </div>
          </div>

          {/* Body: 2×2 charts (left, flex) + right rail (290px) */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 290px", gap: 16, flex: 1, minHeight: 0 }}>
            {/* Charts grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 12, minHeight: 0 }}>
              <LiveChartCard
                icon={LI.Thermo} color="var(--m-temp)" label="Temperature"
                value="23.41" unit="°C"
                delta="0.6°" deltaDir="up"
                data={tempSeries} precision={1}
                lastUpdate="14:32:08.221"
              />
              <LiveChartCard
                icon={LI.Droplet} color="var(--m-humidity)" label="Humidity"
                value="64.2" unit="%"
                delta="1.4" deltaDir="down"
                data={humiditySeries} precision={1}
                lastUpdate="14:32:07.890"
              />
              <LiveChartCard
                icon={LI.Gauge} color="var(--m-pressure)" label="Pressure"
                value="1013.04" unit="hPa"
                delta="0.3" deltaDir="down"
                data={pressureSeries} precision={2}
                lastUpdate="14:32:07.555"
              />
              <LiveChartCard
                icon={LI.Wind} color="var(--m-aqi)" label="Air quality"
                value="38" unit="AQI"
                delta="1" deltaDir="down"
                data={aqiSeries} precision={0}
                lastUpdate="14:32:07.220"
                statusText="Good"
              />
            </div>

            {/* Right rail */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
              <SSEPanel />
              <StreamTape />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { LiveDesktop });
