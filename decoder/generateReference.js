/**
 * generateReference.js — emit the human-review reference from the knowledge base.
 * Outputs (into docs/):
 *   - serial-decoding-reference.csv   (flat, one row per brand-format)
 *   - serial-decoding-reference.md    (grouped "one section per method")
 *   - Serial-Decoding-Reference.xlsx  (one sheet per method + master list) [if xlsx installed]
 * Usage: node decoder/generateReference.js
 */
const fs = require('fs');
const path = require('path');
const { BRANDS, METHODS } = require('./brands');

const OUT = path.join(__dirname, '..', 'docs');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Flatten: one row per (brand, format).
const rowsByMethod = {};
const flat = [];
for (const b of BRANDS) {
  (b.formats || []).forEach((f, i) => {
    const row = {
      method: b.method, methodLabel: METHODS[b.method], brand: b.brand, category: b.category,
      publicAlgo: b.hasPublicAlgorithm ? 'Yes' : 'No', decadeAmbiguous: b.decadeAmbiguous ? 'Yes' : 'No',
      era: f.era, pattern: f.pattern, rule: f.rule, example: f.example, confidence: f.confidence,
      abstainWhen: i === 0 ? b.abstainWhen : '', sources: i === 0 ? (b.sources || []).join(' | ') : '',
    };
    flat.push(row);
    (rowsByMethod[b.method] ||= []).push(row);
  });
}

// ── CSV ──────────────────────────────────────────────────────────────────
const CSV_COLS = ['method', 'methodLabel', 'brand', 'category', 'publicAlgo', 'decadeAmbiguous',
  'era', 'pattern', 'rule', 'example', 'confidence', 'abstainWhen', 'sources'];
const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = [CSV_COLS.join(',')].concat(flat.map((r) => CSV_COLS.map((c) => csvCell(r[c])).join(','))).join('\n');
fs.writeFileSync(path.join(OUT, 'serial-decoding-reference.csv'), csv);

// ── Markdown (grouped by method) ──────────────────────────────────────────
let md = `# Equipment Serial-Number Decoding Reference\n\n`;
md += `_Generated from \`decoder/brands.js\`. ${BRANDS.length} brands, ${flat.length} documented format rows._\n\n`;
md += `Each manufacturer encodes the build date differently. This reference groups brands by **decoding method** so each method can be reviewed and vetted independently. `;
md += `Confidence: **high** = documented + deterministic; **medium** = documented but varies; **low** = uncertain/heuristic. `;
md += `"Decade-ambiguous" means the serial reveals only part of the year and must be corroborated (ANSI plate date, refrigerant, condition).\n\n`;
md += `## Contents\n` + Object.keys(METHODS).map((m) => `- **Method ${m} — ${METHODS[m]}** (${(rowsByMethod[m] || []).length} rows)`).join('\n') + '\n';
for (const m of Object.keys(METHODS)) {
  const rows = rowsByMethod[m] || [];
  if (!rows.length) continue;
  md += `\n## Method ${m} — ${METHODS[m]}\n\n`;
  md += `| Brand | Category | Era | Pattern | Rule | Example | Conf. | Decade? |\n`;
  md += `|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    const esc = (v) => String(v == null ? '' : v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md += `| ${esc(r.brand)} | ${esc(r.category)} | ${esc(r.era)} | \`${esc(r.pattern)}\` | ${esc(r.rule)} | ${esc(r.example)} | ${esc(r.confidence)} | ${esc(r.decadeAmbiguous)} |\n`;
  }
}
fs.writeFileSync(path.join(OUT, 'serial-decoding-reference.md'), md);

// ── Excel workbook (one sheet per method + master list) ───────────────────
let xlsxOk = false;
try {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();

  // Master list
  const masterHdr = ['Brand', 'Category', 'Method', 'Method (label)', 'Public Algorithm?', 'Decade-Ambiguous?', 'Decoder key', '# Formats'];
  const masterRows = BRANDS.map((b) => [b.brand, b.category, b.method, METHODS[b.method],
    b.hasPublicAlgorithm ? 'Yes' : 'No', b.decadeAmbiguous ? 'Yes' : 'No', b.decoder, (b.formats || []).length]);
  const wsM = XLSX.utils.aoa_to_sheet([masterHdr, ...masterRows]);
  wsM['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 8 }, { wch: 34 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 9 }];
  wsM['!freeze'] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, wsM, 'Master Brand List');

  // One sheet per method
  const hdr = ['Brand', 'Category', 'Era', 'Serial Pattern', 'Decoding Rule', 'Worked Example', 'Confidence', 'Decade?', 'Abstain When', 'Sources'];
  for (const m of Object.keys(METHODS)) {
    const rows = rowsByMethod[m] || [];
    if (!rows.length) continue;
    const aoa = [hdr, ...rows.map((r) => [r.brand, r.category, r.era, r.pattern, r.rule, r.example, r.confidence, r.decadeAmbiguous, r.abstainWhen, r.sources])];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 26 }, { wch: 52 }, { wch: 28 }, { wch: 10 }, { wch: 9 }, { wch: 40 }, { wch: 50 }];
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    const safe = `M${m} ${METHODS[m]}`.replace(/[:\\/?*\[\]]/g, '-').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safe);
  }
  XLSX.writeFile(wb, path.join(OUT, 'Serial-Decoding-Reference.xlsx'));
  xlsxOk = true;
} catch (e) {
  console.log('  (xlsx not available — skipped .xlsx; run `npm install` then re-run for the workbook)');
  console.log('  ' + e.message);
}

console.log(`\nGenerated in docs/:`);
console.log(`  • serial-decoding-reference.csv  (${flat.length} rows)`);
console.log(`  • serial-decoding-reference.md`);
if (xlsxOk) console.log(`  • Serial-Decoding-Reference.xlsx (${Object.keys(METHODS).length} method sheets + master)`);
console.log(`\nBrands: ${BRANDS.length} | Format rows: ${flat.length}`);
for (const m of Object.keys(METHODS)) console.log(`  Method ${m} (${METHODS[m]}): ${(rowsByMethod[m] || []).length}`);
