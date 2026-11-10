// =====================================================================
//  «تعلّم اللغة» للمشرف والداعية: من الحروف إلى الإتقان (Pre-A1 → C2)
//  #/{L}/lang                    خريطة المستويات
//  #/{L}/lang/method             كيف تتعلّم اللغة (منهج وخطة أسبوعية)
//  #/{L}/lang/L2                 دروس المستوى
//  #/{L}/lang/L2/3               الدرس
//  #/{L}/lang/cards/L2[/3]|due   بطاقات المراجعة المتباعدة (Leitner)
//  #/{L}/lang/quiz/L2[/3]        اختبار الدرس / المستوى
//  المصطلحات الشرعية تُعرض داخل آياتها من QuranEnc ويُتحقق آليًّا من ورودها.
// =====================================================================
import { CONFIG } from '../config.js';
import { QE } from '../api.js';
import { S, esc, href, toast, confetti, loading } from '../core.js';
import { surahName } from '../curriculum.js';
import { pageHead, ayahMark } from './components.js';
import { shuffle } from './quizengine.js';

const LOADERS = { sw: () => import('../langcourse/sw.js'), rw: () => import('../langcourse/rw.js'), en: () => import('../langcourse/en.js'), es: () => import('../langcourse/es.js') };
const EXTRAS = { sw: () => import('../langcourse/sw-extra.js'), rw: () => import('../langcourse/rw-extra.js') };
const merged = {};
export async function getCourse(L) {
  const f = LOADERS[L]; if (!f) return null;
  if (merged[L]) return merged[L];
  const C = (await f()).default;
  if (EXTRAS[L]) { const X = (await EXTRAS[L]()).default; C.levels.forEach((l) => { if (X[l.id]) l.lessons.push(...X[l.id]); }); }
  return (merged[L] = C);
}

// ---------------------------------------------------------------- أدوات
const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s) => String(s || '').replace(/\[\d+\]/g, '').replace(/[’‘`]/g, "'").toLowerCase();
const plain = (s) => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿¡?!.,;:"()]/g, '').replace(/\s+/g, ' ').trim();
function highlight(text, words = []) {
  const pats = words.filter(Boolean).map((w) => escRe(w).replace(/['’‘]/g, "['’‘]"));
  if (!pats.length) return esc(text);
  const re = new RegExp('(' + pats.join('|') + ')', 'gi');
  return String(text).split(re).map((p, i) => (i % 2 ? `<mark>${esc(p)}</mark>` : esc(p))).join('');
}
const T = (C, s, tag = 'span', cls = '') => `<${tag} class="tl ${cls}" lang="${C.code}" dir="ltr" translate="no">${esc(s)}</${tag}>`;

// ---- النطق الآلي (إن وُجد صوت للغة في الجهاز)
let voices = [];
const loadVoices = () => { try { voices = speechSynthesis.getVoices(); } catch { voices = []; } };
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
const voiceFor = (C) => voices.find((v) => C.tts.some((t) => v.lang.toLowerCase().replace('_', '-') === t.toLowerCase())) || voices.find((v) => v.lang.toLowerCase().startsWith(C.code));
function speak(C, text) {
  const v = voiceFor(C);
  if (!v) { toast('لا يوجد صوت لهذه اللغة في جهازك — استمع للمتحدثين الأصليين في المرئيات'); return; }
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.voice = v; u.lang = v.lang; u.rate = 0.85; speechSynthesis.speak(u);
}
const sayBtn = (s) => `<button class="say" data-say="${esc(s)}" aria-label="استمع" title="استمع">🔊</button>`;
function wireSay(root, C) { root.querySelectorAll('[data-say]').forEach((b) => b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); speak(C, b.dataset.say); }); }

// ---- التقدّم: محليًّا دائمًا، وفي قاعدة البيانات عند تسجيل الدخول (kind = 'lang')
const PK = 'subul-langprog';
const keyOf = (C, lvl, i) => `lang:${C.code}:${lvl}:${i}`;
function doneSet() { return new Set(ls.get(PK, [])); }
async function syncDone() {
  if (!S.me) return doneSet();
  const rows = await S.db.progress().catch(() => []);
  const set = doneSet(); rows.filter((r) => r.kind === 'lang').forEach((r) => set.add(r.item_key)); ls.set(PK, [...set]); return set;
}
async function markDone(k) {
  const set = doneSet(); set.add(k); ls.set(PK, [...set]);
  if (S.me) await S.db.markDone(k, 'lang', 'lang').catch(() => {});
}

// ---- المراجعة المتباعدة (Leitner: 5 صناديق)
const GAP = [0, 1, 3, 7, 16, 35];
const DAY = 864e5;
const srsKey = (C) => 'subul-srs-' + C.code;
function srsGet(C) { return ls.get(srsKey(C), {}); }
function srsUpdate(C, id, ok) {
  const st = srsGet(C), c = st[id] || { b: 0 };
  c.b = ok ? Math.min(5, c.b + 1) : 1; c.due = Date.now() + GAP[c.b] * DAY; st[id] = c; ls.set(srsKey(C), st);
}
function srsAdd(C, ids) { const st = srsGet(C); ids.forEach((id) => { if (!st[id]) st[id] = { b: 0, due: Date.now() }; }); ls.set(srsKey(C), st); }
const dueCount = (C) => Object.values(srsGet(C)).filter((c) => (c.due || 0) <= Date.now()).length;

// ---- مفردات الدرس والمستوى (كلمات الدرس + المصطلحات المتحقَّق منها)
const lessonCards = (lesson) => [...(lesson.v || []).map(([w, a]) => ({ w, a })), ...(lesson.terms || []).map(([w, a, s, y]) => ({ w, a, ref: [s, y] }))];
const levelCards = (lvl) => lvl.lessons.flatMap(lessonCards);
const allCards = (C) => C.levels.flatMap(levelCards);
const uniq = (arr) => { const m = new Map(); arr.forEach((c) => m.has(c.w) || m.set(c.w, c)); return [...m.values()]; };

const crumbs = (C, ...parts) => `<nav class="crumbs small" lang="ar"><a href="${href('lang')}">🗣️ تعلّم ${esc(C.ar)}</a>${parts.map((p) => ` › ${p}`).join('')}</nav>`;
const levelPct = (C, lvl, set) => Math.round(100 * lvl.lessons.filter((_, i) => set.has(keyOf(C, lvl.id, i))).length / lvl.lessons.length);

// ---------------------------------------------------------------- الموجّه
export async function route(app, mode, lvlId, idx) {
  const C = await getCourse(S.lang);
  if (!C) return `<div class="wrap"><p class="card">—</p></div>`;
  if (mode === 'method') return methodPage(app, C);
  if (mode === 'cards') return cardsPage(app, C, lvlId, idx);
  if (mode === 'quiz') return quizPage(app, C, lvlId, idx);
  if (lvlId && idx) return lessonPage(app, C, lvlId, +idx);
  if (lvlId) return levelPage(app, C, lvlId);
  return overview(app, C);
}

// ---------------------------------------------------------------- خريطة المستويات
async function overview(app, C) {
  app.innerHTML = pageHead(`🗣️ تعلّم ${esc(C.ar)} · <span lang="${C.code}" translate="no">${esc(C.name)}</span>`, 'للمشرف والداعية: من الحروف إلى الإتقان') + `<div class="wrap">${loading()}</div>`;
  const set = await syncDone();
  const total = C.levels.reduce((n, l) => n + l.lessons.length, 0), done = C.levels.reduce((n, l) => n + l.lessons.filter((_, i) => set.has(keyOf(C, l.id, i))).length, 0);
  const words = uniq(allCards(C)).length, inSrs = Object.keys(srsGet(C)).length, due = dueCount(C);
  app.innerHTML = pageHead(`🗣️ تعلّم ${esc(C.ar)} · <span lang="${C.code}" translate="no">${esc(C.name)}</span>`, 'للمشرف والداعية: من الحروف إلى الإتقان') + `
  <div class="wrap stack" style="padding-top:12px" dir="rtl" lang="ar">
    <div class="lc-hero card">
      <p>${esc(C.intro)}</p>
      <div class="lc-facts">${C.facts.map(([i, s]) => `<span><b>${i}</b>${esc(s)}</span>`).join('')}</div>
      <p class="notice small">${esc(C.review)}</p>
    </div>
    <div class="lc-stats">
      <div class="card"><b class="num">${done}/${total}</b><span>دروس منجزة</span><i class="bar"><i style="width:${total ? (100 * done) / total : 0}%"></i></i></div>
      <div class="card"><b class="num">${words}</b><span>كلمة وعبارة</span></div>
      <div class="card"><b class="num">${inSrs}</b><span>في بطاقاتك</span></div>
      <a class="card lift" href="${href('lang/cards/due')}"><b class="num">${due}</b><span>🔁 مراجعة اليوم</span></a>
    </div>
    <div class="row"><a class="btn gold" href="${href('lang/method')}">🧭 كيف تتعلّم اللغة؟ (المنهج والخطة)</a>${C.sister ? `<a class="btn" href="${C.sister}" target="_blank" rel="noopener">🇪🇸 الدورة الكاملة — رفيق الداعية ↗</a>` : ''}</div>
    <h2>🪜 المستويات</h2>
    <ol class="lc-path">${C.levels.map((l, n) => {
      const p = levelPct(C, l, set), test = set.has(keyOf(C, l.id, 'test'));
      return `<li style="--c:${l.color}"><a class="card lift lc-level" href="${href('lang/' + l.id)}">
        <span class="lc-badge">${l.icon}</span>
        <span class="grow"><span class="chip tiny" dir="ltr">${esc(l.cefr)}</span> ${test ? '<span class="chip tiny" style="background:var(--ok-soft);color:var(--ok)">🏅 اجتاز الاختبار</span>' : ''}
          <h3>${n + 1}. ${esc(l.t)}</h3><span class="desc small muted">${esc(l.d)}</span>
          <i class="bar"><i style="width:${p}%"></i></i><span class="tiny muted">${l.lessons.length} دروس · ${p}%</span></span></a></li>`;
    }).join('')}</ol>
  </div>`;
}

// ---------------------------------------------------------------- منهج التعلّم
function methodPage(app, C) {
  const tips = [
    ['⏱️', '20 دقيقة كل يوم', 'أنفع من ساعتين مرة في الأسبوع؛ الذاكرة تحب التكرار القصير المتقارب.'],
    ['🔤', 'ابدأ بالأصوات', 'أتقن نطق الحروف والنبر في الأسبوع الأول؛ الخطأ في النطق يصعب تصحيحه لاحقًا.'],
    ['🧱', 'تعلّم عبارات كاملة', 'احفظ «Jina langu ni…» كقطعة واحدة بدل الكلمات المفردة؛ ستتكلم من اليوم الأول.'],
    ['🔁', 'المراجعة المتباعدة', 'بطاقات Leitner في الموقع تعيد عليك الكلمة قبل أن تنساها: بعد يوم، ثم 3، ثم 7، ثم 16 يومًا.'],
    ['📖', 'تعلّم من الترجمة المعتمدة', 'اقرأ الآية بالعربية ثم ترجمتها في QuranEnc؛ ستتعلم اللغة والمصطلح الشرعي الصحيح معًا دون ترجمة من عندك.'],
    ['🎧', 'التظليل (Shadowing)', 'ردّد خلف المتحدث الأصلي مباشرة مقلّدًا لحنه وسرعته، 5 مرات للمقطع نفسه.'],
    ['🗣️', 'تكلّم مع طالبك', 'اطلب منه كل يوم أن يعلّمك كلمة؛ يتعلم هو العربية/الدين وتتعلم أنت لغته، وتقوى العلاقة.'],
    ['✍️', 'دفتر الجمل', 'اكتب كل كلمة جديدة داخل جملة من سياقها، لا وحدها.'],
    ['🧪', 'اختبر نفسك أسبوعيًّا', 'اختبار المستوى في الموقع يحتاج 80% لتنتقل بثقة.'],
    ['🤝', 'راجع مع متحدث أصلي', 'كل ما تكتبه للنشر أو للدرس يُعرض على متحدث أصلي قبل اعتماده.'],
  ];
  const week = [['السبت', 'درس جديد (20 د) + بطاقات'], ['الأحد', 'بطاقات + تظليل مقطع قصير'], ['الاثنين', 'درس جديد + كتابة 5 جمل'], ['الثلاثاء', 'بطاقات + قراءة ترجمة سورة قصيرة'], ['الأربعاء', 'درس جديد + محادثة 10 د مع طالب'], ['الخميس', 'مراجعة الأسبوع + اختبار الدرس'], ['الجمعة', 'استماع لمادة دعوية + راحة']];
  const map = [['Pre-A1', 'الحروف والأصوات', '1–2 أسبوع'], ['A1', 'التحية والتعارف والحياة اليومية', '4–6 أسابيع'], ['A2', 'القواعد الأساسية', '6–8 أسابيع'], ['B1', 'محادثات الدعوة', '2–3 أشهر'], ['B2', 'المصطلحات الشرعية', '2–3 أشهر'], ['C1', 'القراءة والاستماع المتقدم', '4–6 أشهر'], ['C2', 'الإتقان والخطابة', 'ممارسة مستمرة']];
  return pageHead('🧭 كيف تتعلّم اللغة؟', `منهج عملي للمشرف والداعية — ${esc(C.ar)}`) + `<div class="wrap stack" style="padding-top:10px" dir="rtl" lang="ar">
    ${crumbs(C, 'المنهج')}
    <div class="grid">${tips.map(([i, h, d]) => `<div class="card lc-tip"><span class="ic">${i}</span><h3>${h}</h3><p class="small muted">${d}</p></div>`).join('')}</div>
    <h2>🗺️ خريطة الطريق</h2>
    <div class="lc-road">${map.map(([c, h, d], n) => `<div style="--i:${n}"><b dir="ltr">${c}</b><span>${h}</span><small>${d}</small></div>`).join('')}</div>
    <h2>📅 خطة أسبوعية مقترحة</h2>
    <div class="card"><table class="lc-table"><tbody>${week.map(([d, w]) => `<tr><th>${d}</th><td>${w}</td></tr>`).join('')}</tbody></table></div>
    <p class="notice small">المصادر المعتمدة للمحتوى الشرعي: QuranEnc (ترجمة <span dir="ltr" translate="no">${esc(C.key)}</span>)، IslamHouse، HadeethEnc. ${esc(C.review)}</p>
    <a class="btn primary" href="${href('lang/L0')}">ابدأ بالمستوى الأول ←</a>
  </div>`;
}

// ---------------------------------------------------------------- صفحة المستوى
async function levelPage(app, C, lvlId) {
  const lvl = C.levels.find((l) => l.id === lvlId);
  if (!lvl) { location.hash = href('lang'); return; }
  const set = await syncDone();
  const n = levelCards(lvl).length, next = C.levels[C.levels.indexOf(lvl) + 1];
  return pageHead(`${lvl.icon} ${esc(lvl.t)}`, `<span dir="ltr">${esc(lvl.cefr)}</span> · ${esc(lvl.d)}`) + `<div class="wrap stack" style="padding-top:10px" dir="rtl" lang="ar">
    ${crumbs(C, esc(lvl.t))}
    <div class="grid">${lvl.lessons.map((ls_, i) => { const d = set.has(keyOf(C, lvl.id, i)); return `<a class="card lift lc-lesson${d ? ' done' : ''}" href="${href(`lang/${lvl.id}/${i + 1}`)}" style="--c:${lvl.color}">
      <span class="lc-num">${d ? '✓' : i + 1}</span><span><h3>${esc(ls_.t)}</h3><span class="small muted">${esc(ls_.g || (ls_.terms ? `${ls_.terms.length} مصطلحًا في سياق آياتها` : ''))}</span></span></a>`; }).join('')}</div>
    <div class="row">
      <a class="btn primary" href="${href('lang/cards/' + lvl.id)}">🃏 بطاقات المستوى (${n})</a>
      <a class="btn gold" href="${href('lang/quiz/' + lvl.id)}">🧪 اختبار المستوى ${set.has(keyOf(C, lvl.id, 'test')) ? '🏅' : ''}</a>
      ${next ? `<a class="btn" href="${href('lang/' + next.id)}">المستوى التالي: ${esc(next.t)} ←</a>` : ''}
    </div></div>`;
}

// ---------------------------------------------------------------- الدرس
function blockHTML(C, b) {
  const [k] = b;
  if (k === 'p') return `<p>${b[1]}</p>`;
  if (k === 'tip') return `<div class="lc-tipbox">💡 ${b[1]}</div>`;
  if (k === 'ex') return `<div class="lc-ex">${b[1].map(([w, a]) => `<div class="lc-row">${sayBtn(w)}${T(C, w, 'b')}<span class="ar">${esc(a)}</span></div>`).join('')}</div>`;
  if (k === 'table') {
    const [, head, rows, tcols = [0]] = b;
    return `<div class="lc-tablewrap"><table class="lc-table"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => tcols.includes(i) ? `<td>${T(C, c, 'b')} ${c && !/^\d+$/.test(c) ? sayBtn(c) : ''}</td>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  if (k === 'dlg') return `<div class="lc-dlg">${b[1].map(([sp, w, a]) => `<div class="lc-bubble ${sp === 'A' ? 'a' : 'b'}"><span class="who">${sp === 'A' ? '🧑‍🏫' : '🙂'}</span><div>${sayBtn(w)} ${T(C, w, 'b')}<span class="ar small muted">${esc(a)}</span></div></div>`).join('')}</div>`;
  if (k === 'verse') return `<div class="lc-verse" data-s="${b[1]}" data-a="${b[2]}" data-hl="${esc(JSON.stringify(b[3] || []))}"><div class="skeleton" style="height:70px"></div></div>`;
  if (k === 'link') return `<a class="btn sm" href="${b[3] ? b[2] : href(b[2])}"${b[3] ? ' target="_blank" rel="noopener"' : ''}>${b[1]}</a>`;
  if (k === 'steps') return `<ol class="lc-steps">${b[1].map(([h, d]) => `<li><b>${esc(h)}</b>${d ? `<span class="small muted">${esc(d)}</span>` : ''}</li>`).join('')}</ol>`;
  return '';
}

async function fillVerses(root, C) {
  for (const el of root.querySelectorAll('.lc-verse')) {
    const s = +el.dataset.s, a = +el.dataset.a, hl = JSON.parse(el.dataset.hl || '[]');
    try {
      const r = await QE.aya(C.key, s, a);
      if (!r) throw new Error('—');
      const miss = hl.filter((w) => !norm(r.translation).includes(norm(w)));
      el.innerHTML = `<div class="card flat" style="background:var(--surface-2)">
        <div class="quran-ar" lang="ar" translate="no" style="font-size:1.35rem">${esc(r.arabic_text)} ${ayahMark(a)}</div>
        <div class="tr" dir="ltr" lang="${C.code}" translate="no">${highlight(r.translation, hl)}</div>
        <div class="src">${esc(surahName(s))} ${s}:${a} · QuranEnc — <span translate="no">${esc(C.key)}</span> · <a href="${href('quran/' + s)}">فتح السورة</a>${miss.length ? ` · <span class="chip red tiny">⚠ لم تُطابق: ${miss.map(esc).join('، ')}</span>` : ''}</div></div>`;
    } catch { el.innerHTML = `<p class="tiny muted">${esc(surahName(s))} ${s}:${a} — تعذّر جلب الترجمة الآن</p>`; }
  }
}

// المصطلحات الشرعية: كل مصطلح يُفحص داخل آيته من QuranEnc
async function fillTerms(root, C) {
  for (const el of root.querySelectorAll('.lc-term')) {
    const s = +el.dataset.s, a = +el.dataset.a, w = el.dataset.w;
    try {
      const r = await QE.aya(C.key, s, a);
      const ok = r && norm(r.translation).includes(norm(w));
      el.querySelector('.ctx').innerHTML = r ? `<div class="quran-ar small" lang="ar" translate="no">${esc(r.arabic_text)} ${ayahMark(a)}</div><div class="tr small" dir="ltr" lang="${C.code}" translate="no">${highlight(r.translation, [w])}</div>` : '';
      el.querySelector('.ver').innerHTML = ok ? '<span class="chip tiny" style="background:var(--ok-soft);color:var(--ok)">✓ مطابق للترجمة المعتمدة</span>' : '<span class="chip red tiny">⚠ يحتاج تحقق</span>';
    } catch { el.querySelector('.ver').innerHTML = '<span class="chip tiny">—</span>'; }
  }
}

async function lessonPage(app, C, lvlId, n) {
  const lvl = C.levels.find((l) => l.id === lvlId), lesson = lvl?.lessons[n - 1];
  if (!lesson) { location.hash = href('lang'); return; }
  const set = doneSet(), k = keyOf(C, lvl.id, n - 1), done = set.has(k);
  const prev = n > 1 ? n - 1 : null, next = n < lvl.lessons.length ? n + 1 : null;
  const cards = lessonCards(lesson);
  const terms = lesson.terms ? `<p class="small muted">كل مصطلح منقول حرفيًّا من ترجمة <span dir="ltr" translate="no">${esc(C.key)}</span> ويُعرض داخل آيته، ويُفحص الآن آليًّا للتأكد من وروده.</p>
    <div class="grid">${lesson.terms.map(([w, a, s, y]) => `<div class="card lc-term" data-w="${esc(w)}" data-s="${s}" data-a="${y}">
      <div class="row between"><span>${sayBtn(w)} ${T(C, w, 'b', 'big')}</span><span class="ar"><b>${esc(a)}</b></span></div>
      <div class="ctx"><div class="skeleton" style="height:50px"></div></div>
      <div class="row between tiny muted"><span>${esc(surahName(s))} ${s}:${y}</span><span class="ver"></span></div></div>`).join('')}</div>` : '';
  app.innerHTML = pageHead(`${lvl.icon} ${esc(lesson.t)}`, `<span dir="ltr">${esc(lvl.cefr)}</span> · ${esc(lvl.t)} · الدرس ${n}/${lvl.lessons.length}`) + `
  <div class="wrap stack lc-lessonbody" style="padding-top:10px;max-width:900px" dir="rtl" lang="ar">
    ${crumbs(C, `<a href="${href('lang/' + lvl.id)}">${esc(lvl.t)}</a>`, esc(lesson.t))}
    ${lesson.g ? `<div class="lc-goal">🎯 <b>الهدف:</b> ${esc(lesson.g)}</div>` : ''}
    ${(lesson.b || []).map((b) => blockHTML(C, b)).join('')}
    ${terms}
    ${lesson.v?.length ? `<h3>🗂️ مفردات الدرس</h3><div class="lc-chips">${lesson.v.map(([w, a]) => `<span class="lc-chip">${sayBtn(w)}${T(C, w, 'b')}<small>${esc(a)}</small></span>`).join('')}</div>` : ''}
    <div class="card lc-actions">
      <a class="btn primary" href="${href(`lang/cards/${lvl.id}/${n}`)}">🃏 بطاقات (${cards.length})</a>
      <a class="btn gold" href="${href(`lang/quiz/${lvl.id}/${n}`)}">🧪 اختبر نفسك</a>
      <button class="btn${done ? ' done' : ''}" id="mark">${done ? '✓ أنهيت الدرس' : '✔ أنهيت الدرس'}</button>
    </div>
    <div class="row between">${prev ? `<a class="btn sm" href="${href(`lang/${lvl.id}/${prev}`)}">→ السابق</a>` : '<span></span>'}${next ? `<a class="btn sm" href="${href(`lang/${lvl.id}/${next}`)}">التالي ←</a>` : `<a class="btn sm" href="${href('lang/quiz/' + lvl.id)}">🧪 اختبار المستوى ←</a>`}</div>
    <p class="tiny muted">${esc(C.review)}</p>
  </div>`;
  wireSay(app, C);
  app.querySelector('#mark').onclick = async (e) => {
    await markDone(k); srsAdd(C, cards.map((c) => c.w));
    e.target.classList.add('done'); e.target.textContent = '✓ أنهيت الدرس'; toast('✓ أُضيفت مفردات الدرس إلى بطاقات المراجعة'); confetti();
  };
  fillVerses(app, C); fillTerms(app, C);
}

// ---------------------------------------------------------------- البطاقات (Leitner)
function cardsPage(app, C, lvlId, idx) {
  let deck, title;
  if (lvlId === 'due' || !lvlId) {
    const st = srsGet(C), all = uniq(allCards(C));
    deck = all.filter((c) => st[c.w] && (st[c.w].due || 0) <= Date.now());
    title = '🔁 مراجعة اليوم';
  } else {
    const lvl = C.levels.find((l) => l.id === lvlId); if (!lvl) { location.hash = href('lang'); return; }
    deck = uniq(idx ? lessonCards(lvl.lessons[+idx - 1] || {}) : levelCards(lvl)); title = `🃏 ${esc(idx ? lvl.lessons[+idx - 1]?.t : lvl.t)}`;
  }
  deck = shuffle(deck);
  let i = 0, right = 0, rev = false, flipped = false;
  const back = lvlId && lvlId !== 'due' ? href(`lang/${lvlId}${idx ? '/' + idx : ''}`) : href('lang');
  const draw = () => {
    if (!deck.length) {
      app.innerHTML = pageHead(title) + `<div class="wrap" dir="rtl" lang="ar" style="padding-top:20px"><div class="card center stack"><p>🎉 لا توجد بطاقات مستحقة الآن. أنهِ درسًا جديدًا لتُضاف مفرداته.</p><a class="btn primary" href="${href('lang')}">المستويات</a></div></div>`; return;
    }
    if (i >= deck.length) {
      if (right === deck.length) confetti();
      app.innerHTML = pageHead(title) + `<div class="wrap" dir="rtl" lang="ar" style="padding-top:20px"><div class="card center stack"><h2>${right} / ${deck.length}</h2><p class="muted">ستعود إليك البطاقات التي لم تعرفها غدًا، والتي عرفتها بعد مدة أطول.</p>
        <div class="row" style="justify-content:center"><button class="btn primary" id="again">🔁 مرة أخرى</button><a class="btn" href="${back}">رجوع</a></div></div></div>`;
      app.querySelector('#again').onclick = () => { i = 0; right = 0; deck = shuffle(deck); draw(); }; return;
    }
    const c = deck[i];
    const front = rev ? `<span class="ar">${esc(c.a)}</span>` : T(C, c.w, 'span', 'big');
    const backF = rev ? T(C, c.w, 'span', 'big') : `<span class="ar">${esc(c.a)}</span>`;
    app.innerHTML = pageHead(title, `${i + 1} / ${deck.length}`) + `<div class="wrap stack" dir="rtl" lang="ar" style="padding-top:16px;max-width:620px">
      <div class="qbar"><i style="width:${(i / deck.length) * 100}%"></i></div>
      <div class="flip lc-flash${flipped ? ' on' : ''}" tabindex="0" role="button" aria-label="اقلب البطاقة"><div class="in">
        <div class="face front">${front}${c.ref ? `<span class="tiny" style="opacity:.75">${esc(surahName(c.ref[0]))} ${c.ref.join(':')}</span>` : ''}</div>
        <div class="face back">${backF}</div></div></div>
      <div class="row" style="justify-content:center">${sayBtn(c.w)}<button class="btn sm" id="dir">⇄ ${rev ? 'من العربية' : 'إلى العربية'}</button></div>
      <div class="row lc-judge" style="justify-content:center">
        <button class="btn" id="no">✗ لم أعرفها</button><button class="btn primary" id="yes">✓ عرفتها</button></div>
      <p class="tiny muted center">اضغط البطاقة لقلبها، ثم قيّم نفسك بصدق.</p></div>`;
    wireSay(app, C);
    const f = app.querySelector('.lc-flash'); f.onclick = () => { flipped = !flipped; f.classList.toggle('on'); };
    f.onkeydown = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); f.click(); } };
    app.querySelector('#dir').onclick = () => { rev = !rev; flipped = false; draw(); };
    const judge = (ok) => { srsUpdate(C, c.w, ok); if (ok) right++; i++; flipped = false; draw(); };
    app.querySelector('#yes').onclick = () => judge(true); app.querySelector('#no').onclick = () => judge(false);
  };
  draw();
}

// ---------------------------------------------------------------- الاختبار
function quizPage(app, C, lvlId, idx) {
  const lvl = C.levels.find((l) => l.id === lvlId); if (!lvl) { location.hash = href('lang'); return; }
  const lesson = idx ? lvl.lessons[+idx - 1] : null;
  const pool = uniq(lesson ? lessonCards(lesson) : levelCards(lvl));
  const wide = uniq(levelCards(lvl).concat(allCards(C)));
  if (pool.length < 2) { location.hash = href('lang/' + lvl.id); return; }
  const N = Math.min(lesson ? 8 : 12, pool.length);
  const Qs = shuffle(pool).slice(0, N).map((c, n) => {
    const type = n % 4 === 3 ? 'type' : n % 2 ? 'ar2t' : 't2ar';
    const others = shuffle(wide.filter((x) => x.w !== c.w && x.a !== c.a)).slice(0, 3);
    const opts = shuffle([c, ...others]);
    return { c, type, opts };
  });
  const title = lesson ? `🧪 ${esc(lesson.t)}` : `🧪 اختبار المستوى: ${esc(lvl.t)}`;
  let i = 0, correct = 0;
  const step = () => {
    if (i >= Qs.length) return finish();
    const Q = Qs[i], c = Q.c;
    let body;
    if (Q.type === 'type') {
      body = `<p class="muted small">اكتب الكلمة ب${esc(C.ar)}:</p><p class="ar" style="font-size:1.3rem"><b>${esc(c.a)}</b></p>
        <form id="tf" class="row"><input id="ti" lang="${C.code}" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" style="flex:1"><button class="btn primary">تحقّق</button></form><p id="fb"></p>`;
    } else if (Q.type === 't2ar') {
      body = `<p class="muted small">ما معنى:</p><p style="font-size:1.4rem">${sayBtn(c.w)} ${T(C, c.w, 'b')}</p>${Q.opts.map((o, k) => `<button class="quiz-opt" data-k="${k}"><span class="ar">${esc(o.a)}</span></button>`).join('')}`;
    } else {
      body = `<p class="muted small">اختر الكلمة المناسبة لـ:</p><p class="ar" style="font-size:1.3rem"><b>${esc(c.a)}</b></p>${Q.opts.map((o, k) => `<button class="quiz-opt" data-k="${k}">${T(C, o.w)}</button>`).join('')}`;
    }
    app.innerHTML = pageHead(title, `${i + 1} / ${Qs.length}`) + `<div class="wrap" dir="rtl" lang="ar" style="max-width:720px;padding-top:18px">
      <div class="qbar"><i style="width:${(i / Qs.length) * 100}%"></i></div><div class="card stack" style="margin-top:14px">${body}
      ${c.ref ? `<p class="src">${esc(surahName(c.ref[0]))} ${c.ref.join(':')} — QuranEnc · <span translate="no">${esc(C.key)}</span></p>` : ''}</div></div>`;
    wireSay(app, C);
    const after = (ok) => { if (ok) correct++; srsUpdate(C, c.w, ok); setTimeout(() => { i++; step(); }, ok ? 700 : 1700); };
    if (Q.type === 'type') {
      const inp = app.querySelector('#ti'); inp.focus();
      app.querySelector('#tf').onsubmit = (e) => {
        e.preventDefault(); const ok = plain(inp.value) === plain(c.w); inp.disabled = true;
        app.querySelector('#fb').innerHTML = ok ? '<span class="chip" style="background:var(--ok-soft);color:var(--ok)">✓ أحسنت</span>' : `<span class="chip red">✗</span> الصواب: ${T(C, c.w, 'b')}`;
        after(ok);
      };
    } else {
      const ans = Q.opts.indexOf(c);
      app.querySelectorAll('.quiz-opt').forEach((b) => b.onclick = () => {
        const ok = +b.dataset.k === ans;
        app.querySelectorAll('.quiz-opt').forEach((x) => { x.disabled = true; if (+x.dataset.k === ans) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong'); after(ok);
      });
    }
  };
  const finish = async () => {
    const score = Math.round((100 * correct) / Qs.length), pass = score >= CONFIG.passScore;
    if (pass) { confetti(); await markDone(lesson ? keyOf(C, lvl.id, +idx - 1) : keyOf(C, lvl.id, 'test')); }
    const nextLvl = C.levels[C.levels.indexOf(lvl) + 1];
    app.innerHTML = pageHead(title) + `<div class="wrap center" dir="rtl" lang="ar" style="max-width:560px;padding-top:26px">
      <div class="card stack" style="align-items:center;display:flex;flex-direction:column">
        <div class="ring" style="--p:${score};--size:150px"><b>${score}<small>%</small></b></div>
        <h2>${pass ? '🌟 نجحت' : 'حاول مرة أخرى'}</h2><p class="muted">${correct} / ${Qs.length} · النجاح ${CONFIG.passScore}%</p>
        <div class="row" style="justify-content:center"><a class="btn" href="${href('lang/quiz/' + lvl.id + (idx ? '/' + idx : ''))}" onclick="setTimeout(()=>dispatchEvent(new HashChangeEvent('hashchange')),0)">🔁 أعد</a>
          <a class="btn primary" href="${href('lang/' + lvl.id)}">${esc(lvl.t)}</a>
          ${pass && !lesson && nextLvl ? `<a class="btn gold" href="${href('lang/' + nextLvl.id)}">${esc(nextLvl.t)} ←</a>` : ''}</div></div></div>`;
  };
  step();
}
