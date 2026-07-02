/**
 * generateVendorChecklist.js — a call-the-vendor verification worksheet.
 * One row per brand, ordered by method, with the contact info we found and
 * BLANK columns to fill in while verifying each manufacturer's date method.
 * Outputs docs/Vendor-Verification-Checklist.xlsx (+ .csv).
 * Usage: node decoder/generateVendorChecklist.js
 */
const fs = require('fs');
const path = require('path');
const { BRANDS, METHODS } = require('./brands');

// Verification contacts gathered during research (phone/email/portal). Blank = use website/tech support.
const CONTACTS = {
  'Alliance / Unimac': 'Alliance Laundry tech support / homespy.io lookup',
  'Bradford White': 'Bradford White FAQ date-code chart (bradfordwhite.com)',
  'Niles Steel Tank': 'Bradford White (parent) tech support',
  'Lochinvar': 'Lochinvar Technical Service 800-722-2101',
  'Pellerin Milnor': 'Milnor parts dept 504-712-7775',
  'American Dryer (ADC)': 'ADC tech support 508-678-9000 / techsupport@amdry.com',
  'G.A. Braun': 'Braun parts 800-432-7286',
  'Forenta': 'Forenta 423-586-5370 / forenta@forentausa.com',
  'Energenics': 'Energenics 800-944-1711',
  'Cummins / Onan': 'Cummins/Onan Customer Response 800-888-6626 / 800-286-6467',
  'Kohler (generators)': 'Kohler Power — provide Model+Spec+Serial (assist.kohler.com)',
  'Generac': 'Generac Customer Support (support.generac.com)',
  'Caterpillar': 'Cat dealer / Cat SIS (parts.cat.com) with full PIN',
  'ASCO': 'ASCO Power Services 800-800-2726',
  'Zenith': 'ABB/GE Zenith service (serial + catalog #)',
  'Potter': 'Potter 800-325-3936 / sales@pottersignal.com',
  'Simplex (JCI)': 'Johnson Controls / SimplexGrinnell service',
  'Notifier (Honeywell)': 'Honeywell / Notifier tech support',
  'Silent Knight (Honeywell)': 'Honeywell / Silent Knight tech support',
  'BAC (Baltimore Aircoil)': 'Local BAC rep / myBAC registration (build records by serial)',
  'Evapco': 'Evapco factory / Replacement Parts Quote (serial lookup)',
  'Marley / SPX Cooling': 'SPX Cooling customer service (serial lookup)',
  'Taco': 'Taco tech support (or read motor date stamp)',
  'Aurora / PACO (Pentair)': 'Pentair support 800-831-7133',
  'Bell & Gossett (Xylem)': 'Xylem / B&G tech support (model date-code chart)',
  'Grundfos': 'Grundfos support — PC (YYWW) field on nameplate',
  'Armstrong Fluid Technology': 'Armstrong online serial/parts lookup',
  'Baldor (ABB)': 'ABB/Baldor support (BEC-330 date-code chart for legacy)',
  'Marathon Motors (Regal)': 'Regal/Marathon — Date Code Chart Form 4638E',
  'Bryan Boilers': 'Bryan Steam (Peru, IN) — serial+model; or National Board # lookup',
  'Fulton': 'Fulton factory / National Board # registration',
  'Patterson-Kelley': 'P-K technical service / National Board # / rating plate',
  'Otis': 'Otis service records (100+ yr) by contract/serial; or inspection cert',
  'KONE / Montgomery': 'KONE service records by equipment ID; or inspection cert',
  'ThyssenKrupp / TK Elevator': 'TK Elevator service records; or inspection cert',
  'Schindler': 'Schindler service records; or inspection cert',
  'Mitsubishi Electric': 'Mitsubishi Electric Technical Support (confirm decade from full serial)',
};

const rows = [];
for (const m of Object.keys(METHODS)) {
  for (const b of BRANDS.filter((x) => x.method === Number(m))) {
    const f = (b.formats || [])[0] || {};
    rows.push([
      b.brand, b.category, `M${b.method} — ${METHODS[b.method]}`,
      f.rule || '', f.example || '', f.confidence || '',
      CONTACTS[b.brand] || (b.sources && b.sources[0]) || 'manufacturer tech support',
      '', '', '', '', // Vendor confirms? | Vendor's actual method | Verified by | Date
    ]);
  }
}

const HDR = ['Brand', 'Category', 'Method (our assumption)', 'Our decode rule', 'Worked example',
  'Confidence', 'Who to call / reference', 'Vendor confirms? (Y/N)', "Vendor's actual method (if different)",
  'Verified by', 'Date verified'];

// CSV
const OUT = path.join(__dirname, '..', 'docs');
const cell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
fs.writeFileSync(path.join(OUT, 'Vendor-Verification-Checklist.csv'),
  [HDR.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n'));

// XLSX
try {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([HDR, ...rows]);
  ws['!cols'] = [{ wch: 26 }, { wch: 20 }, { wch: 30 }, { wch: 50 }, { wch: 26 }, { wch: 11 },
    { wch: 46 }, { wch: 16 }, { wch: 34 }, { wch: 14 }, { wch: 13 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, 'Vendor Verification');
  XLSX.writeFile(wb, path.join(OUT, 'Vendor-Verification-Checklist.xlsx'));
  console.log('Wrote docs/Vendor-Verification-Checklist.xlsx (+ .csv) —', rows.length, 'brands');
} catch (e) {
  console.log('Wrote docs/Vendor-Verification-Checklist.csv —', rows.length, 'brands (xlsx skipped:', e.message + ')');
}
