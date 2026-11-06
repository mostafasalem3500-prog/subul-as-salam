// الحالة المشتركة والأدوات العامة
import { CONFIG } from './config.js';
import { STAGES, stageTasks } from './curriculum.js';
import { setUiLang, uiDir, getUiLang } from './i18n.js';

export const S = {
  db: null,
  me: null,
  get lang() { return this.me?.lang || localStorage.getItem('subul-lang') || CONFIG.defaultLang; },
  set lang(v) { localStorage.setItem('subul-lang', v); },
  get qKey() { const L = CONFIG.languages[this.lang]; const k = localStorage.getItem('subul-qkey-' + this.lang); return L.quran.includes(k) ? k : L.quran[0]; },
  set qKey(v) { localStorage.setItem('subul-qkey-' + this.lang, v); },
  get reciter() { return localStorage.getItem('subul-reciter') || 'Alafasy_128kbps'; },
  set reciter(v) { localStorage.setItem('subul-reciter', v); },
};

export function applyUi(l) {
  if (l) localStorage.setItem('subul-ui', l);
  const want = localStorage.getItem('subul-ui') || (['supervisor', 'admin', 'supervisor_pending'].includes(S.me?.role) ? 'ar' : S.lang);
  setUiLang(want);
  document.documentElement.lang = getUiLang();
  document.documentElement.dir = uiDir();
  document.body.dir = uiDir();
}

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const html = (strings, ...vals) => strings.reduce((a, s, i) => a + s + (i < vals.length ? (Array.isArray(vals[i]) ? vals[i].join('') : vals[i] ?? '') : ''), '');

export function toast(msg, ms = 2600) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.append(d);
  setTimeout(() => d.remove(), ms);
}
export function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const colors = ['#c9a227', '#1c8f70', '#e0bd5f', '#12735a', '#ffffff'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i');
    p.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % 5]};animation-delay:${Math.random() * .8}s;animation-duration:${2 + Math.random() * 1.6}s`;
    box.append(p);
  }
  document.body.append(box); setTimeout(() => box.remove(), 4200);
}
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const ago = (d) => {
  if (!d) return '—'; const days = Math.floor((Date.now() - new Date(d)) / 864e5);
  return days <= 0 ? 'اليوم' : days === 1 ? 'أمس' : `قبل ${days} يومًا`;
};
export const loading = () => `<div class="stack" aria-busy="true"><div class="skeleton" style="height:22px;width:60%"></div><div class="skeleton" style="height:80px"></div><div class="skeleton" style="height:80px"></div></div>`;

export function reveal(root = document) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.reveal', root).forEach((el) => io.observe(el));
}

// يحوّل "1:1-7" إلى {s:1,from:1,to:7}
export function parseRef(r) {
  const [s, a] = String(r).split(':'); const [from, to] = (a || '1').split('-').map(Number);
  return { s: +s, from, to: to || from };
}

// -------- حساب التقدّم: نفس المنطق للطالب والمشرف --------
export function computeProgress(lang, { progress = [], quizzes = [], evals = [], memo = [] }) {
  const done = new Set(progress.map((p) => p.item_key));
  memo.filter((m) => m.kind === 'surah' && m.status !== 'learning').forEach((m) => done.add('quran:' + m.ref));
  const stages = STAGES.map((st) => {
    const tasks = stageTasks(st, lang);
    const qs = quizzes.filter((q) => q.stage_id === st.id);
    const bestQuiz = qs.length ? Math.max(...qs.map((q) => q.score)) : null;
    const ev = evals.filter((e) => e.stage_id === st.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
    const doneTasks = tasks.filter((t) => done.has(t.key)).length;
    const quizOk = bestQuiz !== null && bestQuiz >= CONFIG.passScore;
    const total = tasks.length + 1;
    const pct = Math.round(((doneTasks + (quizOk ? 1 : 0)) / total) * 100);
    const complete = (ev && ev.passed) || pct === 100;
    const scores = [bestQuiz, ev?.score].filter((x) => x !== null && x !== undefined);
    return { stage: st, tasks, doneTasks, bestQuiz, eval: ev, pct, complete, grade: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null };
  });
  const currentIdx = Math.max(0, stages.findIndex((x) => !x.complete));
  const allDone = stages.every((x) => x.complete);
  const overall = Math.round(stages.reduce((a, x) => a + x.pct, 0) / stages.length);
  const graded = stages.filter((x) => x.grade !== null);
  const avg = graded.length ? Math.round(graded.reduce((a, x) => a + x.grade, 0) / graded.length) : null;
  return { stages, done, current: allDone ? stages.length - 1 : currentIdx, allDone, overall, avg };
}

export async function loadStudentData(id) {
  const db = S.db;
  const [progress, quizzes, evals, memo] = await Promise.all([db.progress(id), db.quizzes(id), db.evaluations(id), db.memo(id)]);
  return { progress, quizzes, evals, memo };
}

// تحميل ملفات «رفيق الداعية» (JSON) عند الحاجة
const rq = {};
export async function rafiq(name) {
  if (!rq[name]) rq[name] = fetch(`data/rafiq/${name}.json`).then((r) => r.json());
  return rq[name];
}
// نقاط نبّه المراجعون أنها تحتاج مراجعة طالب علم (من سجل مشروع رفيق الداعية)
export const RAFIQ_REVIEW = new Set(['f22', 'f25', 'f40', 'f48', 'f26', 'f27', 'f28', 'f37',
  'mc167', 'md008', 'md121', 'md095', 'md141', 'mb128', 'mb133', 'mb170', 'mb160', 't14', 't18']);
