'use client';

import { useState, type ReactNode } from 'react';
import { Copy, Terminal, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HairlineCard } from '@/components/ui/hairline-card';

export type SampleLang = 'curl' | 'python' | 'node' | 'r';

interface LangSpec {
  key: SampleLang;
  label: string;
  text: string;
}

const SAMPLES: Record<SampleLang, string> = {
  curl: `curl https://research.weatherhub.tn/v1/readings \\
  -H "Authorization: Bearer wh_rsa_••••aB7c" \\
  -G \\
  -d "station=tunis-campus" \\
  -d "metric=temperature" \\
  -d "since=2026-05-20T08:00:00Z" \\
  -d "until=2026-05-20T14:00:00Z" \\
  -d "interval=5m" \\
  -d "limit=200"`,
  python: `from weatherhub import Client

wh = Client(token="wh_rsa_••••aB7c")

readings = wh.readings.list(
    station="tunis-campus",
    metric="temperature",
    since="2026-05-20T08:00:00Z",
    until="2026-05-20T14:00:00Z",
    interval="5m",
    limit=200,
)`,
  node: `import WeatherHub from "@weatherhub/sdk";

const wh = new WeatherHub({ token: "wh_rsa_••••aB7c" });

const readings = await wh.readings.list({
  station: "tunis-campus",
  metric:  "temperature",
  since:   "2026-05-20T08:00:00Z",
  until:   "2026-05-20T14:00:00Z",
  interval: "5m",
  limit:   200,
});`,
  r: `library(weatherhub)

wh <- weatherhub_client(token = "wh_rsa_••••aB7c")

readings <- wh_readings_list(
  wh,
  station  = "tunis-campus",
  metric   = "temperature",
  since    = "2026-05-20T08:00:00Z",
  until    = "2026-05-20T14:00:00Z",
  interval = "5m",
  limit    = 200
)`,
};

const LANGS: LangSpec[] = [
  { key: 'curl', label: 'curl', text: SAMPLES.curl },
  { key: 'python', label: 'Python', text: SAMPLES.python },
  { key: 'node', label: 'Node', text: SAMPLES.node },
  { key: 'r', label: 'R', text: SAMPLES.r },
];

const KEYWORDS: Record<SampleLang, RegExp | null> = {
  curl: null,
  python: /\b(from|import|def|class|return|None|True|False)\b/g,
  node: /\b(import|from|const|let|var|await|new|function|return|null|true|false)\b/g,
  r: /\b(library|function|return|TRUE|FALSE|NULL|if|else)\b/g,
};

const STRING_REGEX = /"[^"]*"|'[^']*'/g;

function highlightLine(line: string, lang: SampleLang, lineKey: number) {
  if (lang === 'curl') {
    const flagMatch = line.match(/^(\s*)(curl|-H|-G|-d)(\s+)(.*)$/);
    if (flagMatch) {
      const [, lead, flag, sp, rest] = flagMatch;
      return (
        <span key={lineKey} className="block">
          <span>{lead}</span>
          <span style={{ color: 'var(--accent-brand)' }}>{flag}</span>
          <span>{sp}</span>
          <span style={{ color: 'var(--m-light)' }}>{rest}</span>
        </span>
      );
    }
    return (
      <span key={lineKey} className="block">
        {line}
      </span>
    );
  }

  const kw = KEYWORDS[lang];
  const matches: Array<{ kind: 'kw' | 'str'; i: number; len: number; txt: string }> = [];

  let m: RegExpExecArray | null;
  STRING_REGEX.lastIndex = 0;
  while ((m = STRING_REGEX.exec(line))) {
    matches.push({ kind: 'str', i: m.index, len: m[0].length, txt: m[0] });
  }

  if (kw) {
    kw.lastIndex = 0;
    while ((m = kw.exec(line))) {
      const inString = matches.some(
        (x) => x.kind === 'str' && (m as RegExpExecArray).index >= x.i && (m as RegExpExecArray).index < x.i + x.len,
      );
      if (!inString) {
        matches.push({ kind: 'kw', i: m.index, len: m[0].length, txt: m[0] });
      }
    }
  }

  matches.sort((a, b) => a.i - b.i);
  const parts: Array<{ kind: 'txt' | 'kw' | 'str'; txt: string }> = [];
  let last = 0;
  for (const ma of matches) {
    if (ma.i > last) parts.push({ kind: 'txt', txt: line.slice(last, ma.i) });
    parts.push(ma);
    last = ma.i + ma.len;
  }
  if (last < line.length) parts.push({ kind: 'txt', txt: line.slice(last) });

  return (
    <span key={lineKey} className="block">
      {parts.map((p, idx) => {
        if (p.kind === 'kw') {
          return (
            <span key={idx} style={{ color: 'var(--accent-brand)' }}>
              {p.txt}
            </span>
          );
        }
        if (p.kind === 'str') {
          return (
            <span key={idx} style={{ color: 'var(--m-light)' }}>
              {p.txt}
            </span>
          );
        }
        return <span key={idx}>{p.txt}</span>;
      })}
    </span>
  );
}

function CodeBlock({ lang }: { lang: SampleLang }) {
  const text = SAMPLES[lang];
  const lines = text.split('\n');
  return (
    <pre className="m-0 px-4 py-3.5 font-mono text-[12px] leading-[1.65] text-fg whitespace-pre overflow-auto flex-1 min-h-0 no-scroll">
      {lines.map((line, idx) => highlightLine(line, lang, idx))}
    </pre>
  );
}

function JsonViewer() {
  const Str = ({ children }: { children: ReactNode }) => (
    <span style={{ color: 'var(--m-light)' }}>{`"${children}"`}</span>
  );
  const Num = ({ children }: { children: ReactNode }) => (
    <span style={{ color: 'var(--accent-brand)' }}>{children}</span>
  );
  const Null = () => <span style={{ color: 'var(--fg-subtle)' }}>null</span>;
  const Key = ({ children }: { children: ReactNode }) => (
    <span style={{ color: 'var(--fg-muted)' }}>{`"${children}"`}</span>
  );
  const P = ({ children }: { children: ReactNode }) => (
    <span style={{ color: 'var(--fg-subtle)' }}>{children}</span>
  );

  return (
    <pre className="m-0 px-4 py-3.5 font-mono text-[12px] leading-[1.65] text-fg whitespace-pre overflow-auto flex-1 min-h-0 no-scroll">
      <P>{'{'}</P>
      {'\n'}
      {'  '}<Key>data</Key><P>: [</P>{'\n'}
      {'    '}<P>{'{'}</P>{'\n'}
      {'      '}<Key>id</Key><P>: </P><Str>r-1f4e29c8a7</Str><P>,</P>{'\n'}
      {'      '}<Key>station_id</Key><P>: </P><Str>tunis-campus</Str><P>,</P>{'\n'}
      {'      '}<Key>sensor_id</Key><P>: </P><Str>rooftop-a</Str><P>,</P>{'\n'}
      {'      '}<Key>metric</Key><P>: </P><Str>temperature</Str><P>,</P>{'\n'}
      {'      '}<Key>value</Key><P>: </P><Num>23.41</Num><P>,</P>{'\n'}
      {'      '}<Key>unit</Key><P>: </P><Str>celsius</Str><P>,</P>{'\n'}
      {'      '}<Key>recorded_at</Key><P>: </P><Str>2026-05-20T13:14:32.221Z</Str><P>,</P>{'\n'}
      {'      '}<Key>merkle_anchor</Key><P>: </P><Str>b-4a2f</Str>{'\n'}
      {'    '}<P>{'}'}</P><P>,</P>{'\n'}
      {'    '}<P>{'{'}</P>{'\n'}
      {'      '}<Key>id</Key><P>: </P><Str>r-1f4e29ca12</Str><P>,</P>{'\n'}
      {'      '}<Key>station_id</Key><P>: </P><Str>tunis-campus</Str><P>,</P>{'\n'}
      {'      '}<Key>sensor_id</Key><P>: </P><Str>rooftop-a</Str><P>,</P>{'\n'}
      {'      '}<Key>metric</Key><P>: </P><Str>temperature</Str><P>,</P>{'\n'}
      {'      '}<Key>value</Key><P>: </P><Num>23.46</Num><P>,</P>{'\n'}
      {'      '}<Key>unit</Key><P>: </P><Str>celsius</Str><P>,</P>{'\n'}
      {'      '}<Key>recorded_at</Key><P>: </P><Str>2026-05-20T13:19:32.221Z</Str><P>,</P>{'\n'}
      {'      '}<Key>merkle_anchor</Key><P>: </P><Null />{'\n'}
      {'    '}<P>{'}'}</P>{'\n'}
      {'  '}<P>],</P>{'\n'}
      {'  '}<Key>next_cursor</Key><P>: </P><Str>eyJpZCI6InItMWY0…</Str>{'\n'}
      <P>{'}'}</P>
    </pre>
  );
}

export function CodePanel() {
  const [lang, setLang] = useState<SampleLang>('curl');

  const copySample = () => {
    void navigator.clipboard?.writeText(SAMPLES[lang]);
  };

  return (
    <aside
      className="hidden xl:flex w-[400px] h-full flex-col gap-3 px-4 py-5 bg-bg border-l border-border-subtle shrink-0 overflow-hidden"
      aria-label="Code samples"
    >
      {/* Request */}
      <HairlineCard className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center pl-2.5 pr-2 pt-1 border-b border-border-subtle">
          <div className="flex flex-1 items-stretch">
            {LANGS.map((l) => {
              const active = l.key === lang;
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLang(l.key)}
                  aria-pressed={active}
                  className={[
                    'relative px-2.5 pb-2 pt-1.5 text-xs transition-colors duration-150',
                    active ? 'text-fg font-semibold' : 'text-fg-muted font-medium hover:text-fg',
                  ].join(' ')}
                >
                  {l.label}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-2 right-2 -bottom-px h-0.5"
                      style={{ background: 'var(--accent-brand)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={copySample}
            aria-label="Copy code sample"
            className="w-6 h-6 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg transition-colors"
          >
            <Copy size={12} strokeWidth={1.5} />
          </button>
        </div>
        <CodeBlock lang={lang} />
      </HairlineCard>

      {/* Response */}
      <HairlineCard className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle">
          <span className="text-[11px] font-medium text-fg-muted">Response</span>
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm"
            style={{
              color: 'var(--sev-success)',
              border: '1px solid color-mix(in oklch, var(--sev-success) 50%, transparent)',
            }}
          >
            200 OK
          </span>
          <span className="font-mono text-[10px] text-fg-subtle">application/json</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-[10px] text-fg-subtle">86 ms</span>
            <button
              type="button"
              aria-label="Copy response"
              className="w-5.5 h-5.5 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg transition-colors"
            >
              <Copy size={11} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        <JsonViewer />
      </HairlineCard>

      <Button variant="outline" size="default" className="justify-between">
        <span className="inline-flex items-center gap-1.5">
          <Terminal size={12} strokeWidth={1.5} />
          <span className="text-xs">Try this in the Playground</span>
        </span>
        <ArrowRight size={12} strokeWidth={1.5} />
      </Button>
    </aside>
  );
}
