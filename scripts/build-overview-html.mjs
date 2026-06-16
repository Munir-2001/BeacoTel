/**
 * Renders a Markdown doc into a polished, self-contained HTML file (no deps,
 * works offline, prints to a clean PDF). Handles the subset of Markdown used
 * by our overview: headings, bold/italic, inline code, fenced code, tables,
 * blockquotes, nested lists, horizontal rules, links.
 *
 * Run from Beacotel/:
 *   node scripts/build-overview-html.mjs [input.md] [output.html]
 *   (defaults: SOFTWARE_OVERVIEW.md → SOFTWARE_OVERVIEW.html)
 */

import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2] ?? "SOFTWARE_OVERVIEW.md";
const output = process.argv[3] ?? input.replace(/\.md$/, "") + ".html";

const md = readFileSync(input, "utf8");

const esc = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Inline formatting — input is raw (un-escaped) text; we escape then style.
function inline(text) {
  let t = esc(text);
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return t;
}

const lines = md.split("\n");
const out = [];
let i = 0;

const isTableSep = (s) => /^\s*\|?[\s:|-]+\|?\s*$/.test(s) && s.includes("-");
const splitRow = (s) =>
  s
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

while (i < lines.length) {
  let line = lines[i];

  // Blank line
  if (/^\s*$/.test(line)) {
    i++;
    continue;
  }

  // Fenced code block
  if (/^\s*```/.test(line)) {
    const buf = [];
    i++;
    while (i < lines.length && !/^\s*```/.test(lines[i])) {
      buf.push(esc(lines[i]));
      i++;
    }
    i++; // closing fence
    out.push(`<pre><code>${buf.join("\n")}</code></pre>`);
    continue;
  }

  // Horizontal rule
  if (/^\s*---\s*$/.test(line)) {
    out.push("<hr>");
    i++;
    continue;
  }

  // Heading
  const h = line.match(/^(#{1,6})\s+(.*)$/);
  if (h) {
    const level = h[1].length;
    out.push(`<h${level}>${inline(h[2])}</h${level}>`);
    i++;
    continue;
  }

  // Table
  if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
    const header = splitRow(line);
    i += 2; // skip header + separator
    const rows = [];
    while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
      rows.push(splitRow(lines[i]));
      i++;
    }
    const thead =
      "<thead><tr>" +
      header.map((c) => `<th>${inline(c)}</th>`).join("") +
      "</tr></thead>";
    const tbody =
      "<tbody>" +
      rows
        .map(
          (r) =>
            "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>",
        )
        .join("") +
      "</tbody>";
    out.push(`<table>${thead}${tbody}</table>`);
    continue;
  }

  // Blockquote
  if (/^\s*>\s?/.test(line)) {
    const buf = [];
    while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
      buf.push(lines[i].replace(/^\s*>\s?/, ""));
      i++;
    }
    out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
    continue;
  }

  // Lists (supports one level of nesting via 2-space indent)
  if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
    out.push(renderList());
    continue;
  }

  // Paragraph (gather consecutive plain lines)
  const buf = [line];
  i++;
  while (
    i < lines.length &&
    !/^\s*$/.test(lines[i]) &&
    !/^\s*(#{1,6}\s|```|---\s*$|>|\||[-*]\s|\d+\.\s)/.test(lines[i])
  ) {
    buf.push(lines[i]);
    i++;
  }
  out.push(`<p>${inline(buf.join(" "))}</p>`);
}

function renderList() {
  // Render a contiguous list block, honoring indentation for nesting.
  const indentOf = (s) => (s.match(/^(\s*)/)[1] || "").length;
  const baseIndent = indentOf(lines[i]);
  const ordered = /^\s*\d+\.\s/.test(lines[i]);
  let html = ordered ? "<ol>" : "<ul>";

  while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
    const ind = indentOf(lines[i]);
    if (ind < baseIndent) break;
    if (ind > baseIndent) {
      // nested list — attach to the previous <li>
      const nested = renderList();
      html = html.replace(/<\/li>$/, nested + "</li>");
      continue;
    }
    const text = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
    html += `<li>${inline(text)}</li>`;
    i++;
  }
  html += ordered ? "</ol>" : "</ul>";
  return html;
}

const title = (md.match(/^#\s+(.*)$/m)?.[1] ?? "Document").replace(/[*`]/g, "");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root {
    --navy: #0F2A47; --teal: #0EA5A4; --indigo: #6366F1;
    --ink: #1f2937; --muted: #64748b; --line: #e5e7eb; --bg: #f8fafc;
    --code-bg: #f1f5f9;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .page {
    max-width: 880px; margin: 32px auto; background: #fff;
    border: 1px solid var(--line); border-radius: 16px;
    box-shadow: 0 10px 40px rgba(15,42,71,.08);
    padding: 56px 64px;
  }
  h1, h2, h3, h4 { color: var(--navy); line-height: 1.25; font-weight: 700; }
  h1 {
    font-size: 30px; margin: 0 0 6px;
    border-bottom: 3px solid var(--teal); padding-bottom: 14px;
  }
  h2 {
    font-size: 22px; margin: 38px 0 12px; padding-bottom: 6px;
    border-bottom: 1px solid var(--line);
  }
  h3 { font-size: 17px; margin: 24px 0 8px; color: var(--indigo); }
  p { margin: 10px 0; }
  a { color: var(--indigo); text-decoration: none; }
  a:hover { text-decoration: underline; }
  code {
    background: var(--code-bg); color: #0f172a;
    padding: 2px 6px; border-radius: 6px;
    font: 13.5px/1.4 "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  }
  pre {
    background: var(--navy); color: #e2e8f0; border-radius: 12px;
    padding: 16px 18px; overflow-x: auto; font-size: 13px;
  }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote {
    margin: 14px 0; padding: 10px 16px; color: var(--navy);
    background: #ecfeff; border-left: 4px solid var(--teal); border-radius: 8px;
  }
  ul, ol { margin: 10px 0; padding-left: 22px; }
  li { margin: 4px 0; }
  li > ul, li > ol { margin: 4px 0; }
  hr { border: none; border-top: 1px solid var(--line); margin: 28px 0; }
  table {
    width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14.5px;
    border: 1px solid var(--line); border-radius: 10px; overflow: hidden;
  }
  thead th {
    background: var(--navy); color: #fff; text-align: left;
    padding: 10px 12px; font-weight: 600;
  }
  tbody td { padding: 10px 12px; border-top: 1px solid var(--line); vertical-align: top; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; border: none; margin: 0; max-width: none; padding: 0 12mm; }
    h2 { break-after: avoid; } tr, blockquote, pre { break-inside: avoid; }
    a { color: var(--ink); }
  }
</style>
</head>
<body>
  <article class="page">
${out.join("\n")}
  </article>
</body>
</html>
`;

writeFileSync(output, html);
console.log(`Wrote ${output} (${(html.length / 1024).toFixed(1)} KB)`);
