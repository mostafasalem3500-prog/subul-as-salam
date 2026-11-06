// =====================================================================
//  طبقة البيانات — واجهة واحدة بمحرّكين:
//   1) Supabase (الإنتاج): دخول بالإيميل + قاعدة بيانات مع صلاحيات RLS + محادثات فورية
//   2) Local (وضع التجربة): كل شيء في localStorage لتجربة الموقع قبل ربط القاعدة
// =====================================================================
import { CONFIG } from './config.js';

const listeners = new Set();
const emit = (u) => listeners.forEach((f) => f(u));
const autoScore = (questions, answers) => {
  const mcq = questions.map((q, i) => [q, i]).filter(([q]) => q.type !== 'text');
  if (!mcq.length) return null;
  return Math.round((mcq.filter(([q, i]) => +answers[i] === +q.answer).length / mcq.length) * 100);
};
export { autoScore };

// ---------------------------------------------------------------------
//  Supabase
// ---------------------------------------------------------------------
async function supabaseBackend() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  let me = null;

  async function loadMe(session) {
    if (!session?.user) { me = null; return null; }
    const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    me = data || { id: session.user.id, email: session.user.email, role: 'student', lang: CONFIG.defaultLang };
    sb.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', me.id).then(() => {});
    return me;
  }
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  const uid = () => me?.id;
  const redirect = location.origin + location.pathname;
  const profilesByIds = async (ids) => ids.length ? ok(await sb.from('profiles').select('id,full_name,email,lang,country,role,supervisor_code').in('id', ids)) : [];

  sb.auth.onAuthStateChange(async (_e, session) => emit(await loadMe(session)));

  return {
    mode: 'supabase',
    async init() { const { data } = await sb.auth.getSession(); return loadMe(data.session); },
    me: () => me,
    onChange: (f) => listeners.add(f),

    // --- الحساب ---
    async signUp({ email, password, full_name, lang, country, role }) {
      const r = await sb.auth.signUp({ email, password,
        options: { emailRedirectTo: redirect, data: { full_name, lang, country, requested_role: role } } });
      if (r.error) throw r.error;
      return r.data.session ? 'in' : 'confirm';
    },
    async signIn({ email, password }) { const r = await sb.auth.signInWithPassword({ email, password }); if (r.error) throw r.error; },
    async magicLink(email) { const r = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: false } }); if (r.error) throw r.error; },
    async resetPassword(email) { const r = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect }); if (r.error) throw r.error; },
    async signOut() { await sb.auth.signOut(); me = null; emit(null); },
    async updateMe(patch) { ok(await sb.from('profiles').update(patch).eq('id', uid())); Object.assign(me, patch); emit(me); },

    // --- التعلّم ---
    async progress(studentId = uid()) { return ok(await sb.from('progress').select('*').eq('student_id', studentId)); },
    async markDone(item_key, stage_id, kind) { ok(await sb.from('progress').upsert({ student_id: uid(), item_key, stage_id, kind })); },
    async unmark(item_key) { ok(await sb.from('progress').delete().eq('student_id', uid()).eq('item_key', item_key)); },
    async saveQuiz(stage_id, correct, total, details) {
      const score = Math.round((correct / total) * 100);
      ok(await sb.from('quiz_attempts').insert({ student_id: uid(), stage_id, score, correct, total, details })); return score;
    },
    async quizzes(studentId = uid()) { return ok(await sb.from('quiz_attempts').select('*').eq('student_id', studentId).order('created_at')); },
    async evaluations(studentId = uid()) { return ok(await sb.from('evaluations').select('*').eq('student_id', studentId).order('created_at')); },
    async memo(studentId = uid()) { return ok(await sb.from('memorization').select('*').eq('student_id', studentId)); },
    async setMemo(kind, ref, status) {
      ok(await sb.from('memorization').upsert({ student_id: uid(), kind, ref: String(ref), status, updated_at: new Date().toISOString() }));
    },

    // --- الربط بين المشرف والطالب (بطلب وموافقة) ---
    async links() {
      const rows = ok(await sb.from('supervisor_students').select('*').or(`student_id.eq.${uid()},supervisor_id.eq.${uid()}`));
      const others = await profilesByIds(rows.map((r) => (r.student_id === uid() ? r.supervisor_id : r.student_id)));
      return rows.map((r) => {
        const iAmStudent = r.student_id === uid();
        const other = others.find((p) => p.id === (iAmStudent ? r.supervisor_id : r.student_id)) || { id: iAmStudent ? r.supervisor_id : r.student_id };
        return { other, status: r.status, requested_by: r.requested_by, iAm: iAmStudent ? 'student' : 'supervisor', waitingForMe: r.status === 'pending' && r.requested_by !== (iAmStudent ? 'student' : 'supervisor') };
      });
    },
    async linkWithCode(code) { return ok(await sb.rpc('link_with_code', { p_code: code })); },
    async linkStudentByEmail(email) { return ok(await sb.rpc('link_student_by_email', { p_email: email })); },
    async respondLink(otherId, accept) { return ok(await sb.rpc('respond_link', { p_other: otherId, p_accept: accept })); },
    async unlink(otherId) {
      ok(await sb.from('supervisor_students').delete().or(`and(supervisor_id.eq.${uid()},student_id.eq.${otherId}),and(student_id.eq.${uid()},supervisor_id.eq.${otherId})`));
    },
    async myStudents() {
      const links = ok(await sb.from('supervisor_students').select('student_id').eq('supervisor_id', uid()).eq('status', 'active'));
      if (!links.length) return [];
      return ok(await sb.from('student_overview').select('*').in('id', links.map((l) => l.student_id)));
    },
    async student(id) { return ok(await sb.from('profiles').select('*').eq('id', id).maybeSingle()); },
    async addEvaluation(student_id, stage_id, score, passed, notes) {
      ok(await sb.from('evaluations').insert({ student_id, supervisor_id: uid(), stage_id, score, passed, notes }));
    },
    async verifyMemo(student_id, kind, ref, grade) {
      ok(await sb.from('memorization').upsert({ student_id, kind, ref: String(ref), status: 'verified', grade, verified_by: uid(), updated_at: new Date().toISOString() }));
    },

    // --- المحادثات ---
    async messages(student_id, supervisor_id) {
      return ok(await sb.from('messages').select('*').eq('student_id', student_id).eq('supervisor_id', supervisor_id).order('created_at').limit(500));
    },
    async sendMessage(student_id, supervisor_id, body) { ok(await sb.from('messages').insert({ student_id, supervisor_id, sender_id: uid(), body })); },
    async markRead(student_id, supervisor_id) { await sb.rpc('mark_read', { p_student: student_id, p_supervisor: supervisor_id }); },
    async unread() {
      const rows = ok(await sb.from('messages').select('student_id,supervisor_id').is('read_at', null).neq('sender_id', uid()));
      return rows;
    },
    onMessage(cb) {
      const ch = sb.channel('msgs-' + uid()).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => cb(p.new)).subscribe();
      return () => sb.removeChannel(ch);
    },

    // --- اختبارات المشرف لطالبه ---
    async assignments(student_id) {
      const a = ok(await sb.from('assignments').select('*').eq('student_id', student_id).order('created_at', { ascending: false }));
      if (!a.length) return [];
      const subs = ok(await sb.from('submissions').select('*').in('assignment_id', a.map((x) => x.id)));
      return a.map((x) => ({ ...x, submission: subs.find((s) => s.assignment_id === x.id) || null }));
    },
    async createAssignment(a) { ok(await sb.from('assignments').insert({ ...a, supervisor_id: uid() })); },
    async deleteAssignment(id) { ok(await sb.from('assignments').delete().eq('id', id)); },
    async submitAssignment(assignment, answers) {
      ok(await sb.from('submissions').upsert({ assignment_id: assignment.id, student_id: uid(), answers, auto_score: autoScore(assignment.questions, answers), submitted_at: new Date().toISOString() }));
    },
    async gradeSubmission(assignment_id, score, feedback) { ok(await sb.rpc('grade_submission', { p_assignment: assignment_id, p_score: score, p_feedback: feedback })); },
    async recordOral(a, score, feedback) { ok(await sb.rpc('record_oral', { p_assignment: a.id, p_score: score, p_feedback: feedback })); },

    // --- بنك الأسئلة والرسائل الدعوية ---
    async questions(stage_id, lang) { return ok(await sb.from('quiz_questions').select('*').eq('stage_id', stage_id).eq('lang', lang)); },
    async addQuestion(q) { ok(await sb.from('quiz_questions').insert({ ...q, created_by: uid() })); },
    async deleteQuestion(id) { ok(await sb.from('quiz_questions').delete().eq('id', id)); },
    async dawahMessages(lang) { return ok(await sb.from('dawah_messages').select('*').eq('lang', lang).order('created_at', { ascending: false })); },
    async addDawahMessage(m) { ok(await sb.from('dawah_messages').insert({ ...m, author_id: uid(), status: 'draft' })); },
    async approveDawahMessage(id, okk) { ok(await sb.rpc('approve_dawah_message', { p_id: id, p_ok: okk })); },
    async deleteDawahMessage(id) { ok(await sb.from('dawah_messages').delete().eq('id', id)); },

    // --- المدير ---
    async pendingSupervisors() { return ok(await sb.from('profiles').select('*').eq('role', 'supervisor_pending')); },
    async approveSupervisor(id, approve) { ok(await sb.rpc('approve_supervisor', { p_user: id, p_approve: approve })); },
  };
}

// ---------------------------------------------------------------------
//  وضع التجربة (localStorage) — نفس القواعد تقريبًا لتكون التجربة واقعية
// ---------------------------------------------------------------------
function localBackend() {
  const KEY = 'subul-demo-db-v2';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
  let db = load() || seed();
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  save();
  let me = db.users.find((u) => u.id === db.session) || null;
  const uid = () => me?.id;
  const rid = () => Math.random().toString(36).slice(2, 10);
  const nid = () => Date.now() + Math.floor(Math.random() * 1000);
  const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  const now = () => new Date().toISOString();
  const link = (sup, stu) => db.links.find((l) => l.supervisor_id === sup && l.student_id === stu);
  const active = (stu, sup) => link(sup, stu)?.status === 'active';
  const pub = (u) => u && ({ id: u.id, full_name: u.full_name, email: u.email, lang: u.lang, country: u.country, role: u.role, supervisor_code: u.supervisor_code });

  function overview(u) {
    const pr = db.progress.filter((p) => p.student_id === u.id);
    return { ...u, done_items: pr.length, last_activity: pr.map((p) => p.completed_at).sort().pop() || null };
  }

  return {
    mode: 'local',
    async init() { return me; },
    me: () => me,
    onChange: (f) => listeners.add(f),
    async signUp({ email, full_name, lang, country, role }) {
      email = email.trim().toLowerCase();
      let u = db.users.find((x) => x.email === email);
      if (!u) {
        u = { id: rid(), email, full_name, lang, country, created_at: now(), role: role === 'supervisor' ? 'supervisor' : 'student' };
        if (u.role === 'supervisor') u.supervisor_code = code();   // في التجربة يُعتمد المشرف فورًا
        db.users.push(u);
      }
      db.session = u.id; save(); me = u; emit(me); return 'in';
    },
    async signIn({ email }) {
      const u = db.users.find((x) => x.email === email.trim().toLowerCase());
      if (!u) throw new Error('لا يوجد حساب بهذا الإيميل في وضع التجربة — أنشئ حسابًا.');
      db.session = u.id; save(); me = u; emit(me);
    },
    async magicLink() { throw new Error('رابط الدخول يعمل بعد ربط Supabase.'); },
    async resetPassword() { throw new Error('يعمل بعد ربط Supabase.'); },
    async signOut() { db.session = null; save(); me = null; emit(null); },
    async updateMe(patch) { Object.assign(me, patch); save(); emit(me); },

    async progress(sid = uid()) { return db.progress.filter((p) => p.student_id === sid); },
    async markDone(item_key, stage_id, kind) {
      if (!db.progress.some((p) => p.student_id === uid() && p.item_key === item_key)) db.progress.push({ student_id: uid(), item_key, stage_id, kind, completed_at: now() });
      save();
    },
    async unmark(item_key) { db.progress = db.progress.filter((p) => !(p.student_id === uid() && p.item_key === item_key)); save(); },
    async saveQuiz(stage_id, correct, total, details) {
      const score = Math.round((correct / total) * 100);
      db.quiz.push({ id: rid(), student_id: uid(), stage_id, score, correct, total, details, created_at: now() }); save(); return score;
    },
    async quizzes(sid = uid()) { return db.quiz.filter((x) => x.student_id === sid); },
    async evaluations(sid = uid()) { return db.evals.filter((x) => x.student_id === sid); },
    async memo(sid = uid()) { return db.memo.filter((x) => x.student_id === sid); },
    async setMemo(kind, ref, status) {
      ref = String(ref);
      const m = db.memo.find((x) => x.student_id === uid() && x.kind === kind && x.ref === ref);
      if (m) { if (m.status === 'verified') throw new Error('verified'); m.status = status; } else db.memo.push({ student_id: uid(), kind, ref, status, updated_at: now() });
      save();
    },

    async links() {
      return db.links.filter((l) => l.student_id === uid() || l.supervisor_id === uid()).map((l) => {
        const iAmStudent = l.student_id === uid();
        return { other: pub(db.users.find((u) => u.id === (iAmStudent ? l.supervisor_id : l.student_id))) || {}, status: l.status, requested_by: l.requested_by,
                 iAm: iAmStudent ? 'student' : 'supervisor', waitingForMe: l.status === 'pending' && l.requested_by !== (iAmStudent ? 'student' : 'supervisor') };
      });
    },
    async linkWithCode(c) {
      const s = db.users.find((u) => u.supervisor_code === c.trim().toUpperCase() && ['supervisor', 'admin'].includes(u.role));
      if (!s) return 'not_found'; if (s.id === uid()) return 'self';
      const l = link(s.id, uid());
      if (l) { if (l.status === 'pending' && l.requested_by === 'supervisor') l.status = 'active'; save(); return l.status; }
      db.links.push({ supervisor_id: s.id, student_id: uid(), status: 'pending', requested_by: 'student', created_at: now() }); save(); return 'pending';
    },
    async linkStudentByEmail(email) {
      const s = db.users.find((u) => u.email === email.trim().toLowerCase() && u.role === 'student');
      if (!s) return 'not_found';
      const l = link(uid(), s.id);
      if (l) { if (l.status === 'pending' && l.requested_by === 'student') l.status = 'active'; save(); return l.status; }
      db.links.push({ supervisor_id: uid(), student_id: s.id, status: 'pending', requested_by: 'supervisor', created_at: now() }); save(); return 'pending';
    },
    async respondLink(other, accept) {
      const l = db.links.find((x) => x.status === 'pending' && ((x.student_id === uid() && x.supervisor_id === other && x.requested_by === 'supervisor') ||
                                                                (x.supervisor_id === uid() && x.student_id === other && x.requested_by === 'student')));
      if (!l) return 'not_found';
      if (accept) l.status = 'active'; else db.links = db.links.filter((x) => x !== l);
      save(); return 'ok';
    },
    async unlink(other) { db.links = db.links.filter((l) => !((l.supervisor_id === uid() && l.student_id === other) || (l.student_id === uid() && l.supervisor_id === other))); save(); },
    async myStudents() {
      const ids = db.links.filter((l) => l.supervisor_id === uid() && l.status === 'active').map((l) => l.student_id);
      return db.users.filter((u) => ids.includes(u.id)).map(overview);
    },
    async student(id) { return db.users.find((u) => u.id === id); },
    async addEvaluation(student_id, stage_id, score, passed, notes) {
      if (!active(student_id, uid())) throw new Error('غير مرتبط');
      db.evals.push({ id: rid(), student_id, supervisor_id: uid(), stage_id, score, passed, notes, created_at: now() }); save();
    },
    async verifyMemo(student_id, kind, ref, grade) {
      ref = String(ref);
      const m = db.memo.find((x) => x.student_id === student_id && x.kind === kind && x.ref === ref);
      if (m) Object.assign(m, { status: 'verified', grade, verified_by: uid() }); else db.memo.push({ student_id, kind, ref, status: 'verified', grade, verified_by: uid() });
      save();
    },

    async messages(st, sup) { return db.msgs.filter((m) => m.student_id === st && m.supervisor_id === sup); },
    async sendMessage(st, sup, body) {
      if (!active(st, sup)) throw new Error('الربط غير مفعّل بعد');
      db.msgs.push({ id: nid(), student_id: st, supervisor_id: sup, sender_id: uid(), body, created_at: now(), read_at: null }); save();
    },
    async markRead(st, sup) { db.msgs.forEach((m) => { if (m.student_id === st && m.supervisor_id === sup && m.sender_id !== uid() && !m.read_at) m.read_at = now(); }); save(); },
    async unread() { return db.msgs.filter((m) => !m.read_at && m.sender_id !== uid() && (m.student_id === uid() || m.supervisor_id === uid())); },
    onMessage() { return () => {}; },

    async assignments(st) {
      return db.asg.filter((a) => a.student_id === st).sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((a) => ({ ...a, submission: db.subs.find((s) => s.assignment_id === a.id) || null }));
    },
    async createAssignment(a) {
      if (!active(a.student_id, uid())) throw new Error('غير مرتبط');
      db.asg.push({ id: nid(), supervisor_id: uid(), created_at: now(), questions: [], ...a }); save();
    },
    async deleteAssignment(id) { db.asg = db.asg.filter((a) => a.id !== id); db.subs = db.subs.filter((s) => s.assignment_id !== id); save(); },
    async submitAssignment(a, answers) {
      const s = db.subs.find((x) => x.assignment_id === a.id);
      if (s?.graded_at) throw new Error('صُحّح الاختبار');
      const row = { assignment_id: a.id, student_id: uid(), answers, auto_score: autoScore(a.questions, answers), submitted_at: now(), score: null, feedback: null, graded_at: null };
      if (s) Object.assign(s, row); else db.subs.push(row); save();
    },
    async gradeSubmission(id, score, feedback) { const s = db.subs.find((x) => x.assignment_id === id); Object.assign(s, { score, feedback, graded_at: now() }); save(); },
    async recordOral(a, score, feedback) { db.subs = db.subs.filter((x) => x.assignment_id !== a.id); db.subs.push({ assignment_id: a.id, student_id: a.student_id, answers: [], auto_score: null, score, feedback, submitted_at: now(), graded_at: now() }); save(); },

    async questions(stage_id, lang) { return db.questions.filter((q) => q.stage_id === stage_id && q.lang === lang); },
    async addQuestion(q) { db.questions.push({ id: rid(), ...q, created_by: uid() }); save(); },
    async deleteQuestion(id) { db.questions = db.questions.filter((q) => q.id !== id); save(); },
    async dawahMessages(lang) { return db.dmsg.filter((m) => m.lang === lang && (m.status === 'approved' || m.author_id === uid() || me?.role === 'admin')); },
    async addDawahMessage(m) { db.dmsg.unshift({ id: nid(), ...m, author_id: uid(), status: me?.role === 'admin' ? 'approved' : 'draft', created_at: now() }); save(); },
    async approveDawahMessage(id, okk) { if (okk) db.dmsg.find((m) => m.id === id).status = 'approved'; else db.dmsg = db.dmsg.filter((m) => m.id !== id); save(); },
    async deleteDawahMessage(id) { db.dmsg = db.dmsg.filter((m) => m.id !== id); save(); },
    async pendingSupervisors() { return db.users.filter((u) => u.role === 'supervisor_pending'); },
    async approveSupervisor(id, okk) { const u = db.users.find((x) => x.id === id); u.role = okk ? 'supervisor' : 'student'; if (okk) u.supervisor_code = code(); save(); },
  };
}

// بيانات تجريبية: مشرف وثلاثة طلاب (اثنان مرتبطان، وواحد أرسل طلب ربط)
function seed() {
  const t0 = Date.now(), d = (n) => new Date(t0 - n * 864e5).toISOString();
  const sup = { id: 'demo-sup', email: 'mushrif@demo.test', full_name: 'المشرف التجريبي', role: 'admin', lang: 'sw', supervisor_code: 'DEMO01', created_at: d(30) };
  const a = { id: 'demo-a', email: 'amina@demo.test', full_name: 'Amina (demo)', role: 'student', lang: 'sw', country: 'Tanzania', created_at: d(20) };
  const b = { id: 'demo-b', email: 'jean@demo.test', full_name: 'Jean (demo)', role: 'student', lang: 'rw', country: 'Rwanda', created_at: d(9) };
  const c = { id: 'demo-c', email: 'carlos@demo.test', full_name: 'Carlos (demo)', role: 'student', lang: 'es', country: 'México', created_at: d(1) };
  const progress = [
    ['demo-a', 'ih:2842635', 's1', 'read', 18], ['demo-a', 'ih:2836052', 's1', 'read', 17], ['demo-a', 'quran:112', 's1', 'memorize', 16],
    ['demo-a', 'ih:2842787', 's2', 'read', 12], ['demo-a', 'quran:1', 's2', 'memorize', 10], ['demo-a', 'ih:2842340', 's3', 'read', 3],
    ['demo-b', 'ih:2837300', 's1', 'read', 6], ['demo-b', 'quran:112', 's1', 'memorize', 4],
  ].map(([student_id, item_key, stage_id, kind, n]) => ({ student_id, item_key, stage_id, kind, completed_at: d(n) }));
  return {
    session: null,
    users: [sup, a, b, c],
    links: [
      { supervisor_id: 'demo-sup', student_id: 'demo-a', status: 'active', requested_by: 'student' },
      { supervisor_id: 'demo-sup', student_id: 'demo-b', status: 'active', requested_by: 'supervisor' },
      { supervisor_id: 'demo-sup', student_id: 'demo-c', status: 'pending', requested_by: 'student' },
    ],
    progress,
    quiz: [
      { id: 'q1', student_id: 'demo-a', stage_id: 's1', score: 100, correct: 4, total: 4, created_at: d(16) },
      { id: 'q2', student_id: 'demo-a', stage_id: 's2', score: 86, correct: 6, total: 7, created_at: d(10) },
      { id: 'q3', student_id: 'demo-b', stage_id: 's1', score: 60, correct: 3, total: 5, created_at: d(4) },
    ],
    evals: [{ id: 'e1', student_id: 'demo-a', supervisor_id: 'demo-sup', stage_id: 's1', score: 95, passed: true, notes: 'نطق الشهادتين وفهم معناهما', created_at: d(15) }],
    memo: [
      { student_id: 'demo-a', kind: 'surah', ref: '112', status: 'verified', grade: 95, verified_by: 'demo-sup' },
      { student_id: 'demo-a', kind: 'surah', ref: '1', status: 'memorized' },
      { student_id: 'demo-b', kind: 'surah', ref: '112', status: 'memorized' },
    ],
    msgs: [
      { id: 1, student_id: 'demo-a', supervisor_id: 'demo-sup', sender_id: 'demo-sup', body: 'Assalamu alaikum Amina 🌿', created_at: d(3), read_at: d(3) },
      { id: 2, student_id: 'demo-a', supervisor_id: 'demo-sup', sender_id: 'demo-a', body: 'Wa alaikum salaam! Nimemaliza sura Al-Fatiha.', created_at: d(2), read_at: null },
    ],
    asg: [{ id: 101, supervisor_id: 'demo-sup', student_id: 'demo-a', stage_id: 's2', title: 'تسميع الفاتحة وأسئلة الوضوء', instructions: 'اختبار قصير من المشرف التجريبي', created_at: d(5),
      questions: [{ q: 'Demo question (supervisor writes in student language)', type: 'mcq', options: ['A', 'B', 'C'], answer: 0 }, { q: 'Demo open question', type: 'text' }],
      meet_at: new Date(t0 + 2 * 864e5).toISOString(), meet_link: 'https://meet.google.com/' }],
    subs: [],
    questions: [],
    dmsg: [],
  };
}

export async function createDB() {
  if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) {
    try { return await supabaseBackend(); }
    catch (e) { console.error('Supabase failed, falling back to demo', e); }
  }
  return localBackend();
}
