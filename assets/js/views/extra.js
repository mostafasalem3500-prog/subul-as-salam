// =====================================================================
//  صفحات القسم: الصلاة والوضوء · المرئيات · دليل الكتب · المراجعات
//  كل المحتوى من مصادره: IslamHouse (ملفات الفيديو والكتب)، QuranEnc، رسالة الحرمين
// =====================================================================
import { CONFIG } from '../config.js';
import { IH, ihTypeIcon, attachmentKind, ytId, ytEmbed } from '../api.js';
import { S, esc, toast, loading, reveal, isSup, href, computeProgress, loadStudentData, rafiq } from '../core.js';
import { EXTRA, STAGES } from '../curriculum.js';
import { t, stageTitle } from '../i18n.js';
import { pageHead, needLogin, verseCard } from './components.js';
import { buildQuestions, runQuiz, resultHTML } from './quizengine.js';

const L = () => CONFIG.languages[S.lang];
export const todayKey = (d = new Date()) => d.toLocaleDateString('en-CA');   // YYYY-MM-DD محليًّا
export function isoWeek(d = new Date()) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return `${x.getUTCFullYear()}-W${String(Math.ceil(((x - y0) / 864e5 + 1) / 7)).padStart(2, '0')}`;
}
export const monthKey = (d = new Date()) => d.toLocaleDateString('en-CA').slice(0, 7);

// ---------------------------------------------------------------- بطاقة فيديو (IslamHouse أو يوتيوب)
export function videoCard(id, title = '') {
  return `<div class="card vid-card" data-vid="${esc(id)}"><div class="poster" role="button" tabindex="0" aria-label="${t('watch')}"><span class="play">▶</span></div>
    <div class="body"><b class="vt" dir="auto">${esc(title) || '<span class="skeleton" style="display:block;height:16px;width:70%"></span>'}</b>
    <div class="tiny muted">IslamHouse.com · #${esc(id)}</div></div></div>`;
}
export function ytCard(m) {
  return `<div class="card vid-card" data-yt="${esc(m.url)}"><div class="poster" role="button" tabindex="0" style="background:#000 url('https://i.ytimg.com/vi/${ytId(m.url)}/hqdefault.jpg') center/cover"><span class="play">▶</span></div>
    <div class="body"><b dir="auto">${esc(m.title)}</b><div class="tiny muted">YouTube · ${esc(m.source || '')}${m.status === 'draft' ? ` · <span class="chip gold">${t('draft')}</span>` : ''}</div></div></div>`;
}
export function wireVideos(root) {
  root.querySelectorAll('[data-vid]').forEach(async (c) => {
    let it = null;
    try { it = await IH.item(c.dataset.vid, L().ih); c.querySelector('.vt').textContent = it.title; } catch { c.querySelector('.vt').textContent = '#' + c.dataset.vid; }
    const play = () => {
      const a = (it?.attachments || []).find((x) => ['video', 'youtube'].includes(attachmentKind(x)));
      if (!a) { location.hash = href('item/' + c.dataset.vid); return; }
      c.querySelector('.poster').outerHTML = attachmentKind(a) === 'youtube'
        ? `<iframe src="${esc(ytEmbed(a.url))}" title="YouTube" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`
        : `<video controls autoplay playsinline preload="metadata" src="${esc(a.url)}"></video>`;
    };
    const p = c.querySelector('.poster'); p.onclick = play; p.onkeydown = (e) => { if (e.key === 'Enter') play(); };
  });
  root.querySelectorAll('[data-yt]').forEach((c) => {
    const p = c.querySelector('.poster');
    p.onclick = () => { p.outerHTML = `<iframe src="${esc(ytEmbed(c.dataset.yt))}&autoplay=1" title="YouTube" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>`; };
  });
}

// ---------------------------------------------------------------- الصلاة والوضوء
// أسماء الخطوات بالعربية مع النطق اللاتيني للمصطلح (لا ترجمة)؛ الشرح بلغة الطالب من مرئيات وكتب المصادر
const WUDU = [
  ['💭', 'النية', 'Niyyah', ''], ['﷽', 'التسمية', 'Tasmiyah', ''], ['✋', 'غسل الكفين', 'Ghasl al-kaffayn', '×3'],
  ['💦', 'المضمضة', 'Maḍmaḍah', '×3'], ['🌬️', 'الاستنشاق والاستنثار', 'Istinshāq', '×3'], ['💧', 'غسل الوجه', 'Ghasl al-wajh', '×3'],
  ['💪', 'غسل اليدين إلى المرفقين', 'Ghasl al-yadayn', '×3'], ['↻', 'مسح الرأس', 'Masḥ ar-raʾs', '×1'], ['👂', 'مسح الأذنين', 'Masḥ al-udhunayn', '×1'],
  ['🦶', 'غسل الرجلين إلى الكعبين', 'Ghasl ar-rijlayn', '×3'],
];
const SALAH = [
  ['🕋', 'استقبال القبلة والتكبير', 'Takbīrat al-iḥrām'], ['📖', 'القيام وقراءة الفاتحة', 'Qiyām · al-Fātiḥah'], ['↘️', 'الركوع', 'Rukūʿ'],
  ['⬆️', 'الرفع من الركوع', 'Iʿtidāl'], ['⬇️', 'السجود', 'Sujūd'], ['⏸️', 'الجلوس بين السجدتين', 'Julūs'], ['⬇️', 'السجدة الثانية', 'Sujūd'],
  ['☝️', 'التشهد', 'Tashahhud'], ['↔️', 'التسليم', 'Taslīm'],
];
export const PRAYERS = [
  ['fajr', 'الفجر', 'Fajr', 2, 'linear-gradient(160deg,#2c3e70,#5b6fb0)'], ['dhuhr', 'الظهر', 'Ẓuhr', 4, 'linear-gradient(160deg,#c9a227,#e6c472)'],
  ['asr', 'العصر', 'ʿAṣr', 4, 'linear-gradient(160deg,#d17a22,#e9a85b)'], ['maghrib', 'المغرب', 'Maghrib', 3, 'linear-gradient(160deg,#8e3b5f,#d0605e)'],
  ['isha', 'العشاء', 'ʿIshāʾ', 4, 'linear-gradient(160deg,#0f2537,#23445f)'],
];
export function prayerTrackerHTML(done = new Set(), clickable = false) {
  const d = todayKey();
  return `<div class="prayer-times">${PRAYERS.map(([k, ar, tr, rk, bg]) =>
    `<div class="pt${clickable ? ' check' : ''}${done.has(`pray:${d}:${k}`) ? ' done' : ''}" data-pray="${k}" style="background:${bg}" ${clickable ? 'role="button" tabindex="0"' : ''}>
      <b lang="ar">${ar}</b><span>${tr}</span><div class="rk">${rk}</div><span>${t('rakat')}</span></div>`).join('')}</div>`;
}
export function wirePrayerTracker(root, onChange) {
  root.querySelectorAll('.pt.check').forEach((el) => el.onclick = async () => {
    const key = `pray:${todayKey()}:${el.dataset.pray}`;
    try {
      if (el.classList.contains('done')) { await S.db.unmark(key); el.classList.remove('done'); }
      else { await S.db.markDone(key, 'daily', 'prayer'); el.classList.add('done'); toast('🤲 ' + t('prayerTracker')); }
      onChange?.();
    } catch (e) { toast(e.message); }
  });
}
// خريطة حرارية لآخر 14 يومًا (عدد الصلوات المسجّلة في كل يوم)
export function prayerHeatHTML(progress) {
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return todayKey(d); });
  return `<div class="heat" title="14">${days.map((d) => `<i data-n="${progress.filter((p) => p.item_key.startsWith(`pray:${d}:`)).length}" title="${d}"></i>`).join('')}</div>`;
}

export async function prayer(app) {
  const lang = S.lang, student = S.me?.role === 'student';
  const prog = student ? await S.db.progress().catch(() => []) : [];
  const done = new Set(prog.map((p) => p.item_key));
  const s2 = STAGES[1], s3 = STAGES[2];
  const vids = [...(s2.vid?.[lang] || []), ...(s3.vid?.[lang] || [])];
  const books = [...(s2.ih[lang] || []), ...(s3.ih[lang] || [])];
  app.innerHTML = `${pageHead('💧 ' + t('prayerWudu'), `${t('wudu')} · ${t('prayerSteps')} · ${t('prayerTracker')}`)}
  <div class="wrap stack" style="padding-top:20px">
    <section class="stack"><h2>🕐 ${student ? t('prayerTracker') : t('fivePrayers')}</h2>
      ${prayerTrackerHTML(done, student)}
      ${student ? `<div class="card"><p class="small muted">📅 14</p>${prayerHeatHTML(prog)}</div>` : ''}</section>

    <section class="stack"><h2>💧 ${t('wudu')}</h2>
      <div class="steps-flow">${WUDU.map(([ic, ar, tr, x], i) => `<div class="sf" style="--i:${i}"><span class="n">${i + 1}</span><div class="ic">${ic}</div>
        <div class="ar" lang="ar">${ar}</div><div class="tr" translate="no">${tr}</div>${x ? `<div class="x">${x}</div>` : ''}</div>`).join('')}</div>
      <div id="v56"><div class="skeleton" style="height:90px"></div></div>
    </section>

    <section class="stack"><h2>🕌 ${t('prayerSteps')}</h2>
      <div class="steps-flow">${SALAH.map(([ic, ar, tr], i) => `<div class="sf" style="--i:${i}"><span class="n">${i + 1}</span><div class="ic">${ic}</div>
        <div class="ar" lang="ar">${ar}</div><div class="tr" translate="no">${tr}</div></div>`).join('')}</div>
      <p class="notice small" lang="ar">أسماء الخطوات مصطلحات عربية مع نطقها؛ والشرح المفصّل بلغة الطالب في المرئيات والكتب التالية من إسلام هاوس ورسالة الحرمين.</p>
    </section>

    <section class="stack"><h2>🎬 ${t('watch')}</h2>
      ${vids.length ? `<div class="grid">${vids.map((v) => videoCard(v)).join('')}</div>` : `<p class="muted">${t('noVideos')}</p>`}</section>

    <section class="stack"><h2>📖 ${t('read')}</h2>
      <div class="grid">${books.map((i) => `<a class="card lift item" href="${href('item/' + i)}" data-ih="${i}"><span class="ic">📘</span><span style="min-width:0"><h3 class="skeleton" style="width:80%">&nbsp;</h3><span class="desc"></span></span></a>`).join('')}
        ${s3.haramain?.[lang] ? `<a class="card lift item" href="${s3.haramain[lang]}" target="_blank" rel="noopener"><span class="ic">🕋</span><span><h3>${t('haramain')}</h3><span class="desc">risala.prh.gov.sa</span></span></a>` : ''}</div></section>
  </div>`;
  wireVideos(app); fillItems(app);
  if (student) wirePrayerTracker(app);
  verseCard('5:6').then((h) => { app.querySelector('#v56').innerHTML = h; }).catch(() => { app.querySelector('#v56').remove(); });
}

export function fillItems(root) {
  root.querySelectorAll('[data-ih]').forEach(async (a) => {
    try {
      const it = await IH.item(a.dataset.ih, L().ih);
      a.querySelector('.ic').textContent = ihTypeIcon(it.type);
      const h = a.querySelector('h3'); h.classList.remove('skeleton'); h.style.width = ''; h.textContent = it.title; h.lang = S.lang;
      a.querySelector('.desc').textContent = it.description || '';
    } catch { const h = a.querySelector('h3'); h.classList.remove('skeleton'); h.textContent = 'IslamHouse #' + a.dataset.ih; }
  });
}

// ---------------------------------------------------------------- المرئيات
export async function videos(app) {
  const lang = S.lang;
  const media = await S.db.mediaLinks(lang).catch(() => []);
  app.innerHTML = `${pageHead('🎬 ' + t('videos'), 'IslamHouse.com · ' + esc(L().name), `<a class="btn" href="${href('library/videos')}">${t('allVideos')} ←</a>`)}
  <div class="wrap stack" style="padding-top:20px">
    ${STAGES.map((st, i) => (st.vid?.[lang] || []).length ? `<section class="stack reveal"><h2>${st.icon} ${t('stage')} ${i + 1}: ${esc(stageTitle(st.id))}</h2>
      <div class="grid">${st.vid[lang].map((v) => videoCard(v)).join('')}</div></section>` : '').join('')}
    <section class="stack"><h2>▶️ ${t('mediaBank')} · YouTube</h2>
      ${media.length ? `<div class="grid">${media.map((m) => ytCard(m) + (S.me?.role === 'admin' && m.status === 'draft'
          ? `<div class="row" style="margin-top:-8px"><button class="btn sm primary" data-mok="${m.id}">${t('approve')}</button><button class="btn sm" data-mno="${m.id}">${t('reject')}</button></div>` : '')).join('')}</div>`
        : `<p class="muted small">${t('noVideos')}</p>`}
      ${isSup() ? `<details class="card"><summary><b>➕ ${t('addVideo')}</b></summary>
        <form class="stack" id="mf" style="margin-top:10px">
          <input id="mt" required placeholder="${t('testTitle')}" dir="auto">
          <input id="mu" required dir="ltr" placeholder="https://www.youtube.com/watch?v=…">
          <div class="row"><input id="ms" required placeholder="${t('source')}: IslamHouse / …" style="flex:1"><select id="mst" style="max-width:240px"><option value="">— ${t('stage')} —</option>${STAGES.map((s, i) => `<option value="${s.id}">${i + 1}. ${esc(stageTitle(s.id, 'ar'))}</option>`).join('')}</select></div>
          <p class="tiny muted">${t('youtubeNote')}</p>
          <button class="btn primary">${t('save')}</button></form></details>` : ''}
    </section>
  </div>`;
  reveal(app); wireVideos(app);
  app.querySelector('#mf')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = app.querySelector('#mu').value.trim();
    if (!ytId(url)) return toast('YouTube URL ✗');
    try { await S.db.addMediaLink({ lang, title: app.querySelector('#mt').value.trim(), url, source: app.querySelector('#ms').value.trim(), stage_id: app.querySelector('#mst').value || null }); toast('✓'); videos(app); }
    catch (er) { toast(er.message); }
  });
  app.querySelectorAll('[data-mok],[data-mno]').forEach((b) => b.onclick = async () => { await S.db.approveMediaLink(+(b.dataset.mok || b.dataset.mno), !!b.dataset.mok); videos(app); });
}

// ---------------------------------------------------------------- دليل الكتب
export async function books(app) {
  const lang = S.lang;
  const rq = lang === 'es' ? await rafiq('BOOKS').catch(() => []) : [];
  app.innerHTML = `${pageHead('📚 ' + t('booksGuide'), `IslamHouse.com · ${esc(L().name)}`, `<a class="btn" href="${href('library/books')}">${t('library')} ←</a>`)}
  <div class="wrap stack" style="padding-top:20px">
    ${STAGES.map((st, i) => (st.ih[lang] || []).length || (EXTRA[st.id]?.more?.[lang] || []).length || st.haramain?.[lang] ? `<section class="stack reveal"><h2>${st.icon} ${t('stage')} ${i + 1}: ${esc(stageTitle(st.id))}</h2>
      <div class="grid">${[...(st.ih[lang] || []), ...(EXTRA[st.id]?.more?.[lang] || [])].map((id) => `<a class="card lift item" href="${href('item/' + id)}" data-ih="${id}"><span class="ic">📘</span><span style="min-width:0"><h3 class="skeleton" style="width:80%">&nbsp;</h3><span class="desc"></span></span></a>`).join('')}
      ${st.haramain?.[lang] ? `<a class="card lift item" href="${st.haramain[lang]}" target="_blank" rel="noopener"><span class="ic">🕋</span><span><h3>${t('haramain')}</h3><span class="desc">risala.prh.gov.sa</span></span></a>` : ''}</div></section>` : '').join('')}
    ${rq.length ? `<section class="stack"><h2>📗 دليل كتب «رفيق الداعية»</h2>
      <p class="small muted" lang="ar">مرتّبة حسب حال المحاور، مع ملاحظة المشرف بالعربية.</p>
      ${[...new Set(rq.map((b) => b.lvl))].map((lvl) => `<details class="card"><summary><b>${esc(lvl)}</b> <span class="chip">${rq.filter((b) => b.lvl === lvl).length}</span></summary>
        <div class="stack">${rq.filter((b) => b.lvl === lvl).map((b) => `<a class="row between" href="${href('item/' + b.id)}"><span lang="es" dir="ltr">📘 ${esc(b.t)}</span><span class="tiny muted" lang="ar">${esc(b.note)}</span></a>`).join('')}</div></details>`).join('')}
    </section>` : ''}
  </div>`;
  reveal(app); fillItems(app);
}

// ---------------------------------------------------------------- المراجعات الأسبوعية والشهرية
export async function review(app, kind) {
  if (!S.me) return needLogin();
  app.innerHTML = loading();
  const student = S.me.role === 'student';
  let upto = 2;
  if (student) { const P = computeProgress(S.lang, await loadStudentData(S.me.id)); upto = P.current; }
  const targets = STAGES.slice(0, upto + 1).flatMap((s) => s.quran);
  const extras = STAGES.slice(upto + 1, upto + 3).flatMap((s) => s.quran);
  const bank = (await Promise.all(STAGES.slice(0, upto + 1).map((s) => S.db.questions(s.id, S.lang).catch(() => [])))).flat();
  const weekly = kind === 'weekly';
  const Qs = await buildQuestions({ targets: weekly ? targets.slice(-6) : targets, extras, n: weekly ? 8 : 14, bank, bankN: weekly ? 2 : 6 });
  const id = weekly ? `w:${isoWeek()}` : `m:${monthKey()}`;
  const title = (weekly ? '🔁 ' + t('weekly') : '🗓️ ' + t('monthly')) + ` · ${weekly ? isoWeek() : monthKey()}`;
  runQuiz(app, { title, Qs, onFinish: async (correct, total, details) => {
    const score = student ? await S.db.saveQuiz(id, correct, total, details) : Math.round((correct / total) * 100);
    app.innerHTML = resultHTML(title, score, correct, total, `<a class="btn" href="${href('me/reviews')}">${t('reviews')}</a><a class="btn primary" href="${href('review/' + kind)}">${t('tryAgain')}</a>`);
  } });
}
