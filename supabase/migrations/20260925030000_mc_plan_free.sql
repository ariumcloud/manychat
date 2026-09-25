-- Plano gratuito (500 mensagens/mes, sem assinatura). Contas novas caem nele.
alter table public.mc_accounts drop constraint if exists mc_accounts_plan_check;
alter table public.mc_accounts
  add constraint mc_accounts_plan_check check (plan in ('free', 'essencial', 'pro', 'ilimitado'));
