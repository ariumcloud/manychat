-- Catalogo reaproveitavel do no "Carrossel". O no guarda so a lista ordenada
-- de ids; o mesmo item pode aparecer em varios fluxos.
--
-- O botao "flow" nao guarda destino aqui: o destino e uma saida (handle) do
-- no, porque o mesmo item leva a lugares diferentes em fluxos diferentes.
--
-- Limites do generic template do Instagram: title e subtitle ate 80
-- caracteres, rotulo de botao ate 20.

create table public.mc_catalog_items (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.mc_accounts(id) on delete cascade,
  image_url text not null,
  title text not null check (char_length(title) between 1 and 80),
  subtitle text check (char_length(subtitle) <= 80),
  button_label text not null check (char_length(button_label) between 1 and 20),
  button_action text not null check (button_action in ('url', 'flow')),
  button_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mc_catalog_items_url_required
    check (button_action <> 'url' or coalesce(button_url, '') <> '')
);

create index mc_catalog_items_account_id_idx on public.mc_catalog_items (account_id);

-- Mesmo padrao das outras mc_*: RLS ligado sem policies, e so o service_role
-- enxerga a tabela. O navegador nunca fala direto com ela.
alter table public.mc_catalog_items enable row level security;
revoke all on public.mc_catalog_items from anon, authenticated;
grant all on public.mc_catalog_items to service_role;

-- Imagens dos cards. Publico porque e o Instagram quem baixa a imagem pela
-- URL; o upload so acontece pelo servidor, com service_role.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mc-catalog', 'mc-catalog', true, 8388608, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;
