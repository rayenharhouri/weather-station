// playground.jsx — WeatherHub for Research · Playground (desktop)
// Compose a query, send it, inspect the response.
// Layout: endpoint picker bar · params form (380) · response viewer (rest)
// · collapsible request preview at the bottom.

const { useState: useStatePg } = React;

// ─────────────────────────────────────────────────────────────
//  Icons
// ─────────────────────────────────────────────────────────────
const SVP = ({ size = 16, sw = 1.5, children, style, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const PI = {
  Book:      (p) => <SVP {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></SVP>,
  Terminal:  (p) => <SVP {...p}><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></SVP>,
  Database:  (p) => <SVP {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></SVP>,
  Key:       (p) => <SVP {...p}><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></SVP>,
  Download:  (p) => <SVP {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></SVP>,
  BarChart:  (p) => <SVP {...p}><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></SVP>,
  Settings:  (p) => <SVP {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SVP>,
  Search:    (p) => <SVP {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></SVP>,
  Chevron:   (p) => <SVP {...p}><path d="m6 9 6 6 6-6"/></SVP>,
  ChevronR:  (p) => <SVP {...p}><path d="m9 18 6-6-6-6"/></SVP>,
  Copy:      (p) => <SVP {...p}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></SVP>,
  Check:     (p) => <SVP {...p}><path d="M20 6 9 17l-5-5"/></SVP>,
  Flask:     (p) => <SVP {...p}><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.58 16.5h12.85"/></SVP>,
  Play:      (p) => <SVP {...p}><polygon points="6 3 20 12 6 21" fill="currentColor"/></SVP>,
  Save:      (p) => <SVP {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></SVP>,
  Clock:     (p) => <SVP {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></SVP>,
  Share:     (p) => <SVP {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></SVP>,
  Send:      (p) => <SVP {...p}><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></SVP>,
  More:      (p) => <SVP {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></SVP>,
  Tower:     (p) => <SVP {...p}><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8a6.14 6.14 0 0 1 .8 7.4"/><path d="M19.1 1.9a10.04 10.04 0 0 1 0 14.2"/></SVP>,
  Thermo:    (p) => <SVP {...p}><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/></SVP>,
  X:         (p) => <SVP {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></SVP>,
  ArrowR:    (p) => <SVP {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></SVP>,
  ChevronDD: (p) => <SVP {...p}><path d="m6 9 6 6 6-6"/></SVP>,
  Info:      (p) => <SVP {...p}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></SVP>,
};

// ─────────────────────────────────────────────────────────────
//  App shell (same as docs)
// ─────────────────────────────────────────────────────────────
function SidebarP() {
  const apiItems = [
    { icon: PI.Terminal, label: "Playground", active: true },
    { icon: PI.Book,     label: "Docs" },
    { icon: PI.Database, label: "Datasets" },
  ];
  const acctItems = [
    { icon: PI.Key,      label: "Tokens", badge: "4" },
    { icon: PI.Download, label: "Exports" },
    { icon: PI.BarChart, label: "Usage" },
    { icon: PI.Settings, label: "Account" },
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
          <span style={{ fontSize: 11, color: "var(--fg-subtle)" }} className="mono">for Research · v1</span>
        </div>
      </div>
      <hr className="hairline" />
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.1, textTransform: "uppercase", padding: "0 10px 6px" }}>API</div>
        {apiItems.map((it) => (
          <div key={it.label} className={`nav-item${it.active ? " active" : ""}`}>
            <it.icon size={16} /><span>{it.label}</span>
            {it.badge && <span className="badge">{it.badge}</span>}
          </div>
        ))}
        <div style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.1, textTransform: "uppercase", padding: "16px 10px 6px" }}>Account</div>
        {acctItems.map((it) => (
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
            <span>API · all systems normal</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
            <span style={{ fontSize: 10, color: "var(--fg-subtle)" }}>Status page</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-muted)" }}>p50 86ms</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopbarP() {
  return (
    <header style={{ height: 56, display: "flex", alignItems: "center", gap: 16, padding: "0 24px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-subtle)" }}>
        <span className="mono" style={{ color: "var(--fg-muted)" }}>research.weatherhub.local</span>
        <PI.ChevronR size={11} />
        <span style={{ color: "var(--fg)" }}>Playground</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 26, padding: "0 10px", borderRadius: 999, border: "1px solid var(--border-hover)", background: "var(--surface-2)" }}>
        <PI.Flask size={12} style={{ color: "var(--accent-brand)" }} />
        <span style={{ fontSize: 11.5, color: "var(--fg)", fontWeight: 500 }}>Researcher mode</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 10px", height: 32, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
        <PI.Key size={12} style={{ color: "var(--fg-muted)" }} />
        <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>wh_rsa_••••aB7c</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)", paddingLeft: 6, borderLeft: "1px solid var(--border-subtle)" }}>papers-2026</span>
        <PI.Chevron size={11} style={{ opacity: 0.6, color: "var(--fg-muted)" }} />
      </div>
      <button className="btn btn-outline" style={{ height: 32, width: 220, justifyContent: "space-between", color: "var(--fg-subtle)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <PI.Search size={13} /><span style={{ fontSize: 13 }}>Search the docs…</span>
        </span>
        <span className="mono" style={{ fontSize: 10, padding: "1px 4px", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>⌘K</span>
      </button>
      <button className="btn btn-ghost" style={{ height: 32, padding: 0, gap: 8 }}>
        <span style={{ width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(0.72 0.14 50), oklch(0.68 0.16 38))",
          color: "#231a14", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 600 }}>SA</span>
      </button>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
//  Sample response data (6h of temperature @ 5min)
// ─────────────────────────────────────────────────────────────
function seedRandP(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const respData = (() => {
  const r = seedRandP(42);
  const n = 73; // 6h at 5min intervals
  const peak = 14.0;
  const start = 8.0;
  return Array.from({ length: n }, (_, i) => {
    const hour = start + (i * 5) / 60;
    const phase = ((hour - peak) * Math.PI) / 12;
    const wave = (Math.cos(phase) + 1) / 2;
    const v = 18.5 + (26.2 - 18.5) * wave + (r() - 0.5) * 0.5;
    return { hour, value: v };
  });
})();

const stats = (() => {
  const vals = respData.map(p => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const minIdx = vals.indexOf(min);
  const maxIdx = vals.indexOf(max);
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return { min, max, minIdx, maxIdx, avg };
})();

function idxToTime(i) {
  const t = 8.0 + (i * 5) / 60;
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────
//  Form controls
// ─────────────────────────────────────────────────────────────
function FieldLabel({ label, type, required, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <label className="mono" style={{ fontSize: 12, color: "var(--fg)", fontWeight: 500 }}>{label}</label>
        <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>{type}</span>
        {required && <span style={{ fontSize: 10, color: "var(--sev-critical)", fontWeight: 500 }}>required</span>}
        {hint && <span style={{ fontSize: 10, color: "var(--fg-subtle)", marginLeft: "auto" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, placeholder, prefix, suffix, mono = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "0 10px",
      height: 34,
      background: "var(--surface-2)",
      border: "1px solid var(--border-subtle)",
      borderRadius: 8,
    }}>
      {prefix && <span style={{ color: "var(--fg-subtle)", display: "flex" }}>{prefix}</span>}
      <span className={mono ? "mono" : ""} style={{ flex: 1, fontSize: mono ? 12.5 : 13, color: "var(--fg)" }}>{value || <span style={{ color: "var(--fg-subtle)" }}>{placeholder}</span>}</span>
      {suffix && <span style={{ color: "var(--fg-subtle)", fontSize: 11 }}>{suffix}</span>}
    </div>
  );
}

function ChipPicker({ options, active }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {options.map(o => {
        const isActive = o.value === active;
        return (
          <button key={o.value} style={{
            border: `1px solid ${isActive ? "var(--border-hover)" : "var(--border-subtle)"}`,
            background: isActive ? "var(--surface-2)" : "transparent",
            color: isActive ? "var(--fg)" : "var(--fg-muted)",
            padding: "4px 9px",
            height: 24,
            borderRadius: 6,
            fontFamily: "inherit",
            fontSize: 11.5,
            cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            {o.color && <span style={{ width: 7, height: 7, borderRadius: 2, background: o.color }} />}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

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
            flex: 1,
          }}>{o}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Form panel
// ─────────────────────────────────────────────────────────────
function ParamsForm() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Parameters</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 6 }}>· 7 fields · 2 modified</span>
        <button className="btn btn-ghost btn-xs" style={{ marginLeft: "auto", height: 22, padding: "0 6px" }}>
          Reset
        </button>
      </div>

      {/* Form body — scrollable */}
      <div style={{ flex: 1, overflow: "auto", padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 14 }} className="no-scroll">
        <FieldLabel label="station" type="string · array" hint="home tenant by default">
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0 8px",
            minHeight: 34,
            background: "var(--surface-2)",
            border: "1px solid var(--border-hover)",
            borderRadius: 8,
            flexWrap: "wrap",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 8px",
              height: 22,
              background: "var(--bg)",
              border: "1px solid var(--border-hover)",
              borderRadius: 4,
              fontSize: 12,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sev-success)" }} />
              <span className="mono">tunis-campus</span>
              <button style={{ background: "transparent", border: 0, padding: 0, color: "var(--fg-subtle)", cursor: "pointer", display: "flex" }}>
                <PI.X size={10} />
              </button>
            </span>
            <span style={{ color: "var(--fg-subtle)", fontSize: 12 }}>+ add station…</span>
          </div>
        </FieldLabel>

        <FieldLabel label="metric" type="enum">
          <ChipPicker
            options={[
              { value: "temperature", label: "Temperature", color: "var(--m-temp)" },
              { value: "humidity",    label: "Humidity",    color: "var(--m-humidity)" },
              { value: "pressure",    label: "Pressure",    color: "var(--m-pressure)" },
              { value: "rainfall",    label: "Rainfall",    color: "var(--m-rainfall)" },
              { value: "light",       label: "Light",       color: "var(--m-light)" },
              { value: "aqi",         label: "AQI",         color: "var(--m-aqi)" },
            ]}
            active="temperature"
          />
        </FieldLabel>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FieldLabel label="since" type="ISO 8601">
            <TextInput mono value="2026-05-19T08:00:00Z" />
          </FieldLabel>
          <FieldLabel label="until" type="ISO 8601">
            <TextInput mono value="2026-05-19T14:00:00Z" suffix="now" />
          </FieldLabel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>Quick ranges</div>
          <div style={{ display: "flex", gap: 4 }}>
            {["last 1h", "last 6h", "last 24h", "last 7d", "last 30d"].map((t, i) => (
              <button key={t} className="btn"
                style={{
                  height: 22, padding: "0 8px",
                  border: `1px solid ${i === 1 ? "var(--border-hover)" : "var(--border-subtle)"}`,
                  background: i === 1 ? "var(--surface-2)" : "transparent",
                  color: i === 1 ? "var(--fg)" : "var(--fg-muted)",
                  fontSize: 11,
                }}>{t}</button>
            ))}
          </div>
        </div>

        <FieldLabel label="interval" type="enum">
          <Segmented options={["raw", "5m", "15m", "1h", "1d"]} active="5m" />
        </FieldLabel>

        <FieldLabel label="limit" type="integer · max 1000" hint="200 returned">
          <TextInput mono value="200" />
        </FieldLabel>

        {/* Collapsed headers section */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 0", borderTop: "1px solid var(--border-subtle)", cursor: "pointer", color: "var(--fg-muted)" }}>
          <PI.ChevronR size={11} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Headers</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>· 2</span>
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--border-subtle)" }}>
        <button className="btn btn-primary" style={{ flex: 1, height: 34, justifyContent: "center" }}>
          <PI.Send size={13} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>Send request</span>
          <span className="mono" style={{ fontSize: 10, padding: "1px 5px", border: "1px solid color-mix(in oklch, white 25%, transparent)", borderRadius: 3, marginLeft: 6, opacity: 0.85 }}>⌘ ↵</span>
        </button>
        <button className="btn btn-outline" style={{ width: 34, height: 34, padding: 0, justifyContent: "center" }}>
          <PI.Save size={13} />
        </button>
        <button className="btn btn-outline" style={{ width: 34, height: 34, padding: 0, justifyContent: "center" }}>
          <PI.More size={13} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Response panel — Chart / Table / JSON / Headers tabs
// ─────────────────────────────────────────────────────────────
function ResponseChart() {
  const W = 760, H = 280;
  const pad = { top: 16, right: 16, bottom: 28, left: 44 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const data = respData;
  const vals = data.map(p => p.value);
  const yMin = Math.floor(Math.min(...vals) - 0.5);
  const yMax = Math.ceil(Math.max(...vals) + 0.5);
  const xToPx = (i) => pad.left + (i / (data.length - 1)) * innerW;
  const yToPx = (v) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const line = data.map((p, i) => `${i === 0 ? "M" : "L"}${xToPx(i).toFixed(1)} ${yToPx(p.value).toFixed(1)}`).join(" ");
  const area = line + ` L${xToPx(data.length - 1).toFixed(1)} ${(pad.top + innerH).toFixed(1)} L${pad.left.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;

  const monoFont = "Geist Mono, ui-monospace, monospace";
  const color = "var(--m-temp)";

  const tickCount = 4;
  const yTicks = [];
  for (let i = 0; i <= tickCount; i++) yTicks.push(yMin + ((yMax - yMin) * i) / tickCount);
  const xTicks = [0, 12, 24, 36, 48, 60, 72];

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {yTicks.map((t, i) => {
        const y = yToPx(t);
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y}
              stroke="var(--border-subtle)" strokeWidth="1" shapeRendering="crispEdges" />
            <text x={pad.left - 8} y={y + 3} textAnchor="end"
              fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>
              {t.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* mean line */}
      <line x1={pad.left} y1={yToPx(stats.avg)} x2={pad.left + innerW} y2={yToPx(stats.avg)}
        stroke="var(--fg-muted)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 4" />
      <text x={pad.left + innerW - 4} y={yToPx(stats.avg) - 4} textAnchor="end"
        fill="var(--fg-muted)" fontSize="10" fontFamily={monoFont}>
        mean {stats.avg.toFixed(1)}
      </text>

      <path d={area} fill={color} fillOpacity="0.10" />
      <path d={line} stroke={color} strokeWidth="1.6"
        fill="none" strokeLinejoin="round" strokeLinecap="round" />

      {/* min/max markers */}
      <circle cx={xToPx(stats.minIdx)} cy={yToPx(stats.min)} r="3" fill="var(--bg)" stroke={color} strokeWidth="1.4" />
      <text x={xToPx(stats.minIdx)} y={yToPx(stats.min) + 16} textAnchor="middle" fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>
        min {stats.min.toFixed(1)}
      </text>
      <circle cx={xToPx(stats.maxIdx)} cy={yToPx(stats.max)} r="3" fill="var(--bg)" stroke={color} strokeWidth="1.4" />
      <text x={xToPx(stats.maxIdx)} y={yToPx(stats.max) - 7} textAnchor="middle" fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>
        max {stats.max.toFixed(1)}
      </text>

      {xTicks.map((i, k) => (
        <text key={k} x={xToPx(i)} y={pad.top + innerH + 14} textAnchor="middle"
          fill="var(--fg-subtle)" fontSize="10" fontFamily={monoFont}>{idxToTime(i)}</text>
      ))}
      <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH}
        stroke="var(--border-subtle)" strokeWidth="1" shapeRendering="crispEdges" />
    </svg>
  );
}

function ResponseStatsRow() {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 18,
      padding: "10px 18px",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--sev-success)", padding: "1px 6px", border: "1px solid color-mix(in oklch, var(--sev-success) 50%, transparent)", borderRadius: 4 }}>200 OK</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)" }}>application/json</span>
      </span>
      <Kpi label="Records" value="73" />
      <Kpi label="Size" value="14.2 KB" />
      <Kpi label="Time" value="86 ms" />
      <Kpi label="Mean" value={`${stats.avg.toFixed(2)} °C`} color="var(--m-temp)" />
      <Kpi label="Range" value={`${stats.min.toFixed(1)} → ${stats.max.toFixed(1)}`} color="var(--m-temp)" />
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Cursor</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>eyJpZCI6InItMWY0…</span>
        <button className="btn btn-outline btn-xs">
          <PI.ArrowR size={11} /> Next page
        </button>
      </span>
    </div>
  );
}
function Kpi({ label, value, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <span style={{ fontSize: 9, color: "var(--fg-subtle)", letterSpacing: 0.06, textTransform: "uppercase" }}>{label}</span>
      <span className="mono" style={{ fontSize: 13, color: color || "var(--fg)" }}>{value}</span>
    </div>
  );
}

function ResponseTabs({ active }) {
  const tabs = [
    { key: "chart",   label: "Chart" },
    { key: "table",   label: "Table" },
    { key: "json",    label: "JSON" },
    { key: "headers", label: "Headers" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "8px 12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      {tabs.map(t => (
        <button key={t.key} style={{
          border: 0,
          padding: "8px 12px 10px",
          background: "transparent",
          color: t.key === active ? "var(--fg)" : "var(--fg-muted)",
          fontFamily: "inherit", fontSize: 12.5, fontWeight: t.key === active ? 600 : 500,
          cursor: "pointer", position: "relative",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          {t.label}
          {t.key === active && (
            <span style={{ position: "absolute", left: 12, right: 12, bottom: -1, height: 2, background: "var(--accent-brand)" }} />
          )}
        </button>
      ))}
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, padding: "0 4px 6px" }}>
        <button className="btn btn-ghost btn-xs" style={{ height: 24, padding: "0 8px" }}>
          <PI.Download size={11} /> CSV
        </button>
        <button className="btn btn-ghost btn-xs" style={{ height: 24, padding: "0 8px" }}>
          <PI.Database size={11} /> Save to dataset
        </button>
      </span>
    </div>
  );
}

function ResponsePanel() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      <ResponseTabs active="chart" />
      <ResponseStatsRow />
      <div style={{ flex: 1, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12, minHeight: 0, overflow: "hidden" }}>
        <ResponseChart />
        {/* Mini-table preview below chart */}
        <div className="card" style={{ background: "var(--surface-2)", flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 80px 80px 130px", padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)", gap: 12, fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>
            <span>recorded_at</span>
            <span>id</span>
            <span style={{ textAlign: "right" }}>value</span>
            <span>unit</span>
            <span>merkle_anchor</span>
          </div>
          {[
            { ts: "2026-05-19T13:55:00Z", id: "r-1f4e29ca12", v: 23.46, anchor: <span style={{ color: "var(--fg-subtle)" }} className="mono">— pending</span> },
            { ts: "2026-05-19T13:50:00Z", id: "r-1f4e29c8a7", v: 23.41, anchor: <span className="mono">b-4a2f</span> },
            { ts: "2026-05-19T13:45:00Z", id: "r-1f4e29c712", v: 23.39, anchor: <span className="mono">b-4a2f</span> },
            { ts: "2026-05-19T13:40:00Z", id: "r-1f4e29c5f0", v: 23.38, anchor: <span className="mono">b-4a2f</span> },
          ].map((row, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "180px 1fr 80px 80px 130px", gap: 12,
              padding: "6px 14px",
              fontSize: 12,
              borderBottom: i < 3 ? "1px solid var(--border-subtle)" : "none",
            }}>
              <span className="mono" style={{ color: "var(--fg-muted)" }}>{row.ts}</span>
              <span className="mono" style={{ color: "var(--fg)" }}>{row.id}</span>
              <span className="mono" style={{ color: "var(--fg)", textAlign: "right" }}>{row.v.toFixed(2)}</span>
              <span className="mono" style={{ color: "var(--fg-subtle)" }}>°C</span>
              <span style={{ color: "var(--fg-muted)", fontSize: 11.5 }}>{row.anchor}</span>
            </div>
          ))}
          <div style={{ padding: "6px 14px", fontSize: 11, color: "var(--fg-subtle)", textAlign: "center" }}>
            … 69 more rows
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Endpoint picker bar
// ─────────────────────────────────────────────────────────────
function EndpointBar() {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          height: 24, padding: "0 8px",
          borderRadius: 4,
          border: "1px solid var(--sev-info)",
          background: "color-mix(in oklch, var(--sev-info) 14%, transparent)",
          color: "var(--sev-info)", fontSize: 11, fontWeight: 600, letterSpacing: 0.04,
          fontFamily: "var(--font-mono)",
        }}>GET</span>
        <PI.ChevronDD size={11} style={{ color: "var(--fg-subtle)" }} />
      </div>
      <span className="mono" style={{ fontSize: 13, color: "var(--fg)", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "var(--fg-subtle)" }}>https://research.weatherhub.local</span>
        <span>/v1/readings</span>
        <PI.ChevronDD size={11} style={{ color: "var(--fg-subtle)" }} />
      </span>

      <span style={{ flex: 1 }} />

      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-subtle)" }}>
        <PI.Clock size={11} />
        <span>Last run 14:21 · 86ms · </span>
        <span style={{ color: "var(--sev-success)" }}>200 OK</span>
      </span>
      <button className="btn btn-outline btn-xs">
        <PI.Book size={11} /> Open in docs
      </button>
      <button className="btn btn-outline btn-xs">
        <PI.Save size={11} /> Saved queries <PI.Chevron size={11} style={{ opacity: 0.6 }} />
      </button>
      <button className="btn btn-outline btn-xs">
        <PI.Share size={11} /> Share
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Request preview bar (collapsible bottom)
// ─────────────────────────────────────────────────────────────
function RequestPreview() {
  const curl = `curl https://research.weatherhub.local/v1/readings \\
  -H "Authorization: Bearer wh_rsa_••••aB7c" \\
  -G -d "station=tunis-campus" -d "metric=temperature" \\
     -d "since=2026-05-19T08:00:00Z" -d "until=2026-05-19T14:00:00Z" \\
     -d "interval=5m" -d "limit=200"`;
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
        <PI.Chevron size={11} style={{ color: "var(--fg-subtle)" }} />
        <span style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 500, marginLeft: 6 }}>Request preview</span>
        <div style={{ display: "flex", marginLeft: 16, gap: 0 }}>
          {["curl", "Python", "Node", "R"].map((l, i) => (
            <button key={l} style={{
              border: 0,
              padding: "4px 10px 6px",
              background: "transparent",
              color: i === 0 ? "var(--fg)" : "var(--fg-muted)",
              fontFamily: "inherit",
              fontSize: 11.5,
              fontWeight: i === 0 ? 600 : 500,
              cursor: "pointer",
              position: "relative",
            }}>
              {l}
              {i === 0 && (
                <span style={{ position: "absolute", left: 10, right: 10, bottom: -1, height: 2, background: "var(--accent-brand)" }} />
              )}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>auto-syncs with params →</span>
          <button className="btn btn-ghost btn-xs" style={{ width: 24, height: 24, padding: 0, color: "var(--fg-subtle)" }}>
            <PI.Copy size={11} />
          </button>
        </span>
      </div>
      <pre style={{
        margin: 0, padding: "10px 14px",
        fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.55,
        color: "var(--fg)",
        whiteSpace: "pre", overflow: "auto",
      }} className="no-scroll">
        {curl.split("\n").map((line, i) => {
          const m = line.match(/^(\s*)(curl|-H|-G|-d)(\s+)(.*)$/);
          if (m) {
            const [, lead, flag, sp, rest] = m;
            return (
              <span key={i} style={{ display: "block" }}>
                {lead}<span style={{ color: "var(--accent-brand)" }}>{flag}</span>{sp}
                <span style={{ color: "var(--m-light)" }}>{rest}</span>
              </span>
            );
          }
          return <span key={i} style={{ display: "block" }}>{line}</span>;
        })}
      </pre>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Page (desktop, 1440×900)
// ─────────────────────────────────────────────────────────────
function PlaygroundDesktop() {
  return (
    <div className="wh-root" style={{ display: "flex", flexDirection: "column", width: 1440, height: 900, overflow: "hidden" }} data-screen-label="Playground · Desktop">
      <TopbarP />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidebarP />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", gap: 12, overflow: "hidden", minWidth: 0 }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.2 }}>Playground</h1>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }}>v1</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                Run live API queries against your data. Copy as curl / Python / R, save snippets, or send to Datasets.
              </span>
            </div>
          </div>

          {/* Endpoint picker */}
          <EndpointBar />

          {/* Body: params (380) + response (rest) */}
          <div style={{ display: "grid", gridTemplateColumns: "380px minmax(0, 1fr)", gap: 14, flex: 1, minHeight: 0 }}>
            <ParamsForm />
            <ResponsePanel />
          </div>

          {/* Bottom: request preview */}
          <RequestPreview />
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { PlaygroundDesktop });
