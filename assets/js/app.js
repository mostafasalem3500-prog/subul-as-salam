// =====================================================================
//  سُبُل السلام — نقطة البداية والموجّه (Router)
//  #/            الصفحة الرئيسية: الشعار واللغات الأربع
//  #/{lang}/...  قسم مستقل لكل لغة (es · en · sw · rw)؛ الطالب مقيّد بلغته
// =====================================================================
import { CONFIG } from './config.js';
import { createDB } from './db.js';
import { S, $, applyUi, esc, toast, uiPref, isSup, href, migrateUserKeys } from './core.js';
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
import * as hifz from './views/hifz.js';
import * as srch from './views/search.js';
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
  [/^hifz(?:\/(test))?$/, hifz.route],
  [/^search$/, srch.search],
  [/^saved$/, srch.saved],
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
    links = [[href(), '🏠'], [href('me/today'), t('today')], [href('me'), t('myPage') + badge], [href('quran'), t('quran')], [href('hifz'), '🧠'], [href('hadith'), t('hadith')],
             [href('prayer'), t('prayerWudu')], [href('videos'), t('videos')], [href('books'), t('booksGuide')], [href('tracks'), '🧭']];
  } else if (isSup()) {
    links = [[href(), '🏠'], [href('supervisor'), t('students') + badge], [href('supervisor/cards'), t('cards')], [href('supervisor/guide'), t('guide')],
             [href('lang'), t('langLearn')], [href('quran'), t('quran')], [href('hadith'), t('hadith')], [href('supervisor/material'), t('material')],
             ...(me.role === 'admin' ? [['#/admin', t('admin')]] : [])];
  } else {
    links = [[href(), '🏠'], [href('learn'), t('learnCenter')], [href('quran'), t('quran')], [href('hadith'), t('hadith')], [href('prayer'), t('prayerWudu')], [href('lang'), '🗣️ ' + t('langLearn')],
             [href('login'), t('login')], [href('signup'), t('signup')]];
  }
  if (L) links.push([href('search'), '🔍'], [href('saved'), '⭐']);
  if (me && L) links.push([href('profile'), '👤 ' + esc(me.full_name || me.email.split('@')[0])]);
  const cur = location.hash || '#/';
  const best = links.map(([h]) => h).filter((h) => cur === h || cur.startsWith(h + '/')).sort((a, b) => b.length - a.length)[0];
  $('#nav').innerHTML = links.map(([h, l]) => `<a href="${h}"${h === best ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  $('#ui-slot').innerHTML = (L ? `<button class="lang-toggle" id="ui-toggle" aria-label="العربية / ${esc(CONFIG.languages[L].name)}">
        <span${getUiLang() === 'ar' ? ' class="on"' : ''}>عربي</span><span${getUiLang() === L ? ' class="on"' : ''}>${esc(CONFIG.languages[L].name)}</span></button>`
       : '');
  $('#ui-toggle')?.addEventListener('click', () => { applyUi(uiPref() === 'ar' ? L : 'ar'); render(); });
  // حجم الخط: 100% ← 115% ← 130% (لكبار السن وضعاف البصر)
  const FS = [1, 1.15, 1.3], fi = Math.max(0, FS.indexOf(+localStorage.getItem('subul-fs') || 1));
  $('#ui-slot').insertAdjacentHTML('beforeend', `<button class="fs-btn" id="fs" aria-label="text size" title="A / A+ / A++">A${'+'.repeat(fi)}</button>`);
  $('#fs').onclick = () => { const n = FS[(fi + 1) % FS.length]; localStorage.setItem('subul-fs', n); document.documentElement.style.setProperty('--fs', n); renderNav(); };
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
      askButton(path);
      afterRender(app);
    } catch (e) {
      console.error(e);
      if (id === renderId) app.innerHTML = `<div class="wrap" style="padding-top:30px"><div class="card"><p>${t('error')}</p><p class="tiny muted">${esc(e.message || e)}</p><button class="btn" data-reload>${t('retry')}</button></div></div>`;
      app.querySelector('[data-reload]')?.addEventListener('click', () => location.reload());
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

function netBanner() {
  let b = document.querySelector('#net-bar');
  if (navigator.onLine) { b?.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'net-bar'; b.className = 'net-bar'; b.setAttribute('role', 'status'); document.body.prepend(b); }
  b.innerHTML = '📴 <span lang="ar">أنت دون اتصال — تظهر الصفحات والمحطات المحفوظة في جهازك</span> · Offline';
}
addEventListener('online', netBanner); addEventListener('offline', netBanner);
async function boot() {
  $('#skip').onclick = () => $('#app').focus();
  netBanner();
  document.documentElement.style.setProperty('--fs', +localStorage.getItem('subul-fs') || 1);
  S.db = await createDB();
  S.me = await S.db.init();
  migrateUserKeys();
  if (S.db.mode === 'local') $('#demo-bar').classList.remove('hidden');
  S.db.onChange(async (me) => {
    const was = S.me?.id; S.me = me;
    migrateUserKeys();
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

// ---------------------------------------------------------------- «اسأل مشرفك» من أي مادة أو آية أو حديث
const ASK_ON = /^(item|hadith|quran|stage|tracks|hifz|prayer|lang)\b/;
function askButton(path) {
  document.querySelector('#ask-fab')?.remove(); document.querySelector('#save-fab')?.remove();
  if (S.routeLang && /^(item|hadith|quran\/|stage|tracks\/|lang\/L)/.test(path || '')) {
    const sb = document.createElement('button'); sb.id = 'save-fab'; sb.className = 'save-fab';
    const paint = () => { const on = srch.isSaved(location.hash); sb.textContent = on ? '★' : '☆'; sb.classList.toggle('on', on); sb.setAttribute('aria-pressed', on); };
    sb.title = '⭐'; paint();
    sb.onclick = () => { const title = (document.querySelector('.page-head h1')?.textContent || document.title).trim(); const on = srch.toggleSaved(location.hash, title); paint(); toast(on ? '⭐ ✓' : '✕'); };
    document.body.append(sb);
  }
  if (S.me?.role !== 'student' || !ASK_ON.test(path || '')) return;
  const b = document.createElement('button');
  b.id = 'ask-fab'; b.className = 'ask-fab'; b.innerHTML = `💬 <span>${esc(t('chat'))}</span>`; b.title = 'اسأل مشرفك عن هذه الصفحة';
  b.onclick = async () => {
    const links = await S.db.links().catch(() => []);
    const sup = links.find((l) => l.iAm === 'student' && l.status === 'active');
    if (!sup) { toast(t('noSupervisor'), 5000); location.hash = href('me/tests'); return; }
    const ctxTitle = (document.querySelector('.page-head h1')?.textContent || document.title).trim().slice(0, 120);
    const d = document.createElement('dialog'); d.className = 'ask-dlg';
    d.innerHTML = `<form method="dialog" class="card stack"><h3>💬 ${esc(sup.other.full_name || t('supervisor'))}</h3>
      <p class="small muted" dir="auto">📎 ${esc(ctxTitle)}</p>
      <textarea id="ask-t" rows="4" required dir="auto"></textarea>
      <div class="row"><button class="btn primary" value="send">${esc(t('send'))}</button><button class="btn" value="cancel" formnovalidate>${esc(t('back'))}</button></div></form>`;
    document.body.append(d); d.showModal(); d.querySelector('#ask-t').focus();
    d.addEventListener('close', async () => {
      const txt = d.querySelector('#ask-t').value.trim();
      if (d.returnValue === 'send' && txt) {
        try { await S.db.sendMessage(S.me.id, sup.other.id, `${txt}\n\n📎 ${ctxTitle}\n${location.href}`); toast('✓ ' + t('send')); } catch (e) { toast(e.message); }
      }
      d.remove();
    });
  };
  document.body.append(b);
}

// ---------------------------------------------------------------- بعد كل صفحة: العنوان، التركيز، إظهار كلمة المرور
let firstRender = true;
function afterRender(app) {
  const h = app.querySelector('.page-head h1, h1')?.textContent.replace(/\s+/g, ' ').trim();
  document.title = h ? `${h.slice(0, 60)} — سُبُل السلام` : 'سُبُل السلام — منصة تعليم المسلم الجديد';
  if (!firstRender) app.focus({ preventScroll: true });   // قارئ الشاشة يبدأ من أول الصفحة الجديدة
  firstRender = false;
  app.querySelectorAll('input[type=password]:not([data-eye])').forEach((inp) => {
    inp.dataset.eye = 1;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'eye'; b.textContent = '👁'; b.setAttribute('aria-label', 'show password');
    b.onclick = () => { inp.type = inp.type === 'password' ? 'text' : 'password'; b.textContent = inp.type === 'password' ? '👁' : '🙈'; };
    inp.parentElement.classList.add('pw-wrap'); inp.after(b);
  });
}
