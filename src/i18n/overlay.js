/* Cadle 한국어판 — 표시 시점 번역 오버레이. */
import ko from './ko.json';

const DICT = ko.s || {};
const RULES = (ko.r || []).map(([re, to]) => [new RegExp(re, 'i'), to]);
const KEY = 'cadle-ko-lang';
let lang = 'ko';
try { if (localStorage.getItem(KEY) === 'en') lang = 'en'; } catch (e) {}

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE', 'KBD', 'CANVAS', 'SVG', 'TITLE']);
const srcMap = new WeakMap();
const attrMap = new WeakMap();
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

function core(str) {
  const hit = DICT[str];
  if (hit) return hit;
  for (let i = 0; i < RULES.length; i++) if (RULES[i][0].test(str)) return str.replace(RULES[i][0], RULES[i][1]);
  return null;
}
function tr(str) {
  if (!str || lang === 'en' || !/[A-Za-z]/.test(str)) return str;
  const m1 = str.match(/^\s*/)[0];
  const m2 = str.match(/\s*$/)[0];
  const body = str.slice(m1.length, str.length - m2.length);
  if (!body) return str;
  const out = core(body);
  return out == null ? str : m1 + out + m2;
}
function doText(n) {
  const cur = n.nodeValue;
  if (!cur || !/[A-Za-z]/.test(cur)) return;
  if (n.__koOut !== cur) srcMap.set(n, cur);
  const out = tr(srcMap.get(n));
  if (out !== cur) { n.__koOut = out; n.nodeValue = out; }
}
function doEl(el) {
  for (let i = 0; i < ATTRS.length; i++) {
    const a = ATTRS[i];
    const v = el.getAttribute && el.getAttribute(a);
    if (!v || !/[A-Za-z]/.test(v)) continue;
    let m = attrMap.get(el);
    if (!m) { m = {}; attrMap.set(el, m); }
    if (m[a] == null || v !== tr(m[a])) m[a] = v;
    const out = tr(m[a]);
    if (out !== v) el.setAttribute(a, out);
  }
}
function apply(root) {
  if (!root || !document.createTreeWalker) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentNode;
      if (!p || p.nodeType !== 1 || SKIP.has(p.nodeName) || p.isContentEditable) return 2;
      return /[A-Za-z]/.test(node.nodeValue || '') ? 1 : 3;
    }
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  for (let i = 0; i < nodes.length; i++) doText(nodes[i]);
  if (root.querySelectorAll) {
    const els = root.querySelectorAll('[title],[aria-label],[alt],[placeholder]');
    for (let i = 0; i < els.length; i++) doEl(els[i]);
  }
}
const obs = new MutationObserver(function (muts) {
  for (let i = 0; i < muts.length; i++) {
    const m = muts[i];
    if (m.type === 'characterData') { doText(m.target); continue; }
    for (let j = 0; j < m.addedNodes.length; j++) {
      const n = m.addedNodes[j];
      if (n.nodeType === 3) doText(n);
      else if (n.nodeType === 1 && n.id !== 'cadle-ko-bar') apply(n);
    }
  }
});

const origTitle = typeof document !== 'undefined' ? document.title : '';

function retranslate() {
  document.documentElement.lang = lang === 'ko' ? 'ko' : 'en';
  document.title = lang === 'ko' ? tr(origTitle) : origTitle;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) if (srcMap.has(n)) nodes.push(n);
  for (let i = 0; i < nodes.length; i++) {
    const src = srcMap.get(nodes[i]);
    const out = tr(src);
    nodes[i].__koOut = out;
    if (nodes[i].nodeValue !== out) nodes[i].nodeValue = out;
  }
  const els = document.querySelectorAll('[title],[aria-label],[alt],[placeholder]');
  for (let i = 0; i < els.length; i++) doEl(els[i]);
}

function injectStyle() {
  if (document.getElementById('cadle-ko-style')) return;
  const css = [
    "html,body{font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR','Nanum Gothic',system-ui,-apple-system,'Segoe UI',sans-serif}",
    'body{word-break:keep-all;overflow-wrap:break-word}',
    '#cadle-ko-bar{position:fixed;left:10px;bottom:10px;z-index:2147483000;display:flex;gap:8px;align-items:center;padding:6px 10px;border-radius:999px;background:rgba(10,12,16,.72);color:#e8e6df;font:12px/1.3 system-ui,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.35)}',
    '#cadle-ko-bar a{color:#f0d9a8;text-decoration:none}',
    '#cadle-ko-bar a:hover{text-decoration:underline}',
    '#cadle-ko-bar button{cursor:pointer;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;border-radius:999px;padding:2px 9px;font:inherit}',
    '#cadle-ko-bar button:hover{background:rgba(255,255,255,.15)}'
  ].join('\n');
  const s = document.createElement('style');
  s.id = 'cadle-ko-style';
  s.textContent = css;
  document.head.appendChild(s);
}

function mountBar() {
  if (!document.body || document.getElementById('cadle-ko-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'cadle-ko-bar';
  bar.innerHTML = '<span>캐들 한국어판</span><a href="https://github.com/Humpalumps/Cadle" target="_blank" rel="noopener">원작(Cadle)</a><button type="button"></button>';
  const btn = bar.querySelector('button');
  const label = function () { btn.textContent = lang === 'ko' ? 'English' : '한국어'; };
  btn.addEventListener('click', function () {
    lang = lang === 'ko' ? 'en' : 'ko';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    label();
    retranslate();
  });
  document.body.appendChild(bar);
  label();
}

function start() {
  document.documentElement.lang = lang === 'ko' ? 'ko' : 'en';
  injectStyle();
  mountBar();
  obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  apply(document.body);
  if (lang === 'ko' && origTitle) document.title = tr(origTitle);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();

