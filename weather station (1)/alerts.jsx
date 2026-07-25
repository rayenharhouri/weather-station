// alerts.jsx — WeatherHub Alerts page (desktop)
// Dense list (left) + selected-incident detail panel (right).
// State tabs · severity filter chips · ack/resolve flow · timeline.

const { useState: useStateAl } = React;

// ─────────────────────────────────────────────────────────────
//  Icons
// ─────────────────────────────────────────────────────────────
const SVL2 = ({ size = 16, sw = 1.5, children, style, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);
const ALI = {
  Dashboard: (p) => <SVL2 {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="14" width="7" height="7"/></SVL2>,
  Activity:  (p) => <SVL2 {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></SVL2>,
  Line:      (p) => <SVL2 {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></SVL2>,
  Trend:     (p) => <SVL2 {...p}><path d="M22 7 13.5 15.5 9 11 2 18"/><path d="M16 7h6v6"/></SVL2>,
  Bell:      (p) => <SVL2 {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></SVL2>,
  BellOff:   (p) => <SVL2 {...p}><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.7 4.7 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/></SVL2>,
  Shield:    (p) => <SVL2 {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></SVL2>,
  Tower:     (p) => <SVL2 {...p}><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8a6.14 6.14 0 0 1 .8 7.4"/><path d="M19.1 1.9a10.04 10.04 0 0 1 0 14.2"/><path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/></SVL2>,
  Settings:  (p) => <SVL2 {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SVL2>,
  Chevron:   (p) => <SVL2 {...p}><path d="m6 9 6 6 6-6"/></SVL2>,
  ChevronR:  (p) => <SVL2 {...p}><path d="m9 18 6-6-6-6"/></SVL2>,
  ArrowR:    (p) => <SVL2 {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></SVL2>,
  ArrowUpR:  (p) => <SVL2 {...p}><path d="M7 17 17 7"/><path d="M7 7h10v10"/></SVL2>,
  Search:    (p) => <SVL2 {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></SVL2>,
  Filter:    (p) => <SVL2 {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></SVL2>,
  Plus:      (p) => <SVL2 {...p}><path d="M5 12h14"/><path d="M12 5v14"/></SVL2>,
  X:         (p) => <SVL2 {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></SVL2>,
  Check:     (p) => <SVL2 {...p}><path d="M20 6 9 17l-5-5"/></SVL2>,
  Clock:     (p) => <SVL2 {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></SVL2>,
  User:      (p) => <SVL2 {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></SVL2>,
  More:      (p) => <SVL2 {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></SVL2>,
  Download:  (p) => <SVL2 {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></SVL2>,
  Link:      (p) => <SVL2 {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></SVL2>,
  Edit:      (p) => <SVL2 {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"/></SVL2>,
  Pin:       (p) => <SVL2 {...p}><line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></SVL2>,
  Gauge:     (p) => <SVL2 {...p}><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></SVL2>,
  Droplet:   (p) => <SVL2 {...p}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5-2 1.6-3 3.5-3 5.5a7 7 0 0 0 7 7z"/></SVL2>,
  Thermo:    (p) => <SVL2 {...p}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></SVL2>,
  Wind:      (p) => <SVL2 {...p}><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></SVL2>,
  Battery:   (p) => <SVL2 {...p}><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></SVL2>,
  Signal:    (p) => <SVL2 {...p}><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></SVL2>,
};

// Severity shape primitives
const SevA = {
  Info: ({ size = 16, color = "var(--sev-info)" }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block", flexShrink: 0 }}>
      <circle cx="8" cy="8" r="3.6" fill={color} />
    </svg>
  ),
  Warn: ({ size = 16, color = "var(--sev-warn)" }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block", flexShrink: 0 }}>
      <polygon points="8,2.6 13.6,13 2.4,13" fill={color} />
    </svg>
  ),
  Critical: ({ size = 16, color = "var(--sev-critical)" }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block", flexShrink: 0 }}>
      <polygon points="8,2.4 13.6,8 8,13.6 2.4,8" fill={color} />
    </svg>
  ),
};
const sevShape = { info: SevA.Info, warn: SevA.Warn, critical: SevA.Critical };
const sevColor = { info: "var(--sev-info)", warn: "var(--sev-warn)", critical: "var(--sev-critical)" };

// ─────────────────────────────────────────────────────────────
//  App shell
// ─────────────────────────────────────────────────────────────
function SidebarL2() {
  const items = [
    { icon: ALI.Dashboard, label: "Dashboard" },
    { icon: ALI.Activity,  label: "Live" },
    { icon: ALI.Line,      label: "Analytics" },
    { icon: ALI.Trend,     label: "Forecasts" },
    { icon: ALI.Bell,      label: "Alerts", badge: "3", active: true },
    { icon: ALI.Shield,    label: "Integrity" },
    { icon: ALI.Tower,     label: "Stations", badge: "12" },
    { icon: ALI.Settings,  label: "Settings" },
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
          <div key={it.label} className={`nav-item${it.active ? " active" : ""}`}>
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

function TopbarL2() {
  return (
    <header style={{ height: 56, display: "flex", alignItems: "center", gap: 16, padding: "0 24px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg)" }}>
      <button className="btn btn-outline" style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}>
        <ALI.Tower size={13} />
        <span style={{ fontSize: 13, color: "var(--fg-muted)", marginLeft: 2 }}>Station</span>
        <span style={{ fontSize: 13, color: "var(--fg)", marginLeft: 6 }}>All stations</span>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 6 }} className="mono">12</span>
        <ALI.Chevron size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-subtle)", fontSize: 12 }}>
        <span>All stations</span><ALI.ChevronR size={11} /><span style={{ color: "var(--fg-muted)" }}>Alerts</span>
      </div>
      <div style={{ flex: 1 }} />
      <button className="btn btn-outline" style={{ height: 32, width: 220, justifyContent: "space-between", color: "var(--fg-subtle)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><ALI.Search size={13} /><span style={{ fontSize: 13 }}>Search stations, alerts…</span></span>
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
//  Sample alert data + breach sparkline generator
// ─────────────────────────────────────────────────────────────
function makeBreach({ baseline, breachStart, breachLength, peak, len = 48, noise = 0.02 }) {
  return Array.from({ length: len }, (_, i) => {
    if (i < breachStart) return baseline + (Math.sin(i * 0.4) * baseline * noise);
    const t = i - breachStart;
    if (t > breachLength) return baseline + (Math.cos(i * 0.3) * baseline * noise);
    const x = t / breachLength;
    const lobe = Math.sin(x * Math.PI);
    return baseline + (peak - baseline) * lobe + (Math.sin(i * 0.5) * baseline * noise);
  });
}

const ALERTS = [
  {
    id: "a-7401",
    severity: "critical",
    title: "Barometric pressure drop",
    metric: "pressure",
    metricColor: "var(--m-pressure)",
    metricIcon: ALI.Gauge,
    rule: "ΔP > 6.0 hPa over 30m",
    observed: "ΔP 6.4 hPa",
    station: "Tunis-Campus",
    sublocation: "Rooftop · Block A",
    triggered: "12:04:11",
    duration: "2h 28m",
    state: "firing",
    sparkline: makeBreach({ baseline: 1014, breachStart: 16, breachLength: 14, peak: 1007, len: 48, noise: 0.0003 }),
    threshold: 1008,
    threshDir: "below",
    assignee: null,
    timeline: [
      { ts: "12:04:11", kind: "trigger",  text: "Triggered · ΔP 6.4 hPa over 30m" },
      { ts: "12:05:42", kind: "notify",   text: "Notified · email · slack #ops" },
      { ts: "12:18:30", kind: "escalate", text: "Auto-escalated to critical (sustained > 15m)" },
      { ts: "Now",      kind: "live",     text: "Still firing · ΔP holding at −5.9 hPa" },
    ],
    related: ["a-7398"],
  },
  {
    id: "a-7430",
    severity: "warn",
    title: "AQI above warning threshold",
    metric: "aqi",
    metricColor: "var(--m-aqi)",
    metricIcon: ALI.Wind,
    rule: "AQI > 80 sustained 5m",
    observed: "AQI 82",
    station: "Tunis-Campus",
    sublocation: "Rooftop · Block A",
    triggered: "14:21:08",
    duration: "11m",
    state: "firing",
    sparkline: makeBreach({ baseline: 38, breachStart: 28, breachLength: 18, peak: 86, len: 48, noise: 0.04 }),
    threshold: 80,
    threshDir: "above",
    assignee: null,
  },
  {
    id: "a-7411",
    severity: "info",
    title: "Sensor RSSI degraded",
    metric: "rssi",
    metricColor: "var(--m-rssi)",
    metricIcon: ALI.Signal,
    rule: "RSSI < −75 dBm sustained 10m",
    observed: "−86 dBm",
    station: "El Khadra",
    sublocation: "Field 2",
    triggered: "13:58:42",
    duration: "33m",
    state: "acked",
    ackedBy: "YA",
    ackedAt: "14:02",
    sparkline: makeBreach({ baseline: -68, breachStart: 18, breachLength: 30, peak: -88, len: 48, noise: 0.02 }),
    threshold: -75,
    threshDir: "below",
  },
  {
    id: "a-7388",
    severity: "warn",
    title: "Battery low",
    metric: "battery",
    metricColor: "var(--m-battery)",
    metricIcon: ALI.Battery,
    rule: "Battery < 20%",
    observed: "17%",
    station: "ENIT-North",
    sublocation: "Mast 1",
    triggered: "08:42:09",
    duration: "5h 50m",
    state: "acked",
    ackedBy: "MJ",
    ackedAt: "09:14",
    sparkline: makeBreach({ baseline: 28, breachStart: 18, breachLength: 30, peak: 14, len: 48, noise: 0.03 }),
    threshold: 20,
    threshDir: "below",
  },
  {
    id: "a-7340",
    severity: "critical",
    title: "Sensor offline",
    metric: "rssi",
    metricColor: "var(--m-rssi)",
    metricIcon: ALI.Signal,
    rule: "No heartbeat for 5m",
    observed: "Last seen 8h 18m ago",
    station: "Lac-2",
    sublocation: "Embankment B",
    triggered: "06:14:00",
    duration: "8h 18m",
    state: "firing",
    sparkline: makeBreach({ baseline: -65, breachStart: 8, breachLength: 4, peak: -120, len: 48, noise: 0.05 }),
    threshold: -100,
    threshDir: "below",
  },
  {
    id: "a-7298",
    severity: "info",
    title: "Rain rate spike",
    metric: "rainfall",
    metricColor: "var(--m-rainfall)",
    metricIcon: ALI.Droplet,
    rule: "Rain > 3 mm/10m",
    observed: "4.2 mm",
    station: "INSAT",
    sublocation: "Block C",
    triggered: "11:30:18",
    duration: "1h 32m",
    state: "resolved",
    resolvedBy: "MJ",
    resolvedAt: "13:02",
    sparkline: makeBreach({ baseline: 0, breachStart: 18, breachLength: 14, peak: 4.6, len: 48, noise: 0.4 }),
    threshold: 3,
    threshDir: "above",
  },
  {
    id: "a-7286",
    severity: "warn",
    title: "Humidity drift",
    metric: "humidity",
    metricColor: "var(--m-humidity)",
    metricIcon: ALI.Droplet,
    rule: "Δhumidity > 12% over 1h",
    observed: "Δ 14.2%",
    station: "El Khadra",
    sublocation: "Field 2",
    triggered: "09:15:01",
    duration: "3h 12m",
    state: "resolved",
    resolvedBy: "Auto",
    resolvedAt: "12:27",
    sparkline: makeBreach({ baseline: 58, breachStart: 6, breachLength: 28, peak: 78, len: 48, noise: 0.03 }),
    threshold: 70,
    threshDir: "above",
  },
];

// ─────────────────────────────────────────────────────────────
//  Breach sparkline (with threshold line + breach fill)
// ─────────────────────────────────────────────────────────────
function BreachSparkline({ data, color, threshold, threshDir, width = 120, height = 32, showFill = true }) {
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const all = [...data, threshold];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const rng = (max - min) || 1;
  const xToPx = (i) => pad + (i / (data.length - 1)) * innerW;
  const yToPx = (v) => pad + (1 - (v - min) / rng) * innerH;
  const tY = yToPx(threshold);

  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${xToPx(i).toFixed(1)} ${yToPx(v).toFixed(1)}`).join(" ");

  // breach fill: only where data exceeds threshold (above or below depending on threshDir)
  const breachFill = (() => {
    const above = threshDir === "above";
    const segments = [];
    let cur = null;
    data.forEach((v, i) => {
      const inBreach = above ? v > threshold : v < threshold;
      if (inBreach) {
        if (!cur) cur = [];
        cur.push([xToPx(i), yToPx(v)]);
      } else if (cur) { segments.push(cur); cur = null; }
    });
    if (cur) segments.push(cur);
    return segments.map(seg => {
      if (seg.length < 2) return "";
      const top = seg.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
      const baseY = tY.toFixed(1);
      return top + ` L${seg[seg.length - 1][0].toFixed(1)} ${baseY} L${seg[0][0].toFixed(1)} ${baseY} Z`;
    }).join(" ");
  })();

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <line x1={pad} y1={tY} x2={width - pad} y2={tY}
        stroke={color} strokeOpacity="0.4" strokeWidth="1"
        strokeDasharray="3 3" />
      {showFill && breachFill && <path d={breachFill} fill={color} fillOpacity="0.22" />}
      <path d={line} stroke={color} strokeWidth="1.4" fill="none"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
//  Status pill (firing / acked / resolved)
// ─────────────────────────────────────────────────────────────
function StatusPill({ state, severity }) {
  if (state === "firing") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        height: 20, padding: "0 8px", borderRadius: 999,
        border: `1px solid ${sevColor[severity]}`,
        background: `color-mix(in oklch, ${sevColor[severity]} 14%, transparent)`,
        color: sevColor[severity], fontSize: 11, fontWeight: 500,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: sevColor[severity] }} />
        Firing
      </span>
    );
  }
  if (state === "acked") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        height: 20, padding: "0 8px", borderRadius: 999,
        border: "1px solid var(--border-hover)",
        color: "var(--fg-muted)", fontSize: 11, fontWeight: 500,
      }}>
        <ALI.Check size={11} /> Acked
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      height: 20, padding: "0 8px", borderRadius: 999,
      border: "1px solid var(--border-subtle)",
      color: "var(--fg-subtle)", fontSize: 11, fontWeight: 500,
    }}>
      <ALI.Check size={11} /> Resolved
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
//  Alert row (list)
// ─────────────────────────────────────────────────────────────
function AlertRowDense({ alert, selected, onSelect }) {
  const Shape = sevShape[alert.severity];
  const c = sevColor[alert.severity];
  const dim = alert.state === "resolved";
  return (
    <div onClick={onSelect} style={{
      display: "grid",
      gridTemplateColumns: "4px 22px minmax(0, 1fr) 130px 130px 120px 36px",
      alignItems: "center", gap: 14,
      padding: "0 16px 0 0",
      height: 64,
      borderBottom: "1px solid var(--border-subtle)",
      background: selected ? "var(--surface-2)" : "transparent",
      cursor: "pointer",
      transition: "background 120ms linear",
      opacity: dim ? 0.65 : 1,
    }}>
      {/* Severity stripe */}
      <span style={{ width: 4, height: "100%", background: c, opacity: selected ? 1 : 0.7 }} />

      {/* Shape */}
      <span style={{ display: "flex", justifyContent: "center" }}><Shape /></span>

      {/* Title + threshold + metric */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13.5, color: "var(--fg)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {alert.title}
          </span>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)", padding: "1px 5px", border: "1px solid var(--border-subtle)", borderRadius: 3, flexShrink: 0 }}>
            {alert.id}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-subtle)", fontSize: 11.5 }}>
          <span style={{ color: alert.metricColor, display: "flex" }}><alert.metricIcon size={11} /></span>
          <span className="mono">{alert.rule}</span>
          <span style={{ color: "var(--fg-muted)" }}>·</span>
          <span className="mono" style={{ color: "var(--fg)" }}>{alert.observed}</span>
        </div>
      </div>

      {/* Station */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{alert.station}</span>
        <span style={{ fontSize: 10.5, color: "var(--fg-subtle)" }}>{alert.sublocation}</span>
      </div>

      {/* Triggered + duration */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span className="mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>{alert.triggered}</span>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-subtle)" }}>for {alert.duration}</span>
      </div>

      {/* Sparkline + state */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <BreachSparkline data={alert.sparkline} color={alert.metricColor}
          threshold={alert.threshold} threshDir={alert.threshDir} width={120} height={26} />
        <StatusPill state={alert.state} severity={alert.severity} />
      </div>

      {/* Actions */}
      <button className="btn btn-ghost btn-xs" style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}>
        <ALI.More size={14} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Selected alert detail panel
// ─────────────────────────────────────────────────────────────
function AlertDetail({ alert }) {
  const Shape = sevShape[alert.severity];
  const c = sevColor[alert.severity];

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Severity top stripe */}
      <div style={{ height: 3, background: c }} />

      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 18px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Shape size={18} />
          <span style={{ fontSize: 11, color: c, fontWeight: 600, letterSpacing: 0.06, textTransform: "uppercase" }}>{alert.severity}</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }}>{alert.id}</span>
          <span style={{ marginLeft: "auto" }}><StatusPill state={alert.state} severity={alert.severity} /></span>
          <button className="btn btn-ghost btn-xs" style={{ width: 24, height: 24, padding: 0 }}>
            <ALI.X size={13} />
          </button>
        </div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: -0.2 }}>{alert.title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-muted)", fontSize: 12 }}>
          <span style={{ color: alert.metricColor, display: "flex" }}><alert.metricIcon size={13} /></span>
          <span>{alert.station}</span>
          <span style={{ color: "var(--fg-subtle)" }}>·</span>
          <span>{alert.sublocation}</span>
        </div>
      </div>

      {/* Body scroll */}
      <div style={{ flex: 1, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14, overflow: "auto", minHeight: 0 }} className="no-scroll">
        {/* Threshold rule */}
        <Section label="Threshold rule">
          <div className="mono" style={{
            padding: "8px 10px", background: "var(--surface-2)", border: "1px solid var(--border-inset)",
            borderRadius: 6, fontSize: 11.5, color: "var(--fg)", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ color: alert.metricColor, fontWeight: 500 }}>{alert.metric}</span>
            <span style={{ flex: 1, color: "var(--fg-muted)" }}>{alert.rule}</span>
            <button className="btn btn-ghost btn-xs" style={{ height: 18, padding: "0 6px" }}>
              <ALI.Edit size={10} /> Edit
            </button>
          </div>
        </Section>

        {/* Breach chart */}
        <Section label="Observed value">
          <div className="card" style={{ padding: 12, background: "var(--bg)" }}>
            <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8 }}>
              <span className="mono" style={{ fontSize: 24, color: "var(--fg)", fontWeight: 500, letterSpacing: -0.4 }}>{alert.observed}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 10 }}>
                threshold {alert.threshDir === "above" ? ">" : "<"} {alert.threshold}
              </span>
              <span style={{ marginLeft: "auto" }} className="mono">
                <span style={{ fontSize: 10, color: "var(--fg-subtle)" }}>over</span>
                <span style={{ fontSize: 12, color: "var(--fg)", marginLeft: 4 }}>last 8h</span>
              </span>
            </div>
            <BreachSparkline data={alert.sparkline} color={alert.metricColor}
              threshold={alert.threshold} threshDir={alert.threshDir}
              width={320} height={80} />
          </div>
        </Section>

        {/* Timeline */}
        {alert.timeline && (
          <Section label="Timeline">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alert.timeline.map((ev, i) => {
                const isLive = ev.kind === "live";
                const eColor =
                  ev.kind === "trigger"  ? c :
                  ev.kind === "escalate" ? c :
                  ev.kind === "notify"   ? "var(--fg-muted)" :
                  isLive                 ? "var(--sev-success)" :
                  "var(--fg-muted)";
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "56px 14px 1fr", alignItems: "flex-start", gap: 8 }}>
                    <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-subtle)", paddingTop: 1 }}>{ev.ts}</span>
                    <span style={{ position: "relative", height: 14, display: "flex", justifyContent: "center" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: eColor, marginTop: 4 }} />
                      {i < alert.timeline.length - 1 && (
                        <span style={{ position: "absolute", top: 11, bottom: -8, width: 1, background: "var(--border-subtle)" }} />
                      )}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--fg)" }}>{ev.text}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Related (placeholder hint) */}
        {alert.related && alert.related.length > 0 && (
          <Section label="Related alerts">
            <div style={{ display: "flex", gap: 6 }}>
              {alert.related.map(r => (
                <span key={r} className="mono" style={{ fontSize: 11, padding: "2px 8px", border: "1px solid var(--border-subtle)", borderRadius: 4, color: "var(--fg-muted)" }}>
                  {r}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Integrity link */}
        <Section label="Integrity">
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <ALI.Shield size={13} style={{ color: "var(--sev-success)" }} />
            <span style={{ color: "var(--fg-muted)" }}>Breach data anchored in batch</span>
            <span className="mono" style={{ color: "var(--fg)" }}>4a2f…91c</span>
            <button className="btn btn-ghost btn-xs" style={{ marginLeft: "auto" }}>
              View <ALI.ArrowUpR size={11} />
            </button>
          </div>
        </Section>
      </div>

      {/* Action footer */}
      <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--border-subtle)" }}>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center", height: 32 }}>
          <ALI.Check size={13} /> Acknowledge
        </button>
        <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center", height: 32 }}>
          Resolve
        </button>
        <button className="btn btn-outline" style={{ width: 32, height: 32, padding: 0, justifyContent: "center" }}>
          <ALI.BellOff size={13} />
        </button>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.06, textTransform: "uppercase" }}>{label}</span>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Filter chips + state tabs
// ─────────────────────────────────────────────────────────────
function SeverityPill({ severity, count, active }) {
  const Shape = sevShape[severity];
  return (
    <button className="btn" style={{
      height: 28, padding: "0 10px", gap: 6,
      border: `1px solid ${active ? sevColor[severity] : "var(--border-subtle)"}`,
      background: active ? `color-mix(in oklch, ${sevColor[severity]} 12%, transparent)` : "transparent",
      color: active ? "var(--fg)" : "var(--fg-muted)",
    }}>
      <Shape size={12} />
      <span style={{ fontSize: 12 }}>{severity[0].toUpperCase() + severity.slice(1)}</span>
      <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>{count}</span>
    </button>
  );
}

function TabRow({ tabs, active }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border-subtle)" }}>
      {tabs.map(t => (
        <button key={t.key} style={{
          border: 0, padding: "10px 14px",
          background: "transparent",
          color: t.key === active ? "var(--fg)" : "var(--fg-muted)",
          fontFamily: "inherit", fontSize: 13, fontWeight: t.key === active ? 600 : 500,
          cursor: "pointer", position: "relative",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>
          <span>{t.label}</span>
          <span className="mono" style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 4,
            background: t.key === active ? "var(--surface-2)" : "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--fg-subtle)",
          }}>{t.count}</span>
          {t.key === active && (
            <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2, background: "var(--accent-brand)" }} />
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Page (desktop, 1440×900)
// ─────────────────────────────────────────────────────────────
function AlertsDesktop() {
  const selectedId = "a-7401";
  const selectedAlert = ALERTS.find(a => a.id === selectedId);
  const activeAlerts = ALERTS.filter(a => a.state !== "resolved");
  const resolvedAlerts = ALERTS.filter(a => a.state === "resolved");

  const sevCount = (sev, set) => set.filter(a => a.severity === sev).length;

  return (
    <div className="wh-root" style={{ display: "flex", flexDirection: "column", width: 1440, height: 900, overflow: "hidden" }} data-screen-label="Alerts · Desktop">
      <TopbarL2 />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidebarL2 />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", gap: 14, overflow: "hidden", minWidth: 0 }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.2 }}>Alerts</h1>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }}>v1.4</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <SevA.Critical size={11} />
                  <span style={{ color: "var(--sev-critical)" }}>{sevCount("critical", activeAlerts)} firing</span>
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                Threshold incidents across {ALERTS.length} stations · last triggered <span className="mono" style={{ color: "var(--fg-muted)" }}>14:21:08</span>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn btn-outline btn-xs"><ALI.Download size={11} /> Export</button>
              <button className="btn btn-outline btn-xs"><ALI.Edit size={11} /> Manage thresholds</button>
              <button className="btn btn-primary btn-xs"><ALI.Plus size={11} /> New rule</button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
            <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>Severity</span>
            <SeverityPill severity="critical" count={sevCount("critical", activeAlerts)} active />
            <SeverityPill severity="warn"     count={sevCount("warn", activeAlerts)}     active />
            <SeverityPill severity="info"     count={sevCount("info", activeAlerts)}     active />
            <span style={{ width: 1, height: 18, background: "var(--border-subtle)", margin: "0 4px" }} />
            <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>Scope</span>
            <button className="btn btn-outline btn-xs">
              <ALI.Tower size={11} /> All stations <ALI.Chevron size={11} style={{ opacity: 0.6 }} />
            </button>
            <button className="btn btn-outline btn-xs">
              All metrics <ALI.Chevron size={11} style={{ opacity: 0.6 }} />
            </button>
            <span style={{ width: 1, height: 18, background: "var(--border-subtle)", margin: "0 4px" }} />
            <button className="btn btn-outline btn-xs">
              <ALI.Clock size={11} /> Last 24h <ALI.Chevron size={11} style={{ opacity: 0.6 }} />
            </button>
            <button className="btn btn-ghost btn-xs"><ALI.Filter size={11} /> More filters</button>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--fg-subtle)" }}>
              <span>MTTA <span className="mono" style={{ color: "var(--fg)", marginLeft: 4 }}>4m 18s</span></span>
              <span>MTTR <span className="mono" style={{ color: "var(--fg)", marginLeft: 4 }}>42m 06s</span></span>
            </span>
          </div>

          {/* Body split */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 14, flex: 1, minHeight: 0 }}>
            {/* List card */}
            <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              {/* Tabs */}
              <TabRow active="active" tabs={[
                { key: "active",   label: "Active",   count: activeAlerts.length },
                { key: "resolved", label: "Resolved", count: resolvedAlerts.length },
                { key: "silenced", label: "Silenced", count: 0 },
                { key: "all",      label: "All",      count: ALERTS.length },
              ]} />

              {/* Column headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "4px 22px minmax(0, 1fr) 130px 130px 120px 36px",
                gap: 14,
                padding: "8px 16px 8px 0",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.06, textTransform: "uppercase",
              }}>
                <span />
                <span />
                <span>Alert</span>
                <span>Station</span>
                <span>Triggered</span>
                <span>Trend · state</span>
                <span />
              </div>

              {/* Rows */}
              <div style={{ flex: 1, overflow: "hidden" }}>
                {activeAlerts.map(a => (
                  <AlertRowDense key={a.id} alert={a} selected={a.id === selectedId} />
                ))}
                {/* Show one resolved at bottom to demonstrate dim treatment */}
                <AlertRowDense alert={resolvedAlerts[0]} selected={false} />
              </div>
            </div>

            {/* Detail panel */}
            <AlertDetail alert={selectedAlert} />
          </div>
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { AlertsDesktop });
