create extension if not exists pgcrypto;

create table if not exists public.survey_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  area text,
  budget text,
  purpose text,
  note text,
  source_page text default 'survey.html',
  status text not null default 'new',
  assigned_to text,
  admin_note text,
  tags text[] default '{}',
  raw_payload jsonb default '{}'::jsonb
);

alter table public.survey_leads add column if not exists admin_note text;

create index if not exists survey_leads_created_at_idx on public.survey_leads (created_at desc);
create index if not exists survey_leads_status_idx on public.survey_leads (status);
create index if not exists survey_leads_area_idx on public.survey_leads (area);
create index if not exists survey_leads_phone_idx on public.survey_leads (phone);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

DROP TRIGGER IF EXISTS trg_survey_leads_updated_at ON public.survey_leads;
create trigger trg_survey_leads_updated_at
before update on public.survey_leads
for each row execute function public.set_updated_at();
