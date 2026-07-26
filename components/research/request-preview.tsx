'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { HairlineCard } from '@/components/ui/hairline-card';
import type { PlaygroundQuery } from '@/components/research/params-form';

const LANG_TABS = [
  { key: 'curl', label: 'curl' },
  { key: 'python', label: 'Python' },
  { key: 'node', label: 'Node' },
  { key: 'r', label: 'R' },
] as const;
type Lang = (typeof LANG_TABS)[number]['key'];

interface RequestPreviewProps {
  query: PlaygroundQuery;
}

export function RequestPreview({ query }: RequestPreviewProps) {
  const [open, setOpen] = useState(true);
  const [lang, setLang] = useState<Lang>('curl');

  const text = formatRequest(lang, query);

  return (
    <HairlineCard className="flex flex-col overflow-hidden">
      <div className="flex items-center px-3.5 py-2 border-b border-border-subtle gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
          aria-expanded={open}
        >
          {open ? (
            <ChevronDown size={11} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={11} strokeWidth={1.5} />
          )}
          Request preview
        </button>

        {open && (
          <div className="flex">
            {LANG_TABS.map((t) => {
              const isActive = t.key === lang;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setLang(t.key)}
                  aria-pressed={isActive}
                  className={[
                    'relative px-2.5 pb-1.5 pt-1 text-[11.5px] transition-colors',
                    isActive ? 'text-fg font-semibold' : 'text-fg-muted font-medium hover:text-fg',
                  ].join(' ')}
                >
                  {t.label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute left-2.5 right-2.5 -bottom-px h-0.5"
                      style={{ background: 'var(--accent-brand)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <span className="ml-auto flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-fg-subtle hidden md:inline">
            auto-syncs with params →
          </span>
          <button
            type="button"
            aria-label="Copy request"
            onClick={() => navigator.clipboard?.writeText(text)}
            className="w-6 h-6 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg transition-colors"
          >
            <Copy size={11} strokeWidth={1.5} />
          </button>
        </span>
      </div>

      {open && (
        <pre className="m-0 px-3.5 py-2.5 font-mono text-[11.5px] leading-[1.55] text-fg whitespace-pre overflow-auto no-scroll">
          {highlight(text, lang)}
        </pre>
      )}
    </HairlineCard>
  );
}

function formatRequest(lang: Lang, q: PlaygroundQuery): string {
  const base = 'https://research.weatherhub.tn/v1/readings';
  const stations = q.stations.join(',');
  switch (lang) {
    case 'curl':
      return [
        `curl ${base} \\`,
        `  -H "Authorization: Bearer wh_rsa_••••aB7c" \\`,
        `  -G -d "station=${stations}" -d "metric=${q.metric}" \\`,
        `     -d "since=${q.since}" -d "until=${q.until}" \\`,
        `     -d "interval=${q.interval}" -d "limit=${q.limit}"`,
      ].join('\n');
    case 'python':
      return [
        `from weatherhub import Client`,
        ``,
        `wh = Client(token="wh_rsa_••••aB7c")`,
        ``,
        `readings = wh.readings.list(`,
        `    station="${stations}",`,
        `    metric="${q.metric}",`,
        `    since="${q.since}",`,
        `    until="${q.until}",`,
        `    interval="${q.interval}",`,
        `    limit=${q.limit},`,
        `)`,
      ].join('\n');
    case 'node':
      return [
        `import WeatherHub from "@weatherhub/sdk";`,
        ``,
        `const wh = new WeatherHub({ token: "wh_rsa_••••aB7c" });`,
        ``,
        `const readings = await wh.readings.list({`,
        `  station: "${stations}",`,
        `  metric:  "${q.metric}",`,
        `  since:   "${q.since}",`,
        `  until:   "${q.until}",`,
        `  interval: "${q.interval}",`,
        `  limit:   ${q.limit},`,
        `});`,
      ].join('\n');
    case 'r':
      return [
        `library(weatherhub)`,
        ``,
        `wh <- weatherhub_client(token = "wh_rsa_••••aB7c")`,
        ``,
        `readings <- wh_readings_list(`,
        `  wh,`,
        `  station  = "${stations}",`,
        `  metric   = "${q.metric}",`,
        `  since    = "${q.since}",`,
        `  until    = "${q.until}",`,
        `  interval = "${q.interval}",`,
        `  limit    = ${q.limit}`,
        `)`,
      ].join('\n');
  }
}

function highlight(text: string, lang: Lang) {
  return text.split('\n').map((line, lineKey) => {
    if (lang === 'curl') {
      const m = line.match(/^(\s*)(curl|-H|-G|-d)(\s+)(.*)$/);
      if (m) {
        const [, lead, flag, sp, rest] = m;
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

    const kwRe =
      lang === 'python'
        ? /\b(from|import|def|class|return|None|True|False)\b/g
        : lang === 'r'
          ? /\b(library|function|return|TRUE|FALSE|NULL|if|else)\b/g
          : /\b(import|from|const|let|var|await|new|function|return|null|true|false)\b/g;
    const strRe = /"[^"]*"|'[^']*'/g;

    const matches: Array<{ kind: 'kw' | 'str'; i: number; len: number; txt: string }> = [];
    let m: RegExpExecArray | null;
    strRe.lastIndex = 0;
    while ((m = strRe.exec(line))) {
      matches.push({ kind: 'str', i: m.index, len: m[0].length, txt: m[0] });
    }
    kwRe.lastIndex = 0;
    while ((m = kwRe.exec(line))) {
      const inStr = matches.some((x) => m && x.kind === 'str' && m.index >= x.i && m.index < x.i + x.len);
      if (!inStr) matches.push({ kind: 'kw', i: m.index, len: m[0].length, txt: m[0] });
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
        {parts.map((p, j) => {
          if (p.kind === 'kw') {
            return (
              <span key={j} style={{ color: 'var(--accent-brand)' }}>
                {p.txt}
              </span>
            );
          }
          if (p.kind === 'str') {
            return (
              <span key={j} style={{ color: 'var(--m-light)' }}>
                {p.txt}
              </span>
            );
          }
          return <span key={j}>{p.txt}</span>;
        })}
      </span>
    );
  });
}
