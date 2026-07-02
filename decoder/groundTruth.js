/**
 * Ground-truth serial→manufacture-date pairs pulled from real property surveys.
 * Source: "Asset Survey_Nashville HWS_2024.xlsx" (Nashville Homewood Suites).
 * `recordedYear` is the Manufacture Date the surveyor entered by hand.
 */
module.exports = [
  { brand: 'Trane',          model: 'OANE420A3-C1B300LN', serial: '0A250312-1-1', recordedYear: 2016, equip: 'DOAS Unit' },
  { brand: 'AAON',           model: 'NLV120TL30ACBNNA3SGB', serial: '160901518',  recordedYear: 2016, equip: 'DOAS Unit' },
  { brand: 'BAC',            model: 'FXT-320',            serial: 'U070816201',   recordedYear: 1992, equip: 'Cooling Tower' },
  { brand: 'BRYAN',          model: 'CL-300W-GI',         serial: '62845',        recordedYear: 1986, equip: 'Boiler' },
  { brand: 'Canariis Corp',  model: 'DE-200-45',          serial: '8136218643',   recordedYear: 2007, equip: 'Domestic Booster Pump' },
  { brand: 'Lochinvar',      model: 'RJS120M000',         serial: '2.14313E+12',  recordedYear: 2021, equip: 'Domestic Storage Tank' },
  { brand: 'Bradford White', model: 'M3ST120R5',          serial: 'SC41065129',   recordedYear: 2018, equip: 'Domestic Storage Tank' },
  { brand: 'Bradford White', model: 'M3ST120R5',          serial: 'ZD51364229',   recordedYear: 2023, equip: 'Domestic Storage Tank' },
  { brand: 'Bradford White', model: 'M3ST120R5',          serial: '2D51364230',   recordedYear: 2023, equip: 'Domestic Storage Tank (likely mistyped ZD)' },
  { brand: 'Unimac',         model: '360211v52',          serial: '151134416',    recordedYear: 2015, equip: 'Commercial Washer' },
  { brand: 'Unimac',         model: '30022VRJ',           serial: '232163542',    recordedYear: 2023, equip: 'Commercial Washer' },
  { brand: 'Unimac',         model: '30022VRJ',           serial: '171381547',    recordedYear: 2017, equip: 'Commercial Washer' },
  { brand: 'Unimac',         model: 'UTF75NRUF6A2W04',    serial: '1410047154',   recordedYear: 2014, equip: 'Commercial Dryer' },
  { brand: 'Unimac',         model: 'UT75NRUF6A2W04',     serial: '1410049638',   recordedYear: 2014, equip: 'Commercial Dryer' },
  { brand: 'Unimac',         model: 'UTF75NRUF6A2W04',    serial: '1410049637',   recordedYear: 2014, equip: 'Commercial Dryer' },
  // Alliance/IPSO (Czech-built) — Boca Raton Marriott; manufacturer-validated via Alliance warranty-portal ship dates.
  { brand: 'Alliance',       model: 'SYN090DNHNU1P01',    serial: '40F002829FH',  recordedYear: 2016, equip: '100 lb Washer-Extractor (Alliance ship 5/26/2016)' },
  { brand: 'Alliance',       model: 'SYN070DNHNU1P01',    serial: '280FX001342FY', recordedYear: 2016, equip: '70 lb Washer-Extractor (Alliance ship 12/21/2016)' },
  { brand: 'Alliance',       model: 'UYN090I0NN4U2PR0BJ', serial: '40F003349MK',  recordedYear: 2019, equip: '90 lb Washer-Extractor (Alliance ship 7/1/2019)' },
];
