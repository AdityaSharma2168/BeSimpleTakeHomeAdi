-- Phase 7: submission attachments (DB + RLS)
--
-- 1) Create table to store attachment metadata & storage paths
-- 2) Enable permissive RLS (matches existing "take-home" approach)
--
-- Storage bucket setup is done in the Supabase UI:
-- - Create bucket: submission-attachments
-- - Decide public vs signed URL. This app assumes public read OR signed URLs can be created.

create table if not exists submission_attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null references submissions(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  storage_path text not null,
  created_at timestamptz default now()
);

create index if not exists idx_submission_attachments_submission_id
  on submission_attachments(submission_id);

alter table submission_attachments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'submission_attachments'
      and policyname = 'Allow all'
  ) then
    create policy "Allow all"
      on submission_attachments
      for all
      using (true)
      with check (true);
  end if;
end$$;

