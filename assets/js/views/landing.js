import { CONFIG } from '../config.js';
import { IH, QE } from '../api.js';
import { S, esc, reveal, applyUi } from '../core.js';
import { t } from '../i18n.js';
import { CYCLE } from '../curriculum.js';
import { journeyHTML, drawJourney, ayahMark, qLangDir } from './components.js';
import { render } from '../app.js';

const CYCLE_IC = { read: '📖', listen: '🎧', memorize: '🧠', apply: '🤲', assess: '✅' };
const CYCLE_AR = {
  read: 'مادة قصيرة موثوقة من إسلام هاوس بلغته',
  listen: 'تلاوة آية آية مع ترجمة معتمدة',
  memorize: 'إخفاء الكلمات والتسميع والتكرار',
  apply: 'تمرين عملي في يومه',
  assess: 'اختبار آلي من الترجمة + تقييم المشرف',
};

export default async function landing(app) {
  const langs = Object.entries(CONFIG.languages);
  app.innerHTML = `
  <section class="hero pattern">
    <svg class="bg-star" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#e0bd5f" stroke-width=".6"><rect x="20" y="20" width="60" height="60"/><rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)"/><circle cx="50" cy="50" r="18"/><circle cx="50" cy="50" r="42"/></g></svg>
    <svg class="bg-star two" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width=".6"><rect x="20" y="20" width="60" height="60"/><rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)"/></g></svg>
    <div class="wrap">
      <div>
        <span class="chip gold">IslamHouse · QuranEnc · HadeethEnc</span>
        <h1 style="margin-top:12px">${esc(CONFIG.brand.nameAr)}<span class="latin">${esc(CONFIG.brand.nameLatin.toUpperCase())}</span></h1>
        <p class="lead">${t('tagline')}</p>
        <div class="verse" id="hero-verse"><div class="skeleton" style="height:60px;opacity:.3"></div></div>
        <div class="cta">
          ${S.me ? `<a class="btn gold" href="#/learn">${t('continue')} ←</a>` : `<a class="btn gold" href="#/signup">${t('start')}</a><a class="btn ghost" style="color:#fff;border-color:rgb(255 255 255 / .4)" href="#/login">${t('login')}</a>`}
        </div>
      </div>
      <div class="lang-cards" id="lang-cards">
        ${langs.map(([code, L]) => `<button class="lang-card" data-l="${code}" aria-disabled="${!L.enabled}">
          <span class="code">${code}</span>
          <span><b>${esc(L.name)}</b><span class="meta" lang="ar">${esc(L.ar)}${L.enabled ? ` · <span data-count="${code}">…</span>` : ` · ${t('soon')}`}</span></span>
        </button>`).join('')}
      </div>
    </div>
  </section>

  <section class="block wrap">
    <div class="sec-head reveal"><div><span class="kicker">${t('cycleTitle')}</span><h2>${t('read')} · ${t('listen')} · ${t('memorize')} · ${t('apply')} · ${t('assess')}</h2>
      <p class="muted" lang="ar">منهج «سُبُل»: كل محطة تُدرَس في دورة قصيرة من خمس خطوات، ليبني المسلم الجديد علمه وحفظه وعمله معًا.</p></div></div>
    <div class="cycle card reveal">
      ${CYCLE.map((c) => `<div class="step"><div class="ic">${CYCLE_IC[c]}</div><div><b>${t(c)}</b><span class="small muted" lang="ar">${CYCLE_AR[c]}</span></div></div>`).join('')}
    </div>
  </section>

  <section class="block wrap" style="padding-top:0">
    <div class="sec-head reveal"><div><span class="kicker">${t('stages')}</span><h2 lang="ar">من النطق بالشهادة إلى المستوى المتقدم</h2>
      <p class="muted" lang="ar">12 محطة متدرجة. في كل محطة: مواد من إسلام هاوس بلغة الطالب، وسور للحفظ والفهم مع الترجمة، وأحاديث من موسوعة الأحاديث، واختبار، وتقييم من المشرف.</p></div></div>
    ${journeyHTML(null)}
  </section>

  <section class="block" style="background:var(--surface);border-block:1px solid var(--line)">
    <div class="wrap grid-2">
      <div class="reveal stack">
        <span class="kicker">${t('student')}</span>
        <h2 lang="ar">نافذة المسلم الجديد</h2>
        <ul class="steps" lang="ar">
          <li>يدخل بإيميله ويختار لغته: السواحيلية أو الكينيارواندية أو الإسبانية.</li>
          <li>يرى خريطة رحلته، ونسبة تقدّمه، ودرجته في كل محطة.</li>
          <li>يقرأ ويستمع ويحفظ؛ والمواد كلها من مصادرها بلغته ودون أي تعديل.</li>
          <li>يُختبر اختبارًا يُبنى آليًّا من الترجمة المعتمدة لمعاني القرآن.</li>
        </ul>
      </div>
      <div class="reveal stack">
        <span class="kicker">${t('supervisorRole')}</span>
        <h2 lang="ar">نافذة المشرف التعليمي</h2>
        <ul class="steps" lang="ar">
          <li>يربط طلابه بإيميلهم، أو يعطيهم «رمز الإشراف» ليرتبطوا به.</li>
          <li>يرى لكل طالب المحطة التي وصلها، ونسبة تقدّمه، ومتوسط درجاته، وآخر نشاط له.</li>
          <li>يقيّم كل محطة بدرجة وملاحظة، ويوثّق تسميع السور.</li>
          <li>يضيف أسئلة بلغة الطالب، ويستعين بدروس الداعية ودليله من «رفيق الداعية».</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="block wrap">
    <div class="sec-head reveal"><div><span class="kicker">${t('sources')}</span><h2 lang="ar">مصادر معتمدة فقط</h2></div><a class="btn" href="#/sources">${t('sources')}</a></div>
    <div class="stats reveal" id="stats">
      <div class="stat"><b data-k="ih">…</b><span>IslamHouse · ${esc(CONFIG.languages[S.lang]?.name)}</span></div>
      <div class="stat"><b data-k="qe">…</b><span>QuranEnc · ${t('translation')}</span></div>
      <div class="stat"><b>6236</b><span lang="ar">آية — مصحف المدينة (حفص)</span></div>
      <div class="stat"><b>12</b><span>${t('stages')}</span></div>
    </div>
  </section>`;

  reveal(app);
  drawJourney(app);

  // اختيار اللغة
  app.querySelectorAll('.lang-card').forEach((b) => b.onclick = async () => {
    const l = b.dataset.l; if (!CONFIG.languages[l].enabled) return;
    S.lang = l;
    if (S.me) await S.db.updateMe({ lang: l });
    localStorage.removeItem('subul-ui'); applyUi(); render();
    location.hash = S.me ? '#/learn' : '#/signup';
  });

  // الآية (المائدة 16) من QuranEnc
  (async () => {
    const { sura, aya } = CONFIG.brand.verseRef;
    const el = app.querySelector('#hero-verse');
    try {
      const r = await QE.aya(S.qKey, sura, aya);
      el.innerHTML = `<div class="q" lang="ar" translate="no">${esc(r.arabic_text)} ${ayahMark(r.aya)}</div>
        <div class="tr" dir="${qLangDir(S.lang)}" translate="no">${esc(r.translation)}</div>
        <div class="ref">المائدة ${sura}:${aya} · QuranEnc — ${esc(S.qKey)}</div>`;
    } catch { el.remove(); }
  })();

  // أعداد المواد من إسلام هاوس لكل لغة
  langs.filter(([, L]) => L.enabled).forEach(async ([code, L]) => {
    try {
      const sc = await IH.siteContent(L.ih);
      const all = (sc.data || sc).find?.((b) => b.block_name === 'showall');
      const n = all?.items_count;
      app.querySelectorAll(`[data-count="${code}"]`).forEach((e) => e.textContent = n ? `${n} IslamHouse` : '');
      if (code === S.lang && n) app.querySelector('[data-k="ih"]').textContent = n;
    } catch { app.querySelectorAll(`[data-count="${code}"]`).forEach((e) => e.textContent = ''); }
  });
  app.querySelector('[data-k="qe"]').textContent = CONFIG.languages[S.lang]?.quran.length ?? '—';
}
