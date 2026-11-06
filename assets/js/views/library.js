// مكتبة إسلام هاوس بلغة الطالب — مباشرة من IslamHouse API
import { CONFIG } from '../config.js';
import { IH, ihTypeIcon } from '../api.js';
import { S, esc, loading } from '../core.js';
import { t } from '../i18n.js';
import { pageHead, qLangDir } from './components.js';

const TYPES = ['showall', 'books', 'articles', 'audios', 'videos', 'poster', 'fatwa', 'khotab'];
const label = (k) => (k === 'showall' ? t('all') : t(k) !== k ? t(k) : k);

export async function browse(app, type = 'books', pageStr = '1') {
  const lang = CONFIG.languages[S.lang].ih, page = +pageStr || 1, per = 25;
  app.innerHTML = loading();
  let blocks = [];
  try { const sc = await IH.siteContent(lang); blocks = (sc.data || sc).filter?.((b) => TYPES.includes(b.block_name) && b.items_count > 0) || []; } catch { /* نكمل */ }
  if (!blocks.find((b) => b.block_name === type)) type = blocks[0]?.block_name || 'books';
  const count = blocks.find((b) => b.block_name === type)?.items_count || 0;
  const pages = Math.max(1, Math.ceil(count / per));
  const r = await IH.list(type, lang, page, per);
  const items = r.data || [];
  const isSup = ['supervisor', 'admin'].includes(S.me?.role);
  app.innerHTML = `${pageHead('📚 ' + t('library'), `IslamHouse.com · ${esc(CONFIG.languages[S.lang].name)}`)}
  <div class="wrap" style="padding-top:12px">
    <div class="tabs">${blocks.map((b) => `<a class="btn sm" href="#/library/${b.block_name}" aria-pressed="${b.block_name === type}">${ihTypeIcon(b.block_name)} ${label(b.block_name)} <span class="tiny">${b.items_count}</span></a>`).join('')}</div>
    <div class="grid">${items.map((it) => `<a class="card lift item" href="#/item/${it.id}" dir="${qLangDir(S.lang)}">
      ${it.image ? `<img class="thumb" src="${esc(it.image)}" alt="" loading="lazy">` : `<span class="ic">${ihTypeIcon(it.type)}</span>`}
      <span style="min-width:0"><h3 lang="${S.lang}" translate="no">${esc(it.title)}</h3><span class="desc" translate="no">${esc(it.description || '')}</span>
      ${isSup ? `<span class="chip sky tiny" dir="ltr">#${it.id}</span>` : ''}</span></a>`).join('')}</div>
    <div class="row between" style="margin-top:18px">
      ${page > 1 ? `<a class="btn" href="#/library/${type}/${page - 1}">→</a>` : '<span></span>'}
      <span class="small muted">${page} / ${pages}</span>
      ${page < pages ? `<a class="btn" href="#/library/${type}/${page + 1}">${t('more')} ←</a>` : '<span></span>'}
    </div>
    ${isSup ? `<p class="notice small" lang="ar" style="margin-top:14px">للمشرف: الرقم بجانب كل مادة هو ما يُضاف إلى ملف <code>assets/js/curriculum.js</code> لإدراج المادة في محطة.</p>` : ''}
    <p class="src">${t('source')}: <a href="https://islamhouse.com/${lang}/" target="_blank" rel="noopener">IslamHouse.com</a></p>
  </div>`;
}
