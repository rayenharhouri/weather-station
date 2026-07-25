// integrity.jsx — WeatherHub Integrity page (desktop)
// Hedera-anchored Merkle batches · verify-by-record form · anchor stream.

const { useState: useStateIn } = React;

// ─────────────────────────────────────────────────────────────
//  Icons
// ─────────────────────────────────────────────────────────────
const SVI = ({ size = 16, sw = 1.5, children, style, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);
const II = {
  Dashboard: (p) => <SVI {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="14" width="7" height="7"/></SVI>,
  Activity:  (p) => <SVI {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></SVI>,
  Line:      (p) => <SVI {...p}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></SVI>,
  Trend:     (p) => <SVI {...p}><path d="M22 7 13.5 15.5 9 11 2 18"/><path d="M16 7h6v6"/></SVI>,
  Bell:      (p) => <SVI {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></SVI>,
  Shield:    (p) => <SVI {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></SVI>,
  Tower:     (p) => <SVI {...p}><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8a6.14 6.14 0 0 1 .8 7.4"/><path d="M19.1 1.9a10.04 10.04 0 0 1 0 14.2"/><path d="M9.5 18h5"/><path d="m8 22 4-11 4 11"/></SVI>,
  Settings:  (p) => <SVI {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SVI>,
  Chevron:   (p) => <SVI {...p}><path d="m6 9 6 6 6-6"/></SVI>,
  ChevronR:  (p) => <SVI {...p}><path d="m9 18 6-6-6-6"/></SVI>,
  ArrowR:    (p) => <SVI {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></SVI>,
  ArrowUpR:  (p) => <SVI {...p}><path d="M7 17 17 7"/><path d="M7 7h10v10"/></SVI>,
  Search:    (p) => <SVI {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></SVI>,
  Copy:      (p) => <SVI {...p}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></SVI>,
  Check:     (p) => <SVI {...p}><path d="M20 6 9 17l-5-5"/></SVI>,
  Clock:     (p) => <SVI {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></SVI>,
  More:      (p) => <SVI {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></SVI>,
  Download:  (p) => <SVI {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></SVI>,
  Link:      (p) => <SVI {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></SVI>,
  Refresh:   (p) => <SVI {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></SVI>,
  Hash:      (p) => <SVI {...p}><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></SVI>,
  Tree:      (p) => <SVI {...p}><circle cx="12" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/><path d="M12 7v4"/><path d="M6 17v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></SVI>,
};

// ─────────────────────────────────────────────────────────────
//  App shell
// ─────────────────────────────────────────────────────────────
function SidebarI() {
  const items = [
    { icon: II.Dashboard, label: "Dashboard" },
    { icon: II.Activity,  label: "Live" },
    { icon: II.Line,      label: "Analytics" },
    { icon: II.Trend,     label: "Forecasts" },
    { icon: II.Bell,      label: "Alerts", badge: "3" },
    { icon: II.Shield,    label: "Integrity", active: true },
    { icon: II.Tower,     label: "Stations", badge: "12" },
    { icon: II.Settings,  label: "Settings" },
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
          <div key={it.label} className="nav-item">
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

function TopbarI() {
  return (
    <header style={{ height: 56, display: "flex", alignItems: "center", gap: 16, padding: "0 24px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg)" }}>
      <button className="btn btn-outline" style={{ height: 32, paddingLeft: 10, paddingRight: 10 }}>
        <II.Tower size={13} />
        <span style={{ fontSize: 13, color: "var(--fg-muted)", marginLeft: 2 }}>Station</span>
        <span style={{ fontSize: 13, color: "var(--fg)", marginLeft: 6 }}>All stations</span>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 6 }} className="mono">12</span>
        <II.Chevron size={12} style={{ marginLeft: 4, opacity: 0.6 }} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-subtle)", fontSize: 12 }}>
        <span>All stations</span><II.ChevronR size={11} /><span style={{ color: "var(--fg-muted)" }}>Integrity</span>
      </div>
      <div style={{ flex: 1 }} />
      <button className="btn btn-outline" style={{ height: 32, width: 220, justifyContent: "space-between", color: "var(--fg-subtle)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><II.Search size={13} /><span style={{ fontSize: 13 }}>Search stations, alerts…</span></span>
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
//  Hash chip (mono, optional copy)
// ─────────────────────────────────────────────────────────────
function Hash({ children, copy = true, mono = true, size = 12, color = "var(--fg)" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span className={mono ? "mono" : ""} style={{ fontSize: size, color }}>{children}</span>
      {copy && (
        <button className="btn btn-ghost btn-xs" style={{ width: 18, height: 18, padding: 0, color: "var(--fg-subtle)" }}>
          <II.Copy size={10} />
        </button>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
//  Sample batches + verified record
// ─────────────────────────────────────────────────────────────
const BATCHES = [
  { id: "b-5b1c",  time: "15:00", anchoredAt: "15:00:38", records: 248,   root: "computing…",   txn: "—",                   status: "pending", durationMs: null },
  { id: "b-4a2f",  time: "14:00", anchoredAt: "14:00:42", records: 1440,  root: "4a2f7e91...c91c", txn: "0.0.4837391",        status: "anchored", durationMs: 412 },
  { id: "b-8c12",  time: "13:00", anchoredAt: "13:00:38", records: 1440,  root: "8c12d4ab...0db7", txn: "0.0.4837287",        status: "anchored", durationMs: 388 },
  { id: "b-2f9d",  time: "12:00", anchoredAt: "12:00:51", records: 1440,  root: "2f9d8e1b...3a4c", txn: "0.0.4837184",        status: "anchored", durationMs: 510 },
  { id: "b-6e88",  time: "11:00", anchoredAt: "11:00:36", records: 1440,  root: "6e8841d2...77b9", txn: "0.0.4837081",        status: "anchored", durationMs: 367 },
  { id: "b-3c14",  time: "10:00", anchoredAt: "10:00:44", records: 1440,  root: "3c142e5a...9d0e", txn: "0.0.4836978",        status: "anchored", durationMs: 442 },
  { id: "b-9a7f",  time: "09:00", anchoredAt: "09:00:31", records: 1440,  root: "9a7f0d4c...e215", txn: "0.0.4836875",        status: "anchored", durationMs: 314 },
  { id: "b-7d04",  time: "08:00", anchoredAt: "08:00:48", records: 1440,  root: "7d04ba62...1834", txn: "0.0.4836772",        status: "anchored", durationMs: 480 },
];

const VERIFIED = {
  recordId: "r-1f4e29c8a7",
  recordHash: "a91b07e3...c7e4",
  station: "Tunis-Campus",
  sensor: "Pressure · Rooftop A",
  payload: "1013.04 hPa",
  timestamp: "13:14:32.221 · 19 May 2026",
  batch: "b-4a2f",
  batchRoot: "4a2f7e91...c91c",
  hederaTxn: "0.0.4837391@1747839284",
  merklePath: [
    { label: "leaf",  hash: "a91b...c7e4" },
    { label: "h₁",    hash: "d4f8...8b91" },
    { label: "h₂",    hash: "12c9...3e0a" },
    { label: "h₃",    hash: "7e23...d51f" },
    { label: "root",  hash: "4a2f...c91c" },
  ],
};

// ─────────────────────────────────────────────────────────────
//  Verify card (input form + success result)
// ─────────────────────────────────────────────────────────────
function VerifyCard() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
        <II.Hash size={14} style={{ color: "var(--accent-brand)" }} />
        <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Verify a record</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-subtle)" }}>
          Paste a record ID or hash to check it's anchored on Hedera.
        </span>
      </div>

      {/* Form */}
      <div style={{ padding: "14px 18px", display: "flex", gap: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 36, border: "1px solid var(--border-hover)", borderRadius: 8, background: "var(--surface-2)" }}>
          <span style={{ color: "var(--fg-subtle)" }} className="mono"><II.Hash size={13} /></span>
          <span className="mono" style={{ fontSize: 13, color: "var(--fg)", flex: 1, letterSpacing: 0.01 }}>{VERIFIED.recordId}</span>
          <span style={{ fontSize: 10, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }} className="mono">RECORD ID</span>
        </div>
        <button className="btn btn-primary" style={{ height: 36, paddingLeft: 14, paddingRight: 14 }}>
          <II.Check size={13} />
          <span>Verify</span>
        </button>
      </div>

      {/* Result */}
      <div style={{ flex: 1, padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 14, minHeight: 0, overflow: "hidden" }}>
        {/* Success banner */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px",
          border: `1px solid color-mix(in oklch, var(--sev-success) 60%, transparent)`,
          background: "color-mix(in oklch, var(--sev-success) 8%, transparent)",
          borderRadius: 8,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%",
            background: "color-mix(in oklch, var(--sev-success) 20%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--sev-success)",
          }}><II.Check size={14} /></span>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 13, color: "var(--fg)", fontWeight: 500 }}>Record verified</span>
            <span style={{ fontSize: 11, color: "var(--fg-muted)" }}>
              Anchored in batch <span className="mono" style={{ color: "var(--fg)" }}>{VERIFIED.batch}</span> · root matches · signature valid
            </span>
          </div>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--fg-subtle)" }}>
            <II.Clock size={11} /> <span className="mono">96 ms</span>
          </span>
        </div>

        {/* Record fields */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto 1fr", gap: "6px 16px", padding: "2px 4px" }}>
          <FieldLabel>Record hash</FieldLabel>
          <FieldValue><Hash>{VERIFIED.recordHash}</Hash></FieldValue>
          <FieldLabel>Timestamp</FieldLabel>
          <FieldValue><span className="mono" style={{ fontSize: 12, color: "var(--fg)" }}>{VERIFIED.timestamp}</span></FieldValue>

          <FieldLabel>Station</FieldLabel>
          <FieldValue><span style={{ fontSize: 12, color: "var(--fg)" }}>{VERIFIED.station}</span>
            <span style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 6 }}>{VERIFIED.sensor}</span>
          </FieldValue>
          <FieldLabel>Payload</FieldLabel>
          <FieldValue><span className="mono" style={{ fontSize: 13, color: "var(--fg)" }}>{VERIFIED.payload}</span></FieldValue>

          <FieldLabel>Hedera txn</FieldLabel>
          <FieldValue><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Hash size={12}>{VERIFIED.hederaTxn}</Hash>
            <button className="btn btn-ghost btn-xs" style={{ height: 18, padding: "0 4px", color: "var(--fg-subtle)" }}>
              <II.ArrowUpR size={10} /> HashScan
            </button>
          </span></FieldValue>
          <FieldLabel>Batch</FieldLabel>
          <FieldValue><span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            <span className="mono" style={{ color: "var(--fg)" }}>{VERIFIED.batch}</span>
            <span style={{ color: "var(--fg-subtle)", fontSize: 11 }}>· 14:00 · 1,440 records</span>
          </span></FieldValue>
        </div>

        {/* Merkle path */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.06, textTransform: "uppercase" }}>Merkle path</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)", padding: "1px 5px", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>
              {VERIFIED.merklePath.length - 1} hops
            </span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--fg-subtle)" }} className="mono">SHA-256</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {VERIFIED.merklePath.map((node, i) => {
              const isLeaf = i === 0;
              const isRoot = i === VERIFIED.merklePath.length - 1;
              const color = isLeaf || isRoot ? "var(--accent-brand)" : "var(--fg-muted)";
              return (
                <React.Fragment key={i}>
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "0 4px",
                    flex: 1, minWidth: 0,
                  }}>
                    <span style={{
                      width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${isLeaf || isRoot ? "var(--accent-brand)" : "var(--border-hover)"}`,
                      borderRadius: 4,
                      background: isLeaf || isRoot ? "color-mix(in oklch, var(--accent-brand) 12%, transparent)" : "var(--surface-2)",
                      color,
                    }}>
                      <II.Tree size={11} />
                    </span>
                    <span className="mono" style={{ fontSize: 10, color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                      {node.hash}
                    </span>
                    <span style={{ fontSize: 9, color: "var(--fg-subtle)", letterSpacing: 0.04, textTransform: "uppercase" }}>{node.label}</span>
                  </div>
                  {i < VERIFIED.merklePath.length - 1 && (
                    <span style={{ flexShrink: 0, color: "var(--fg-subtle)", marginTop: -16 }}>
                      <II.ChevronR size={12} />
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase", paddingTop: 1 }}>{children}</span>;
}
function FieldValue({ children }) {
  return <span style={{ fontSize: 12, display: "flex", alignItems: "center" }}>{children}</span>;
}

// ─────────────────────────────────────────────────────────────
//  Anchor health card (stats + chain + bar histogram)
// ─────────────────────────────────────────────────────────────
function AnchorHealthCard() {
  const lastBatches = BATCHES.slice().reverse(); // oldest-first for left-to-right
  const daysAnchors = [22, 24, 24, 24, 23, 24, 24]; // last 7 days, 24 anchors per day target

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <II.Shield size={14} style={{ color: "var(--sev-success)" }} />
        <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Anchor health</span>
        <span style={{ marginLeft: "auto", fontSize: 10, padding: "1px 6px", border: `1px solid color-mix(in oklch, var(--sev-success) 50%, transparent)`, color: "var(--sev-success)", borderRadius: 4 }} className="mono">
          HEDERA · MAINNET
        </span>
      </div>

      {/* Success rate big numeral */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="mono" style={{ fontSize: 36, color: "var(--fg)", fontWeight: 500, letterSpacing: -0.6, lineHeight: 1 }}>100</span>
        <span style={{ fontSize: 16, color: "var(--fg-muted)" }}>%</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--fg-subtle)" }}>success · 30d</span>
      </div>

      {/* Chain of recent batches */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>Last 8 batches</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>← older · newer →</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {lastBatches.map((b, i) => (
            <React.Fragment key={b.id}>
              <span style={{
                width: 14, height: 14, borderRadius: 3,
                background: b.status === "anchored" ? "var(--sev-success)" : "var(--sev-warn)",
                opacity: b.status === "anchored" ? 0.85 : 0.65,
                flexShrink: 0,
              }} title={`${b.id} · ${b.status}`} />
              {i < lastBatches.length - 1 && (
                <span style={{ flex: 1, height: 1, background: "var(--border-hover)" }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 6, borderTop: "1px solid var(--border-subtle)" }}>
        <KV2 label="Records (30d)" value="187,200" />
        <KV2 label="Batches (30d)" value="720" />
        <KV2 label="Avg anchor time" value="402 ms" />
        <KV2 label="Schedule" value="hourly" />
      </div>

      {/* Last 7 days bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>Anchors / day · last 7d</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>24 / day</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 32 }}>
          {daysAnchors.map((v, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 2 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", height: `${(v / 24) * 100}%`, background: "var(--sev-success)", opacity: 0.7, borderRadius: 1 }} />
              </div>
              <span className="mono" style={{ fontSize: 9, color: "var(--fg-subtle)", textAlign: "center" }}>{["6d","5d","4d","3d","2d","1d","td"][i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Next anchor */}
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 11, color: "var(--fg-subtle)" }}>Next anchor</span>
        <span className="mono" style={{ fontSize: 13, color: "var(--fg)" }}>28m 12s</span>
      </div>
    </div>
  );
}
function KV2({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase" }}>{label}</span>
      <span className="mono" style={{ fontSize: 14, color: "var(--fg)" }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Batch table
// ─────────────────────────────────────────────────────────────
function BatchRow({ batch, highlight }) {
  const sColor = batch.status === "anchored" ? "var(--sev-success)" : batch.status === "pending" ? "var(--sev-warn)" : "var(--sev-critical)";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "20px 100px 100px 1fr 1fr 110px 110px 36px",
      alignItems: "center", gap: 14,
      padding: "0 16px",
      height: 44,
      borderBottom: "1px solid var(--border-subtle)",
      background: highlight ? "var(--surface-2)" : "transparent",
      cursor: "pointer",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 1, background: sColor }} />
      <span className="mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>{batch.id}</span>
      <span className="mono" style={{ fontSize: 12, color: "var(--fg)" }}>{batch.time}</span>
      <span style={{ minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
        <Hash mono>{batch.root}</Hash>
      </span>
      <span>
        <Hash mono>{batch.txn}</Hash>
      </span>
      <span className="mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>{batch.records.toLocaleString()}</span>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        height: 20, padding: "0 8px", borderRadius: 999,
        border: `1px solid ${sColor}`,
        background: `color-mix(in oklch, ${sColor} 12%, transparent)`,
        color: sColor, fontSize: 11, fontWeight: 500,
      }}>
        {batch.status === "anchored" && <II.Check size={11} />}
        {batch.status === "pending" && <II.Clock size={11} />}
        {batch.status[0].toUpperCase() + batch.status.slice(1)}
      </span>
      <button className="btn btn-ghost btn-xs" style={{ width: 28, height: 28, padding: 0, justifyContent: "center" }}>
        <II.More size={14} />
      </button>
    </div>
  );
}

function BatchTable() {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
        <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Anchor stream</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 8 }}>
          · {BATCHES.length} batches · {(BATCHES.filter(b => b.status === "anchored").reduce((s, b) => s + b.records, 0)).toLocaleString()} records
        </span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-outline btn-xs">
            <II.Clock size={11} /> Last 24h <II.Chevron size={11} style={{ opacity: 0.6 }} />
          </button>
          <button className="btn btn-ghost btn-xs"><II.Download size={11} /> Export proofs</button>
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "20px 100px 100px 1fr 1fr 110px 110px 36px",
        gap: 14,
        padding: "8px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.05, textTransform: "uppercase",
      }}>
        <span />
        <span>Batch</span>
        <span>Time</span>
        <span>Merkle root</span>
        <span>Hedera txn</span>
        <span>Records</span>
        <span>Status</span>
        <span />
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {BATCHES.map((b, i) => (
          <BatchRow key={b.id} batch={b} highlight={b.id === VERIFIED.batch} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Page (desktop, 1440×900)
// ─────────────────────────────────────────────────────────────
function IntegrityDesktop() {
  return (
    <div className="wh-root" style={{ display: "flex", flexDirection: "column", width: 1440, height: 900, overflow: "hidden" }} data-screen-label="Integrity · Desktop">
      <TopbarI />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidebarI />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 24px", gap: 14, overflow: "hidden", minWidth: 0 }}>
          {/* Page header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--fg)", letterSpacing: -0.2 }}>Integrity</h1>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }}>v1.4</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--sev-success)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sev-success)" }} />
                  Last anchored 14:00:42
                </span>
              </div>
              <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                Sensor readings are hashed into hourly Merkle trees and the root is committed to Hedera mainnet.
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn btn-outline btn-xs"><II.Refresh size={11} /> Resync</button>
              <button className="btn btn-outline btn-xs"><II.Download size={11} /> Export proofs</button>
              <button className="btn btn-outline btn-xs"><II.Settings size={11} /> Anchor settings</button>
            </div>
          </div>

          {/* Top row: verify (flex) + anchor health (340) */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14, height: 380, minHeight: 380 }}>
            <VerifyCard />
            <AnchorHealthCard />
          </div>

          {/* Batch table */}
          <BatchTable />
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { IntegrityDesktop });
