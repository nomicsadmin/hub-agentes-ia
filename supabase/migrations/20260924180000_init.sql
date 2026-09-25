-- ─────────────────────────────────────────────────────────
-- Hub de Agentes · esquema inicial
-- Ver docs/00-visao-geral.md. Toda tabela tem RLS: cada pessoa só vê o
-- que é dela; agentes, documentos e métricas só o admin.
-- O servidor usa a service role para o que o usuário não pode
-- ler direto (prompt, documentos, classificação).
-- ─────────────────────────────────────────────────────────

create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ── Perfis e acesso ───────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  status text not null default 'active' check (status in ('active', 'blocked')),
  last_seen_at timestamptz,
  access_count integer not null default 0,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (lower(email));

-- vínculo com a compra (provedor de pagamento: hubla, kiwify... ou "manual")
create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  email text not null,
  provider text not null default 'manual',
  external_id text,
  product_id text,
  status text not null check (status in ('active', 'refunded', 'canceled', 'chargeback', 'manual')),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);
create index entitlements_email_idx on public.entitlements (lower(email));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

-- cria o perfil quando o usuário nasce no Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- o usuário não pode mudar o próprio papel nem o próprio status
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.email := old.email;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ── Agentes e base de conhecimento ────────────────────────

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default 'robot',
  starters jsonb not null default '[]'::jsonb,
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.agent_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  content text not null,
  note text,
  is_current boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index agent_prompt_current_idx on public.agent_prompt_versions (agent_id) where is_current;

create table public.agent_corrections (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  content text not null,
  is_active boolean not null default true,
  source_message_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text,
  mime text,
  status text not null default 'processing' check (status in ('processing', 'ready', 'error')),
  content text,
  token_estimate integer not null default 0,
  error text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- um documento pode servir a mais de um agente (com prioridades diferentes)
create table public.agent_documents (
  agent_id uuid not null references public.agents (id) on delete cascade,
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  priority integer not null default 0, -- maior vence em conflito
  primary key (agent_id, document_id)
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(1536)
);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- busca por similaridade, usada só quando a base passa de ~80 mil tokens
create or replace function public.match_chunks(
  p_agent_id uuid,
  p_embedding extensions.vector(1536),
  p_count integer default 8
)
returns table (id uuid, document_id uuid, content text, similarity double precision)
language sql
stable
set search_path = ''
as $$
  select c.id, c.document_id, c.content,
         1 - (c.embedding operator(extensions.<=>) p_embedding) as similarity
  from public.knowledge_chunks c
  join public.agent_documents ad on ad.document_id = c.document_id
  where ad.agent_id = p_agent_id and c.embedding is not null
  order by c.embedding operator(extensions.<=>) p_embedding
  limit p_count;
$$;

-- ── Espaço do usuário ─────────────────────────────────────

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  agent_id uuid not null references public.agents (id),
  title text not null default 'Nova conversa',
  folder_id uuid references public.folders (id) on delete set null,
  pinned boolean not null default false,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('portuguese', coalesce(title, ''))) stored
);
create index conversations_user_idx on public.conversations (user_id, updated_at desc);
create index conversations_fts_idx on public.conversations using gin (fts);

create table public.conversation_tags (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (conversation_id, tag_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  status text not null default 'complete' check (status in ('streaming', 'complete', 'stopped', 'error')),
  feedback smallint check (feedback in (-1, 1)),
  model text,
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('portuguese', coalesce(content, ''))) stored
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_fts_idx on public.messages using gin (fts);

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('audio', 'image', 'pdf', 'generated_pdf')),
  storage_path text not null,
  mime text not null,
  size_bytes integer not null default 0,
  title text,
  transcript text,
  created_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(transcript, ''))) stored
);
create index message_attachments_message_idx on public.message_attachments (message_id);
create index message_attachments_fts_idx on public.message_attachments using gin (fts);

-- ── Métricas e temas ──────────────────────────────────────

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('login', 'open_app', 'message', 'audio', 'attachment', 'pdf')),
  meta jsonb,
  created_at timestamptz not null default now()
);
create index usage_events_user_idx on public.usage_events (user_id, created_at desc);
create index usage_events_kind_idx on public.usage_events (kind, created_at desc);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort integer not null default 0,
  is_active boolean not null default true
);

create table public.message_insights (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  agent_id uuid not null references public.agents (id) on delete cascade,
  topic text not null,
  subtopic text,
  difficulty_signal integer not null default 0,
  is_gap boolean not null default false,
  question_summary text,
  created_at timestamptz not null default now()
);
create index message_insights_topic_idx on public.message_insights (topic, created_at desc);
create index message_insights_user_idx on public.message_insights (user_id, created_at desc);

create view public.user_topic_stats
with (security_invoker = true)
as
select
  user_id,
  agent_id,
  topic,
  count(*) as questions,
  sum(difficulty_signal) as difficulty,
  count(*) filter (where is_gap) as gaps,
  max(created_at) as last_asked_at
from public.message_insights
group by user_id, agent_id, topic;

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.entitlements enable row level security;
alter table public.agents enable row level security;
alter table public.agent_prompt_versions enable row level security;
alter table public.agent_corrections enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.agent_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.folders enable row level security;
alter table public.tags enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_tags enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.usage_events enable row level security;
alter table public.topics enable row level security;
alter table public.message_insights enable row level security;
alter table public.app_settings enable row level security;

-- perfis
create policy "perfil: ler o próprio" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "perfil: editar o próprio" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- só admin
create policy "admin: entitlements" on public.entitlements for all using (public.is_admin()) with check (public.is_admin());
create policy "admin: prompts" on public.agent_prompt_versions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin: correções" on public.agent_corrections for all using (public.is_admin()) with check (public.is_admin());
create policy "admin: documentos" on public.knowledge_documents for all using (public.is_admin()) with check (public.is_admin());
create policy "admin: documentos do agente" on public.agent_documents for all using (public.is_admin()) with check (public.is_admin());
create policy "admin: trechos" on public.knowledge_chunks for all using (public.is_admin()) with check (public.is_admin());
create policy "admin: temas" on public.topics for all using (public.is_admin()) with check (public.is_admin());
create policy "admin: insights" on public.message_insights for all using (public.is_admin()) with check (public.is_admin());
create policy "admin: configurações" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- agentes: todo usuário ativo vê a galeria; só admin edita
create policy "agentes: ler" on public.agents for select using (public.is_active_user() and (is_active or public.is_admin()));
create policy "agentes: admin edita" on public.agents for all using (public.is_admin()) with check (public.is_admin());

-- espaço do usuário: dono e com acesso ativo
create policy "pastas: dono" on public.folders for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());
create policy "tags: dono" on public.tags for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());
create policy "conversas: dono" on public.conversations for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());
create policy "tags da conversa: dono" on public.conversation_tags for all
  using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()) and public.is_active_user())
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()) and public.is_active_user());
create policy "mensagens: dono lê" on public.messages for select
  using (user_id = auth.uid() and public.is_active_user());
create policy "mensagens: dono avalia" on public.messages for update
  using (user_id = auth.uid() and public.is_active_user());
create policy "anexos: dono lê" on public.message_attachments for select
  using (user_id = auth.uid() and public.is_active_user());

-- eventos: o usuário registra os próprios; admin lê todos
create policy "eventos: registrar" on public.usage_events for insert with check (user_id = auth.uid());
create policy "eventos: admin lê" on public.usage_events for select using (public.is_admin());

-- ── Storage ───────────────────────────────────────────────
-- chat-uploads/{user_id}/...  áudios e anexos do usuário
-- generated/{user_id}/...     PDFs gerados pelo agente
-- knowledge/...               documentos dos agentes (admin)

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('chat-uploads', 'chat-uploads', false, 20971520),
  ('generated', 'generated', false, 20971520),
  ('knowledge', 'knowledge', false, 52428800)
on conflict (id) do nothing;

create policy "uploads: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-uploads' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active_user());
create policy "uploads: dono lê" on storage.objects for select to authenticated
  using (bucket_id in ('chat-uploads', 'generated') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "conhecimento: admin" on storage.objects for all to authenticated
  using (bucket_id = 'knowledge' and public.is_admin())
  with check (bucket_id = 'knowledge' and public.is_admin());

-- ── Dados iniciais ────────────────────────────────────────

-- Agentes, prompts e documentos entram por `npm run agentes:sync` (pasta agentes/).
-- Os temas de "Temas e dificuldades" vêm de agentes/_topicos.json; "Outros" garante
-- que a classificação funcione desde o primeiro minuto.
insert into public.topics (name, sort) values ('Outros', 99);

insert into public.app_settings (key, value) values
  ('daily_limits', '{"messages": 150, "audio": 20, "attachments": 20, "pdfs": 15}'::jsonb),
  ('trash_retention_days', '30'::jsonb);
