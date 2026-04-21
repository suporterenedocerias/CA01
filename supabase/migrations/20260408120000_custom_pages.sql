-- Tabela de páginas personalizadas com domínio próprio
create table if not exists public.custom_pages (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  subtitle      text,
  body          text,
  cta_label     text,
  cta_url       text,
  seo_title     text,
  seo_description text,
  custom_domain text,            -- ex: "cacambasp.com.br" (sem https://)
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Índice para busca rápida por domínio (usada no DomainGate)
create index if not exists custom_pages_domain_idx on public.custom_pages (custom_domain)
  where custom_domain is not null;

alter table public.custom_pages enable row level security;

-- Leitura pública (visitantes do site)
create policy "custom_pages: leitura pública de páginas ativas"
  on public.custom_pages for select
  using (active = true);

-- Escrita apenas via service role (HashAdmin)
create policy "custom_pages: service role full access"
  on public.custom_pages for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
