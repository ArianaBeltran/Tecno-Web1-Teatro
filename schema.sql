create extension if not exists pgcrypto;

create table if not exists public.obras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  genero text not null,
  autor text,
  sinopsis text,
  created_at timestamptz not null default now()
);

create table if not exists public.funciones (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras(id) on delete cascade,
  clave text,
  fecha_hora timestamptz not null,
  created_at timestamptz not null default now(),
  unique (obra_id, fecha_hora)
);

create table if not exists public.butacas (
  id uuid primary key default gen_random_uuid(),
  funcion_id uuid not null references public.funciones(id) on delete cascade,
  fila text not null,
  numero integer not null check (numero between 1 and 12),
  zona text not null,
  precio numeric(10,2) not null check (precio >= 0),
  unique (funcion_id, fila, numero)
);

create table if not exists public.reservas (
  id uuid primary key default gen_random_uuid(),
  funcion_id uuid not null references public.funciones(id),
  codigo text not null unique,
  nombre text not null,
  total numeric(10,2) not null check (total >= 0),
  estado text not null default 'confirmada' check (estado in ('confirmada', 'cancelada')),
  created_at timestamptz not null default now()
);

create table if not exists public.reserva_butacas (
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  butaca_id uuid not null references public.butacas(id),
  primary key (reserva_id, butaca_id),
  unique (butaca_id)
);

alter table public.obras enable row level security;
alter table public.funciones enable row level security;
alter table public.butacas enable row level security;
alter table public.reservas enable row level security;
alter table public.reserva_butacas enable row level security;

drop policy if exists "Lectura publica de obras" on public.obras;
drop policy if exists "Lectura publica de funciones" on public.funciones;
drop policy if exists "Lectura publica de butacas" on public.butacas;
drop policy if exists "Lectura publica de reservas confirmadas" on public.reservas;
drop policy if exists "Lectura publica de asociaciones" on public.reserva_butacas;
drop policy if exists "Reserva publica" on public.reservas;
drop policy if exists "Reserva butacas publica" on public.reserva_butacas;
drop policy if exists "Cancelacion publica" on public.reservas;

create policy "Lectura publica de obras" on public.obras
  for select using (true);
create policy "Lectura publica de funciones" on public.funciones
  for select using (true);
create policy "Lectura publica de butacas" on public.butacas
  for select using (true);
create policy "Lectura publica de reservas confirmadas" on public.reservas
  for select using (estado = 'confirmada');
create policy "Lectura publica de asociaciones" on public.reserva_butacas
  for select using (true);
create policy "Reserva publica" on public.reservas
  for insert with check (estado = 'confirmada');
create policy "Reserva butacas publica" on public.reserva_butacas
  for insert with check (true);
create policy "Cancelacion publica" on public.reservas
  for update
  using (true)
  with check (estado = 'cancelada');

create or replace function public.cancelar_reserva(p_codigo text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actualizada integer;
begin
  update public.reservas
  set estado = 'cancelada'
  where codigo = p_codigo
    and estado = 'confirmada';

  get diagnostics v_actualizada = row_count;
  return v_actualizada = 1;
end;
$$;

grant execute on function public.cancelar_reserva(text) to anon, authenticated;

insert into public.obras (nombre, genero, autor) values
  ('La casa de Bernarda Alba', 'tragedia', 'Federico García Lorca'),
  ('Hamlet', 'tragedia', 'William Shakespeare'),
  ('Casa de muñecas', 'tragedia', 'Henrik Ibsen'),
  ('El avaro', 'comedia', 'Moliere')
on conflict (nombre) do nothing;

insert into public.funciones (obra_id, fecha_hora)
select o.id, f.fecha_hora
from public.obras o
cross join lateral (
  values
    ('La casa de Bernarda Alba'::text, '2026-11-13T19:30:00-04:00'::timestamptz),
    ('La casa de Bernarda Alba'::text, '2026-11-14T19:30:00-04:00'::timestamptz),
    ('La casa de Bernarda Alba'::text, '2026-11-15T18:00:00-04:00'::timestamptz),
    ('Hamlet'::text, '2026-11-20T20:00:00-04:00'::timestamptz),
    ('Hamlet'::text, '2026-11-21T20:00:00-04:00'::timestamptz),
    ('Hamlet'::text, '2026-11-22T18:00:00-04:00'::timestamptz),
    ('Casa de muñecas'::text, '2026-11-27T19:30:00-04:00'::timestamptz),
    ('Casa de muñecas'::text, '2026-11-28T19:30:00-04:00'::timestamptz),
    ('El avaro'::text, '2026-12-04T19:30:00-04:00'::timestamptz),
    ('El avaro'::text, '2026-12-05T19:30:00-04:00'::timestamptz),
    ('El avaro'::text, '2026-12-06T18:00:00-04:00'::timestamptz)
) as f(nombre, fecha_hora)
where o.nombre = f.nombre
on conflict (obra_id, fecha_hora) do nothing;

insert into public.butacas (funcion_id, fila, numero, zona, precio)
select f.id,
       fila.letra,
       numero.numero,
       case
         when fila.letra in ('A', 'B') then 'Platea VIP'
         when fila.letra in ('C', 'D', 'E', 'F') then 'Platea'
         else 'Balcón'
       end,
       case
         when fila.letra in ('A', 'B') then 80
         when fila.letra in ('C', 'D', 'E', 'F') then 60
         else 40
       end
from public.funciones f
cross join (values ('A'), ('B'), ('C'), ('D'), ('E'), ('F'), ('G'), ('H')) as fila(letra)
cross join generate_series(1, 12) as numero(numero)
on conflict (funcion_id, fila, numero) do nothing;

alter table public.funciones
  add column if not exists clave text;

update public.funciones f
set clave = o.nombre || '|' ||
  to_char(f.fecha_hora at time zone 'America/La_Paz',
    'YYYY-MM-DD"T"HH24:MI:00-04:00')
from public.obras o
where o.id = f.obra_id;

create unique index if not exists funciones_clave_unique
  on public.funciones(clave)
  where clave is not null;

create or replace function public.ocupar_butacas(
  p_funcion_id uuid,
  p_codigo text,
  p_nombre text,
  p_fila text,
  p_numero integer
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reserva_id uuid;
  v_butaca_id uuid;
  v_precio numeric(10,2);
  v_total numeric(10,2) := 0;
begin
  select id, precio into v_butaca_id, v_precio
  from public.butacas
  where funcion_id = p_funcion_id and fila = p_fila and numero = p_numero
  for update;

  if v_butaca_id is null then
    raise exception 'La butaca no existe';
  end if;

  if exists (
    select 1 from public.reserva_butacas rb
    join public.reservas r on r.id = rb.reserva_id
    where rb.butaca_id = v_butaca_id and r.estado = 'confirmada'
  ) then
    raise exception 'La butaca ya esta ocupada';
  end if;

  if not exists (select 1 from public.reservas where codigo = p_codigo) then
    v_total := v_precio;
    insert into public.reservas (funcion_id, codigo, nombre, total)
    values (p_funcion_id, p_codigo, p_nombre, v_total)
    returning id into v_reserva_id;
  else
    select id into v_reserva_id from public.reservas where codigo = p_codigo;
  end if;

  insert into public.reserva_butacas (reserva_id, butaca_id)
  values (v_reserva_id, v_butaca_id);

  update public.reservas
  set total = (
    select coalesce(sum(b.precio), 0)
    from public.reserva_butacas rb
    join public.butacas b on b.id = rb.butaca_id
    where rb.reserva_id = v_reserva_id
  )
  where id = v_reserva_id;

  return v_reserva_id;
end;
$$;

grant execute on function public.ocupar_butacas(uuid, text, text, text, integer) to anon, authenticated;

create or replace function public.resolver_funcion(
  p_obra text,
  p_fecha timestamptz
) returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select f.id
  from public.funciones f
  join public.obras o on o.id = f.obra_id
  where o.nombre = p_obra
    and (
      f.clave = p_obra || '|' || to_char(p_fecha at time zone 'America/La_Paz',
        'YYYY-MM-DD"T"HH24:MI:00-04:00')
      or date_trunc('minute', f.fecha_hora) = date_trunc('minute', p_fecha)
    )
  limit 1;
$$;

grant execute on function public.resolver_funcion(text, timestamptz) to anon, authenticated;
grant execute on function public.cancelar_reserva(text) to anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on table public.obras to anon, authenticated;
grant select on table public.funciones to anon, authenticated;
grant select on table public.butacas to anon, authenticated;
grant select, insert, update on table public.reservas to anon, authenticated;
grant select, insert on table public.reserva_butacas to anon, authenticated;

alter function public.ocupar_butacas(uuid, text, text, text, integer)
  security definer
  set search_path = public, pg_temp;
alter function public.resolver_funcion(text, timestamptz)
  security definer
  set search_path = public, pg_temp;
