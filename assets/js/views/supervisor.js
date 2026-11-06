// نافذة المشرف: طلابي، تفاصيل الطالب وتقييمه، بنك الأسئلة، والإدارة
import { CONFIG } from '../config.js';
import { S, esc, toast, ago, computeProgress, loadStudentData, loading, reveal } from '../core.js';
import { STAGES } from '../curriculum.js';
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
  const [students, links, unread] = await Promise.all([S.db.myStudents(), S.db.links(), S.db.unread().catch(() => [])]);
  const reqs = links.filter((l) => l.status === 'pending' && l.waitingForMe);
  const sent = links.filter((l) => l.status === 'pending' && !l.waitingForMe);
  const unreadOf = (id) => unread.filter((m) => m.student_id === id).length;
  const invite = S.me.supervisor_code ? `${location.origin}${location.pathname}#/join/${S.me.supervisor_code}` : '';
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
  app.querySelectorAll('tr.click').forEach((tr) => tr.onclick = () => location.hash = '#/supervisor/student/' + tr.dataset.id);
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
