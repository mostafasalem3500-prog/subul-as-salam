// مكوّنات مشتركة: عرض الآيات والأحاديث بمراجعها من مصادرها
import { CONFIG } from '../config.js';
import { QE, HE } from '../api.js';
import { S, esc, parseRef, $$ } from '../core.js';
import { surahName } from '../curriculum.js';
import { t } from '../i18n.js';

export const qLangDir = (lang) => CONFIG.languages[lang]?.dir || 'ltr';

// يحوّل رقم الآية لأرقام عربية داخل علامة الآية
const arNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
export const ayahMark = (n) => `<span class="num-ayah">﴿${arNum(n)}﴾</span>`;

// نص الترجمة كما هو + الحواشي
export function trHTML(row, lang) {
  return `<div class="tr" dir="${qLangDir(lang)}" lang="${lang}" translate="no">${esc(row.translation)}</div>` +
    (row.footnotes ? `<div class="fn" dir="${qLangDir(lang)}" translate="no">${esc(row.footnotes)}</div>` : '');
}

export function translationCredit(key) {
  return `<div class="src">${t('source')}: <a href="${QE.pageUrl(key, 1)}" target="_blank" rel="noopener">QuranEnc.com</a> — <span translate="no">${esc(key)}</span></div>`;
}

// مرجع آية/آيات: "2:183-185" → بطاقة فيها النص العثماني والترجمة بلغة الطالب
export async function verseCard(ref, lang = S.lang, key = S.qKey) {
  const { s, from, to } = parseRef(ref);
  const rows = (await QE.sura(key, s)).filter((r) => +r.aya >= from && +r.aya <= to);
  return `<div class="card flat" style="background:var(--surface-2)">
    <div class="quran-ar" lang="ar" translate="no">${rows.map((r) => `${esc(r.arabic_text)} ${ayahMark(r.aya)}`).join(' ')}</div>
    ${rows.map((r) => trHTML(r, lang)).join('')}
    <div class="src">${esc(surahName(s))} ${s}:${from}${to !== from ? '-' + to : ''} · <a href="#/quran/${s}">${t('open')}</a> · QuranEnc (${esc(key)})</div>
  </div>`;
}

export async function hadithCard(id, lang = S.lang) {
  const h = await HE.one(CONFIG.languages[lang]?.hadeeth || lang, id);
  return `<div class="card flat" style="background:var(--surface-2)" dir="${qLangDir(lang)}">
    <p lang="${lang}" translate="no"><b>${esc(h.hadeeth)}</b></p>
    <p class="small muted" style="margin-top:6px">${esc(h.attribution || '')}${h.grade ? ' · ' + t('grade') + ': ' + esc(h.grade) : ''}</p>
    <div class="src"><a href="#/hadith/${esc(h.id || id)}">${t('explanation')}</a> · <a href="${HE.pageUrl(lang, h.id || id)}" target="_blank" rel="noopener">HadeethEnc.com</a></div>
  </div>`;
}

// عناصر <div data-q="2:183" data-h="5795"> تُملأ تلقائيًّا بعد العرض
export function refsSlot(q = [], h = []) {
  return [...q.map((r) => `<div class="ref-slot" data-q="${esc(r)}"><div class="skeleton" style="height:70px"></div></div>`),
          ...h.map((r) => `<div class="ref-slot" data-h="${esc(r)}"><div class="skeleton" style="height:60px"></div></div>`)].join('');
}
export function fillRefs(root) {
  $$('.ref-slot', root).forEach(async (el) => {
    if (el.dataset.done) return; el.dataset.done = 1;
    try { el.innerHTML = el.dataset.q ? await verseCard(el.dataset.q) : await hadithCard(el.dataset.h); }
    catch { el.innerHTML = `<p class="tiny muted">${esc(el.dataset.q || el.dataset.h)} — ${t('error')}</p>`; }
  });
}

export const pageHead = (title, sub = '', extra = '') => `
  <div class="page-head"><div class="wrap"><div class="row between"><div><h1 style="font-size:clamp(1.4rem,3.4vw,2rem)">${title}</h1>${sub ? `<p class="muted" dir="auto">${sub}</p>` : ''}</div>${extra}</div></div></div>`;

export const needLogin = () => `<div class="wrap" style="padding-top:30px"><div class="card center stack">
  <p>${t('login')} — ${t('learn')}</p><div class="row" style="justify-content:center"><a class="btn primary" href="#/signup">${t('signup')}</a><a class="btn" href="#/login">${t('login')}</a></div></div></div>`;

// ---------------- خريطة الرحلة (إنفوجرافيك متحرك) ----------------
import { STAGES } from '../curriculum.js';
import { stageTitle } from '../i18n.js';

export function journeyHTML(prog = null, linkBase = '#/stage/') {
  return `<div class="journey reveal">
    <svg class="path" aria-hidden="true"><path class="base"/><path class="drawn"/></svg>
    <div class="stations">
      ${STAGES.map((st, i) => {
        const p = prog?.stages[i];
        const cls = p ? (p.complete ? 'done' : i === prog.current ? 'current' : i > prog.current + 1 ? 'locked' : '') : '';
        return `<a class="station ${cls}" href="${linkBase}${st.id}" style="--c:${st.color}" data-i="${i}">
          <span class="badge">${st.icon}<span class="n">${i + 1}</span></span>
          <span style="min-width:0;flex:1"><span class="t">${esc(stageTitle(st.id))}</span>
            ${p ? `<span class="s">${p.pct}%${p.grade !== null ? ' · ' + t('score') + ' ' + p.grade : ''}</span><span class="bar"><i style="--p:${p.pct}%"></i></span>`
                : `<span class="s" lang="ar">${esc(stageTitle(st.id, 'ar'))}</span>`}
          </span></a>`;
      }).join('')}
    </div></div>`;
}

export function drawJourney(root, uptoIdx = -1) {
  const j = root.querySelector('.journey'); if (!j) return;
  const draw = () => {
    const box = j.getBoundingClientRect();
    const pts = [...j.querySelectorAll('.station .badge')].map((b) => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; });
    if (pts.length < 2) return;
    const d = (arr) => arr.map((p, i) => {
      if (!i) return `M${p[0]},${p[1]}`;
      const q = arr[i - 1], mx = (q[0] + p[0]) / 2;
      return `C${mx},${q[1]} ${mx},${p[1]} ${p[0]},${p[1]}`;
    }).join(' ');
    const [base, drawn] = j.querySelectorAll('svg path');
    base.setAttribute('d', d(pts));
    if (uptoIdx >= 1) { drawn.setAttribute('d', d(pts.slice(0, uptoIdx + 1))); const L = drawn.getTotalLength(); drawn.style.strokeDasharray = L; drawn.style.setProperty('--len', L); }
    else drawn.removeAttribute('d');
  };
  requestAnimationFrame(draw);
  let tmr; addEventListener('resize', () => { clearTimeout(tmr); tmr = setTimeout(draw, 150); });
}
