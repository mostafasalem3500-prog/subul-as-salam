// نافذة المشرف: طلابي، تفاصيل الطالب وتقييمه، بنك الأسئلة، والإدارة
import { CONFIG } from '../config.js';
import { S, esc, toast, ago, computeProgress, loadStudentData, loading, reveal, isSup, href, rafiq } from '../core.js';
import { QE, HE } from '../api.js';
import { SURAHS, surahName } from '../curriculum.js';
import { getCourse } from './langcourse.js';
import { DAWAH_WORDS } from '../dawah-words.js';
import { messageBank } from './hub.js';
import { STAGES } from '../curriculum.js';
import { t, stageTitle } from '../i18n.js';
import { pageHead, needLogin } from './components.js';

const gate = () => {
  if (!S.me) return needLogin();
  if (!isSup()) return `<div class="wrap" style="padding-top:30px"><div class="card" lang="ar">${S.me.role === 'supervisor_pending' ? 'طلب الإشراف قيد المراجعة من إدارة المنصة.' : 'هذه الصفحة للمشرفين المعتمدين.'}</div></div>`;
  return null;
};
const langChip = (l) => `<span class="chip sky" dir="ltr">${esc(l || '')}</span>`;

// ---------------------------------------------------------------- لوحة المشرف
export async function dashboard(app) {
  const g = gate(); if (g) return g;
  app.innerHTML = loading();
  const [allStudents, links, unread] = await Promise.all([S.db.myStudents(), S.db.links(), S.db.unread().catch(() => [])]);
  // كل قسم لغة يعرض طلاب لغته فقط، مع روابط لطلاب اللغات الأخرى
  const LG = S.lang;
  const students = allStudents.filter((x) => (x.lang || CONFIG.defaultLang) === LG);
  const others = Object.keys(CONFIG.languages).filter((l) => l !== LG).map((l) => [l, allStudents.filter((x) => x.lang === l).length]).filter(([, c]) => c);
  const reqs = links.filter((l) => l.status === 'pending' && l.waitingForMe);
  const sent = links.filter((l) => l.status === 'pending' && !l.waitingForMe);
  const unreadOf = (id) => unread.filter((m) => m.student_id === id).length;
  const invite = S.me.supervisor_code ? `${location.origin}${location.pathname}#/${LG}/join/${S.me.supervisor_code}` : '';
  const rows = await Promise.all(students.map(async (s) => ({ s, P: computeProgress(s.lang || CONFIG.defaultLang, await loadStudentData(s.id)) })));
  rows.sort((a, b) => new Date(b.s.last_activity || 0) - new Date(a.s.last_activity || 0));
  const n = rows.length;
  const avgProg = n ? Math.round(rows.reduce((a, r) => a + r.P.overall, 0) / n) : 0;
  const graded = rows.filter((r) => r.P.avg !== null);
  const avgScore = graded.length ? Math.round(graded.reduce((a, r) => a + r.P.avg, 0) / graded.length) : '—';
  const active = rows.filter((r) => r.s.last_activity && Date.now() - new Date(r.s.last_activity) < 7 * 864e5).length;
  const dist = STAGES.map((_, i) => rows.filter((r) => r.P.current === i && !r.P.allDone).length);
  const maxD = Math.max(1, ...dist);

  const tiles = [['cards', '🃏', t('cards'), t('makeCard')], ['guide', '🧭', t('guide'), 'رفيق الداعية'], ['language', '🗣️', t('langLearn'), esc(CONFIG.languages[LG].name)],
                 ['material', '📚', t('material'), `${t('booksGuide')} · ${t('videos')}`]];
  app.innerHTML = `${pageHead('🎓 ' + t('supervisor') + ' · ' + esc(CONFIG.languages[LG].name), `<span lang="ar">${esc(S.me.full_name || '')}</span>`,
    `<div class="card flat center" style="padding:10px 16px"><span class="tiny muted">${t('myCode')}</span><div dir="ltr" style="font-family:var(--lat);font-weight:800;font-size:1.5rem;letter-spacing:.18em;color:var(--green-2)">${esc(S.me.supervisor_code || '—')}</div></div>`)}
  <div class="wrap stack" style="padding-top:20px">
    <div class="grid">${tiles.map(([k, ic, a, b]) => `<a class="card lift item" href="#/${LG}/supervisor/${k}"><span class="ic">${ic}</span><span><h3>${a}</h3><span class="desc">${b}</span></span></a>`).join('')}</div>
    ${others.length ? `<p class="small">${t('otherLangs')}: ${others.map(([l, c]) => `<a class="chip sky" href="#/${l}/supervisor">${esc(CONFIG.languages[l].name)} · ${c}</a>`).join(' ')}</p>` : ''}
    <div class="stats reveal">
      <div class="stat"><b>${n}</b><span>${t('students')}</span></div>
      <div class="stat"><b>${avgProg}%</b><span>${t('progress')}</span></div>
      <div class="stat"><b>${avgScore}</b><span>${t('avgScore')}</span></div>
      <div class="stat"><b>${active}</b><span lang="ar">نشِطون آخر 7 أيام</span></div>
    </div>
    ${reqs.length ? `<div class="card stack" style="border:2px solid var(--gold-2)"><h3>🔔 ${t('requests')} (${reqs.length})</h3>
      ${reqs.map((l) => `<div class="row between"><span><b>${esc(l.other.full_name || '')}</b> <span class="tiny muted" dir="ltr">${esc(l.other.email || '')}</span> ${langChip(l.other.lang)} ${esc(l.other.country || '')}</span>
        <span class="row"><button class="btn sm primary" data-acc="${l.other.id}">${t('accept')}</button><button class="btn sm" data-dec="${l.other.id}">${t('decline')}</button></span></div>`).join('')}</div>` : ''}
    <div class="grid-2">
      <div class="card reveal"><h3 lang="ar">توزيع الطلاب على المحطات</h3>
        <div class="dist">${dist.map((d, i) => `<div class="col" title="${esc(stageTitle(STAGES[i].id, 'ar'))}: ${d}"><span>${d || ''}</span><i style="height:${(d / maxD) * 100}%;animation-delay:${i * 60}ms"></i><span>${i + 1}</span></div>`).join('')}</div></div>
      <div class="card stack reveal"><h3>🔗 ربط طالب بحسابك</h3>
        <form class="row" id="add"><input id="em" type="email" dir="ltr" required placeholder="student@email.com" style="flex:1;min-width:180px"><button class="btn primary">${t('link')}</button></form>
        <p class="tiny muted" lang="ar">١) بالإيميل: تصل الطالبَ دعوة في حسابه فيوافق عليها. ٢) برابط الدعوة: يفتحه الطالب فيصلك طلبه هنا. ٣) برمز الإشراف يكتبه في صفحته.</p>
        ${invite ? `<div class="row"><input readonly dir="ltr" value="${esc(invite)}" id="inv" style="flex:1;min-width:180px;font-size:.8rem"><button class="btn sm" id="cp">📋</button>
          <a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(invite)}">WhatsApp</a></div>` : ''}
        ${sent.length ? `<p class="small">${t('waiting')}: ${sent.map((l) => `<span class="chip gold">${esc(l.other.full_name || l.other.email || '')}</span>`).join(' ')}</p>` : ''}
      </div>
    </div>
    <div class="row between"><h2>${t('students')}</h2><span class="row"><a class="btn sm" href="#/supervisor/questions">❓ ${t('questions')}</a><button class="btn sm" id="csv">⬇ CSV</button></span></div>
    ${n ? `<div class="table-wrap"><table><thead><tr><th>${t('name')}</th><th>${t('yourLang')}</th><th>${t('currentStage')}</th><th>${t('progress')}</th><th>${t('avgScore')}</th><th>${t('memoSurahs')}</th><th>${t('lastActivity')}</th></tr></thead><tbody>
      ${rows.map(({ s, P }) => `<tr class="click" data-id="${esc(s.id)}"><td><b>${esc(s.full_name || s.email)}</b>${unreadOf(s.id) ? ` <span class="chip red tiny">💬 ${unreadOf(s.id)}</span>` : ''}<br><span class="tiny muted" dir="ltr">${esc(s.email)}</span>${s.country ? ` <span class="tiny muted">· ${esc(s.country)}</span>` : ''}</td>
        <td>${langChip(s.lang)}</td>
        <td>${P.allDone ? '🌟 ' : STAGES[P.current].icon} ${P.current + 1}. <span lang="ar">${esc(stageTitle(STAGES[P.current].id, 'ar'))}</span></td>
        <td><span class="mini-bar"><i style="width:${P.overall}%"></i></span> ${P.overall}%</td>
        <td>${P.avg ?? '—'}</td><td>${[...P.done].filter((k) => k.startsWith('quran:')).length}</td><td>${ago(s.last_activity)}</td></tr>`).join('')}
    </tbody></table></div>` : `<p class="card muted" lang="ar">لا يوجد طلاب بعد. أضف طالبًا بإيميله، أو أعطه رمز الإشراف.</p>`}
  </div>`;
  reveal(app);
  app.querySelectorAll('tr.click').forEach((tr) => tr.onclick = () => location.hash = href('supervisor/student/' + tr.dataset.id));
  app.querySelector('#add').onsubmit = async (e) => {
    e.preventDefault();
    const r = await S.db.linkStudentByEmail(app.querySelector('#em').value).catch((er) => er.message);
    toast(r === 'pending' ? t('sentInvite') : r === 'active' ? t('linked') + ' ✓' : r === 'not_found' ? 'لا يوجد طالب مسجّل بهذا الإيميل — أرسل له رابط الدعوة' : String(r), 4500);
    if (r === 'pending' || r === 'active') dashboard(app);
  };
  app.querySelectorAll('[data-acc],[data-dec]').forEach((b) => b.onclick = async () => { await S.db.respondLink(b.dataset.acc || b.dataset.dec, !!b.dataset.acc); toast('✓'); dashboard(app); });
  app.querySelector('#cp')?.addEventListener('click', () => { navigator.clipboard?.writeText(invite); app.querySelector('#inv').select(); toast(t('copied')); });
  app.querySelector('#csv').onclick = () => {
    const head = ['name', 'email', 'lang', 'country', 'current_stage', 'progress_pct', 'avg_score', 'surahs', 'last_activity',
                  ...STAGES.map((s, i) => `stage${i + 1}_pct`), ...STAGES.map((s, i) => `stage${i + 1}_grade`)];
    const lines = rows.map(({ s, P }) => [s.full_name, s.email, s.lang, s.country, P.current + 1, P.overall, P.avg ?? '', [...P.done].filter((k) => k.startsWith('quran:')).length,
      s.last_activity || '', ...P.stages.map((x) => x.pct), ...P.stages.map((x) => x.grade ?? '')]);
    const csv = '﻿' + [head, ...lines].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `subul-students-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
}

// ---------------------------------------------------------------- بنك الأسئلة
export async function questions(app, sid = 's1') {
  const g = gate(); if (g) return g;
  const langs = Object.entries(CONFIG.languages).filter(([, L]) => L.enabled);
  const lang = sessionStorage.getItem('subul-qlang') || S.lang;
  const qs = await S.db.questions(sid, lang);
  app.innerHTML = `${pageHead('❓ ' + t('questions'), '<span lang="ar">أسئلة يكتبها فريق التعليم بلغة الطالب، وتُضاف إلى الاختبار الآلي للمحطة. اكتب السؤال من مادة معتمدة واذكر مرجعه.</span>')}
  <div class="wrap stack" style="padding-top:16px">
    <div class="card row">
      <select id="st" style="max-width:280px">${STAGES.map((s, i) => `<option value="${s.id}"${s.id === sid ? ' selected' : ''}>${i + 1}. ${esc(stageTitle(s.id, 'ar'))}</option>`).join('')}</select>
      <select id="lg" style="max-width:220px">${langs.map(([c, L]) => `<option value="${c}"${c === lang ? ' selected' : ''}>${esc(L.name)}</option>`).join('')}</select>
    </div>
    <form class="card stack" id="qf"><h3>➕ ${t('addQuestion')}</h3>
      <textarea id="qq" required placeholder="Question / Swali / Ikibazo / Pregunta" dir="ltr"></textarea>
      ${[0, 1, 2, 3].map((i) => `<input class="op" dir="ltr" placeholder="${i + 1}" ${i < 2 ? 'required' : ''}>`).join('')}
      <div class="row"><label for="an" style="margin:0">${t('answerIdx')}</label><input id="an" type="number" min="1" max="4" value="1" style="width:90px"></div>
      <input id="src" placeholder="${t('source')}: IslamHouse #… / QuranEnc 2:183 …">
      <button class="btn primary">${t('save')}</button></form>
    <div class="stack">${qs.map((q) => `<div class="card"><div class="row between"><b dir="ltr">${esc(q.question)}</b><button class="btn sm" data-del="${esc(q.id)}">🗑</button></div>
      <ol dir="ltr">${(q.options || []).map((o, i) => `<li${i === q.answer ? ' style="color:var(--ok);font-weight:700"' : ''}>${esc(o)}</li>`).join('')}</ol>${q.source ? `<p class="tiny muted">${esc(q.source)}</p>` : ''}</div>`).join('') || '<p class="muted">—</p>'}</div>
  </div>`;
  app.querySelector('#st').onchange = (e) => location.hash = '#/supervisor/questions/' + e.target.value;
  app.querySelector('#lg').onchange = (e) => { sessionStorage.setItem('subul-qlang', e.target.value); questions(app, sid); };
  app.querySelector('#qf').onsubmit = async (e) => {
    e.preventDefault();
    const options = [...app.querySelectorAll('.op')].map((x) => x.value.trim()).filter(Boolean);
    const answer = Math.min(options.length, Math.max(1, +app.querySelector('#an').value)) - 1;
    try { await S.db.addQuestion({ stage_id: sid, lang, question: app.querySelector('#qq').value.trim(), options, answer, source: app.querySelector('#src').value.trim() || null }); toast('✓'); questions(app, sid); }
    catch (er) { toast(er.message); }
  };
  app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { await S.db.deleteQuestion(b.dataset.del); questions(app, sid); });
}

// ---------------------------------------------------------------- الإدارة
export async function admin(app) {
  if (S.me?.role !== 'admin') return `<div class="wrap" style="padding-top:30px"><p class="card" lang="ar">للمدير فقط.</p></div>`;
  const list = await S.db.pendingSupervisors();
  app.innerHTML = `${pageHead('🛡 ' + t('admin'), t('pending'))}
  <div class="wrap stack" style="padding-top:20px">
    ${list.map((u) => `<div class="card row between"><span><b>${esc(u.full_name || '')}</b> <span dir="ltr" class="muted">${esc(u.email)}</span> ${langChip(u.lang)} ${esc(u.country || '')}</span>
      <span class="row"><button class="btn sm primary" data-ok="${u.id}">${t('approve')}</button><button class="btn sm" data-no="${u.id}">${t('reject')}</button></span></div>`).join('') || '<p class="card muted">—</p>'}
  </div>`;
  app.querySelectorAll('[data-ok],[data-no]').forEach((b) => b.onclick = async () => {
    try { await S.db.approveSupervisor(b.dataset.ok || b.dataset.no, !!b.dataset.ok); toast('✓'); admin(app); } catch (e) { toast(e.message); }
  });
}

// ---------------------------------------------------------------- أقسام صفحة المشرف للدعوة
const SECTIONS = [['cards', '🃏', 'cards'], ['guide', '🧭', 'guide'], ['language', '🗣️', 'langLearn'], ['material', '📚', 'material']];
const secTabs = (cur) => `<div class="wrap"><div class="tabs"><a class="btn sm" href="${href('supervisor')}">👥 ${t('students')}</a>
  ${SECTIONS.map(([k, ic, l]) => `<a class="btn sm" href="${href('supervisor/' + k)}" aria-pressed="${k === cur}">${ic} ${t(l)}</a>`).join('')}</div></div>`;
const tileL = (h, ic, a, b, ext) => `<a class="card lift item" href="${h}"${ext ? ' target="_blank" rel="noopener"' : ''}><span class="ic">${ic}</span><span><h3>${a}</h3><span class="desc">${b}</span></span></a>`;

export async function section(app, which) {
  const g = gate(); if (g) return g;
  const LG = S.lang, Lc = CONFIG.languages[LG];
  const head = pageHead(`${SECTIONS.find((x) => x[0] === which)?.[1] || ''} ${t(SECTIONS.find((x) => x[0] === which)?.[2] || which)} · ${esc(Lc.name)}`, `<span lang="ar">${t('supArea')}</span>`) + secTabs(which);
  if (which === 'media') { location.hash = href('videos'); return; }

  if (which === 'guide') {
    const [TR, GU, CO, WA, FQ] = await Promise.all(['TRAIN', 'GUIDE', 'COURSE', 'WARN', 'FAQ'].map((n) => rafiq(n).catch(() => [])));
    return head + `<div class="wrap stack" style="padding-top:8px"><p class="notice small" lang="ar">من مشروع «رفيق الداعية»: النصوص المؤلَّفة بالعربية للداعية، والآيات والأحاديث تظهر بلغة ${esc(Lc.ar)} من مصادرها.</p>
      <div class="grid">
        ${tileL(href('dawah/train'), '🎓', 'دروس الداعية', `${TR.length} درسًا مع تمرين عملي`)}
        ${tileL(href('dawah/guide'), '🧭', 'دليل الداعية', `${GU.length} أقسام: الإخلاص، آداب الحوار، الإحالة`)}
        ${tileL(href('dawah/course'), '🌱', 'اكتشف الإسلام', `${CO.length} لقاءً قبل الشهادة`)}
        ${tileL(href('dawah/warn'), '⚠️', 'تحذيرات مهمة', `${WA.length} تنبيهًا`)}
        ${tileL(href('dawah/faq'), '❓', 'أسئلة الباحثين', `${FQ.length} سؤالًا`)}
        ${LG === 'es' ? tileL(href('dawah/msg'), '💬', '1000 mensajes', 'رسائل جاهزة بالإسبانية') : ''}
      </div></div>`;
  }

  if (which === 'language') {
    const words = DAWAH_WORDS[LG]?.cards.length || 0;
    const C = await getCourse(LG).catch(() => null);
    app.innerHTML = head + `<div class="wrap stack" style="padding-top:8px">
      ${C ? `<div class="sec-head" dir="rtl"><h2 lang="ar">🪜 دورة ${esc(C.ar)}: من الحروف إلى الإتقان</h2><a class="btn primary" href="${href('lang')}">افتح الدورة ←</a></div>
      <div class="grid">${C.levels.map((l, i) => tileL(href('lang/' + l.id), l.icon, `${i + 1}. ${esc(l.t)} <span class="chip tiny" dir="ltr">${esc(l.cefr)}</span>`, `${l.lessons.length} دروس · ${esc(l.d)}`)).join('')}
        ${tileL(href('lang/method'), '🧭', 'كيف تتعلّم اللغة؟', 'المنهج، خريطة الطريق، خطة أسبوعية')}
        ${tileL(href('lang/cards/due'), '🔁', 'مراجعة اليوم', 'بطاقات المراجعة المتباعدة')}</div>
      <h2>🧰 أدوات أخرى</h2>` : ''}
      <div class="grid">
        ${words ? tileL(href('dawah/words'), '🗝️', t('words'), `${words} · ${t('inContext')}`) : ''}
        ${tileL(href('quran/1'), '🔎', t('explorer'), t('explorerHint'))}
        ${tileL(href('quran/112'), '📖', `${t('quran')} · ${esc(Lc.name)}`, Lc.quran.join(' · '))}
        ${LG === 'es' ? tileL(Lc.sister + '/#aprender', '🇪🇸', 'تعلّم الإسبانية — رفيق الداعية', 'A1 → C2 · DELE · SIELE', true) : ''}
      </div>
      <p class="notice small" lang="ar">💡 بدّل لغة العرض من الزر أعلى الصفحة (عربي ⇄ ${esc(Lc.name)}) لتتدرّب على قراءة الواجهة بلغة طلابك.</p>
      <h2>💌 ${t('msgBank')}</h2><div id="bank-box"></div></div>`;
    messageBank(app.querySelector('#bank-box'), LG);
    return;
  }

  if (which === 'material') {
    const NEWM = await rafiq('NEWM').catch(() => []);
    return head + `<div class="wrap stack" style="padding-top:8px"><div class="grid">
        ${tileL(href('learn'), '📖', t('learnCenter'), t('openToAll'))}
        ${tileL(href('books'), '📚', t('booksGuide'), 'IslamHouse.com')}
        ${tileL(href('saudi'), '🕋', 'المصادر السعودية المعتمدة', 'رسالة الحرمين · الإفتاء · الشؤون الإسلامية')}
        ${tileL(href('videos'), '🎬', t('videos'), `IslamHouse · ${t('mediaBank')}`)}
        ${tileL(href('prayer'), '💧', t('prayerWudu'), `${t('wudu')} · ${t('prayerSteps')}`)}
        ${tileL(href('library'), '🗂️', t('library'), 'IslamHouse API')}
        ${tileL(href('hadith'), '🌿', t('hadith'), 'HadeethEnc.com')}
        ${tileL(href('supervisor/questions'), '❓', t('questions'), t('addQuestion'))}
      </div>
      <h2>🎓 <span lang="ar">دليل المشرف — منهج المسلم الجديد (رفيق الداعية)</span></h2>
      <div class="grid">${NEWM.map((c) => `<div class="card"><b lang="ar">${c.n}. ${esc(c.tar)}</b><p class="small muted" lang="ar">${esc(c.goal)}</p></div>`).join('')}</div>
      <p class="small muted" lang="ar">كل درس يظهر مفصّلًا داخل المحطة المناسبة له في المنهج.</p></div>`;
  }

  // ---- البطاقات: صانع بطاقات من آية أو حديث بلغة القسم
  app.innerHTML = head + `<div class="wrap stack" style="padding-top:8px">
    <div class="grid-2">
      <form class="card stack" id="cf">
        <h3>🃏 ${t('makeCard')}</h3>
        <div class="seg"><label><input type="radio" name="ct" value="ayah" checked><span>📖 ${t('ayah')}</span></label><label><input type="radio" name="ct" value="hadith"><span>🌿 ${t('hadith')}</span></label></div>
        <div id="c-ayah" class="stack">
          <div class="row"><select id="cs" style="flex:2">${SURAHS.map((x, i) => `<option value="${i + 1}"${i + 1 === 112 ? ' selected' : ''}>${i + 1}. ${x[0]}</option>`).join('')}</select>
            <input id="ca1" type="number" min="1" value="1" style="width:80px" aria-label="from"><input id="ca2" type="number" min="1" value="4" style="width:80px" aria-label="to"></div>
          <select id="ck">${Lc.quran.map((k) => `<option>${k}</option>`).join('')}</select>
        </div>
        <div id="c-hadith" class="stack hidden"><select id="hc"></select><select id="hh"></select></div>
        <div class="row"><label style="margin:0">🎨</label>${['green', 'night', 'sand'].map((th, i) => `<label style="margin:0;font-weight:500"><input type="radio" name="th" value="${th}" ${i ? '' : 'checked'} style="width:auto;min-height:0"> ${th}</label>`).join('')}</div>
        <button class="btn primary">${t('preview')}</button>
        <p class="tiny muted" lang="ar">النص العربي والترجمة يُجلبان من QuranEnc/HadeethEnc كما هما، ويُكتب المصدر على البطاقة.</p>
      </form>
      <div class="stack canvas-wrap"><canvas id="cv" width="1080" height="1350" aria-label="card"></canvas>
        <div class="row" style="justify-content:center"><button class="btn primary" id="dl">⬇ ${t('downloadImg')}</button><button class="btn" id="sh">📤 ${t('share')}</button></div></div>
    </div>
    ${DAWAH_WORDS[LG]?.cards.length ? `<a class="btn" href="${href('dawah/words')}">🗝️ ${t('words')} (${DAWAH_WORDS[LG].cards.length})</a>` : ''}
    ${LG === 'es' ? `<a class="btn" href="${href('dawah/msg')}">💬 1000 mensajes — رفيق الداعية</a>` : ''}
  </div>`;
  const $ = (q) => app.querySelector(q);
  app.querySelectorAll('[name=ct]').forEach((r) => r.onchange = () => { const h = $('[name=ct]:checked').value === 'hadith'; $('#c-ayah').classList.toggle('hidden', h); $('#c-hadith').classList.toggle('hidden', !h); if (h) loadCats(); });
  let catsLoaded = false;
  async function loadCats() {
    if (catsLoaded) return; catsLoaded = true;
    const cats = await HE.categories(Lc.hadeeth).catch(() => []);
    $('#hc').innerHTML = cats.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('');
    $('#hc').onchange = loadHads; loadHads();
  }
  async function loadHads() {
    const r = await HE.list(Lc.hadeeth, $('#hc').value, 1, 30).catch(() => ({ data: [] }));
    $('#hh').innerHTML = (r.data || []).map((h) => `<option value="${h.id}">${esc(h.title.slice(0, 90))}</option>`).join('');
  }
  const draw = async () => {
    const theme = $('[name=th]:checked').value;
    let ar, tr, ref, src;
    if ($('[name=ct]:checked').value === 'ayah') {
      const s = +$('#cs').value, a1 = Math.max(1, +$('#ca1').value), a2 = Math.max(a1, Math.min(+$('#ca2').value, a1 + 4));
      const rows = (await QE.sura($('#ck').value, s)).filter((r) => +r.aya >= a1 && +r.aya <= a2);
      if (!rows.length) return toast(t('error'));
      ar = rows.map((r) => `${r.arabic_text} ﴿${String(r.aya).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])}﴾`).join(' ');
      tr = rows.map((r) => r.translation.replace(/\[\d+\]/g, '')).join(' ');
      ref = `سورة ${surahName(s)} \u2066${s}:${a1}${a2 > a1 ? '-' + a2 : ''}\u2069`; src = `QuranEnc.com — ${$('#ck').value}`;
    } else {
      const h = await HE.one(Lc.hadeeth, $('#hh').value).catch(() => null);
      if (!h) return toast(t('error'));
      ar = h.hadeeth_ar || ''; tr = h.hadeeth; ref = `${h.attribution || ''}${h.grade ? ' · ' + h.grade : ''}`; src = 'HadeethEnc.com';
    }
    await renderCard($('#cv'), { ar, tr, ref, src, theme, dir: Lc.dir, quran: $('[name=ct]:checked').value === 'ayah' });
  };
  $('#cf').onsubmit = (e) => { e.preventDefault(); draw(); };
  $('#dl').onclick = () => { const a = document.createElement('a'); a.download = `subul-card-${Date.now()}.png`; a.href = $('#cv').toDataURL('image/png'); a.click(); };
  $('#sh').onclick = async () => {
    const blob = await new Promise((r) => $('#cv').toBlob(r, 'image/png'));
    const file = new File([blob], 'subul-card.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: CONFIG.brand.nameAr }); } catch { /* أُلغيت */ } }
    else $('#dl').click();
  };
  draw();
}

// رسم البطاقة على Canvas: زخرفة نجمية + النص العربي + الترجمة + المرجع والمصدر
const THEMES = {
  green: { bg: ['#0b4d3c', '#052a20'], fg: '#ffffff', ac: '#e0bd5f', tr: 'rgba(255,255,255,.9)', line: 'rgba(224,189,95,.16)' },
  night: { bg: ['#14213d', '#0a1022'], fg: '#ffffff', ac: '#e0bd5f', tr: 'rgba(255,255,255,.88)', line: 'rgba(255,255,255,.08)' },
  sand:  { bg: ['#f7f2e8', '#efe3c8'], fg: '#13241f', ac: '#8a6714', tr: '#2c3b35', line: 'rgba(11,77,60,.10)' },
};
async function renderCard(cv, { ar, tr, ref, src, theme, dir, quran }) {
  const T = THEMES[theme] || THEMES.green, c = cv.getContext('2d'), W = cv.width, H = cv.height;
  await Promise.all(['56px "Amiri Quran"', '56px "Amiri"', '700 40px "Cairo"', '40px "Plus Jakarta Sans"'].map((f) => document.fonts.load(f).catch(() => {})));
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, T.bg[0]); g.addColorStop(1, T.bg[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // زخرفة النجمة الثمانية
  c.strokeStyle = T.line; c.lineWidth = 2;
  for (let y = -60; y < H + 120; y += 120) for (let x = -60; x < W + 120; x += 120) {
    c.save(); c.translate(x, y); c.strokeRect(-30, -30, 60, 60); c.rotate(Math.PI / 4); c.strokeRect(-30, -30, 60, 60); c.restore();
  }
  // إطار
  c.strokeStyle = T.ac; c.lineWidth = 4; c.strokeRect(40, 40, W - 80, H - 80); c.lineWidth = 1.5; c.strokeRect(56, 56, W - 112, H - 112);
  // الترويسة
  c.fillStyle = T.ac; c.textAlign = 'center'; c.direction = 'rtl'; c.font = '700 40px "Cairo"'; c.fillText(CONFIG.brand.nameAr, W / 2, 130);
  const wrap = (text, font, maxW, rtl) => {
    c.font = font; c.direction = rtl ? 'rtl' : 'ltr';
    const words = text.split(/\s+/), lines = []; let line = '';
    for (const w of words) { const test = line ? line + ' ' + w : w; if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
    if (line) lines.push(line); return lines;
  };
  // ملاءمة حجم الخط للمساحة
  let arSize = quran ? 64 : 52, trSize = 36, arL, trL;
  for (let k = 0; k < 14; k++) {
    arL = ar ? wrap(ar, `${arSize}px "${quran ? 'Amiri Quran' : 'Amiri'}"`, W - 200, true) : [];
    trL = wrap(tr, `${trSize}px "Plus Jakarta Sans"`, W - 200, dir === 'rtl');
    const h = arL.length * arSize * 1.9 + trL.length * trSize * 1.45 + 60;
    if (h < H - 420) break; arSize -= 4; trSize -= 2;
  }
  let y = 220 + Math.max(0, (H - 420 - (arL.length * arSize * 1.9 + trL.length * trSize * 1.45 + 60)) / 2);
  c.fillStyle = T.fg; c.direction = 'rtl'; c.font = `${arSize}px "${quran ? 'Amiri Quran' : 'Amiri'}"`;
  arL.forEach((l) => { y += arSize * 1.9; c.fillText(l, W / 2, y); });
  y += 40; c.fillStyle = T.ac; c.fillRect(W / 2 - 60, y - 18, 120, 3); y += 10;
  c.fillStyle = T.tr; c.direction = dir === 'rtl' ? 'rtl' : 'ltr'; c.font = `${trSize}px "Plus Jakarta Sans"`;
  trL.forEach((l) => { y += trSize * 1.45; c.fillText(l, W / 2, y); });
  // المرجع والمصدر
  c.fillStyle = T.ac; c.direction = 'rtl'; c.font = '700 30px "Cairo"'; c.fillText(ref, W / 2, H - 150);
  c.fillStyle = T.tr; c.direction = 'ltr'; c.font = '24px "Plus Jakarta Sans"'; c.fillText(src, W / 2, H - 105);
}
