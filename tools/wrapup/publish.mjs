import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const DOCS = 'docs';
const KEEP = ['.nojekyll', '.htaccess', 'glossary.md', 'screenshots'];

async function keepAside() {
  const tmp = '.wrapup-keep';
  await rm(tmp, { recursive: true, force: true });
  await mkdir(tmp, { recursive: true });
  for (const name of KEEP) {
    const from = path.join(DOCS, name);
    if (!existsSync(from)) continue;
    await cp(from, path.join(tmp, name), { recursive: true });
  }
  return tmp;
}

async function restore(tmp) {
  for (const name of KEEP) {
    const from = path.join(tmp, name);
    if (!existsSync(from)) continue;
    await rm(path.join(DOCS, name), { recursive: true, force: true });
    await cp(from, path.join(DOCS, name), { recursive: true });
  }
  await rm(tmp, { recursive: true, force: true });
}

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

const ROOT_ABS = /(["'`])\/(assets|play)(?![\w-])/g;

async function rewrite() {
  let touched = 0;
  for (const file of await walk(DOCS)) {
    if (!/\.(html|js|css|json|webmanifest)$/.test(file)) continue;
    const before = await readFile(file, 'utf8');
    const after = before.replace(ROOT_ABS, '$1/cadle-ko/$2');
    if (after !== before) {
      await writeFile(file, after);
      touched += 1;
    }
  }
  return touched;
}

async function audit() {
  const bad = [];
  for (const file of await walk(DOCS)) {
    if (!/\.(html|js)$/.test(file)) continue;
    const text = await readFile(file, 'utf8');
    const re = /(["'`])\/(assets|play)(?![\w-])/g;
    let m;
    while ((m = re.exec(text)) !== null) bad.push(path.relative(DOCS, file) + ' -> ' + m[0]);
  }
  return bad;
}

const tmp = await keepAside();
await rm(DOCS, { recursive: true, force: true });
await mkdir(DOCS, { recursive: true });
for (const entry of await readdir(DIST)) {
  await cp(path.join(DIST, entry), path.join(DOCS, entry), { recursive: true });
}
await restore(tmp);
const touched = await rewrite();
const bad = await audit();
console.log('publish: files rewritten=' + touched + ', remaining root-absolute refs=' + bad.length);
if (bad.length) console.log(bad.slice(0, 20).join('\n'));
if (bad.length) process.exitCode = 1;
