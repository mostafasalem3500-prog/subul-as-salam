// ركن الداعية: كلمات دعوية من الترجمة المعتمدة + محتوى «رفيق الداعية» (دروس الداعية، الدليل، اكتشف الإسلام، التحذيرات، والرسائل الإسبانية)
import { CONFIG } from '../config.js';
import { QE } from '../api.js';
import { S, esc, rafiq, RAFIQ_REVIEW, loading } from '../core.js';
import { t } from '../i18n.js';
import { DAWAH_WORDS } from '../dawah-words.js';
import { pageHead, refsSlot, fillRefs, qLangDir } from './components.js';
import { surahName } from '../curriculum.js';

const TABS = [
  ['words', '🗝️', () => t('words')],
  ['train', '🎓', () => 'دروس الداعية'],
  ['guide', '🧭', () => 'دليل الداعية'],
  ['course', '🌱', () => 'اكتشف الإسلام (12 لقاءً)'],
  ['warn', '⚠️', () => 'تحذيرات مهمة'],
  ['faq', '❓', () => 'أسئلة الباحثين'],
  ['msg', '💬', () => 'رسائل جاهزة (إسبانية)'],
];
const reviewBadge = (id) => RAFIQ_REVIEW.has(String(id).toLowerCase()) ? ' <span class="chip red tiny">يحتاج مراجعة طالب علم</span>' : '';
const rafiqNote = `<p class="notice small" lang="ar">هذا القسم من مشروع <a href="${CONFIG.languages.es.sister}" target="_blank" rel="noopener">«رفيق الداعية»</a>. النصوص المؤلَّفة بالعربية للداعية والمشرف، والآيات والأحاديث تُجلب بلغة الطالب الحالية (<b>${'{L}'}</b>) من QuranEnc وHadeethEnc كما هي.</p>`;

export async function corner(app, tab = 'words', arg) {
  const lang = S.lang, isEs = lang === 'es';
  const tabs = TABS.filter(([k]) => k !== 'msg' || isEs);
  const head = `${pageHead('🤝 ' + t('dawah'), '<span lang="ar">لتأهيل الداعية والمشرف: مفردات دعوية من الترجمات المعتمدة، ودروس وتوجيهات من «رفيق الداعية».</span>')}
    <div class="wrap"><div class="tabs">${tabs.map(([k, ic, l]) => `<a class="btn sm" href="#/dawah/${k}" aria-pressed="${k === tab}">${ic} ${l()}</a>`).join('')}</div></div>`;
  app.innerHTML = head + `<div class="wrap">${loading()}</div>`;
  const body = document.createElement('div'); body.className = 'wrap stack';
  const note = rafiqNote.replace('{L}', esc(CONFIG.languages[lang].name));

  if (tab === 'words') {
    const set = DAWAH_WORDS[lang];
    if (!set?.cards.length) {
      body.innerHTML = `<div class="card stack" lang="ar"><p>لتعلّم الإسبانية الدعوية (المفردات والعبارات والمحادثات من A1 إلى C2) استخدم القسم المخصص في «رفيق الداعية».</p>
        <a class="btn primary" href="${CONFIG.languages.es.sister}/#aprender" target="_blank" rel="noopener">رفيق الداعية — تعلّم الإسبانية ↗</a></div>`;
    } else {
      body.innerHTML = `<p class="muted" lang="ar">🗝️ <b>تعلّم اللغة من الترجمة المعتمدة:</b> كل كلمة مأخوذة كما وردت في ترجمة معاني القرآن (${esc(set.key)})، وتظهر في سياق آيتها. اضغط البطاقة لتقلبها.</p>
        <div class="grid">${set.cards.map((c, i) => `<div class="flip" data-i="${i}" tabindex="0" role="button" aria-label="${t('flip')}">
          <div class="in"><div class="face front"><span class="ar" lang="ar">${esc(c.ar)}</span><span class="tiny" style="opacity:.75">${esc(surahName(c.ref[0]))} ${c.ref.join(':')}</span></div>
          <div class="face back"><span class="w" lang="${lang}" translate="no">${esc(c.word)}</span><span class="tiny muted">${t('inContext')}</span></div></div></div>`).join('')}</div>
        <div id="ctx" class="stack"></div>
        <p class="src">QuranEnc.com — ${esc(set.key)}. تحقّقنا من ورود كل كلمة في نص الترجمة؛ ويُرجى أن يراجعها متحدّث أصلي.</p>`;
      body.querySelectorAll('.flip').forEach((f) => {
        const go = async () => {
          f.classList.toggle('on');
          const c = set.cards[+f.dataset.i], ctx = body.querySelector('#ctx');
          ctx.style.gridColumn = '1 / -1'; f.after(ctx);   // السياق تحت البطاقة مباشرة
          try {
            const r = await QE.aya(set.key, c.ref[0], c.ref[1]);
            const tr = esc(r.translation); const w = esc(c.word);
            const i = tr.toLowerCase().indexOf(w.toLowerCase());
            const marked = i >= 0 ? tr.slice(0, i) + `<mark style="background:var(--gold-bright);border-radius:4px;padding:0 3px">${tr.slice(i, i + w.length)}</mark>` + tr.slice(i + w.length) : tr;
            ctx.innerHTML = `<div class="card"><div class="quran-ar" lang="ar" translate="no">${esc(r.arabic_text)}</div>
              <div class="tr" dir="${qLangDir(lang)}" lang="${lang}" translate="no" style="font-size:1.08rem">${marked}</div>
              <p class="src">${esc(surahName(c.ref[0]))} ${c.ref.join(':')} · QuranEnc — ${esc(set.key)}</p></div>`;
          } catch { ctx.innerHTML = ''; }
        };
        f.onclick = go; f.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      });
    }
  }

  if (tab === 'train') {
    const T = await rafiq('TRAIN');
    body.innerHTML = note + T.map((c) => `<details class="card" lang="ar"${String(c.n) === arg ? ' open' : ''}><summary class="row"><span class="num">${c.n}</span><b>${esc(c.t)}</b>${reviewBadge('t' + c.n)}</summary>
      <ul class="steps">${c.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul><p class="notice small"><b>تمرين:</b> ${esc(c.practice)}</p>${refsSlot(c.q, c.h)}</details>`).join('');
  }

  if (tab === 'guide') {
    const G = await rafiq('GUIDE');
    body.innerHTML = note + G.map((g) => `<details class="card" lang="ar"><summary><b>${esc(g.t)}</b></summary><ul class="steps">${g.body.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>${refsSlot(g.q, g.h)}</details>`).join('');
  }

  if (tab === 'course') {
    const C = await rafiq('COURSE');
    body.innerHTML = note + `<p class="muted small" lang="ar">منهج من 12 لقاءً يدرسه الداعية مع غير المسلم قبل النطق بالشهادة؛ وبعد الشهادة يبدأ الطالب «مساري» من المحطة الأولى.</p>` +
      C.map((c) => `<details class="card" lang="ar"><summary class="row"><span class="num">${c.n}</span><b>${esc(c.tar)}</b>${isEs ? `<span class="muted small" lang="es">· ${esc(c.t)}</span>` : ''}</summary>
      <div class="stack"><p class="small"><b>الهدف:</b> ${esc(c.goal)}</p>${isEs ? `<p lang="es" dir="ltr">${esc(c.es)}</p>` : ''}<p>${esc(c.ar)}</p>
      ${c.ask ? `<p class="notice small"><b>سؤال للحوار:</b> ${esc(c.ask.ar)}${isEs ? `<br><span lang="es" dir="ltr">${esc(c.ask.es)}</span>` : ''}</p>` : ''}${refsSlot(c.q, c.h)}</div></details>`).join('');
  }

  if (tab === 'warn') {
    const W = await rafiq('WARN');
    const lv = { red: 'red', amber: 'gold', blue: 'sky' };
    body.innerHTML = note + W.map((w) => `<details class="card" lang="ar"><summary class="row"><span class="chip ${lv[w.lvl] || 'gold'}">⚠</span><b>${esc(w.t)}</b></summary>
      <p class="small"><b>لماذا؟</b> ${esc(w.why)}</p><p class="small" style="margin-top:6px"><b>بدلًا من ذلك:</b> ${esc(w.instead)}</p>${refsSlot(w.q, w.h)}</details>`).join('');
  }

  if (tab === 'faq') {
    const F = await rafiq('FAQ');
    body.innerHTML = note + F.map((f) => `<details class="card" lang="ar"><summary><b>${esc(f.ar)}</b>${isEs ? ` <span class="muted small" lang="es">· ${esc(f.es)}</span>` : ''}${reviewBadge(f.id)}</summary>
      <div class="stack">${isEs ? `<p lang="es" dir="ltr">${esc(f.aes)}</p>` : ''}<p>${esc(f.aar)}</p>${f.tip ? `<p class="notice small">${esc(f.tip)}</p>` : ''}${refsSlot(f.q, f.h)}</div></details>`).join('');
  }

  if (tab === 'msg' && isEs) {
    const [M, SITU] = await Promise.all([rafiq('MSG'), rafiq('SITU')]);
    body.innerHTML = note + `<div class="card row"><select id="si" style="max-width:300px"><option value="">كل المواقف (${M.length})</option>${SITU.map((s) => `<option value="${s.id}">${esc(s.ar)}</option>`).join('')}</select>
      <input id="qq" placeholder="${t('search')}" style="max-width:300px"></div><div id="ml" class="stack"></div>`;
    const draw = () => {
      const si = body.querySelector('#si').value, q = body.querySelector('#qq').value.trim().toLowerCase();
      const res = M.filter((m) => (!si || m.si === si || (Array.isArray(m.si) && m.si.includes(si))) && (!q || (m.t + m.es + m.ar).toLowerCase().includes(q))).slice(0, 40);
      body.querySelector('#ml').innerHTML = res.map((m) => `<details class="card"><summary><b lang="ar">${esc(m.t)}</b>${reviewBadge(m.id)}</summary>
        <p lang="es" dir="ltr" style="font-size:1.05rem">${esc(m.es)}</p><p class="small muted" lang="ar" style="margin-top:6px">${esc(m.ar)}</p>
        <div class="row" style="margin-top:8px"><button class="btn sm" data-copy="${esc(m.id)}">📋 نسخ</button></div>${refsSlot(m.q, m.h)}</details>`).join('') || '<p class="muted">—</p>';
      body.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { const m = M.find((x) => x.id === b.dataset.copy); navigator.clipboard?.writeText(m.es); b.textContent = '✓'; });
      wire();
    };
    body.querySelector('#si').onchange = draw; body.querySelector('#qq').oninput = draw; draw();
  }

  app.innerHTML = head; app.append(body);
  function wire() { body.querySelectorAll('details').forEach((d) => { if (d.dataset.w) return; d.dataset.w = 1; d.addEventListener('toggle', () => d.open && fillRefs(d)); if (d.open) fillRefs(d); }); }
  wire();
}
