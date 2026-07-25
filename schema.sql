-- ============================================================
--  RUTAS DE APRENDIZAJE · Esquema de progreso en Supabase
--  ------------------------------------------------------------
--  Ejecutar en: Supabase Dashboard → SQL Editor → New query.
--  Es idempotente: se puede correr varias veces sin riesgo.
-- ============================================================

-- Tabla única: una fila por (perfil, ruta).
create table if not exists public.route_progress (
  profile_id text not null,
  route      text not null,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (profile_id, route)
);

comment on table public.route_progress is
  'Progreso de cada mapa de aprendizaje, identificado por perfil anónimo (UUID no adjudicable).';

-- Índice menor para consultas por perfil (dashboard futuro).
create index if not exists route_progress_profile_idx
  on public.route_progress (profile_id);

-- ============================================================
--  Row Level Security
--  ------------------------------------------------------------
--  El sitio es estático y usa la anon key (sin login server-side).
--  El "secreto" es el profile_id (UUID no adjudicable y compartible
--  sólo vía enlace ?p=<id>). Para una app más estricta, activa
--  Supabase Auth y reemplaza estas políticas por (auth.uid() = ...).
-- ============================================================
alter table public.route_progress enable row level security;

drop policy if exists "rp_read"   on public.route_progress;
drop policy if exists "rp_write"  on public.route_progress;
drop policy if exists "rp_insert" on public.route_progress;
drop policy if exists "rp_update" on public.route_progress;

-- Lectura abierta (los profile_id son UUIDs no adjudicables).
create policy "rp_read" on public.route_progress
  for select using (true);

-- Inserción de filas propias.
create policy "rp_insert" on public.route_progress
  for insert with check (true);

-- Actualización de filas propias.
create policy "rp_update" on public.route_progress
  for update using (true);
