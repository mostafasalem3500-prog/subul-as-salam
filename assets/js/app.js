// =====================================================================
//  سُبُل السلام — نقطة البداية والموجّه (Router)
// =====================================================================
import { CONFIG } from './config.js';
import { createDB } from './db.js';
import { S, $, applyUi, esc, toast } from './core.js';
import { t, getUiLang, UI_LANGS } from './i18n.js';

import landing from './views/landing.js';
import * as auth from './views/auth.js';
import * as learn from './views/learn.js';
import * as quran from './views/quran.js';
import * as hadith from './views/hadith.js';
import * as library from './views/library.js';
import * as dawah from './views/dawah.js';
import * as sup from './views/supervisor.js';
import sources from './views/sources.js';
import hub from './views/hub.js';
import * as sp from './views/studentpage.js';

const routes = [
  [/^\/?$/, landing],
  [/^\/login$/, auth.login],
  [/^\/signup$/, auth.signup],
  [/^\/profile$/, auth.profile],
  [/^\/(sw|rw|es|en)$/, hub],
  [/^\/me(?:\/(path|follow|chat|tests))?$/, sp.mePage],
  [/^\/learn$/, () => { location.hash = '#/me'; }],
  [/^\/join\/(\w+)$/, auth.join],
  [/^\/stage\/(s\d+)$/, learn.stage],
  [/^\/item\/(\d+)$/, learn.item],
  [/^\/quiz\/(s\d+)$/, learn.quiz],
  [/^\/quran$/, quran.list],
  [/^\/quran\/(\d+)$/, quran.reader],
  [/^\/hadith$/, hadith.categories],
  [/^\/hadith\/cat\/(\d+)(?:\/(\d+))?$/, hadith.list],
  [/^\/hadith\/(\d+)$/, hadith.one],
  [/^\/library(?:\/(\w+))?(?:\/(\d+))?$/, library.browse],
  [/^\/dawah(?:\/(\w+))?(?:\/([\w-]+))?$/, dawah.corner],
  [/^\/supervisor$/, sup.dashboard],
  [/^\/supervisor\/student\/([\w-]+)(?:\/(path|follow|chat|tests))?$/, sp.supStudentPage],
  [/^\/supervisor\/questions(?:\/(s\d+))?$/, sup.questions],
  [/^\/admin$/, sup.admin],
  [/^\/sources$/, sources],
];

let unreadBadge = 0;
async function refreshBadge() {
  if (!S.me) { unreadBadge = 0; return; }
  const u = await S.db.unread().catch(() => []);
  const n = u.length; if (n !== unreadBadge) { unreadBadge = n; renderNav(); }
}

function renderNav() {
  const me = S.me, isSup = ['supervisor', 'admin'].includes(me?.role);
  const L = CONFIG.languages[S.lang];
  const links = [
    ['#/', t('home')], [`#/${S.lang}`, `🌍 ${esc(L?.name || '')}`],
    ...(me?.role === 'student' ? [['#/me', t('myPage') + (unreadBadge ? ` <span class="chip red tiny">${unreadBadge}</span>` : '')]] : []),
    ['#/quran', t('quran')], ['#/hadith', t('hadith')],
    ['#/library', t('library')], ['#/dawah', t('dawah')],
    ...(isSup ? [['#/supervisor', t('supervisor') + (unreadBadge ? ` <span class="chip red tiny">${unreadBadge}</span>` : '')]] : []),
    ...(me?.role === 'admin' ? [['#/admin', t('admin')]] : []),
    me ? ['#/profile', '👤 ' + esc(me.full_name || me.email.split('@')[0])] : ['#/login', t('login')],
  ];
  const cur = '#' + (location.hash.slice(1).split('/').slice(0, 2).join('/') || '/');
  $('#nav').innerHTML = links.map(([h, l]) => `<a href="${h}"${cur === h || (h !== '#/' && cur.startsWith(h)) ? ' aria-current="page"' : ''}>${l}</a>`).join('') +
    `<select class="lang-pick" id="ui-pick" aria-label="Language">
      ${UI_LANGS.filter((l) => l === 'ar' || l === 'en' || CONFIG.languages[l]?.enabled).map((l) =>
        `<option value="${l}"${getUiLang() === l ? ' selected' : ''}>${l === 'ar' ? 'العربية' : CONFIG.languages[l]?.name || l}</option>`).join('')}
    </select>`;
  $('#ui-pick').onchange = (e) => { applyUi(e.target.value); render(); };
}

function renderFoot() {
  $('#foot').innerHTML = `
    <div class="row between"><b>${esc(CONFIG.brand.nameAr)} · ${esc(CONFIG.brand.nameLatin)}</b>
      <a href="#/sources">${t('sources')}</a></div>
    <div>المحتوى الشرعي يُعرض كما هو من مصادره مع ذكرها:
      <a href="https://islamhouse.com" target="_blank" rel="noopener">IslamHouse.com</a> ·
      <a href="https://quranenc.com" target="_blank" rel="noopener">QuranEnc.com</a> ·
      <a href="https://hadeethenc.com" target="_blank" rel="noopener">HadeethEnc.com</a> ·
      <a href="https://risala.prh.gov.sa" target="_blank" rel="noopener">رسالة الحرمين</a> ·
      <a href="https://qurancomplex.gov.sa" target="_blank" rel="noopener">مجمع الملك فهد</a>
    </div>
    <div class="tiny">${t('sisterSite')}: <a href="${CONFIG.languages.es.sister}" target="_blank" rel="noopener">رفيق الداعية</a></div>`;
}

let renderId = 0;
export async function render() {
  const id = ++renderId;
  const path = location.hash.replace(/^#/, '') || '/';
  const app = $('#app');
  renderNav(); renderFoot();
  if (S.db.mode === 'local') $('#demo-bar').textContent = t('demo');
  $('#nav').classList.remove('open');
  for (const [re, view] of routes) {
    const m = path.match(re);
    if (!m) continue;
    try {
      const out = await view(app, ...m.slice(1));
      if (id !== renderId) return;
      if (typeof out === 'string') app.innerHTML = out;
    } catch (e) {
      console.error(e);
      if (id === renderId) app.innerHTML = `<div class="wrap" style="padding-top:30px"><div class="card"><p>${t('error')}</p><p class="tiny muted">${esc(e.message || e)}</p><button class="btn" onclick="location.reload()">${t('retry')}</button></div></div>`;
    }
    if (!path.includes('#')) window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  app.innerHTML = `<div class="wrap" style="padding-top:30px"><div class="card">404 — <a href="#/">${t('home')}</a></div></div>`;
}

// رابط الدعوة #/join/CODE: يُحفظ الرمز حتى يدخل الطالب ثم يُرسل طلب الربط تلقائيًّا
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
  applyUi();
  if (S.db.mode === 'local') { const b = $('#demo-bar'); b.textContent = t('demo'); b.classList.remove('hidden'); }
  S.db.onChange(async (me) => {
    const was = S.me?.id; S.me = me; applyUi();
    if (me) await processJoin();
    if (was !== me?.id) { if (me && /^#\/(login|signup)?$/.test(location.hash || '#/')) location.hash = ['supervisor', 'admin'].includes(me.role) ? '#/supervisor' : '#/me'; else render(); }
  });
  $('#burger').onclick = () => { const n = $('#nav'); n.classList.toggle('open'); $('#burger').setAttribute('aria-expanded', n.classList.contains('open')); };
  addEventListener('hashchange', render);
  if (S.me) await processJoin();
  setInterval(refreshBadge, 30000); refreshBadge();
  await render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot().catch((e) => { console.error(e); toast('Error: ' + e.message); });
