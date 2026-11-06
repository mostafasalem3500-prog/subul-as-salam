// =====================================================================
//  صفحة اللغة الأساسية (#/sw · #/rw · #/es) — يدخلها الطالب والمشرف والزائر
//  تجمع كل ما في المنصة لهذه اللغة: المنهج، القرآن، الحديث، المكتبة،
//  ركن الداعية، وبنك الرسائل الدعوية الذي يكتبه فريق اللغة ويعتمده المدير.
// =====================================================================
import { CONFIG } from '../config.js';
import { IH, QE } from '../api.js';
import { S, esc, toast, reveal, applyUi, isSup, linkify } from '../core.js';
import { t, tIn } from '../i18n.js';
import { DAWAH_WORDS } from '../dawah-words.js';
import { journeyHTML, drawJourney, ayahMark, refsSlot, fillRefs } from './components.js';
import { render } from '../app.js';

const tile = (href, ic, title, sub, ext = false) => `<a class="card lift item" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>
  <span class="ic">${ic}</span><span style="min-width:0"><h3>${title}</h3><span class="desc">${sub}</span></span></a>`;

export default async function hub(app, code) {
  const L = CONFIG.languages[code];
  if (!L) return '404';
  if (!L.enabled) return `<div class="wrap" style="padding-top:30px"><div class="card center"><h2>${esc(L.name)}</h2><p>${t('soon')}</p></div></div>`;
  const student = S.me?.role === 'student';
  if (!student && S.lang !== code) { localStorage.setItem('subul-lang', code); applyUi(); return render(); }
  const mismatch = student && S.me.lang !== code;
  const words = DAWAH_WORDS[code]?.cards.length || 0;

  app.innerHTML = `
  <section class="hero pattern"><div class="wrap">
    <div>
      <span class="chip gold">${t('langHub')} · ${esc(L.ar)}</span>
      <h1 style="margin-top:10px;font-family:var(--lat)">${esc(L.name)}</h1>
      <p class="lead" lang="${code}">${esc(tIn(code, 'tagline'))}</p>
      <div class="verse" id="hv"><div class="skeleton" style="height:56px;opacity:.3"></div></div>
      <div class="cta">
        ${!S.me ? `<a class="btn gold" href="#/signup">${t('start')}</a><a class="btn ghost" style="color:#fff;border-color:rgb(255 255 255 / .4)" href="#/login">${t('login')}</a>`
          : student ? `<a class="btn gold" href="#/me">${t('myPage')} ←</a>`
          : `<a class="btn gold" href="#/supervisor">${t('supervisor')} ←</a>`}
      </div>
    </div>
    <div class="lang-cards">
      ${Object.entries(CONFIG.languages).map(([c, X]) => `<a class="lang-card" href="#/${c}" aria-disabled="${!X.enabled}" ${c === code ? 'style="outline:2px solid var(--gold-2)"' : ''}>
        <span class="code">${c}</span><span><b>${esc(X.name)}</b><span class="meta" lang="ar">${esc(X.ar)}${X.enabled ? '' : ' · ' + t('soon')}</span></span></a>`).join('')}
    </div>
  </div></section>

  <div class="wrap stack" style="padding-top:22px">
    ${mismatch ? `<div class="notice row between"><span lang="ar">لغة تعلّمك الحالية: <b>${esc(CONFIG.languages[S.me.lang]?.name || S.me.lang)}</b>.</span>
       <button class="btn sm primary" id="sw-lang">${t('switchLang')}: ${esc(L.name)}</button></div>` : ''}

    <section class="stack reveal"><div class="sec-head"><div><span class="kicker">${t('forStudents')}</span><h2>🌱 ${t('curriculum')} · ${t('quran')} · ${t('hadith')}</h2></div></div>
      <div class="grid">
        ${tile(S.me && student ? '#/me' : '#/signup', '🧭', t('myPage'), `${t('curriculum')} · ${t('follow')} · ${t('chat')} · ${t('tests')}`)}
        ${tile('#/quran', '📖', t('quran'), `QuranEnc · ${L.quran.map(esc).join(' · ')}`)}
        ${tile('#/hadith', '🌿', t('hadith'), 'HadeethEnc.com')}
        ${tile('#/library', '📚', t('library'), `IslamHouse · <span data-ihc>…</span>`)}
      </div>
    </section>

    <section class="stack reveal"><div class="sec-head"><div><span class="kicker">${t('forSupervisors')}</span><h2>🤝 ${t('dawah')}</h2></div></div>
      <div class="grid">
        ${words ? tile('#/dawah/words', '🗝️', t('words'), `${words} · ${t('inContext')}`) : ''}
        ${tile('#/dawah/train', '🎓', 'دروس الداعية', '20 درسًا تدريبيًّا — رفيق الداعية')}
        ${tile('#/dawah/course', '🌱', 'اكتشف الإسلام', '12 لقاءً قبل الشهادة')}
        ${tile('#/dawah/guide', '🧭', 'دليل الداعية', 'الإخلاص، آداب الحوار، الإحالة')}
        ${code === 'es' ? tile('#/dawah/msg', '💬', '1000 mensajes', 'رسائل رفيق الداعية الجاهزة') + tile(L.sister, '🇪🇸', 'رفيق الداعية — الموقع الأساسي', esc(L.sister.replace('https://', '')), true) : ''}
        ${isSup() ? tile('#/supervisor', '🎓', t('supervisor'), `${t('students')} · ${t('requests')}`) : ''}
      </div>
    </section>

    <section class="stack reveal" id="bank"><div class="sec-head"><div><span class="kicker">${esc(L.name)}</span><h2>💌 ${t('msgBank')}</h2>
      <p class="muted small" lang="ar">رسائل قصيرة يكتبها فريق هذه اللغة من المتحدثين الأصليين، ويذكر معها مراجعها، ثم يعتمدها المدير قبل ظهورها للجميع. لا ترجمة آلية.</p></div></div>
      <div id="bank-list" class="stack"><div class="skeleton" style="height:60px"></div></div>
      ${isSup() ? `<details class="card"><summary><b>➕ ${t('addMessage')}</b></summary>
        <form class="stack" id="bf" style="margin-top:10px">
          <input id="bt" required placeholder="العنوان / Title" dir="auto">
          <textarea id="bb" required placeholder="${esc(L.name)}…" lang="${code}" dir="${L.dir}"></textarea>
          <textarea id="ba" placeholder="المعنى بالعربية (للمراجعة)" lang="ar" dir="rtl"></textarea>
          <div class="row"><input id="bq" dir="ltr" placeholder="Quran: 2:255, 112:1-4" style="flex:1"><input id="bh" dir="ltr" placeholder="HadeethEnc: 5795, 66512" style="flex:1"></div>
          <button class="btn primary">${t('save')} (${t('draft')})</button></form></details>` : ''}
    </section>

    <section class="stack"><h2>${t('stages')}</h2>${journeyHTML(null)}</section>
  </div>`;
  reveal(app); drawJourney(app);

  app.querySelector('#sw-lang')?.addEventListener('click', async () => { await S.db.updateMe({ lang: code }); localStorage.removeItem('subul-ui'); applyUi(); toast('✓'); render(); });

  // الآية من QuranEnc بلغة الصفحة
  (async () => {
    const el = app.querySelector('#hv');
    try {
      const { sura, aya } = CONFIG.brand.verseRef;
      const r = await QE.aya(L.quran[0], sura, aya);
      el.innerHTML = `<div class="q" lang="ar" translate="no">${esc(r.arabic_text)} ${ayahMark(r.aya)}</div>
        <div class="tr" dir="${L.dir}" lang="${code}" translate="no">${esc(r.translation)}</div><div class="ref">المائدة ${sura}:${aya} · QuranEnc — ${esc(L.quran[0])}</div>`;
    } catch { el.remove(); }
  })();
  IH.siteContent(L.ih).then((sc) => { const n = (sc.data || sc).find?.((b) => b.block_name === 'showall')?.items_count; app.querySelectorAll('[data-ihc]').forEach((e) => e.textContent = n || ''); }).catch(() => {});

  // بنك الرسائل
  const drawBank = async () => {
    const box = app.querySelector('#bank-list');
    const list = await S.db.dawahMessages(code).catch(() => []);
    box.innerHTML = list.length ? list.map((m) => `<details class="card"><summary class="row between"><b dir="auto">${esc(m.title)}</b>
        ${m.status === 'draft' ? `<span class="chip gold">${t('draft')}</span>` : ''}</summary>
      <div class="stack"><p lang="${code}" dir="${L.dir}" style="font-size:1.05rem">${linkify(m.body)}</p>${m.ar ? `<p class="small muted" lang="ar" dir="rtl">${esc(m.ar)}</p>` : ''}
        <div class="row"><button class="btn sm" data-cp="${m.id}">📋 ${t('copy')}</button>
          <a class="btn sm" href="https://wa.me/?text=${encodeURIComponent(m.body)}" target="_blank" rel="noopener">WhatsApp</a>
          ${S.me?.role === 'admin' && m.status === 'draft' ? `<button class="btn sm primary" data-ok="${m.id}">${t('approve')}</button><button class="btn sm" data-no="${m.id}">${t('reject')}</button>` : ''}
          ${S.me && (m.author_id === S.me.id || S.me.role === 'admin') ? `<button class="btn sm ghost" data-del="${m.id}">🗑</button>` : ''}</div>
        ${refsSlot(m.q || [], m.h || [])}</div></details>`).join('')
      : `<p class="card muted" lang="ar">لا رسائل معتمدة بعد بهذه اللغة.${isSup() ? ' أضف أول رسالة من النموذج أدناه.' : ''}</p>`;
    box.querySelectorAll('details').forEach((d) => d.addEventListener('toggle', () => d.open && fillRefs(d)));
    box.querySelectorAll('[data-cp]').forEach((b) => b.onclick = () => { navigator.clipboard?.writeText(list.find((m) => String(m.id) === b.dataset.cp).body); toast(t('copied')); });
    box.querySelectorAll('[data-ok],[data-no]').forEach((b) => b.onclick = async () => { await S.db.approveDawahMessage(+(b.dataset.ok || b.dataset.no), !!b.dataset.ok); drawBank(); });
    box.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { await S.db.deleteDawahMessage(+b.dataset.del); drawBank(); });
  };
  drawBank();
  app.querySelector('#bf')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (id) => app.querySelector(id).value.trim();
    const split = (x) => x.split(/[,\s،]+/).map((y) => y.trim()).filter(Boolean);
    try {
      await S.db.addDawahMessage({ lang: code, title: v('#bt'), body: v('#bb'), ar: v('#ba') || null, q: split(v('#bq')), h: split(v('#bh')) });
      e.target.reset(); toast('✓ ' + t('draft')); drawBank();
    } catch (er) { toast(er.message); }
  });
}

