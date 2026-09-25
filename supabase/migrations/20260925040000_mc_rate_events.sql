-- Freio de cadastro que sobrevive entre instancias serverless: uma linha por
-- tentativa, contada por chave (ex.: signup:<hash do IP>) numa janela de tempo.
create table if not exists public.mc_rate_events (
  id bigint generated always as identity primary key,
  key text not null,
  at timestamptz not null default now()
);
create index if not exists mc_rate_events_key_at_idx on public.mc_rate_events (key, at desc);
alter table public.mc_rate_events enable row level security;
