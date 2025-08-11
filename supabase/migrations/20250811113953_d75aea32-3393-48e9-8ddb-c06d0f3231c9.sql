
-- 1) Skapa bucket "documents" (offentlig läsning). Körs bara om den inte redan finns.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- 2) RLS-policys för storage.objects i bucket "documents"

-- Tillåt offentlig läsning (GET/SELECT) av filer i documents-bucket
create policy if not exists "Public read for documents"
on storage.objects for select
using (bucket_id = 'documents');

-- Tillåt autentiserade användare att ladda upp till documents-bucket
create policy if not exists "Authenticated can upload to documents"
on storage.objects for insert
with check (bucket_id = 'documents' and auth.role() = 'authenticated');

-- Tillåt ägare eller admin att uppdatera objekt i documents-bucket
create policy if not exists "Owners or admins can update documents objects"
on storage.objects for update
using (
  bucket_id = 'documents'
  and (owner = auth.uid() or has_role(auth.uid(), 'admin'))
)
with check (
  bucket_id = 'documents'
  and (owner = auth.uid() or has_role(auth.uid(), 'admin'))
);

-- Tillåt ägare eller admin att ta bort objekt i documents-bucket
create policy if not exists "Owners or admins can delete documents objects"
on storage.objects for delete
using (
  bucket_id = 'documents'
  and (owner = auth.uid() or has_role(auth.uid(), 'admin'))
);
