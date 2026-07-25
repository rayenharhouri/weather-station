// dashboard.jsx — WeatherHub flight-deck dashboard
// Both desktop (1440×900) and mobile (390×1280) variants live in this file.

const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────
//  Icons (Lucide-aligned, 1.5px stroke)
// ─────────────────────────────────────────────────────────────
const SV = ({ size = 16, sw = 1.5, children, style, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const I = {
  Dashboard: (p) => <SV {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="14" width="7" height="7"/></SV>,
  Activity:  (p) => <SV {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></SV>,
  Line:      (p) => <SV {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></SV>,
  Trend:     (p) => <SV {...p}><path d="M22 7 13.5 15.5 9 11 2 18"/><path d="M16 7h6v6"/></SV>,
  Bell:      (p) => <SV {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></SV>,
  Shield:    (p) => <SV {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></SV>,
  Tower:     (p) => <SV {...p}><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8a6.14 6.14 0 0 1 .8 7.4"/><path d="M19.1 1.9a10.04 10.04 0 0 1 0 14.2"/><path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/></SV>,
  Settings:  (p) => <SV {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SV>,
  CloudSun:  (p) => <SV {...p}><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.95 12.65a4 4 0 0 0-5.93-4.13"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6z"/></SV>,
  Droplet:   (p) => <SV {...p}><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5-2 1.6-3 3.5-3 5.5a7 7 0 0 0 7 7z"/></SV>,
  Gauge:     (p) => <SV {...p}><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></SV>,
  CloudRain: (p) => <SV {...p}><path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.24"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></SV>,
  Sun:       (p) => <SV {...p}><circle cx="12" cy="12" r="4"/><path d="M12 3v1"/><path d="M12 20v1"/><path d="M3 12h1"/><path d="M20 12h1"/><path d="m18.36 5.64-.7.7"/><path d="m6.34 17.66-.7.7"/><path d="m5.64 5.64.7.7"/><path d="m17.66 17.66.7.7"/></SV>,
  Wind:      (p) => <SV {...p}><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></SV>,
  Cpu:       (p) => <SV {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></SV>,
  Chevron:   (p) => <SV {...p}><path d="m6 9 6 6 6-6"/></SV>,
  ChevronR:  (p) => <SV {...p}><path d="m9 18 6-6-6-6"/></SV>,
  Copy:      (p) => <SV {...p}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></SV>,
  ArrowUp:   (p) => <SV {...p}><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></SV>,
  ArrowDown: (p) => <SV {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></SV>,
  ArrowR:    (p) => <SV {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></SV>,
  ArrowUpR:  (p) => <SV {...p}><path d="M7 17 17 7"/><path d="M7 7h10v10"/></SV>,
  Menu:      (p) => <SV {...p}><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></SV>,
  Search:    (p) => <SV {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></SV>,
  Plus:      (p) => <SV {...p}><path d="M5 12h14"/><path d="M12 5v14"/></SV>,
  Check:     (p) => <SV {...p}><path d="M20 6 9 17l-5-5"/></SV>,
  X:         (p) => <SV {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></SV>,
};

// Severity shape primitives (16px default, filled, no outline)
const Sev = {
  Info: ({ size = 14, color = "var(--sev-info)" }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block", flexShrink: 0 }}>
      <circle cx="8" cy="8" r="3.4" fill={color} />
    </svg>
  ),
  Warn: ({ size = 14, color = "var(--sev-warn)" }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block", flexShrink: 0 }}>
      <polygon points="8,2.6 13.6,13 2.4,13" fill={color} />
    </svg>
  ),
  Critical: ({ size = 14, color = "var(--sev-critical)" }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: "block", flexShrink: 0 }}>
      <polygon points="8,2.4 13.6,8 8,13.6 2.4,8" fill={color} />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
//  Sparkline (line-only or with 8% area fill)
// ─────────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 200, height = 36, fill = true, sw = 1.5 }) {
  const pad = 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = (max - min) || 1;
  const step = (width - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y];
  });
  const line = pts.map(([x, y], i) =>
    `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const area = line + ` L${(width - pad).toFixed(1)} ${(height - pad).toFixed(1)} L${pad} ${(height - pad).toFixed(1)} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {fill && <path d={area} fill={color} fillOpacity={0.10} />}
      <path d={line} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2" fill={color} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
//  Forecast micro-strip (4 horizons × value + bar + dir arrow)
// ─────────────────────────────────────────────────────────────
function ForecastRow({ label, color, values, units, dir, labelColor = "var(--fg)" }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = (max - min) || 1;
  const horizons = ["1h", "3h", "6h", "24h"];
  const Arrow = dir === "up" ? "↗" : dir === "down" ? "↘" : dir === "flat" ? "→" : "↗";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "72px repeat(4, 1fr) 24px", alignItems: "center", gap: 12, padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: 1, background: color }} />
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{label}</span>
      </div>
      {values.map((v, i) => {
        const h = 6 + ((v - min) / range) * 22;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
            <span className="mono" style={{ fontSize: 13, color: labelColor }}>{v}<span style={{ fontSize: 10, color: "var(--fg-subtle)", marginLeft: 1 }}>{units}</span></span>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 28, width: "100%" }}>
              <div style={{ width: 28, height: h, background: color, opacity: 0.85, borderRadius: 1 }} />
              <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)", lineHeight: 1, paddingBottom: 2 }}>{horizons[i]}</span>
            </div>
          </div>
        );
      })}
      <span className="mono" style={{ fontSize: 14, color: "var(--fg-muted)", textAlign: "right" }}>{Arrow}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Tile, hero card, alerts row, integrity panel — composables
// ─────────────────────────────────────────────────────────────
function MetricTile({ icon: Icon, color, label, value, unit, delta, deltaDir, data, statusLabel, fillSpark = true, sparkW = 200 }) {
  const dArrow = deltaDir === "up" ? "▲" : deltaDir === "down" ? "▼" : "▬";
  const dClass = deltaDir === "up" ? "up" : deltaDir === "down" ? "down" : "flat";
  return (
    <div className="card interactive" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      {/* row 1: icon + label + delta chip */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color, display: "flex" }}><Icon size={18} /></span>
        <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 500, letterSpacing: 0.01 }}>{label}</span>
        <span style={{ marginLeft: "auto" }} className={`chip ${dClass}`}>
          <span style={{ fontSize: 10 }}>{dArrow}</span>
          <span>{delta}</span>
        </span>
      </div>
      {/* row 2: value + unit */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="mono" style={{ fontSize: 28, color: "var(--fg)", fontWeight: 500, letterSpacing: -0.5, lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{unit}</span>
        {statusLabel && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-muted)" }}>{statusLabel}</span>
        )}
      </div>
      {/* row 3: sparkline */}
      <div style={{ marginTop: 4 }}>
        <Sparkline data={data} color={color} width={sparkW} height={36} fill={fillSpark} />
      </div>
    </div>
  );
}

function HealthTile({ battery, rssi, sparkW = 200 }) {
  return (
    <div className="card interactive" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--m-battery)", display: "flex" }}><I.Cpu size={18} /></span>
        <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 500 }}>Station health</span>
        <span style={{ marginLeft: "auto" }} className="chip flat">OK</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="mono" style={{ fontSize: 28, color: "var(--fg)", fontWeight: 500, letterSpacing: -0.5, lineHeight: 1 }}>{battery}</span>
        <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>%</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-subtle)" }} className="mono">{rssi} dBm</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
        <DualBar label="BAT" pct={battery} color="var(--m-battery)" width={sparkW} />
        <DualBar label="RSSI" pct={Math.min(100, Math.max(0, (rssi + 100) * 1.25))} color="var(--m-rssi)" width={sparkW} valueText={`${rssi} dBm`} />
      </div>
    </div>
  );
}

function DualBar({ label, pct, color, width, valueText }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="mono" style={{ fontSize: 9, color: "var(--fg-subtle)", width: 26, letterSpacing: 0.04 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: "var(--surface-2)", border: "1px solid var(--border-inset)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, opacity: 0.85 }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Hero weather card (temperature numeral dominates)
// ─────────────────────────────────────────────────────────────
function HeroWeatherCard({ compact = false }) {
  return (
    <div className="card" style={{ padding: compact ? 16 : 24, display: "flex", flexDirection: "column", gap: compact ? 8 : 12, height: "100%" }}>
      {/* top: condition glyph + word */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--fg-muted)", display: "flex" }}>
          <I.CloudSun size={compact ? 24 : 28} sw={1.5} />
        </span>
        <span style={{ fontSize: 14, color: "var(--fg-muted)" }}>Partly cloudy</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-subtle)" }} className="mono">36.81°N · 10.18°E</span>
      </div>

      {/* center: temp numeral */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: compact ? 4 : 12, flex: 1 }}>
        <span className="mono" style={{
          fontSize: compact ? 64 : 88,
          fontWeight: 500,
          letterSpacing: compact ? -2 : -3,
          color: "var(--fg)",
          lineHeight: 0.9,
        }}>23.4</span>
        <span className="mono" style={{ fontSize: compact ? 22 : 28, color: "var(--fg-muted)", fontWeight: 400 }}>°C</span>
      </div>

      {/* bottom: 3 secondary stats */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, marginTop: "auto", paddingTop: compact ? 8 : 12, borderTop: "1px solid var(--border-subtle)" }}>
        <Stat label="Feels like" value="22.1°" />
        <span className="vhairline" />
        <Stat label="Min" value="18.7°" />
        <span className="vhairline" />
        <Stat label="Max" value="26.0°" />
      </div>
    </div>
  );
}
function Stat({ label, value, align = "left" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 12px", flex: 1, textAlign: align }}>
      <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.06, textTransform: "uppercase" }}>{label}</span>
      <span className="mono" style={{ fontSize: 14, color: "var(--fg)" }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Alerts strip
// ─────────────────────────────────────────────────────────────
function AlertRow({ severity, title, threshold, station, ts }) {
  const Shape = severity === "critical" ? Sev.Critical : severity === "warn" ? Sev.Warn : Sev.Info;
  return (
    <div className="alert-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
      <Shape />
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 220 }}>
        <span style={{ fontSize: 14, color: "var(--fg)", fontWeight: 500 }}>{title}</span>
        <span style={{ fontSize: 12, color: "var(--fg-subtle)" }} className="mono">{threshold}</span>
      </div>
      <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{station}</span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <span className="mono" style={{ fontSize: 12, color: "var(--fg-subtle)" }}>{ts}</span>
        <button className="btn btn-ghost btn-xs">Ack</button>
        <button className="btn btn-outline btn-xs">Resolve</button>
      </span>
    </div>
  );
}

function AlertsCard({ alerts }) {
  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>Open alerts</span>
        <span className="mono" style={{ fontSize: 12, color: "var(--fg-subtle)", marginLeft: 8 }}>· {alerts.length}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-muted)" }}>
          Last triggered <span className="mono" style={{ color: "var(--fg)" }}>14:21:08</span>
        </span>
        <button className="btn btn-ghost btn-xs" style={{ marginLeft: 12 }}>
          View all <I.ArrowR size={12} />
        </button>
      </div>
      <div>
        {alerts.map((a, i) => (
          <React.Fragment key={i}>
            <AlertRow {...a} />
            {i < alerts.length - 1 && <div className="hairline" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Integrity panel
// ─────────────────────────────────────────────────────────────
function IntegrityCard() {
  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "var(--sev-success)", display: "flex" }}><I.Shield size={16} /></span>
        <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>Integrity</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--sev-success)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sev-success)" }} />
          Anchored
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
        <Row label="Last batch" value="14:00:00 · 32 min ago" />
        <Row label="Records" value="1,440" />
        <Row label="Hedera txn" value={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--fg)" }}>4a2f…91c</span>
          <button className="btn btn-ghost btn-xs" style={{ padding: 0, height: 18, color: "var(--fg-subtle)" }}>
            <I.Copy size={11} />
          </button>
        </span>} />
        <Row label="Merkle root" value="0×9e7d…0bc2" />
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
        <button className="btn btn-outline" style={{ width: "100%", justifyContent: "space-between" }}>
          <span>Verify a record</span>
          <I.ArrowR size={12} />
        </button>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)", lineHeight: 1.4 }}>
          Next anchor in <span className="mono" style={{ color: "var(--fg-muted)" }}>28m 12s</span>
        </span>
      </div>
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>{label}</span>
      <span className="mono" style={{ fontSize: 13, color: "var(--fg)" }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Forecast card
// ─────────────────────────────────────────────────────────────
function ForecastCard() {
  return (
    <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>Forecast</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 8 }}>· next 24h</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 11, color: "var(--fg-subtle)" }} className="mono">
        </span>
        <button className="btn btn-ghost btn-xs">
          Open forecasts <I.ArrowR size={12} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-around" }}>
        <ForecastRow label="Temp."   color="var(--m-temp)"     values={[24, 25, 26, 23]} units="°"   dir="flat" />
        <ForecastRow label="Humidity" color="var(--m-humidity)" values={[64, 62, 58, 70]} units="%"   dir="down" />
        <ForecastRow label="Pressure" color="var(--m-pressure)" values={[1013, 1012, 1014, 1016]} units="" dir="up" />
        <ForecastRow label="Rainfall" color="var(--m-rainfall)" values={[0.0, 0.2, 0.4, 0.3]} units="mm" dir="up" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  App shell — sidebar + topbar
// ─────────────────────────────────────────────────────────────
function Sidebar() {
  const items = [
    { icon: I.Dashboard, label: "Dashboard", active: true },
    { icon: I.Activity,  label: "Live" },
    { icon: I.Line,      label: "Analytics" },
    { icon: I.Trend,     label: "Forecasts" },
    { icon: I.Bell,      label: "Alerts", badge: "3" },
    { icon: I.Shield,    label: "Integrity" },
    { icon: I.Tower,     label: "Stations", badge: "12" },
    { icon: I.Settings,  label: "Settings" },
  ];
  return (
    <aside style={{
      width: 240, height: "100%", borderRight: "1px solid var(--border-subtle)",
      display: "flex", flexDirection: "column", padding: "16px 12px", gap: 16,
      background: "var(--bg)"
    }}>
      {/* Brand block */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 4px 8px" }}>
        <img src="logo.png" alt="WeatherHub" style={{ width: 28, height: 28, display: "block", objectFit: "contain" }} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.1 }}>WeatherHub</span>
          <span style={{ fontSize: 11, color: "var(--fg-subtle)" }} className="mono">enit.weatherhub.tn</span>
        </div>
      </div>

      <hr className="hairline" />

      {/* Nav */}
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

      {/* Footer */}
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

function Topbar() {
  return (
    <header style={{
      height: 56, display: "flex", alignItems: "center", gap: 16,
      padding: "0 24px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--bg)",
    }}>
      {/* Station selector */}
      <button className="btn btn-outline" style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}>
        <I.Tower size={13} />
        <span style={{ fontSize: 13, color: "var(--fg-muted)", marginLeft: 2 }}>Station</span>
        <span style={{ fontSize: 13, color: "var(--fg)", marginLeft: 6 }}>Tunis-Campus</span>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 6 }} className="mono">/12</span>
        <I.Chevron size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
      </button>

      {/* breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-subtle)", fontSize: 12 }}>
        <span>Tunis-Campus</span>
        <I.ChevronR size={11} />
        <span style={{ color: "var(--fg-muted)" }}>Rooftop · Block A</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <button className="btn btn-outline" style={{ height: 32, width: 220, justifyContent: "space-between", color: "var(--fg-subtle)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <I.Search size={13} />
          <span style={{ fontSize: 13 }}>Search stations, alerts…</span>
        </span>
        <span className="mono" style={{ fontSize: 10, padding: "1px 4px", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>⌘K</span>
      </button>

      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px", height: 32, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
        <span className="live-dot" />
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Live</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", paddingLeft: 6, borderLeft: "1px solid var(--border-subtle)" }}>SSE · 2.4 KB/s</span>
      </div>

      {/* Avatar */}
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
//  Sample data
// ─────────────────────────────────────────────────────────────
const seedSparks = {
  humidity: [60, 61, 60, 62, 63, 65, 64, 63, 64, 65, 66, 64, 63, 64, 65, 64],
  pressure: [1014.1, 1014.0, 1013.8, 1013.5, 1013.2, 1013.1, 1013.0, 1013.0, 1013.2, 1013.3, 1013.1, 1013.0, 1012.9, 1013.0, 1013.1, 1013.0],
  rainfall: [0, 0, 0, 0, 0.1, 0.2, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  light:    [380, 390, 395, 400, 405, 408, 410, 412, 415, 414, 412, 410, 408, 410, 411, 412],
  aqi:      [42, 41, 40, 39, 40, 41, 40, 39, 38, 38, 37, 38, 39, 38, 37, 38],
};

const alerts = [
  { severity: "warn",     title: "AQI above warning threshold", threshold: "AQI 82 / 80 limit · sustained 8m", station: "Tunis-Campus · Rooftop A", ts: "14:21:08" },
  { severity: "info",     title: "Sensor RSSI degraded",         threshold: "RSSI −86 dBm / −75 limit",          station: "El Khadra · Field 2",        ts: "13:58:42" },
  { severity: "critical", title: "Barometric pressure drop",     threshold: "ΔP 6.4 hPa / 4.0 limit · 30m",      station: "Tunis-Campus · Rooftop A",    ts: "12:04:11" },
];

// ─────────────────────────────────────────────────────────────
//  Desktop view (1440 × 900)
// ─────────────────────────────────────────────────────────────
function DashboardDesktop() {
  return (
    <div className="wh-root" style={{ display: "flex", flexDirection: "column", width: 1440, height: 900, overflow: "hidden" }} data-screen-label="Dashboard · Desktop">
      <Topbar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", gap: 16, overflow: "hidden" }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.2 }}>Dashboard</h1>
                <span style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }} className="mono">v1.4</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>Real-time overview · Tunis-Campus · Rooftop Block A</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--fg-subtle)" }}>
              <span>Last sync</span>
              <span className="mono" style={{ color: "var(--fg)" }}>14:32:08</span>
              <span style={{ width: 1, height: 14, background: "var(--border-subtle)" }} />
              <button className="btn btn-outline btn-xs">Last 24h <I.Chevron size={11} /></button>
              <button className="btn btn-outline btn-xs"><I.Plus size={12} /> Add widget</button>
            </div>
          </div>

          {/* Main row: hero (2 cols) + metric grid (4 cols × 2 rows = 6 tiles) */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 4fr)", gap: 12, minHeight: 280 }}>
            {/* Hero card */}
            <HeroWeatherCard />

            {/* Metric tile grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridTemplateRows: "repeat(2, 1fr)", gap: 12 }}>
              <MetricTile icon={I.Droplet}   color="var(--m-humidity)" label="Humidity"  value="64"    unit="%"   delta="1.2"  deltaDir="up"   data={seedSparks.humidity} sparkW={210} />
              <MetricTile icon={I.Gauge}     color="var(--m-pressure)" label="Pressure"  value="1013"  unit="hPa" delta="0.3"  deltaDir="down" data={seedSparks.pressure} sparkW={210} />
              <MetricTile icon={I.CloudRain} color="var(--m-rainfall)" label="Rainfall"  value="0.0"   unit="mm"  delta="0"    deltaDir="flat" data={seedSparks.rainfall} sparkW={210} />
              <MetricTile icon={I.Sun}       color="var(--m-light)"    label="Light"     value="412"   unit="lx"  delta="12"   deltaDir="up"   data={seedSparks.light}    sparkW={210} />
              <MetricTile icon={I.Wind}      color="var(--m-aqi)"      label="Air quality" value="38"  unit="AQI" delta="1"    deltaDir="down" data={seedSparks.aqi}      sparkW={210} statusLabel="Good" />
              <HealthTile battery={96} rssi={-62} sparkW={210} />
            </div>
          </div>

          {/* Alerts strip */}
          <AlertsCard alerts={alerts} />

          {/* Bottom row: forecast (4 cols) + integrity (2 cols) */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 4fr) minmax(0, 2fr)", gap: 12, flex: 1, minHeight: 0 }}>
            <ForecastCard />
            <IntegrityCard />
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Mobile view (390 × 1280) — desktop-derived, no horizontal scroll
// ─────────────────────────────────────────────────────────────
function MobileTopbar() {
  return (
    <header style={{
      height: 52, display: "flex", alignItems: "center", gap: 10,
      padding: "0 16px",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <button className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0 }}>
        <I.Menu size={18} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img src="logo.png" alt="WeatherHub" style={{ width: 24, height: 24, display: "block", objectFit: "contain" }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>WeatherHub</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", height: 28, border: "1px solid var(--border-subtle)", borderRadius: 6 }}>
        <span className="live-dot" />
        <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>Live</span>
      </div>
      <span style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, oklch(0.6 0.14 280), oklch(0.55 0.18 255))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500 }}>YA</span>
    </header>
  );
}

function DashboardMobile() {
  return (
    <div className="wh-root" style={{ display: "flex", flexDirection: "column", width: 390, minHeight: 1280, overflow: "hidden" }} data-screen-label="Dashboard · Mobile">
      <MobileTopbar />

      {/* Sticky station chip */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 8 }}>
        <button className="btn btn-outline" style={{ height: 30, paddingLeft: 8, paddingRight: 8 }}>
          <I.Tower size={12} />
          <span style={{ fontSize: 12, color: "var(--fg)" }}>Tunis-Campus</span>
          <span style={{ fontSize: 10, color: "var(--fg-subtle)" }} className="mono">/12</span>
          <I.Chevron size={11} style={{ opacity: 0.6 }} />
        </button>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-subtle)" }}>
          Last sync <span className="mono" style={{ color: "var(--fg-muted)" }}>14:32:08</span>
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", padding: "16px", gap: 12 }}>
        {/* Header */}
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: -0.2 }}>Dashboard</h1>
          <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Real-time overview · Rooftop Block A</span>
        </div>

        {/* Hero (full width, compact) */}
        <HeroWeatherCard compact />

        {/* Metric tiles 2-col grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <MetricTile icon={I.Droplet}   color="var(--m-humidity)" label="Humidity"  value="64"    unit="%"   delta="1.2"  deltaDir="up"   data={seedSparks.humidity} sparkW={150} />
          <MetricTile icon={I.Gauge}     color="var(--m-pressure)" label="Pressure"  value="1013"  unit="hPa" delta="0.3"  deltaDir="down" data={seedSparks.pressure} sparkW={150} />
          <MetricTile icon={I.CloudRain} color="var(--m-rainfall)" label="Rainfall"  value="0.0"   unit="mm"  delta="0"    deltaDir="flat" data={seedSparks.rainfall} sparkW={150} />
          <MetricTile icon={I.Sun}       color="var(--m-light)"    label="Light"     value="412"   unit="lx"  delta="12"   deltaDir="up"   data={seedSparks.light}    sparkW={150} />
          <MetricTile icon={I.Wind}      color="var(--m-aqi)"      label="Air"       value="38"    unit="AQI" delta="1"    deltaDir="down" data={seedSparks.aqi}      sparkW={150} statusLabel="Good" />
          <HealthTile battery={96} rssi={-62} sparkW={150} />
        </div>

        {/* Alerts — compact */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>Open alerts</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 6 }}>· 3</span>
            <button className="btn btn-ghost btn-xs" style={{ marginLeft: "auto" }}>View all <I.ArrowR size={11} /></button>
          </div>
          {alerts.map((a, i) => {
            const Shape = a.severity === "critical" ? Sev.Critical : a.severity === "warn" ? Sev.Warn : Sev.Info;
            return (
              <React.Fragment key={i}>
                <div className="alert-row" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px" }}>
                  <span style={{ paddingTop: 4 }}><Shape /></span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: "var(--fg)", fontWeight: 500 }}>{a.title}</span>
                    <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{a.station}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{a.ts.slice(0, 5)}</span>
                </div>
                {i < alerts.length - 1 && <div className="hairline" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Forecast — compact */}
        <ForecastCard />

        {/* Integrity */}
        <IntegrityCard />
      </div>
    </div>
  );
}

Object.assign(window, { DashboardDesktop, DashboardMobile });
