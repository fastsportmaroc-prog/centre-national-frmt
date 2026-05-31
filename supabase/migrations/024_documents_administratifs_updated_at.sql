-- Trigger updated_at pour documents_administratifs

create or replace function public.set_documents_administratifs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_documents_administratifs_updated_at on public.documents_administratifs;
create trigger trg_documents_administratifs_updated_at
  before update on public.documents_administratifs
  for each row execute function public.set_documents_administratifs_updated_at();
