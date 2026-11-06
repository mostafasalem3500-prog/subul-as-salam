// الحديث النبوي من موسوعة الأحاديث المترجمة HadeethEnc.com — بالنص والدرجة والشرح كما هي
import { CONFIG } from '../config.js';
import { HE } from '../api.js';
import { S, esc, toast, loading } from '../core.js';
import { t } from '../i18n.js';
import { pageHead, qLangDir } from './components.js';

const hl = () => CONFIG.languages[S.lang].hadeeth;
const dir = () => qLangDir(S.lang);
const cred = (id) => `<p class="src">${t('source')}: <a href="${HE.pageUrl(hl(), id ?? '')}" target="_blank" rel="noopener">HadeethEnc.com</a> — موسوعة الأحاديث النبوية المترجمة. تُعرض كما هي دون تعديل.</p>`;

export async function categories(app) {
  app.innerHTML = loading();
  const cats = await HE.categories(hl());
  app.innerHTML = `${pageHead('🌿 ' + t('hadith'), '<span lang="ar">الأحاديث مع ترجمتها وشرحها ودرجتها، بلغة الطالب.</span>')}
  <div class="wrap" style="padding-top:20px"><div class="grid">${(cats || []).map((c) => `
    <a class="card lift" href="#/hadith/cat/${c.id}" dir="${dir()}" lang="${S.lang}" translate="no"><h3>🌿 ${esc(c.title)}</h3><p class="small muted">${esc(c.hadeeths_count)}</p></a>`).join('')}</div>${cred()}</div>`;
}

export async function list(app, cat, pageStr = '1') {
  const page = +pageStr || 1;
  app.innerHTML = loading();
  const r = await HE.list(hl(), cat, page, 20);
  const last = +r.meta?.last_page || 1;
  app.innerHTML = `${pageHead('🌿 ' + t('hadith'), `${page} / ${last}`)}
  <div class="wrap stack" style="padding-top:20px">
    ${(r.data || []).map((h) => `<a class="card lift" href="#/hadith/${h.id}" dir="${dir()}" lang="${S.lang}" translate="no" style="text-decoration:none;color:inherit">${esc(h.title)}</a>`).join('')}
    <div class="row between">${page > 1 ? `<a class="btn" href="#/hadith/cat/${cat}/${page - 1}">→</a>` : '<span></span>'}${page < last ? `<a class="btn" href="#/hadith/cat/${cat}/${page + 1}">${t('more')} ←</a>` : ''}</div>
    ${cred()}
  </div>`;
}

export async function one(app, id) {
  app.innerHTML = loading();
  const h = await HE.one(hl(), id);
  const memo = S.me?.role === 'student' ? await S.db.memo() : [];
  const ms = memo.find((m) => m.kind === 'hadith' && m.ref === String(id))?.status;
  const list = (a) => Array.isArray(a) && a.length ? `<ul class="steps">${a.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  app.innerHTML = `${pageHead(`<span dir="${dir()}" lang="${S.lang}" translate="no">${esc(h.title)}</span>`)}
  <div class="wrap stack" style="padding-top:20px">
    ${h.hadeeth_ar ? `<div class="card" lang="ar" dir="rtl" style="font-family:Amiri,serif;font-size:1.35rem;line-height:2.1" translate="no">${esc(h.hadeeth_ar)}</div>` : ''}
    <div class="card stack" dir="${dir()}" lang="${S.lang}" translate="no">
      <p style="font-size:1.12rem"><b>${esc(h.hadeeth)}</b></p>
      <p class="small"><span class="chip">${esc(h.grade || '')}</span> <span class="muted">${esc(h.attribution || '')}</span></p>
    </div>
    ${h.explanation ? `<div class="card stack" dir="${dir()}" lang="${S.lang}" translate="no"><h3>${t('explanation')}</h3><p>${esc(h.explanation)}</p>${list(h.hints)}</div>` : ''}
    ${S.me?.role === 'student' ? `<div class="card row between"><span>${ms === 'verified' ? '✔ ' + t('verified') : ms === 'memorized' ? '⭐ ' + t('memorized') : t('memorize')}</span>
      <button class="btn sm primary" id="hm">⭐ ${t('memorized')}</button></div>` : ''}
    ${cred(id)}
  </div>`;
  app.querySelector('#hm')?.addEventListener('click', async () => { await S.db.setMemo('hadith', id, 'memorized'); toast('⭐ ' + t('memorized')); });
}
