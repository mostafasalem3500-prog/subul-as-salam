// =====================================================================
//  أوسمة التحفيز — تُحسب من بيانات الطالب نفسها (لا تُخزَّن)، فيراها الطالب ومشرفه
// =====================================================================
import { getUiLang } from './i18n.js';
import { surahAyat } from './curriculum.js';

const JUZ_AMMA = [1, ...Array.from({ length: 37 }, (_, i) => 114 - i)];
// [id, icon, test(ctx), names {ar,en,es,sw}]  — الكينيارواندية تعرض الإنجليزية حتى يراجعها متحدث أصلي
const LIST = [
  ['start', '🌱', (c) => c.items > 0, { ar: 'الخطوة الأولى', en: 'First step', es: 'Primer paso', sw: 'Hatua ya kwanza' }],
  ['stage1', '🏁', (c) => c.stages >= 1, { ar: 'أتمّ أول محطة', en: 'First stage done', es: 'Primera etapa', sw: 'Hatua ya kwanza imekamilika' }],
  ['stage6', '⭐', (c) => c.stages >= 6, { ar: 'نصف الرحلة', en: 'Halfway', es: 'Mitad del camino', sw: 'Nusu ya safari' }],
  ['stage12', '🏆', (c) => c.stages >= 12, { ar: 'أتمّ المنهج', en: 'Curriculum complete', es: 'Plan completo', sw: 'Mtaala umekamilika' }],
  ['q100', '💯', (c) => c.best100, { ar: 'درجة كاملة', en: 'Perfect score', es: 'Puntuación perfecta', sw: 'Alama kamili' }],
  ['s3', '🧠', (c) => c.surahs >= 3, { ar: 'حفظ 3 سور', en: '3 surahs memorized', es: '3 suras memorizadas', sw: 'Sura 3 zimehifadhiwa' }],
  ['s10', '📖', (c) => c.surahs >= 10, { ar: 'حفظ 10 سور', en: '10 surahs memorized', es: '10 suras memorizadas', sw: 'Sura 10 zimehifadhiwa' }],
  ['juz', '🌙', (c) => c.juzAyat >= c.juzTotal, { ar: 'أتمّ جزء عمّ', en: 'Juz ʿAmma complete', es: 'Yuz ʿAmma completo', sw: 'Juzuu Amma imekamilika' }],
  ['verified', '✔', (c) => c.verified >= 1, { ar: 'حفظ موثّق من المشرف', en: 'Verified by supervisor', es: 'Verificado por el supervisor', sw: 'Imethibitishwa na msimamizi' }],
  ['h5', '🌿', (c) => c.hadiths >= 5, { ar: 'حفظ 5 أحاديث', en: '5 hadiths memorized', es: '5 hadices memorizados', sw: 'Hadithi 5 zimehifadhiwa' }],
  ['pray', '🕌', (c) => c.prayers >= 35, { ar: '35 صلاة مسجّلة', en: '35 prayers logged', es: '35 oraciones registradas', sw: 'Swala 35 zimerekodiwa' }],
  ['streak7', '🔥', (c) => c.streak >= 7, { ar: 'أسبوع متواصل', en: '7-day streak', es: 'Racha de 7 días', sw: 'Siku 7 mfululizo' }],
  ['streak30', '☄️', (c) => c.streak >= 30, { ar: 'شهر متواصل', en: '30-day streak', es: 'Racha de 30 días', sw: 'Siku 30 mfululizo' }],
  ['reader', '📚', (c) => c.tracks >= 5, { ar: 'قارئ نهِم', en: 'Avid reader', es: 'Lector ávido', sw: 'Msomaji hodari' }],
];

export function achievements({ D, P, streak = 0 }) {
  const mem = (D.memo || []).filter((m) => m.status !== 'learning');
  const sur = mem.filter((m) => m.kind === 'surah').map((m) => +m.ref);
  const c = {
    items: (D.progress || []).length + (D.quizzes || []).length,
    stages: P.stages.filter((s) => s.complete).length,
    best100: (D.quizzes || []).some((q) => q.score >= 100),
    surahs: sur.length,
    juzAyat: JUZ_AMMA.filter((s) => sur.includes(s)).reduce((n, s) => n + surahAyat(s), 0),
    juzTotal: JUZ_AMMA.reduce((n, s) => n + surahAyat(s), 0),
    verified: (D.memo || []).filter((m) => m.status === 'verified').length,
    hadiths: mem.filter((m) => m.kind === 'hadith').length,
    prayers: (D.progress || []).filter((p) => p.kind === 'prayer').length,
    tracks: (D.progress || []).filter((p) => p.kind === 'track').length,
    streak,
  };
  const ui = getUiLang();
  return { ctx: c, list: LIST.map(([id, icon, test, n]) => ({ id, icon, got: !!test(c), name: n[ui] || n.en, ar: n.ar })) };
}

export function badgesHTML(A) {
  const got = A.list.filter((b) => b.got).length;
  return `<div class="card stack"><div class="row between"><h3>🏅 <span lang="ar">الأوسمة</span> · Badges</h3><span class="chip gold">${got} / ${A.list.length}</span></div>
    <div class="bdg-grid">${A.list.map((b, i) => `<div class="bdg${b.got ? ' got' : ''}" style="--d:${i * 40}ms" title="${b.ar}"><span class="bi">${b.icon}</span><small dir="auto">${b.name}</small></div>`).join('')}</div></div>`;
}

// خريطة حفظ مصغّرة (للمتابعة والتقرير)
export function miniHifzHTML(memo, names) {
  const st = (s) => memo.find((m) => m.kind === 'surah' && m.ref === String(s))?.status || '';
  return `<div class="hz-mini">${JUZ_AMMA.map((s) => { const v = st(s), k = v === 'verified' ? 3 : v === 'memorized' ? 2 : v === 'learning' ? 1 : 0;
    return `<span class="hz-tile s${k}" title="${names(s)}"><b lang="ar">${names(s)}</b></span>`; }).join('')}</div>`;
}
