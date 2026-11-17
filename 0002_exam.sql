create table if not exists students (
  id text primary key,
  full_name text not null,
  study_group text not null,
  name_key text not null,
  group_key text not null,
  created_at timestamptz not null default now(),
  telegram_sent boolean not null default false,
  unique (name_key, group_key)
);

create index if not exists students_group_idx on students (study_group);

create table if not exists student_sessions (
  token text primary key,
  student_id text not null references students (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists student_sessions_student_idx on student_sessions (student_id);

create table if not exists attempts (
  id text primary key,
  student_id text not null references students (id) on delete cascade,
  lecture_id integer not null check (lecture_id between 1 and 8),
  mode text not null check (mode in ('full', 'retry')),
  total integer not null check (total >= 0),
  correct integer not null check (correct >= 0),
  incorrect integer not null check (incorrect >= 0),
  percent integer not null check (percent between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists attempts_student_idx on attempts (student_id, created_at desc);
create index if not exists attempts_lecture_idx on attempts (student_id, lecture_id, created_at desc);

create table if not exists attempt_answers (
  attempt_id text not null references attempts (id) on delete cascade,
  question_id text not null,
  choice text not null,
  correct boolean not null,
  primary key (attempt_id, question_id)
);

create table if not exists admin_credentials (
  id integer primary key check (id = 1),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  token text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
