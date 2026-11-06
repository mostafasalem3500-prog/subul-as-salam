// =====================================================================
//  صفحة الطالب — يراها الطالب نفسه (#/me) ومشرفه (#/supervisor/student/ID)
//  التبويبات: المنهج · المتابعة · المحادثات · الاختبارات
// =====================================================================
import { CONFIG } from '../config.js';
import { S, esc, toast, ago, fmtDate, computeProgress, loadStudentData, loading, reveal, isSup, timeShort, linkify, confetti } from '../core.js';
import { STAGES, surahName } from '../curriculum.js';
import { t, stageTitle } from '../i18n.js';
import { needLogin, journeyHTML, drawJourney } from './components.js';
import { autoScore } from '../db.js';

const TABS = [['path', '🧭', 'curriculum'], ['follow', '📊', 'follow'], ['chat', '💬', 'chat'], ['tests', '📝', 'tests']];
let stopChat = null;
addEventListener('hashchange', () => { stopChat?.(); stopChat = null; });

// ---------------------------------------------------------------- نقاط الدخول
export async function mePage(app, tab = 'path') {
  if (!S.me) return needLogin();
  if (S.me.role !== 'student') { location.hash = '#/supervisor'; return; }
  return studentPage(app, S.me, 'student', tab);
}
export async function supStudentPage(app, id, tab = 'path') {
  if (!S.me) return needLogin();
  if (!isSup()) return `<div class="wrap" style="padding-top:30px"><p class="card" lang="ar">للمشرفين فقط.</p></div>`;
  const st = await S.db.student(id);
  if (!st) return `<div class="wrap" style="padding-top:30px"><p class="card">404</p></div>`;
  // المشرف يرى محتوى المحطات بلغة طالبه
  if (st.lang && CONFIG.languages[st.lang]) localStorage.setItem('subul-lang', st.lang);
  return studentPage(app, st, 'supervisor', tab);
}

// ---------------------------------------------------------------- الهيكل المشترك
async function studentPage(app, student, viewer, tab) {
  app.innerHTML = loading();
  const D = await loadStudentData(student.id);
  const lang = student.lang || CONFIG.defaultLang;
  const P = computeProgress(lang, D);
  const links = await S.db.links();
  const supervisors = viewer === 'student' ? links.filter((l) => l.status === 'active').map((l) => l.other) : [S.me];
  const unread = await S.db.unread().catch(() => []);
  const unreadN = unread.filter((m) => m.student_id === student.id && (viewer === 'student' || m.supervisor_id === S.me.id)).length;
  const openTests = D.assignments.filter((a) => viewer === 'student' ? !a.submission : a.submission && a.submission.score == null).length;
  const base = viewer === 'student' ? '#/me/' : `#/supervisor/student/${student.id}/`;
  const cur = P.stages[P.current];
  const ctx = { app, student, viewer, D, P, lang, links, supervisors, base, tab };

  app.innerHTML = `
  <section class="hero pattern"><div class="wrap" style="grid-template-columns:1fr;padding-block:26px 30px">
    <div class="dash-hero">
      <div class="ring" style="--p:${P.overall};--size:120px"><b>${P.overall}<small>%</small></b></div>
      <div class="stack">
        <h1 style="font-size:clamp(1.3rem,3.4vw,2rem)">${viewer === 'student' ? t('welcome') + '، ' : '👤 '}${esc(student.full_name || student.email)}</h1>
        <p style="opacity:.9">${t('currentStage')}: <b>${cur.stage.icon} ${esc(stageTitle(cur.stage.id, viewer === 'student' ? undefined : 'ar'))}</b> (${P.current + 1}/12)
          · ${t('avgScore')}: <b>${P.avg ?? '—'}</b>
          ${viewer === 'supervisor' ? `<br><span class="small" dir="ltr">${esc(student.email)}</span> · <span class="chip gold">${esc(lang)}</span> ${student.country ? '· ' + esc(student.country) : ''}` : ''}</p>
        ${viewer === 'student' && supervisors.length ? `<p class="small" style="opacity:.85">🎓 ${t('linkedWith')}: ${supervisors.map((s) => esc(s.full_name || s.email)).join('، ')}</p>` : ''}
      </div>
    </div>
  </div></section>
  <div class="wrap"><div class="tabs" role="tablist">
    ${TABS.map(([k, ic, l]) => `<a class="btn sm" role="tab" href="${base}${k}" aria-pressed="${k === tab}">${ic} ${t(l)}${k === 'chat' && unreadN && tab !== 'chat' ? ` <span class="chip red tiny">${unreadN}</span>` : ''}${k === 'tests' && openTests ? ` <span class="chip gold tiny">${openTests}</span>` : ''}</a>`).join('')}
  </div></div>
  <div class="wrap stack" id="tab-body"></div>`;
  const body = app.querySelector('#tab-body');
  if (tab === 'follow') return followTab(body, ctx);
  if (tab === 'chat') return chatTab(body, ctx);
  if (tab === 'tests') return testsTab(body, ctx);
  return pathTab(body, ctx);
}

// ---------------------------------------------------------------- المنهج
function pathTab(body, { P, viewer }) {
  const cur = P.stages[P.current];
  const next = cur.tasks.find((x) => !P.done.has(x.key));
  const nextHref = next ? (next.kind === 'read' ? `#/item/${next.id}` : `#/quran/${next.id}`) : `#/quiz/${cur.stage.id}`;
  const nextLabel = next ? (next.kind === 'read' ? '📖 ' + t('read') : `🧠 ${t('memorize')} — ${surahName(next.id)}`) : '✅ ' + t('quiz');
  body.innerHTML = `
    ${viewer === 'student' ? `<div class="card row between" style="background:var(--green-soft)"><span><b>${t('continue')}:</b> ${cur.stage.icon} ${esc(stageTitle(cur.stage.id))}</span>
      <span class="row"><a class="btn primary" href="${nextHref}">${nextLabel} ←</a><a class="btn" href="#/stage/${cur.stage.id}">${t('stage')} ${P.current + 1}</a></span></div>`
      : `<p class="notice sky small" lang="ar">تفتح المحطات بلغة الطالب لترى ما يدرسه بالضبط.</p>`}
    ${journeyHTML(P)}`;
  reveal(body); drawJourney(body, P.current);
}

// ---------------------------------------------------------------- المتابعة
function followTab(body, ctx) {
  const { student, viewer, D, P } = ctx;
  const surahMemo = D.memo.filter((m) => m.kind === 'surah');
  const hadMemo = D.memo.filter((m) => m.kind === 'hadith');
  const sn = (id) => STAGES.findIndex((x) => x.id === id) + 1;
  const timeline = [
    ...D.progress.map((p) => ({ d: p.completed_at, txt: `${p.kind === 'memorize' ? '🧠' : '📖'} ${esc(p.item_key)} · ${t('stage')} ${sn(p.stage_id)}` })),
    ...D.quizzes.map((q) => ({ d: q.created_at, txt: `✅ ${t('quiz')} ${sn(q.stage_id)}: <b>${q.score}%</b>` })),
    ...D.evals.map((e) => ({ d: e.created_at, txt: `🎓 ${t('evaluate')} ${sn(e.stage_id)}: <b>${e.score}</b> ${e.passed ? '✔' : ''}` })),
    ...D.assignments.filter((a) => a.submission).map((a) => ({ d: a.submission.submitted_at, txt: `📝 ${esc(a.title)}${a.submission.score != null ? `: <b>${a.submission.score}</b>` : ''}` })),
  ].sort((a, b) => new Date(b.d) - new Date(a.d)).slice(0, 30);
  const isS = viewer === 'supervisor';

  body.innerHTML = `
    <div class="stats">
      <div class="stat"><b>${P.stages.filter((s) => s.complete).length}/12</b><span>${t('stages')}</span></div>
      <div class="stat"><b>${P.avg ?? '—'}</b><span>${t('avgScore')}</span></div>
      <div class="stat"><b>${surahMemo.filter((m) => m.status !== 'learning').length}</b><span>${t('memoSurahs')}</span></div>
      <div class="stat"><b style="font-size:1.2rem">${ago(D.progress.map((p) => p.completed_at).sort().pop())}</b><span>${t('lastActivity')}</span></div>
    </div>
    <h2>${t('stages')}</h2>
    <div class="stage-grid">${P.stages.map((x, i) => `<div class="card stack" style="border-top:4px solid ${x.stage.color}">
      <div class="row between"><b>${x.stage.icon} ${i + 1}. ${esc(stageTitle(x.stage.id, isS ? 'ar' : undefined))}</b>${x.complete ? '<span class="chip ok">✔</span>' : ''}</div>
      <div class="qbar"><i style="width:${x.pct}%"></i></div>
      <p class="small">${x.doneTasks}/${x.tasks.length} · ${t('quiz')}: <b>${x.bestQuiz ?? '—'}</b> · ${t('evaluate')}: <b>${x.eval?.score ?? '—'}</b>${x.asgAvg != null ? ` · 📝 <b>${x.asgAvg}</b>` : ''}</p>
      ${x.eval?.notes ? `<p class="tiny muted" dir="auto">🎓 ${esc(x.eval.notes)}</p>` : ''}
      ${isS ? `<button class="btn sm" data-ev="${x.stage.id}">🎓 ${t('evaluate')}</button>` : ''}</div>`).join('')}</div>
    ${isS ? `<dialog id="dlg" style="border:0;border-radius:16px;padding:0;max-width:440px;width:92vw">
      <form method="dialog" class="card stack" id="evf"><h3 id="dlg-t"></h3>
        <label for="sc">${t('score')} (0–100)</label><input id="sc" type="number" min="0" max="100" required value="90">
        <label class="row" style="font-weight:600"><input id="ps" type="checkbox" style="width:auto;min-height:0" checked> ${t('passed')}</label>
        <label for="nt">${t('notes')}</label><textarea id="nt" placeholder="مثال: تسميع الفاتحة متقن، ويحتاج مراجعة أحكام الوضوء"></textarea>
        <div class="row"><button class="btn primary" value="ok">${t('save')}</button><button class="btn" value="cancel" formnovalidate>${t('back')}</button></div></form></dialog>` : ''}
    <div class="grid-2">
      <div class="card stack"><h3>🧠 ${t('memoSurahs')}</h3>
        ${surahMemo.length ? surahMemo.sort((a, b) => b.ref - a.ref).map((m) => `<div class="row between"><span lang="ar"><b>${esc(surahName(+m.ref))}</b> (${m.ref})</span>
          ${m.status === 'verified' ? `<span class="chip ok">✔ ${t('verified')} ${m.grade ?? ''}</span>` : isS ? `<span class="row"><span class="chip gold">${t(m.status)}</span>
            <input type="number" min="0" max="100" value="90" style="width:80px;min-height:36px;padding:4px 8px" data-g="${m.ref}" aria-label="${t('score')}"><button class="btn sm primary" data-vf="${m.ref}">${t('verify')}</button></span>`
            : `<span class="chip gold">${t(m.status)}</span>`}</div>`).join('') : '<p class="muted small">—</p>'}
        ${hadMemo.length ? `<h3 style="margin-top:8px">🌿 ${t('hadith')}</h3>${hadMemo.map((m) => `<div class="row between"><a href="#/hadith/${esc(m.ref)}">#${esc(m.ref)}</a>${m.status === 'verified' ? '<span class="chip ok">✔</span>' : isS ? `<button class="btn sm" data-vh="${esc(m.ref)}">${t('verify')}</button>` : `<span class="chip gold">${t(m.status)}</span>`}</div>`).join('')}` : ''}
      </div>
      <div class="card stack"><h3>🕒 ${t('lastActivity')}</h3>
        ${timeline.length ? timeline.map((x) => `<div class="small row between"><span>${x.txt}</span><span class="tiny muted">${fmtDate(x.d)}</span></div>`).join('') : '<p class="muted small">—</p>'}</div>
    </div>
    ${isS ? `<div class="row"><a class="btn" href="#/supervisor">→ ${t('students')}</a><button class="btn" id="unl" style="color:var(--red)" lang="ar">إلغاء الربط</button></div>` : ''}`;

  if (!isS) return;
  const reload = () => studentPage(ctx.app, student, viewer, 'follow');
  const dlg = body.querySelector('#dlg'); let evStage = null;
  body.querySelectorAll('[data-ev]').forEach((b) => b.onclick = () => { evStage = b.dataset.ev; body.querySelector('#dlg-t').textContent = `${t('evaluate')}: ${stageTitle(evStage, 'ar')}`; dlg.showModal(); });
  dlg.addEventListener('close', async () => {
    if (dlg.returnValue !== 'ok' || !evStage) return;
    const sc = Math.max(0, Math.min(100, +body.querySelector('#sc').value || 0));
    try { await S.db.addEvaluation(student.id, evStage, sc, body.querySelector('#ps').checked, body.querySelector('#nt').value.trim()); toast('✓'); reload(); }
    catch (e) { toast(e.message); }
  });
  body.querySelectorAll('[data-vf]').forEach((b) => b.onclick = async () => {
    const ref = b.dataset.vf, grade = +body.querySelector(`[data-g="${ref}"]`).value || null;
    try { await S.db.verifyMemo(student.id, 'surah', ref, grade); toast('✔'); reload(); } catch (e) { toast(e.message); }
  });
  body.querySelectorAll('[data-vh]').forEach((b) => b.onclick = async () => { try { await S.db.verifyMemo(student.id, 'hadith', b.dataset.vh, null); reload(); } catch (e) { toast(e.message); } });
  body.querySelector('#unl').onclick = async () => { if (!confirm('إلغاء ربط هذا الطالب بك؟')) return; await S.db.unlink(student.id); location.hash = '#/supervisor'; };
}

// ---------------------------------------------------------------- الربط (للطالب بلا مشرف)
export function linkBoxHTML(links) {
  const pending = links.filter((l) => l.status === 'pending');
  return `<div class="card stack" id="linkbox">
    <h3>🔗 ${t('join')}</h3>
    ${pending.map((l) => `<div class="row between"><span>🎓 <b>${esc(l.other.full_name || l.other.email || '')}</b></span>
      ${l.waitingForMe ? `<span class="row"><button class="btn sm primary" data-acc="${l.other.id}">${t('accept')}</button><button class="btn sm" data-dec="${l.other.id}">${t('decline')}</button></span>`
                       : `<span class="chip gold">${t('waiting')}</span>`}</div>`).join('')}
    <p class="small muted">${t('noSupervisor')}</p>
    <div class="row"><input id="code" dir="ltr" placeholder="ABC123" style="max-width:180px;text-transform:uppercase" aria-label="${t('linkCode')}"><button class="btn primary" id="lk">${t('link')}</button></div>
  </div>`;
}
export function wireLinkBox(root, after) {
  root.querySelector('#lk')?.addEventListener('click', async () => {
    const r = await S.db.linkWithCode(root.querySelector('#code').value).catch((e) => e.message);
    toast(r === 'pending' ? t('sentRequest') : r === 'active' ? t('linked') + ' ✓' : 'الرمز غير صحيح / Invalid code', 4000);
    if (r === 'pending' || r === 'active') after();
  });
  root.querySelectorAll('[data-acc],[data-dec]').forEach((b) => b.onclick = async () => {
    await S.db.respondLink(b.dataset.acc || b.dataset.dec, !!b.dataset.acc); toast('✓'); after();
  });
}

// ---------------------------------------------------------------- المحادثات
async function chatTab(body, ctx) {
  const { student, viewer, supervisors, links } = ctx;
  if (viewer === 'student' && !supervisors.length) {
    body.innerHTML = linkBoxHTML(links); wireLinkBox(body, () => studentPage(ctx.app, student, viewer, 'chat')); return;
  }
  const pick = sessionStorage.getItem('subul-chat-sup');
  const sup = supervisors.find((s) => s.id === pick) || supervisors[0];
  const pair = [student.id, sup.id];
  body.innerHTML = `
    ${supervisors.length > 1 ? `<div class="tabs">${supervisors.map((s) => `<button class="btn sm" data-sup="${s.id}" aria-pressed="${s.id === sup.id}">🎓 ${esc(s.full_name || s.email)}</button>`).join('')}</div>` : ''}
    <div class="card" style="padding:0;overflow:hidden">
      <div class="row between" style="padding:12px 16px;border-bottom:1px solid var(--line);background:var(--surface-2)">
        <b>💬 ${esc(viewer === 'student' ? (sup.full_name || sup.email) : (student.full_name || student.email))}</b>
        <span class="tiny muted" id="live">●</span></div>
      <div id="msgs" style="height:min(56vh,520px);overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:var(--bg)"></div>
      <form id="mf" style="display:flex;gap:8px;padding:10px;border-top:1px solid var(--line)">
        <textarea id="mt" rows="1" style="min-height:46px;resize:none" placeholder="${t('typeMsg')}" dir="auto" maxlength="4000"></textarea>
        <button class="btn primary" aria-label="${t('send')}">➤</button></form>
    </div>
    <p class="tiny muted" lang="ar">المحادثة خاصة بين الطالب ومشرفه فقط. ${viewer === 'supervisor' ? 'للفتاوى أحِل إلى أهل العلم والجهات الرسمية.' : ''}</p>`;
  body.querySelectorAll('[data-sup]').forEach((b) => b.onclick = () => { sessionStorage.setItem('subul-chat-sup', b.dataset.sup); chatTab(body, ctx); });

  const box = body.querySelector('#msgs');
  let lastSig = '';
  const draw = async () => {
    const ms = await S.db.messages(...pair).catch(() => []);
    const sig = ms.map((m) => m.id + (m.read_at ? 'r' : '')).join(',');
    if (sig === lastSig) return; lastSig = sig;
    const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = ms.length ? ms.map((m) => {
      const mine = m.sender_id === S.me.id;
      return `<div style="align-self:${mine ? 'flex-end' : 'flex-start'};max-width:82%;background:${mine ? 'var(--green-2)' : 'var(--surface)'};color:${mine ? '#fff' : 'var(--ink)'};
        border:1px solid ${mine ? 'transparent' : 'var(--line)'};border-radius:16px;${mine ? 'border-end-end-radius:4px' : 'border-end-start-radius:4px'};padding:8px 12px;box-shadow:var(--shadow)">
        <div dir="auto" style="white-space:normal;word-break:break-word">${linkify(m.body)}</div>
        <div class="tiny" style="opacity:.7;text-align:end">${timeShort(m.created_at)}${mine ? (m.read_at ? ' ✓✓' : ' ✓') : ''}</div></div>`;
    }).join('') : `<p class="muted center" style="margin:auto">${t('noMsgs')}</p>`;
    if (nearBottom || !box.dataset.init) { box.scrollTop = box.scrollHeight; box.dataset.init = 1; }
    S.db.markRead(...pair).catch(() => {});
  };
  await draw();
  const ta = body.querySelector('#mt');
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); body.querySelector('#mf').requestSubmit(); } });
  body.querySelector('#mf').onsubmit = async (e) => {
    e.preventDefault(); const txt = ta.value.trim(); if (!txt) return;
    ta.value = ''; ta.style.height = '';
    try { await S.db.sendMessage(...pair, txt); await draw(); } catch (er) { toast(er.message); ta.value = txt; }
  };
  // تحديث فوري (Supabase Realtime) + استطلاع احتياطي كل 12 ثانية
  const unsub = S.db.onMessage((m) => { if (m.student_id === pair[0] && m.supervisor_id === pair[1]) draw(); });
  const iv = setInterval(draw, 12000);
  stopChat = () => { clearInterval(iv); unsub?.(); };
}

// ---------------------------------------------------------------- الاختبارات بين المشرف وطالبه
async function testsTab(body, ctx) {
  const { student, viewer, D, supervisors, links } = ctx;
  const reload = () => studentPage(ctx.app, student, viewer, 'tests');
  if (viewer === 'student' && !supervisors.length && !D.assignments.length) {
    body.innerHTML = linkBoxHTML(links); wireLinkBox(body, reload); return;
  }
  const asgCard = (a) => {
    const s = a.submission;
    const state = !s ? `<span class="chip gold">${viewer === 'student' ? '🆕' : '🕓 ' + t('notSubmitted')}</span>`
      : s.score == null ? `<span class="chip sky">${t('submitted')}</span>` : `<span class="chip ok">${t('graded')}: ${s.score}</span>`;
    return `<details class="card" ${viewer === 'student' && !s ? 'open' : ''}><summary class="row between"><span><b dir="auto">📝 ${esc(a.title)}</b>
        ${a.stage_id ? `<span class="chip tiny">${t('stage')} ${STAGES.findIndex((x) => x.id === a.stage_id) + 1}</span>` : ''}
        <span class="tiny muted">${fmtDate(a.created_at)}${a.due_at ? ` · ${t('due')}: ${fmtDate(a.due_at)}` : ''}</span></span>${state}</summary>
      <div class="stack">
        ${a.instructions ? `<p dir="auto">${linkify(a.instructions)}</p>` : ''}
        ${a.meet_at || a.meet_link ? `<p class="notice sky small">🎙 ${t('oralAt')}: <b>${a.meet_at ? new Date(a.meet_at).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</b>
          ${a.meet_link ? ` · <a href="${esc(a.meet_link)}" target="_blank" rel="noopener">${t('meetLink')} ↗</a>` : ''}</p>` : ''}
        ${(a.questions || []).length ? `<form class="stack" data-ans="${a.id}">${a.questions.map((q, i) => {
          const val = s?.answers?.[i];
          const locked = viewer === 'supervisor' || (s && s.graded_at);
          return `<div class="card flat stack" style="background:var(--surface-2)"><b dir="auto">${i + 1}. ${esc(q.q)}</b>
            ${q.type === 'text'
              ? `<textarea name="q${i}" dir="auto" ${locked ? 'readonly' : ''} ${viewer === 'student' ? 'required' : ''}>${esc(val ?? '')}</textarea>`
              : (q.options || []).map((o, k) => `<label class="row" style="font-weight:500;margin:0;${viewer === 'supervisor' || s?.graded_at ? (k === +q.answer ? 'color:var(--ok);font-weight:800' : +val === k ? 'color:var(--red)' : '') : ''}">
                  <input type="radio" name="q${i}" value="${k}" style="width:auto;min-height:0" ${+val === k && val !== undefined && val !== null ? 'checked' : ''} ${locked ? 'disabled' : ''} ${viewer === 'student' ? 'required' : ''}> <span dir="auto">${esc(o)}</span></label>`).join('')}
          </div>`;
        }).join('')}
          ${viewer === 'student' && !(s && s.graded_at) ? `<button class="btn primary">${t('submit')}</button>` : ''}</form>` : ''}
        ${s ? `<p class="small">${s.auto_score != null ? `${t('autoScore')}: <b>${s.auto_score}%</b> · ` : ''}${s.score != null ? `${t('finalScore')}: <b>${s.score}</b>` : t('submitted')}</p>
             ${s.feedback ? `<p class="notice small" dir="auto">🎓 ${t('feedback')}: ${esc(s.feedback)}</p>` : ''}` : ''}
        ${viewer === 'supervisor' ? `<form class="row" data-grade="${a.id}" ${!s && !a.meet_at && !a.meet_link ? 'hidden' : ''}>
            <input type="number" min="0" max="100" required value="${s?.score ?? s?.auto_score ?? 90}" style="width:90px" aria-label="${t('score')}">
            <input placeholder="${t('feedback')}" value="${esc(s?.feedback || '')}" style="flex:1;min-width:160px" dir="auto">
            <button class="btn sm primary">${t('save')}</button></form>
            ${!s && (a.meet_at || a.meet_link) ? '<p class="tiny muted" lang="ar">للاختبار الشفهي: سجّل الدرجة بعد اللقاء.</p>' : ''}
            <button class="btn sm ghost" data-del="${a.id}" style="color:var(--red)">🗑</button>` : ''}
      </div></details>`;
  };

  body.innerHTML = `
    ${viewer === 'supervisor' ? newTestForm(student) : ''}
    <h2>📝 ${t('tests')}</h2>
    ${D.assignments.length ? D.assignments.map(asgCard).join('') : `<p class="card muted">${t('noTests')}</p>`}`;

  // الطالب يجيب
  body.querySelectorAll('[data-ans]').forEach((f) => f.onsubmit = async (e) => {
    e.preventDefault();
    const a = D.assignments.find((x) => String(x.id) === f.dataset.ans);
    const answers = a.questions.map((q, i) => { const fd = new FormData(f).get('q' + i); return q.type === 'text' ? String(fd ?? '') : fd === null ? null : +fd; });
    try {
      await S.db.submitAssignment(a, answers);
      const sc = autoScore(a.questions, answers); if (sc !== null && sc >= CONFIG.passScore) confetti();
      toast('✓ ' + t('submitted')); reload();
    } catch (er) { toast(er.message); }
  });
  if (viewer !== 'supervisor') return;
  wireNewTest(body, student, reload);
  body.querySelectorAll('[data-grade]').forEach((f) => f.onsubmit = async (e) => {
    e.preventDefault();
    const [sc, fb] = f.querySelectorAll('input');
    const a = D.assignments.find((x) => String(x.id) === f.dataset.grade);
    try {
      if (!a.submission) await S.db.recordOral(a, Math.max(0, Math.min(100, +sc.value)), fb.value.trim());   // اختبار شفهي بلا تسليم
      else await S.db.gradeSubmission(a.id, Math.max(0, Math.min(100, +sc.value)), fb.value.trim());
      toast('✓'); reload();
    } catch (er) { toast(er.message); }
  });
  body.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (!confirm('حذف الاختبار؟')) return; await S.db.deleteAssignment(+b.dataset.del || b.dataset.del); reload(); });
}

function newTestForm(student) {
  return `<details class="card" id="nt-box"><summary><b>➕ ${t('newTest')}</b> <span class="tiny muted" lang="ar">— يُكتب بلغة الطالب (${esc(student.lang || '')})</span></summary>
    <form class="stack" id="ntf">
      <input id="tt" required placeholder="${t('testTitle')}" dir="auto">
      <div class="row"><select id="tst" style="max-width:280px"><option value="">— ${t('stage')} —</option>${STAGES.map((s, i) => `<option value="${s.id}">${i + 1}. ${esc(stageTitle(s.id, 'ar'))}</option>`).join('')}</select>
        <label class="small" style="margin:0">${t('due')} <input id="tdue" type="date" style="width:auto"></label></div>
      <textarea id="tins" placeholder="${t('instructions')}" dir="auto"></textarea>
      <div id="qs" class="stack"></div>
      <div class="row"><button type="button" class="btn sm" data-addq="mcq">➕ ${t('mcq')}</button><button type="button" class="btn sm" data-addq="text">➕ ${t('textQ')}</button></div>
      <details><summary class="small">🎙 ${t('oralAt')}</summary><div class="row" style="margin-top:8px">
        <input id="tmeet" type="datetime-local" style="width:auto"><input id="tlink" dir="ltr" placeholder="https://meet.google.com/…" style="flex:1;min-width:200px"></div></details>
      <p class="tiny muted" lang="ar">اكتب الأسئلة من مادة معتمدة درسها الطالب، بلغته. أسئلة الاختيار تُصحَّح آليًّا، والمكتوبة يصحّحها المشرف. ويكفي موعد شفهي دون أسئلة.</p>
      <button class="btn primary">${t('send')}</button>
    </form></details>`;
}
function wireNewTest(body, student, reload) {
  const qs = body.querySelector('#qs'); if (!qs) return;
  const addQ = (type) => {
    const d = document.createElement('div'); d.className = 'card flat stack'; d.dataset.type = type; d.style.background = 'var(--surface-2)';
    d.innerHTML = `<div class="row between"><b class="small">${type === 'mcq' ? t('mcq') : t('textQ')}</b><button type="button" class="btn sm ghost" aria-label="✕">✕</button></div>
      <input class="qq" required placeholder="${t('question')}" dir="auto">
      ${type === 'mcq' ? `${[0, 1, 2, 3].map((k) => `<label class="row" style="margin:0;font-weight:500"><input type="radio" name="ans-${qs.children.length}" value="${k}" ${k === 0 ? 'checked' : ''} style="width:auto;min-height:0" title="✓">
        <input class="op" ${k < 2 ? 'required' : ''} placeholder="${k + 1}" dir="auto" style="flex:1"></label>`).join('')}<span class="tiny muted" lang="ar">حدّد الدائرة بجانب الإجابة الصحيحة.</span>` : ''}`;
    d.querySelector('button').onclick = () => d.remove();
    qs.append(d);
  };
  body.querySelectorAll('[data-addq]').forEach((b) => b.onclick = () => addQ(b.dataset.addq));
  body.querySelector('#ntf').onsubmit = async (e) => {
    e.preventDefault();
    const questions = [...qs.children].map((d) => {
      const q = d.querySelector('.qq').value.trim();
      if (d.dataset.type === 'text') return { q, type: 'text' };
      const ops = [...d.querySelectorAll('.op')].map((o) => o.value.trim());
      const ansIdx = +d.querySelector('input[type=radio]:checked').value;
      const options = ops.filter(Boolean);
      return { q, type: 'mcq', options, answer: Math.max(0, options.indexOf(ops[ansIdx])) };
    });
    const meet = body.querySelector('#tmeet').value, link = body.querySelector('#tlink').value.trim();
    if (!questions.length && !meet && !link) return toast('أضف سؤالًا أو موعدًا شفهيًّا');
    try {
      await S.db.createAssignment({ student_id: student.id, title: body.querySelector('#tt').value.trim(), stage_id: body.querySelector('#tst').value || null,
        instructions: body.querySelector('#tins').value.trim() || null, questions,
        due_at: body.querySelector('#tdue').value ? new Date(body.querySelector('#tdue').value).toISOString() : null,
        meet_at: meet ? new Date(meet).toISOString() : null, meet_link: link || null });
      toast('✓ ' + t('send')); reload();
    } catch (er) { toast(er.message); }
  };
}
