const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Ensure directories exist
['./uploads', './data'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const DATA_FILE = './data/assets.json';

function loadAssets() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveAssets(assets) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(assets, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Analyze image with Claude vision
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });

  try {
    const imageBuffer = fs.readFileSync(req.file.path);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    // Step 1: Extract tag data with Claude vision
    const visionResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64Image }
          },
          {
            type: 'text',
            text: `You are analyzing an equipment identification tag or nameplate photo taken in the field.

Extract the following fields from the tag:
- make: The manufacturer or brand name
- modelNumber: The model number or model name
- serialNumber: The serial number
- equipmentType: What type of equipment this appears to be (e.g., "HVAC unit", "boiler", "pump", "chiller", "air handler", "fitness equipment", etc.)

Return ONLY valid JSON with exactly these keys. Use empty string "" if a field is not visible or legible.

Example: {"make":"Carrier","modelNumber":"50XC-060","serialNumber":"2319G12345","equipmentType":"rooftop HVAC unit"}`
          }
        ]
      }]
    });

    let extracted = { make: '', modelNumber: '', serialNumber: '', equipmentType: '' };
    const visionText = visionResponse.content[0].text.trim();
    try {
      const jsonMatch = visionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) extracted = { ...extracted, ...JSON.parse(jsonMatch[0]) };
    } catch (e) {
      console.error('JSON parse error from vision:', e.message);
    }

    // Step 2: Search DuckDuckGo for equipment info
    let searchContext = '';
    const searchQuery = [extracted.make, extracted.modelNumber, extracted.equipmentType, 'specifications year lifespan']
      .filter(Boolean).join(' ');

    try {
      const ddgResponse = await axios.get('https://api.duckduckgo.com/', {
        params: { q: searchQuery, format: 'json', no_html: 1, skip_disambig: 1 },
        timeout: 6000,
        headers: { 'User-Agent': 'AssetSurveyApp/1.0' }
      });
      const d = ddgResponse.data;
      const parts = [d.AbstractText, d.Answer, ...(d.RelatedTopics || []).slice(0, 3).map(t => t.Text)].filter(Boolean);
      searchContext = parts.join(' ').slice(0, 1500);
    } catch (e) {
      console.log('DDG search skipped:', e.message);
    }

    // Step 3: Use Claude to determine year of service and lifecycle
    const contextNote = searchContext
      ? `Web search results: ${searchContext}`
      : `No web search results available — use your training knowledge about this equipment type.`;

    const infoResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Equipment details:
Make: ${extracted.make || 'Unknown'}
Model: ${extracted.modelNumber || 'Unknown'}
Type: ${extracted.equipmentType || 'Unknown'}

${contextNote}

Based on this information, provide:
- yearOfService: The approximate year this model was introduced or the typical service start year (e.g., "2018" or "2015-2020 range")
- estimatedLifecycle: The typical operational lifespan for this equipment type (e.g., "15-20 years" or "20-25 years")

Return ONLY valid JSON: {"yearOfService":"","estimatedLifecycle":""}
Make a reasonable estimate even if data is limited — never leave fields empty.`
      }]
    });

    let equipmentInfo = { yearOfService: '', estimatedLifecycle: '' };
    const infoText = infoResponse.content[0].text.trim();
    try {
      const jsonMatch = infoText.match(/\{[\s\S]*\}/);
      if (jsonMatch) equipmentInfo = { ...equipmentInfo, ...JSON.parse(jsonMatch[0]) };
    } catch (e) {
      console.error('JSON parse error from info:', e.message);
    }

    res.json({
      ...extracted,
      ...equipmentInfo,
      imagePath: req.file.filename
    });

  } catch (error) {
    console.error('Analyze error:', error);
    // Clean up file on error
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: error.message || 'Analysis failed' });
  }
});

// Get all assets
app.get('/api/assets', (req, res) => {
  res.json(loadAssets());
});

// Save new asset
app.post('/api/assets', (req, res) => {
  const assets = loadAssets();
  const asset = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    make: '',
    modelNumber: '',
    serialNumber: '',
    equipmentType: '',
    yearOfService: '',
    estimatedLifecycle: '',
    location: '',
    notes: '',
    imagePath: '',
    ...req.body
  };
  assets.unshift(asset); // newest first
  saveAssets(assets);
  res.json(asset);
});

// Update asset
app.put('/api/assets/:id', (req, res) => {
  const assets = loadAssets();
  const idx = assets.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Asset not found' });
  assets[idx] = { ...assets[idx], ...req.body, id: req.params.id };
  saveAssets(assets);
  res.json(assets[idx]);
});

// Delete asset
app.delete('/api/assets/:id', (req, res) => {
  const assets = loadAssets();
  const asset = assets.find(a => a.id === req.params.id);
  if (asset?.imagePath) {
    const imgPath = path.join('./uploads', asset.imagePath);
    if (fs.existsSync(imgPath)) fs.unlink(imgPath, () => {});
  }
  saveAssets(assets.filter(a => a.id !== req.params.id));
  res.json({ success: true });
});

// Export to Excel — Capital Projection
app.get('/api/export', (req, res) => {
  const assets = loadAssets();
  const currentYear = new Date().getFullYear();

  function parseYear(s) {
    if (!s) return null;
    const m = String(s).match(/\b(19|20)\d{2}\b/);
    return m ? parseInt(m[0]) : null;
  }
  function parseLifecycleYears(s) {
    if (!s) return null;
    const nums = String(s).match(/\d+/g);
    if (!nums) return null;
    return nums.length >= 2 ? Math.round((+nums[0] + +nums[1]) / 2) : +nums[0];
  }
  function parseCost(s) {
    if (!s) return null;
    const n = parseFloat(String(s).replace(/[$,\s]/g, ''));
    return isNaN(n) ? null : n;
  }
  function getPriority(rem) {
    if (rem === null) return 'Unknown';
    if (rem <= 0)  return 'REPLACE NOW';
    if (rem <= 2)  return 'CRITICAL';
    if (rem <= 5)  return 'HIGH';
    if (rem <= 10) return 'MEDIUM';
    return 'LOW';
  }
  function calcProj(a) {
    const yearIn    = parseYear(a.yearOfService);
    const lifecycle = parseLifecycleYears(a.estimatedLifecycle);
    const age       = yearIn ? currentYear - yearIn : null;
    const remLife   = (age !== null && lifecycle !== null) ? lifecycle - age : null;
    const replYear  = yearIn && lifecycle ? yearIn + lifecycle : null;
    return { age, remLife, replYear, priority: getPriority(remLife) };
  }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Asset Inventory ──
  const inventoryRows = assets.map((a, i) => {
    const { age, remLife, replYear, priority } = calcProj(a);
    const cost = parseCost(a.replacementCost);
    return {
      '#':                    i + 1,
      'Survey Date':          new Date(a.timestamp).toLocaleDateString('en-US'),
      'Equipment Type':       a.equipmentType || '',
      'Make':                 a.make || '',
      'Model Number':         a.modelNumber || '',
      'Serial Number':        a.serialNumber || '',
      'Location':             a.location || '',
      'Year of Service':      a.yearOfService || '',
      'Est. Lifecycle':       a.estimatedLifecycle || '',
      'Age (yrs)':            age !== null ? age : '',
      'Remaining Life (yrs)': remLife !== null ? remLife : '',
      'Replace By Year':      replYear || '',
      'Priority':             priority,
      'Est. Replacement Cost': cost !== null ? cost : (a.replacementCost || ''),
      'Notes':                a.notes || '',
      'Photo Filename':       a.imagePath || ''
    };
  });
  const ws1 = XLSX.utils.json_to_sheet(inventoryRows);
  ws1['!cols'] = [
    {wch:4},{wch:12},{wch:20},{wch:16},{wch:20},{wch:20},{wch:22},
    {wch:14},{wch:16},{wch:10},{wch:18},{wch:14},{wch:14},{wch:22},{wch:32},{wch:24}
  ];
  for (let r = 2; r <= inventoryRows.length + 1; r++) {
    const cell = ws1[`N${r}`];
    if (cell && typeof cell.v === 'number') cell.z = '$#,##0';
  }
  XLSX.utils.book_append_sheet(wb, ws1, 'Asset Inventory');

  // ── Sheet 2: Capital Projection (sorted by replace year) ──
  const projRows = assets
    .map(a => ({ a, ...calcProj(a), cost: parseCost(a.replacementCost) }))
    .filter(x => x.replYear !== null)
    .sort((x, y) => x.replYear - y.replYear)
    .map(({ a, age, replYear, priority, cost }) => ({
      'Replace Year':          replYear,
      'Priority':              priority,
      'Equipment Type':        a.equipmentType || '',
      'Make':                  a.make || '',
      'Model Number':          a.modelNumber || '',
      'Serial Number':         a.serialNumber || '',
      'Location':              a.location || '',
      'Year of Service':       a.yearOfService || '',
      'Age at Replacement':    age !== null ? age + (replYear - currentYear) : '',
      'Est. Replacement Cost': cost !== null ? cost : (a.replacementCost || ''),
      'Notes':                 a.notes || ''
    }));
  const ws2 = XLSX.utils.json_to_sheet(
    projRows.length ? projRows
      : [{ 'Note': 'Add Year of Service and Lifecycle to assets to generate projections' }]
  );
  ws2['!cols'] = [
    {wch:12},{wch:14},{wch:20},{wch:16},{wch:20},{wch:20},{wch:22},{wch:14},{wch:18},{wch:22},{wch:32}
  ];
  if (projRows.length) {
    for (let r = 2; r <= projRows.length + 1; r++) {
      const cell = ws2[`J${r}`];
      if (cell && typeof cell.v === 'number') cell.z = '$#,##0';
    }
  }
  XLSX.utils.book_append_sheet(wb, ws2, 'Capital Projection');

  // ── Sheet 3: 10-Year Summary ──
  const projYears = Array.from({ length: 11 }, (_, i) => currentYear + i);
  const summaryRows = projYears.map(yr => {
    const items = assets.filter(a => calcProj(a).replYear === yr);
    const totalCost = items.reduce((sum, a) => sum + (parseCost(a.replacementCost) || 0), 0);
    return {
      'Year':            yr,
      '# Items Due':     items.length,
      'Equipment Due':   items.map(a => [a.make, a.modelNumber].filter(Boolean).join(' ') || a.equipmentType || 'Unknown').join(', ') || '—',
      'Est. Total Cost': totalCost > 0 ? totalCost : (items.length ? 'Cost TBD' : '—')
    };
  });
  const ws3 = XLSX.utils.json_to_sheet(summaryRows);
  ws3['!cols'] = [{wch:8},{wch:12},{wch:55},{wch:18}];
  for (let r = 2; r <= summaryRows.length + 1; r++) {
    const cell = ws3[`D${r}`];
    if (cell && typeof cell.v === 'number') cell.z = '$#,##0';
  }
  XLSX.utils.book_append_sheet(wb, ws3, `${currentYear}–${currentYear+10} Summary`);

  const dateStr = new Date().toISOString().slice(0, 10);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="capital-projection-${dateStr}.xlsx"`);
  res.send(buffer);
});

app.listen(PORT, () => {
  console.log(`Asset Survey running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY environment variable not set');
  }
});
