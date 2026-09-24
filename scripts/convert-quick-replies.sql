-- Converte os nós "quickReplies" antigos em "buttons" (botão fixo), com os
-- mesmos rótulos e payloads. Máximo de 3 botões por card.
--
-- RODE SÓ DEPOIS DO DEPLOY do commit que trocou quick reply por botão fixo:
-- o código antigo manda nó "buttons" numa segunda mensagem após o
-- comentário, que o Instagram recusa.
update mc_flows f
set nodes = (
  select jsonb_agg(
    case when n->>'type' = 'quickReplies' then
      jsonb_set(n, '{type}', '"buttons"')
      || jsonb_build_object('data',
           (n->'data') - 'options'
           || jsonb_build_object('buttons', (
                select coalesce(jsonb_agg(jsonb_build_object(
                  'kind', 'reply', 'label', o->>'label', 'payload', o->>'payload') order by i), '[]'::jsonb)
                from jsonb_array_elements(coalesce(n->'data'->'options', '[]'::jsonb)) with ordinality x(o, i)
                where i <= 3)))
    else n end
    order by ord)
  from jsonb_array_elements(f.nodes) with ordinality t(n, ord)
),
updated_at = now()
where f.nodes @> '[{"type":"quickReplies"}]';
