-- @ que o cliente informou no cadastro, para o dono liberar como testador enquanto o app da Meta esta em desenvolvimento.
alter table public.mc_accounts add column if not exists ig_requested text;
