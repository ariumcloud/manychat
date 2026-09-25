-- Cobranca por assinatura (Stripe) e contagem de mensagens por mes.
--
-- Conta sem plano (plan is null) nunca assinou: fica fora da cobranca e do
-- limite. E o caso da conta do dono e das contas anteriores a Stripe.
alter table public.mc_accounts
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan text check (plan in ('essencial', 'pro', 'ilimitado')),
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz;

create unique index if not exists mc_accounts_stripe_customer_key
  on public.mc_accounts (stripe_customer_id)
  where stripe_customer_id is not null;

-- Mensagens que a automacao enviou, por conta e por mes ("YYYY-MM", horario de
-- Brasilia). Uma linha por conta/mes: o limite do plano le uma linha so.
create table if not exists public.mc_usage (
  account_id uuid not null references public.mc_accounts (id) on delete cascade,
  period text not null,
  messages integer not null default 0,
  primary key (account_id, period)
);

-- Soma 1 de forma atomica (duas mensagens ao mesmo tempo nao perdem contagem).
create or replace function public.mc_bump_usage(p_account uuid, p_period text)
returns integer
language sql
as $$
  insert into public.mc_usage (account_id, period, messages)
  values (p_account, p_period, 1)
  on conflict (account_id, period)
  do update set messages = public.mc_usage.messages + 1
  returning messages;
$$;

-- Mesma regra das outras tabelas mc_*: so o service_role acessa.
alter table public.mc_usage enable row level security;
revoke all on public.mc_usage from anon, authenticated;
grant all on public.mc_usage to service_role;
revoke all on function public.mc_bump_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.mc_bump_usage(uuid, text) to service_role;
