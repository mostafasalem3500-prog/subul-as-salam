// نافذة الطالب: لوحة الرحلة، المحطة، المادة، الاختبار
import { CONFIG } from '../config.js';
import { IH, HE, ihTypeIcon, attachmentKind, ytEmbed } from '../api.js';
import { S, esc, toast, computeProgress, loadStudentData, rafiq, loading } from '../core.js';
import { buildQuestions, runQuiz, resultHTML } from './quizengine.js';
import { STAGES, EXTRA, surahName, allStageSurahs } from '../curriculum.js';
import { t, stageTitle, stageDescAr } from '../i18n.js';
import { pageHead, needLogin, refsSlot, fillRefs, qLangDir } from './components.js';
import { videoCard, wireVideos } from './extra.js';

const L = () => CONFIG.languages[S.lang];
const stageById = (id) => STAGES.find((s) => s.id === id);
const stageOfItem = (id) => STAGES.find((s) => Object.values(s.ih).some((a) => a.includes(+id)) || Object.values(EXTRA[s.id]?.more || {}).some((a) => a.includes(+id)));

async function myProgress() { return computeProgress(S.lang, await loadStudentData(S.me.id)); }

// ---------------------------------------------------------------- صفحة المحطة
export async function stage(app, id) {
  const st = stageById(id); if (!st) return '404';
  const idx = STAGES.indexOf(st);
  const lang = S.lang;
  app.innerHTML = loading();
  const P = S.me?.role === 'student' ? await myProgress() : null;
  const sp = P?.stages[idx];
  const ids = st.ih[lang] || [];
  const ex = EXTRA[st.id] || {}, more = ex.more?.[lang] || [];
  const memo = S.me?.role === 'student' ? await S.db.memo() : [];
  const memoOf = (n) => memo.find((m) => m.kind === 'surah' && m.ref === String(n))?.status;

  app.innerHTML = `
  ${pageHead(`${st.icon} ${t('stage')} ${idx + 1}: ${esc(stageTitle(id))}`,
    `<span lang="ar">${esc(stageTitle(id, 'ar'))} — ${esc(stageDescAr(id))}</span>`,
    sp ? `<div class="ring" style="--p:${sp.pct};--size:92px"><b style="font-size:1.2rem">${sp.pct}<small>%</small></b></div>` : '')}
  <div class="wrap stack" style="padding-top:20px">
    ${sp?.eval ? `<div class="notice sky">🎓 ${t('evaluate')}: <b>${sp.eval.score}/100</b> ${sp.eval.passed ? '· ✅ ' + t('passed') : ''}${sp.eval.notes ? ' — ' + esc(sp.eval.notes) : ''}</div>` : ''}

    <section class="stack">
      <h2>📖 ${t('readItems')}</h2>
      ${ids.length ? `<div class="grid">${ids.map((i) => `<a class="card lift item" href="#/item/${i}" data-ih="${i}"><span class="ic">📘</span><span style="min-width:0"><h3 class="skeleton" style="width:80%">&nbsp;</h3><span class="desc"></span></span></a>`).join('')}</div>`
        : `<p class="notice">${t('noItems')} <a href="#/library">${t('library')}</a></p>`}
      ${st.haramain?.[lang] ? `<a class="card lift item" href="${st.haramain[lang]}" target="_blank" rel="noopener"><span class="ic">🕋</span><span><h3>${t('haramain')}</h3><span class="desc">risala.prh.gov.sa</span></span></a>` : ''}
    </section>

    ${(st.vid?.[lang] || []).length ? `<section class="stack"><h2>🎬 ${t('videos')}</h2>
      <div class="grid">${st.vid[lang].map((v) => videoCard(v)).join('')}</div></section>` : ''}

    <section class="stack">
      <h2>🧠 ${t('memoSurahs')}</h2>
      <div class="grid">${st.quran.map((n) => {
        const s = memoOf(n);
        return `<div class="card row between"><a href="#/quran/${n}" style="text-decoration:none;color:inherit"><b lang="ar" style="font-family:var(--quran);font-size:1.4rem">سورة ${esc(surahName(n))}</b> <span class="chip">${n}</span></a>
          ${s === 'verified' ? `<span class="chip ok">✔ ${t('verified')}</span>` : s === 'memorized' ? `<span class="chip gold">${t('memorized')}</span>` : ''}
          <a class="btn sm primary" href="#/quran/${n}">${t('listen')} · ${t('memorize')}</a></div>`;
      }).join('')}</div>
    </section>

    ${ex.ayat?.length ? `<section class="stack"><h2>✨ <span lang="ar">آيات مختارة للفهم والتدبر</span></h2>${refsSlot(ex.ayat)}</section>` : ''}

    ${more.length ? `<section class="stack"><h2>➕ <span lang="ar">للاستزادة من إسلام هاوس</span> <span class="chip">${more.length}</span></h2>
      <p class="small muted" lang="ar">مواد اختيارية (كتب ومقالات وصوتيات) لا تدخل في نسبة الإنجاز.</p>
      <div class="grid">${more.map((i) => `<a class="card lift item" href="#/item/${i}" data-ih="${i}"><span class="ic">📘</span><span style="min-width:0"><h3 class="skeleton" style="width:80%">&nbsp;</h3><span class="desc"></span></span></a>`).join('')}</div></section>` : ''}

    <section class="stack">
      <h2>🌿 ${t('hadiths')}</h2>
      <div id="hl" class="stack"><div class="skeleton" style="height:50px"></div></div>
    </section>

    <section class="stack" id="newm"></section>

    <div class="card row between" style="background:var(--green-soft)">
      <div><h3>✅ ${t('quiz')}</h3><p class="small muted">${t('pickTranslation')} · ${CONFIG.passScore}%+${sp?.bestQuiz != null ? ` · ${t('score')}: <b>${sp.bestQuiz}</b>` : ''}</p></div>
      <a class="btn primary" href="#/quiz/${id}">${t('quiz')} ←</a>
    </div>
    <div class="row between">
      ${idx > 0 ? `<a class="btn" href="#/stage/${STAGES[idx - 1].id}">→ ${t('stage')} ${idx}</a>` : '<span></span>'}
      ${idx < 11 ? `<a class="btn" href="#/stage/${STAGES[idx + 1].id}">${t('stage')} ${idx + 2} ←</a>` : ''}
    </div>
  </div>`;

  wireVideos(app); fillRefs(app);
  // بطاقات مواد إسلام هاوس
  app.querySelectorAll('[data-ih]').forEach(async (a) => {
    try {
      const it = await IH.item(a.dataset.ih, L().ih);
      const done = P?.done.has('ih:' + a.dataset.ih);
      a.querySelector('.ic').textContent = done ? '✅' : ihTypeIcon(it.type);
      const h = a.querySelector('h3'); h.classList.remove('skeleton'); h.style.width = ''; h.textContent = it.title; h.lang = lang; h.translate = false;
      a.querySelector('.desc').textContent = it.description || '';
    } catch { a.querySelector('h3').classList.remove('skeleton'); a.querySelector('h3').textContent = 'IslamHouse #' + a.dataset.ih; }
  });

  // أحاديث التصنيف
  (async () => {
    const box = app.querySelector('#hl');
    try {
      const r = await HE.list(L().hadeeth, st.hadith, 1 + (idx % 2), 10);
      box.innerHTML = (r.data || []).map((h) => `<a class="card lift" href="#/hadith/${h.id}" dir="${qLangDir(lang)}" lang="${lang}" style="text-decoration:none;color:inherit" translate="no">🌿 ${esc(h.title)}</a>`).join('') +
        `<a class="small" href="#/hadith/cat/${st.hadith}">${t('more')} ←</a> <span class="tiny muted">HadeethEnc.com</span>`;
    } catch { box.innerHTML = `<p class="small muted">${t('error')}</p>`; }
  })();

  // دروس «منهج المسلم الجديد» من رفيق الداعية — للمشرف بالعربية (وبالإسبانية لطلاب الإسبانية)
  if (st.newm?.length) {
    const NEWM = await rafiq('NEWM');
    const ls = st.newm.map((n) => NEWM.find((x) => x.n === n)).filter(Boolean);
    const box = app.querySelector('#newm');
    box.innerHTML = `<h2>🎓 <span lang="ar">دليل المشرف لهذه المحطة</span></h2>
      <p class="small muted" lang="ar">من «منهج المسلم الجديد» في موقع رفيق الداعية. النص المؤلَّف بالعربية${lang === 'es' ? ' والإسبانية' : ''} للمشرف يشرح به؛ والآيات والأحاديث تُعرض بلغة الطالب من مصادرها.</p>
      ${ls.map((c) => `<details class="card"><summary class="row"><span class="num">${c.n}</span><b lang="ar">${esc(c.tar)}</b>${lang === 'es' ? `<span class="muted small" lang="es">· ${esc(c.t)}</span>` : ''}</summary>
        <div class="stack" lang="ar">
          <p class="small"><b>الهدف:</b> ${esc(c.goal)}</p>
          ${lang === 'es' ? `<p lang="es" dir="ltr" style="font-size:1.05rem">${esc(c.es)}</p>` : ''}
          <p>${esc(c.ar)}</p>
          <p class="notice small"><b>تمرين:</b> ${esc(c.practice.ar)}${lang === 'es' ? `<br><span lang="es" dir="ltr">${esc(c.practice.es)}</span>` : ''}</p>
          ${refsSlot(c.q, c.h)}
        </div></details>`).join('')}`;
    box.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => d.open && fillRefs(d), { once: true }));
  }
}

// ---------------------------------------------------------------- مادة من إسلام هاوس
export async function item(app, id) {
  const lang = S.lang;
  app.innerHTML = loading();
  const it = await IH.item(id, L().ih);
  const st = stageOfItem(id);
  const P = S.me?.role === 'student' ? await myProgress() : null;
  const done = P?.done.has('ih:' + id);
  const att = (it.attachments || []).sort((a, b) => a.order - b.order);
  const by = (it.prepared_by || []).filter((p) => p.title).map((p) => `${esc(p.title)}${p.kind ? ` <span class="tiny muted">(${esc(p.kind)})</span>` : ''}`).join(' · ');
  app.innerHTML = `
  ${pageHead(`<span lang="${lang}" translate="no">${ihTypeIcon(it.type)} ${esc(it.title)}</span>`, by)}
  <div class="wrap stack" style="padding-top:20px" dir="${qLangDir(lang)}">
    ${it.image ? `<img src="${esc(it.image)}" alt="" style="max-height:260px;border-radius:12px;object-fit:contain">` : ''}
    ${it.description ? `<div class="card" lang="${lang}" translate="no">${esc(it.description)}</div>` : ''}
    <div class="stack">${att.map((a) => {
      const k = attachmentKind(a), u = esc(a.url);
      if (k === 'audio') return `<div class="attach"><span>🎧 ${esc(a.description || '')} <span class="tiny muted">${esc(a.size || '')}</span></span><audio controls preload="none" src="${u}"></audio></div>`;
      if (k === 'video') return `<div class="attach"><video controls preload="metadata" playsinline src="${u}"></video></div>`;
      if (k === 'youtube') return `<div class="attach vid-card"><iframe src="${esc(ytEmbed(a.url))}" title="YouTube" loading="lazy" allowfullscreen allow="encrypted-media; picture-in-picture"></iframe></div>`;
      if (k === 'pdf') return `<div class="attach"><span>📄 ${esc(a.description || 'PDF')} <span class="tiny muted">${esc(a.size || '')}</span></span>
        <span class="row"><a class="btn sm primary" href="${u}" target="_blank" rel="noopener">${t('open')}</a><a class="btn sm" href="${u}" download>${t('download')}</a></span>
        ${matchMedia('(min-width: 900px)').matches ? `<iframe class="pdf-frame" src="${u}" title="PDF" loading="lazy"></iframe>` : ''}</div>`;
      return `<div class="attach"><span>📎 ${esc(a.description || a.extension_type)}</span><a class="btn sm" href="${u}" target="_blank" rel="noopener">${t('open')}</a></div>`;
    }).join('')}</div>
    <p class="src">${t('source')}: <a href="${IH.pageUrl(id, L().ih)}" target="_blank" rel="noopener">IslamHouse.com</a> — #${esc(id)}. يُعرض كما هو دون تعديل.</p>
    ${S.me?.role === 'student' ? `<div class="row"><button class="btn ${done ? 'done' : 'primary'}" id="mk">${done ? '✓ ' + t('done') : t('markDone')}</button>
      ${st ? `<a class="btn" href="#/stage/${st.id}">${st.icon} ${esc(stageTitle(st.id))}</a>` : ''}</div>` : ''}
  </div>`;
  app.querySelector('#mk')?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    if (b.classList.contains('done')) { await S.db.unmark('ih:' + id); b.className = 'btn primary'; b.textContent = t('markDone'); return; }
    await S.db.markDone('ih:' + id, st?.id || 'extra', 'read');
    b.className = 'btn done'; b.textContent = '✓ ' + t('done'); toast('✓ ' + t('done'));
  });
}

// ---------------------------------------------------------------- اختبار المحطة
export async function quiz(app, id) {
  if (!S.me) return needLogin();
  const practice = S.me.role !== 'student';   // المشرف يجرّب الاختبار دون حفظ
  const st = stageById(id), idx = STAGES.indexOf(st);
  app.innerHTML = loading();
  const extras = idx > 0 ? allStageSurahs(idx - 1).slice(-6) : STAGES[1].quran;
  const bank = await S.db.questions(id, S.lang).catch(() => []);
  const Qs = await buildQuestions({ targets: st.quran, extras, n: Math.min(6, 2 + st.quran.length * 3), bank });
  const title = `✅ ${t('quiz')}: ${esc(stageTitle(id))}`;
  runQuiz(app, { title, Qs, onFinish: async (correct, total, details) => {
    const score = practice ? Math.round((correct / total) * 100) : await S.db.saveQuiz(id, correct, total, details);
    const pass = score >= CONFIG.passScore;
    app.innerHTML = resultHTML(esc(stageTitle(id)), score, correct, total,
      `<a class="btn" href="#/stage/${id}">${t('back')}</a>` +
      (pass && idx < 11 ? `<a class="btn primary" href="#/stage/${STAGES[idx + 1].id}">${t('stage')} ${idx + 2} ←</a>` : `<a class="btn primary" href="#/quiz/${id}">${t('tryAgain')}</a>`));
    app.querySelectorAll('a[href^="#/"]').forEach((a) => a.setAttribute('href', `#/${S.lang}/` + a.getAttribute('href').slice(2)));
  } });
}
