-- ============================================================
--  RUTAS DE APRENDIZAJE · Esquema completo (Supabase / Postgres)
--  ------------------------------------------------------------
--  Contenido jerárquico:  routes → units → subtopics → resources (+files)
--  Perfiles + roles, progreso, y RLS (público lee lo publicado; admin edita).
--
--  Ejecutar en:  Supabase Dashboard → SQL Editor → New query → Run.
--  Idempotente:  se puede correr varias veces sin riesgo.
--
--  Tras ejecutar: para darte rol admin, en el SQL Editor corre
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'TU_EMAIL');
-- ============================================================

-- ============================================================
--  0) EXTENSIONES
-- ============================================================
create extension if not exists pgcrypto;   -- gen_random_uuid() (redundante en PG13+, seguro)

-- ============================================================
--  1) PERFILES + ROLES
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role         text not null default 'student'
               check (role in ('student','editor','admin')),
  created_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil público de usuario. role controla quién edita contenido.';

-- Crear perfil automáticamente al registrarse (Supabase Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'student');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: ¿el usuario actual es editor/admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','editor')
  );
$$;

-- ============================================================
--  2) updated_at automático (reutilizable)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
--  3) RUTAS  (raíz del contenido)
-- ============================================================
create table if not exists public.routes (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,              -- 'java', 'algebra-lineal'
  title          text not null,
  subtitle       text,
  description    text,
  category       text,                              -- 'matematica'|'programacion'|'negocios'
  difficulty     text,                              -- 'basico'|'intermedio'|'avanzado'
  duration_hours int,
  weeks          int,
  cover_image    text,
  theme          jsonb not null default '{}'::jsonb,-- {accent,bg,ink,style} render brutalista
  status         text not null default 'draft'
                 check (status in ('draft','published','archived')),
  version        int not null default 1,
  author_id      uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  search         tsvector generated always as (
    to_tsvector('spanish',
      coalesce(title,'') || ' ' ||
      coalesce(subtitle,'') || ' ' ||
      coalesce(description,'') || ' ' ||
      coalesce(category,''))
  ) stored
);

drop trigger if exists routes_updated_at on public.routes;
create trigger routes_updated_at before update on public.routes
  for each row execute function public.set_updated_at();

create index if not exists routes_search_idx on public.routes using gin (search);
create index if not exists routes_status_idx    on public.routes (status);
create index if not exists routes_category_idx  on public.routes (category);

-- ============================================================
--  4) UNIDADES
-- ============================================================
create table if not exists public.units (
  id          uuid primary key default gen_random_uuid(),
  route_id    uuid not null references public.routes(id) on delete cascade,
  "order"     int  not null default 0,
  num         text,                                 -- '01','02'
  title       text not null,
  description text,
  weeks       text,                                 -- 'Semanas 1–4'
  hours       text,
  difficulty  text,
  extra       jsonb not null default '{}'::jsonb,   -- tabla de complejidad, etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (route_id, "order")
);

drop trigger if exists units_updated_at on public.units;
create trigger units_updated_at before update on public.units
  for each row execute function public.set_updated_at();

create index if not exists units_route_idx on public.units (route_id, "order");

-- ============================================================
--  5) SUBTEMAS
-- ============================================================
create table if not exists public.subtopics (
  id         uuid primary key default gen_random_uuid(),
  unit_id    uuid not null references public.units(id) on delete cascade,
  "order"    int  not null default 0,
  code       text,                                  -- '1.1'
  title      text not null,
  objective  text,
  depends_on uuid[] not null default '{}'::uuid[],  -- prerrequisitos (grafo)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, code)
);

drop trigger if exists subtopics_updated_at on public.subtopics;
create trigger subtopics_updated_at before update on public.subtopics
  for each row execute function public.set_updated_at();

create index if not exists subtopics_unit_idx on public.subtopics (unit_id, "order");

-- ============================================================
--  6) RECURSOS  (videos / libros / práctica / artículos / herramientas)
--     Reemplaza los arrays videos/biblio/practica embebidos en los HTML.
-- ============================================================
create table if not exists public.resources (
  id                uuid primary key default gen_random_uuid(),
  subtopic_id       uuid not null references public.subtopics(id) on delete cascade,
  "order"           int  not null default 0,
  kind              text not null
                    check (kind in ('video','book','practice','article','tool','file')),
  title             text not null,
  description       text,
  keywords          text[] not null default '{}',
  url               text,                           -- URL exacta verificada (si la hay)
  channel_or_author text,                           -- 'MoureDev' | 'Downey & Mayfield'
  search_query      text,                           -- query preconstruida (Capa A IA)
  search_engine     text check (search_engine in ('youtube','google','github','direct')),
  level             text check (level in ('basico','intermedio','avanzado')),
  language          text not null default 'es',
  verified          boolean not null default false,
  http_status       int,
  verified_at       timestamptz,
  upvotes           int not null default 0,
  downvotes         int not null default 0,
  metadata          jsonb not null default '{}'::jsonb,  -- {chapter,pages,duration,thumbnail}
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  search            tsvector generated always as (
    to_tsvector('spanish',
      coalesce(title,'') || ' ' ||
      coalesce(description,'') || ' ' ||
      coalesce(array_to_string(keywords,' '),'') || ' ' ||
      coalesce(channel_or_author,''))
  ) stored
);

drop trigger if exists resources_updated_at on public.resources;
create trigger resources_updated_at before update on public.resources
  for each row execute function public.set_updated_at();

create index if not exists resources_subtopic_idx on public.resources (subtopic_id, "order");
create index if not exists resources_search_idx   on public.resources using gin (search);
create index if not exists resources_kind_idx     on public.resources (kind);

-- ============================================================
--  7) ARCHIVOS ADJUNTOS  (Supabase Storage)
-- ============================================================
create table if not exists public.files (
  id            uuid primary key default gen_random_uuid(),
  subtopic_id   uuid references public.subtopics(id) on delete cascade,
  unit_id       uuid references public.units(id)     on delete cascade,
  storage_path  text not null,                       -- 'routes/java/u1/apuntes.pdf'
  filename      text not null,
  mime          text,
  size_bytes    bigint,
  uploaded_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  check (subtopic_id is not null or unit_id is not null)
);

create index if not exists files_subtopic_idx on public.files (subtopic_id);
create index if not exists files_unit_idx     on public.files (unit_id);

-- ============================================================
--  8) PROGRESO POR RUTA  (ya existía — se conserva)
-- ============================================================
create table if not exists public.route_progress (
  profile_id text not null,
  route      text not null,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (profile_id, route)
);

create index if not exists route_progress_profile_idx
  on public.route_progress (profile_id);

-- ============================================================
--  9) RLS  —  Público lee lo publicado; editor/admin escribe todo
--  ------------------------------------------------------------
--  El sitio sigue usando la anon key (lectura pública sin login).
--  La escritura exige sesión de un usuario con role editor/admin.
-- ============================================================

-- ---- perfiles: cada uno ve el suyo; admin ve todos ----
alter table public.profiles enable row level security;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- ---- routes: draft oculto al público ----
alter table public.routes enable row level security;
drop policy if exists routes_read   on public.routes;
drop policy if exists routes_insert on public.routes;
drop policy if exists routes_update on public.routes;
drop policy if exists routes_delete on public.routes;
create policy routes_read on public.routes
  for select using (status = 'published' or public.is_admin());
create policy routes_insert on public.routes
  for insert with check (public.is_admin());
create policy routes_update on public.routes
  for update using (public.is_admin()) with check (public.is_admin());
create policy routes_delete on public.routes
  for delete using (public.is_admin());

-- ---- units: visibles si su ruta está publicada ----
alter table public.units enable row level security;
drop policy if exists units_read  on public.units;
drop policy if exists units_write on public.units;
create policy units_read on public.units for select using (
  public.is_admin() or exists (
    select 1 from public.routes r
    where r.id = units.route_id and r.status = 'published'
  )
);
create policy units_write on public.units
  for insert with check (public.is_admin());
create policy units_update on public.units
  for update using (public.is_admin()) with check (public.is_admin());
create policy units_delete on public.units
  for delete using (public.is_admin());

-- ---- subtopics: visibles si su ruta está publicada ----
alter table public.subtopics enable row level security;
drop policy if exists subtopics_read  on public.subtopics;
drop policy if exists subtopics_write on public.subtopics;
create policy subtopics_read on public.subtopics for select using (
  public.is_admin() or exists (
    select 1 from public.units u
    join public.routes r on r.id = u.route_id
    where u.id = subtopics.unit_id and r.status = 'published'
  )
);
create policy subtopics_write on public.subtopics
  for insert with check (public.is_admin());
create policy subtopics_update on public.subtopics
  for update using (public.is_admin()) with check (public.is_admin());
create policy subtopics_delete on public.subtopics
  for delete using (public.is_admin());

-- ---- resources: visibles si su ruta está publicada ----
alter table public.resources enable row level security;
drop policy if exists resources_read  on public.resources;
drop policy if exists resources_write on public.resources;
create policy resources_read on public.resources for select using (
  public.is_admin() or exists (
    select 1 from public.subtopics st
    join public.units u on u.id = st.unit_id
    join public.routes r on r.id = u.route_id
    where st.id = resources.subtopic_id and r.status = 'published'
  )
);
create policy resources_write on public.resources
  for insert with check (public.is_admin());
create policy resources_update on public.resources
  for update using (public.is_admin()) with check (public.is_admin());
create policy resources_delete on public.resources
  for delete using (public.is_admin());

-- ---- files: visibles si su ruta (vía subtopic o unit) está publicada ----
alter table public.files enable row level security;
drop policy if exists files_read  on public.files;
drop policy if exists files_write on public.files;
create policy files_read on public.files for select using (
  public.is_admin()
  or exists (
    select 1 from public.subtopics st
    join public.units u on u.id = st.unit_id
    join public.routes r on r.id = u.route_id
    where st.id = files.subtopic_id and r.status = 'published'
  )
  or exists (
    select 1 from public.units u
    join public.routes r on r.id = u.route_id
    where u.id = files.unit_id and r.status = 'published'
  )
);
create policy files_write on public.files
  for insert with check (public.is_admin());
create policy files_update on public.files
  for update using (public.is_admin()) with check (public.is_admin());
create policy files_delete on public.files
  for delete using (public.is_admin());

-- ---- route_progress: lectura/escritura abierta por perfil anónimo ----
-- (se mantiene el modelo actual: profile_id = UUID compartible vía ?p=)
alter table public.route_progress enable row level security;
drop policy if exists "rp_read"   on public.route_progress;
drop policy if exists "rp_insert" on public.route_progress;
drop policy if exists "rp_update" on public.route_progress;
create policy "rp_read"   on public.route_progress for select using (true);
create policy "rp_insert" on public.route_progress for insert with check (true);
create policy "rp_update" on public.route_progress for update using (true);

-- ============================================================
--  10) DATOS SEMILLA  (opcional, útil para probar)
--  ------------------------------------------------------------
--  Descomenta para crear una ruta de ejemplo.  Borra con:
--    delete from public.routes where slug = 'demo';
-- ============================================================
-- insert into public.routes (slug, title, category, status, theme)
-- values ('demo', 'Ruta de ejemplo', 'programacion', 'published',
--         '{"accent":"#E76F00","bg":"#F0F0F0","ink":"#000"}')
-- on conflict (slug) do nothing;
