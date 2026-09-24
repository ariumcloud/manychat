-- Token do Instagram renovado pelo proprio app. Antes ele so existia em
-- IG_ACCESS_TOKEN na Vercel e a renovacao exigia colar o token novo a mao; se
-- ninguem lembrasse, em 60 dias todas as automacoes paravam.
--
-- O app usa ig_access_token quando existe e cai para IG_ACCESS_TOKEN quando
-- nao. mc_accounts so e acessivel pelo service_role (ver
-- 20260924030000_mc_lockdown_and_carousel_bucket.sql).
alter table public.mc_accounts
  add column if not exists ig_access_token text,
  add column if not exists ig_token_expires_at timestamptz,
  add column if not exists ig_token_refreshed_at timestamptz;
