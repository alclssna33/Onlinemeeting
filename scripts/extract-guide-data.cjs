const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '../_reference_opening_guide.html'), 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) { console.error('No <script> block'); process.exit(1); }
const src = scriptMatch[1];

// Helper: eval a JS expression in a sandbox
function evalExpr(expr) {
  const ctx = vm.createContext({});
  return vm.runInContext('(' + expr + ')', ctx);
}

// Extract DOCS (double-quoted JSON object)
const docsMatch = src.match(/const DOCS=(\{[\s\S]*?\});\s*\n/);
const DOCS = docsMatch ? evalExpr(docsMatch[1]) : null;

// Extract PH (JS array, single quotes)
const phMatch = src.match(/const PH=(\[[\s\S]*?\]);\s*\nconst S=/);
const PH = phMatch ? evalExpr(phMatch[1]) : null;

// Extract S (large JSON array)
const sMatch = src.match(/const S=(\[[\s\S]*?\]);\s*\nconst KEY=/);
const S = sMatch ? evalExpr(sMatch[1]) : null;

// Extract DDAYS, DSPAN, DCOLS, PH_COLOR, PH_BG
const ddaysMatch = src.match(/const DDAYS=(\{[^;]+\});/);
const DDAYS = ddaysMatch ? evalExpr(ddaysMatch[1]) : null;

const dspanMatch = src.match(/const DSPAN=(\d+);/);
const DSPAN = dspanMatch ? parseInt(dspanMatch[1]) : 130;

const dcolsMatch = src.match(/const DCOLS=(\[[^\]]+\]);/);
const DCOLS = dcolsMatch ? evalExpr(dcolsMatch[1]) : [];

const phColorMatch = src.match(/const PH_COLOR=(\{[^}]+\});/);
const PH_COLOR = phColorMatch ? evalExpr(phColorMatch[1]) : {};

const phBgMatch = src.match(/const PH_BG=(\{[^}]+\});/);
const PH_BG = phBgMatch ? evalExpr(phBgMatch[1]) : {};

if (!PH || !S || !DOCS || !DDAYS) {
  console.error('Missing data:', { PH: !!PH, S: !!S, DOCS: !!DOCS, DDAYS: !!DDAYS });
  process.exit(1);
}

const out = `// Auto-generated from _reference_opening_guide.html
// DO NOT EDIT MANUALLY — re-run scripts/extract-guide-data.cjs to update

export interface GuideDetail {
  tx: string;
  dk?: string;
  url?: string | null;
  tp?: string;
}

export interface GuideTool {
  tx: string;
  url?: string | null;
}

export interface GuideStep {
  id: number;
  d: string;
  n: string;
  t: string;
  tip: string;
  det: GuideDetail[];
  tls: GuideTool[];
  gb: GuideTool[];
}

export interface GuidePhase {
  id: string;
  b: string;
  l: string;
  s: number[];
}

export interface GuideDoc {
  title: string;
  html: string;
}

export const PH: GuidePhase[] = ${JSON.stringify(PH, null, 2)};

export const S: GuideStep[] = ${JSON.stringify(S, null, 2)};

export const DOCS: Record<string, GuideDoc> = ${JSON.stringify(DOCS, null, 2)};

export const DDAYS: Record<string, number> = ${JSON.stringify(DDAYS, null, 2)};

export const DSPAN = ${DSPAN};

export const DCOLS: string[] = ${JSON.stringify(DCOLS)};

export const PH_COLOR: Record<string, string> = ${JSON.stringify(PH_COLOR, null, 2)};

export const PH_BG: Record<string, string> = ${JSON.stringify(PH_BG, null, 2)};
`;

const outPath = path.join(__dirname, '../lib/opening-guide-data.ts');
fs.writeFileSync(outPath, out, 'utf-8');
console.log('Generated lib/opening-guide-data.ts — ' + Math.round(out.length / 1024) + 'KB, ' + S.length + ' steps, ' + Object.keys(DOCS).length + ' docs');
