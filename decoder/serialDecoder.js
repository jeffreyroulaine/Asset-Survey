/**
 * serialDecoder.js — deterministic manufacture-date decoding from equipment serials.
 *
 * Dispatches on the vetted knowledge base in brands.js. Core principles:
 *   1. Where a published rule exists, CALCULATE the date + confidence.
 *   2. Where the year is decade-ambiguous (single-digit / cycling letter that can't
 *      be pinned), ABSTAIN on the year rather than fake precision.
 *   3. Where the serial is unreadable (spreadsheet mangled it), say so.
 *   4. Where no public algorithm exists, return method:'lookup'.
 *
 * decode(brand, serial) → { brand, canonical, category, method (label),
 *   year, month|null, week|null, confidence, decoderMethod, note }
 */
const { BRANDS, METHODS } = require('./brands');

// ── helpers ───────────────────────────────────────────────────────────────
function currentYear() { return new Date().getFullYear(); }
function digitsOnly(s) { return String(s || '').replace(/[^0-9]/g, ''); }
function isMangled(s) { return /[eE]\+?\d/.test(String(s)) || /^\d+\.\d+/.test(String(s)); }

function resolve2DigitYear(yy, maxYear = currentYear() + 1) {
  const n = parseInt(yy, 10);
  if (isNaN(n)) return null;
  let y = 2000 + n;
  if (y > maxYear) y = 1900 + n;
  return y;
}
// Most-recent plausible year for a repeating letter cycle.
function resolveCycleYear(base, cycleLen, index, maxYear = currentYear()) {
  let year = null;
  for (let k = 0; ; k++) { const c = base + index + cycleLen * k; if (c > maxYear) break; year = c; }
  return year;
}
function res(o) { return { year: null, month: null, week: null, confidence: 'none', ...o }; }
function unreadable(brand) {
  return res({ method: 'unreadable', note: `${brand}: serial appears corrupted (e.g. spreadsheet scientific notation) — re-capture the full serial from the nameplate photo` });
}

// Shared letter tables
const BW_YEAR_LETTERS = ['A','B','C','D','E','F','G','H','J','K','L','M','N','P','S','T','W','X','Y','Z'];
const BW_MONTH_LETTERS = ['A','B','C','D','E','F','G','H','J','K','L','M']; // Jan..Dec (skip I)
const MONTH_AL = ['A','B','C','D','E','F','G','H','I','J','K','L'];          // Jan..Dec (incl. I)
const MITS_MONTH = { X: 10, Y: 11, Z: 12 };

// ── Method 1: year-first numeric ──────────────────────────────────────────
function alliance(serial) {
  const raw = String(serial || '').trim();
  if (/^[A-Za-z]/.test(raw)) return res({ confidence: 'low', method: 'alliance-legacy',
    note: 'legacy letter-prefixed Alliance serial — leading-digit rule does not apply; verify via nameplate/Alliance lookup' });
  const d = digitsOnly(raw);
  if (d.length < 4) return res({ method: 'alliance-YYMM', note: 'serial too short for a YYMM date prefix' });
  const year = resolve2DigitYear(d.slice(0, 2));
  const yearOk = year >= 1990 && year <= currentYear() + 1;
  const mm = parseInt(d.slice(2, 4), 10);
  const month = mm >= 1 && mm <= 12 ? mm : null;
  return res({ year: yearOk ? year : null, month, confidence: yearOk ? 'high' : 'low', method: 'alliance-YYMM',
    note: 'Alliance YYMM: YY=year' + (month ? `, MM=month ${month}` : ' (digits 3-4 not a valid month → month unknown)') });
}
function aaon(serial) {
  const d = digitsOnly(serial);
  if (d.length >= 6) {
    const y4 = parseInt(d.slice(0, 4), 10), mm = parseInt(d.slice(4, 6), 10);
    if (y4 >= 2000 && y4 <= currentYear() + 1 && mm >= 1 && mm <= 12)
      return res({ year: y4, month: mm, confidence: 'high', method: 'aaon-YYYYMM', note: `AAON Style 1 YYYYMM: ${y4}-${String(mm).padStart(2,'0')}` });
  }
  if (d.length >= 2) {
    const year = resolve2DigitYear(d.slice(0, 2));
    if (year >= 1990 && year <= currentYear() + 1)
      return res({ year, confidence: 'medium', method: 'aaon-YY', note: `AAON Style 2: leading 2 digits = year ${year} (decade-ambiguous, verify)` });
  }
  return res({ method: 'aaon', note: 'AAON serial shape unrecognized — verify with AAON' });
}
function aoSmith(serial) {
  const raw = String(serial || '').trim().toUpperCase();
  // legacy letter+YY
  const li = BW_MONTH_LETTERS.indexOf(raw[0]);
  if (li !== -1 && /^\d{2}/.test(raw.slice(1, 3))) {
    const year = resolve2DigitYear(raw.slice(1, 3));
    return res({ year, month: li + 1, confidence: 'medium', method: 'aosmith-letterYY', note: `A.O.Smith/State legacy: ${raw[0]}=month ${li + 1}, year ${year}` });
  }
  const d = digitsOnly(raw);
  if (d.length >= 4) {
    const year = resolve2DigitYear(d.slice(0, 2)), wk = parseInt(d.slice(2, 4), 10);
    if (year >= 1980 && year <= currentYear() + 1 && wk >= 1 && wk <= 53)
      return res({ year, week: wk, confidence: 'high', method: 'aosmith-YYWW', note: `A.O.Smith/State YYWW: year ${year}, week ${wk}` });
  }
  return res({ method: 'aosmith', note: 'A.O.Smith/State serial not in YYWW or letter+YY form — verify on rating plate' });
}
function raypak(serial) {
  const d = digitsOnly(serial);
  if (d.length >= 4) {
    const yy = parseInt(d.slice(0, 2), 10), mm = parseInt(d.slice(2, 4), 10);
    const yyYear = resolve2DigitYear(d.slice(0, 2));
    if (mm >= 1 && mm <= 12 && yyYear >= 1995 && yyYear <= currentYear() + 1)
      return res({ year: yyYear, month: mm, confidence: 'medium', method: 'raypak-YYMM', note: `Raypak YYMM (1995+): year ${yyYear}, month ${mm}` });
  }
  return res({ confidence: 'low', method: 'raypak', note: 'Raypak first-4-digit date code ambiguous (MMYY↔YYMM order changed ~1995) — verify' });
}
const TRANE_YEAR_LETTER = { W:1983,X:1984,Y:1985,Z:1986,B:1987,C:1988,D:1989,E:1990,F:1991,G:1992,H:1993,J:1994,K:1995,L:1996,M:1997,N:1998,P:1999,R:2000,S:2001 };
function trane(serial) {
  const s = String(serial || '').trim().toUpperCase();
  if (/^\d{4}/.test(s)) {
    const yy = parseInt(s.slice(0, 2), 10), wk = parseInt(s.slice(2, 4), 10);
    const yCand = 2000 + yy;
    if (yy >= 10 && yCand <= currentYear() + 1 && wk >= 1 && wk <= 53)
      return res({ year: yCand, week: wk, confidence: 'high', method: 'trane-YYWW-2010+', note: `Trane 2010+ YYWW: year ${yCand}, week ${wk}` });
    const d1 = parseInt(s[0], 10), wk2 = parseInt(s.slice(1, 3), 10);
    if (d1 >= 2 && d1 <= 9 && wk2 >= 1 && wk2 <= 53)
      return res({ year: 2000 + d1, week: wk2, confidence: 'high', method: 'trane-2002-2009', note: `Trane 2002-2009: year ${2000 + d1}, week ${wk2}` });
  }
  if (TRANE_YEAR_LETTER[s[0]] && /^\d{2}/.test(s.slice(1, 3))) {
    const year = TRANE_YEAR_LETTER[s[0]], wk = parseInt(s.slice(1, 3), 10);
    return res({ year, week: wk >= 1 && wk <= 53 ? wk : null, confidence: 'high', method: 'trane-letter-1983-2001', note: `Trane 1983-2001: ${s[0]}=${year}` + (wk >= 1 && wk <= 53 ? `, week ${wk}` : '') });
  }
  return res({ method: 'trane-lookup', note: 'Trane serial matches no residential/light-commercial era template (may be commercial applied or pre-1983) — read the nameplate manufacture date or verify with Trane' });
}
function daikin(serial) {
  const s = String(serial || '').trim().toUpperCase();
  if (s.length >= 8 && /^\d{2}$/.test(s.slice(4, 6)) && /^\d{2}$/.test(s.slice(6, 8))) {
    const year = resolve2DigitYear(s.slice(4, 6)), mm = parseInt(s.slice(6, 8), 10);
    if (year >= 2005 && year <= currentYear() + 1)
      return res({ year, month: mm >= 1 && mm <= 12 ? mm : null, confidence: 'medium', method: 'daikin-5678', note: `Daikin: chars 5-6=year ${year}` + (mm >= 1 && mm <= 12 ? `, chars 7-8=month ${mm}` : '') });
  }
  return res({ confidence: 'low', method: 'daikin-lookup', note: 'Daikin/McQuay serial not in standard position form — McQuay applied lines vary; verify on nameplate' });
}
function lennox(serial) {
  const s = String(serial || '').trim().toUpperCase();
  if (/^\d{4}[A-Z]/.test(s)) {
    const year = resolve2DigitYear(s.slice(2, 4)), mi = BW_MONTH_LETTERS.indexOf(s[4]);
    if (year >= 1974 && year <= currentYear() + 1)
      return res({ year, month: mi >= 0 ? mi + 1 : null, confidence: 'medium', method: 'lennox-classic', note: `Lennox classic: plant ${s.slice(0,2)}, year ${year}` + (mi >= 0 ? `, month ${mi + 1} (${s[4]})` : '') });
  }
  return res({ confidence: 'low', method: 'lennox', note: 'Lennox serial not in classic PPYY[MonthLetter] form — verify on nameplate' });
}
function manitowoc(serial) {
  const d = digitsOnly(serial);
  if (d.length >= 4) {
    const year = resolve2DigitYear(d.slice(0, 2)), mm = parseInt(d.slice(2, 4), 10);
    if (year >= 1990 && year <= currentYear() + 1 && mm >= 1 && mm <= 12)
      return res({ year, month: mm, confidence: 'medium', method: 'manitowoc-YYMM', note: `Manitowoc YYMM (pre-2006 style): ${year}-${String(mm).padStart(2,'0')} — for 2006+ units confirm the "MFG DT" plate stamp` });
  }
  return res({ method: 'manitowoc', note: 'Manitowoc post-2006 units use a sequential serial + separate "MFG DT" YYMM plate stamp — read that field' });
}
function scotsman(serial) {
  const d = digitsOnly(serial), s = String(serial || '').trim().toUpperCase();
  // after May 2004: YYMM front
  if (d.length >= 4) {
    const year = resolve2DigitYear(d.slice(0, 2)), mm = parseInt(d.slice(2, 4), 10);
    if (year >= 2004 && year <= currentYear() + 1 && mm >= 1 && mm <= 12)
      return res({ year, month: mm, confidence: 'high', method: 'scotsman-YYMM', note: `Scotsman (post-May-2004) YYMM: ${year}-${String(mm).padStart(2,'0')}` });
  }
  // pre-2004: trailing offset-month + cycling year letter → month only, abstain on year
  const m = s.match(/(\d{2})([A-Z])$/);
  if (m) {
    const off = parseInt(m[1], 10);
    const month = off >= 7 ? off - 6 : off + 6; // 07=Jan..12=Jun, 01=Jul..06=Dec
    return res({ month: month >= 1 && month <= 12 ? month : null, confidence: 'low', method: 'scotsman-pre2004',
      note: `Scotsman pre-2004: month ${month} (offset code ${m[1]}), year letter "${m[2]}" cycles → decade ambiguous; verify via Scotsman` });
  }
  return res({ method: 'scotsman', note: 'Scotsman serial matches neither pre- nor post-2004 pattern — verify' });
}
function grundfos(serial) {
  const d = digitsOnly(serial);
  if (d.length >= 4) {
    const year = resolve2DigitYear(d.slice(0, 2)), wk = parseInt(d.slice(2, 4), 10);
    if (year >= 1985 && year <= currentYear() + 1 && wk >= 1 && wk <= 53)
      return res({ year, week: wk, confidence: 'high', method: 'grundfos-PC-YYWW', note: `Grundfos PC=YYWW: year ${year}, week ${wk}` });
  }
  return res({ method: 'grundfos', note: 'Grundfos date is the circled "PC" (YYWW) field on the nameplate — capture that' });
}
function armstrong(serial) {
  const d = digitsOnly(serial);
  if (d.length >= 4) {
    const year = resolve2DigitYear(d.slice(0, 2)), mm = parseInt(d.slice(2, 4), 10);
    if (year >= 1985 && year <= currentYear() + 1 && mm >= 1 && mm <= 12)
      return res({ year, month: mm, confidence: 'medium', method: 'armstrong-YYMM', note: `Armstrong circulator YYMM: ${year}-${String(mm).padStart(2,'0')}` });
  }
  return res({ confidence: 'low', method: 'armstrong', note: 'Armstrong: only circulators carry a YYMM code; engineered/special pumps use a plain serial → lookup' });
}
function wilo(serial) {
  const d = digitsOnly(serial);
  if (d.length >= 4) {
    const year = resolve2DigitYear(d.slice(0, 2)), wk = parseInt(d.slice(2, 4), 10);
    if (year >= 1990 && year <= currentYear() + 1 && wk >= 1 && wk <= 53)
      return res({ year, week: wk, confidence: 'medium', method: 'wilo-YYWW', note: `Wilo YYWW: year ${year}, week ${wk}` });
  }
  return res({ method: 'wilo', note: 'Wilo date-of-manufacture (YYWW) field layout varies — verify on rating plate' });
}
function baldor(serial) {
  const s = String(serial || '').trim().toUpperCase();
  const m = s.match(/^[A-Z](\d{2})(\d{2})(\d{2})/);
  if (m) {
    const year = resolve2DigitYear(m[1]), mm = parseInt(m[2], 10), dd = parseInt(m[3], 10);
    if (year >= 1990 && year <= currentYear() + 1 && mm >= 1 && mm <= 12)
      return res({ year, month: mm, confidence: 'medium', method: 'baldor-YYMMDD', note: `Baldor plant+YYMMDD: ${year}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}` });
  }
  return res({ confidence: 'low', method: 'baldor', note: 'Baldor legacy grid date code requires the Baldor-Dodge chart — lookup' });
}

// ── Method 2: week/month-first numeric ────────────────────────────────────
function carrier(serial) {
  const s = String(serial || '').trim().toUpperCase();
  if (/^\d{4}/.test(s)) {
    const wk = parseInt(s.slice(0, 2), 10), year = resolve2DigitYear(s.slice(2, 4));
    if (wk >= 1 && wk <= 53 && year >= 1980 && year <= currentYear() + 1)
      return res({ year, week: wk, confidence: 'high', method: 'carrier-WWYY', note: `Carrier WWYY (week-then-year): week ${wk}, year ${year}` });
  }
  return res({ confidence: 'low', method: 'carrier', note: 'Carrier serial not in modern WWYY form (first 4 digits = week+year) — verify on nameplate' });
}
function rheemHVAC(serial) {
  const s = String(serial || '').trim().toUpperCase();
  const m = s.match(/^[A-Z]{2,4}(\d{2})(\d{2})/) || s.match(/^(\d{2})(\d{2})/);
  if (m) {
    const wk = parseInt(m[1], 10), year = resolve2DigitYear(m[2]);
    if (wk >= 1 && wk <= 53 && year >= 1980 && year <= currentYear() + 1)
      return res({ year, week: wk, confidence: 'high', method: 'rheem-WWYY', note: `Rheem/Ruud HVAC WWYY: week ${wk}, year ${year}` });
  }
  return res({ confidence: 'low', method: 'rheem-hvac', note: 'Rheem/Ruud HVAC serial not a valid WWYY after prefix — verify' });
}
function rheemWH(serial) {
  const s = String(serial || '').trim().toUpperCase();
  const m = s.match(/^[A-Z]{0,4}(\d{2})(\d{2})/);
  if (m) {
    const mm = parseInt(m[1], 10), year = resolve2DigitYear(m[2]);
    if (mm >= 1 && mm <= 12 && year >= 1980 && year <= currentYear() + 1)
      return res({ year, month: mm, confidence: 'high', method: 'rheem-MMYY', note: `Rheem/Ruud water-heater MMYY: month ${mm}, year ${year}` });
  }
  return res({ confidence: 'low', method: 'rheem-wh', note: 'Rheem/Ruud water-heater serial not a valid MMYY — verify' });
}
function marley(serial) {
  const d = digitsOnly(serial);
  if (d.length >= 2) {
    const year = resolve2DigitYear(d.slice(-2));
    if (year >= 1970 && year <= currentYear() + 1)
      return res({ year, confidence: 'medium', method: 'marley-trailingYY', note: `Marley/SPX heuristic: last 2 digits = year ${year} (may reflect RECONSTRUCTION year — verify with SPX)` });
  }
  return res({ confidence: 'low', method: 'marley', note: 'Marley/SPX serial has no clear trailing year — verify with SPX Cooling' });
}

// ── Method 3: alphabetic date code ────────────────────────────────────────
function bradfordWhite(serial) {
  if (isMangled(serial)) return unreadable('Bradford White');
  const s = String(serial || '').trim().toUpperCase();
  const idx = BW_YEAR_LETTERS.indexOf(s[0]);
  if (idx === -1) return res({ method: 'bradfordwhite-letter',
    note: `first char '${s[0] || ''}' is not a Bradford White year letter — re-read serial from nameplate (likely OCR/transcription error)` });
  const year = resolveCycleYear(1984, 20, idx);
  const mi = BW_MONTH_LETTERS.indexOf(s[1]);
  return res({ year, month: mi >= 0 ? mi + 1 : null, confidence: 'high', method: 'bradfordwhite-letter',
    note: `Bradford White 20-yr letter code: ${s[0]}=${year}` + (mi >= 0 ? `, ${s[1]}=month ${mi + 1}` : '') });
}
function lochinvarLetter(serial) {
  if (isMangled(serial)) return unreadable('Lochinvar');
  const s = String(serial || '').trim().toUpperCase();
  const idx = BW_YEAR_LETTERS.indexOf(s[0]);
  if (idx !== -1) {
    const year = resolveCycleYear(1964, 20, idx);
    const mi = BW_MONTH_LETTERS.indexOf(s[1]);
    return res({ year, month: mi >= 0 ? mi + 1 : null, confidence: 'medium', method: 'lochinvar-letter',
      note: `Lochinvar 20-yr letter cycle: ${s[0]}=${year} (most-recent plausible; verify vs plate)` });
  }
  const d = digitsOnly(s);
  if (d.length >= 4) {
    const year = resolve2DigitYear(d.slice(0, 2));
    if (year >= 1995 && year <= currentYear() + 1)
      return res({ year, confidence: 'low', method: 'lochinvar-numeric', note: `Lochinvar numeric (series-dependent): leading YY=year ${year} (low confidence — verify)` });
  }
  return res({ method: 'lochinvar', note: 'Lochinvar format varies by series — verify via Lochinvar technical service' });
}
function hoshizaki(serial) {
  const s = String(serial || '').trim().toUpperCase();
  const last = s[s.length - 1];
  const mi = MONTH_AL.indexOf(last);
  // Month (trailing letter) is reliable; leading year letter is contradictory → abstain on year.
  return res({ month: mi >= 0 ? mi + 1 : null, confidence: 'low', method: 'hoshizaki',
    note: 'Hoshizaki: trailing letter = month' + (mi >= 0 ? ` (${last}=${mi + 1})` : '') + '; leading year-letter mapping is ambiguous across sources → verify year via Hoshizaki warranty lookup' });
}
const YORK_MONTH = ['A','B','C','D','E','F','G','H','J','K','L','M']; // A=Jan..M=Dec (skip I)
function york(serial) {
  const s = String(serial || '').trim().toUpperCase();
  if (s.length >= 4 && /[A-Z]/.test(s[0]) && /\d/.test(s[1]) && /[A-Z]/.test(s[2]) && /\d/.test(s[3])) {
    const year = resolve2DigitYear(s[1] + s[3]), mi = YORK_MONTH.indexOf(s[2]);
    if (year >= 2004 && year <= currentYear() + 1)
      return res({ year, month: mi >= 0 ? mi + 1 : null, confidence: 'medium', method: 'york-2004+',
        note: `York 2004+: year digits (pos 2,4)=${s[1]}${s[3]}=${year}` + (mi >= 0 ? `, ${s[2]}=month ${mi + 1}` : '') });
  }
  return res({ confidence: 'low', method: 'york-pre2004',
    note: 'York pre-2004 letter serial: year letter repeats on a ~21-yr cycle (period-ambiguous) — verify via ANSI plate date / refrigerant' });
}
function bellGossett(serial) {
  const s = String(serial || '').trim().toUpperCase();
  const m = s.match(/^([A-L])(\d)(\d)/);
  if (m) {
    const month = MONTH_AL.indexOf(m[1]) + 1;
    const year = resolve2DigitYear(m[3] + m[2]); // digits are REVERSED
    if (year >= 1983 && year <= currentYear() + 1)
      return res({ year, month, confidence: 'medium', method: 'bg-1983+',
        note: `Bell & Gossett 1983+: ${m[1]}=month ${month}, reversed year digits ${m[2]}${m[3]}→${year}` });
  }
  return res({ confidence: 'low', method: 'bell-gossett', note: 'Bell & Gossett pre-1983 code needs the model date-code chart — lookup' });
}

// ── Method 4: partial/single-digit year — decade-ambiguous ────────────────
function mitsubishi(serial) {
  const s = String(serial || '').trim().toUpperCase();
  if (/T$/.test(s) && s.length >= 2 && /[0-9]/.test(s[0])) {
    const yd = s[0], mc = s[1];
    const month = MITS_MONTH[mc] || (parseInt(mc, 10) >= 1 && parseInt(mc, 10) <= 9 ? parseInt(mc, 10) : null);
    return res({ month, confidence: 'low', method: 'mitsubishi-T-legacy',
      note: `Mitsubishi legacy 'T' serial: year ends in ${yd} but the DECADE is NOT encoded (…${yd} could be 200${yd}/201${yd}). Resolve via ANSI plate date / refrigerant (R22=older, R410A~2004+, R32~2018+) / model line.` + (month ? ` Month=${month}.` : '') });
  }
  const d = digitsOnly(s);
  if (d.length >= 2) {
    const year = resolve2DigitYear(d.slice(0, 2));
    if (year >= 2005 && year <= currentYear() + 1)
      return res({ year, confidence: 'low', method: 'mitsubishi-modern', note: `Mitsubishi modern: leading 2 digits ≈ year ${year} (low confidence — verify against ANSI plate date)` });
  }
  return res({ method: 'mitsubishi', note: 'Mitsubishi serial unrecognized — read the ANSI manufacture date on the data plate' });
}
function onan(serial) {
  const s = String(serial || '').trim().toUpperCase();
  const m = s.match(/^([A-L])(\d{2})/);
  if (m) {
    const month = MONTH_AL.indexOf(m[1]) + 1, year = resolve2DigitYear(m[2]);
    if (year >= 1970 && year <= currentYear() + 1)
      return res({ year, month, confidence: 'medium', method: 'onan-letterYY',
        note: `Cummins/Onan: ${m[1]}=month ${month}, year ${year} (serial ranges reused ~every 10 yrs — verify decade)` });
  }
  return res({ method: 'onan', note: 'Cummins/Onan serial without a clean [MonthLetter][YY] prefix — use the model-specific Cummins build sheet' });
}

// ── lookup / unsupported ──────────────────────────────────────────────────
function lookup() { return res({ method: 'lookup', note: 'no public serial-to-date algorithm — capture the nameplate manufacture/inspection date or use a factory/registration lookup' }); }

const DECODERS = {
  alliance, aaon, aoSmith, raypak, trane, daikin, lennox, manitowoc, scotsman,
  grundfos, armstrong, wilo, baldor, carrier, rheemHVAC, rheemWH, marley,
  bradfordWhite, lochinvarLetter, hoshizaki, york, bellGossett, mitsubishi, onan, lookup,
};

function findBrand(brand) {
  const q = String(brand || '').toLowerCase();
  if (!q) return null;
  return BRANDS.find((b) => b.aliases.some((a) => q.includes(a))) || null;
}

function decode(brand, serial /*, model */) {
  const entry = findBrand(brand);
  if (!entry) return { brand, canonical: null, category: null, method: 'Unsupported',
    methodClass: null, decadeAmbiguous: false, decoderMethod: 'unsupported',
    year: null, month: null, week: null, confidence: 'none',
    note: `no decoder registered for brand "${brand}"` };
  const fn = DECODERS[entry.decoder] || lookup;
  const result = fn(serial);
  // Lookup-only brands with no algorithm always report method 'lookup'.
  if (entry.decoder === 'lookup') result.method = 'lookup';
  return {
    brand, canonical: entry.brand, category: entry.category,
    method: METHODS[entry.method], methodClass: entry.method,
    decadeAmbiguous: entry.decadeAmbiguous, decoderMethod: result.method,
    year: result.year, month: result.month, week: result.week,
    confidence: result.confidence, note: result.note,
  };
}

module.exports = { decode, findBrand, DECODERS, BRANDS, METHODS };
