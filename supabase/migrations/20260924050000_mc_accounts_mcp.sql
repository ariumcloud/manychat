-- Chave do conector MCP (api/mcp/<chave>). So o hash sha256 fica aqui: quem
-- le a tabela nao consegue montar a URL. Gerada/trocada por quem administra.
alter table public.mc_accounts add column if not exists mcp_secret_hash text;
