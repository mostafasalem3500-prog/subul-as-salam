// =====================================================================
//  «لوحة الحفظ» — خريطة جزء عمّ، خطة الورد اليومي، اختبار «أكمل الآية»،
//  والأحاديث المحفوظة. النص العثماني والترجمة من QuranEnc، والأحاديث من HadeethEnc.
//  #/{L}/hifz        اللوحة
//  #/{L}/hifz/test   اختبار «أكمل الآية» من السور المحفوظة
// =====================================================================
import { CONFIG } from '../config.js';
import { QE, HE } from '../api.js';
import { S, esc, href, toast, confetti, loading } from '../core.js';
import { SURAHS, surahName, surahAyat } from '../curriculum.js';
import { t, getUiLang } from '../i18n.js';
import { pageHead, ayahMark, qLangDir } from './components.js';
import { shuffle } from './quizengine.js';

// ترتيب الحفظ المعتاد للمبتدئ: الفاتحة ثم من الناس صعودًا إلى النبأ
export const HIFZ_ORDER = [1, ...Array.from({ length: 37 }, (_, i) => 114 - i)];
const TOTAL = HIFZ_ORDER.reduce((n, s) => n + surahAyat(s), 0);

// نصوص الواجهة (العربية + لغة القسم؛ الكينيارواندية تعرض الإنجليزية حتى يراجعها متحدث أصلي)
const TX = {
  ar: { title: 'لوحة الحفظ', sub: 'جزء عمّ والفاتحة · الأحاديث المحفوظة · اختبر حفظك', map: 'خريطة الحفظ', plan: 'خطة الورد اليومي', perDay: 'آيات في اليوم', finish: 'تُتمّ جزء عمّ خلال', days: 'يومًا تقريبًا', doneAll: 'أتممت جزء عمّ — بارك الله فيك', test: 'اختبر حفظك: أكمل الآية', testHint: 'تظهر لك آية، فاختر الآية التي تليها في المصحف.', ayat: 'آية', surahs: 'سورة', hadiths: 'حديث', myHadith: 'أحاديثي المحفوظة', noHadith: 'لم تحفظ حديثًا بعد. افتح الأحاديث واضغط «حفظتها».', login: 'سجّل الدخول كطالب ليُحفظ تقدّمك ويراه مشرفك.', next: 'ما الآية التي تليها؟', none: 'لا توجد سور محفوظة بعد، فالاختبار من الفاتحة والمعوّذتين والإخلاص.', legend: ['لم تبدأ', 'أحفظها الآن', 'حفظتها', 'وثّقها المشرف'] },
  en: { title: 'Memorization board', sub: 'Juz ʿAmma & al-Fātiḥah · memorized hadiths · test yourself', map: 'Memorization map', plan: 'Daily plan', perDay: 'verses per day', finish: 'You will finish Juz ʿAmma in about', days: 'days', doneAll: 'You have completed Juz ʿAmma — may Allah bless you', test: 'Test yourself: complete the verse', testHint: 'A verse appears; choose the verse that follows it in the Mushaf.', ayat: 'verses', surahs: 'surahs', hadiths: 'hadiths', myHadith: 'My memorized hadiths', noHadith: 'No memorized hadith yet. Open Hadith and press “Memorized”.', login: 'Log in as a student to save your progress for your supervisor.', next: 'Which verse comes next?', none: 'No memorized surahs yet, so the test uses al-Fātiḥah, al-Ikhlāṣ, al-Falaq and an-Nās.', legend: ['Not started', 'Learning', 'Memorized', 'Verified'] },
  es: { title: 'Tablero de memorización', sub: 'Yuz ʿAmma y al-Fátiha · hadices memorizados · ponte a prueba', map: 'Mapa de memorización', plan: 'Plan diario', perDay: 'aleyas al día', finish: 'Terminarás el Yuz ʿAmma en unos', days: 'días', doneAll: 'Has completado el Yuz ʿAmma — que Al-lah te bendiga', test: 'Ponte a prueba: completa la aleya', testHint: 'Aparece una aleya; elige la que le sigue en el Mus-haf.', ayat: 'aleyas', surahs: 'suras', hadiths: 'hadices', myHadith: 'Mis hadices memorizados', noHadith: 'Aún no hay hadices memorizados. Abre Hadiz y pulsa «Memorizado».', login: 'Inicia sesión como estudiante para guardar tu progreso.', next: '¿Qué aleya sigue?', none: 'Aún no hay suras memorizadas; la prueba usa al-Fátiha, al-Ijlás, al-Falaq y an-Nás.', legend: ['Sin empezar', 'Aprendiendo', 'Memorizada', 'Verificada'] },
  sw: { title: 'Ubao wa kuhifadhi', sub: 'Juzuu Amma na Al-Fatiha · hadithi nilizohifadhi · jipime', map: 'Ramani ya kuhifadhi', plan: 'Mpango wa kila siku', perDay: 'aya kwa siku', finish: 'Utamaliza Juzuu Amma baada ya takriban', days: 'siku', doneAll: 'Umemaliza Juzuu Amma — Mwenyezi Mungu akubariki', test: 'Jipime: kamilisha aya', testHint: 'Aya inaonekana; chagua aya inayofuata katika Msahafu.', ayat: 'aya', surahs: 'sura', hadiths: 'hadithi', myHadith: 'Hadithi nilizohifadhi', noHadith: 'Bado hujahifadhi hadithi. Fungua Hadithi na ubonyeze «Nimehifadhi».', login: 'Ingia kama mwanafunzi ili maendeleo yako yahifadhiwe.', next: 'Aya ipi inafuata?', none: 'Bado hakuna sura ulizohifadhi; jaribio linatumia Al-Fatiha, Al-Ikhlas, Al-Falaq na An-Nas.', legend: ['Bado', 'Ninahifadhi', 'Nimehifadhi', 'Imethibitishwa'] },
};
const X = () => TX[getUiLang()] || TX.en;
const RK = 'subul-hifz-rate';

async function memoOf() {
  if (S.me?.role !== 'student') return [];
  return S.db.memo().catch(() => []);
}

export async function route(app, sub) {
  if (sub === 'test') return test(app);
  return board(app);
}

async function board(app) {
  app.innerHTML = loading();
  const x = X(), memo = await memoOf();
  const st = (s) => memo.find((m) => m.kind === 'surah' && m.ref === String(s))?.status || '';
  const doneAyat = HIFZ_ORDER.filter((s) => ['memorized', 'verified'].includes(st(s))).reduce((n, s) => n + surahAyat(s), 0);
  const doneSur = HIFZ_ORDER.filter((s) => ['memorized', 'verified'].includes(st(s))).length;
  const hads = memo.filter((m) => m.kind === 'hadith' && m.status !== 'learning');
  const pct = Math.round((100 * doneAyat) / TOTAL);
  const rate = Math.max(1, Math.min(50, +localStorage.getItem(RK) || 3));
  const nextS = HIFZ_ORDER.find((s) => !['memorized', 'verified'].includes(st(s)));
  const maxA = Math.max(...HIFZ_ORDER.map(surahAyat));

  app.innerHTML = `${pageHead('🧠 ' + esc(x.title), esc(x.sub), `<div class="ring" style="--p:${pct};--size:96px"><b style="font-size:1.25rem">${pct}<small>%</small></b></div>`)}
  <div class="wrap stack" style="padding-top:16px">
    ${S.me?.role === 'student' ? '' : `<p class="notice small">${esc(x.login)}</p>`}
    <div class="lc-stats">
      <div class="card"><b class="num">${doneAyat}<small style="font-size:.9rem">/${TOTAL}</small></b><span>${esc(x.ayat)}</span><i class="bar"><i style="width:${pct}%"></i></i></div>
      <div class="card"><b class="num">${doneSur}<small style="font-size:.9rem">/${HIFZ_ORDER.length}</small></b><span>${esc(x.surahs)}</span></div>
      <div class="card"><b class="num">${hads.length}</b><span>${esc(x.hadiths)}</span></div>
      <a class="card lift" href="${href('hifz/test')}"><b class="num">🎯</b><span>${esc(x.test)}</span></a>
    </div>

    <section class="card stack hz-plan">
      <h2>📅 ${esc(x.plan)}</h2>
      <div class="row"><input type="range" id="rate" min="1" max="20" value="${Math.min(rate, 20)}" style="flex:1" aria-label="${esc(x.perDay)}"><b id="rv" class="num" style="min-width:3ch;text-align:center">${rate}</b><span>${esc(x.perDay)}</span></div>
      <p id="eta" class="lead-sm"></p>
      ${nextS ? `<a class="btn primary" href="${href('quran/' + nextS)}">▶ <span lang="ar" style="font-family:var(--quran)">سورة ${esc(surahName(nextS))}</span> · ${surahAyat(nextS)} ${esc(x.ayat)}</a>` : ''}
    </section>

    <section class="stack">
      <h2>🗺️ ${esc(x.map)}</h2>
      <div class="hz-legend small">${x.legend.map((l, i) => `<span><i class="hz-dot s${i}"></i>${esc(l)}</span>`).join('')}</div>
      <div class="hz-map">${HIFZ_ORDER.map((s, i) => {
        const v = st(s), k = v === 'verified' ? 3 : v === 'memorized' ? 2 : v === 'learning' ? 1 : 0;
        return `<a class="hz-tile s${k}${s === nextS ? ' next' : ''}" href="${href('quran/' + s)}" style="--h:${0.55 + (0.45 * surahAyat(s)) / maxA};--d:${i * 18}ms" title="${esc(surahName(s))} · ${surahAyat(s)}">
          <span class="n">${s}</span><b lang="ar">${esc(surahName(s))}</b><small>${surahAyat(s)}</small></a>`;
      }).join('')}</div>
      <p class="src">QuranEnc.com · ${esc(S.qKey)} · <span lang="ar">مصحف المدينة — رواية حفص</span></p>
    </section>

    <section class="stack">
      <h2>🌿 ${esc(x.myHadith)}</h2>
      <div id="hz-h" class="stack">${hads.length ? hads.map((h) => `<a class="card lift" href="${href('hadith/' + h.ref)}" data-hid="${esc(h.ref)}" style="text-decoration:none;color:inherit" dir="${qLangDir(S.lang)}" lang="${S.lang}" translate="no">${h.status === 'verified' ? '✔' : '⭐'} <span class="skeleton" style="display:inline-block;width:60%">&nbsp;</span></a>`).join('') : `<p class="muted">${esc(x.noHadith)} <a href="${href('hadith')}">${t('hadith')} ←</a></p>`}</div>
    </section>
  </div>`;

  const eta = () => {
    const r = +app.querySelector('#rate').value, left = TOTAL - doneAyat;
    app.querySelector('#rv').textContent = r; localStorage.setItem(RK, r);
    app.querySelector('#eta').innerHTML = left <= 0 ? `🎉 ${esc(x.doneAll)}` : `${esc(x.finish)} <b class="num">${Math.ceil(left / r)}</b> ${esc(x.days)} (${left} ${esc(x.ayat)})`;
  };
  app.querySelector('#rate').oninput = eta; eta();
  app.querySelectorAll('[data-hid]').forEach(async (a) => {
    try { const h = await HE.one(CONFIG.languages[S.lang].hadeeth, a.dataset.hid); a.querySelector('.skeleton').outerHTML = `<span>${esc(h.title)}</span>`; }
    catch { a.querySelector('.skeleton').outerHTML = `<span>HadeethEnc #${esc(a.dataset.hid)}</span>`; }
  });
}

// ---------------------------------------------------------------- اختبار «أكمل الآية»
async function test(app) {
  app.innerHTML = loading();
  const x = X(), memo = await memoOf();
  let surahs = memo.filter((m) => m.kind === 'surah' && m.status !== 'learning').map((m) => +m.ref).filter((s) => surahAyat(s) > 1);
  const fallback = !surahs.length;
  if (fallback) surahs = [1, 112, 113, 114];
  const key = S.qKey;
  const data = (await Promise.all(surahs.map((s) => QE.sura(key, s).catch(() => [])))).filter((r) => r.length > 1);
  const pool = data.flat();
  // كل سؤال: آية → الآية التي تليها من السورة نفسها
  const pairs = shuffle(data.flatMap((rows) => rows.slice(0, -1).map((r, i) => [r, rows[i + 1]]))).slice(0, 8);
  if (!pairs.length) { app.innerHTML = `<div class="wrap"><p class="card">${t('error')}</p></div>`; return; }
  let i = 0, correct = 0;
  const step = () => {
    if (i >= pairs.length) return finish();
    const [q, a] = pairs[i];
    const opts = shuffle([a, ...shuffle(pool.filter((r) => r !== a && r !== q && r.arabic_text !== a.arabic_text)).slice(0, 3)]);
    const ans = opts.indexOf(a);
    app.innerHTML = `${pageHead('🎯 ' + esc(x.test), `${i + 1} / ${pairs.length}`)}
    <div class="wrap" style="max-width:760px;padding-top:16px">
      <div class="qbar"><i style="width:${(i / pairs.length) * 100}%"></i></div>
      <div class="card stack" style="margin-top:14px">
        ${i === 0 && fallback ? `<p class="notice small">${esc(x.none)}</p>` : ''}
        <p class="muted small">${esc(x.testHint)}</p>
        <div class="quran-ar" lang="ar" translate="no">${esc(q.arabic_text)} ${ayahMark(q.aya)}</div>
        <p class="tiny muted" lang="ar">سورة ${esc(surahName(q.sura))} · ${q.sura}:${q.aya}</p>
        <p><b>${esc(x.next)}</b></p>
        <div>${opts.map((o, k) => `<button class="quiz-opt" data-k="${k}"><span class="quran-ar" style="font-size:1.3rem;line-height:2" lang="ar" translate="no">${esc(o.arabic_text)}</span></button>`).join('')}</div>
        <p class="src">QuranEnc.com — ${esc(key)}</p>
      </div></div>`;
    app.querySelectorAll('.quiz-opt').forEach((b) => b.onclick = () => {
      const ok = +b.dataset.k === ans;
      app.querySelectorAll('.quiz-opt').forEach((y) => { y.disabled = true; if (+y.dataset.k === ans) y.classList.add('right'); });
      if (!ok) b.classList.add('wrong'); else correct++;
      setTimeout(() => { i++; step(); }, ok ? 700 : 1800);
    });
  };
  const finish = () => {
    const score = Math.round((100 * correct) / pairs.length);
    if (score >= CONFIG.passScore) confetti();
    app.innerHTML = `${pageHead('🎯 ' + esc(x.test))}
    <div class="wrap center" style="max-width:560px;padding-top:26px"><div class="card stack" style="align-items:center;display:flex;flex-direction:column">
      <div class="ring" style="--p:${score};--size:150px"><b>${score}<small>%</small></b></div>
      <p class="muted">${correct} / ${pairs.length}</p>
      <div class="row" style="justify-content:center"><button class="btn" id="again">🔁</button><a class="btn primary" href="${href('hifz')}">🧠 ${esc(x.title)}</a></div></div></div>`;
    app.querySelector('#again').onclick = () => test(app);
    toast(`${score}%`);
  };
  step();
}
