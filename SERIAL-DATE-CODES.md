# Equipment Serial Number Date-Code Database

Reference database for decoding manufacture dates from equipment serial numbers.
These rules are embedded in the Asset Survey app's AI prompt (`docs/index.html`,
`getEquipmentInfo()`). Update both places when adding a rule.

**Evidence sources:**
- 6 completed AVR/Dimension property surveys (~370 assets): Nashville HWS,
  Hanover Marriott, Lubbock HGI, Las Colinas Hampton Inn, Las Colinas HGI,
  Snellville Hampton Inn & Suites (Snellville completed by Jeff Roulaine —
  highest-trust ground truth)
- Alliance Laundry Systems factory warranty lookups (Boca Raton Marriott,
  July 2026 email from Alliance distributor)
- Building Intelligence Center / inspector references (Mitsubishi month codes)

Validation: 29/29 training pairs matched across 3 surveys; 4/5 held-out pairs
matched on the 2 Las Colinas surveys; Snellville added 25+ more confirmations
and 4 new manufacturer rules.

---

## Verified rules

| Manufacturer | Rule | Example | Evidence |
|---|---|---|---|
| UniMac / Speed Queen / Huebsch / Alliance (ALL-NUMERIC serials only) | First 4 digits = YYMM | `1605029896` = May 2016 | 11 units across 4 properties; factory-consistent |
| Alliance ALPHANUMERIC serials (large washer-extractors) | **No date code** — requires Alliance factory lookup | `40F002829FH` shipped 5/2016; `280FX001342FY` shipped 12/2016; `40F003349MK` shipped 7/2019 | Factory-confirmed via Alliance warranty portal (Boca Raton) |
| A.O. Smith / State / Solid State / Lochinvar (13-digit serials only) | First 4 digits = YYWW | `2301132336629` = wk 1, 2023 | 5 units; do NOT apply to shorter serials (9-digit Lochinvar `112105473` was 2018, decodes wrong) |
| Bradford White | 1st letter = year, 20-year cycle; 2nd letter = month | `SC41065129` = 2018; `ZD51364229` = 2023; `SJ42182097` = 2018 | 3 units, 2 independent properties. Cycle: L=2014 M=2015 N=2016 P=2017 S=2018 T=2019 W=2020 X=2021 Y=2022 Z=2023 A=2024 B=2025 C=2026 |
| Carrier / Bryant / Payne / ICP | First 4 digits = WWYY | `0716C37282` = wk 7, 2016; `1820E06460` = wk 18, 2020 | 14+ units. Weeks 01–53 valid |
| Rheem / Ruud | Letter + 4 digits = WWYY | `A101615185` = wk 10, 2016; `A162304208` = wk 16, 2023 | 3 units, 2 properties |
| AAON | First 4 digits = YYMM | `160901518` = Sep 2016 | 1 strong + several partial |
| Scotsman | First 4 digits = YYMM | `1602130014148` = Feb 2016 | 4 units |
| Precor | Letters, then 4 digits = WWYY | `AGMHG28140012` = wk 28, 2014 | 4 units |
| Pitco | Letter + YY | `G16CC018666` = 2016 | 3 units |
| Cummins | Letter + YY | `F070075719` = 2007 | 1 unit |
| Trane (serials STARTING with digits) | First 5 digits = YY + Julian day-of-year | `18133TMU2F` = 2018, day 133 | 11/11 units (Snellville, Jeff-verified). Letter-leading Trane serials (`OA272176…`) do NOT follow this |
| Mitsubishi Electric | 1st char = last digit of year; 2nd char = month (1–9 = Jan–Sep, X=Oct, Y=Nov, Z=Dec) | `84P1013` = Apr 2018; `88C13723` = Aug 2018 | 10/10 units (Snellville). **Fiscal caveat:** production year runs Apr–Mar, so month codes 1–3 are Jan–Mar of the FOLLOWING calendar year (`83…` = Mar 2019, coded fiscal 2018). Decade must be resolved from context |
| Bock (water heaters) | First 2 digits = YY | `18033186T` = 2018 | 4 units (Jeff-verified) |
| Baldor (motors) | Letter + YYMM | `C1803160232` = Mar 2018 | 1 unit (Jeff-verified) |

## Do-NOT-decode list

| Manufacturer | Why | What to do instead |
|---|---|---|
| Hoshizaki | Letter-year chart is inconsistent in field data (`H…` = 2018 at Snellville but `S…` = 2007 at Nashville) | Say "requires Hoshizaki date-code lookup"; get chart from a Hoshizaki rep |
| Alliance alphanumeric serials | Factory-confirmed no date encoding | Alliance distributor warranty portal lookup by serial |
| Trane letter-leading serials (OA…) | Format unknown | Estimate from model era |
| Trane/Mitsubishi METUS joint-brand | Field units decoded 2 years earlier than recorded (29C…/2XE… recorded 2024, decode 2022) — either different format or stock-install lag | Flag for verification if decode conflicts with condition |
| True refrigeration | Sequential serials, no date encoding observed (`1-4810796` = 2007, `7942739` = 2014) | Estimate or dealer lookup |
| Manitowoc | Hanover survey data contained duplicated serials with conflicting years; no reliable pattern derivable | Estimate or dealer lookup |

## Pending confirmation (user's calls)

- Bradford White letter cycle — 3 data points, would like dealer confirmation
- Rheem/Ruud WWYY — 3 data points, would like dealer confirmation

## Company lifecycle standards (from completed surveys)

Used by the app for Estimated Lifecycle (source: Years Of Useful Life columns
across the 6 surveys):

- 20 yrs: RTU, DOAS, split systems, heat pumps, AHU, cooling towers, exhaust
  fans, chillers*, fire pumps/alarms, generators, transfer switches, elevators,
  commercial laundry (UniMac/Milnor class), walk-in coolers/freezers
- 15 yrs: boilers, storage tanks, pumps, water softeners, ice machines,
  reach-in refrigeration; water heaters 12–15
- 10 yrs: kitchen cooking (fryer/oven/grill/flattop/range/steamer), PTACs,
  pool equipment
- 7 yrs: fitness equipment (treadmill, elliptical, bike, strength)

*Sample Property template shows chillers at 30 yrs; field surveys use 15–20.

## Brand vocabulary / common OCR misreads

Known-correct spellings the vision prompt enforces: Daikin (not Dankin/Daiken),
Manitowoc (not Manitowac), Greenheck (not Green Heck), Raypak (not
Raypack/Raypac), Precor (not Procor), Moffat (not Moffett). Full 60-brand list
lives in the vision prompt in `docs/index.html`.

Field-observed OCR-style confusion in human data too: Bradford White serial
recorded as `2D51364230` — almost certainly `ZD…` (Z↔2 confusion), consistent
with the sibling unit `ZD51364229` (2023).
