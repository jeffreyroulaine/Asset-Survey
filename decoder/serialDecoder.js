/**
 * serialDecoder.js — deterministic manufacture-date decoding from equipment serial numbers.
 *
 * PILOT SCOPE: ~10 highest-volume brands seen across the property surveys.
 *
 * Design principles (this is the whole point of the project):
 *   1. When a published, verifiable rule exists, CALCULATE the date and mark confidence.
 *   2. When no public algorithm exists, return method:'lookup' — DO NOT GUESS.
 *   3. When the serial is unreadable (e.g. Excel mangled it into scientific notation),
 *      say so and ask for a re-read — DO NOT GUESS.
 *
 * Each decoder returns:
 *   { year, month|null, week|null, confidence: 'high'|'medium'|'low'|'none',
 *     method: string, note: string }
 */

// ── helpers ──────────────────────────────────────────────────────────────
function currentYear() {
  return new Date().getFullYear();
}

// Resolve a 2-digit year to a full year, preferring the most recent plausible one.
function resolve2DigitYear(yy, maxYear = currentYear() + 1) {
  const n = parseInt(yy, 10);
  if (isNaN(n)) return null;
  let y = 2000 + n;
  if (y > maxYear) y = 1900 + n;
  return y;
}

// Detect a serial that a spreadsheet destroyed by coercing it to a number.
function isMangled(serial) {
  return /[eE]\+?\d/.test(String(serial)) || /^\d+\.\d+E/i.test(String(serial));
}

function digitsOnly(s) {
  return String(s || '').replace(/[^0-9]/g, '');
}

// ── Alliance Laundry Systems (Unimac, Speed Queen, Huebsch, IPSO) ─────────
// Format: YYWWxxxxxx — first 2 digits = year, next 2 = week of manufacture.
function decodeAlliance(serial) {
  const d = digitsOnly(serial);
  if (d.length < 6) {
    return { year: null, confidence: 'none', method: 'alliance-YYWW',
             note: 'serial too short to contain a YYWW date prefix' };
  }
  const year = resolve2DigitYear(d.slice(0, 2));
  const week = parseInt(d.slice(2, 4), 10);
  const weekOk = week >= 1 && week <= 53;
  const yearOk = year >= 1985 && year <= currentYear() + 1;
  return {
    year, week: weekOk ? week : null, month: null,
    confidence: yearOk && weekOk ? 'high' : yearOk ? 'medium' : 'low',
    method: 'alliance-YYWW',
    note: 'Alliance (Unimac/Speed Queen/Huebsch): YYWW prefix — yr' +
          (weekOk ? `, wk ${week}` : ''),
  };
}

// ── Bradford White (water heaters / storage tanks) ────────────────────────
// 2-letter prefix: 1st = year (20-yr repeating cycle from 1984), 2nd = month.
const BW_YEAR_LETTERS = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','S','T','W','X','Y','Z'];
const BW_MONTH_LETTERS = ['A','B','C','D','E','F','G','H','J','K','L','M']; // Jan..Dec (skips I)
function decodeBradfordWhite(serial) {
  const s = String(serial || '').trim().toUpperCase();
  const yLetter = s[0];
  const mLetter = s[1];
  const idx = BW_YEAR_LETTERS.indexOf(yLetter);
  if (idx === -1) {
    return { year: null, confidence: 'none', method: 'bradfordwhite-letter',
             note: `first char '${s[0] || ''}' is not a Bradford White year letter — ` +
                   're-read serial from nameplate (likely OCR/transcription error)' };
  }
  // Candidate years: 1984+idx, +20, +40 ... pick most recent that is not in the future.
  const max = currentYear();
  let year = null;
  for (let k = 0; ; k++) {
    const cand = 1984 + idx + 20 * k;
    if (cand > max) break;
    year = cand;
  }
  const mIdx = BW_MONTH_LETTERS.indexOf(mLetter);
  const month = mIdx === -1 ? null : mIdx + 1;
  return {
    year, month, week: null,
    confidence: 'high',
    method: 'bradfordwhite-letter',
    note: `Bradford White 20-yr letter code: ${yLetter}=${year}` +
          (month ? `, ${mLetter}=month ${month}` : ''),
  };
}

// ── AAON (rooftop / DOAS units) ───────────────────────────────────────────
// Serial begins with 2-digit year + 2-digit week.
function decodeAAON(serial) {
  const d = digitsOnly(serial);
  if (d.length < 4) {
    return { year: null, confidence: 'none', method: 'aaon-YYWW',
             note: 'serial too short for YYWW prefix' };
  }
  const year = resolve2DigitYear(d.slice(0, 2));
  const week = parseInt(d.slice(2, 4), 10);
  const weekOk = week >= 1 && week <= 53;
  const yearOk = year >= 1990 && year <= currentYear() + 1;
  return {
    year, week: weekOk ? week : null, month: null,
    confidence: yearOk && weekOk ? 'high' : yearOk ? 'medium' : 'low',
    method: 'aaon-YYWW',
    note: 'AAON: YYWW prefix' + (weekOk ? ` — yr, wk ${week}` : ''),
  };
}

// ── Lochinvar (boilers / water heaters / storage tanks) ───────────────────
// Newer Lochinvar serials lead with a 2-digit year; format is not fully public.
function decodeLochinvar(serial) {
  if (isMangled(serial)) {
    return { year: null, confidence: 'none', method: 'lochinvar',
             note: 'serial corrupted by spreadsheet (scientific notation) — re-capture ' +
                   'the full serial from the nameplate photo before decoding' };
  }
  const d = digitsOnly(serial);
  if (d.length < 4) {
    return { year: null, confidence: 'low', method: 'lochinvar',
             note: 'insufficient digits; Lochinvar format varies — verify via lookup' };
  }
  const year = resolve2DigitYear(d.slice(0, 2));
  const yearOk = year >= 1995 && year <= currentYear() + 1;
  return {
    year: yearOk ? year : null,
    month: null, week: null,
    confidence: 'medium',
    method: 'lochinvar-leading-year',
    note: 'Lochinvar leading-2-digit-year (medium confidence; format varies by product line)',
  };
}

// ── Manitowoc (ice machines) ──────────────────────────────────────────────
// Serial begins with 2-digit year + 2-digit month/week on modern units.
function decodeManitowoc(serial) {
  const d = digitsOnly(serial);
  if (d.length < 4) {
    return { year: null, confidence: 'low', method: 'manitowoc',
             note: 'Manitowoc format varies by era — verify' };
  }
  const year = resolve2DigitYear(d.slice(0, 2));
  const yearOk = year >= 1995 && year <= currentYear() + 1;
  return {
    year: yearOk ? year : null, month: null, week: null,
    confidence: yearOk ? 'medium' : 'low',
    method: 'manitowoc-leading-year',
    note: 'Manitowoc leading-2-digit-year (medium confidence)',
  };
}

// ── Carrier (HVAC) ────────────────────────────────────────────────────────
// Classic Carrier: first 4 digits = WWYY (week+year) or YYWW depending on era.
function decodeCarrier(serial) {
  const d = digitsOnly(serial);
  if (d.length < 4) {
    return { year: null, confidence: 'low', method: 'carrier',
             note: 'Carrier serial needs 4 leading digits (WWYY/YYWW) — verify' };
  }
  const a = parseInt(d.slice(0, 2), 10);
  const b = parseInt(d.slice(2, 4), 10);
  // WWYY if first pair looks like a week (1..53) and second like a year.
  let year, week;
  if (a >= 1 && a <= 53) { week = a; year = resolve2DigitYear(d.slice(2, 4)); }
  else { year = resolve2DigitYear(d.slice(0, 2)); week = b; }
  const yearOk = year >= 1985 && year <= currentYear() + 1;
  return {
    year: yearOk ? year : null, week: week >= 1 && week <= 53 ? week : null, month: null,
    confidence: yearOk ? 'medium' : 'low',
    method: 'carrier-week-year',
    note: 'Carrier WWYY/YYWW (medium — Carrier has multiple serial eras; verify)',
  };
}

// ── Brands with NO public serial algorithm → lookup, never guess ──────────
function lookupOnly(brandLabel, extra = '') {
  return (serial) => ({
    year: null, month: null, week: null,
    confidence: 'none',
    method: 'lookup',
    note: `${brandLabel}: no public serial-to-date algorithm — use the nameplate's ` +
          `printed manufacture date, or a factory/registration lookup. ${extra}`.trim(),
  });
}

// ── registry: brand aliases → decoder + metadata ─────────────────────────
const REGISTRY = [
  { match: /unimac|alliance|speed\s*queen|huebsch|ipso/i, decode: decodeAlliance,
    canonical: 'Alliance/Unimac', category: 'Laundry', methodClass: 'Leading YY(WW)' },
  { match: /bradford\s*white/i, decode: decodeBradfordWhite,
    canonical: 'Bradford White', category: 'Water heating', methodClass: 'Letter date code' },
  { match: /aaon/i, decode: decodeAAON,
    canonical: 'AAON', category: 'HVAC', methodClass: 'Leading YYWW' },
  { match: /lochinvar/i, decode: decodeLochinvar,
    canonical: 'Lochinvar', category: 'Boilers/Water heating', methodClass: 'Leading YY (varies)' },
  { match: /manitowoc/i, decode: decodeManitowoc,
    canonical: 'Manitowoc', category: 'Ice machines', methodClass: 'Leading YY (varies)' },
  { match: /carrier/i, decode: decodeCarrier,
    canonical: 'Carrier', category: 'HVAC', methodClass: 'Week/Year embedded' },
  { match: /trane/i, decode: lookupOnly('Trane', 'Trane has used many serial formats; some encode year in char positions that require the era-specific key.'),
    canonical: 'Trane', category: 'HVAC', methodClass: 'Lookup / era-specific' },
  { match: /\bbac\b|baltimore\s*air/i, decode: lookupOnly('BAC (Baltimore Aircoil)', 'Older cooling-tower serials are not publicly decodable.'),
    canonical: 'BAC', category: 'Cooling towers', methodClass: 'Lookup' },
  { match: /bryan/i, decode: lookupOnly('Bryan Boilers', 'Sequential serial — date is in factory records only.'),
    canonical: 'Bryan', category: 'Boilers', methodClass: 'Sequential / lookup' },
  { match: /canariis/i, decode: lookupOnly('Canariis', 'Pump serial not publicly decodable.'),
    canonical: 'Canariis', category: 'Pumps', methodClass: 'Lookup' },
];

function decode(brand, serial /*, model */) {
  const entry = REGISTRY.find((e) => e.match.test(String(brand || '')));
  if (!entry) {
    return {
      brand, canonical: null, year: null, confidence: 'none', method: 'unsupported',
      note: `no decoder registered for brand "${brand}" (pilot covers ${REGISTRY.length} brands)`,
    };
  }
  const result = entry.decode(serial);
  return { brand, canonical: entry.canonical, category: entry.category,
           methodClass: entry.methodClass, ...result };
}

module.exports = { decode, REGISTRY };
