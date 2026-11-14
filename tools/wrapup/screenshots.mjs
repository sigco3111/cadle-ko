import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const DOCS = path.resolve('docs');
const OUT = path.join(DOCS, 'screenshots');
const PREFIX = '/cadle-ko/';
const PORT = 8123;
const T = 120000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel.startsWith(PREFIX)) rel = rel.slice(PREFIX.length);
    else rel = rel.replace(/^\//, '');
    let file = path.join(DOCS, rel);
    if (rel === '' || rel.endsWith('/')) file = path.join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(T);
page.setDefaultNavigationTimeout(T);

let failures = 0;

const shot = async (name) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.screenshot({ path: path.join(OUT, name), timeout: T, animations: 'disabled', caret: 'hide' });
      console.log('shot ' + name + ' (attempt ' + attempt + ')');
      return true;
    } catch (err) {
      console.log('shot failed ' + name + ' attempt ' + attempt + ' :: ' + (err && err.message ? err.message.split('\n')[0] : err));
      await sleep(2000);
    }
  }
  failures += 1;
  return false;
};

const step = async (label, fn) => {
  try {
    await fn();
  } catch (err) {
    failures += 1;
    console.log('step failed: ' + label + ' :: ' + (err && err.message ? err.message.split('\n')[0] : err));
  }
};

const clickText = async (name) => {
  await page.getByRole('button', { name, exact: true }).first().click({ timeout: T });
};

await page.goto('http://127.0.0.1:' + PORT + PREFIX + 'play/', { waitUntil: 'load', timeout: T });
await sleep(15000);

await step('title', () => shot('01-title.png'));

await step('regions', async () => {
  await clickText('골짜기');
  await sleep(4000);
  await shot('02-regions.png');
});

await step('controls', async () => {
  await clickText('조작');
  await sleep(4000);
  await shot('03-controls.png');
});

await step('settings', async () => {
  await clickText('설정');
  await sleep(4000);
  await shot('04-settings.png');
});

await step('credits', async () => {
  await clickText('크레딧');
  await sleep(4000);
  await shot('05-credits.png');
});

await step('korean-credit-panel', async () => {
  await page.locator('#cadle-ko-bar button', { hasText: '크레딧' }).first().click({ timeout: T });
  await sleep(2000);
  await shot('06-credit-panel.png');
});

await step('english-toggle', async () => {
  await clickText('English');
  await sleep(5000);
  await shot('07-english.png');
  await clickText('한국어');
  await sleep(3000);
});

await step('ingame', async () => {
  await clickText('플레이');
  await sleep(45000);
  await shot('08-ingame.png');
});

await step('landing', async () => {
  await page.goto('http://127.0.0.1:' + PORT + PREFIX, { waitUntil: 'load', timeout: T });
  await sleep(8000);
  await shot('09-landing.png');
});

await browser.close();
server.close();
console.log('screenshots done, failures=' + failures);
