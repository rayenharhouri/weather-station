// docs.jsx — WeatherHub for Research · Docs (tone-setter for the portal)
// Three-pane Stripe-style layout: nav · prose · sticky code panel.
// Article: GET /v1/readings — the canonical endpoint that exercises every
// doc primitive (method+path, params table, schema, callouts, errors, code
// samples in multiple languages).

const { useState: useStateDc } = React;

// ─────────────────────────────────────────────────────────────
//  Icons
// ─────────────────────────────────────────────────────────────
const SVD = ({ size = 16, sw = 1.5, children, style, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
    strokeLinejoin="round" style={{ display: "block", flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const DI = {
  Book:      (p) => <SVD {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></SVD>,
  Terminal:  (p) => <SVD {...p}><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></SVD>,
  Database:  (p) => <SVD {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/></SVD>,
  Key:       (p) => <SVD {...p}><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></SVD>,
  Download:  (p) => <SVD {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></SVD>,
  BarChart:  (p) => <SVD {...p}><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></SVD>,
  Settings:  (p) => <SVD {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></SVD>,
  User:      (p) => <SVD {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></SVD>,
  Search:    (p) => <SVD {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></SVD>,
  Chevron:   (p) => <SVD {...p}><path d="m6 9 6 6 6-6"/></SVD>,
  ChevronR:  (p) => <SVD {...p}><path d="m9 18 6-6-6-6"/></SVD>,
  ChevronUp: (p) => <SVD {...p}><path d="m18 15-6-6-6 6"/></SVD>,
  Copy:      (p) => <SVD {...p}><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></SVD>,
  Check:     (p) => <SVD {...p}><path d="M20 6 9 17l-5-5"/></SVD>,
  Hash:      (p) => <SVD {...p}><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></SVD>,
  ArrowUpR:  (p) => <SVD {...p}><path d="M7 17 17 7"/><path d="M7 7h10v10"/></SVD>,
  ArrowR:    (p) => <SVD {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></SVD>,
  Github:    (p) => <SVD {...p}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5a4.8 4.8 0 0 0-1 3.5v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></SVD>,
  Flask:     (p) => <SVD {...p}><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.58 16.5h12.85"/></SVD>,
  ThumbsUp:  (p) => <SVD {...p}><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L15 2h0a3.13 3.13 0 0 1 0 3.88z"/></SVD>,
  ThumbsDown:(p) => <SVD {...p}><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L9 22h0a3.13 3.13 0 0 1 0-3.88z"/></SVD>,
  Info:      (p) => <SVD {...p}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></SVD>,
  Tower:     (p) => <SVD {...p}><path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/><path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/><circle cx="12" cy="9" r="2"/><path d="M16.2 4.8a6.14 6.14 0 0 1 .8 7.4"/><path d="M19.1 1.9a10.04 10.04 0 0 1 0 14.2"/></SVD>,
};

// ─────────────────────────────────────────────────────────────
//  App shell — research portal flavor
// ─────────────────────────────────────────────────────────────
function SidebarResearch() {
  const apiItems = [
    { icon: DI.Terminal, label: "Playground" },
    { icon: DI.Book,     label: "Docs", active: true },
    { icon: DI.Database, label: "Datasets" },
  ];
  const acctItems = [
    { icon: DI.Key,      label: "Tokens", badge: "4" },
    { icon: DI.Download, label: "Exports" },
    { icon: DI.BarChart, label: "Usage" },
    { icon: DI.Settings, label: "Account" },
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
            <it.icon size={16} />
            <span>{it.label}</span>
            {it.badge && <span className="badge">{it.badge}</span>}
          </div>
        ))}
        <div style={{ fontSize: 10, color: "var(--fg-subtle)", letterSpacing: 0.1, textTransform: "uppercase", padding: "16px 10px 6px" }}>Account</div>
        {acctItems.map((it) => (
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

function TopbarResearch() {
  return (
    <header style={{
      height: 56, display: "flex", alignItems: "center", gap: 16,
      padding: "0 24px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--bg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-subtle)" }}>
        <span className="mono" style={{ color: "var(--fg-muted)" }}>research.weatherhub.local</span>
        <DI.ChevronR size={11} />
        <span style={{ color: "var(--fg-muted)" }}>Docs</span>
        <DI.ChevronR size={11} />
        <span style={{ color: "var(--fg-muted)" }}>Resources</span>
        <DI.ChevronR size={11} />
        <span style={{ color: "var(--fg)" }}>Readings</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Researcher mode chip */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 26, padding: "0 10px", borderRadius: 999,
        border: "1px solid var(--border-hover)",
        background: "var(--surface-2)",
      }}>
        <DI.Flask size={12} style={{ color: "var(--accent-brand)" }} />
        <span style={{ fontSize: 11.5, color: "var(--fg)", fontWeight: 500 }}>Researcher mode</span>
      </div>

      {/* Active token chip */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 10px", height: 32, border: "1px solid var(--border-subtle)", borderRadius: 8 }}>
        <DI.Key size={12} style={{ color: "var(--fg-muted)" }} />
        <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>wh_rsa_••••aB7c</span>
        <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)", paddingLeft: 6, borderLeft: "1px solid var(--border-subtle)" }}>papers-2026</span>
        <DI.Chevron size={11} style={{ opacity: 0.6, color: "var(--fg-muted)" }} />
      </div>

      <button className="btn btn-outline" style={{ height: 32, width: 220, justifyContent: "space-between", color: "var(--fg-subtle)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <DI.Search size={13} />
          <span style={{ fontSize: 13 }}>Search the docs…</span>
        </span>
        <span className="mono" style={{ fontSize: 10, padding: "1px 4px", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>⌘K</span>
      </button>

      <button className="btn btn-ghost" style={{ height: 32, padding: 0, gap: 8 }}>
        <span style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg, oklch(0.72 0.14 50), oklch(0.68 0.16 38))",
          color: "#231a14", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 600,
        }}>SA</span>
      </button>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
//  Left docs nav — collapsible section tree
// ─────────────────────────────────────────────────────────────
function DocsNav() {
  const sections = [
    { id: "start", title: "Getting started", expanded: true, items: [
      "Quickstart", "Authentication", "Pagination", "Rate limits", "Errors",
    ]},
    { id: "resources", title: "Resources", expanded: true, items: [
      { label: "Stations" },
      { label: "Readings", expanded: true, children: [
        { label: "List readings", active: true },
        { label: "Get reading" },
        { label: "Stream readings (SSE)", badge: "Live" },
      ]},
      { label: "Forecasts" },
      { label: "Alerts" },
      { label: "Integrity" },
    ]},
    { id: "sdks", title: "SDKs", expanded: false, items: ["Python", "JavaScript / Node", "R"] },
    { id: "changelog", title: "Changelog", expanded: false, items: [] },
  ];

  return (
    <aside style={{
      width: 240, height: "100%",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex", flexDirection: "column",
      background: "var(--bg)",
    }}>
      {/* Docs-scoped search */}
      <div style={{ padding: "14px 14px 10px" }}>
        <button className="btn btn-outline" style={{ width: "100%", height: 30, justifyContent: "space-between", color: "var(--fg-subtle)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <DI.Search size={12} />
            <span style={{ fontSize: 12 }}>Find in docs</span>
          </span>
          <span className="mono" style={{ fontSize: 10, padding: "1px 4px", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>/</span>
        </button>
      </div>

      <hr className="hairline" />

      <div style={{ flex: 1, overflow: "auto", padding: "10px 6px" }} className="no-scroll">
        {sections.map(s => (
          <NavSection key={s.id} section={s} />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px", borderTop: "1px solid var(--border-subtle)" }}>
        <button className="btn btn-ghost btn-xs" style={{ justifyContent: "flex-start", height: 24, color: "var(--fg-muted)", padding: "0 6px" }}>
          <DI.Github size={11} /> View on GitHub
        </button>
        <button className="btn btn-ghost btn-xs" style={{ justifyContent: "flex-start", height: 24, color: "var(--fg-muted)", padding: "0 6px" }}>
          <DI.Terminal size={11} /> OpenAPI · download
        </button>
      </div>
    </aside>
  );
}

function NavSection({ section }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 10px",
        fontSize: 10, color: "var(--fg-subtle)",
        letterSpacing: 0.06, textTransform: "uppercase",
      }}>
        {section.expanded
          ? <DI.Chevron size={11} />
          : <DI.ChevronR size={11} />}
        <span>{section.title}</span>
      </div>
      {section.expanded && section.items.map((it, i) => {
        const isObj = typeof it === "object";
        const label = isObj ? it.label : it;
        return (
          <React.Fragment key={i}>
            <NavItem label={label} active={isObj && it.active}
              hasChildren={isObj && it.children} expanded={isObj && it.expanded}
              badge={isObj && it.badge} indent={1} />
            {isObj && it.children && it.expanded && it.children.map((c, j) => (
              <NavItem key={j} label={c.label} active={c.active} badge={c.badge} indent={2} />
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function NavItem({ label, active, hasChildren, expanded, badge, indent = 1 }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: `6px ${10 + indent * 4}px 6px ${8 + indent * 14}px`,
      borderRadius: 6,
      cursor: "pointer",
      background: active ? "var(--accent-brand-soft)" : "transparent",
      color: active ? "var(--fg)" : "var(--fg-muted)",
      position: "relative",
      fontSize: 12.5,
      fontWeight: active ? 500 : 400,
      lineHeight: 1.3,
    }}>
      {active && (
        <span style={{ position: "absolute", left: 0, top: 5, bottom: 5, width: 2, background: "var(--accent-brand)", borderRadius: 1 }} />
      )}
      {hasChildren && (
        expanded
          ? <DI.Chevron size={10} style={{ color: "var(--fg-subtle)" }} />
          : <DI.ChevronR size={10} style={{ color: "var(--fg-subtle)" }} />
      )}
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {badge && (
        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border-subtle)", color: "var(--sev-success)" }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Doc primitives — method badge, params table, schema list, callout
// ─────────────────────────────────────────────────────────────
const METHOD_COLOR = {
  GET:    "var(--sev-info)",
  POST:   "var(--sev-warn)",
  PUT:    "var(--sev-warn)",
  DELETE: "var(--sev-critical)",
};
function MethodBadge({ method }) {
  const c = METHOD_COLOR[method] || "var(--fg-muted)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      height: 22, padding: "0 8px",
      borderRadius: 4,
      border: `1px solid ${c}`,
      background: `color-mix(in oklch, ${c} 14%, transparent)`,
      color: c, fontSize: 11, fontWeight: 600, letterSpacing: 0.04,
      fontFamily: "var(--font-mono)",
    }}>{method}</span>
  );
}

function ParamRow({ name, type, required, defaultV, children }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "180px 1fr",
      gap: 16,
      padding: "12px 16px",
      borderBottom: "1px solid var(--border-subtle)",
      alignItems: "flex-start",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span className="mono" style={{ fontSize: 12.5, color: "var(--fg)", fontWeight: 500 }}>{name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--fg-subtle)" }}>
          <span className="mono">{type}</span>
          {required && <span style={{ color: "var(--sev-critical)", fontWeight: 500 }}>required</span>}
          {!required && <span>optional</span>}
        </div>
        {defaultV && (
          <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-subtle)" }}>
            default: <span style={{ color: "var(--fg-muted)" }}>{defaultV}</span>
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55 }}>
        {children}
      </div>
    </div>
  );
}

function SchemaRow({ name, type, children, indent = 0 }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `${180 - indent * 16}px 1fr`,
      gap: 16,
      padding: `8px 16px 8px ${16 + indent * 16}px`,
      borderBottom: "1px solid var(--border-subtle)",
      alignItems: "flex-start",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="mono" style={{ fontSize: 12.5, color: "var(--fg)" }}>{name}</span>
        <span className="mono" style={{ fontSize: 10.5, color: "var(--fg-subtle)" }}>{type}</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

function ErrorRow({ code, name, children }) {
  const c = code >= 500 ? "var(--sev-critical)" :
            code >= 400 ? "var(--sev-warn)" :
            "var(--sev-info)";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "56px 180px 1fr",
      gap: 16,
      padding: "10px 16px",
      borderBottom: "1px solid var(--border-subtle)",
      alignItems: "center",
    }}>
      <span className="mono" style={{ fontSize: 12, color: c, fontWeight: 600 }}>{code}</span>
      <span className="mono" style={{ fontSize: 12.5, color: "var(--fg)" }}>{name}</span>
      <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{children}</span>
    </div>
  );
}

function Callout({ kind = "info", title, children, icon: Icon }) {
  const c = kind === "warn" ? "var(--sev-warn)" :
            kind === "critical" ? "var(--sev-critical)" :
            kind === "success" ? "var(--sev-success)" :
            "var(--accent-brand)";
  return (
    <div style={{
      display: "flex", gap: 12,
      padding: "12px 14px",
      border: `1px solid color-mix(in oklch, ${c} 45%, transparent)`,
      background: `color-mix(in oklch, ${c} 8%, transparent)`,
      borderRadius: 8,
    }}>
      <span style={{ color: c, flexShrink: 0, marginTop: 2 }}>
        {Icon ? <Icon size={14} /> : <DI.Info size={14} />}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {title && <span style={{ fontSize: 13, color: "var(--fg)", fontWeight: 600 }}>{title}</span>}
        <span style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.55 }}>{children}</span>
      </div>
    </div>
  );
}

// Section heading with anchor
function H2({ id, children }) {
  return (
    <h2 id={id} style={{
      display: "flex", alignItems: "center", gap: 8,
      margin: "28px 0 12px",
      fontSize: 18, fontWeight: 600, letterSpacing: -0.1, color: "var(--fg)",
    }}>
      <span style={{ color: "var(--fg-subtle)", opacity: 0.6 }} className="mono">§</span>
      <span>{children}</span>
    </h2>
  );
}

// ─────────────────────────────────────────────────────────────
//  Article body — GET /v1/readings
// ─────────────────────────────────────────────────────────────
function Article() {
  return (
    <div style={{
      flex: 1, overflow: "auto", minHeight: 0,
      padding: "32px 48px 48px",
    }} className="no-scroll">
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        {/* Eyebrow */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--fg-subtle)", letterSpacing: 0.06, textTransform: "uppercase" }}>Resources · Readings</span>
            <span style={{ fontSize: 11, color: "var(--fg-subtle)", padding: "1px 6px", border: "1px solid var(--border-subtle)", borderRadius: 4 }} className="mono">v1</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--fg-subtle)" }}>
            <span>Updated 19 May 2026</span>
            <span style={{ width: 1, height: 12, background: "var(--border-subtle)" }} />
            <button className="btn btn-ghost btn-xs" style={{ height: 22, padding: "0 6px" }}>
              <DI.Github size={11} /> Edit
            </button>
          </div>
        </div>

        {/* H1 + endpoint card */}
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: -0.6, color: "var(--fg)" }}>
          List readings
        </h1>
        <p style={{ margin: "10px 0 18px", fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.6, maxWidth: "62ch" }}>
          Returns a paginated list of sensor readings ordered by{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)", padding: "1px 5px", background: "var(--surface-2)", border: "1px solid var(--border-inset)", borderRadius: 3 }}>recorded_at</code>{" "}
          descending. Supports filtering by station, metric, and time range. Use{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)", padding: "1px 5px", background: "var(--surface-2)", border: "1px solid var(--border-inset)", borderRadius: 3 }}>cursor</code>{" "}
          to paginate beyond 1,000 records per call.
        </p>

        {/* Method + path card */}
        <div className="card" style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px", background: "var(--surface-2)",
        }}>
          <MethodBadge method="GET" />
          <span className="mono" style={{ fontSize: 13, color: "var(--fg)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            https://research.weatherhub.local/v1/readings
          </span>
          <button className="btn btn-ghost btn-xs" style={{ width: 22, height: 22, padding: 0, color: "var(--fg-subtle)" }}>
            <DI.Copy size={11} />
          </button>
        </div>

        {/* Authentication */}
        <H2 id="auth">Authentication</H2>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.6 }}>
          All requests require a bearer token. Pass it in the{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)", padding: "1px 5px", background: "var(--surface-2)", border: "1px solid var(--border-inset)", borderRadius: 3 }}>Authorization</code>{" "}
          header. Tokens are managed in your{" "}
          <a href="#" style={{ color: "var(--accent-brand)", textDecoration: "none" }}>Tokens</a> page.
        </p>

        {/* Query parameters */}
        <H2 id="params">Query parameters</H2>
        <div className="card" style={{ overflow: "hidden" }}>
          <ParamRow name="station" type="string · array" defaultV="home tenant">
            One or more station IDs (comma-separated). Cross-tenant station IDs require an active grant from the owning tenant's admin.
          </ParamRow>
          <ParamRow name="metric" type="enum">
            One of <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)" }}>temperature, humidity, pressure, rainfall, light, aqi, battery, rssi</code>.
          </ParamRow>
          <ParamRow name="since" type="ISO 8601" defaultV="24h ago">
            Lower bound on <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)" }}>recorded_at</code>, inclusive. Maximum window is 30 days.
          </ParamRow>
          <ParamRow name="until" type="ISO 8601" defaultV="now">
            Upper bound on <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)" }}>recorded_at</code>, exclusive.
          </ParamRow>
          <ParamRow name="interval" type="enum">
            Aggregation window: <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)" }}>1m, 5m, 15m, 1h, 1d</code>. When set, returns mean-aggregated readings instead of raw points.
          </ParamRow>
          <ParamRow name="limit" type="integer" defaultV="100">
            Page size. Max 1,000.
          </ParamRow>
          <ParamRow name="cursor" type="string">
            Opaque pagination cursor returned by a previous call.
          </ParamRow>
        </div>

        {/* Returns */}
        <H2 id="returns">Returns</H2>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.6 }}>
          <span style={{ color: "var(--sev-success)" }}>200 OK</span> — an object with a <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)" }}>data</code> array and <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)" }}>next_cursor</code> for pagination.
        </p>
        <div className="card" style={{ overflow: "hidden" }}>
          <SchemaRow name="data" type="object[]">List of readings.</SchemaRow>
          <SchemaRow name="id"             type="string"   indent={1}>Unique reading identifier (cross-batch stable).</SchemaRow>
          <SchemaRow name="station_id"     type="string"   indent={1}>Station identifier (tenant-scoped).</SchemaRow>
          <SchemaRow name="sensor_id"      type="string"   indent={1}>Sensor identifier on the station.</SchemaRow>
          <SchemaRow name="metric"         type="enum"     indent={1}>Metric type (see <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>metric</code> param above).</SchemaRow>
          <SchemaRow name="value"          type="number"   indent={1}>Reading value in <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>unit</code>.</SchemaRow>
          <SchemaRow name="unit"           type="string"   indent={1}>SI unit. e.g. <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>celsius</code>, <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>hPa</code>.</SchemaRow>
          <SchemaRow name="recorded_at"    type="ISO 8601" indent={1}>Reading timestamp, millisecond precision.</SchemaRow>
          <SchemaRow name="merkle_anchor"  type="string"   indent={1}>Batch ID this reading is anchored in. <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>null</code> if unanchored (less than 1h old).</SchemaRow>
          <SchemaRow name="next_cursor"    type="string">Pass to a subsequent call to retrieve the next page. <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>null</code> when no more results.</SchemaRow>
        </div>

        {/* Cross-tenant callout */}
        <div style={{ marginTop: 24 }}>
          <Callout kind="warn" title="Cross-tenant access" icon={DI.Tower}>
            Querying stations outside your home tenant requires an explicit grant from the owning tenant's admin. Active and pending grants are visible on your <a href="#" style={{ color: "var(--accent-brand)" }}>Tokens</a> page. Without a grant, cross-tenant station IDs return <code style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg)" }}>403 cross_tenant_denied</code>.
          </Callout>
        </div>

        {/* Rate limits */}
        <H2 id="rate-limits">Rate limits</H2>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.6 }}>
          Each bearer token is limited to <span className="mono" style={{ color: "var(--fg)" }}>60 req/min</span> and <span className="mono" style={{ color: "var(--fg)" }}>10,000 req/day</span>. Current usage is returned in <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)" }}>X-RateLimit-*</code> response headers; exceeded limits return <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)" }}>429 rate_limited</code> with a <code style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)" }}>Retry-After</code> header.
        </p>

        {/* Errors */}
        <H2 id="errors">Errors</H2>
        <div className="card" style={{ overflow: "hidden" }}>
          <ErrorRow code={401} name="invalid_token">Authorization header missing, malformed, or token revoked.</ErrorRow>
          <ErrorRow code={403} name="cross_tenant_denied">No active grant for one or more requested stations.</ErrorRow>
          <ErrorRow code={422} name="invalid_params">Unrecognized or malformed parameter (see <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>details</code>).</ErrorRow>
          <ErrorRow code={429} name="rate_limited">Per-token request rate exceeded.</ErrorRow>
          <ErrorRow code={500} name="upstream_unavailable">Sensor database temporarily unreachable. Retry with backoff.</ErrorRow>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0 8px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--fg-muted)" }}>
            <span>Was this page helpful?</span>
            <button className="btn btn-outline btn-xs"><DI.ThumbsUp size={11} /> Yes</button>
            <button className="btn btn-outline btn-xs"><DI.ThumbsDown size={11} /> No</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
            <a href="#" style={{ color: "var(--fg-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              ← Stations
            </a>
            <a href="#" style={{ color: "var(--accent-brand)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
              Get reading →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Right pane — language tabs + code + response viewer
// ─────────────────────────────────────────────────────────────
const SAMPLES = {
  curl: `curl https://research.weatherhub.local/v1/readings \\
  -H "Authorization: Bearer wh_rsa_••••aB7c" \\
  -G \\
  -d "station=tunis-campus" \\
  -d "metric=temperature" \\
  -d "since=2026-05-19T08:00:00Z" \\
  -d "until=2026-05-19T14:00:00Z" \\
  -d "interval=5m" \\
  -d "limit=200"`,
  python: `from weatherhub import Client

wh = Client(token="wh_rsa_••••aB7c")

readings = wh.readings.list(
    station="tunis-campus",
    metric="temperature",
    since="2026-05-19T08:00:00Z",
    until="2026-05-19T14:00:00Z",
    interval="5m",
    limit=200,
)`,
  node: `import WeatherHub from "@weatherhub/sdk";

const wh = new WeatherHub({ token: "wh_rsa_••••aB7c" });

const readings = await wh.readings.list({
  station: "tunis-campus",
  metric:  "temperature",
  since:   "2026-05-19T08:00:00Z",
  until:   "2026-05-19T14:00:00Z",
  interval: "5m",
  limit:   200,
});`,
  r: `library(weatherhub)

wh <- weatherhub_client(token = "wh_rsa_••••aB7c")

readings <- wh_readings_list(
  wh,
  station  = "tunis-campus",
  metric   = "temperature",
  since    = "2026-05-19T08:00:00Z",
  until    = "2026-05-19T14:00:00Z",
  interval = "5m",
  limit    = 200
)`,
};

// Minimal token highlighter — colorless except keys + strings + numbers
function highlightCurl(text) {
  // very light cmd shell highlight
  return text.split("\n").map((line, i) => {
    const m = line.match(/^(\s*)(curl|-H|-G|-d)(\s+)(.*)$/);
    if (m) {
      const [, lead, flag, sp, rest] = m;
      return (
        <span key={i} style={{ display: "block" }}>
          <span>{lead}</span>
          <span style={{ color: "var(--accent-brand)" }}>{flag}</span>
          <span>{sp}</span>
          <span style={{ color: "var(--m-light)" }}>{rest}</span>
        </span>
      );
    }
    return <span key={i} style={{ display: "block" }}>{line}</span>;
  });
}

function highlightPyJs(text, lang) {
  // Very small token coloring — keywords + strings + numbers
  const kw = lang === "python"
    ? /\b(from|import|def|class|return|None|True|False)\b/g
    : /\b(import|from|const|let|var|await|new|function|return|null|true|false)\b/g;
  // Just split lines and color
  return text.split("\n").map((line, i) => {
    const parts = [];
    let last = 0;
    // strings
    const strRe = /"[^"]*"|'[^']*'/g;
    let m;
    const matches = [];
    while ((m = strRe.exec(line))) matches.push({ kind: "str", i: m.index, len: m[0].length, txt: m[0] });
    while ((m = kw.exec(line))) {
      const inStr = matches.some(x => m.index >= x.i && m.index < x.i + x.len);
      if (!inStr) matches.push({ kind: "kw", i: m.index, len: m[0].length, txt: m[0] });
    }
    matches.sort((a, b) => a.i - b.i);
    for (const ma of matches) {
      if (ma.i > last) parts.push({ kind: "txt", txt: line.slice(last, ma.i) });
      parts.push(ma);
      last = ma.i + ma.len;
    }
    if (last < line.length) parts.push({ kind: "txt", txt: line.slice(last) });

    return (
      <span key={i} style={{ display: "block" }}>
        {parts.map((p, j) => {
          if (p.kind === "kw")  return <span key={j} style={{ color: "var(--accent-brand)" }}>{p.txt}</span>;
          if (p.kind === "str") return <span key={j} style={{ color: "var(--m-light)" }}>{p.txt}</span>;
          return <span key={j}>{p.txt}</span>;
        })}
      </span>
    );
  });
}

function CodeBlock({ lang }) {
  const text = SAMPLES[lang];
  let rendered;
  if (lang === "curl") rendered = highlightCurl(text);
  else if (lang === "r") rendered = highlightPyJs(text, "python"); // close enough
  else rendered = highlightPyJs(text, lang);
  return (
    <pre style={{
      margin: 0, padding: "14px 16px",
      fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.65,
      color: "var(--fg)",
      whiteSpace: "pre", overflow: "auto",
      flex: 1, minHeight: 0,
    }} className="no-scroll">{rendered}</pre>
  );
}

function JsonViewer() {
  const monoFont = "var(--font-mono)";
  const Str = ({ children }) => <span style={{ color: "var(--m-light)" }}>"{children}"</span>;
  const Num = ({ children }) => <span style={{ color: "var(--accent-brand)" }}>{children}</span>;
  const Null = () => <span style={{ color: "var(--fg-subtle)" }}>null</span>;
  const Key = ({ children }) => <span style={{ color: "var(--fg-muted)" }}>"{children}"</span>;
  const Punc = ({ children }) => <span style={{ color: "var(--fg-subtle)" }}>{children}</span>;

  return (
    <pre style={{
      margin: 0, padding: "14px 16px",
      fontFamily: monoFont, fontSize: 12, lineHeight: 1.65,
      color: "var(--fg)",
      whiteSpace: "pre", overflow: "auto",
      flex: 1, minHeight: 0,
    }} className="no-scroll">
      <Punc>{`{`}</Punc>{"\n"}
      {`  `}<Key>data</Key><Punc>: [</Punc>{"\n"}
      {`    `}<Punc>{`{`}</Punc>{"\n"}
      {`      `}<Key>id</Key><Punc>: </Punc><Str>r-1f4e29c8a7</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>station_id</Key><Punc>: </Punc><Str>tunis-campus</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>sensor_id</Key><Punc>: </Punc><Str>rooftop-a</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>metric</Key><Punc>: </Punc><Str>temperature</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>value</Key><Punc>: </Punc><Num>23.41</Num><Punc>,</Punc>{"\n"}
      {`      `}<Key>unit</Key><Punc>: </Punc><Str>celsius</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>recorded_at</Key><Punc>: </Punc><Str>2026-05-19T13:14:32.221Z</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>merkle_anchor</Key><Punc>: </Punc><Str>b-4a2f</Str>{"\n"}
      {`    `}<Punc>{`}`}</Punc><Punc>,</Punc>{"\n"}
      {`    `}<Punc>{`{`}</Punc>{"\n"}
      {`      `}<Key>id</Key><Punc>: </Punc><Str>r-1f4e29ca12</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>station_id</Key><Punc>: </Punc><Str>tunis-campus</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>sensor_id</Key><Punc>: </Punc><Str>rooftop-a</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>metric</Key><Punc>: </Punc><Str>temperature</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>value</Key><Punc>: </Punc><Num>23.46</Num><Punc>,</Punc>{"\n"}
      {`      `}<Key>unit</Key><Punc>: </Punc><Str>celsius</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>recorded_at</Key><Punc>: </Punc><Str>2026-05-19T13:19:32.221Z</Str><Punc>,</Punc>{"\n"}
      {`      `}<Key>merkle_anchor</Key><Punc>: </Punc><Null />{"\n"}
      {`    `}<Punc>{`}`}</Punc>{"\n"}
      {`  `}<Punc>],</Punc>{"\n"}
      {`  `}<Key>next_cursor</Key><Punc>: </Punc><Str>eyJpZCI6InItMWY0…</Str>{"\n"}
      <Punc>{`}`}</Punc>
    </pre>
  );
}

function CodePanel() {
  const langs = [
    { key: "curl",   label: "curl" },
    { key: "python", label: "Python" },
    { key: "node",   label: "Node" },
    { key: "r",      label: "R" },
  ];
  const active = "curl";

  return (
    <aside style={{
      width: 400,
      borderLeft: "1px solid var(--border-subtle)",
      display: "flex", flexDirection: "column",
      padding: "20px 16px 16px",
      gap: 12,
      background: "var(--bg)",
      overflow: "hidden",
    }}>
      {/* Request card */}
      <div className="card" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", flex: 1, alignItems: "stretch" }}>
            {langs.map((l, i) => (
              <button key={l.key} style={{
                border: 0,
                padding: "6px 10px 8px",
                background: "transparent",
                color: l.key === active ? "var(--fg)" : "var(--fg-muted)",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: l.key === active ? 600 : 500,
                cursor: "pointer",
                position: "relative",
              }}>
                {l.label}
                {l.key === active && (
                  <span style={{ position: "absolute", left: 8, right: 8, bottom: -1, height: 2, background: "var(--accent-brand)" }} />
                )}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button className="btn btn-ghost btn-xs" style={{ width: 24, height: 24, padding: 0, color: "var(--fg-subtle)" }}>
              <DI.Copy size={12} />
            </button>
          </div>
        </div>
        <CodeBlock lang={active} />
      </div>

      {/* Response card */}
      <div className="card" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--fg-muted)", fontWeight: 500 }}>Response</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--sev-success)", padding: "1px 6px", border: "1px solid color-mix(in oklch, var(--sev-success) 50%, transparent)", borderRadius: 4 }}>200 OK</span>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>application/json</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>86 ms</span>
            <button className="btn btn-ghost btn-xs" style={{ width: 22, height: 22, padding: 0, color: "var(--fg-subtle)" }}>
              <DI.Copy size={11} />
            </button>
          </span>
        </div>
        <JsonViewer />
      </div>

      {/* Try in playground */}
      <button className="btn btn-outline" style={{ height: 32, justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <DI.Terminal size={12} />
          <span style={{ fontSize: 12 }}>Try this in the Playground</span>
        </span>
        <DI.ArrowR size={12} />
      </button>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
//  Docs page (desktop, 1440×900)
// ─────────────────────────────────────────────────────────────
function DocsDesktop() {
  return (
    <div className="wh-root" style={{ display: "flex", flexDirection: "column", width: 1440, height: 900, overflow: "hidden" }} data-screen-label="Docs · Desktop">
      <TopbarResearch />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SidebarResearch />
        {/* Three-pane docs layout */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, minWidth: 0 }}>
          <DocsNav />
          <Article />
          <CodePanel />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DocsDesktop });
