/**
 * pilot.js — run the decoder against real ground-truth serials and score it.
 * Usage: node decoder/pilot.js
 */
const { decode } = require('./serialDecoder');
const truth = require('./groundTruth');

const pad = (s, n) => String(s == null ? '' : s).padEnd(n).slice(0, n);
const rows = [];
let confident = 0, confidentCorrect = 0, confidentWrong = 0, abstained = 0, unreadable = 0;

for (const t of truth) {
  const r = decode(t.brand, t.serial, t.model);
  const decoded = r.year;
  const isConfident = r.confidence === 'high' || r.confidence === 'medium';
  const isAbstain = r.method === 'lookup' || r.method === 'unsupported';
  const isUnreadable = r.confidence === 'none' && !isAbstain;

  let verdict;
  if (isConfident && decoded === t.recordedYear) { verdict = 'MATCH'; confident++; confidentCorrect++; }
  else if (isConfident && decoded !== t.recordedYear) { verdict = 'WRONG'; confident++; confidentWrong++; }
  else if (isAbstain) { verdict = 'lookup'; abstained++; }
  else { verdict = 'unreadable'; unreadable++; }

  rows.push({
    brand: t.canonical || t.brand, equip: t.equip, serial: t.serial,
    recorded: t.recordedYear, decoded: decoded ?? '—', conf: r.confidence,
    verdict, note: r.note,
  });
}

// ── table ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(120));
console.log('  PILOT: serial-number decoder vs. hand-recorded manufacture dates (Nashville HWS)');
console.log('='.repeat(120));
console.log('  ' + pad('BRAND', 16) + pad('EQUIP', 22) + pad('SERIAL', 16) +
            pad('REC', 6) + pad('DECODED', 9) + pad('CONF', 8) + 'VERDICT');
console.log('  ' + '-'.repeat(116));
for (const r of rows) {
  console.log('  ' + pad(r.brand, 16) + pad(r.equip, 22) + pad(r.serial, 16) +
              pad(r.recorded, 6) + pad(r.decoded, 9) + pad(r.conf, 8) + r.verdict);
}

// ── summary ─────────────────────────────────────────────────────────────
const total = truth.length;
const precision = confident ? Math.round((confidentCorrect / confident) * 100) : 0;
const coverage = Math.round((confident / total) * 100);

console.log('\n  ' + '-'.repeat(116));
console.log('  RESULTS');
console.log(`    Total ground-truth rows tested ........ ${total}`);
console.log(`    Confident decodes (high/medium) ....... ${confident}`);
console.log(`       ├─ matched recorded year .......... ${confidentCorrect}`);
console.log(`       └─ wrong ........................... ${confidentWrong}`);
console.log(`    Correctly abstained (lookup required) . ${abstained}`);
console.log(`    Flagged unreadable (bad serial data) .. ${unreadable}`);
console.log('  ' + '-'.repeat(116));
console.log(`    PRECISION on confident decodes ........ ${precision}%  (${confidentCorrect}/${confident})`);
console.log(`    COVERAGE (confident / all rows) ....... ${coverage}%  (${confident}/${total})`);
console.log('  ' + '='.repeat(116) + '\n');

// ── things that need a human eyeball ────────────────────────────────────
const flags = rows.filter((r) => r.verdict === 'WRONG' || r.verdict === 'unreadable');
if (flags.length) {
  console.log('  NEEDS ATTENTION:');
  for (const r of flags) console.log(`    • ${r.brand} ${r.serial} → ${r.note}`);
  console.log('');
}
