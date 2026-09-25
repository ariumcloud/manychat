-- Login proprio por conta (cliente com painel dele) e conexao via OAuth do
-- Instagram. O dono continua entrando com DASHBOARD_PASSWORD; cada cliente
-- entra com login + senha e so enxerga os dados da propria conta.
--
-- password_hash guarda scrypt (ver src/lib/password.ts). mc_accounts so e
-- acessivel pelo service_role (ver 20260924030000_mc_lockdown_and_carousel_bucket.sql).
alter table public.mc_accounts
  add column if not exists login text,
  add column if not exists password_hash text;

create unique index if not exists mc_accounts_login_key
  on public.mc_accounts (lower(login))
  where login is not null;
