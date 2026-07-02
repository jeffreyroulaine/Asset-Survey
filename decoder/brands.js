/**
 * brands.js — the vetted serial-number knowledge base.
 *
 * This is the SINGLE SOURCE OF TRUTH for both:
 *   (a) the runtime decoder (serialDecoder.js dispatches on `decoder`), and
 *   (b) the human-review reference (generateReference.js emits CSV/MD/XLSX).
 *
 * Every entry was compiled from cited manufacturer/inspection sources (see `sources`)
 * and, where possible, validated against real hotel-survey serials (see groundTruth.js).
 *
 * `method` groups brands by HOW the date is encoded, so the reference can present
 * "one sheet per method" for vetting:
 *   1 = Year-first numeric        (YYMM / YYWW at the start of the serial)
 *   2 = Week/Month-first numeric  (WWYY / MMYY at the start of the serial)
 *   3 = Alphabetic date code      (year-letter cycle and/or month letter)
 *   4 = Partial/single-digit year (decade-AMBIGUOUS — must corroborate)
 *   5 = Separate nameplate stamp  (serial not decodable; read the printed MFG date)
 *   6 = Lookup required           (no public algorithm — factory/registration/plate)
 *
 * `decoder` = key into serialDecoder.js DECODERS (null → treated as lookup).
 * `confidence` on each format: high | medium | low.
 */

const METHODS = {
  1: 'Year-first numeric (YYMM/YYWW)',
  2: 'Week/Month-first numeric (WWYY/MMYY)',
  3: 'Alphabetic date code',
  4: 'Partial/single-digit year — decade-ambiguous',
  5: 'Separate nameplate date stamp',
  6: 'Lookup required (no public algorithm)',
};

const BRANDS = [
  // ── Method 1: Year-first numeric ──────────────────────────────────────────
  {
    brand: 'Alliance / Unimac', decoder: 'alliance', method: 1,
    aliases: ['unimac', 'alliance', 'speed queen', 'speedqueen', 'huebsch', 'heubsch', 'ipso'],
    category: 'Commercial laundry', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: '~mid-2000s–present', pattern: 'YYMMnnnnnn', rule: 'digits 1-2 = year, digits 3-4 = month (01-12); month reported only when 01-12', example: '1505000001 → May 2015', confidence: 'high' },
      { era: 'legacy (letter-suffix)', pattern: '…+2 trailing letters', rule: 'date is the LAST two letters (year letter cycles, month letter) — leading-digit rule does NOT apply', example: '…DK → 2015-05', confidence: 'medium' },
    ],
    abstainWhen: 'serial starts with a letter (legacy), or is <4 digits',
    sources: ['https://homespy.io/alliance-laundry-serial-lookup', 'http://www.appliance411.com/service/date-code.php'],
  },
  {
    brand: 'AAON', decoder: 'aaon', method: 1,
    aliases: ['aaon', 'aaonaire'], category: 'HVAC (rooftop/DOAS)', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'Style 1', pattern: 'YYYYMM…', rule: 'digits 1-4 = full year, 5-6 = month', example: '200108AKG… → Aug 2001', confidence: 'high' },
      { era: 'Style 2', pattern: 'YY…', rule: 'digits 1-2 = year (2-digit)', example: '160901518 → 2016', confidence: 'medium' },
    ],
    abstainWhen: 'serial shape matches none of AAON’s 3 styles',
    sources: ['https://www.building-center.org/aaon-hvac-age/', 'https://www.stewartchi.com/aaon.html'],
  },
  {
    brand: 'A. O. Smith', decoder: 'aoSmith', method: 1,
    aliases: ['a. o. smith', 'a.o. smith', 'ao smith', 'aosmith', 'american water heater', 'reliance', 'u.s. craftmaster'],
    category: 'Water heaters', hasPublicAlgorithm: true, decadeAmbiguous: false,
    formats: [
      { era: '~2008–present', pattern: 'YYWWnnnnnn', rule: 'digits 1-2 = year, 3-4 = week (01-52)', example: '2108… → wk8 2021', confidence: 'high' },
      { era: 'pre-2008 letter', pattern: '[MonthLetter]YY…', rule: 'letter = month (A=Jan…M=Dec, no I), next 2 digits = year', example: 'B01… → Feb 2001', confidence: 'medium' },
    ],
    abstainWhen: 'prefix is not YYWW / MMYY / letter+YY',
    sources: ['https://inspectapedia.com/plumbing/AO-Smith-Water-Heater-Age-Manuals.php', 'https://www.building-center.org/a-o-smith-water-heater-age/'],
  },
  {
    brand: 'State Water Heaters', decoder: 'aoSmith', method: 1,
    aliases: ['state water', 'state industries', 'state select'],
    category: 'Water heaters', hasPublicAlgorithm: true, decadeAmbiguous: false,
    formats: [
      { era: '~2008–present', pattern: 'YYWW…', rule: 'A.O. Smith family scheme: digits 1-2 = year, 3-4 = week', example: '1523… → wk23 2015', confidence: 'medium' },
      { era: 'legacy', pattern: '[MonthLetter]YY…', rule: 'letter = month, next 2 digits = year', example: 'C05… → Mar 2005', confidence: 'medium' },
    ],
    abstainWhen: 'prefix not YYWW / letter+YY',
    sources: ['https://www.building-center.org/state-water-heater-age/'],
  },
  {
    brand: 'Raypak', decoder: 'raypak', method: 1,
    aliases: ['raypak', 'ray pak'], category: 'Boilers / pool heaters', hasPublicAlgorithm: true, decadeAmbiguous: false,
    formats: [
      { era: '1995–present', pattern: 'YYMMnnnnnn (10-digit)', rule: 'digits 1-2 = year, 3-4 = month', example: '1604304448 → Apr 2016', confidence: 'medium' },
      { era: 'pre-1995', pattern: 'MMYY…', rule: 'field order reversed (month then year)', example: '0192… → Jan 1992', confidence: 'low' },
    ],
    abstainWhen: 'first 4 digits give no valid month in either order',
    sources: ['https://www.building-center.org/raypak-hvac-age/', 'https://www.raypak.com/how-to-read-a-raypak-model-number/'],
  },
  {
    brand: 'Trane', decoder: 'trane', method: 1,
    aliases: ['trane', 'american standard'], category: 'HVAC', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: '2010–present', pattern: 'YYWW…', rule: 'digits 1-2 = year, 3-4 = week', example: '1204… → wk4 2012', confidence: 'high' },
      { era: '2002–2009', pattern: 'N WW… (single-digit year)', rule: 'digit 1 = last digit of year (era-bounded 2002-2009), 2-3 = week', example: '752… → wk52 2007', confidence: 'high' },
      { era: '1983–2001', pattern: '[YearLetter]WW…', rule: 'letter = year (W=1983…S=2001), next 2 digits = week', example: 'K23… → wk23 1995', confidence: 'high' },
      { era: 'pre-1983 / commercial applied', pattern: 'varies', rule: 'no reliable template', example: '0A250312-1-1 (DOAS) → abstain', confidence: 'low' },
    ],
    abstainWhen: 'serial matches none of the residential/light-commercial era templates (e.g. commercial applied units)',
    sources: ['https://www.building-center.org/trane-hvac-age/', 'https://www.partstown.com/cm/resource-center/guides/gd2/trane-serial-number-lookup'],
  },
  {
    brand: 'Daikin', decoder: 'daikin', method: 1,
    aliases: ['daikin'], category: 'HVAC', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'Daikin-badged residential', pattern: 'xxxxYYMM…', rule: 'ignore first 4 chars; chars 5-6 = year, 7-8 = month', example: '….1209… → Sep 2012', confidence: 'medium' },
    ],
    abstainWhen: 'McQuay applied lines (position varies) or non-matching shape → lookup',
    sources: ['https://inspectorhandbook.com/hvac/daikin', 'https://www.building-center.org/daikin-hvac-age/'],
  },
  {
    brand: 'McQuay (Daikin Applied)', decoder: 'lookup', method: 6,
    aliases: ['mcquay', 'aaf-mcquay', 'daikin applied', 'daikin mcquay'],
    category: 'HVAC (applied/commercial)', hasPublicAlgorithm: false, decadeAmbiguous: true,
    formats: [{ era: 'legacy applied', pattern: 'multiple position rules', rule: 'no single universal rule; identify product line or consult Daikin Applied', example: '—', confidence: 'low' }],
    abstainWhen: 'always (product-line-specific) — verify via nameplate / Daikin Applied',
    sources: ['https://www.building-center.org/mcquay-hvac-age/'],
  },
  {
    brand: 'Lennox', decoder: 'lennox', method: 1,
    aliases: ['lennox', 'armstrong air', 'ducane', 'aire-flo', 'concord', 'allied air'],
    category: 'HVAC', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'classic 1974–present', pattern: 'PPYY[MonthLetter]nnnnn', rule: 'digits 1-2 = plant, 3-4 = year, 5th char = month letter (A=Jan…M=Dec, no I)', example: '5621M99989 → Dec 2021', confidence: 'medium' },
    ],
    abstainWhen: 'serial not in classic PPYY[letter] shape',
    sources: ['https://www.building-center.org/lennox-hvac-age/', 'https://www.pickhvac.com/hvac/age-serial-number/lennox/'],
  },
  {
    brand: 'Manitowoc Ice', decoder: 'manitowoc', method: 1,
    aliases: ['manitowoc'], category: 'Ice machines', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'pre-2006', pattern: 'YYMMnnnnn', rule: 'digits 1-2 = year, 3-4 = month', example: '050164303 → Jan 2005', confidence: 'high' },
      { era: '2006+', pattern: 'sequential serial + separate "MFG DT" YYMM plate stamp', rule: 'serial not date-bearing; read the MFG DT field', example: 'MFG DT 0608 → Aug 2006', confidence: 'high' },
    ],
    abstainWhen: 'first-4-digit block gives month >12, or a post-2006 sequential serial with no MFG DT captured',
    sources: ['https://www.easyice.com/how-to-read-a-manitowoc-serial-number', 'https://www.icemachineclearance.com/blog/manitowoc-ice-machine-serial-numbers/'],
  },
  {
    brand: 'Scotsman', decoder: 'scotsman', method: 1,
    aliases: ['scotsman'], category: 'Ice machines', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'after May 2004', pattern: 'YYMMxxxx…', rule: 'digits 1-2 = year, 3-4 = month; digits 5-8 = site ID', example: '0711… → Nov 2007', confidence: 'high' },
      { era: 'through May 2004', pattern: '…MM[YearLetter]', rule: 'last 3 chars: 2-digit OFFSET month (07=Jan…12=Jun,01=Jul…06=Dec) + cycling year letter', example: '…09D → Mar 2002', confidence: 'medium' },
    ],
    abstainWhen: 'pre-2004 year letter cannot be pinned to a decade; trailing block matches neither pattern',
    sources: ['https://www.partstown.com/cm/resource-center/guides/gd2/how-to-read-a-scotsman-serial-number'],
  },
  {
    brand: 'Grundfos', decoder: 'grundfos', method: 1,
    aliases: ['grundfos'], category: 'Pumps', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'modern nameplate', pattern: 'PC = YYWW (production code, often circled)', rule: 'digits 1-2 = year, 3-4 = ISO week', example: 'PC 0833 → wk33 2008', confidence: 'high' },
    ],
    abstainWhen: 'century unclear (2-digit year), or no PC code present',
    sources: ['https://www.grundfos.com/us/support/how-to-guides/finding-a-product-number-on-a-pump-nameplate'],
  },
  {
    brand: 'Armstrong Fluid Technology', decoder: 'armstrong', method: 1,
    aliases: ['armstrong fluid', 's.a. armstrong', 'armstrong pump'], category: 'Pumps', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'circulators', pattern: 'YYMM (4-digit date/serial code)', rule: 'digits 1-2 = year, 3-4 = month', example: '0106 → Jun 2001', confidence: 'medium' },
    ],
    abstainWhen: 'large engineered/special-material pumps use a plain serial (no date) → lookup',
    sources: ['https://www.nationalpumpsupply.com/content/pdf/armstrong-pump-circulator-pump-parts-list.pdf'],
  },
  {
    brand: 'Wilo', decoder: 'wilo', method: 1,
    aliases: ['wilo'], category: 'Pumps', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'nameplate date code', pattern: 'YYWW', rule: 'digits 1-2 = year, 3-4 = week', example: '2423 → wk23 2024', confidence: 'medium' },
    ],
    abstainWhen: 'date field layout not obvious on longer serials',
    sources: ['https://cms.media.wilo.com/cdndoc/wilo666890/8475454/wilo666890.pdf'],
  },
  {
    brand: 'Baldor (ABB)', decoder: 'baldor', method: 1,
    aliases: ['baldor', 'baldor-reliance', 'baldor-dodge'], category: 'Electric motors', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'modern NEMA serial', pattern: '[Plant]YYMMDD…', rule: 'skip plant letter; next 2 = year, 2 = month, 2 = day', example: 'C1701181132 → 2017-01-18', confidence: 'medium' },
      { era: 'legacy Dodge grid code', pattern: '2-char grid code', rule: 'reverse-map via Baldor-Dodge date-code chart (not computable)', example: '—', confidence: 'low' },
    ],
    abstainWhen: 'serial not in plant+YYMMDD shape, or only a legacy grid code present',
    sources: ['https://www.pooleyinc.com/wp-content/uploads/Baldor-Dodge-Mfr-Date-Code-Chart.pdf'],
  },

  // ── Method 2: Week/Month-first numeric ────────────────────────────────────
  {
    brand: 'Carrier', decoder: 'carrier', method: 2,
    aliases: ['carrier', 'bryant', 'payne', 'totaline', 'icp'], category: 'HVAC', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: '~1980–present', pattern: 'WWYY[Plant]nnnnn', rule: 'digits 1-2 = WEEK, 3-4 = year (week-then-year — reverse of Trane)', example: '0180A… → wk1 1980', confidence: 'high' },
      { era: '1969–1979', pattern: '[MonthLetter]N…', rule: 'letter A-L = month, next digit = last digit of year (1970s)', example: 'C4… → Mar 1974', confidence: 'medium' },
    ],
    abstainWhen: 'not modern WWYY and not the 1969-1979 letter form',
    sources: ['https://www.building-center.org/carrier-hvac-age/', 'https://inspectorhandbook.com/hvac/carrier'],
  },
  {
    brand: 'Rheem / Ruud (HVAC)', decoder: 'rheemHVAC', method: 2,
    aliases: ['rheem', 'ruud', 'weatherking', 'richmond'], category: 'HVAC', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'modern', pattern: '[AAAA]WWYYnnnnn', rule: 'after 4-letter prefix: digits 1-2 = week, 3-4 = year', example: 'RHLN0820… → wk8 2020', confidence: 'high' },
    ],
    abstainWhen: 'digits after prefix are not a valid WWYY',
    sources: ['https://www.pickhvac.com/hvac/age-serial-number/rheem/', 'https://www.rheem.com/rheem_model_serial_numbers/'],
  },
  {
    brand: 'Rheem / Ruud (Water heaters)', decoder: 'rheemWH', method: 2,
    aliases: ['rheem water', 'ruud water'], category: 'Water heaters', hasPublicAlgorithm: true, decadeAmbiguous: false,
    formats: [
      { era: 'standard modern', pattern: '[prefix]MMYYnnnn', rule: 'first 4 digits = month then year (MMYY)', example: 'RH0806… → Aug 2006', confidence: 'high' },
    ],
    abstainWhen: 'first 4 digits are not a valid MMYY (month >12)',
    sources: ['https://www.rheem.com/how-to-locate-and-read-your-rheem-water-heating-serial-numbers/', 'https://inspectapedia.com/plumbing/Rheem-Water-Heater-Age-Decoder.php'],
  },
  {
    brand: 'Marley / SPX Cooling', decoder: 'marley', method: 2,
    aliases: ['marley', 'spx cooling', 'spx'], category: 'Cooling towers', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'heuristic (third-party)', pattern: '…YY', rule: 'last 2 digits of serial ≈ year of manufacture OR reconstruction', example: '…13 → 2013', confidence: 'medium' },
    ],
    abstainWhen: 'trailing digits ambiguous, or unit may have been reconstructed (code can be rebuild year)',
    sources: ['https://www.building-center.org/marley-hvac-age/'],
  },

  // ── Method 3: Alphabetic date code ────────────────────────────────────────
  {
    brand: 'Bradford White', decoder: 'bradfordWhite', method: 3,
    aliases: ['bradford white', 'bradford-white', 'bwc'], category: 'Water heaters', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: '1984–present', pattern: '[YearLetter][MonthLetter]…', rule: 'letter 1 = year on 20-yr cycle (A B C D E F G H J K L M N P S T W X Y Z from 1984, skip I O Q R U V); letter 2 = month (A=Jan…M=Dec, no I); resolve to most recent plausible year', example: 'SE… → May 2018; ZK… → Oct 2023', confidence: 'high' },
    ],
    abstainWhen: 'serial doesn’t start with 2 letters or 2nd letter outside A-M',
    sources: ['https://www.bradfordwhite.com/bw-faq/how-to-read-the-serial-number-date-code-reference-chart/', 'https://www.building-center.org/bradford-white-water-heater-age/'],
  },
  {
    brand: 'Niles Steel Tank', decoder: 'bradfordWhite', method: 3,
    aliases: ['niles steel', 'niles tank'], category: 'Storage tanks / water heaters', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'modern', pattern: '[YearLetter][MonthLetter]…', rule: 'Bradford White subsidiary — same letter code exactly', example: 'SL… → Nov 2018', confidence: 'medium' },
    ],
    abstainWhen: 'as Bradford White',
    sources: ['https://www.building-center.org/bradford-white-water-heater-age/'],
  },
  {
    brand: 'Lochinvar', decoder: 'lochinvarLetter', method: 3,
    aliases: ['lochinvar'], category: 'Boilers / water heaters', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'letter rolling code', pattern: '[YearLetter][MonthLetter]…', rule: '20-yr letter cycle (A=1964/1984/2004/2024), same skipped letters as BW; resolve most recent plausible', example: 'A… → 2004/2024', confidence: 'medium' },
      { era: 'numeric (some boiler series)', pattern: 'YYWW / YYMM (series-dependent)', rule: 'positions vary by product line — identify series first', example: '1842… → wk42 2018 (verify)', confidence: 'low' },
    ],
    abstainWhen: 'series/format cannot be identified, or leading chars ambiguous between letter/numeric',
    sources: ['https://www.building-center.org/lochinvar-hvac-age/', 'https://www.lochinvar.com/lit/WARR%20(100161789)%20Rev%2018.pdf'],
  },
  {
    brand: 'Hoshizaki', decoder: 'hoshizaki', method: 3,
    aliases: ['hoshizaki'], category: 'Ice machines', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'modern', pattern: '[YearLetter]NNNNN[MonthLetter]', rule: 'trailing letter = month (A=Jan…L=Dec) is RELIABLE; leading year-letter mapping is CONTRADICTORY across sources → abstain on year', example: '…B → February (year unresolved)', confidence: 'medium' },
    ],
    abstainWhen: 'year (leading letter) is genuinely ambiguous — verify via Hoshizaki warranty lookup',
    sources: ['https://www.easyice.com/how-to-read-a-hoshizaki-serial-number/'],
  },
  {
    brand: 'York', decoder: 'york', method: 3,
    aliases: ['york', 'luxaire', 'fraser-johnston', 'coleman hvac', 'johnson controls hvac'],
    category: 'HVAC', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'Oct 2004–present', pattern: '[Plant]N[MonthLetter]N…', rule: 'chars 2 & 4 = year digits, char 3 = month letter', example: 'W1G7… → Jul 2017', confidence: 'medium' },
      { era: '1971–2004', pattern: '[Plant][Month][Year]…letters', rule: 'year letter cycles ~every 21 yrs → period-ambiguous', example: 'W F F… → Jun 1976 or 1997', confidence: 'low' },
    ],
    abstainWhen: 'pre-2004 cycling year letter cannot be pinned without plate/refrigerant evidence',
    sources: ['https://www.pickhvac.com/hvac/age-serial-number/york/', 'http://www.usair-eng.com/Serialnumber.pdf'],
  },
  {
    brand: 'Bell & Gossett (Xylem)', decoder: 'bellGossett', method: 3,
    aliases: ['bell & gossett', 'bell and gossett', 'b&g', 'xylem'], category: 'Pumps', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: '1983+', pattern: '[MonthLetter] + 2 reversed year digits', rule: 'letter = month (A=Jan…L=Dec); the two year digits are REVERSED (2023 → "32")', example: 'F32 → Jun 2023', confidence: 'medium' },
      { era: 'pre-1983', pattern: 'digit(month)+letter(year)', rule: 'needs model-specific date-code chart', example: '—', confidence: 'low' },
    ],
    abstainWhen: 'cannot tell pre/post-1983 form, or year-letter chart unavailable',
    sources: ['https://www.canadianpumpshop.com/blog/bell-and-gossett-pump-date-codes-decoded-a-guide-to-reading-and-understanding/'],
  },
  {
    brand: 'Marathon Motors (Regal)', decoder: 'lookup', method: 3,
    aliases: ['marathon motor', 'marathon electric', 'regal beloit', 'regal rexnord'],
    category: 'Electric motors', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'model-number date code', pattern: 'chars 1 & 3 of model = year/month via Form 4638E chart', rule: 'chart-dependent, letters recur across decades', example: 'JFD182T… → Apr 2010', confidence: 'low' },
    ],
    abstainWhen: 'always without the Date Code Chart (Form 4638E) → lookup',
    sources: ['https://www.regalrexnord.com/brands/marathon-motors/how-to-identify-age-of-marathon-motor'],
  },

  // ── Method 4: Partial/single-digit year — decade-ambiguous ────────────────
  {
    brand: 'Mitsubishi Electric', decoder: 'mitsubishi', method: 4,
    aliases: ['mitsubishi', 'mr. slim', 'mr slim', 'city multi', 'metus'],
    category: 'HVAC (mini-split/VRF)', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'legacy (serial ends in "T")', pattern: '[Y][M]…T', rule: 'char 1 = LAST DIGIT of (fiscal) year — DECADE NOT ENCODED; char 2 = month (1-9, X/Y/Z=Oct/Nov/Dec). Must corroborate decade with ANSI plate date / refrigerant (R22=old, R410A~2004+, R32~2018+)', example: '6X…T → Oct 2006 OR 2016 (abstain on year)', confidence: 'low' },
      { era: 'modern', pattern: 'YY…', rule: 'leading 2 digits ≈ year (verify vs ANSI plate)', example: '21… → 2021', confidence: 'low' },
    ],
    abstainWhen: '"T" serial with no ANSI date/refrigerant/model signal to fix the decade',
    sources: ['https://www.building-center.org/mitsubishi-hvac-age/', 'https://www.stewartchi.com/mitsubishi.html'],
  },
  {
    brand: 'Cummins / Onan', decoder: 'onan', method: 4,
    aliases: ['onan', 'cummins onan', 'cummins'], category: 'Generators', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'classic build-date prefix', pattern: '[MonthLetter]YY…', rule: 'letter = month (A=Jan…, includes I so J=Oct), next 2 digits = year; serial ranges reused ~every 10 yrs → decade-ambiguous', example: 'J980815794 → Oct 1998', confidence: 'medium' },
    ],
    abstainWhen: 'no clean [letter][YY] prefix, or decade unresolved → model-specific Cummins build sheet',
    sources: ['https://www.cummins.com/generators/how-to-identify-your-generator-model'],
  },
  {
    brand: 'ASCO', decoder: 'lookup', method: 4,
    aliases: ['asco'], category: 'Transfer switches', hasPublicAlgorithm: true, decadeAmbiguous: true,
    formats: [
      { era: 'leading date digits (single source)', pattern: 'Y MM…', rule: 'digit 1 = year (single digit → decade ambiguous), digits 2-3 = month; NOT corroborated to official docs', example: '512… → month 12, year ?…5', confidence: 'low' },
    ],
    abstainWhen: 'always on decade (single-digit year); verify via ASCO Power Services',
    sources: ['https://www.businesswire.com/news/home/20211007005806/en/'],
  },

  // ── Method 6: Lookup required (no public algorithm) ───────────────────────
  ...[
    ['Bryan Boilers', ['bryan', 'bryan steam'], 'Boilers', 'sequential serial; NOT "Bryant" HVAC — build year via ASME/National Board plate', ['https://bryanboilers.com/', 'https://www.building-center.org/bryan-hvac-age/']],
    ['Fulton', ['fulton'], 'Boilers', 'ASME pressure vessel — age via National Board registration / rating plate', ['https://www.fulton.com/documents/']],
    ['Patterson-Kelley', ['patterson-kelley', 'patterson kelley', 'p-k'], 'Boilers / water heaters', 'no public decode — rating-plate date or National Board number', ['https://www.pattersonkelley.com/resources/product-document-archive/']],
    ['BAC (Baltimore Aircoil)', ['bac', 'baltimore aircoil'], 'Cooling towers', 'no published algorithm — nameplate date or myBAC / factory lookup', ['https://baltimoreaircoil.com/resources']],
    ['Evapco', ['evapco'], 'Cooling towers', 'no manufacturer algorithm — nameplate date or Evapco factory lookup', ['https://www.evapco.com/replacement-parts']],
    ['Taco', ['taco'], 'Pumps', 'model/serial encodes construction, not date — read motor date stamp or nameplate', ['https://www.tacocomfort.com/wp-content/uploads/2019/08/Serial-Number-Location.pdf']],
    ['Aurora / PACO (Pentair)', ['aurora', 'paco', 'pentair pump'], 'Pumps', 'no public algorithm for industrial pumps (pool-product Julian scheme does NOT apply)', ['https://www.pentair.com/content/dam/extranet/enterprise/app-support/SerialNumber-Pumps.pdf']],
    ['Kohler (generators)', ['kohler'], 'Generators', 'genset serial not consumer-decodable — Model+Spec+Serial to Kohler (engine scheme ≠ genset)', ['https://assist.kohler.com/']],
    ['Generac', ['generac', 'guardian generator'], 'Generators', 'sequential serial — read data-tag production date or Generac lookup (ignore "first 2 digits=year" folk rule)', ['https://support.generac.com/s/article/How-can-I-find-out-the-year-my-generator-was-made']],
    ['Caterpillar', ['caterpillar', 'cat generator', 'cat olympian'], 'Generators', 'no year digit in serial — build year via Cat SIS / dealer using full PIN', ['https://parts.cat.com/en/catcorp/cat-serial-number-identification']],
    ['Zenith', ['zenith', 'zenith controls', 'ge zenith', 'abb zenith'], 'Transfer switches', 'order-specific serial, no public date decode — nameplate or ABB/GE lookup', ['https://library.e.abb.com/']],
    ['Pellerin Milnor', ['milnor', 'pellerin'], 'Commercial laundry', 'internal date code, not publicly decodable — nameplate date or Milnor parts', ['https://www.milnor.com/technical-knowledge-base/']],
    ['Chicago Dryer', ['chicago dryer', 'chicago'], 'Commercial laundry', 'no public decode — nameplate date or factory records', ['https://www.appliancefactoryparts.com/blog/2010/02/how-to-find-the-age-of-your-appliance/']],
    ['Cissell', ['cissell'], 'Commercial laundry', 'legacy = lookup; current Alliance-built MAY use YYMM (verify month 01-12)', ['https://homespy.io/alliance-laundry-serial-lookup']],
    ['American Dryer (ADC)', ['american dryer', 'adc', 'amdry'], 'Commercial laundry', 'rating-plate date; newer Alliance-built MAY use YYMM (unverified)', ['https://www.adclaundry.com/']],
    ['G.A. Braun', ['braun', 'g.a. braun'], 'Commercial laundry', 'factory-records lookup by serial — nameplate date', ['https://braunlaundryparts.com/']],
    ['Forenta', ['forenta'], 'Commercial laundry', 'no public decode — nameplate date or Forenta records', ['https://www.forentausa.com/']],
    ['Energenics', ['energenics'], 'Commercial laundry (lint/air)', 'no public decode — nameplate date or Energenics', ['https://energenics.com/']],
    ['Canariis', ['canariis'], 'Pumps', 'no public algorithm — nameplate date or factory lookup', ['https://www.building-center.org/']],
    ['Otis', ['otis'], 'Elevators', 'serial = product/plant code, no date — inspection certificate / build-year plate / controller nameplate', ['https://elevation.fandom.com/wiki/Elevator_serial_number_and_install_year_guide']],
    ['KONE / Montgomery', ['kone', 'montgomery'], 'Elevators', 'sequential serial, no date — inspection certificate; "Montgomery KONE" badge ≈ 1993-2000', ['https://elevation.fandom.com/wiki/Elevator_serial_number_and_install_year_guide']],
    ['ThyssenKrupp / TK Elevator', ['thyssenkrupp', 'tk elevator', 'tke'], 'Elevators', 'serial not date-bearing — inspection certificate / data plate', ['https://elevation.fandom.com/wiki/How_to_find_out_how_old_an_elevator_is']],
    ['Schindler', ['schindler'], 'Elevators', 'sequential serial, no date — inspection certificate / build-year plate', ['https://www.schindler.com/en/tools-resources/frequently-asked-questions.html']],
    ['Potter', ['potter'], 'Fire alarm', 'no public decode — panel programmed date / installed tag / AHJ records', ['https://www.pottersignal.com/']],
    ['Simplex (JCI)', ['simplex', 'simplexgrinnell'], 'Fire alarm', 'contested letter+YY+WW code (forum-sourced) — prefer panel date / service tag / ITM records', ['https://forums.thefirepanel.com/t/simplex-date-code-interpretation/4083']],
    ['Notifier (Honeywell)', ['notifier'], 'Fire alarm', 'YYWW date code dates the BOARD/device, not the panel — prefer panel programmed date / service tag', ['https://www.firetradesupplies.com/blogs/fire-trade-supplies-blog/how-to-date-fire-alarm-detectors']],
    ['Silent Knight (Honeywell)', ['silent knight', 'farenhyt'], 'Fire alarm', 'internal board date code, not public — panel date / service tag / Honeywell lookup', ['https://buildings.honeywell.com/us/en/brands/our-brands/silent-knight']],
  ].map(([brand, aliases, category, rule, sources]) => ({
    brand, decoder: 'lookup', method: 6, aliases, category,
    hasPublicAlgorithm: false, decadeAmbiguous: false,
    formats: [{ era: 'all', pattern: 'n/a', rule, example: '—', confidence: 'low' }],
    abstainWhen: 'always — capture the printed manufacture/inspection date instead',
    sources,
  })),
];

module.exports = { BRANDS, METHODS };
