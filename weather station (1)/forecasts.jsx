// forecasts.jsx — WeatherHub Forecasts page (desktop)
// Focus metric (Temperature) with full 24h trajectory + confidence band
// + horizon callouts (+1h / +3h / +6h / +24h), compact strips for the
// rest, plus a model provenance panel.

const { useState: useStateFc } = React;

// ─────────────────────────────────────────────────────────────
//  Icons
// ─────────────────────────────────────────────────────────────
const SVF = ({ size = 16, sw = 1.5, children, style, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);
const FI = {
  Dashboard: (p) => <SVF {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="14" width="7" height="7"/></SVF>,
  Activity:  (p) => <SVF {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></SVF>,
  Line:      (p) => <SVF {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></SVF>,
  Trend:     (p) => <SVF {...p}><path d="M22 7 13.5 15.5 9 11 2 18"/><path d="M16 7h6v6"/></SVF>,
  Bell:      (p) => <SVF {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></SVF>,
  Shield:    (p) => <SVF {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></SVF>,
  Tower:     (p) => <SVF {...p}><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8a6.14 6.14 0 0 1 .8 7.4"/><path d="M19.1 1.9a10.04 10.04 0 0 1 0 14.2"/><path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/></SVF>,
  Settings:  (p) => <SVF {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SVF>,
  Thermo:    (p) => <SVF {...p}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></SVF>,
  Droplet:   (p) => <SVF {...p}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5-2 1.6-3 3.5-3 5.5a7 7 0 0 0 7 7z"/></SVF>,
  Gauge:     (p) => <SVF {...p}><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></SVF>,
  CloudRain: (p) => <SVF {...p}><path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.24"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></SVF>,
  Sun:       (p) => <SVF {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v1"/><path d="M12 20v1"/><path d="M3 12h1"/><path d="M20 12h1"/><path d="m18.36 5.64-.7.7"/><path d="m6.34 17.66-.7.7"/><path d="m5.64 5.64.7.7"/><path d="m17.66 17.66.7.7"/></SVF>,
  Wind:      (p) => <SVF {...p}><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></SVF>,
  Chevron:   (p) => <SVF {...p}><path d="m6 9 6 6 6-6"/></SVF>,
  ChevronR:  (p) => <SVF {...p}><path d="m9 18 6-6-6-6"/></SVF>,
  ArrowR:    (p) => <SVF {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></SVF>,
  Search:    (p) => <SVF {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></SVF>,
  Download:  (p) => <SVF {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></SVF>,
  Refresh:   (p) => <SVF {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></SVF>,
  Brain:     (p) => <SVF {...p}><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></SVF>,
  Info:      (p) => <SVF {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></SVF>,
  Check:     (p) => <SVF {...p}><path d="M20 6 9 17l-5-5"/></SVF>,
};

// ─────────────────────────────────────────────────────────────
//  App shell
// ─────────────────────────────────────────────────────────────
function SidebarF() {
  const items = [
    { icon: FI.Dashboard, label: "Dashboard" },
    { icon: FI.Activity,  label: "Live" },
    { icon: FI.Line,      label: "Analytics" },
    { icon: FI.Trend,     label: "Forecasts", active: true },
    { icon: FI.Bell,      label: "Alerts", badge: "3" },
    { icon: FI.Shield,    label: "Integrity" },
    { icon: FI.Tower,     label: "Stations", badge: "12" },
    { icon: FI.Settings,  label: "Settings" },
  ];
  return (
    <aside style={{ width: 240, height: "100%", borderRight: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", padding: "16px 12px", gap: 16, background: "var(--bg)" }}>
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
            <it.icon size={16} /><span>{it.label}</span>
            {it.badge && <span className="badge">{it.badge}</span>}
          </div>
        ))}
        <div style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.1, textTransform: "uppercase", padding: "16px 10px 6px" }}>Operations</div>
        {items.slice(4).map((it) => (
          <div key={it.label} className="nav-item">
            <it.icon size={16} /><span>{it.label}</span>
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

function TopbarF() {
  return (
    <header style={{ height: 56, display: "flex", alignItems: "center", gap: 16, padding: "0 24px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg)" }}>
      <button className="btn btn-outline" style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}>
        <FI.Tower size={13} />
        <span style={{ fontSize: 13, color: "var(--fg-muted)", marginLeft: 2 }}>Station</span>
        <span style={{ fontSize: 13, color: "var(--fg)", marginLeft: 6 }}>Tunis-Campus</span>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 6 }} className="mono">/12</span>
        <FI.Chevron size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-subtle)", fontSize: 12 }}>
        <span>Tunis-Campus</span><FI.ChevronR size={11} /><span style={{ color: "var(--fg-muted)" }}>Rooftop · Block A</span>
      </div>
      <div style={{ flex: 1 }} />
      <button className="btn btn-outline" style={{ height: 32, width: 220, justifyContent: "space-between", color: "var(--fg-subtle)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><FI.Search size={13} /><span style={{ fontSize: 13 }}>Search stations, alerts…</span></span>
        <span className="mono" style={{ fontSize: 10, padding: "1px 4px", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>⌘K</span>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", height: 32, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
        <span className="live-dot" />
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Live</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", paddingLeft: 6, borderLeft: "1px solid var(--border-subtle)" }}>SSE · 2.4 KB/s</span>
      </div>
      <button className="btn btn-ghost" style={{ height: 32, padding: 0, gap: 8 }}>
        <span style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, oklch(0.6 0.14 280), oklch(0.55 0.18 255))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>YA</span>
      </button>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
//  Data: historical 6h + forecast 24h, per metric
// ─────────────────────────────────────────────────────────────
function seedRandF(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Generates 24 historical (last 6h @ 15min) + 96 forecast (next 24h @ 15min) + ±confidence
function genForecast({ seed, peakHour = 14, min, max, noiseAmp = 0.5, sigmaBase = 0.6, sigmaGrowth = 0.04, dayOnly = false }) {
  const r = seedRandF(seed);
  const NOW = 14.5; // 14:30
  // produce values at hour offsets: -6 to +24, step 0.25 (15min). Total 121 points.
  const points = [];
  for (let i = 0; i < 121; i++) {
    const hourAbs = NOW - 6 + i * 0.25;
    const hourOfDay = ((hourAbs % 24) + 24) % 24;
    let baseValue;
    if (dayOnly) {
      if (hourOfDay < 6.5 || hourOfDay > 19.5) baseValue = 0;
      else {
        const dayPhase = ((hourOfDay - 6.5) / 13) * Math.PI;
        baseValue = Math.max(0, min + (max - min) * Math.sin(dayPhase));
      }
    } else {
      const phase = ((hourOfDay - peakHour) * Math.PI) / 12;
      const wave = (Math.cos(phase) + 1) / 2;
      baseValue = min + (max - min) * wave;
    }
    const noisedValue = baseValue + (r() - 0.5) * noiseAmp;
    const tFromNow = i - 24; // -24 (=-6h) to +96 (=+24h)
    const sigma = tFromNow <= 0 ? 0 : sigmaBase + sigmaGrowth * tFromNow * 0.25; // growing band
    points.push({ idx: i, tFromNow, value: noisedValue, sigma });
  }
  return points;
}

const FC = {
  temp:     genForecast({ seed: 42,  peakHour: 14, min: 18.5, max: 26.2, noiseAmp: 0.25, sigmaBase: 0.4, sigmaGrowth: 0.06 }),
  humidity: genForecast({ seed: 17,  peakHour: 4,  min: 52,   max: 71,   noiseAmp: 1.5,  sigmaBase: 1.5, sigmaGrowth: 0.18 }),
  pressure: genForecast({ seed: 99,  peakHour: 10, min: 1011, max: 1015, noiseAmp: 0.1,  sigmaBase: 0.2, sigmaGrowth: 0.04 }),
  rainfall: genForecast({ seed: 23,  peakHour: 19, min: 0,    max: 0.8,  noiseAmp: 0.05, sigmaBase: 0.1, sigmaGrowth: 0.06 }),
  light:    genForecast({ seed: 7,   min: 0,   max: 920,  noiseAmp: 20,  sigmaBase: 30,  sigmaGrowth: 1.2, dayOnly: true }),
  aqi:      genForecast({ seed: 5,   peakHour: 17, min: 32,   max: 48,   noiseAmp: 1.8,  sigmaBase: 1.5, sigmaGrowth: 0.20 }),
};

// horizon indices from "now" (index 24 in the array)
const HORIZONS = [
  { label: "+1h",  hours: 1,  idxOffset: 4 },
  { label: "+3h",  hours: 3,  idxOffset: 12 },
  { label: "+6h",  hours: 6,  idxOffset: 24 },
  { label: "+24h", hours: 24, idxOffset: 96 },
];

function horizonValuesFor(metricKey) {
  const data = FC[metricKey];
  const nowIdx = 24;
  const current = data[nowIdx].value;
  return HORIZONS.map(h => {
    const p = data[nowIdx + h.idxOffset];
    return {
      label: h.label,
      value: p.value,
      sigma: p.sigma,
      delta: p.value - current,
    };
  });
}

function trendDir(horizons) {
  const lastDelta = horizons[horizons.length - 1].delta;
  if (Math.abs(lastDelta) < 0.1) return "flat";
  return lastDelta > 0 ? "up" : "down";
}

const METRICS = [
  { key: "temp",     label: "Temperature", color: "var(--m-temp)",     unit: "°C",  precision: 1, icon: FI.Thermo },
  { key: "humidity", label: "Humidity",    color: "var(--m-humidity)", unit: "%",   precision: 0, icon: FI.Droplet },
  { key: "pressure", label: "Pressure",    color: "var(--m-pressure)", unit: "hPa", precision: 1, icon: FI.Gauge },
  { key: "rainfall", label: "Rainfall",    color: "var(--m-rainfall)", unit: "mm",  precision: 2, icon: FI.CloudRain },
  { key: "light",    label: "Light",       color: "var(--m-light)",    unit: "lx",  precision: 0, icon: FI.Sun },
  { key: "aqi",      label: "Air quality", color: "var(--m-aqi)",      unit: "AQI", precision: 0, icon: FI.Wind },
];

// ─────────────────────────────────────────────────────────────
//  Focus forecast chart (large, with confidence band + horizon markers)
// ─────────────────────────────────────────────────────────────
function FocusChart({ metric }) {
  const W = 824;
  const H = 220;
  const pad = { top: 22, right: 16, bottom: 24, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const data = FC[metric.key];
  const allVals = data.map(p => p.value);
  const allUpper = data.map(p => p.value + p.sigma * 1.5);
  const allLower = data.map(p => p.value - p.sigma * 1.5);
  const yMin = Math.min(...allLower) - 0.5;
  const yMax = Math.max(...allUpper) + 0.5;

  // x range: -6h to +24h, 121 points. now = idx 24.
  const xToPx = (i) => pad.left + (i / (data.length - 1)) * innerW;
  const yToPx = (v) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  // Split: idx 0-24 = history, 24-120 = forecast
  const histPath = data.slice(0, 25).map((p, i) =>
    `${i === 0 ? "M" : "L"}${xToPx(p.idx).toFixed(1)} ${yToPx(p.value).toFixed(1)}`).join(" ");
  const fcPath = data.slice(24).map((p, i) =>
    `${i === 0 ? "M" : "L"}${xToPx(p.idx).toFixed(1)} ${yToPx(p.value).toFixed(1)}`).join(" ");

  // Confidence band (forecast only)
  const bandUpper = data.slice(24).map((p, i) =>
    `${i === 0 ? "M" : "L"}${xToPx(p.idx).toFixed(1)} ${yToPx(p.value + p.sigma * 1.5).toFixed(1)}`).join(" ");
  const bandLower = data.slice(24).reverse().map((p, i) =>
    `L${xToPx(p.idx).toFixed(1)} ${yToPx(p.value - p.sigma * 1.5).toFixed(1)}`).join(" ");
  const band = bandUpper + " " + bandLower + " Z";

  const monoFont = "Geist Mono, ui-monospace, monospace";

  // y ticks
  const tickCount = 4;
  const yTicks = [];
  for (let i = 0; i <= tickCount; i++) yTicks.push(yMin + ((yMax - yMin) * i) / tickCount);

  // x ticks at every 6 hours
  const xTicks = [-6, 0, 6, 12, 18, 24];

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* Horizontal gridlines */}
      {yTicks.map((t, i) => {
        const y = yToPx(t);
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y}
              stroke="var(--border-subtle)" strokeWidth="1" shapeRendering="crispEdges" />
            <text x={pad.left - 6} y={y + 3} textAnchor="end"
              fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>
              {t.toFixed(metric.precision)}
            </text>
          </g>
        );
      })}

      {/* Now line (vertical) */}
      {(() => {
        const x = xToPx(24);
        return (
          <g>
            <line x1={x} y1={pad.top - 8} x2={x} y2={pad.top + innerH}
              stroke="var(--fg-muted)" strokeOpacity="0.6" strokeWidth="1"
              shapeRendering="crispEdges" />
            <g transform={`translate(${x - 16}, ${pad.top - 18})`}>
              <rect width="32" height="14" rx="3" fill="var(--surface-2)" stroke="var(--border-hover)" />
              <text x="16" y="10" textAnchor="middle" fill="var(--fg)" fontSize="9" fontFamily={monoFont}>NOW</text>
            </g>
          </g>
        );
      })()}

      {/* History line (muted) */}
      <path d={histPath} stroke="var(--fg-muted)" strokeOpacity="0.45"
        strokeWidth="1.5" fill="none" strokeDasharray="3 3"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Confidence band */}
      <path d={band} fill={metric.color} fillOpacity="0.12" />

      {/* Forecast line */}
      <path d={fcPath} stroke={metric.color} strokeWidth="1.6"
        fill="none" strokeLinejoin="round" strokeLinecap="round" />

      {/* Horizon markers + dots */}
      {HORIZONS.map(h => {
        const i = 24 + h.idxOffset;
        const p = data[i];
        const x = xToPx(i);
        const y = yToPx(p.value);
        return (
          <g key={h.label}>
            <line x1={x} y1={pad.top + innerH} x2={x} y2={y}
              stroke={metric.color} strokeOpacity="0.4" strokeWidth="1"
              strokeDasharray="2 3" />
            <circle cx={x} cy={y} r="3.5" fill={metric.color} />
            <circle cx={x} cy={y} r="6" fill={metric.color} fillOpacity="0.18" />
          </g>
        );
      })}

      {/* X axis labels */}
      {xTicks.map((h, i) => {
        const idx = 24 + h * 4;
        const x = xToPx(idx);
        const label = h === 0 ? "now" : (h > 0 ? `+${h}h` : `${h}h`);
        return (
          <text key={i} x={x} y={pad.top + innerH + 14} textAnchor="middle"
            fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>{label}</text>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
//  Focus card — wraps the chart with header + horizon callouts
// ─────────────────────────────────────────────────────────────
function FocusCard({ metric }) {
  const horizons = horizonValuesFor(metric.key);
  const data = FC[metric.key];
  const current = data[24].value;
  const dir = trendDir(horizons);
  const trendArrow = dir === "up" ? "↗" : dir === "down" ? "↘" : "→";

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: metric.color, display: "flex" }}><metric.icon size={20} /></span>
        <span style={{ fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>{metric.label}</span>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }}>Focus</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>Current</span>
          <span className="mono" style={{ fontSize: 22, color: "var(--fg)", fontWeight: 500, letterSpacing: -0.3, lineHeight: 1 }}>{current.toFixed(metric.precision)}</span>
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{metric.unit}</span>
          <span style={{ fontSize: 16, color: "var(--fg-muted)", marginLeft: 8 }}>{trendArrow}</span>
        </span>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <FocusChart metric={metric} />
      </div>

      {/* Horizon callouts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
        {horizons.map((h, i) => {
          const dDir = h.delta > 0.05 ? "up" : h.delta < -0.05 ? "down" : "flat";
          const dArrow = dDir === "up" ? "▲" : dDir === "down" ? "▼" : "▬";
          const dClass = dDir === "up" ? "up" : dDir === "down" ? "down" : "flat";
          return (
            <div key={h.label} style={{
              display: "flex", flexDirection: "column", gap: 4,
              padding: "0 16px",
              borderLeft: i > 0 ? "1px solid var(--border-subtle)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: metric.color }} />
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>{h.label}</span>
                <span className={`chip ${dClass}`} style={{ marginLeft: "auto" }}>
                  <span style={{ fontSize: 9 }}>{dArrow}</span>
                  <span>{h.delta >= 0 ? "+" : ""}{h.delta.toFixed(metric.precision)}</span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span className="mono" style={{ fontSize: 22, color: "var(--fg)", fontWeight: 500, letterSpacing: -0.3, lineHeight: 1 }}>
                  {h.value.toFixed(metric.precision)}
                </span>
                <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>{metric.unit}</span>
              </div>
              <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
                ± {h.sigma.toFixed(Math.max(metric.precision, 1))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Model provenance panel
// ─────────────────────────────────────────────────────────────
function ModelPanel() {
  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--accent-brand)", display: "flex" }}><FI.Brain size={16} /></span>
        <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Model</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--sev-success)", padding: "2px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sev-success)" }} />
          Healthy
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="mono" style={{ fontSize: 15, color: "var(--fg)" }}>arima-lstm</span>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>v2.3 · trained 3d ago · 8,640 obs</span>
      </div>

      {/* Skill */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 4, borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingTop: 8 }}>
          <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>Skill (CRPS)</span>
          <span className="mono" style={{ fontSize: 14, color: "var(--fg)" }}>0.87</span>
        </div>
        <div style={{ height: 4, background: "var(--surface-2)", border: "1px solid var(--border-inset)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: "87%", height: "100%", background: "var(--accent-brand)" }} />
        </div>
      </div>

      {/* MAE per metric */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase", marginBottom: 4 }}>MAE · 24h horizon</span>
        {[
          { k: "Temp",  v: "±0.8",  u: "°", c: "var(--m-temp)" },
          { k: "Humid.",v: "±2.4",  u: "%", c: "var(--m-humidity)" },
          { k: "Press.",v: "±0.4",  u: "hPa", c: "var(--m-pressure)" },
          { k: "Rain",  v: "±0.3",  u: "mm",  c: "var(--m-rainfall)" },
          { k: "Light", v: "±42",   u: "lx",  c: "var(--m-light)" },
          { k: "AQI",   v: "±3.1",  u: "",    c: "var(--m-aqi)" },
        ].map(m => (
          <div key={m.k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
            <span style={{ width: 6, height: 6, borderRadius: 1, background: m.c }} />
            <span style={{ color: "var(--fg-muted)", width: 50 }}>{m.k}</span>
            <span className="mono" style={{ color: "var(--fg)", marginLeft: "auto" }}>{m.v}</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)", width: 26, textAlign: "left" }}>{m.u}</span>
          </div>
        ))}
      </div>

      {/* Refresh */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Next refresh</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--fg)" }}>4m 12s</span>
        </div>
        <button className="btn btn-outline btn-xs" style={{ width: "100%", justifyContent: "center" }}>
          <FI.Refresh size={11} /> Recompute now
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Compact forecast strip (used for non-focus metrics)
// ─────────────────────────────────────────────────────────────
function ForecastStrip({ metric, isFocus, onFocus }) {
  const data = FC[metric.key];
  const current = data[24].value;
  const horizons = horizonValuesFor(metric.key);
  const dir = trendDir(horizons);
  const trendArrow = dir === "up" ? "↗" : dir === "down" ? "↘" : "→";

  // sparkline (forecast only, 96 pts)
  const fc = data.slice(24);
  const W = 360;
  const H = 36;
  const pad = 2;
  const min = Math.min(...fc.map(p => p.value - p.sigma * 1.5));
  const max = Math.max(...fc.map(p => p.value + p.sigma * 1.5));
  const rng = (max - min) || 1;
  const xToPx = (i) => pad + (i / (fc.length - 1)) * (W - pad * 2);
  const yToPx = (v) => pad + (1 - (v - min) / rng) * (H - pad * 2);

  const linePath = fc.map((p, i) => `${i === 0 ? "M" : "L"}${xToPx(i).toFixed(1)} ${yToPx(p.value).toFixed(1)}`).join(" ");
  const upperPath = fc.map((p, i) => `${i === 0 ? "M" : "L"}${xToPx(i).toFixed(1)} ${yToPx(p.value + p.sigma * 1.2).toFixed(1)}`).join(" ");
  const lowerPath = fc.slice().reverse().map((p, i) => `L${xToPx(fc.length - 1 - i).toFixed(1)} ${yToPx(p.value - p.sigma * 1.2).toFixed(1)}`).join(" ");
  const band = upperPath + " " + lowerPath + " Z";

  return (
    <div onClick={onFocus} style={{
      display: "grid",
      gridTemplateColumns: "140px 360px 1fr 36px",
      alignItems: "center", gap: 16,
      padding: "10px 16px",
      borderBottom: "1px solid var(--border-subtle)",
      cursor: isFocus ? "default" : "pointer",
      background: isFocus ? "var(--surface-2)" : "transparent",
      transition: "background 120ms linear",
    }}>
      {/* Label + current */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: metric.color, display: "flex" }}><metric.icon size={14} /></span>
          <span style={{ fontSize: 13, color: "var(--fg)", fontWeight: 500 }}>{metric.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, paddingLeft: 22 }}>
          <span className="mono" style={{ fontSize: 14, color: "var(--fg-muted)" }}>{current.toFixed(metric.precision)}</span>
          <span style={{ fontSize: 10, color: "var(--fg-subtle)" }}>{metric.unit}</span>
          <span style={{ fontSize: 10, color: "var(--fg-subtle)", marginLeft: 4 }}>now</span>
        </div>
      </div>

      {/* Sparkline (forecast only, with confidence band) */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <path d={band} fill={metric.color} fillOpacity="0.10" />
        <path d={linePath} stroke={metric.color} strokeWidth="1.5"
          fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {/* Horizon dots */}
        {HORIZONS.map((h, i) => {
          const idx = h.idxOffset - 1;
          const x = xToPx(idx);
          const y = yToPx(fc[idx].value);
          return (
            <g key={i}>
              <line x1={x} y1={pad} x2={x} y2={H - pad}
                stroke={metric.color} strokeOpacity="0.25"
                strokeDasharray="1 2" strokeWidth="1" />
              <circle cx={x} cy={y} r="2.2" fill={metric.color} />
            </g>
          );
        })}
      </svg>

      {/* Horizon values */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingLeft: 8 }}>
        {horizons.map((h, i) => {
          const dDir = h.delta > 0.05 ? "up" : h.delta < -0.05 ? "down" : "flat";
          const dColor = dDir === "up" ? "var(--sev-success)" : dDir === "down" ? "var(--sev-critical)" : "var(--fg-subtle)";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--fg-subtle)", letterSpacing: 0.04 }}>{h.label}</span>
              <span className="mono" style={{ fontSize: 13, color: "var(--fg)" }}>{h.value.toFixed(metric.precision)}</span>
              <span className="mono" style={{ fontSize: 10, color: dColor }}>
                {h.delta >= 0 ? "+" : ""}{h.delta.toFixed(metric.precision)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Trend arrow */}
      <span style={{ fontSize: 18, color: "var(--fg-muted)", textAlign: "center" }}>{trendArrow}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Forecasts page (desktop, 1440×900)
// ─────────────────────────────────────────────────────────────
function ForecastsDesktop() {
  const focusKey = "temp";
  const focusMetric = METRICS.find(m => m.key === focusKey);
  const others = METRICS.filter(m => m.key !== focusKey);

  return (
    <div className="wh-root" style={{ display: "flex", flexDirection: "column", width: 1440, height: 900, overflow: "hidden" }} data-screen-label="Forecasts · Desktop">
      <TopbarF />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidebarF />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", gap: 14, overflow: "hidden", minWidth: 0 }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.2 }}>Forecasts</h1>
                <span style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }} className="mono">v1.4</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--sev-success)" }}>
                  <FI.Check size={11} />
                  <span>Updated 14:30:00</span>
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                Short-horizon predictions · +1h / +3h / +6h / +24h · arima-lstm v2.3
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", border: "1px solid var(--border-subtle)", borderRadius: 8, overflow: "hidden", height: 28 }}>
                {[
                  { l: "+1h", a: false },
                  { l: "+3h", a: false },
                  { l: "+6h", a: false },
                  { l: "+24h", a: true },
                ].map((o, i, arr) => (
                  <button key={o.l} className="mono" style={{
                    border: 0, padding: "0 10px", height: "100%",
                    background: o.a ? "var(--surface-2)" : "transparent",
                    color: o.a ? "var(--fg)" : "var(--fg-muted)",
                    fontFamily: "inherit", fontSize: 12, cursor: "pointer",
                    borderRight: i < arr.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  }}>{o.l}</button>
                ))}
              </div>
              <button className="btn btn-outline btn-xs"><FI.Refresh size={11} /> Refresh</button>
              <button className="btn btn-outline btn-xs"><FI.Download size={11} /> Export</button>
            </div>
          </div>

          {/* Focus + model row */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 280px", gap: 14, height: 388, minHeight: 388 }}>
            <FocusCard metric={focusMetric} />
            <ModelPanel />
          </div>

          {/* Strips card */}
          <div className="card" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>Other metrics</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 8 }}>· next 24h with ±1.2σ band</span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18, fontSize: 11, color: "var(--fg-subtle)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 2, background: "var(--fg-muted)" }} /> forecast
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 8, background: "var(--fg-muted)", opacity: 0.18, borderRadius: 1 }} /> ±1.2σ
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--fg-muted)" }} /> horizon
                </span>
              </span>
            </div>
            {others.map((m, i) => (
              <ForecastStrip key={m.key} metric={m} isFocus={false} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { ForecastsDesktop });
