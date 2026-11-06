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
create table if not exists public.supervisor_students (
  supervisor_id uuid not null references public.profiles(id) on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (supervisor_id, student_id)
);

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
                 where supervisor_id = auth.uid() and student_id = p_student)
         or public.is_admin()
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

-- الطالب يرتبط بمشرفه عبر رمز المشرف
create or replace function public.link_with_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare sup uuid;
begin
  select id into sup from public.profiles
   where supervisor_code = upper(trim(p_code)) and role in ('supervisor','admin');
  if sup is null then return 'not_found'; end if;
  insert into public.supervisor_students(supervisor_id, student_id)
  values (sup, auth.uid()) on conflict do nothing;
  return 'ok';
end $$;

-- المشرف يضيف طالبًا بإيميله (يجب أن يكون الطالب قد سجّل)
create or replace function public.link_student_by_email(p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare st uuid;
begin
  if public.my_role() not in ('supervisor','admin') then return 'forbidden'; end if;
  select id into st from public.profiles where lower(email) = lower(trim(p_email));
  if st is null then return 'not_found'; end if;
  insert into public.supervisor_students(supervisor_id, student_id)
  values (auth.uid(), st) on conflict do nothing;
  return 'ok';
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
       (select count(*) from public.progress pr where pr.student_id = p.id)                 as done_items,
       (select max(completed_at) from public.progress pr where pr.student_id = p.id)        as last_activity,
       (select round(avg(best)) from (select max(score) best from public.quiz_attempts q
                                       where q.student_id = p.id group by stage_id) b)     as avg_quiz,
       (select round(avg(score)) from public.evaluations e where e.student_id = p.id)      as avg_eval,
       (select count(*) from public.memorization m where m.student_id = p.id and m.kind='surah'
                                                    and m.status in ('memorized','verified')) as surahs_memorized
from public.profiles p
where p.role = 'student';

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
  id = auth.uid() or public.is_supervisor_of(id) or public.is_admin()
  or exists (select 1 from public.supervisor_students s where s.student_id = auth.uid() and s.supervisor_id = profiles.id)
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

grant select on public.student_overview to authenticated;

-- =====================================================================
--  بعد التشغيل: اجعل نفسك مديرًا (بدّل الإيميل بإيميلك بعد أن تسجّل في الموقع):
--  update public.profiles set role = 'admin' where email = 'you@example.com';
--  (شغّلها من SQL Editor؛ هناك تُنفَّذ بصلاحية المالك فلا يعترضها الحارس)
-- =====================================================================
