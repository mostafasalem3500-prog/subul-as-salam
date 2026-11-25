// =====================================================================
//  البحث الشامل داخل قسم اللغة + المفضّلة
//  #/{L}/search   يبحث في: الصفحات، المحطات، السور، المسارات، المصادر السعودية،
//                 دروس دورة اللغة ومفرداتها (كلمة سواحيلية/كينيارواندية ← درسها)
//  #/{L}/saved    المفضّلة (تُحفظ في هذا المتصفح)
// =====================================================================
import { CONFIG } from '../config.js';
import { S, esc, href, toast } from '../core.js';
import { STAGES, SURAHS } from '../curriculum.js';
import { t, stageTitle, getUiLang } from '../i18n.js';
import { TRACKS, trackName } from '../tracks.js';
import { SAUDI, SAUDI_GROUPS } from '../saudi-sources.js';
import { getCourse } from './langcourse.js';
import { pageHead } from './components.js';

// تطبيع للبحث: بلا تشكيل ولا همزات ولا علامات لاتينية
export const norm = (s) => String(s || '').toLowerCase()
  .replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘'`]/g, "'").trim();

const AR_PAGES = { learn: 'الصفحة التعليمية تعلم', prayer: 'الصلاة الوضوء الطهارة', videos: 'المرئيات فيديو', books: 'الكتب دليل الكتب', quran: 'القرآن المصحف السور', hadith: 'الحديث الأحاديث', library: 'المكتبة', dawah: 'الدعوة الداعية', lang: 'تعليم اللغة' };
async function buildIndex() {
  const L = S.lang, ui = getUiLang(), idx = [];
  const add = (icon, title, sub, h, extra = '') => idx.push({ icon, title, sub, h, k: norm(`${title} ${sub} ${extra}`) });
  [['learn', '📖', t('learnCenter')], ['prayer', '💧', t('prayerWudu')], ['videos', '🎬', t('videos')], ['books', '📚', t('booksGuide')],
   ['quran', '📖', t('quran')], ['hadith', '🌿', t('hadith')], ['hifz', '🧠', 'لوحة الحفظ'], ['tracks', '🧭', 'المسارات الموضوعية'],
   ['saudi', '🕋', 'المصادر السعودية المعتمدة'], ['lang', '🗣️', t('langLearn')], ['lang/method', '🧭', 'كيف تتعلّم اللغة؟'], ['library', '🗂️', t('library')],
   ['dawah', '🤝', t('dawah')]].forEach(([p, ic, n]) => add(ic, n, '', href(p), p + ' ' + (AR_PAGES[p] || '')));
  STAGES.forEach((st, i) => add(st.icon, `${i + 1}. ${stageTitle(st.id)}`, stageTitle(st.id, 'ar'), href('stage/' + st.id), 'stage محطة'));
  SURAHS.forEach(([n, a], i) => add('📖', `سورة ${n}`, `${i + 1} · ${a}`, href('quran/' + (i + 1)), String(i + 1)));
  TRACKS.filter((x) => (x.ih[L] || []).length).forEach((x) => add(x.icon, trackName(x, ui), x.n.ar, href('tracks/' + x.id), Object.values(x.n).join(' ')));
  SAUDI_GROUPS.filter((g) => SAUDI[L]?.[g.id]?.length).forEach((g) => add(g.icon, g.ar, g.en, href('saudi'), ''));
  const C = await getCourse(L).catch(() => null);
  if (C) C.levels.forEach((lv) => lv.lessons.forEach((ls, i) => {
    const words = [...(ls.v || []), ...(ls.terms || [])].map((w) => `${w[0]} ${w[1]}`).join(' ');
    add(lv.icon, ls.t, `${lv.cefr} · ${lv.t}`, href(`lang/${lv.id}/${i + 1}`), words);
  }));
  return idx;
}

let cache = { L: null, idx: null };
export async function search(app) {
  if (cache.L !== S.lang) cache = { L: S.lang, idx: await buildIndex() };
  const idx = cache.idx;
  const q0 = sessionStorage.getItem('subul-q') || '';
  app.innerHTML = `${pageHead('🔍 <span lang="ar">البحث</span>', `<span lang="ar">في الصفحات والمحطات والسور والمسارات ودروس اللغة ومفرداتها</span> · ${esc(CONFIG.languages[S.lang].name)}`)}
  <div class="wrap stack" style="padding-top:14px;max-width:820px">
    <input id="q" type="search" dir="auto" autocomplete="off" placeholder="🔍 …" value="${esc(q0)}" style="font-size:1.15rem;padding:14px 16px">
    <p class="tiny muted" lang="ar">جرّب: «الوضوء»، «الإخلاص»، «Swala»، «iswala»، «عيسى»، «الأسرة».</p>
    <div id="res" class="stack"></div>
  </div>`;
  const box = app.querySelector('#res'), inp = app.querySelector('#q');
  const run = () => {
    const q = norm(inp.value); sessionStorage.setItem('subul-q', inp.value);
    if (q.length < 2) { box.innerHTML = ''; return; }
    const terms = q.split(/\s+/);
    const hits = idx.map((x) => ({ x, s: terms.every((w) => x.k.includes(w)) ? (norm(x.title).startsWith(terms[0]) ? 2 : 1) : 0 })).filter((r) => r.s).sort((a, b) => b.s - a.s).slice(0, 40);
    box.innerHTML = hits.length ? hits.map(({ x }) => `<a class="card lift item" href="${x.h}"><span class="ic">${x.icon}</span><span style="min-width:0"><h3 dir="auto">${esc(x.title)}</h3><span class="desc" dir="auto">${esc(x.sub)}</span></span></a>`).join('')
      : `<p class="muted">—</p>`;
  };
  inp.oninput = run; run(); inp.focus();
}

// ---------------------------------------------------------------- المفضّلة
const SK = () => 'subul-saved-' + S.lang;
export const savedList = () => { try { return JSON.parse(localStorage.getItem(SK())) || []; } catch { return []; } };
const savedSet = (a) => localStorage.setItem(SK(), JSON.stringify(a));
export function isSaved(h) { return savedList().some((x) => x.h === h); }
export function toggleSaved(h, title) {
  const a = savedList(), i = a.findIndex((x) => x.h === h);
  if (i >= 0) a.splice(i, 1); else a.unshift({ h, title: title.slice(0, 140), d: Date.now() });
  savedSet(a.slice(0, 200)); return i < 0;
}
export function saved(app) {
  const a = savedList();
  app.innerHTML = `${pageHead('⭐ <span lang="ar">مفضّلتي</span>', `<span lang="ar">الصفحات التي حفظتها بزر النجمة — محفوظة في هذا المتصفح</span>`)}
  <div class="wrap stack" style="padding-top:14px;max-width:820px">
    ${a.length ? a.map((x, i) => `<div class="card row between"><a href="${esc(x.h)}" dir="auto" style="text-decoration:none;color:inherit;flex:1"><b>${esc(x.title)}</b><br><span class="tiny muted">${new Date(x.d).toLocaleDateString()}</span></a>
      <button class="btn sm" data-rm="${i}" aria-label="remove">✕</button></div>`).join('')
      : `<p class="card muted" lang="ar">لا شيء بعد. اضغط ⭐ في أي آية أو حديث أو كتاب أو درس لحفظه هنا.</p>`}
  </div>`;
  app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { const l = savedList(); l.splice(+b.dataset.rm, 1); savedSet(l); toast('✓'); saved(app); });
}
