/* Cadle 한국어판 — 표시 시점 번역 오버레이. 원문은 보존하고 화면에 보이는 문구만 바꾼다. */ import ko from "./ko.json";
const DICT = ko.s || {};
const NORM = {};
for (const k in DICT) {
  const nk = k.replace(/\s+/g, " ").trim();
  if (!(nk in NORM)) NORM[nk] = DICT[k];
}
const RULES = (ko.r || []).map(function (r) {
  return [new RegExp(r[0], "i"), r[1]];
});
const KEY = "cadle-ko-lang";
let lang = "ko";
try {
  if (localStorage.getItem(KEY) === "en") lang = "en";
} catch (e) {}
const SKIP = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "CODE",
  "PRE",
  "KBD",
  "CANVAS",
  "SVG",
  "TITLE",
]);
const INLINE = new Set([
  "SPAN",
  "EM",
  "STRONG",
  "B",
  "I",
  "U",
  "SMALL",
  "MARK",
  "SUB",
  "SUP",
]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"];
const srcMap = new WeakMap();
const attrMap = new WeakMap();
function core(str) {
  const hit = DICT[str];
  if (hit) return hit;
  const nk = str.replace(/\s+/g, " ").trim();
  if (NORM[nk]) return NORM[nk];
  for (let i = 0; i < RULES.length; i++)
    if (RULES[i][0].test(str)) return str.replace(RULES[i][0], RULES[i][1]);
  return null;
}
function tr(str) {
  if (!str || lang === "en" || !/[A-Za-z]/.test(str)) return str;
  const m1 = str.match(/^\s*/)[0];
  const m2 = str.match(/\s*$/)[0];
  const body = str.slice(m1.length, str.length - m2.length);
  if (!body) return str;
  const out = core(body);
  return out == null ? str : m1 + out + m2;
}
function doText(n) {
  const cur = n.nodeValue;
  if (n.__koOut == null || cur !== n.__koOut) srcMap.set(n, cur);
  const src = srcMap.get(n);
  if (src == null) return;
  const out = lang === "en" ? src : tr(src);
  if (out !== cur) {
    n.__koOut = out;
    n.nodeValue = out;
  }
}
function doEl(el) {
  for (let i = 0; i < ATTRS.length; i++) {
    const a = ATTRS[i];
    const v = el.getAttribute && el.getAttribute(a);
    if (!v || !/[A-Za-z]/.test(v)) continue;
    let m = attrMap.get(el);
    if (!m) {
      m = {};
      attrMap.set(el, m);
    }
    if (m[a] == null || v !== tr(m[a])) m[a] = v;
    const out = tr(m[a]);
    if (out !== v) el.setAttribute(a, out);
  }
}
function doBlock(root) {
  if (!root.querySelectorAll) return;
  const els = root.querySelectorAll(
    "button,p,li,h1,h2,h3,h4,h5,h6,span,div,td,th,label,figcaption,em,strong,small,dd,dt,summary",
  );
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (el.id === "cadle-ko-bar" || (el.closest && el.closest("#cadle-ko-bar")))
      continue;
    if (el.__koHTML != null) {
      if (lang === "en") {
        el.innerHTML = el.__koHTML;
        el.__koHTML = null;
        el.__koOut2 = null;
        continue;
      }
      const now = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (now !== el.__koOut2) {
        el.innerHTML = el.__koHTML;
        el.__koHTML = null;
        el.__koOut2 = null;
      }
    }
    if (lang === "en") continue;
    let ok = true;
    const kids = el.children;
    for (let j = 0; j < kids.length; j++)
      if (!INLINE.has(kids[j].nodeName)) {
        ok = false;
        break;
      }
    if (!ok) continue;
    const txt = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!txt || txt.length < 6 || txt.length > 600 || !/[A-Za-z]/.test(txt))
      continue;
    const out = core(txt);
    if (out && out !== txt) {
      el.__koHTML = el.innerHTML;
      el.textContent = out;
      el.__koOut2 = out;
    }
  }
}
function apply(root) {
  if (!root || !document.createTreeWalker) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      const p = node.parentNode;
      if (!p || p.nodeType !== 1 || SKIP.has(p.nodeName) || p.isContentEditable)
        return 2;
      if (p.closest && p.closest("#cadle-ko-bar")) return 2;
      return /[A-Za-z]/.test(node.nodeValue || "") ? 1 : 3;
    },
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  for (let i = 0; i < nodes.length; i++) doText(nodes[i]);
  if (root.querySelectorAll) {
    const els = root.querySelectorAll(
      "[title],[aria-label],[alt],[placeholder]",
    );
    for (let i = 0; i < els.length; i++) doEl(els[i]);
  }
  doBlock(root);
}
const obs = new MutationObserver(function (muts) {
  for (let i = 0; i < muts.length; i++) {
    const m = muts[i];
    if (m.type === "characterData") {
      doText(m.target);
      continue;
    }
    for (let j = 0; j < m.addedNodes.length; j++) {
      const n = m.addedNodes[j];
      if (n.nodeType === 3) doText(n);
      else if (n.nodeType === 1 && n.id !== "cadle-ko-bar") apply(n);
    }
  }
});
let titleSrc = null;
function syncTitle() {
  const t = document.title || "";
  if (titleSrc == null) titleSrc = t;
  const out = lang === "en" ? titleSrc : core(titleSrc) || titleSrc;
  if (out) document.title = out;
}
let barEl = null;
let btnEl = null;
let ttlEl = null;
function renderBar() {
  if (!barEl) return;
  btnEl.textContent = lang === "ko" ? "English" : "한국어";
  ttlEl.textContent = lang === "ko" ? "캐들 한국어판" : "Cadle (Korean build)";
}
function setLang(next) {
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch (e) {}
  apply(document.body);
  syncTitle();
  renderBar();
}
function mountBar() {
  if (barEl || document.getElementById("cadle-ko-bar")) return;
  barEl = document.createElement("div");
  barEl.id = "cadle-ko-bar";
  barEl.style.cssText =
    'position:fixed;right:12px;bottom:12px;z-index:2147483647;display:flex;gap:10px;align-items:center;font:12px/1.4 system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#cfd6e4;background:rgba(10,13,18,.8);border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:6px 12px;user-select:none';
  ttlEl = document.createElement("span");
  ttlEl.style.cssText = "opacity:.8";
  const a = document.createElement("a");
  a.href = "https://github.com/Humpalumps/Cadle";
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = "원작(Cadle)";
  a.style.cssText = "color:#9fb4d8;text-decoration:none";
  btnEl = document.createElement("button");
  btnEl.type = "button";
  btnEl.style.cssText =
    "font:inherit;color:inherit;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:2px 10px;cursor:pointer";
  btnEl.addEventListener("click", function () {
    setLang(lang === "ko" ? "en" : "ko");
  });
  var cr = document.createElement("button");
  cr.type = "button";
  cr.textContent = "크레딧";
  cr.style.cssText =
    "font:inherit;color:inherit;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:2px 10px;cursor:pointer";
  cr.addEventListener("click", toggleCredit);
  barEl.appendChild(ttlEl);
  barEl.appendChild(a);
  barEl.appendChild(cr);
  barEl.appendChild(btnEl);
  document.body.appendChild(barEl);
  renderBar();
}
var CREDIT_ROWS = [
  '원작: <b>Cadle</b> — 제작 Ian Cadle · <a href="https://github.com/Humpalumps/Cadle" target="_blank" rel="noopener" style="color:#9fb4d8">github.com/Humpalumps/Cadle</a>',
  "원작 라이선스: <b>MIT</b> (LICENSE 원문 유지) · NOTICE 원문 유지",
  "에셋(public/assets/ 이미지·모델): 원작 NOTICE에 따라 MIT 부여 대상이 아니며 권리는 원작자에게 있습니다. 요청 시 즉시 제거합니다.",
  "한국어판 번역·빌드: <b>sigco3111</b> — 표시 시점 번역 오버레이(원문 보존), 사전 약 2,090항목",
  "사용 라이브러리: three.js (MIT), postprocessing (Zlib), @dgreenheck/ez-tree (MIT), Vite (MIT), meshoptimizer (MIT)",
  '원작자와 무관한 비공식 2차 창작입니다. 원작자가 요청하면 즉시 비공개로 전환합니다. · <a href="https://github.com/sigco3111/cadle-ko" target="_blank" rel="noopener" style="color:#9fb4d8">한국어판 저장소</a>',
];
var creditEl = null;
function ensureCredit() {
  if (creditEl || !barEl) return;
  creditEl = document.createElement("div");
  creditEl.id = "cadle-ko-credit";
  creditEl.style.cssText =
    'position:fixed;right:12px;bottom:52px;z-index:2147483647;display:none;max-width:420px;padding:14px 16px;font:12px/1.6 system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#dfe6f2;background:rgba(8,11,16,.96);border:1px solid rgba(255,255,255,.18);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.5);user-select:text';
  var h = document.createElement("div");
  h.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px";
  var t = document.createElement("b");
  t.textContent = "캐들 한국어판 (Cadle-ko)";
  t.style.cssText = "font-size:13px";
  var x = document.createElement("button");
  x.type = "button";
  x.textContent = "닫기";
  x.style.cssText =
    "font:inherit;color:inherit;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:1px 9px;cursor:pointer";
  x.addEventListener("click", function () {
    creditEl.style.display = "none";
  });
  h.appendChild(t);
  h.appendChild(x);
  creditEl.appendChild(h);
  var ul = document.createElement("ul");
  ul.style.cssText =
    "margin:0;padding-left:16px;display:flex;flex-direction:column;gap:5px";
  for (var i = 0; i < CREDIT_ROWS.length; i++) {
    var li = document.createElement("li");
    li.innerHTML = CREDIT_ROWS[i];
    ul.appendChild(li);
  }
  creditEl.appendChild(ul);
  barEl.appendChild(creditEl);
}
function toggleCredit() {
  ensureCredit();
  if (!creditEl) return;
  creditEl.style.display =
    creditEl.style.display === "block" ? "none" : "block";
}
const fontStyle = document.createElement("style");
fontStyle.textContent =
  'body,button,input,select,textarea{font-family:"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Nanum Gothic",system-ui,sans-serif!important}';
document.head.appendChild(fontStyle);
function boot() {
  apply(document.body);
  syncTitle();
  mountBar();
  obs.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", boot);
else boot();
