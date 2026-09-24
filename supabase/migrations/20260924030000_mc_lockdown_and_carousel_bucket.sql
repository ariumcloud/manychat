-- 1) Segunda camada de seguranca das tabelas mc_*.
--
-- O README promete RLS sem policies E grants so para o service_role. Na
-- pratica as tabelas foram criadas com os default privileges do projeto, que
-- dao tudo para anon e authenticated. O RLS barra o acesso pela API, mas
-- TRUNCATE nao passa por RLS e a segunda camada simplesmente nao existia.
-- O app so usa o service_role (src/lib/supabase.ts), entao nada quebra.
--
-- Os default privileges do schema public ficam como estao: o projeto e
-- compartilhado com outros produtos. Toda tabela mc_* nova precisa repetir
-- este revoke/grant na propria migration.
do $$
declare
  t text;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relname like 'mc\_%'
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- 2) Bucket das imagens da tela Carrosseis. O codigo sempre usou
-- "mc-carousel" (upload de print e publish), mas o bucket nunca foi criado
-- neste projeto — todo upload falhava. Publico porque e o Instagram quem baixa
-- as imagens na hora de publicar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mc-carousel', 'mc-carousel', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
