-- SYNCIFY Cloud v1. Run this complete file in Supabase SQL Editor.
-- No secret keys are needed in the browser.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table if not exists public.app_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','staff')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create or replace function private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.app_members where user_id=auth.uid() and active);
$$;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.app_members where user_id=auth.uid() and active and role='admin');
$$;
revoke all on function private.is_member(), private.is_admin() from public;
grant execute on function private.is_member(), private.is_admin() to authenticated;

create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code=upper(btrim(code)) and code ~ '^[A-Z0-9][A-Z0-9._/-]{0,59}$'),
 name text not null check(length(btrim(name)) between 1 and 300),
 category text not null default '', description text not null default '',
 unit text not null default 'piece',
 unit_price numeric(14,2) not null check(unit_price>=0 and unit_price<=1000000000),
 currency text not null default 'EGP' check(currency in ('EGP','USD','EUR')),
 active boolean not null default true, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create sequence if not exists public.quotation_number_seq;
create table if not exists public.quotations (
 id uuid primary key default gen_random_uuid(),
 quotation_number text not null unique default ('SYN-'||extract(year from current_date)::text||'-'||lpad(nextval('public.quotation_number_seq')::text,6,'0')),
 owner_id uuid not null references auth.users(id),
 details jsonb not null default '{}',
 status text not null default 'draft' check(status in ('draft','finalized')),
 currency text not null check(currency in ('EGP','USD','EUR')),
 discount_type text not null check(discount_type in ('none','percent','fixed')),
 discount_value numeric(16,2) not null default 0 check(discount_value>=0),
 subtotal numeric(18,2) not null default 0,
 optional_total numeric(18,2) not null default 0,
 discount_amount numeric(18,2) not null default 0,
 total numeric(18,2) not null default 0,
 version integer not null default 1,
 source_import_key text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(owner_id,source_import_key)
);
create table if not exists public.quotation_sections (
 id uuid primary key default gen_random_uuid(),
 quotation_id uuid not null references public.quotations(id) on delete cascade,
 name text not null, optional boolean not null default false, position integer not null
);
create table if not exists public.quotation_items (
 id uuid primary key default gen_random_uuid(),
 section_id uuid not null references public.quotation_sections(id) on delete cascade,
 product_id uuid references public.products(id) on delete restrict,
 product_code_snapshot text not null default '', product_name_snapshot text not null,
 category_snapshot text not null default '', description_snapshot text not null default '',
 unit_snapshot text not null default 'piece', catalog_price_snapshot numeric(14,2),
 quoted_unit_price numeric(14,2) not null check(quoted_unit_price>=0),
 quantity numeric(12,3) not null check(quantity>0),
 line_total numeric(18,2) not null, position integer not null
);
create index if not exists sections_quote_idx on public.quotation_sections(quotation_id);
create index if not exists items_section_idx on public.quotation_items(section_id);
create index if not exists quotes_owner_idx on public.quotations(owner_id);

alter table public.app_members enable row level security;
alter table public.products enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_sections enable row level security;
alter table public.quotation_items enable row level security;
revoke all on public.app_members,public.products,public.quotations,public.quotation_sections,public.quotation_items from anon,authenticated;
grant select on public.app_members,public.products,public.quotations,public.quotation_sections,public.quotation_items to authenticated;
revoke all on sequence public.quotation_number_seq from anon,authenticated;

drop policy if exists member_read on public.app_members;
create policy member_read on public.app_members for select to authenticated using(user_id=auth.uid() or private.is_admin());
drop policy if exists products_read on public.products;
create policy products_read on public.products for select to authenticated using(private.is_member() and (active or private.is_admin()));
drop policy if exists quotes_read on public.quotations;
create policy quotes_read on public.quotations for select to authenticated using(private.is_member() and (owner_id=auth.uid() or private.is_admin()));
drop policy if exists sections_read on public.quotation_sections;
create policy sections_read on public.quotation_sections for select to authenticated using(exists(select 1 from public.quotations q where q.id=quotation_id));
drop policy if exists items_read on public.quotation_items;
create policy items_read on public.quotation_items for select to authenticated using(exists(select 1 from public.quotation_sections s where s.id=section_id));

create or replace function public.save_product(p_data jsonb,p_id uuid default null,p_expected_version integer default null)
returns public.products language plpgsql security definer set search_path='' as $$
declare r public.products; v_code text; v_price numeric;
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 v_code:=upper(btrim(p_data->>'code'));
 if coalesce(v_code,'')='' or coalesce(btrim(p_data->>'name'),'')='' then raise exception 'Code and name are required'; end if;
 if jsonb_typeof(p_data->'unit_price') is distinct from 'number' then raise exception 'Price must be a number'; end if;
 v_price:=(p_data->>'unit_price')::numeric;
 if v_price<0 or v_price>1000000000 or v_price<>round(v_price,2) then raise exception 'Invalid price; use up to two decimal places'; end if;
 if p_id is null then
  insert into public.products(code,name,category,description,unit,unit_price,currency,active)
  values(v_code,btrim(p_data->>'name'),coalesce(p_data->>'category',''),coalesce(p_data->>'description',''),coalesce(nullif(p_data->>'unit',''),'piece'),v_price,coalesce(p_data->>'currency','EGP'),coalesce((p_data->>'active')::boolean,true)) returning * into r;
 else
  select * into r from public.products where id=p_id for update;
  if not found then raise exception 'Product not found'; end if;
  if p_expected_version is distinct from r.version then raise exception 'CONFLICT: this product changed. Reload before saving.' using errcode='40001'; end if;
  if coalesce(p_data->>'currency','EGP')<>r.currency and exists(select 1 from public.quotation_items where product_id=p_id) then raise exception 'Currency cannot change after a product is used. Create a separate product code for the new currency.'; end if;
  update public.products set code=v_code,name=btrim(p_data->>'name'),category=coalesce(p_data->>'category',''),description=coalesce(p_data->>'description',''),unit=coalesce(nullif(p_data->>'unit',''),'piece'),unit_price=v_price,currency=coalesce(p_data->>'currency','EGP'),active=coalesce((p_data->>'active')::boolean,true),version=version+1,updated_at=now() where id=p_id returning * into r;
 end if;
 return r;
end;$$;

create or replace function private.quote_document(p_id uuid) returns jsonb language sql stable set search_path='' as $$
 select q.details || jsonb_build_object(
 'id',q.id,'quoteNumber',q.quotation_number,'ownerId',q.owner_id,'status',q.status,'version',q.version,'currency',q.currency,'discountType',q.discount_type,'discountValue',q.discount_value,'sourceImportKey',q.source_import_key,
 'serverTotals',jsonb_build_object('base',q.subtotal,'optional',q.optional_total,'discount',q.discount_amount,'grand',q.total),
 'sections',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'optional',s.optional,'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id,'code',i.product_code_snapshot,'name',i.product_name_snapshot,'category',i.category_snapshot,'note',i.description_snapshot,'unit',i.unit_snapshot,'catalogPrice',i.catalog_price_snapshot,'price',i.quoted_unit_price,'qty',i.quantity) order by i.position) from public.quotation_items i where i.section_id=s.id),'[]'::jsonb)) order by s.position) from public.quotation_sections s where s.quotation_id=q.id),'[]'::jsonb))
 from public.quotations q where q.id=p_id;
$$;
revoke all on function private.quote_document(uuid) from public,anon,authenticated;

create or replace function public.get_quotation(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.is_member() or not exists(select 1 from public.quotations where id=p_id and (owner_id=auth.uid() or private.is_admin())) then raise exception 'Quotation not found or access denied' using errcode='42501'; end if;
 return private.quote_document(p_id);
end;$$;

create or replace function public.save_quotation(p_data jsonb,p_id uuid default null,p_expected_version integer default null,p_finalize boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 q public.quotations; v_id uuid; v_sid uuid; v_pid uuid; v_prod public.products;
 s jsonb; i jsonb; v_details jsonb; k text; v_pos integer:=0; v_ipos integer; v_count integer:=0;
 v_qty numeric; v_price numeric; v_cat numeric; v_line numeric; v_base numeric:=0; v_opt numeric:=0; v_disc numeric:=0; v_dval numeric; v_optional boolean;
 v_currency text; v_dtype text; v_import text; v_old_ids uuid[];
begin
 if not private.is_member() then raise exception 'Approved member access required' using errcode='42501'; end if;
 if octet_length(p_data::text)>2000000 then raise exception 'Quotation exceeds size limit'; end if;
 if jsonb_typeof(p_data->'sections') is distinct from 'array' or jsonb_array_length(p_data->'sections')>80 then raise exception 'Invalid sections'; end if;
 if coalesce(btrim(p_data->>'clientName'),'')='' then raise exception 'Client name is required'; end if;
 if (p_data->>'quoteDate')::date is null or (p_data->>'validUntil')::date is null or (p_data->>'validUntil')::date<(p_data->>'quoteDate')::date then raise exception 'Invalid quotation dates'; end if;
 v_currency:=p_data->>'currency'; v_dtype:=p_data->>'discountType';
 if v_currency is null or v_currency not in ('EGP','USD','EUR') then raise exception 'Invalid currency'; end if;
 if v_dtype is null or v_dtype not in ('none','percent','fixed') then raise exception 'Invalid discount type'; end if;
 if jsonb_typeof(p_data->'discountValue') is distinct from 'number' then raise exception 'Invalid discount value'; end if;
 v_dval:=(p_data->>'discountValue')::numeric;
 if v_dval<0 or v_dval<>round(v_dval,2) or (v_dtype='percent' and v_dval>100) then raise exception 'Invalid discount value'; end if;
 v_details:='{}';
 foreach k in array array['clientName','clientContact','projectName','projectLocation','quoteDate','validUntil','companyName','companyPhone','companyWeb','logo','clientNote','paymentTerms','warrantyTerms','extraTerms'] loop
  if jsonb_typeof(p_data->k) is distinct from 'string' then raise exception 'Invalid text field: %',k; end if;
  if k<>'logo' and length(p_data->>k)>10000 then raise exception 'Text field too long: %',k; end if;
  v_details:=v_details||jsonb_build_object(k,p_data->>k);
 end loop;
 if p_id is null then
  v_import:=nullif(p_data->>'sourceImportKey','');
  if length(v_import)>100 then raise exception 'Invalid import key'; end if;
  if v_import is not null and exists(select 1 from public.quotations where owner_id=auth.uid() and source_import_key=v_import) then raise exception 'This file has already been imported'; end if;
  insert into public.quotations(owner_id,details,currency,discount_type,discount_value,source_import_key) values(auth.uid(),v_details,v_currency,v_dtype,v_dval,v_import) returning id into v_id;
 else
  select * into q from public.quotations where id=p_id for update;
  if not found or (q.owner_id<>auth.uid() and not private.is_admin()) then raise exception 'Quotation not found or access denied' using errcode='42501'; end if;
  if q.status='finalized' then raise exception 'Finalized quotations are read-only. Duplicate to make changes.'; end if;
  if p_expected_version is distinct from q.version then raise exception 'CONFLICT: this quotation changed. Export your edits, then reload.' using errcode='40001'; end if;
  v_id:=q.id;
 end if;
 select array_agg(id) into v_old_ids from public.quotation_sections where quotation_id=v_id;
 -- All validations and writes occur in one transaction. Any error rolls back everything.
 for s in select value from jsonb_array_elements(p_data->'sections') loop
  if coalesce(btrim(s->>'name'),'')='' or length(s->>'name')>120 then raise exception 'Each section needs a name (up to 120 characters)'; end if;
  if jsonb_typeof(s->'items') is distinct from 'array' or jsonb_array_length(s->'items')>100 then raise exception 'Invalid items'; end if;
  if jsonb_typeof(s->'optional') is distinct from 'boolean' then raise exception 'Invalid optional flag'; end if;
  v_optional:=(s->>'optional')::boolean;
  -- Previous child rows are removed only after validation succeeds at transaction commit.
  insert into public.quotation_sections(quotation_id,name,optional,position) values(v_id,s->>'name',v_optional,v_pos) returning id into v_sid;
  v_ipos:=0;
  for i in select value from jsonb_array_elements(s->'items') loop
   v_count:=v_count+1;
   if v_count>1000 then raise exception 'Maximum 1000 items per quotation'; end if;
   if coalesce(btrim(i->>'name'),'')='' or length(i->>'name')>300 then raise exception 'Every item needs a name'; end if;
   if jsonb_typeof(i->'qty') is distinct from 'number' or jsonb_typeof(i->'price') is distinct from 'number' then raise exception 'Quantity and price must be numbers'; end if;
   v_qty:=(i->>'qty')::numeric; v_price:=(i->>'price')::numeric;
   if v_qty<=0 or v_qty>1000000 or v_qty<>round(v_qty,3) or v_price<0 or v_price>1000000000 or v_price<>round(v_price,2) then raise exception 'Invalid quantity or price'; end if;
   v_pid:=nullif(i->>'productId','')::uuid; v_cat:=nullif(i->>'catalogPrice','')::numeric;
   if v_cat is not null and (v_cat<0 or v_cat>1000000000 or v_cat<>round(v_cat,2)) then raise exception 'Invalid catalog price snapshot'; end if;
   if v_pid is not null then
    select * into v_prod from public.products where id=v_pid;
    if not found then raise exception 'Referenced product does not exist'; end if;
    if v_prod.currency<>v_currency then raise exception 'Product currency does not match quotation'; end if;
    -- An archived product is allowed only when already on this draft.
    if not v_prod.active and not exists(select 1 from public.quotation_items qi join public.quotation_sections qs on qs.id=qi.section_id where qs.quotation_id=p_id and qi.product_id=v_pid) then raise exception 'Archived product cannot be added to a new quote'; end if;
   end if;
   v_line:=round(v_qty*v_price,2);
   if v_optional then v_opt:=v_opt+v_line; else v_base:=v_base+v_line; end if;
   insert into public.quotation_items(section_id,product_id,product_code_snapshot,product_name_snapshot,category_snapshot,description_snapshot,unit_snapshot,catalog_price_snapshot,quoted_unit_price,quantity,line_total,position)
   values(v_sid,v_pid,coalesce(i->>'code',''),i->>'name',coalesce(i->>'category',''),coalesce(i->>'note',''),coalesce(i->>'unit','piece'),v_cat,v_price,v_qty,v_line,v_ipos);
   v_ipos:=v_ipos+1;
  end loop;
  v_pos:=v_pos+1;
 end loop;
 if v_count=0 then raise exception 'Add at least one item'; end if;
 if v_base+v_opt>1000000000000 then raise exception 'Quotation total exceeds supported limit'; end if;
 if v_dtype='percent' then v_disc:=round(v_base*v_dval/100,2); elsif v_dtype='fixed' then v_disc:=v_dval; end if;
 if v_disc>v_base then raise exception 'Discount cannot exceed included items subtotal'; end if;
 if v_old_ids is not null then
  delete from public.quotation_sections where id=any(v_old_ids);
 end if;
 update public.quotations set details=v_details,currency=v_currency,discount_type=v_dtype,discount_value=v_dval,subtotal=v_base,optional_total=v_opt,discount_amount=v_disc,total=v_base-v_disc,status=case when p_finalize then 'finalized' else 'draft' end,version=case when p_id is null then 1 else q.version+1 end,updated_at=now() where id=v_id;
 return private.quote_document(v_id);
end;$$;

revoke all on function public.save_product(jsonb,uuid,integer),public.get_quotation(uuid),public.save_quotation(jsonb,uuid,integer,boolean) from public,anon;
grant execute on function public.save_product(jsonb,uuid,integer),public.get_quotation(uuid),public.save_quotation(jsonb,uuid,integer,boolean) to authenticated;
commit;
