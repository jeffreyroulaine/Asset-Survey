# Equipment Serial-Number Decoding Reference

_Generated from `decoder/brands.js`. 56 brands, 73 documented format rows._

Each manufacturer encodes the build date differently. This reference groups brands by **decoding method** so each method can be reviewed and vetted independently. Confidence: **high** = documented + deterministic; **medium** = documented but varies; **low** = uncertain/heuristic. "Decade-ambiguous" means the serial reveals only part of the year and must be corroborated (ANSI plate date, refrigerant, condition).

## Contents
- **Method 1 — Year-first numeric (YYMM/YYWW)** (26 rows)
- **Method 2 — Week/Month-first numeric (WWYY/MMYY)** (5 rows)
- **Method 3 — Alphabetic date code** (10 rows)
- **Method 4 — Partial/single-digit year — decade-ambiguous** (4 rows)
- **Method 5 — Separate nameplate date stamp** (0 rows)
- **Method 6 — Lookup required (no public algorithm)** (28 rows)

## Method 1 — Year-first numeric (YYMM/YYWW)

| Brand | Category | Era | Pattern | Rule | Example | Conf. | Decade? |
|---|---|---|---|---|---|---|---|
| Alliance / Unimac | Commercial laundry | US-built (~mid-2000s–present) | `YYMMnnnnnn` | digits 1-2 = year, digits 3-4 = month (01-12); month reported only when 01-12 | 1505000001 → May 2015 | high | Yes |
| Alliance / Unimac | Commercial laundry | IPSO / European (Czech-built) | `…[YearLetter][MonthLetter]` | date is the LAST two letters: penultimate = year (cycles ~20 yrs: …D=2015,F=2016,H=2017,K=2018,M=2019,Q=2020), last = month (two letters/month: Apr=G/H, May=J/K, Nov=V/Y). Leading digits are a plant/sequence code, NOT the date. VALIDATED vs Alliance ship dates (decodes manufacture date; ship ~1-2 mo later) | 40F002829FH → Apr 2016 (Alliance ship 5/26/2016); 40F003349MK → May 2019 (ship 7/1/2019) | high | Yes |
| Alliance / Unimac | Commercial laundry | legacy US letter-prefixed | `[letter]…` | leading-digit rule does not apply — verify | — | low | Yes |
| AAON | HVAC (rooftop/DOAS) | Style 1 | `YYYYMM…` | digits 1-4 = full year, 5-6 = month | 200108AKG… → Aug 2001 | high | Yes |
| AAON | HVAC (rooftop/DOAS) | Style 2 | `YY…` | digits 1-2 = year (2-digit) | 160901518 → 2016 | medium | Yes |
| A. O. Smith | Water heaters | ~2008–present | `YYWWnnnnnn` | digits 1-2 = year, 3-4 = week (01-52) | 2108… → wk8 2021 | high | No |
| A. O. Smith | Water heaters | pre-2008 letter | `[MonthLetter]YY…` | letter = month (A=Jan…M=Dec, no I), next 2 digits = year | B01… → Feb 2001 | medium | No |
| State Water Heaters | Water heaters | ~2008–present | `YYWW…` | A.O. Smith family scheme: digits 1-2 = year, 3-4 = week | 1523… → wk23 2015 | medium | No |
| State Water Heaters | Water heaters | legacy | `[MonthLetter]YY…` | letter = month, next 2 digits = year | C05… → Mar 2005 | medium | No |
| Raypak | Boilers / pool heaters | 1995–present | `YYMMnnnnnn (10-digit)` | digits 1-2 = year, 3-4 = month | 1604304448 → Apr 2016 | medium | No |
| Raypak | Boilers / pool heaters | pre-1995 | `MMYY…` | field order reversed (month then year) | 0192… → Jan 1992 | low | No |
| Trane | HVAC | 2010–present | `YYWW…` | digits 1-2 = year, 3-4 = week | 1204… → wk4 2012 | high | Yes |
| Trane | HVAC | 2002–2009 | `N WW… (single-digit year)` | digit 1 = last digit of year (era-bounded 2002-2009), 2-3 = week | 752… → wk52 2007 | high | Yes |
| Trane | HVAC | 1983–2001 | `[YearLetter]WW…` | letter = year (W=1983…S=2001), next 2 digits = week | K23… → wk23 1995 | high | Yes |
| Trane | HVAC | pre-1983 / commercial applied | `varies` | no reliable template | 0A250312-1-1 (DOAS) → abstain | low | Yes |
| Daikin | HVAC | Daikin-badged residential | `xxxxYYMM…` | ignore first 4 chars; chars 5-6 = year, 7-8 = month | ….1209… → Sep 2012 | medium | Yes |
| Lennox | HVAC | classic 1974–present | `PPYY[MonthLetter]nnnnn` | digits 1-2 = plant, 3-4 = year, 5th char = month letter (A=Jan…M=Dec, no I) | 5621M99989 → Dec 2021 | medium | Yes |
| Manitowoc Ice | Ice machines | pre-2006 | `YYMMnnnnn` | digits 1-2 = year, 3-4 = month | 050164303 → Jan 2005 | high | Yes |
| Manitowoc Ice | Ice machines | 2006+ | `sequential serial + separate "MFG DT" YYMM plate stamp` | serial not date-bearing; read the MFG DT field | MFG DT 0608 → Aug 2006 | high | Yes |
| Scotsman | Ice machines | after May 2004 | `YYMMxxxx…` | digits 1-2 = year, 3-4 = month; digits 5-8 = site ID | 0711… → Nov 2007 | high | Yes |
| Scotsman | Ice machines | through May 2004 | `…MM[YearLetter]` | last 3 chars: 2-digit OFFSET month (07=Jan…12=Jun,01=Jul…06=Dec) + cycling year letter | …09D → Mar 2002 | medium | Yes |
| Grundfos | Pumps | modern nameplate | `PC = YYWW (production code, often circled)` | digits 1-2 = year, 3-4 = ISO week | PC 0833 → wk33 2008 | high | Yes |
| Armstrong Fluid Technology | Pumps | circulators | `YYMM (4-digit date/serial code)` | digits 1-2 = year, 3-4 = month | 0106 → Jun 2001 | medium | Yes |
| Wilo | Pumps | nameplate date code | `YYWW` | digits 1-2 = year, 3-4 = week | 2423 → wk23 2024 | medium | Yes |
| Baldor (ABB) | Electric motors | modern NEMA serial | `[Plant]YYMMDD…` | skip plant letter; next 2 = year, 2 = month, 2 = day | C1701181132 → 2017-01-18 | medium | Yes |
| Baldor (ABB) | Electric motors | legacy Dodge grid code | `2-char grid code` | reverse-map via Baldor-Dodge date-code chart (not computable) | — | low | Yes |

## Method 2 — Week/Month-first numeric (WWYY/MMYY)

| Brand | Category | Era | Pattern | Rule | Example | Conf. | Decade? |
|---|---|---|---|---|---|---|---|
| Carrier | HVAC | ~1980–present | `WWYY[Plant]nnnnn` | digits 1-2 = WEEK, 3-4 = year (week-then-year — reverse of Trane) | 0180A… → wk1 1980 | high | Yes |
| Carrier | HVAC | 1969–1979 | `[MonthLetter]N…` | letter A-L = month, next digit = last digit of year (1970s) | C4… → Mar 1974 | medium | Yes |
| Rheem / Ruud (HVAC) | HVAC | modern | `[AAAA]WWYYnnnnn` | after 4-letter prefix: digits 1-2 = week, 3-4 = year | RHLN0820… → wk8 2020 | high | Yes |
| Rheem / Ruud (Water heaters) | Water heaters | standard modern | `[prefix]MMYYnnnn` | first 4 digits = month then year (MMYY) | RH0806… → Aug 2006 | high | No |
| Marley / SPX Cooling | Cooling towers | heuristic (third-party) | `…YY` | last 2 digits of serial ≈ year of manufacture OR reconstruction | …13 → 2013 | medium | Yes |

## Method 3 — Alphabetic date code

| Brand | Category | Era | Pattern | Rule | Example | Conf. | Decade? |
|---|---|---|---|---|---|---|---|
| Bradford White | Water heaters | 1984–present | `[YearLetter][MonthLetter]…` | letter 1 = year on 20-yr cycle (A B C D E F G H J K L M N P S T W X Y Z from 1984, skip I O Q R U V); letter 2 = month (A=Jan…M=Dec, no I); resolve to most recent plausible year | SE… → May 2018; ZK… → Oct 2023 | high | Yes |
| Niles Steel Tank | Storage tanks / water heaters | modern | `[YearLetter][MonthLetter]…` | Bradford White subsidiary — same letter code exactly | SL… → Nov 2018 | medium | Yes |
| Lochinvar | Boilers / water heaters | letter rolling code | `[YearLetter][MonthLetter]…` | 20-yr letter cycle (A=1964/1984/2004/2024), same skipped letters as BW; resolve most recent plausible | A… → 2004/2024 | medium | Yes |
| Lochinvar | Boilers / water heaters | numeric (some boiler series) | `YYWW / YYMM (series-dependent)` | positions vary by product line — identify series first | 1842… → wk42 2018 (verify) | low | Yes |
| Hoshizaki | Ice machines | modern | `[YearLetter]NNNNN[MonthLetter]` | trailing letter = month (A=Jan…L=Dec) is RELIABLE; leading year-letter mapping is CONTRADICTORY across sources → abstain on year | …B → February (year unresolved) | medium | Yes |
| York | HVAC | Oct 2004–present | `[Plant]N[MonthLetter]N…` | chars 2 & 4 = year digits, char 3 = month letter | W1G7… → Jul 2017 | medium | Yes |
| York | HVAC | 1971–2004 | `[Plant][Month][Year]…letters` | year letter cycles ~every 21 yrs → period-ambiguous | W F F… → Jun 1976 or 1997 | low | Yes |
| Bell & Gossett (Xylem) | Pumps | 1983+ | `[MonthLetter] + 2 reversed year digits` | letter = month (A=Jan…L=Dec); the two year digits are REVERSED (2023 → "32") | F32 → Jun 2023 | medium | Yes |
| Bell & Gossett (Xylem) | Pumps | pre-1983 | `digit(month)+letter(year)` | needs model-specific date-code chart | — | low | Yes |
| Marathon Motors (Regal) | Electric motors | model-number date code | `chars 1 & 3 of model = year/month via Form 4638E chart` | chart-dependent, letters recur across decades | JFD182T… → Apr 2010 | low | Yes |

## Method 4 — Partial/single-digit year — decade-ambiguous

| Brand | Category | Era | Pattern | Rule | Example | Conf. | Decade? |
|---|---|---|---|---|---|---|---|
| Mitsubishi Electric | HVAC (mini-split/VRF) | legacy (serial ends in "T") | `[Y][M]…T` | char 1 = LAST DIGIT of (fiscal) year — DECADE NOT ENCODED; char 2 = month (1-9, X/Y/Z=Oct/Nov/Dec). Must corroborate decade with ANSI plate date / refrigerant (R22=old, R410A~2004+, R32~2018+) | 6X…T → Oct 2006 OR 2016 (abstain on year) | low | Yes |
| Mitsubishi Electric | HVAC (mini-split/VRF) | modern | `YY…` | leading 2 digits ≈ year (verify vs ANSI plate) | 21… → 2021 | low | Yes |
| Cummins / Onan | Generators | classic build-date prefix | `[MonthLetter]YY…` | letter = month (A=Jan…, includes I so J=Oct), next 2 digits = year; serial ranges reused ~every 10 yrs → decade-ambiguous | J980815794 → Oct 1998 | medium | Yes |
| ASCO | Transfer switches | leading date digits (single source) | `Y MM…` | digit 1 = year (single digit → decade ambiguous), digits 2-3 = month; NOT corroborated to official docs | 512… → month 12, year ?…5 | low | Yes |

## Method 6 — Lookup required (no public algorithm)

| Brand | Category | Era | Pattern | Rule | Example | Conf. | Decade? |
|---|---|---|---|---|---|---|---|
| McQuay (Daikin Applied) | HVAC (applied/commercial) | legacy applied | `multiple position rules` | no single universal rule; identify product line or consult Daikin Applied | — | low | Yes |
| Bryan Boilers | Boilers | all | `n/a` | sequential serial; NOT "Bryant" HVAC — build year via ASME/National Board plate | — | low | No |
| Fulton | Boilers | all | `n/a` | ASME pressure vessel — age via National Board registration / rating plate | — | low | No |
| Patterson-Kelley | Boilers / water heaters | all | `n/a` | no public decode — rating-plate date or National Board number | — | low | No |
| BAC (Baltimore Aircoil) | Cooling towers | all | `n/a` | no published algorithm — nameplate date or myBAC / factory lookup | — | low | No |
| Evapco | Cooling towers | all | `n/a` | no manufacturer algorithm — nameplate date or Evapco factory lookup | — | low | No |
| Taco | Pumps | all | `n/a` | model/serial encodes construction, not date — read motor date stamp or nameplate | — | low | No |
| Aurora / PACO (Pentair) | Pumps | all | `n/a` | no public algorithm for industrial pumps (pool-product Julian scheme does NOT apply) | — | low | No |
| Kohler (generators) | Generators | all | `n/a` | genset serial not consumer-decodable — Model+Spec+Serial to Kohler (engine scheme ≠ genset) | — | low | No |
| Generac | Generators | all | `n/a` | sequential serial — read data-tag production date or Generac lookup (ignore "first 2 digits=year" folk rule) | — | low | No |
| Caterpillar | Generators | all | `n/a` | no year digit in serial — build year via Cat SIS / dealer using full PIN | — | low | No |
| Zenith | Transfer switches | all | `n/a` | order-specific serial, no public date decode — nameplate or ABB/GE lookup | — | low | No |
| Pellerin Milnor | Commercial laundry | all | `n/a` | internal date code, not publicly decodable — nameplate date or Milnor parts | — | low | No |
| Chicago Dryer | Commercial laundry | all | `n/a` | no public decode — nameplate date or factory records | — | low | No |
| Cissell | Commercial laundry | all | `n/a` | legacy = lookup; current Alliance-built MAY use YYMM (verify month 01-12) | — | low | No |
| American Dryer (ADC) | Commercial laundry | all | `n/a` | rating-plate date; newer Alliance-built MAY use YYMM (unverified) | — | low | No |
| G.A. Braun | Commercial laundry | all | `n/a` | factory-records lookup by serial — nameplate date | — | low | No |
| Forenta | Commercial laundry | all | `n/a` | no public decode — nameplate date or Forenta records | — | low | No |
| Energenics | Commercial laundry (lint/air) | all | `n/a` | no public decode — nameplate date or Energenics | — | low | No |
| Canariis | Pumps | all | `n/a` | no public algorithm — nameplate date or factory lookup | — | low | No |
| Otis | Elevators | all | `n/a` | serial = product/plant code, no date — inspection certificate / build-year plate / controller nameplate | — | low | No |
| KONE / Montgomery | Elevators | all | `n/a` | sequential serial, no date — inspection certificate; "Montgomery KONE" badge ≈ 1993-2000 | — | low | No |
| ThyssenKrupp / TK Elevator | Elevators | all | `n/a` | serial not date-bearing — inspection certificate / data plate | — | low | No |
| Schindler | Elevators | all | `n/a` | sequential serial, no date — inspection certificate / build-year plate | — | low | No |
| Potter | Fire alarm | all | `n/a` | no public decode — panel programmed date / installed tag / AHJ records | — | low | No |
| Simplex (JCI) | Fire alarm | all | `n/a` | contested letter+YY+WW code (forum-sourced) — prefer panel date / service tag / ITM records | — | low | No |
| Notifier (Honeywell) | Fire alarm | all | `n/a` | YYWW date code dates the BOARD/device, not the panel — prefer panel programmed date / service tag | — | low | No |
| Silent Knight (Honeywell) | Fire alarm | all | `n/a` | internal board date code, not public — panel date / service tag / Honeywell lookup | — | low | No |
