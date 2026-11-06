// نافذة المشرف: طلابي، تفاصيل الطالب وتقييمه، بنك الأسئلة، والإدارة
import { CONFIG } from '../config.js';
import { S, esc, toast, ago, fmtDate, computeProgress, loadStudentData, loading, reveal } from '../core.js';
import { STAGES, surahName } from '../curriculum.js';
import { t, stageTitle } from '../i18n.js';
import { pageHead, needLogin } from './components.js';

const isSup = () => ['supervisor', 'admin'].includes(S.me?.role);
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
  const students = await S.db.myStudents();
  const rows = await Promise.all(students.map(async (s) => ({ s, P: computeProgress(s.lang || CONFIG.defaultLang, await loadStudentData(s.id)) })));
  rows.sort((a, b) => new Date(b.s.last_activity || 0) - new Date(a.s.last_activity || 0));
  const n = rows.length;
  const avgProg = n ? Math.round(rows.reduce((a, r) => a + r.P.overall, 0) / n) : 0;
  const graded = rows.filter((r) => r.P.avg !== null);
  const avgScore = graded.length ? Math.round(graded.reduce((a, r) => a + r.P.avg, 0) / graded.length) : '—';
  const active = rows.filter((r) => r.s.last_activity && Date.now() - new Date(r.s.last_activity) < 7 * 864e5).length;
  const dist = STAGES.map((_, i) => rows.filter((r) => r.P.current === i && !r.P.allDone).length);
  const maxD = Math.max(1, ...dist);

  app.innerHTML = `${pageHead('🎓 ' + t('supervisor'), `<span lang="ar">${esc(S.me.full_name || '')}</span>`,
    `<div class="card flat center" style="padding:10px 16px"><span class="tiny muted">${t('myCode')}</span><div dir="ltr" style="font-family:var(--lat);font-weight:800;font-size:1.5rem;letter-spacing:.18em;color:var(--green-2)">${esc(S.me.supervisor_code || '—')}</div></div>`)}
  <div class="wrap stack" style="padding-top:20px">
    <div class="stats reveal">
      <div class="stat"><b>${n}</b><span>${t('students')}</span></div>
      <div class="stat"><b>${avgProg}%</b><span>${t('progress')}</span></div>
      <div class="stat"><b>${avgScore}</b><span>${t('avgScore')}</span></div>
      <div class="stat"><b>${active}</b><span lang="ar">نشِطون آخر 7 أيام</span></div>
    </div>
    <div class="grid-2">
      <div class="card reveal"><h3 lang="ar">توزيع الطلاب على المحطات</h3>
        <div class="dist">${dist.map((d, i) => `<div class="col" title="${esc(stageTitle(STAGES[i].id, 'ar'))}: ${d}"><span>${d || ''}</span><i style="height:${(d / maxD) * 100}%;animation-delay:${i * 60}ms"></i><span>${i + 1}</span></div>`).join('')}</div></div>
      <form class="card stack reveal" id="add"><h3>➕ ${t('addStudent')}</h3>
        <input id="em" type="email" dir="ltr" required placeholder="student@email.com">
        <button class="btn primary">${t('link')}</button>
        <p class="tiny muted" lang="ar">يجب أن يكون الطالب قد سجّل في الموقع. أو أعطه رمز الإشراف أعلاه ليرتبط بك بنفسه.</p></form>
    </div>
    <div class="row between"><h2>${t('students')}</h2><span class="row"><a class="btn sm" href="#/supervisor/questions">❓ ${t('questions')}</a><button class="btn sm" id="csv">⬇ CSV</button></span></div>
    ${n ? `<div class="table-wrap"><table><thead><tr><th>${t('name')}</th><th>${t('yourLang')}</th><th>${t('currentStage')}</th><th>${t('progress')}</th><th>${t('avgScore')}</th><th>${t('memoSurahs')}</th><th>${t('lastActivity')}</th></tr></thead><tbody>
      ${rows.map(({ s, P }) => `<tr class="click" data-id="${esc(s.id)}"><td><b>${esc(s.full_name || s.email)}</b><br><span class="tiny muted" dir="ltr">${esc(s.email)}</span>${s.country ? ` <span class="tiny muted">· ${esc(s.country)}</span>` : ''}</td>
        <td>${langChip(s.lang)}</td>
        <td>${P.allDone ? '🌟 ' : STAGES[P.current].icon} ${P.current + 1}. <span lang="ar">${esc(stageTitle(STAGES[P.current].id, 'ar'))}</span></td>
        <td><span class="mini-bar"><i style="width:${P.overall}%"></i></span> ${P.overall}%</td>
        <td>${P.avg ?? '—'}</td><td>${[...P.done].filter((k) => k.startsWith('quran:')).length}</td><td>${ago(s.last_activity)}</td></tr>`).join('')}
    </tbody></table></div>` : `<p class="card muted" lang="ar">لا يوجد طلاب بعد. أضف طالبًا بإيميله، أو أعطه رمز الإشراف.</p>`}
  </div>`;
  reveal(app);
  app.querySelectorAll('tr.click').forEach((tr) => tr.onclick = () => location.hash = '#/supervisor/student/' + tr.dataset.id);
  app.querySelector('#add').onsubmit = async (e) => {
    e.preventDefault();
    const r = await S.db.linkStudentByEmail(app.querySelector('#em').value).catch((er) => er.message);
    toast(r === 'ok' ? t('linked') + ' ✓' : r === 'not_found' ? 'لا يوجد طالب مسجّل بهذا الإيميل' : String(r), 3500);
    if (r === 'ok') dashboard(app);
  };
  app.querySelector('#csv').onclick = () => {
    const head = ['name', 'email', 'lang', 'country', 'current_stage', 'progress_pct', 'avg_score', 'surahs', 'last_activity',
                  ...STAGES.map((s, i) => `stage${i + 1}_pct`), ...STAGES.map((s, i) => `stage${i + 1}_grade`)];
    const lines = rows.map(({ s, P }) => [s.full_name, s.email, s.lang, s.country, P.current + 1, P.overall, P.avg ?? '', [...P.done].filter((k) => k.startsWith('quran:')).length,
      s.last_activity || '', ...P.stages.map((x) => x.pct), ...P.stages.map((x) => x.grade ?? '')]);
    const csv = '﻿' + [head, ...lines].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `subul-students-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
}

// ---------------------------------------------------------------- تفاصيل الطالب
export async function student(app, id) {
  const g = gate(); if (g) return g;
  app.innerHTML = loading();
  const s = await S.db.student(id);
  if (!s) return `<div class="wrap"><p class="card">404</p></div>`;
  const D = await loadStudentData(id);
  const P = computeProgress(s.lang || CONFIG.defaultLang, D);
  const surahMemo = D.memo.filter((m) => m.kind === 'surah');
  const hadMemo = D.memo.filter((m) => m.kind === 'hadith');
  const timeline = [
    ...D.progress.map((p) => ({ d: p.completed_at, txt: `${p.kind === 'memorize' ? '🧠' : '📖'} ${esc(p.item_key)} · ${t('stage')} ${STAGES.findIndex((x) => x.id === p.stage_id) + 1}` })),
    ...D.quizzes.map((q) => ({ d: q.created_at, txt: `✅ ${t('quiz')} ${STAGES.findIndex((x) => x.id === q.stage_id) + 1}: <b>${q.score}%</b>` })),
    ...D.evals.map((e) => ({ d: e.created_at, txt: `🎓 ${t('evaluate')} ${STAGES.findIndex((x) => x.id === e.stage_id) + 1}: <b>${e.score}</b> ${e.passed ? '✔' : ''}` })),
  ].sort((a, b) => new Date(b.d) - new Date(a.d)).slice(0, 25);

  app.innerHTML = `${pageHead(`👤 ${esc(s.full_name || s.email)}`, `<span dir="ltr">${esc(s.email)}</span> · ${langChip(s.lang)} ${s.country ? '· ' + esc(s.country) : ''} ${s.shahada_date ? `· <span lang="ar">الشهادة: ${fmtDate(s.shahada_date)}</span>` : ''}`,
    `<div class="ring" style="--p:${P.overall};--size:96px"><b style="font-size:1.3rem">${P.overall}<small>%</small></b></div>`)}
  <div class="wrap stack" style="padding-top:20px">
    <div class="stats">
      <div class="stat"><b>${P.current + 1}</b><span>${t('currentStage')}</span></div>
      <div class="stat"><b>${P.avg ?? '—'}</b><span>${t('avgScore')}</span></div>
      <div class="stat"><b>${surahMemo.filter((m) => m.status !== 'learning').length}</b><span>${t('memoSurahs')}</span></div>
      <div class="stat"><b>${ago(D.progress.map((p) => p.completed_at).sort().pop())}</b><span>${t('lastActivity')}</span></div>
    </div>
    <h2>${t('stages')}</h2>
    <div class="stage-grid">${P.stages.map((x, i) => `<div class="card stack" style="border-top:4px solid ${x.stage.color}">
      <div class="row between"><b>${x.stage.icon} ${i + 1}. <span lang="ar">${esc(stageTitle(x.stage.id, 'ar'))}</span></b>${x.complete ? '<span class="chip ok">✔</span>' : ''}</div>
      <div class="qbar"><i style="width:${x.pct}%"></i></div>
      <p class="small">${x.doneTasks}/${x.tasks.length} · ${t('quiz')}: <b>${x.bestQuiz ?? '—'}</b> · ${t('evaluate')}: <b>${x.eval?.score ?? '—'}</b></p>
      ${x.eval?.notes ? `<p class="tiny muted">${esc(x.eval.notes)}</p>` : ''}
      <button class="btn sm" data-ev="${x.stage.id}">🎓 ${t('evaluate')}</button></div>`).join('')}</div>

    <dialog id="dlg" style="border:0;border-radius:16px;padding:0;max-width:440px;width:92vw">
      <form method="dialog" class="card stack" id="evf"><h3 id="dlg-t"></h3>
        <label for="sc">${t('score')} (0–100)</label><input id="sc" type="number" min="0" max="100" required value="90">
        <label class="row" style="font-weight:600"><input id="ps" type="checkbox" style="width:auto;min-height:0" checked> ${t('passed')}</label>
        <label for="nt">${t('notes')}</label><textarea id="nt" placeholder="مثال: تسميع الفاتحة متقن، يحتاج مراجعة أحكام الوضوء"></textarea>
        <div class="row"><button class="btn primary" value="ok">${t('save')}</button><button class="btn" value="cancel" formnovalidate>${t('back')}</button></div></form></dialog>

    <div class="grid-2">
      <div class="card stack"><h3>🧠 ${t('memoSurahs')}</h3>
        ${surahMemo.length ? surahMemo.sort((a, b) => b.ref - a.ref).map((m) => `<div class="row between"><span lang="ar"><b>${esc(surahName(+m.ref))}</b> (${m.ref})</span>
          ${m.status === 'verified' ? `<span class="chip ok">✔ ${m.grade ?? ''}</span>` : `<span class="row"><span class="chip gold">${t(m.status)}</span>
            <input type="number" min="0" max="100" value="90" style="width:80px;min-height:36px;padding:4px 8px" data-g="${m.ref}"><button class="btn sm primary" data-vf="${m.ref}">${t('verify')}</button></span>`}</div>`).join('')
          : '<p class="muted small">—</p>'}
        ${hadMemo.length ? `<h3 style="margin-top:8px">🌿 ${t('hadith')}</h3>${hadMemo.map((m) => `<div class="row between"><a href="#/hadith/${esc(m.ref)}">#${esc(m.ref)}</a>${m.status === 'verified' ? '<span class="chip ok">✔</span>' : `<button class="btn sm" data-vh="${esc(m.ref)}">${t('verify')}</button>`}</div>`).join('')}` : ''}
      </div>
      <div class="card stack"><h3>🕒 ${t('lastActivity')}</h3>
        ${timeline.length ? timeline.map((x) => `<div class="small row between"><span>${x.txt}</span><span class="tiny muted">${fmtDate(x.d)}</span></div>`).join('') : '<p class="muted small">—</p>'}</div>
    </div>
    <div class="row"><a class="btn" href="#/supervisor">→ ${t('students')}</a><button class="btn" id="unl" style="color:var(--red)" lang="ar">إلغاء الربط</button></div>
  </div>`;

  const dlg = app.querySelector('#dlg'); let evStage = null;
  app.querySelectorAll('[data-ev]').forEach((b) => b.onclick = () => { evStage = b.dataset.ev; app.querySelector('#dlg-t').textContent = `${t('evaluate')}: ${stageTitle(evStage, 'ar')}`; dlg.showModal(); });
  dlg.addEventListener('close', async () => {
    if (dlg.returnValue !== 'ok' || !evStage) return;
    const sc = Math.max(0, Math.min(100, +app.querySelector('#sc').value || 0));
    try { await S.db.addEvaluation(id, evStage, sc, app.querySelector('#ps').checked, app.querySelector('#nt').value.trim()); toast('✓'); student(app, id); }
    catch (e) { toast(e.message); }
  });
  app.querySelectorAll('[data-vf]').forEach((b) => b.onclick = async () => {
    const ref = b.dataset.vf, grade = +app.querySelector(`[data-g="${ref}"]`).value || null;
    try { await S.db.verifyMemo(id, 'surah', ref, grade); toast('✔'); student(app, id); } catch (e) { toast(e.message); }
  });
  app.querySelectorAll('[data-vh]').forEach((b) => b.onclick = async () => { try { await S.db.verifyMemo(id, 'hadith', b.dataset.vh, null); student(app, id); } catch (e) { toast(e.message); } });
  app.querySelector('#unl').onclick = async () => { if (!confirm('إلغاء ربط هذا الطالب بك؟')) return; await S.db.unlinkStudent(id); location.hash = '#/supervisor'; };
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
