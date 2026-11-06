// =====================================================================
//  طبقة البيانات — واجهة واحدة بمحرّكين:
//   1) Supabase (الإنتاج): دخول بالإيميل + قاعدة بيانات مع صلاحيات RLS
//   2) Local (وضع التجربة): كل شيء في localStorage لتجربة الموقع قبل ربط القاعدة
// =====================================================================
import { CONFIG } from './config.js';

const listeners = new Set();
const emit = (u) => listeners.forEach((f) => f(u));

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

  sb.auth.onAuthStateChange(async (_e, session) => emit(await loadMe(session)));

  return {
    mode: 'supabase',
    async init() { const { data } = await sb.auth.getSession(); return loadMe(data.session); },
    me: () => me,
    onChange: (f) => listeners.add(f),

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

    // --- الطالب ---
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
    async linkWithCode(code) { return ok(await sb.rpc('link_with_code', { p_code: code })); },
    async mySupervisors() {
      const links = ok(await sb.from('supervisor_students').select('supervisor_id').eq('student_id', uid()));
      if (!links.length) return [];
      return ok(await sb.from('profiles').select('id,full_name,email').in('id', links.map((l) => l.supervisor_id)));
    },

    // --- المشرف ---
    async myStudents() {
      const links = ok(await sb.from('supervisor_students').select('student_id').eq('supervisor_id', uid()));
      if (!links.length) return [];
      return ok(await sb.from('student_overview').select('*').in('id', links.map((l) => l.student_id)));
    },
    async student(id) { return ok(await sb.from('profiles').select('*').eq('id', id).maybeSingle()); },
    async linkStudentByEmail(email) { return ok(await sb.rpc('link_student_by_email', { p_email: email })); },
    async unlinkStudent(id) { ok(await sb.from('supervisor_students').delete().eq('supervisor_id', uid()).eq('student_id', id)); },
    async addEvaluation(student_id, stage_id, score, passed, notes) {
      ok(await sb.from('evaluations').insert({ student_id, supervisor_id: uid(), stage_id, score, passed, notes }));
    },
    async verifyMemo(student_id, kind, ref, grade) {
      ok(await sb.from('memorization').upsert({ student_id, kind, ref: String(ref), status: 'verified', grade, verified_by: uid(), updated_at: new Date().toISOString() }));
    },
    async questions(stage_id, lang) { return ok(await sb.from('quiz_questions').select('*').eq('stage_id', stage_id).eq('lang', lang)); },
    async addQuestion(q) { ok(await sb.from('quiz_questions').insert({ ...q, created_by: uid() })); },
    async deleteQuestion(id) { ok(await sb.from('quiz_questions').delete().eq('id', id)); },

    // --- المدير ---
    async pendingSupervisors() { return ok(await sb.from('profiles').select('*').eq('role', 'supervisor_pending')); },
    async approveSupervisor(id, approve) { ok(await sb.rpc('approve_supervisor', { p_user: id, p_approve: approve })); },
  };
}

// ---------------------------------------------------------------------
//  وضع التجربة (localStorage)
// ---------------------------------------------------------------------
function localBackend() {
  const KEY = 'subul-demo-db';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
  let db = load();
  if (!db) db = seed();
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  save();
  let me = db.users.find((u) => u.id === db.session) || null;
  const uid = () => me?.id;
  const rid = () => Math.random().toString(36).slice(2, 10);
  const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  function overview(u) {
    const pr = db.progress.filter((p) => p.student_id === u.id);
    const q = db.quiz.filter((x) => x.student_id === u.id);
    const best = {}; q.forEach((x) => { best[x.stage_id] = Math.max(best[x.stage_id] || 0, x.score); });
    const bv = Object.values(best); const ev = db.evals.filter((e) => e.student_id === u.id);
    return { ...u, done_items: pr.length,
      last_activity: pr.map((p) => p.completed_at).sort().pop() || null,
      avg_quiz: bv.length ? Math.round(bv.reduce((a, b) => a + b, 0) / bv.length) : null,
      avg_eval: ev.length ? Math.round(ev.reduce((a, b) => a + b.score, 0) / ev.length) : null,
      surahs_memorized: db.memo.filter((m) => m.student_id === u.id && m.kind === 'surah' && m.status !== 'learning').length };
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
        u = { id: rid(), email, full_name, lang, country, created_at: new Date().toISOString(),
              role: role === 'supervisor' ? 'supervisor' : 'student' };   // في التجربة يُعتمد المشرف فورًا
        if (u.role === 'supervisor') u.supervisor_code = code();
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
      if (!db.progress.some((p) => p.student_id === uid() && p.item_key === item_key))
        db.progress.push({ student_id: uid(), item_key, stage_id, kind, completed_at: new Date().toISOString() });
      save();
    },
    async unmark(item_key) { db.progress = db.progress.filter((p) => !(p.student_id === uid() && p.item_key === item_key)); save(); },
    async saveQuiz(stage_id, correct, total, details) {
      const score = Math.round((correct / total) * 100);
      db.quiz.push({ id: rid(), student_id: uid(), stage_id, score, correct, total, details, created_at: new Date().toISOString() }); save(); return score;
    },
    async quizzes(sid = uid()) { return db.quiz.filter((x) => x.student_id === sid); },
    async evaluations(sid = uid()) { return db.evals.filter((x) => x.student_id === sid); },
    async memo(sid = uid()) { return db.memo.filter((x) => x.student_id === sid); },
    async setMemo(kind, ref, status) {
      ref = String(ref);
      const m = db.memo.find((x) => x.student_id === uid() && x.kind === kind && x.ref === ref);
      if (m) { if (m.status !== 'verified') m.status = status; } else db.memo.push({ student_id: uid(), kind, ref, status, updated_at: new Date().toISOString() });
      save();
    },
    async linkWithCode(c) {
      const s = db.users.find((u) => u.supervisor_code === c.trim().toUpperCase());
      if (!s) return 'not_found';
      if (!db.links.some((l) => l.supervisor_id === s.id && l.student_id === uid())) db.links.push({ supervisor_id: s.id, student_id: uid() });
      save(); return 'ok';
    },
    async mySupervisors() {
      const ids = db.links.filter((l) => l.student_id === uid()).map((l) => l.supervisor_id);
      return db.users.filter((u) => ids.includes(u.id));
    },
    async myStudents() {
      const ids = db.links.filter((l) => l.supervisor_id === uid()).map((l) => l.student_id);
      return db.users.filter((u) => ids.includes(u.id)).map(overview);
    },
    async student(id) { return db.users.find((u) => u.id === id); },
    async linkStudentByEmail(email) {
      const s = db.users.find((u) => u.email === email.trim().toLowerCase() && u.role === 'student');
      if (!s) return 'not_found';
      if (!db.links.some((l) => l.supervisor_id === uid() && l.student_id === s.id)) db.links.push({ supervisor_id: uid(), student_id: s.id });
      save(); return 'ok';
    },
    async unlinkStudent(id) { db.links = db.links.filter((l) => !(l.supervisor_id === uid() && l.student_id === id)); save(); },
    async addEvaluation(student_id, stage_id, score, passed, notes) {
      db.evals.push({ id: rid(), student_id, supervisor_id: uid(), stage_id, score, passed, notes, created_at: new Date().toISOString() }); save();
    },
    async verifyMemo(student_id, kind, ref, grade) {
      ref = String(ref);
      const m = db.memo.find((x) => x.student_id === student_id && x.kind === kind && x.ref === ref);
      if (m) Object.assign(m, { status: 'verified', grade, verified_by: uid() });
      else db.memo.push({ student_id, kind, ref, status: 'verified', grade, verified_by: uid() });
      save();
    },
    async questions(stage_id, lang) { return db.questions.filter((q) => q.stage_id === stage_id && q.lang === lang); },
    async addQuestion(q) { db.questions.push({ id: rid(), ...q, created_by: uid() }); save(); },
    async deleteQuestion(id) { db.questions = db.questions.filter((q) => q.id !== id); save(); },
    async pendingSupervisors() { return db.users.filter((u) => u.role === 'supervisor_pending'); },
    async approveSupervisor(id, ok) { const u = db.users.find((x) => x.id === id); u.role = ok ? 'supervisor' : 'student'; if (ok) u.supervisor_code = code(); save(); },
  };
}

// بيانات تجريبية: مشرف وطالبان، لتظهر لوحة المشرف بأرقام
function seed() {
  const now = Date.now(), d = (n) => new Date(now - n * 864e5).toISOString();
  const sup = { id: 'demo-sup', email: 'mushrif@demo.test', full_name: 'المشرف التجريبي', role: 'supervisor', lang: 'sw', supervisor_code: 'DEMO01', created_at: d(30) };
  const a = { id: 'demo-a', email: 'amina@demo.test', full_name: 'Amina (demo)', role: 'student', lang: 'sw', country: 'Tanzania', created_at: d(20) };
  const b = { id: 'demo-b', email: 'jean@demo.test', full_name: 'Jean (demo)', role: 'student', lang: 'rw', country: 'Rwanda', created_at: d(9) };
  const progress = [
    ['demo-a', 'ih:2842635', 's1', 'read', 18], ['demo-a', 'ih:2836052', 's1', 'read', 17], ['demo-a', 'quran:112', 's1', 'memorize', 16],
    ['demo-a', 'ih:2842787', 's2', 'read', 12], ['demo-a', 'quran:1', 's2', 'memorize', 10], ['demo-a', 'ih:2842340', 's3', 'read', 3],
    ['demo-b', 'ih:2837300', 's1', 'read', 6], ['demo-b', 'quran:112', 's1', 'memorize', 4],
  ].map(([student_id, item_key, stage_id, kind, n]) => ({ student_id, item_key, stage_id, kind, completed_at: d(n) }));
  return {
    session: null,
    users: [sup, a, b],
    links: [{ supervisor_id: 'demo-sup', student_id: 'demo-a' }, { supervisor_id: 'demo-sup', student_id: 'demo-b' }],
    progress,
    quiz: [
      { id: 'q1', student_id: 'demo-a', stage_id: 's1', score: 100, correct: 5, total: 5, created_at: d(16) },
      { id: 'q2', student_id: 'demo-a', stage_id: 's2', score: 80, correct: 4, total: 5, created_at: d(10) },
      { id: 'q3', student_id: 'demo-b', stage_id: 's1', score: 60, correct: 3, total: 5, created_at: d(4) },
    ],
    evals: [{ id: 'e1', student_id: 'demo-a', supervisor_id: 'demo-sup', stage_id: 's1', score: 95, passed: true, notes: 'نطق الشهادتين وفهم معناهما', created_at: d(15) }],
    memo: [
      { student_id: 'demo-a', kind: 'surah', ref: '112', status: 'verified', grade: 95, verified_by: 'demo-sup' },
      { student_id: 'demo-a', kind: 'surah', ref: '1', status: 'memorized' },
      { student_id: 'demo-b', kind: 'surah', ref: '112', status: 'memorized' },
    ],
    questions: [],
  };
}

export async function createDB() {
  if (CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) {
    try { return await supabaseBackend(); }
    catch (e) { console.error('Supabase failed, falling back to demo', e); }
  }
  return localBackend();
}
