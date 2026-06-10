import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'TopicNet Prototype (standalone).html');
const outDir = path.join(root, 'extracted_prototype');

const html = fs.readFileSync(src, 'utf8');
const manifestMatch = html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/);
const templateMatch = html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/);
if (!manifestMatch || !templateMatch) {
  throw new Error('Missing bundler script tags');
}

const manifest = JSON.parse(manifestMatch[1]);
let template = JSON.parse(templateMatch[1]);

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const uuids = Object.keys(manifest);
console.log(`Found ${uuids.length} assets`);

const extByMime = (m) => {
  if (m.includes('javascript') || m.includes('jsx')) return 'js';
  if (m.includes('json')) return 'json';
  if (m.includes('html')) return 'html';
  if (m.includes('css')) return 'css';
  if (m.includes('woff2')) return 'woff2';
  if (m.includes('woff')) return 'woff';
  if (m.includes('svg')) return 'svg';
  if (m.includes('png')) return 'png';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('gif')) return 'gif';
  return 'bin';
};

const replacements = {};
for (const uuid of uuids) {
  const entry = manifest[uuid];
  let bytes = Buffer.from(entry.data, 'base64');
  if (entry.compressed) bytes = zlib.gunzipSync(bytes);
  const fname = `${uuid}.${extByMime(entry.mime)}`;
  fs.writeFileSync(path.join(outDir, fname), bytes);
  replacements[uuid] = fname;
  console.log(`${uuid} -> ${fname} (${entry.mime}, ${bytes.length} bytes)`);
}

for (const uuid of uuids) template = template.split(uuid).join(replacements[uuid]);
fs.writeFileSync(path.join(outDir, 'index.html'), template);
console.log('Wrote index.html');
