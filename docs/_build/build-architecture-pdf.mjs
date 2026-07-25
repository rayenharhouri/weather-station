#!/usr/bin/env node
/**
 * Build the architecture-diagrams PDF.
 *
 * Pipeline:
 *   1. Read docs/backend-architecture-diagrams.md.
 *   2. For each fenced ```mermaid block, POST the source to
 *      https://kroki.io/mermaid/svg and capture the rendered SVG.
 *   3. Build an HTML document with the SVGs inlined + WeasyPrint print CSS.
 *   4. Hand off to WeasyPrint to produce the PDF.
 *
 * Why kroki.io: Chromium's runtime deps (libnspr4 / libnss3 / ...) aren't
 * installed system-wide, and `sudo apt-get install` needs an interactive
 * password we don't have. kroki.io's public renderer side-steps the local
 * browser entirely. Trade-off: each build round-trips diagrams to a public
 * service, so don't run this on confidential source.
 *
 * Outputs:
 *   docs/_build/architecture-diagrams.html
 *   docs/_build/mermaid-svgs/diagram-NN.svg
 *   docs/backend-architecture-diagrams.pdf
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);

const here = dirname(fileURLToPath(import.meta.url));
const docsDir = resolve(here, '..');
const buildDir = here;

/**
 * Pick which doc to render. Defaults to the architecture diagrams; pass
 * `--input=<file.md>` (relative to docs/ or absolute) to render a different
 * one. The output PDF lands next to the input with a `.pdf` extension; the
 * intermediate HTML + diagram images go to `docs/_build/<slug>/`.
 */
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((arg) => {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    return m ? [[m[1], m[2]]] : [];
  }),
);
const inputArg = args.input ?? 'backend-architecture-diagrams.md';
const mdPath = inputArg.startsWith('/') ? inputArg : join(docsDir, inputArg);
const slug = inputArg.replace(/\.md$/, '').replace(/^.*\//, '');
const svgDir = join(buildDir, `${slug}-svgs`);
const htmlPath = join(buildDir, `${slug}.html`);
const pdfPath = args.output
  ? (args.output.startsWith('/') ? args.output : join(docsDir, args.output))
  : join(docsDir, `${slug}.pdf`);

const KROKI_URL = process.env.KROKI_URL ?? 'https://kroki.io';

async function main() {
  await mkdir(svgDir, { recursive: true });
  const md = await readFile(mdPath, 'utf8');

  // Split the markdown by mermaid fences. Even indices are markdown, odd are
  // diagram bodies.
  const segments = md.split(/```mermaid\n([\s\S]*?)```/);
  const renderedSegments = [];
  let diagramIdx = 0;

  for (let i = 0; i < segments.length; i++) {
    if (i % 2 === 0) {
      renderedSegments.push({ kind: 'md', body: segments[i] });
      continue;
    }
    diagramIdx += 1;
    const num = String(diagramIdx).padStart(2, '0');
    process.stdout.write(`▸ rendering diagram ${num}… `);
    const png = await renderViaKroki(segments[i]);
    const pngFile = join(svgDir, `diagram-${num}.png`);
    await writeFile(pngFile, png);
    renderedSegments.push({ kind: 'img', file: pngFile, num });
    process.stdout.write(`ok (${Math.round(png.length / 1024)} KB)\n`);
  }

  const bodyHtml = renderedSegments
    .map((seg) =>
      seg.kind === 'md'
        ? mdToHtml(seg.body)
        : `<figure class="diagram"><img src="file://${seg.file}" alt="Diagram ${seg.num}" /></figure>`,
    )
    .join('\n');

  await writeFile(htmlPath, html(bodyHtml), 'utf8');
  process.stdout.write(`▸ HTML written to ${htmlPath}\n`);

  process.stdout.write(`▸ rendering PDF via WeasyPrint…\n`);
  await execFileP('weasyprint', [htmlPath, pdfPath], { timeout: 60_000 });
  process.stdout.write(`\n✓ PDF: ${pdfPath}\n`);
}

/**
 * Prepend an init directive that turns OFF `foreignObject`-based HTML labels
 * for every diagram type. Mermaid's default is to emit `<foreignObject>` for
 * node + edge labels, which renders fine in browsers but blank in WeasyPrint
 * (it doesn't paint SVG foreign content). Setting `htmlLabels: false` /
 * `useHtmlLabels: false` forces native `<text>` elements which WeasyPrint
 * handles correctly.
 */
const MERMAID_INIT = `%%{init: {"theme":"default","flowchart":{"htmlLabels":false,"useMaxWidth":true,"curve":"basis"},"sequence":{"useMaxWidth":true,"actorFontFamily":"Helvetica","noteFontFamily":"Helvetica","messageFontFamily":"Helvetica"},"er":{"useMaxWidth":true},"gantt":{"useMaxWidth":true},"journey":{"useMaxWidth":true},"state":{"useMaxWidth":true},"themeVariables":{"fontFamily":"Helvetica, Arial, sans-serif"}} }%%\n`;

async function renderViaKroki(source) {
  const withInit = MERMAID_INIT + source;
  const res = await fetch(`${KROKI_URL}/mermaid/png`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: withInit,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`kroki ${res.status}: ${detail.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Minimal markdown → HTML for the bits between mermaid fences. The doc
 * only uses h1/h2/h3 + hr + paragraphs + tables, so we don't pull in a
 * full markdown library.
 */
function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (!inTable) return;
    out.push('<table class="md-table">');
    for (let r = 0; r < tableRows.length; r++) {
      const cells = tableRows[r].slice(1, -1).split('|').map((c) => c.trim());
      if (r === 1 && cells.every((c) => /^:?-+:?$/.test(c))) continue; // sep
      const tag = r === 0 ? 'th' : 'td';
      out.push('<tr>' + cells.map((c) => `<${tag}>${escape(c)}</${tag}>`).join('') + '</tr>');
    }
    out.push('</table>');
    inTable = false;
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\|.*\|$/.test(line.trim())) {
      inTable = true;
      tableRows.push(line.trim());
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line.startsWith('# ')) out.push(`<h1>${escape(line.slice(2))}</h1>`);
    else if (line.startsWith('## ')) out.push(`<h2>${escape(line.slice(3))}</h2>`);
    else if (line.startsWith('### ')) out.push(`<h3>${escape(line.slice(4))}</h3>`);
    else if (line.trim() === '---') out.push('<hr/>');
    else if (line.trim() === '') out.push('');
    else out.push(`<p>${escape(line)}</p>`);
  }
  flushTable();
  return out.join('\n');
}

function escape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stripSvgXmlDecl(svg) {
  return svg.replace(/^<\?xml[^>]*\?>\s*/, '');
}

function html(body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>WeatherHub Backend · Architecture Diagrams</title>
<style>
  @page {
    size: A4;
    margin: 16mm 14mm 18mm 14mm;
    @bottom-center {
      content: "WeatherHub Backend · Architecture · " counter(page) " / " counter(pages);
      font-family: "Inter", "Helvetica", sans-serif;
      font-size: 8pt;
      color: #6b7280;
    }
  }
  @page :first { @bottom-center { content: none; } }

  :root {
    --ink: #0f172a;
    --muted: #475569;
    --line: #e2e8f0;
    --accent: #0ea5e9;
  }

  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: var(--ink);
    font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
  }

  h1 {
    font-size: 22pt;
    margin: 0 0 4mm 0;
    letter-spacing: -0.015em;
    border-bottom: 1px solid var(--line);
    padding-bottom: 3mm;
  }
  h2 {
    font-size: 13pt;
    margin: 8mm 0 3mm 0;
    color: var(--ink);
    letter-spacing: -0.01em;
    page-break-after: avoid;
  }
  h3 {
    font-size: 11pt;
    color: var(--muted);
    margin: 5mm 0 2mm 0;
    page-break-after: avoid;
  }
  hr {
    border: 0;
    border-top: 1px solid var(--line);
    margin: 6mm 0;
  }
  p {
    margin: 1mm 0;
    color: var(--muted);
  }
  figure.diagram {
    page-break-inside: avoid;
    margin: 3mm 0 8mm 0;
    text-align: center;
  }
  figure.diagram img {
    max-width: 100%;
    max-height: 245mm;
    height: auto;
  }
  table.md-table {
    width: 100%;
    border-collapse: collapse;
    margin: 3mm 0;
    font-size: 9.5pt;
  }
  table.md-table th, table.md-table td {
    border: 1px solid var(--line);
    padding: 1.5mm 2mm;
    text-align: left;
    vertical-align: top;
  }
  table.md-table th {
    background: #f8fafc;
    font-weight: 600;
  }
  /* Tight money cells on the right edge of BOM tables. */
  table.md-table td:last-child,
  table.md-table th:last-child {
    white-space: nowrap;
  }
  p {
    overflow-wrap: anywhere;
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

main().catch((err) => {
  console.error('\n✗ build failed:', err.stderr ?? err.message ?? err);
  process.exit(1);
});
