// محرّك الاختبار الآلي: الأسئلة تُبنى من نصوص QuranEnc نفسها (لا نص مولَّد)
//  - نوع «tr»: آية عربية ← اختر ترجمتها
//  - نوع «ar»: ترجمة ← اختر الآية
//  - نوع «bank»: سؤال من بنك الأسئلة (يكتبه فريق التعليم بلغة الطالب)
import { CONFIG } from '../config.js';
import { QE } from '../api.js';
import { S, esc, confetti } from '../core.js';
import { surahName } from '../curriculum.js';
import { t } from '../i18n.js';
import { pageHead, qLangDir, ayahMark } from './components.js';

export const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// targets: سور الأسئلة · extras: سور للخيارات فقط
export async function buildQuestions({ targets, extras = [], n = 6, bank = [], bankN = 4 }) {
  const key = S.qKey;
  const load = async (list) => (await Promise.all([...new Set(list)].map((s) => QE.sura(key, s).catch(() => [])))).flat().filter((r) => r.translation && r.arabic_text);
  const own = await load(targets);
  const more = await load(extras.filter((s) => !targets.includes(s)));
  const pool = [...own, ...more];
  const Qs = shuffle(own).slice(0, n).map((r, i) => {
    const opts = shuffle([r, ...shuffle(pool.filter((x) => x !== r && x.translation !== r.translation)).slice(0, 3)]);
    return { type: i % 2 ? 'ar' : 'tr', r, opts, ans: opts.indexOf(r) };
  });
  shuffle(bank).slice(0, bankN).forEach((q) => Qs.push({ type: 'bank', q, ans: q.answer }));
  return shuffle(Qs);
}

// يعرض الاختبار سؤالًا سؤالًا، ثم يستدعي onFinish(correct, total, details)
export function runQuiz(app, { title, Qs, onFinish }) {
  const lang = S.lang, key = S.qKey;
  let i = 0, correct = 0; const details = [];
  const step = () => {
    if (i >= Qs.length) return onFinish(correct, Qs.length, details);
    const Q = Qs[i];
    let prompt, options;
    if (Q.type === 'tr') {
      prompt = `<p class="muted small">${t('pickTranslation')}</p><div class="quran-ar" lang="ar" translate="no">${esc(Q.r.arabic_text)} ${ayahMark(Q.r.aya)}</div><p class="tiny muted">${esc(surahName(Q.r.sura))} ${Q.r.sura}:${Q.r.aya}</p>`;
      options = Q.opts.map((o) => `<span dir="${qLangDir(lang)}" lang="${lang}" translate="no">${esc(o.translation)}</span>`);
    } else if (Q.type === 'ar') {
      prompt = `<p class="muted small">${t('pickAyah')}</p><p dir="${qLangDir(lang)}" lang="${lang}" translate="no" style="font-size:1.08rem"><b>${esc(Q.r.translation)}</b></p>`;
      options = Q.opts.map((o) => `<span class="quran-ar" style="font-size:1.35rem;line-height:2" lang="ar" translate="no">${esc(o.arabic_text)}</span>`);
    } else {
      prompt = `<p dir="auto" lang="${lang}" style="font-size:1.1rem"><b>${esc(Q.q.question)}</b></p>${Q.q.source ? `<p class="tiny muted">${esc(Q.q.source)}</p>` : ''}`;
      options = (Q.q.options || []).map((o) => `<span dir="auto" lang="${lang}">${esc(o)}</span>`);
    }
    app.innerHTML = `${pageHead(title, `${i + 1} / ${Qs.length}`)}
    <div class="wrap" style="max-width:760px;padding-top:20px">
      <div class="qbar"><i style="width:${(i / Qs.length) * 100}%"></i></div>
      <div class="card stack" style="margin-top:14px">${prompt}
        <div>${options.map((o, k) => `<button class="quiz-opt" data-k="${k}">${o}</button>`).join('')}</div>
        <p class="src">QuranEnc.com — ${esc(key)}</p>
      </div></div>`;
    app.querySelectorAll('.quiz-opt').forEach((b) => b.onclick = () => {
      const k = +b.dataset.k, ok = k === +Q.ans;
      app.querySelectorAll('.quiz-opt').forEach((x) => { x.disabled = true; if (+x.dataset.k === +Q.ans) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong'); else correct++;
      details.push({ type: Q.type, ref: Q.r ? `${Q.r.sura}:${Q.r.aya}` : Q.q?.id, ok });
      setTimeout(() => { i++; step(); }, ok ? 700 : 1600);
    });
  };
  if (!Qs.length) { app.innerHTML = `<div class="wrap"><p class="card">${t('error')}</p></div>`; return; }
  step();
}

export function resultHTML(title, score, correct, total, buttons) {
  const pass = score >= CONFIG.passScore;
  if (pass) confetti();
  return `${pageHead(`${t('result')}: ${title}`)}
    <div class="wrap center" style="max-width:560px;padding-top:30px">
      <div class="card stack" style="align-items:center;display:flex;flex-direction:column">
        <div class="ring" style="--p:${score};--size:150px"><b>${score}<small>%</small></b></div>
        <h2>${pass ? '🌟 ' + t('passed') : t('tryAgain')}</h2>
        <p class="muted">${correct} / ${total}</p>
        <div class="row" style="justify-content:center">${buttons}</div>
      </div></div>`;
}
