// =====================================================================
//  الصفحة الرئيسية لقسم اللغة (#/es · #/en · #/sw · #/rw)
//  الشعار، والآية، وثلاثة أبواب: الصفحة التعليمية · الدخول · الاشتراك
//  ثم ما يجده الطالب وما يجده المشرف، وإحصاءات حيّة، وخريطة الرحلة.
// =====================================================================
import { CONFIG } from '../config.js';
import { IH, QE } from '../api.js';
import { S, esc, toast, reveal, isSup, linkify, href } from '../core.js';
import { t } from '../i18n.js';
import { journeyHTML, drawJourney, ayahMark, refsSlot, fillRefs } from './components.js';

export function countUp(root) {
  root.querySelectorAll('[data-to]').forEach((el) => {
    const to = +el.dataset.to; if (!to) return;
    const t0 = performance.now(), dur = 1400;
    const step = (now) => { const p = Math.min(1, (now - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en'); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

export default async function langHome(app) {
  const code = S.routeLang, L = CONFIG.languages[code];
  const me = S.me, student = me?.role === 'student', sup = isSup();
  const feat = (ic, title, sub) => `<div class="feature reveal"><span class="fi">${ic}</span><span><b>${title}</b><br><span class="small muted">${sub}</span></span></div>`;

  app.innerHTML = `
  <section class="hero pattern">
    <svg class="bg-star" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#e0bd5f" stroke-width=".6"><rect x="20" y="20" width="60" height="60"/><rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)"/><circle cx="50" cy="50" r="18"/><circle cx="50" cy="50" r="42"/></g></svg>
    <div class="wrap" style="grid-template-columns:1fr">
      <div>
        <div class="row"><img src="assets/img/logo.svg" alt="" width="64" height="64" style="border-radius:16px;box-shadow:0 10px 30px rgb(0 0 0 / .3)">
          <span class="chip gold">${esc(L.ar)} · <span lang="${code}">${esc(L.name)}</span></span></div>
        <h1 style="margin-top:14px">${esc(CONFIG.brand.nameAr)} <span class="latin" style="display:inline;font-size:.45em">· ${esc(L.name)}</span></h1>
        <p class="lead">${t('tagline')}</p>
        <div class="verse" id="hv" style="max-width:860px"><div class="skeleton" style="height:56px;opacity:.3"></div></div>
        <div class="doors">
          <a class="door" href="${href('learn')}"><span class="di">📖</span><span><b>${t('learnCenter')}</b><small>${t('openToAll')}</small></span></a>
          ${me
            ? `<a class="door" href="${student ? href('me/today') : sup ? href('supervisor') : href('profile')}"><span class="di">${student ? '🌱' : '🎓'}</span><span><b>${student ? t('studentArea') : t('supArea')}</b><small>${esc(me.full_name || me.email)}</small></span></a>
               <a class="door" href="${href('profile')}"><span class="di">👤</span><span><b>${esc(me.full_name || me.email.split('@')[0])}</b><small>${t('logout')} · ${t('save')}</small></span></a>`
            : `<a class="door" href="${href('login')}"><span class="di">🔐</span><span><b>${t('login')}</b><small>${t('student')} · ${t('supervisorRole')}</small></span></a>
               <a class="door" href="${href('signup')}"><span class="di">✨</span><span><b>${t('signup')}</b><small>${t('start')}</small></span></a>`}
        </div>
      </div>
    </div>
  </section>

  <div class="wrap stack" style="padding-top:26px">
    <div class="stats reveal">
      <div class="stat"><b data-to="0" id="st-ih">…</b><span>IslamHouse · ${esc(L.name)}</span></div>
      <div class="stat"><b data-to="0" id="st-vid">…</b><span>${t('videos')}</span></div>
      <div class="stat"><b data-to="12">12</b><span>${t('stages')}</span></div>
      <div class="stat"><b data-to="6236">6236</b><span>${t('quran')}</span></div>
    </div>

    <div class="grid-2" style="margin-top:10px">
      <section class="feature-col">
        <div class="sec-head"><div><span class="kicker">${t('studentArea')}</span><h2>🌱 ${t('forStudents')}</h2></div></div>
        ${feat('☀️', t('dailyLesson'), `${t('read')} · ${t('listen')} · ${t('memorize')} · ${t('hadithDay')}`)}
        ${feat('🧭', t('curriculum'), `12 ${t('stages')} · ${t('quiz')}`)}
        ${feat('💧', t('prayerWudu'), `${t('wudu')} · ${t('prayerSteps')} · ${t('prayerTracker')}`)}
        ${feat('🎬', t('videos'), 'IslamHouse.com')}
        ${feat('🔁', t('reviews'), `${t('weekly')} · ${t('monthly')}`)}
        ${feat('🧭', '<span lang="ar">المسارات الموضوعية</span>', `<a href="${href('tracks')}">8 · IslamHouse</a> · <a href="${href('saudi')}">🕋 <span lang="ar">المصادر السعودية</span></a>`)}
        ${feat('💬', t('chat'), `${t('tests')} · ${t('follow')}`)}
      </section>
      <section class="feature-col">
        <div class="sec-head"><div><span class="kicker">${t('supArea')}</span><h2>🎓 ${t('forSupervisors')}</h2></div></div>
        ${feat('👥', t('students'), `${t('requests')} · ${t('follow')} · ${t('evaluate')}`)}
        ${feat('🃏', t('cards'), `${t('makeCard')} · ${t('words')}`)}
        ${feat('🧭', t('guide'), 'رفيق الداعية · 20 + 12 + 25')}
        ${feat('🗣️', t('langLearn'), `${esc(L.name)} · ${t('explorer')}`)}
        ${feat('📚', t('material'), `${t('booksGuide')} · ${t('library')} · ${t('videos')}`)}
        ${feat('📝', t('tests'), `${t('questions')} · ${t('chat')}`)}
      </section>
    </div>
    ${student ? '' : `<a class="lc-band reveal" href="${href('lang')}" dir="rtl" lang="ar">
      <span class="lc-band-ic">🗣️</span>
      <span class="grow"><span class="kicker">للمشرف والداعية</span><b>تعلّم ${esc(L.ar)} من الحروف إلى الإتقان</b>
        <small>الأصوات · التحيات · القواعد · محادثات الدعوة · المصطلحات الشرعية من الترجمة المعتمدة · بطاقات مراجعة واختبارات</small>
        <span class="lc-band-steps" dir="ltr">${['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((c) => `<i>${c}</i>`).join('')}</span></span>
      <span class="btn gold">ابدأ ←</span></a>`}

    <section class="stack reveal"><div class="sec-head"><div><span class="kicker">${t('curriculum')}</span><h2>${t('stages')}</h2></div>
      <a class="btn" href="${href('learn')}">${t('learnCenter')} ←</a></div>${journeyHTML(null)}</section>

    <section class="stack reveal" id="bank"><div class="sec-head"><div><span class="kicker">${esc(L.name)}</span><h2>💌 ${t('msgBank')}</h2>
      <p class="muted small" lang="ar">رسائل قصيرة يكتبها فريق هذه اللغة من المتحدثين الأصليين مع مراجعها، ويعتمدها المدير قبل ظهورها. لا ترجمة آلية.</p></div></div>
      <div id="bank-box"></div></section>
  </div>`;
  reveal(app); drawJourney(app);

  (async () => {
    const el = app.querySelector('#hv');
    try {
      const { sura, aya } = CONFIG.brand.verseRef;
      const r = await QE.aya(L.quran[0], sura, aya);
      el.innerHTML = `<div class="q" lang="ar" translate="no">${esc(r.arabic_text)} ${ayahMark(r.aya)}</div>
        <div class="tr" dir="${L.dir}" lang="${code}" translate="no">${esc(r.translation)}</div><div class="ref">المائدة ${sura}:${aya} · QuranEnc — ${esc(L.quran[0])}</div>`;
    } catch { el.remove(); }
  })();
  IH.siteContent(L.ih).then((sc) => {
    const blocks = sc.data || sc;
    const set = (id, n) => { const e = app.querySelector(id); if (e && n) { e.dataset.to = n; } };
    set('#st-ih', blocks.find?.((b) => b.block_name === 'showall')?.items_count);
    set('#st-vid', blocks.find?.((b) => b.block_name === 'videos')?.items_count);
    countUp(app);
  }).catch(() => {});
  messageBank(app.querySelector('#bank-box'), code);
}

// بنك الرسائل الدعوية لكل لغة (يُستعمل هنا وفي صفحة المشرف)
export async function messageBank(box, code) {
  const L = CONFIG.languages[code];
  box.innerHTML = `<div id="bank-list" class="stack"><div class="skeleton" style="height:60px"></div></div>
    ${isSup() ? `<details class="card"><summary><b>➕ ${t('addMessage')}</b></summary>
      <form class="stack" id="bf" style="margin-top:10px">
        <input id="bt" required placeholder="العنوان / Title" dir="auto">
        <textarea id="bb" required placeholder="${esc(L.name)}…" lang="${code}" dir="${L.dir}"></textarea>
        <textarea id="ba" placeholder="المعنى بالعربية (للمراجعة)" lang="ar" dir="rtl"></textarea>
        <div class="row"><input id="bq" dir="ltr" placeholder="Quran: 2:255, 112:1-4" style="flex:1"><input id="bh" dir="ltr" placeholder="HadeethEnc: 5795, 66512" style="flex:1"></div>
        <button class="btn primary">${t('save')} (${t('draft')})</button></form></details>` : ''}`;
  const draw = async () => {
    const list = await S.db.dawahMessages(code).catch(() => []);
    const lb = box.querySelector('#bank-list');
    lb.innerHTML = list.length ? list.map((m) => `<details class="card"><summary class="row between"><b dir="auto">${esc(m.title)}</b>
        ${m.status === 'draft' ? `<span class="chip gold">${t('draft')}</span>` : ''}</summary>
      <div class="stack"><p lang="${code}" dir="${L.dir}" style="font-size:1.05rem">${linkify(m.body)}</p>${m.ar ? `<p class="small muted" lang="ar" dir="rtl">${esc(m.ar)}</p>` : ''}
        <div class="row"><button class="btn sm" data-cp="${m.id}">📋 ${t('copy')}</button>
          <a class="btn sm" href="https://wa.me/?text=${encodeURIComponent(m.body)}" target="_blank" rel="noopener">WhatsApp</a>
          ${S.me?.role === 'admin' && m.status === 'draft' ? `<button class="btn sm primary" data-ok="${m.id}">${t('approve')}</button><button class="btn sm" data-no="${m.id}">${t('reject')}</button>` : ''}
          ${S.me && (m.author_id === S.me.id || S.me.role === 'admin') ? `<button class="btn sm ghost" data-del="${m.id}">🗑</button>` : ''}</div>
        ${refsSlot(m.q || [], m.h || [])}</div></details>`).join('')
      : `<p class="card muted" lang="ar">لا رسائل معتمدة بعد بهذه اللغة.${isSup() ? ' أضف أول رسالة من النموذج أدناه.' : ''}</p>`;
    lb.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => d.open && fillRefs(d)));
    lb.querySelectorAll('[data-cp]').forEach((b) => b.onclick = () => { navigator.clipboard?.writeText(list.find((m) => String(m.id) === b.dataset.cp).body); toast(t('copied')); });
    lb.querySelectorAll('[data-ok],[data-no]').forEach((b) => b.onclick = async () => { await S.db.approveDawahMessage(+(b.dataset.ok || b.dataset.no), !!b.dataset.ok); draw(); });
    lb.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { await S.db.deleteDawahMessage(+b.dataset.del); draw(); });
  };
  draw();
  box.querySelector('#bf')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (id) => box.querySelector(id).value.trim();
    const split = (x) => x.split(/[,\s،]+/).map((y) => y.trim()).filter(Boolean);
    try {
      await S.db.addDawahMessage({ lang: code, title: v('#bt'), body: v('#bb'), ar: v('#ba') || null, q: split(v('#bq')), h: split(v('#bh')) });
      e.target.reset(); toast('✓ ' + t('draft')); draw();
    } catch (er) { toast(er.message); }
  });
}
