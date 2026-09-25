-- avisos de pagamento já processados (chave de idempotência do provedor), para ignorar reenvios
create table public.webhook_events (
  idempotency_key text primary key,
  provider text not null,
  type text not null,
  email text,
  sandbox boolean not null default false,
  received_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;
create policy "admin: webhooks" on public.webhook_events for select using (public.is_admin());
