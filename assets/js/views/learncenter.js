// الصفحة التعليمية لقسم اللغة — مفتوحة للطالب والمشرف والزائر
import { CONFIG } from '../config.js';
import { HE } from '../api.js';
import { S, esc, reveal, href } from '../core.js';
import { STAGES, SURAHS } from '../curriculum.js';
import { t, stageTitle } from '../i18n.js';
import { pageHead, journeyHTML, drawJourney, qLangDir } from './components.js';
import { videoCard, wireVideos, fillItems, prayerTrackerHTML } from './extra.js';

export default async function learnCenter(app) {
  const lang = S.lang, L = CONFIG.languages[lang];
  const vids = STAGES.slice(0, 3).flatMap((s) => (s.vid?.[lang] || []).slice(0, 2)).slice(0, 4);
  const books = STAGES.slice(0, 6).flatMap((s) => (s.ih[lang] || []).slice(0, 1)).slice(0, 6);
  const juz = [1, 112, 113, 114, 103, 108, 110, 109, 97, 99, 95, 94];
  const chips = [['stages', '🧭', t('stages')], ['prayer', '💧', t('prayerWudu')], ['quran', '📖', t('quran')], ['hadith', '🌿', t('hadith')], ['videos', '🎬', t('videos')], ['books', '📚', t('booksGuide')]];
  app.innerHTML = `${pageHead('📖 ' + t('learnCenter'), `${t('openToAll')} · ${esc(L.ar)} · <span lang="${lang}">${esc(L.name)}</span>`)}
  <div class="wrap stack" style="padding-top:14px">
    <div class="tabs">${chips.map(([id, ic, l]) => `<a class="btn sm" href="javascript:void 0" data-jump="${id}">${ic} ${l}</a>`).join('')}</div>

    <section class="stack" id="sec-stages"><h2>🧭 ${t('stages')}</h2>${journeyHTML(null)}</section>

    <section class="stack reveal" id="sec-prayer"><div class="sec-head"><h2>💧 ${t('prayerWudu')}</h2><a class="btn" href="${href('prayer')}">${t('open')} ←</a></div>
      ${prayerTrackerHTML()}</section>

    <section class="stack reveal" id="sec-quran"><div class="sec-head"><h2>📖 ${t('quran')}</h2><a class="btn" href="${href('quran')}">${t('more')} ←</a></div>
      <div class="surah-list">${juz.map((n) => `<a href="${href('quran/' + n)}"><span class="n">${n}</span><span><b lang="ar" style="font-family:var(--quran);font-size:1.15rem">${esc(SURAHS[n - 1][0])}</b><br><span class="tiny muted">${SURAHS[n - 1][1]}</span></span></a>`).join('')}</div>
      <p class="src">QuranEnc.com · ${L.quran.map(esc).join(' · ')}</p></section>

    <section class="stack reveal" id="sec-hadith"><div class="sec-head"><h2>🌿 ${t('hadith')}</h2><a class="btn" href="${href('hadith')}">${t('more')} ←</a></div>
      <div class="grid" id="hcats"><div class="skeleton" style="height:60px"></div></div></section>

    <section class="stack reveal" id="sec-videos"><div class="sec-head"><h2>🎬 ${t('videos')}</h2><a class="btn" href="${href('videos')}">${t('more')} ←</a></div>
      ${vids.length ? `<div class="grid">${vids.map((v) => videoCard(v)).join('')}</div>` : `<p class="muted">${t('noVideos')}</p>`}</section>

    <section class="stack reveal" id="sec-books"><div class="sec-head"><h2>📚 ${t('booksGuide')}</h2><span class="row"><a class="btn gold" href="${href('saudi')}">🕋 <span lang="ar">المصادر السعودية</span></a><a class="btn" href="${href('books')}">${t('more')} ←</a></span></div>
      <div class="grid">${books.map((id) => `<a class="card lift item" href="${href('item/' + id)}" data-ih="${id}"><span class="ic">📘</span><span style="min-width:0"><h3 class="skeleton" style="width:80%">&nbsp;</h3><span class="desc"></span></span></a>`).join('')}</div></section>
  </div>`;
  reveal(app); drawJourney(app); wireVideos(app); fillItems(app);
  app.querySelectorAll('[data-jump]').forEach((b) => b.onclick = () => app.querySelector('#sec-' + b.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  HE.categories(L.hadeeth).then((cats) => {
    app.querySelector('#hcats').innerHTML = (cats || []).map((c) => `<a class="card lift" href="${href('hadith/cat/' + c.id)}" dir="${qLangDir(lang)}" lang="${lang}" translate="no"><h3>🌿 ${esc(c.title)}</h3><p class="small muted">${esc(c.hadeeths_count)}</p></a>`).join('');
  }).catch(() => { app.querySelector('#hcats').innerHTML = `<p class="muted">${t('error')}</p>`; });
}
