import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const DOCS = path.resolve('docs');
const OUT = path.join(DOCS, 'screenshots');
const PREFIX = '/cadle-ko/';
const PORT = 8123;

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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });

const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('shot ' + name);
};

const step = async (label, fn) => {
  try {
    await fn();
  } catch (err) {
    console.log('step failed: ' + label + ' :: ' + (err && err.message));
  }
};

await page.goto('http://127.0.0.1:' + PORT + PREFIX + 'play/', { waitUntil: 'load', timeout: 120000 });
await sleep(12000);

await step('title', async () => {
  await shot('01-title.png');
});

await step('regions', async () => {
  await page.getByRole('button', { name: '골짜기', exact: true }).first().click();
  await sleep(2500);
  await shot('02-regions.png');
});

await step('controls', async () => {
  await page.getByRole('button', { name: '조작', exact: true }).first().click();
  await sleep(2000);
  await shot('03-controls.png');
});

await step('settings', async () => {
  await page.getByRole('button', { name: '설정', exact: true }).first().click();
  await sleep(2000);
  await shot('04-settings.png');
});

await step('credits', async () => {
  await page.getByRole('button', { name: '크레딧', exact: true }).first().click();
  await sleep(2000);
  await shot('05-credits.png');
});

await step('korean-credit-panel', async () => {
  await page.locator('#cadle-ko-bar button', { hasText: '크레딧' }).first().click();
  await sleep(1200);
  await shot('06-credit-panel.png');
});

await step('english-toggle', async () => {
  await page.getByRole('button', { name: 'English', exact: true }).first().click();
  await sleep(2500);
  await shot('07-english.png');
  await page.getByRole('button', { name: '한국어', exact: true }).first().click();
  await sleep(2000);
});

await step('ingame', async () => {
  await page.getByRole('button', { name: '플레이', exact: true }).first().click();
  await sleep(25000);
  await shot('08-ingame.png');
});

await step('landing', async () => {
  await page.goto('http://127.0.0.1:' + PORT + PREFIX, { waitUntil: 'load', timeout: 120000 });
  await sleep(6000);
  await shot('09-landing.png');
});

await browser.close();
server.close();
console.log('screenshots done');
