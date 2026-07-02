const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { decode } = require('./decoder/serialDecoder');

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

    // Deterministic serial→manufacture-date decode (same vetted rules as the
    // PWA and decoder/). Overrides the AI year guess when confident.
    const decoded = decode(extracted.make, extracted.serialNumber, extracted.modelNumber);
    if (decoded.year && (decoded.confidence === 'high' || decoded.confidence === 'medium')) {
      equipmentInfo.yearOfService = `${decoded.year} (from serial)`;
    }

    res.json({
      ...extracted,
      ...equipmentInfo,
      serialDecode: {
        year: decoded.year, confidence: decoded.confidence, method: decoded.decoderMethod,
        note: decoded.note, brand: decoded.canonical, category: decoded.category
      },
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

// Export to Excel — Styled Capital Projection
app.get('/api/export', (req, res) => {
  const assets = loadAssets();
  const propName    = req.query.property || 'Equipment Asset Survey';
  const dateStr     = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const currentYear = new Date().getFullYear();

  function parseYear(s) { const m=String(s||'').match(/\b(19|20)\d{2}\b/); return m?+m[0]:null; }
  function parseLC(s)   { const n=String(s||'').match(/\d+/g); return n?(n.length>=2?Math.round((+n[0]+ +n[1])/2):+n[0]):null; }
  function parseCost(s) { const n=parseFloat(String(s||'').replace(/[$,\s]/g,'')); return isNaN(n)?null:n; }
  function getPriority(rem) { if(rem===null)return'Unknown'; if(rem<=0)return'REPLACE NOW'; if(rem<=2)return'CRITICAL'; if(rem<=5)return'HIGH'; if(rem<=10)return'MEDIUM'; return'LOW'; }
  function calcProj(a) { const yi=parseYear(a.yearOfService),lc=parseLC(a.estimatedLifecycle),age=yi?currentYear-yi:null,rem=(age!==null&&lc!==null)?lc-age:null; return{age,remLife:rem,replYear:yi&&lc?yi+lc:null,priority:getPriority(rem)}; }

  const NAVY='0F4C75',BLUE='1B6CA8',WHITE='FFFFFF',LIGHT='EBF5FB',ALT='F5F8FA',TBLU='DBEAFE';
  const S={
    titleLeft:{font:{bold:true,sz:15,color:{rgb:WHITE},name:'Calibri'},fill:{fgColor:{rgb:NAVY},patternType:'solid'},alignment:{horizontal:'left',vertical:'center',indent:1}},
    titleRight:{font:{bold:false,sz:10,color:{rgb:'80C4E9'},name:'Calibri'},fill:{fgColor:{rgb:NAVY},patternType:'solid'},alignment:{horizontal:'right',vertical:'center',indent:1}},
    sub:{font:{sz:9,italic:true,color:{rgb:'4A6080'},name:'Calibri'},fill:{fgColor:{rgb:LIGHT},patternType:'solid'},alignment:{horizontal:'left',vertical:'center',indent:1}},
    header:{font:{bold:true,sz:9,color:{rgb:WHITE},name:'Calibri'},fill:{fgColor:{rgb:BLUE},patternType:'solid'},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:{bottom:{style:'medium',color:{rgb:NAVY}}}},
    even:{font:{sz:10,name:'Calibri'},fill:{fgColor:{rgb:ALT},patternType:'solid'},alignment:{vertical:'center'}},
    odd:{font:{sz:10,name:'Calibri'},fill:{fgColor:{rgb:WHITE},patternType:'solid'},alignment:{vertical:'center'}},
    total:{font:{bold:true,sz:10,color:{rgb:NAVY},name:'Calibri'},fill:{fgColor:{rgb:TBLU},patternType:'solid'},alignment:{vertical:'center'},border:{top:{style:'medium',color:{rgb:BLUE}}}},
    center:(b)=>({...b,alignment:{...b.alignment,horizontal:'center',vertical:'center'}}),
    right:(b)=>({...b,alignment:{...b.alignment,horizontal:'right',vertical:'center'}}),
  };
  const PS={
    'REPLACE NOW':{font:{bold:true,sz:10,color:{rgb:'C62828'},name:'Calibri'},fill:{fgColor:{rgb:'FFCDD2'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'}},
    'CRITICAL':{font:{bold:true,sz:10,color:{rgb:'C62828'},name:'Calibri'},fill:{fgColor:{rgb:'FFEBEE'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'}},
    'HIGH':{font:{bold:true,sz:10,color:{rgb:'E65100'},name:'Calibri'},fill:{fgColor:{rgb:'FFF3E0'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'}},
    'MEDIUM':{font:{bold:true,sz:10,color:{rgb:'B07D00'},name:'Calibri'},fill:{fgColor:{rgb:'FFFDE7'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'}},
    'LOW':{font:{sz:10,color:{rgb:'2E7D32'},name:'Calibri'},fill:{fgColor:{rgb:'E8F5E9'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'}},
    'Unknown':{font:{sz:10,color:{rgb:'607080'},name:'Calibri'},fill:{fgColor:{rgb:'F5F5F5'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'}},
  };
  function sc(ws,r,c,style){const ref=XLSX.utils.encode_cell({r,c});if(!ws[ref])ws[ref]={v:'',t:'s'};ws[ref].s=style;}
  function sr(ws,r,n,style){for(let c=0;c<n;c++)sc(ws,r,c,style);}
  function setCur(ws,r,c,base){const ref=XLSX.utils.encode_cell({r,c});if(ws[ref]){ws[ref].s=S.right(base);ws[ref].z='$#,##0';}}
  function setNum(ws,r,c,base){sc(ws,r,c,S.center(base));}
  function titleBlock(ws,title,subtitle,n){
    for(let c=0;c<n;c++){sc(ws,0,c,c<n-1?S.titleLeft:S.titleRight);sc(ws,1,c,S.sub);}
    ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:n-2}},{s:{r:1,c:0},e:{r:1,c:n-1}}];
    if(!ws['!rows'])ws['!rows']=[];
    ws['!rows'][0]={hpt:32};ws['!rows'][1]={hpt:18};ws['!rows'][2]={hpt:6};ws['!rows'][3]={hpt:36};
  }

  const wb = XLSX.utils.book_new();
  const projYears = Array.from({length:11},(_,i)=>currentYear+i);
  const knownCost = assets.reduce((s,a)=>s+(parseCost(a.replacementCost)||0),0);

  // ── Sheet 1: Asset Inventory ─────────────────────────────────
  const invCols=[{h:'#',w:4},{h:'Survey Date',w:12},{h:'Equipment Type',w:20},{h:'Make',w:14},{h:'Model Number',w:18},{h:'Serial Number',w:18},{h:'Location',w:22},{h:'Year of\nService',w:10},{h:'Est.\nLifecycle',w:12},{h:'Age\n(yrs)',w:8},{h:'Remaining\nLife',w:12},{h:'Replace\nYear',w:10},{h:'Priority',w:14},{h:'Est. Replacement\nCost',w:18},{h:'Notes',w:32},{h:'Photo',w:7}];
  const inv1=[
    [propName+'  —  Capital Expenditure Asset Inventory',...Array(invCols.length-2).fill(''),`${assets.length} Assets`],
    [`Generated: ${dateStr}   |   Known Replacement Cost Total: ${knownCost>0?'$'+knownCost.toLocaleString():'TBD'}`,...Array(invCols.length-1).fill('')],
    Array(invCols.length).fill(''),
    invCols.map(c=>c.h),
    ...assets.map((a,i)=>{const{age,remLife,replYear,priority}=calcProj(a);const cost=parseCost(a.replacementCost);return[i+1,new Date(a.timestamp).toLocaleDateString('en-US'),a.equipmentType||'',a.make||'',a.modelNumber||'',a.serialNumber||'',a.location||'',a.yearOfService||'',a.estimatedLifecycle||'',age??'',remLife??'',replYear||'',priority,cost!==null?cost:(a.replacementCost||''),a.notes||'',a.imagePath?'Yes':''];}),
    ['','TOTALS',`${assets.length} assets`,'','','','','','','','','','',knownCost>0?knownCost:'','','']
  ];
  const ws1=XLSX.utils.aoa_to_sheet(inv1);
  ws1['!cols']=invCols.map(c=>({wch:c.w}));
  titleBlock(ws1,inv1[0][0],inv1[1][0],invCols.length);
  invCols.forEach((_,c)=>sc(ws1,3,c,S.header));
  assets.forEach((a,i)=>{const r=i+4;const base=i%2===0?S.even:S.odd;const{priority}=calcProj(a);invCols.forEach((_,c)=>{if(c===12)sc(ws1,r,c,PS[priority]||PS['Unknown']);else if(c===13)setCur(ws1,r,c,base);else if([9,10,11].includes(c))setNum(ws1,r,c,base);else sc(ws1,r,c,base);});if(!ws1['!rows'])ws1['!rows']=[];ws1['!rows'][r]={hpt:20};});
  const invTR=assets.length+4;invCols.forEach((_,c)=>{if(c===13)setCur(ws1,invTR,c,S.total);else sc(ws1,invTR,c,S.total);});
  ws1['!freeze']={xSplit:0,ySplit:4};
  XLSX.utils.book_append_sheet(wb, ws1, 'Asset Inventory');

  // ── Sheet 2: Capital Projection ──────────────────────────────
  const projItems=assets.map(a=>({a,...calcProj(a),cost:parseCost(a.replacementCost)})).filter(x=>x.replYear!==null).sort((a,b)=>a.replYear-b.replYear);
  const projTotal=projItems.reduce((s,x)=>s+(x.cost||0),0);
  const projCols=[{h:'Replace\nYear',w:10},{h:'Priority',w:14},{h:'Equipment Type',w:20},{h:'Make',w:14},{h:'Model Number',w:18},{h:'Serial Number',w:18},{h:'Location',w:22},{h:'Year of\nService',w:10},{h:'Age at\nReplace',w:10},{h:'Est. Replacement\nCost',w:18},{h:'Notes',w:32}];
  const proj1=[
    [propName+'  —  Capital Expenditure Projection',...Array(projCols.length-2).fill(''),`${projItems.length} Items`],
    [`Generated: ${dateStr}   |   Sorted: Earliest Replacement First   |   Total Known Cost: ${projTotal>0?'$'+projTotal.toLocaleString():'TBD'}`,...Array(projCols.length-1).fill('')],
    Array(projCols.length).fill(''),
    projCols.map(c=>c.h),
    ...(projItems.length?projItems.map(({a,age,replYear,priority,cost})=>[replYear,priority,a.equipmentType||'',a.make||'',a.modelNumber||'',a.serialNumber||'',a.location||'',a.yearOfService||'',age!==null?age+(replYear-currentYear):'',cost!==null?cost:(a.replacementCost||''),a.notes||'']):[[,'','Add Year of Service & Lifecycle to assets to generate projections','','','','','','','','']]),
    ['GRAND TOTAL','',`${projItems.length} items scheduled`,'','','','','','',projTotal>0?projTotal:'','']
  ];
  const ws2=XLSX.utils.aoa_to_sheet(proj1);
  ws2['!cols']=projCols.map(c=>({wch:c.w}));
  titleBlock(ws2,proj1[0][0],proj1[1][0],projCols.length);
  projCols.forEach((_,c)=>sc(ws2,3,c,S.header));
  projItems.forEach(({priority},i)=>{const r=i+4;const base=i%2===0?S.even:S.odd;projCols.forEach((_,c)=>{if(c===1)sc(ws2,r,c,PS[priority]||PS['Unknown']);else if(c===9)setCur(ws2,r,c,base);else if([0,8].includes(c))setNum(ws2,r,c,base);else sc(ws2,r,c,base);});if(!ws2['!rows'])ws2['!rows']=[];ws2['!rows'][r]={hpt:20};});
  const projTR=projItems.length+4;projCols.forEach((_,c)=>{if(c===9)setCur(ws2,projTR,c,S.total);else sc(ws2,projTR,c,S.total);});
  ws2['!freeze']={xSplit:0,ySplit:4};
  XLSX.utils.book_append_sheet(wb, ws2, 'Capital Projection');

  // ── Sheet 3: 10-Year Budget Summary ──────────────────────────
  const grandTotal=projYears.reduce((s,yr)=>s+assets.filter(a=>calcProj(a).replYear===yr).reduce((s2,a)=>s2+(parseCost(a.replacementCost)||0),0),0);
  const sumCols=[{h:'Year',w:8},{h:'Items\nDue',w:8},{h:'Equipment Due for Replacement',w:52},{h:'Est. Total\nCost',w:16},{h:'Notes',w:18}];
  const sumRows=projYears.map(yr=>{const items=assets.filter(a=>calcProj(a).replYear===yr);const cost=items.reduce((s,a)=>s+(parseCost(a.replacementCost)||0),0);const hasUnknown=items.some(a=>!parseCost(a.replacementCost));return{count:items.length,row:[yr,items.length||'',items.map(a=>[a.equipmentType,a.make,a.modelNumber].filter(Boolean).join(' – ')).join('; ')||'—',cost>0?cost:null,hasUnknown&&cost===0?'Costs TBD':hasUnknown?'+ some TBD':'']};});
  const sum1=[
    [propName+`  —  ${currentYear}–${currentYear+10} Capital Budget Summary`,...Array(sumCols.length-2).fill(''),`Total: ${grandTotal>0?'$'+grandTotal.toLocaleString():'TBD'}`],
    [`Generated: ${dateStr}   |   ${currentYear}–${currentYear+10} 10-Year Planning Horizon`,...Array(sumCols.length-1).fill('')],
    Array(sumCols.length).fill(''),
    sumCols.map(c=>c.h),
    ...sumRows.map(x=>x.row),
    ['TOTAL',sumRows.reduce((s,x)=>s+x.count,0),`${assets.length} assets surveyed`,grandTotal>0?grandTotal:'','']
  ];
  const ws3=XLSX.utils.aoa_to_sheet(sum1);
  ws3['!cols']=sumCols.map(c=>({wch:c.w}));
  titleBlock(ws3,sum1[0][0],sum1[1][0],sumCols.length);
  sumCols.forEach((_,c)=>sc(ws3,3,c,S.header));
  sumRows.forEach((x,i)=>{const r=i+4;const base=x.count>0?{font:{bold:true,sz:10,name:'Calibri'},fill:{fgColor:{rgb:LIGHT},patternType:'solid'},alignment:{vertical:'center'}}:(i%2===0?S.even:S.odd);x.row.forEach((_,c)=>{if(c===3)setCur(ws3,r,c,base);else if([0,1].includes(c))setNum(ws3,r,c,base);else sc(ws3,r,c,base);});if(!ws3['!rows'])ws3['!rows']=[];ws3['!rows'][r]={hpt:x.count>0?22:18};});
  const sumTR=sumRows.length+4;sumCols.forEach((_,c)=>{if(c===3)setCur(ws3,sumTR,c,S.total);else if(c===1)sc(ws3,sumTR,c,S.center(S.total));else sc(ws3,sumTR,c,S.total);});
  ws3['!freeze']={xSplit:0,ySplit:4};
  XLSX.utils.book_append_sheet(wb, ws3, `${currentYear}–${currentYear+10} Summary`);

  const fileDateStr = new Date().toISOString().slice(0, 10);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="capital-projection-${fileDateStr}.xlsx"`);
  res.send(buffer);
});

app.listen(PORT, () => {
  console.log(`Asset Survey running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY environment variable not set');
  }
});
