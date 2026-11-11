// =====================================================================
//  سُبُل السلام — نقطة البداية والموجّه (Router)
//  #/            الصفحة الرئيسية: الشعار واللغات الأربع
//  #/{lang}/...  قسم مستقل لكل لغة (es · en · sw · rw)؛ الطالب مقيّد بلغته
// =====================================================================
import { CONFIG } from './config.js';
import { createDB } from './db.js';
import { S, $, applyUi, esc, toast, uiPref, isSup, href } from './core.js';
import { t, getUiLang } from './i18n.js';

import root from './views/root.js';
import langHome from './views/hub.js';
import learnCenter from './views/learncenter.js';
import * as auth from './views/auth.js';
import * as learn from './views/learn.js';
import * as quran from './views/quran.js';
import * as hadith from './views/hadith.js';
import * as library from './views/library.js';
import * as dawah from './views/dawah.js';
import * as sup from './views/supervisor.js';
import * as sp from './views/studentpage.js';
import * as extra from './views/extra.js';
import * as lc from './views/langcourse.js';
import sources from './views/sources.js';

// مسارات خارج الأقسام
const GLOBAL = [
  [/^\/?$/, root],
  [/^\/sources$/, sources],
  [/^\/admin$/, sup.admin],
];
// مسارات داخل قسم اللغة (بعد #/{lang})
const SCOPED = [
  [/^$/, langHome],
  [/^learn$/, learnCenter],
  [/^login$/, auth.login],
  [/^signup$/, auth.signup],
  [/^profile$/, auth.profile],
  [/^join\/(\w+)$/, auth.join],
  [/^me(?:\/(today|path|reviews|tests|chat|follow))?$/, sp.mePage],
  [/^stage\/(s\d+)$/, learn.stage],
  [/^item\/(\d+)$/, learn.item],
  [/^quiz\/(s\d+)$/, learn.quiz],
  [/^review\/(weekly|monthly)$/, extra.review],
  [/^prayer$/, extra.prayer],
  [/^videos$/, extra.videos],
  [/^books$/, extra.books],
  [/^saudi$/, extra.saudi],
  [/^tracks(?:\/(\w+))?$/, extra.tracks],
  [/^quran$/, quran.list],
  [/^quran\/(\d+)$/, quran.reader],
  [/^hadith$/, hadith.categories],
  [/^hadith\/cat\/(\d+)(?:\/(\d+))?$/, hadith.list],
  [/^hadith\/(\d+)$/, hadith.one],
  [/^library(?:\/(\w+))?(?:\/(\d+))?$/, library.browse],
  [/^dawah(?:\/(\w+))?(?:\/([\w-]+))?$/, dawah.corner],
  [/^lang(?:\/(method|cards|quiz))?(?:\/(L\d|due))?(?:\/(\d+))?$/, lc.route],
  [/^supervisor$/, sup.dashboard],
  [/^supervisor\/(cards|guide|language|material|media)$/, sup.section],
  [/^supervisor\/student\/([\w-]+)(?:\/(path|follow|chat|tests|reviews|today))?$/, sp.supStudentPage],
  [/^supervisor\/questions(?:\/(s\d+))?$/, sup.questions],
];
const LANGS = Object.keys(CONFIG.languages);

let unreadBadge = 0;
async function refreshBadge() {
  if (!S.me) { unreadBadge = 0; return; }
  const u = await S.db.unread().catch(() => []);
  if (u.length !== unreadBadge) { unreadBadge = u.length; renderNav(); }
}

function renderNav() {
  const me = S.me, L = S.routeLang;
  const badge = unreadBadge ? ` <span class="chip red tiny">${unreadBadge}</span>` : '';
  let links;
  if (!L) {
    links = [['#/', t('home')], ['#/sources', t('sources')], ...(me?.role === 'admin' ? [['#/admin', t('admin')]] : [])];
  } else if (me?.role === 'student') {
    links = [[href(), '🏠'], [href('me/today'), t('today')], [href('me'), t('myPage') + badge], [href('quran'), t('quran')], [href('hadith'), t('hadith')],
             [href('prayer'), t('prayerWudu')], [href('videos'), t('videos')], [href('books'), t('booksGuide')], [href('tracks'), '🧭']];
  } else if (isSup()) {
    links = [[href(), '🏠'], [href('supervisor'), t('students') + badge], [href('supervisor/cards'), t('cards')], [href('supervisor/guide'), t('guide')],
             [href('lang'), t('langLearn')], [href('quran'), t('quran')], [href('hadith'), t('hadith')], [href('supervisor/material'), t('material')],
             ...(me.role === 'admin' ? [['#/admin', t('admin')]] : [])];
  } else {
    links = [[href(), '🏠'], [href('learn'), t('learnCenter')], [href('quran'), t('quran')], [href('hadith'), t('hadith')], [href('prayer'), t('prayerWudu')], [href('lang'), '🗣️ ' + t('langLearn')],
             [href('login'), t('login')], [href('signup'), t('signup')]];
  }
  if (me && L) links.push([href('profile'), '👤 ' + esc(me.full_name || me.email.split('@')[0])]);
  const cur = location.hash || '#/';
  const best = links.map(([h]) => h).filter((h) => cur === h || cur.startsWith(h + '/')).sort((a, b) => b.length - a.length)[0];
  $('#nav').innerHTML = links.map(([h, l]) => `<a href="${h}"${h === best ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  $('#ui-slot').innerHTML = (L ? `<button class="lang-toggle" id="ui-toggle" aria-label="العربية / ${esc(CONFIG.languages[L].name)}">
        <span${getUiLang() === 'ar' ? ' class="on"' : ''}>عربي</span><span${getUiLang() === L ? ' class="on"' : ''}>${esc(CONFIG.languages[L].name)}</span></button>`
       : '');
  $('#ui-toggle')?.addEventListener('click', () => { applyUi(uiPref() === 'ar' ? L : 'ar'); render(); });
  // الشعار يعيد إلى الصفحة الرئيسية للغة أو إلى اختيار اللغات
  $('.brand').setAttribute('href', L ? href() : '#/');
  $('#brand-lang').textContent = L ? CONFIG.languages[L].name.toUpperCase() : 'SUBUL AS-SALAM';
}

function renderFoot() {
  $('#foot').innerHTML = `
    <div class="row between"><b>${esc(CONFIG.brand.nameAr)} · ${esc(CONFIG.brand.nameLatin)}</b>
      <span class="row"><a href="#/">🌍 ${t('home')}</a><a href="#/sources">${t('sources')}</a></span></div>
    <div>المحتوى الشرعي يُعرض كما هو من مصادره مع ذكرها:
      <a href="https://islamhouse.com" target="_blank" rel="noopener">IslamHouse.com</a> ·
      <a href="https://quranenc.com" target="_blank" rel="noopener">QuranEnc.com</a> ·
      <a href="https://hadeethenc.com" target="_blank" rel="noopener">HadeethEnc.com</a> ·
      <a href="https://risala.prh.gov.sa" target="_blank" rel="noopener">رسالة الحرمين</a> ·
      <a href="https://qurancomplex.gov.sa" target="_blank" rel="noopener">مجمع الملك فهد</a>
    </div>
    <div class="tiny">${t('sisterSite')}: <a href="${CONFIG.languages.es.sister}" target="_blank" rel="noopener">رفيق الداعية</a></div>`;
}

// يحوّل الروابط القديمة (#/quran …) إلى روابط القسم الحالي (#/{lang}/quran)
function scopeLinks(root) {
  root.querySelectorAll('a[href^="#/"]').forEach((a) => {
    const p = a.getAttribute('href').slice(2);
    const first = p.split('/')[0];
    if (!p || LANGS.includes(first) || GLOBAL.some(([re]) => re.test('/' + p))) return;
    a.setAttribute('href', href(p));
  });
}

let renderId = 0;
export async function render() {
  const id = ++renderId;
  let path = location.hash.replace(/^#\/?/, '');
  const seg = path.split('/')[0];
  if (LANGS.includes(seg)) {
    S.routeLang = seg;
    path = path.slice(seg.length).replace(/^\//, '');
    // الطالب يبقى في قسم لغته
    if (S.me?.role === 'student' && S.me.lang && S.me.lang !== seg && CONFIG.languages[S.me.lang]) {
      toast(`${t('myPage')}: ${CONFIG.languages[S.me.lang].name}`);
      location.replace(`#/${S.me.lang}${path ? '/' + path : ''}`); return;
    }
    S.lang = seg;
  } else {
    S.routeLang = null;
    if (!GLOBAL.some(([re]) => re.test('/' + path))) { location.replace(`#/${S.lang}/${path}`); return; }
  }
  applyUi();
  const app = $('#app');
  renderNav(); renderFoot();
  if (S.db.mode === 'local') $('#demo-bar').textContent = t('demo');
  $('#nav').classList.remove('open');
  const table = S.routeLang ? SCOPED : GLOBAL;
  const key = S.routeLang ? path : '/' + path;
  for (const [re, view] of table) {
    const m = key.match(re);
    if (!m) continue;
    try {
      const out = await view(app, ...m.slice(1));
      if (id !== renderId) return;
      if (typeof out === 'string') app.innerHTML = out;
      scopeLinks(app); scopeLinks($('#foot'));
    } catch (e) {
      console.error(e);
      if (id === renderId) app.innerHTML = `<div class="wrap" style="padding-top:30px"><div class="card"><p>${t('error')}</p><p class="tiny muted">${esc(e.message || e)}</p><button class="btn" onclick="location.reload()">${t('retry')}</button></div></div>`;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  app.innerHTML = `<div class="wrap" style="padding-top:30px"><div class="card">404 — <a href="#/">${t('home')}</a></div></div>`;
}

// رابط الدعوة #/{lang}/join/CODE: يُحفظ الرمز حتى يدخل الطالب ثم يُرسل طلب الربط تلقائيًّا
async function processJoin() {
  const code = localStorage.getItem('subul-join');
  if (!code || !S.me) return;
  localStorage.removeItem('subul-join');
  if (S.me.role !== 'student') return;
  const r = await S.db.linkWithCode(code).catch(() => 'error');
  toast(r === 'pending' ? t('sentRequest') : r === 'active' ? t('linked') + ' ✓' : 'الرمز غير صحيح', 5000);
}

async function boot() {
  S.db = await createDB();
  S.me = await S.db.init();
  if (S.db.mode === 'local') $('#demo-bar').classList.remove('hidden');
  S.db.onChange(async (me) => {
    const was = S.me?.id; S.me = me;
    if (me) await processJoin();
    if (was !== me?.id) {
      if (me && /\/(login|signup)$/.test(location.hash)) {
        const L = me.role === 'student' ? me.lang : S.lang;
        location.hash = isSup() ? `#/${L}/supervisor` : `#/${L}/me/today`;
      } else render();
    }
  });
  $('#burger').onclick = () => { const n = $('#nav'); n.classList.toggle('open'); $('#burger').setAttribute('aria-expanded', n.classList.contains('open')); };
  addEventListener('hashchange', render);
  if (S.me) await processJoin();
  setInterval(refreshBadge, 30000); refreshBadge();
  await render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot().catch((e) => { console.error(e); toast('Error: ' + e.message); });
