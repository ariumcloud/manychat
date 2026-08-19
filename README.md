# Fluxo — seu ManyChat de Instagram

Automação de Instagram DM: comentário vira DM, palavra-chave vira conversa, com
inbox ao vivo e construtor de fluxo visual.

- **Next.js 16** (App Router) + TypeScript + Tailwind 4
- **Supabase** (Postgres) — tabelas `mc_*` no schema `public` do projeto `Arium`
- **Meta Graph API** — Instagram Messaging + Comments webhook
- **React Flow** (`@xyflow/react`) para o construtor visual

---

## 1. Preencher o `.env.local`

Já existe um `.env.local` na raiz, copiado do `.env.example`. Preencha:

| Variável | Onde pegar |
| --- | --- |
| `SUPABASE_URL` | Supabase → projeto Arium → Project Settings → Data API → URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → projeto Arium → Project Settings → API Keys → `service_role` |
| `META_APP_ID` / `META_APP_SECRET` | developers.facebook.com → seu app → Configurações → Básico |
| `META_VERIFY_TOKEN` | **você inventa.** Qualquer string aleatória. Vai colar a mesma no Meta |
| `IG_ACCESS_TOKEN` | o token de longa duração da sua conta IG |
| `IG_USER_ID` | opcional — o app descobre sozinho |
| `DASHBOARD_PASSWORD` | senha pra entrar no painel |
| `AUTH_SECRET` | string longa e aleatória, pra assinar o cookie de sessão |

> **Nunca** cole o token em chat, issue, print ou commit. O `.gitignore` já
> bloqueia `.env*`. Se um token vazar, revogue no painel do Meta e gere outro.

Gerar segredos aleatórios:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. Rodar local

```bash
npm run dev
```

Abra http://localhost:3000, entre com a `DASHBOARD_PASSWORD` e vá em
**Configurações**. A tela mostra o que ainda falta, valida o token e diz a quem
ele pertence.

## 3. Publicar na Vercel

O webhook do Meta exige uma URL HTTPS pública — localhost não serve.

```bash
npx vercel
```

Depois, no painel da Vercel, copie **todas** as variáveis do `.env.local` para
Settings → Environment Variables e faça o redeploy.

## 4. Configurar o webhook no Meta

No app do Meta → **Webhooks** (ou Instagram → Configuração da API):

1. **Callback URL**: `https://SEU-DOMINIO.vercel.app/api/webhook/instagram`
   (a tela de Configurações mostra a URL exata, com botão de copiar)
2. **Verify Token**: exatamente o valor de `META_VERIFY_TOKEN`
3. Clique em verificar — o endpoint responde o `hub.challenge` sozinho
4. Assine os campos:
   - `messages` — DMs recebidas
   - `messaging_postbacks` — cliques em botão
   - `comments` — **necessário para comentário → DM**

### Permissões que o token precisa

- `instagram_business_basic`
- `instagram_business_manage_messages`
- `instagram_business_manage_comments`

(Nos apps com Facebook Login: `instagram_manage_messages`,
`instagram_manage_comments`, `pages_manage_metadata`, `pages_show_list`.)

Se as chamadas derem erro 400, troque `META_API_FLAVOR` entre `instagram` e
`facebook` no `.env` — são dois caminhos diferentes da mesma API.

## 5. Criar a primeira automação

**Automações → Nova automação**:

- Quando acontecer: *Comentário no post*
- Palavras-chave: `eu quero, quero, link`
- Post: qualquer post, ou um específico
- Mensagem da DM: o texto que a pessoa recebe
- Botão (opcional): rótulo + link
- Responder no comentário: variações, uma por linha (sorteadas a cada disparo)

Salvar já publica. Teste comentando de outra conta.

---

## Como funciona por dentro

```
Comentário no IG
      │
      ▼
POST /api/webhook/instagram        assinatura HMAC verificada
      │                            evento gravado em mc_webhook_events (dedupe)
      ▼
pickTrigger()                      casa palavra-chave (sem acento, sem caixa)
      │
      ▼
runFlow()                          percorre os nós do fluxo
      │
      ├─ 1ª mensagem: sendPrivateReply(comment_id)   ← não precisa de DM prévia
      │  a resposta traz recipient_id = IGSID da pessoa
      │
      └─ demais: sendText(igsid)
```

O `sendPrivateReply` é o pulo do gato: em vez de `recipient.id` ele usa
`recipient.comment_id`, e é o único jeito de mandar DM pra alguém que nunca te
escreveu. Só funciona **uma vez por comentário** e dentro de **7 dias**.

### Limites do Instagram que o app respeita

- **Janela de 24h**: depois de 24h sem mensagem da pessoa, não dá pra responder.
  O inbox mostra o status da janela e bloqueia o campo quando fecha.
- **Private reply**: uma por comentário, até 7 dias depois.
- **Quick replies**: máximo 13, título de até 20 caracteres.
- **Botões**: máximo 3 por card.
- **Delay em serverless**: máximo 8s por nó — a função morre junto com a
  resposta. Delays longos precisariam de fila (QStash, Inngest, cron).

### Tabelas (schema `public`, prefixo `mc_`)

`mc_accounts`, `mc_contacts`, `mc_tags`, `mc_contact_tags`, `mc_conversations`,
`mc_messages`, `mc_flows`, `mc_triggers`, `mc_flow_runs`, `mc_comment_events`,
`mc_webhook_events`, `mc_broadcasts`.

O prefixo existe porque o PostgREST só atende schemas que estejam na lista de
**Exposed schemas** do projeto — configuração de painel, não de migração. Um
schema `manychat` próprio quebrava com `Invalid schema: manychat`.

Segurança em duas camadas: RLS ligado em todas **sem policies**, e os grants
dados só ao `service_role` — `anon` e `authenticated` não têm nem permissão de
`SELECT`. O navegador não alcança essas tabelas em nenhuma hipótese.

## Depurar

- **Configurações** mostra se o token vive e a quem pertence, e renova o token de 60 dias mostrando as permissões.
- `mc_webhook_events` guarda todo evento cru recebido, com a coluna `error`.
- `mc_flow_runs` guarda cada execução: status, passos, erro.
- `mc_comment_events` mostra comentário a comentário se a DM saiu.

Se o Meta não entrega nada: confira se assinou o campo `comments`, se o app
saiu do modo de desenvolvimento, e se a conta IG é Business/Creator.
