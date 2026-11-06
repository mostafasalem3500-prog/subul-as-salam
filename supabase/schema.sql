-- =====================================================================
--  سُبُل السلام — قاعدة البيانات (Supabase / PostgreSQL)
--  شغّل هذا الملف كاملًا مرة واحدة من: Supabase → SQL Editor → New query
--  يمكن إعادة تشغيله بأمان (يستخدم IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- ---------- 1) الملفات الشخصية والأدوار ----------
-- الأدوار: student (طالب) | supervisor_pending (طلب إشراف) | supervisor (مشرف) | admin (مدير)
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  role            text not null default 'student'
                  check (role in ('student','supervisor_pending','supervisor','admin')),
  lang            text not null default 'sw',           -- لغة التعلّم: sw | rw | es | en ...
  country         text,
  shahada_date    date,                                  -- تاريخ النطق بالشهادة (اختياري)
  supervisor_code text unique,                           -- رمز المشرف يعطيه لطلابه
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz
);

-- ربط المشرف بطلابه (طالب واحد قد يتابعه أكثر من مشرف)
-- الربط يمرّ بطلب وموافقة: من يطلب (requested_by) ينتظر موافقة الطرف الآخر
create table if not exists public.supervisor_students (
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','active')),
  requested_by  text not null default 'student' check (requested_by in ('student','supervisor')),
  created_at    timestamptz not null default now(),
  primary key (supervisor_id, student_id)
);
-- ترقية قاعدة أُنشئت بالإصدار الأول
alter table public.supervisor_students add column if not exists status text not null default 'active';
alter table public.supervisor_students add column if not exists requested_by text not null default 'student';

-- ---------- 2) التقدّم والتقييم ----------
-- كل مادة أنهاها الطالب (كتاب/مقالة من إسلام هاوس، سورة، حديث ...)
create table if not exists public.progress (
  student_id   uuid not null references public.profiles(id) on delete cascade,
  item_key     text not null,           -- مثال: ih:2842635 | quran:112 | hadith:66512
  stage_id     text not null,           -- مثال: s1
  kind         text not null,           -- read | listen | memorize | hadith
  completed_at timestamptz not null default now(),
  primary key (student_id, item_key)
);

-- محاولات الاختبار لكل مرحلة
create table if not exists public.quiz_attempts (
  id         bigint generated always as identity primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  stage_id   text not null,
  score      int  not null check (score between 0 and 100),
  correct    int  not null,
  total      int  not null,
  details    jsonb,
  created_at timestamptz not null default now()
);

-- تقييم المشرف لكل مرحلة (مقابلة شفهية/تسميع ...)
create table if not exists public.evaluations (
  id            bigint generated always as identity primary key,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  stage_id      text not null,
  score         int  not null check (score between 0 and 100),
  passed        boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now()
);

-- الحفظ: السور والأحاديث (الطالب يعلن الحفظ، والمشرف يوثّقه بعد التسميع)
create table if not exists public.memorization (
  student_id  uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('surah','hadith')),
  ref         text not null,             -- رقم السورة أو رقم الحديث
  status      text not null default 'learning' check (status in ('learning','memorized','verified')),
  grade       int check (grade between 0 and 100),
  verified_by uuid references public.profiles(id),
  updated_at  timestamptz not null default now(),
  primary key (student_id, kind, ref)
);

-- بنك أسئلة يكتبه فريق التعليم بلغة الطالب (اختياري، يُضاف إلى الاختبار الآلي)
create table if not exists public.quiz_questions (
  id         bigint generated always as identity primary key,
  stage_id   text not null,
  lang       text not null,
  question   text not null,
  options    jsonb not null,             -- ["...","...","..."]
  answer     int  not null,              -- رقم الخيار الصحيح (يبدأ من 0)
  source     text,                       -- مرجع السؤال (كتاب/رابط)
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_progress_student on public.progress(student_id);
create index if not exists idx_quiz_student     on public.quiz_attempts(student_id);
create index if not exists idx_eval_student     on public.evaluations(student_id);
create index if not exists idx_links_student    on public.supervisor_students(student_id);

-- ---------- 3) دوال مساعدة ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_supervisor_of(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.supervisor_students
                 where supervisor_id = auth.uid() and student_id = p_student and status = 'active')
         or public.is_admin()
$$;

-- أي علاقة (ولو طلبًا معلّقًا) بين المستخدم الحالي وشخص آخر — لعرض الاسم في الطلبات
create or replace function public.has_link(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.supervisor_students
                 where (supervisor_id = auth.uid() and student_id = p_other)
                    or (student_id = auth.uid() and supervisor_id = p_other))
$$;

-- هل الطرفان مرتبطان ربطًا نشطًا؟
create or replace function public.is_active_pair(p_student uuid, p_supervisor uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.supervisor_students
                 where student_id = p_student and supervisor_id = p_supervisor and status = 'active')
$$;

-- رمز مشرف قصير مثل: K7Q2M9
create or replace function public.gen_code() returns text
language sql volatile as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6))
$$;

-- إنشاء الملف الشخصي تلقائيًا عند التسجيل
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare req text := coalesce(new.raw_user_meta_data->>'requested_role','student');
begin
  insert into public.profiles (id, email, full_name, lang, country, role)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          coalesce(new.raw_user_meta_data->>'lang','sw'),
          new.raw_user_meta_data->>'country',
          case when req = 'supervisor' then 'supervisor_pending' else 'student' end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- منع المستخدم من ترقية نفسه: الدور ورمز المشرف لا يغيّرهما إلا المدير
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.supervisor_code is distinct from old.supervisor_code)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admin can change role';
  end if;
  if new.role = 'supervisor' and new.supervisor_code is null then
    new.supervisor_code := public.gen_code();
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
  for each row execute function public.guard_profile();

-- الطالب يطلب الارتباط بمشرف عبر رمز المشرف (أو رابط الدعوة #/join/CODE) → طلب ينتظر موافقة المشرف
create or replace function public.link_with_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare sup uuid; st text;
begin
  select id into sup from public.profiles
   where supervisor_code = upper(trim(p_code)) and role in ('supervisor','admin');
  if sup is null then return 'not_found'; end if;
  if sup = auth.uid() then return 'self'; end if;
  select status into st from public.supervisor_students where supervisor_id = sup and student_id = auth.uid();
  if st = 'active' then return 'active'; end if;
  if st = 'pending' then
    -- كان المشرف قد دعاه: طلب الطالب يعني الموافقة
    update public.supervisor_students set status = 'active'
     where supervisor_id = sup and student_id = auth.uid() and requested_by = 'supervisor';
    return (select status from public.supervisor_students where supervisor_id = sup and student_id = auth.uid());
  end if;
  insert into public.supervisor_students(supervisor_id, student_id, status, requested_by)
  values (sup, auth.uid(), 'pending', 'student');
  return 'pending';
end $$;

-- المشرف يدعو طالبًا بإيميله (يجب أن يكون قد سجّل) → دعوة تنتظر موافقة الطالب من حسابه
create or replace function public.link_student_by_email(p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare stu uuid; st text;
begin
  if public.my_role() not in ('supervisor','admin') then return 'forbidden'; end if;
  select id into stu from public.profiles where lower(email) = lower(trim(p_email)) and role = 'student';
  if stu is null then return 'not_found'; end if;
  select status into st from public.supervisor_students where supervisor_id = auth.uid() and student_id = stu;
  if st = 'active' then return 'active'; end if;
  if st = 'pending' then
    update public.supervisor_students set status = 'active'
     where supervisor_id = auth.uid() and student_id = stu and requested_by = 'student';
    return (select status from public.supervisor_students where supervisor_id = auth.uid() and student_id = stu);
  end if;
  insert into public.supervisor_students(supervisor_id, student_id, status, requested_by)
  values (auth.uid(), stu, 'pending', 'supervisor');
  return 'pending';
end $$;

-- الموافقة على طلب ربط أو رفضه (يقوم بها الطرف الذي لم يطلب)
create or replace function public.respond_link(p_other uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_accept then
    update public.supervisor_students set status = 'active'
     where status = 'pending' and (
           (student_id = auth.uid() and supervisor_id = p_other and requested_by = 'supervisor')
        or (supervisor_id = auth.uid() and student_id = p_other and requested_by = 'student'));
  else
    delete from public.supervisor_students
     where status = 'pending' and (
           (student_id = auth.uid() and supervisor_id = p_other)
        or (supervisor_id = auth.uid() and student_id = p_other));
  end if;
  get diagnostics n = row_count;
  return case when n > 0 then 'ok' else 'not_found' end;
end $$;

-- المدير يعتمد مشرفًا
create or replace function public.approve_supervisor(p_user uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles
     set role = case when p_approve then 'supervisor' else 'student' end
   where id = p_user;
end $$;

-- ملخص الطلاب للمشرف (مرحلة، نسبة، متوسط الدرجات، آخر نشاط)
create or replace view public.student_overview
with (security_invoker = true) as
select p.id, p.email, p.full_name, p.lang, p.country, p.created_at, p.last_seen_at,
       (select count(*) from public.progress pr where pr.student_id = p.id and pr.kind not in ('prayer','daily','lang')) as done_items,
       (select max(completed_at) from public.progress pr where pr.student_id = p.id)        as last_activity,
       (select round(avg(best)) from (select max(score) best from public.quiz_attempts q
                                       where q.student_id = p.id group by stage_id) b)     as avg_quiz,
       (select round(avg(score)) from public.evaluations e where e.student_id = p.id)      as avg_eval,
       (select count(*) from public.memorization m where m.student_id = p.id and m.kind='surah'
                                                    and m.status in ('memorized','verified')) as surahs_memorized
from public.profiles p
where p.role = 'student';

-- ---------- 3ب) المحادثات والاختبارات وبنك الرسائل (الإصدار 2) ----------
-- محادثة بين الطالب ومشرفه (لكل زوج مرتبط محادثة واحدة)
create table if not exists public.messages (
  id            bigint generated always as identity primary key,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 4000),
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index if not exists idx_msg_pair on public.messages(student_id, supervisor_id, created_at);

-- اختبار/واجب يرسله المشرف لطالب معيّن (أسئلة اختيار أو مقالية، أو موعد اختبار شفهي)
create table if not exists public.assignments (
  id            bigint generated always as identity primary key,
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  stage_id      text,                    -- ربطه بمحطة يجعل درجته تدخل في درجة المحطة
  title         text not null,
  instructions  text,
  questions     jsonb not null default '[]',  -- [{q, type:'mcq'|'text', options:[...], answer:int}]
  meet_at       timestamptz,             -- موعد اختبار شفهي (اختياري)
  meet_link     text,                    -- رابط الاجتماع (اختياري)
  due_at        timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_asg_student on public.assignments(student_id);

-- إجابة الطالب وتصحيح المشرف
create table if not exists public.submissions (
  assignment_id bigint primary key references public.assignments(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  answers       jsonb not null default '[]',
  auto_score    int check (auto_score between 0 and 100),   -- تصحيح آلي لأسئلة الاختيار
  score         int check (score between 0 and 100),        -- الدرجة النهائية من المشرف
  feedback      text,
  submitted_at  timestamptz not null default now(),
  graded_at     timestamptz
);

-- بنك الرسائل الدعوية لكل لغة: يكتبها فريق التعليم (متحدثون أصليون) ويعتمدها المدير
create table if not exists public.dawah_messages (
  id         bigint generated always as identity primary key,
  lang       text not null,
  title      text not null,
  body       text not null,
  ar         text,                         -- المعنى بالعربية للمراجع
  q          text[] default '{}',          -- مراجع آيات "2:255"
  h          text[] default '{}',          -- أرقام أحاديث HadeethEnc
  status     text not null default 'draft' check (status in ('draft','approved')),
  author_id  uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- بنك مرئيات يوتيوب لكل لغة: روابط من قنوات رسمية لمصادر معتمدة، يضيفها المشرفون ويعتمدها المدير
create table if not exists public.media_links (
  id         bigint generated always as identity primary key,
  lang       text not null,
  stage_id   text,
  title      text not null,
  url        text not null check (url ~* '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  source     text not null,
  status     text not null default 'draft' check (status in ('draft','approved')),
  author_id  uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.approve_media_link(p_id bigint, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_ok then update public.media_links set status = 'approved' where id = p_id;
  else delete from public.media_links where id = p_id; end if;
end $$;

-- المشرف يصحّح الإجابة
create or replace function public.grade_submission(p_assignment bigint, p_score int, p_feedback text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.assignments a where a.id = p_assignment
                 and (a.supervisor_id = auth.uid() or public.is_admin())) then
    raise exception 'forbidden';
  end if;
  update public.submissions set score = greatest(0, least(100, p_score)), feedback = p_feedback, graded_at = now()
   where assignment_id = p_assignment;
end $$;

-- المشرف يسجّل درجة اختبار شفهي (لا تسليم كتابي فيه)
create or replace function public.record_oral(p_assignment bigint, p_score int, p_feedback text) returns void
language plpgsql security definer set search_path = public as $$
declare a public.assignments;
begin
  select * into a from public.assignments where id = p_assignment;
  if a.id is null or (a.supervisor_id <> auth.uid() and not public.is_admin()) then raise exception 'forbidden'; end if;
  insert into public.submissions(assignment_id, student_id, answers, score, feedback, graded_at)
  values (a.id, a.student_id, '[]', greatest(0, least(100, p_score)), p_feedback, now())
  on conflict (assignment_id) do update set score = excluded.score, feedback = excluded.feedback, graded_at = now();
end $$;

-- تعليم رسائل المحادثة مقروءة
create or replace function public.mark_read(p_student uuid, p_supervisor uuid) returns void
language sql security definer set search_path = public as $$
  update public.messages set read_at = now()
   where student_id = p_student and supervisor_id = p_supervisor and read_at is null
     and sender_id <> auth.uid() and auth.uid() in (p_student, p_supervisor)
$$;

-- المدير يعتمد رسالة دعوية
create or replace function public.approve_dawah_message(p_id bigint, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_ok then update public.dawah_messages set status = 'approved' where id = p_id;
  else delete from public.dawah_messages where id = p_id; end if;
end $$;

-- التحديث الفوري للمحادثات (Realtime) — يعمل في Supabase فقط
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
end $$;

-- ---------- 4) الصلاحيات (Row Level Security) ----------
alter table public.profiles            enable row level security;
alter table public.supervisor_students enable row level security;
alter table public.progress            enable row level security;
alter table public.quiz_attempts       enable row level security;
alter table public.evaluations         enable row level security;
alter table public.memorization        enable row level security;
alter table public.quiz_questions      enable row level security;

-- profiles
drop policy if exists p_profiles_select on public.profiles;
create policy p_profiles_select on public.profiles for select using (
  id = auth.uid() or public.is_supervisor_of(id) or public.is_admin() or public.has_link(id)
);
drop policy if exists p_profiles_update on public.profiles;
create policy p_profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- supervisor_students
drop policy if exists p_links_select on public.supervisor_students;
create policy p_links_select on public.supervisor_students for select
  using (supervisor_id = auth.uid() or student_id = auth.uid() or public.is_admin());
drop policy if exists p_links_delete on public.supervisor_students;
create policy p_links_delete on public.supervisor_students for delete
  using (supervisor_id = auth.uid() or student_id = auth.uid() or public.is_admin());

-- progress: الطالب يكتب لنفسه، والمشرف يقرأ
drop policy if exists p_progress_select on public.progress;
create policy p_progress_select on public.progress for select
  using (student_id = auth.uid() or public.is_supervisor_of(student_id));
drop policy if exists p_progress_write on public.progress;
create policy p_progress_write on public.progress for insert with check (student_id = auth.uid());
drop policy if exists p_progress_delete on public.progress;
create policy p_progress_delete on public.progress for delete using (student_id = auth.uid());

-- quiz_attempts
drop policy if exists p_quiz_select on public.quiz_attempts;
create policy p_quiz_select on public.quiz_attempts for select
  using (student_id = auth.uid() or public.is_supervisor_of(student_id));
drop policy if exists p_quiz_insert on public.quiz_attempts;
create policy p_quiz_insert on public.quiz_attempts for insert with check (student_id = auth.uid());

-- evaluations: المشرف المرتبط فقط يكتب
drop policy if exists p_eval_select on public.evaluations;
create policy p_eval_select on public.evaluations for select
  using (student_id = auth.uid() or public.is_supervisor_of(student_id));
drop policy if exists p_eval_insert on public.evaluations;
create policy p_eval_insert on public.evaluations for insert
  with check (supervisor_id = auth.uid() and public.is_supervisor_of(student_id));
drop policy if exists p_eval_delete on public.evaluations;
create policy p_eval_delete on public.evaluations for delete using (supervisor_id = auth.uid());

-- memorization: الطالب يعلن، والمشرف يوثّق
drop policy if exists p_memo_select on public.memorization;
create policy p_memo_select on public.memorization for select
  using (student_id = auth.uid() or public.is_supervisor_of(student_id));
drop policy if exists p_memo_insert on public.memorization;
create policy p_memo_insert on public.memorization for insert
  with check ((student_id = auth.uid() and status <> 'verified') or public.is_supervisor_of(student_id));
drop policy if exists p_memo_update on public.memorization;
create policy p_memo_update on public.memorization for update
  using ((student_id = auth.uid() and status <> 'verified') or public.is_supervisor_of(student_id))
  with check ((student_id = auth.uid() and status <> 'verified') or public.is_supervisor_of(student_id));

-- quiz_questions: الجميع يقرأ، والمشرفون يكتبون
drop policy if exists p_q_select on public.quiz_questions;
create policy p_q_select on public.quiz_questions for select using (auth.uid() is not null);
drop policy if exists p_q_insert on public.quiz_questions;
create policy p_q_insert on public.quiz_questions for insert
  with check (public.my_role() in ('supervisor','admin'));
drop policy if exists p_q_delete on public.quiz_questions;
create policy p_q_delete on public.quiz_questions for delete
  using (created_by = auth.uid() or public.is_admin());

alter table public.messages       enable row level security;
alter table public.assignments    enable row level security;
alter table public.submissions    enable row level security;
alter table public.dawah_messages enable row level security;

-- messages: طرفا المحادثة فقط، وبعد الربط النشط
drop policy if exists p_msg_select on public.messages;
create policy p_msg_select on public.messages for select
  using (auth.uid() in (student_id, supervisor_id) or public.is_admin());
drop policy if exists p_msg_insert on public.messages;
create policy p_msg_insert on public.messages for insert
  with check (sender_id = auth.uid() and auth.uid() in (student_id, supervisor_id)
              and public.is_active_pair(student_id, supervisor_id));

-- assignments: يكتبها المشرف المرتبط، ويقرؤها الطالب
drop policy if exists p_asg_select on public.assignments;
create policy p_asg_select on public.assignments for select
  using (student_id = auth.uid() or supervisor_id = auth.uid() or public.is_admin());
drop policy if exists p_asg_insert on public.assignments;
create policy p_asg_insert on public.assignments for insert
  with check (supervisor_id = auth.uid() and public.is_supervisor_of(student_id));
drop policy if exists p_asg_delete on public.assignments;
create policy p_asg_delete on public.assignments for delete using (supervisor_id = auth.uid());

-- submissions: الطالب يجيب ويعدّل قبل التصحيح، والمشرف يقرأ ويصحّح عبر grade_submission
drop policy if exists p_sub_select on public.submissions;
create policy p_sub_select on public.submissions for select using (
  student_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.assignments a where a.id = assignment_id and a.supervisor_id = auth.uid()));
drop policy if exists p_sub_insert on public.submissions;
create policy p_sub_insert on public.submissions for insert with check (
  student_id = auth.uid() and score is null and graded_at is null
  and exists (select 1 from public.assignments a where a.id = assignment_id and a.student_id = auth.uid()));
drop policy if exists p_sub_update on public.submissions;
create policy p_sub_update on public.submissions for update
  using (student_id = auth.uid() and graded_at is null)
  with check (student_id = auth.uid() and score is null and graded_at is null);

-- dawah_messages: المعتمد للجميع (حتى الزائر)، والمسودات لكاتبها والمدير
drop policy if exists p_dm_select on public.dawah_messages;
create policy p_dm_select on public.dawah_messages for select
  using (status = 'approved' or author_id = auth.uid() or public.is_admin());
drop policy if exists p_dm_insert on public.dawah_messages;
create policy p_dm_insert on public.dawah_messages for insert
  with check (author_id = auth.uid() and status = 'draft' and public.my_role() in ('supervisor','admin'));
drop policy if exists p_dm_delete on public.dawah_messages;
create policy p_dm_delete on public.dawah_messages for delete using (author_id = auth.uid() or public.is_admin());

grant select on public.student_overview to authenticated;
grant select on public.dawah_messages to anon;

alter table public.media_links enable row level security;
drop policy if exists p_ml_select on public.media_links;
create policy p_ml_select on public.media_links for select
  using (status = 'approved' or author_id = auth.uid() or public.is_admin());
drop policy if exists p_ml_insert on public.media_links;
create policy p_ml_insert on public.media_links for insert
  with check (author_id = auth.uid() and status = 'draft' and public.my_role() in ('supervisor','admin'));
drop policy if exists p_ml_delete on public.media_links;
create policy p_ml_delete on public.media_links for delete using (author_id = auth.uid() or public.is_admin());
grant select on public.media_links to anon;

-- =====================================================================
--  بعد التشغيل: اجعل نفسك مديرًا (بدّل الإيميل بإيميلك بعد أن تسجّل في الموقع):
--  update public.profiles set role = 'admin' where email = 'you@example.com';
--  (شغّلها من SQL Editor؛ هناك تُنفَّذ بصلاحية المالك فلا يعترضها الحارس)
-- =====================================================================
