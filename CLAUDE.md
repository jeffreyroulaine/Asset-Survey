# Asset Survey App

Mobile equipment asset survey app for hotel field work (Dimension Hospitality,
Jeff Roulaine, Corporate Director of Engineering). Photographs equipment ID
tags, extracts make/model/serial with Claude vision, decodes manufacture year
from serial numbers, looks up lifecycle and live web pricing, and exports
professional 3-tab capital projection Excel workbooks for ownership groups.

## Architecture

- **`docs/index.html`** — THE app. Single-file client-side PWA served by
  GitHub Pages at https://jeffreyroulaine.github.io/asset-survey/ from THIS
  branch (`claude/equipment-survey-app-hdM9r`, the repo's only branch).
  Pushing here deploys the live app (1–2 min rebuild).
- **`server.js` + `public/index.html`** — legacy Replit/Express version, NOT
  kept in sync; the user only uses the GitHub Pages version.
- **`SERIAL-DATE-CODES.md`** — verified serial date-code research database.
  Rules are duplicated into the `getEquipmentInfo()` prompt; update both.
- No build step, no framework. SheetJS via CDN for Excel. IndexedDB v2
  (stores: `assets`, `sessions`). API keys in localStorage.

## Key implementation facts

- Anthropic API called directly from the browser with header
  `anthropic-dangerous-direct-browser-access: true`; model `claude-sonnet-4-6`
  (const `MODEL`). User supplies their own API key via ⚙️ Settings.
- MSRP lookup uses the server-side `web_search_20250305` tool (max 3 uses);
  `callClaude()` concatenates all text blocks; `parseJSON()` tolerates prose
  around JSON but must keep nested-object support (vision confidence field).
- 3-step analysis: `analyzeTagImage()` (vision; tag photo + optional full-unit
  reference photo + optional user hint), DuckDuckGo instant answers (mostly
  vestigial), `getEquipmentInfo()` (year-of-service with serial date-code
  rules + company lifecycle standards), `getMSRPInfo()` (web-search pricing,
  obsolete/replacement detection). MSRP failures are non-fatal (`.catch(()=>null)`).
- Sessions gate surveying: assets carry `sessionId`; export is per-session;
  session audit log records saves/deletes. End-session flow prompts to export
  first (data-loss guard).
- GitHub Gist auto-backup (user's PAT, gist scope) after every save/edit/
  delete; excludes photo blobs. Restore button in Settings. Added after the
  user lost 77 assets to a Safari "Clear History and Website Data".
- Excel export: 3 styled sheets (Asset Inventory, Capital Projection, 10-Year
  Summary), navy/blue title blocks, priority color tiers, freeze panes.
  Exports via `navigator.share()` (iOS share sheet) with download fallback.
- Asset fields include: condition (Good/Fair/Poor/Non-Functional one-tap),
  msrp (editable; AI prefills), isObsolete/replacementModel/replacementMSRP,
  manualEntry flag, imageBlob + referenceBlob, sessionId/sessionName.
- Correction workflow: amber `.field-warn` highlights on low-confidence vision
  fields; "Can't Read Tag" manual entry; "Re-run AI Lookup with My
  Corrections" buttons (survey form `relookupFromFields()` and edit modal
  `relookupEditFields()`) re-run year/lifecycle/MSRP from user-typed
  make/model/serial WITHOUT overwriting them; edit modal also has full
  re-analyze from photo (`reanalyzeAsset()`).

## Conventions & cautions

- User is non-technical and works from an iPhone in the field; give
  step-by-step UI instructions, avoid jargon, never suggest clearing Safari
  data (that wipes IndexedDB).
- After editing `docs/index.html`, syntax-check the inline script:
  extract `<script>` block and run `node --check`.
- Commit + push to `claude/equipment-survey-app-hdM9r` deploys production.
- The user's past surveys live in Dropbox folder "AVR Assest Surveys" (sic);
  survey template header row is at row 8, sheet name "Assest Survey" (sic).
- Surveys known accurate (done by Jeff): Snellville Hampton Inn, Atlanta
  Marriott NW, Boca Raton Marriott. Others were done by other staff and
  contain errors (e.g. Hanover has duplicate serials with conflicting years).
