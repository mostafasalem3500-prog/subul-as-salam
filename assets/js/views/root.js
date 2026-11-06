// الصفحة الرئيسية: الشعار + اللغات الأربع (اسم اللغة بالعربية وبلغتها)
import { CONFIG } from '../config.js';
import { IH } from '../api.js';
import { S, esc } from '../core.js';
import { tIn } from '../i18n.js';

export default async function root(app) {
  const langs = Object.entries(CONFIG.languages);
  const mine = S.me?.role === 'student' ? S.me.lang : null;
  app.innerHTML = `
  <section class="root-hero pattern">
    <div class="floaters" aria-hidden="true">${Array.from({ length: 14 }, (_, i) =>
      `<i style="left:${(i * 71) % 100}%;animation-duration:${14 + (i % 5) * 4}s;animation-delay:${-i * 1.7}s;opacity:${0.25 + (i % 4) * 0.12}"></i>`).join('')}</div>
    <div class="wrap">
      <svg class="big-logo" viewBox="0 0 64 64" role="img" aria-label="${esc(CONFIG.brand.nameAr)}">
        <rect width="64" height="64" rx="16" fill="#0b4d3c" stroke="rgb(255 255 255 / .25)"/>
        <g fill="none" stroke="#e0bd5f" stroke-width="2.4" stroke-linejoin="round">
          <rect class="sq" x="17" y="17" width="30" height="30"/>
          <rect class="sq b" x="17" y="17" width="30" height="30" transform="rotate(45 32 32)"/>
        </g>
        <path class="path" d="M20 44 C 28 38, 36 40, 44 22" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
        <circle class="dot" cx="44" cy="22" r="3.4" fill="#fff"/>
      </svg>
      <h1>${esc(CONFIG.brand.nameAr)}</h1>
      <div class="latin">${esc(CONFIG.brand.nameLatin.toUpperCase())}</div>
      <div class="taglines" aria-live="off">
        <span class="on" lang="ar">منصة تعليم المسلم الجديد ومتابعته — من الشهادة إلى الحفظ والإتقان</span>
        ${langs.map(([c]) => `<span lang="${c}" dir="ltr">${esc(tIn(c, 'tagline'))}</span>`).join('')}
      </div>
      <p class="small" style="opacity:.8;margin-bottom:14px">${['<span lang="ar">اختر لغتك</span>', ...langs.map(([c]) => `<span lang="${c}" dir="ltr">${esc(tIn(c, 'chooseLang'))}</span>`)].join(' · ')}</p>
      <div class="lang-grid">
        ${langs.map(([c, L]) => `<a class="lang-tile${mine === c ? ' mine' : ''}" href="#/${c}">
          <span class="orb">${c}</span>
          <span class="native" lang="${c}">${esc(L.name)}</span>
          <span class="arname" lang="ar">${esc(L.ar)}</span>
          <span class="meta" data-count="${c}">IslamHouse · …</span>
          <span class="go">${esc(tIn(c, 'enter'))} ←</span>
        </a>`).join('')}
      </div>
      <p class="tiny" style="opacity:.65;margin-top:26px">IslamHouse.com · QuranEnc.com · HadeethEnc.com · مجمع الملك فهد · رسالة الحرمين</p>
    </div>
  </section>`;

  // تبديل الشعار بين اللغات (حركة نصية)
  const spans = [...app.querySelectorAll('.taglines span')];
  let k = 0;
  const iv = setInterval(() => {
    if (!document.body.contains(spans[0])) return clearInterval(iv);
    spans[k].classList.remove('on'); k = (k + 1) % spans.length; spans[k].classList.add('on');
  }, 3200);

  // عدد مواد إسلام هاوس لكل لغة (مباشرة من المصدر)
  langs.forEach(async ([c, L]) => {
    try {
      const sc = await IH.siteContent(L.ih);
      const n = (sc.data || sc).find?.((b) => b.block_name === 'showall')?.items_count;
      const el = app.querySelector(`[data-count="${c}"]`); if (el && n) el.textContent = `IslamHouse · ${Number(n).toLocaleString('en')}`;
    } catch { /* اختياري */ }
  });
}
