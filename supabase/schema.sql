-- ============================================================================
-- Meine Rezepte – Datenbank-Schema für Supabase (Verbunden-Modus)
-- ============================================================================
-- Dieses Skript einmalig im Supabase SQL-Editor deines Projekts ausführen.
-- Siehe SETUP.md für die genaue Anleitung inkl. Screenshots-Beschreibung.
-- ============================================================================

-- Tabellen -------------------------------------------------------------------

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (household_id, user_id),
  unique (household_id, display_name)
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'Sonstiges',
  cuisine text,
  tags text[] not null default '{}',
  prep_time_minutes int,
  cook_time_minutes int,
  servings int,
  difficulty text,
  ingredients jsonb not null default '[]',
  steps jsonb not null default '[]',
  images jsonb not null default '[]',
  links jsonb not null default '[]',
  source_url text,
  favorite boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  -- Namens-Snapshot des Erstellers zum Anlagezeitpunkt (siehe App-seitiges
  -- Recipe.createdByName) – bleibt auch dann korrekt lesbar, wenn die Person
  -- sich später umbenennt oder den Haushalt verlässt.
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Für bereits bestehende Installationen: Spalte nachträglich ergänzen, falls
-- sie fehlt (bei einer frisch erstellten Tabelle über CREATE TABLE oben ist
-- das ein No-op).
alter table recipes add column if not exists created_by_name text;

create table if not exists shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  checked boolean not null default false,
  from_recipe_ids uuid[] not null default '{}',
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Haushalts-weite Einstellungen: eigenes Logo (als Data-URL) & selbst
-- angelegte, noch leere Kategorien (Kategorien aus tatsächlich genutzten
-- Rezepten werden client-seitig zusätzlich aus recipes.category abgeleitet).
create table if not exists household_settings (
  household_id uuid primary key references households(id) on delete cascade,
  logo_data_url text,
  extra_categories text[] not null default '{}',
  hidden_default_categories text[] not null default '{}',
  updated_at timestamptz not null default now()
);
-- Für bereits bestehende Installationen (Tabelle existierte schon, bevor es
-- diese Spalte gab): Spalte nachträglich ergänzen, falls sie fehlt. Bei einer
-- frisch erstellten Tabelle über CREATE TABLE oben ist das ein No-op.
alter table household_settings add column if not exists hidden_default_categories text[] not null default '{}';

-- "Markieren"/Aktivitäts-Feed: X hat Y auf ein Rezept aufmerksam gemacht,
-- oder ein neues Rezept wurde hinzugefügt. to_member_id = null bedeutet
-- "ganzer Haushalt" (z.B. bei neuen Rezepten).
create table if not exists recipe_pings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  kind text not null default 'ping' check (kind in ('ping', 'new_recipe')),
  from_member_id uuid not null references household_members(id) on delete cascade,
  to_member_id uuid references household_members(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

-- Web-Push-Abonnements pro Mitglied/Gerät.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  member_id uuid not null references household_members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

-- Öffentliche Teilen-Links für einzelne Rezepte (kein Account nötig).
create table if not exists recipe_share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  recipe_id uuid not null references recipes(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  view_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Hilfsfunktionen (SECURITY DEFINER, damit sie ohne Rekursions-/RLS-Probleme
-- innerhalb der Policies verwendet werden können) --------------------------

create or replace function is_household_member(hid uuid) returns boolean
language sql security definer stable as $$
  select exists(
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function household_role(hid uuid) returns text
language sql security definer stable as $$
  select role from household_members
  where household_id = hid and user_id = auth.uid();
$$;

-- Wird VOR dem eigentlichen Beitritt aufgerufen (noch nicht authentifiziert
-- bzw. gerade erst registriert), um zu prüfen, ob ein Anzeigename in einem
-- Haushalt schon vergeben ist – ohne die ganze Mitgliederliste offenzulegen.
create or replace function display_name_available(hid uuid, wanted_name text) returns boolean
language sql security definer stable as $$
  select not exists(
    select 1 from household_members
    where household_id = hid and lower(display_name) = lower(wanted_name)
  );
$$;

grant execute on function display_name_available(uuid, text) to anon, authenticated;

-- Erlaubt einem Mitglied, den EIGENEN Anzeigenamen zu ändern, ohne die
-- allgemeine "nur Owner darf household_members updaten"-Policy zu lockern
-- (die auch die Rolle schützt). SECURITY DEFINER umgeht RLS gezielt nur für
-- diese eine, eng gefasste Operation.
create or replace function update_my_display_name(new_name text) returns void
language plpgsql security definer as $$
declare
  my_household_id uuid;
begin
  select household_id into my_household_id from household_members where user_id = auth.uid() limit 1;
  if my_household_id is null then
    raise exception 'Kein Haushaltsmitglied gefunden.';
  end if;
  if new_name is null or length(trim(new_name)) = 0 then
    raise exception 'Bitte einen Namen angeben.';
  end if;
  if exists (
    select 1 from household_members
    where household_id = my_household_id and lower(display_name) = lower(trim(new_name)) and user_id <> auth.uid()
  ) then
    raise exception 'Dieser Name ist in diesem Haushalt bereits vergeben.';
  end if;
  update household_members set display_name = trim(new_name) where user_id = auth.uid();
end;
$$;

grant execute on function update_my_display_name(text) to authenticated;

-- updated_at automatisch pflegen ---------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_recipes_updated_at on recipes;
create trigger trg_recipes_updated_at before update on recipes
  for each row execute function set_updated_at();

drop trigger if exists trg_shopping_updated_at on shopping_list_items;
create trigger trg_shopping_updated_at before update on shopping_list_items
  for each row execute function set_updated_at();

drop trigger if exists trg_household_settings_updated_at on household_settings;
create trigger trg_household_settings_updated_at before update on household_settings
  for each row execute function set_updated_at();

-- Liefert ein per Teilen-Link freigegebenes Rezept öffentlich (ohne Login)
-- zurück und zählt den Aufruf mit. SECURITY DEFINER umgeht dafür bewusst
-- die sonst geltende Haushalts-RLS auf recipes.
create or replace function get_shared_recipe(share_token text)
returns setof recipes
language plpgsql security definer as $$
begin
  update recipe_share_links set view_count = view_count + 1 where token = share_token;
  return query
    select r.* from recipes r
    join recipe_share_links l on l.recipe_id = r.id
    where l.token = share_token;
end;
$$;

grant execute on function get_shared_recipe(text) to anon, authenticated;

-- Row Level Security ----------------------------------------------------------

alter table households enable row level security;
alter table household_members enable row level security;
alter table recipes enable row level security;
alter table shopping_list_items enable row level security;

-- households: der Beitritts-Code muss vor dem Login nachschlagbar sein,
-- daher öffentlich lesbar (enthält keine sensiblen Daten). Anlegen nur für
-- sich selbst als owner_user_id.
drop policy if exists households_select_all on households;
create policy households_select_all on households for select using (true);

drop policy if exists households_insert_own on households;
create policy households_insert_own on households for insert
  with check (owner_user_id = auth.uid());

-- household_members
drop policy if exists members_select_same_household on household_members;
create policy members_select_same_household on household_members for select
  using (is_household_member(household_id));

drop policy if exists members_insert_self_as_viewer on household_members;
create policy members_insert_self_as_viewer on household_members for insert
  with check (user_id = auth.uid() and role = 'viewer');

drop policy if exists members_insert_owner_row on household_members;
create policy members_insert_owner_row on household_members for insert
  with check (
    user_id = auth.uid() and role = 'owner'
    and household_id in (select id from households where owner_user_id = auth.uid())
  );

drop policy if exists members_update_owner_manages_roles on household_members;
create policy members_update_owner_manages_roles on household_members for update
  using (household_role(household_id) = 'owner')
  with check (household_role(household_id) = 'owner');

drop policy if exists members_delete_owner_or_self on household_members;
create policy members_delete_owner_or_self on household_members for delete
  using (household_role(household_id) = 'owner' or user_id = auth.uid());

-- recipes
drop policy if exists recipes_select_members on recipes;
create policy recipes_select_members on recipes for select
  using (is_household_member(household_id));

drop policy if exists recipes_insert_editors on recipes;
create policy recipes_insert_editors on recipes for insert
  with check (household_role(household_id) in ('owner', 'editor'));

-- Bearbeiten/Löschen nur durch den ursprünglichen Ersteller ODER die Rolle
-- "Besitzer" (nicht mehr jede:r Bearbeiter:in) – created_by is null deckt
-- Alt-Rezepte ab, die vor Einführung dieses Felds angelegt wurden, damit die
-- niemand aussperrt.
drop policy if exists recipes_update_editors on recipes;
create policy recipes_update_editors on recipes for update
  using (
    household_role(household_id) = 'owner'
    or (household_role(household_id) = 'editor' and (created_by = auth.uid() or created_by is null))
  )
  with check (
    household_role(household_id) = 'owner'
    or (household_role(household_id) = 'editor' and (created_by = auth.uid() or created_by is null))
  );

drop policy if exists recipes_delete_editors on recipes;
create policy recipes_delete_editors on recipes for delete
  using (
    household_role(household_id) = 'owner'
    or (household_role(household_id) = 'editor' and (created_by = auth.uid() or created_by is null))
  );

-- shopping_list_items
drop policy if exists shopping_select_members on shopping_list_items;
create policy shopping_select_members on shopping_list_items for select
  using (is_household_member(household_id));

drop policy if exists shopping_insert_editors on shopping_list_items;
create policy shopping_insert_editors on shopping_list_items for insert
  with check (household_role(household_id) in ('owner', 'editor'));

drop policy if exists shopping_update_editors on shopping_list_items;
create policy shopping_update_editors on shopping_list_items for update
  using (household_role(household_id) in ('owner', 'editor'))
  with check (household_role(household_id) in ('owner', 'editor'));

drop policy if exists shopping_delete_editors on shopping_list_items;
create policy shopping_delete_editors on shopping_list_items for delete
  using (household_role(household_id) in ('owner', 'editor'));

-- household_settings
alter table household_settings enable row level security;
drop policy if exists settings_select_members on household_settings;
create policy settings_select_members on household_settings for select
  using (is_household_member(household_id));
drop policy if exists settings_upsert_editors on household_settings;
create policy settings_upsert_editors on household_settings for insert
  with check (household_role(household_id) in ('owner', 'editor'));
drop policy if exists settings_update_editors on household_settings;
create policy settings_update_editors on household_settings for update
  using (household_role(household_id) in ('owner', 'editor'))
  with check (household_role(household_id) in ('owner', 'editor'));

-- recipe_pings (jedes Mitglied inkl. Betrachter darf markieren/anlegen)
alter table recipe_pings enable row level security;
drop policy if exists pings_select_members on recipe_pings;
create policy pings_select_members on recipe_pings for select
  using (is_household_member(household_id));
drop policy if exists pings_insert_members on recipe_pings;
create policy pings_insert_members on recipe_pings for insert
  with check (is_household_member(household_id));

-- push_subscriptions (jede:r verwaltet nur die eigenen)
alter table push_subscriptions enable row level security;
drop policy if exists push_select_own on push_subscriptions;
create policy push_select_own on push_subscriptions for select
  using (member_id in (select id from household_members where user_id = auth.uid()));
drop policy if exists push_insert_own on push_subscriptions;
create policy push_insert_own on push_subscriptions for insert
  with check (member_id in (select id from household_members where user_id = auth.uid()));
drop policy if exists push_delete_own on push_subscriptions;
create policy push_delete_own on push_subscriptions for delete
  using (member_id in (select id from household_members where user_id = auth.uid()));

-- recipe_share_links
alter table recipe_share_links enable row level security;
drop policy if exists share_select_members on recipe_share_links;
create policy share_select_members on recipe_share_links for select
  using (is_household_member(household_id));
drop policy if exists share_insert_editors on recipe_share_links;
create policy share_insert_editors on recipe_share_links for insert
  with check (household_role(household_id) in ('owner', 'editor'));
drop policy if exists share_delete_editors on recipe_share_links;
create policy share_delete_editors on recipe_share_links for delete
  using (household_role(household_id) in ('owner', 'editor'));

-- Realtime: damit z.B. die Einkaufsliste live bei allen aktualisiert wird ----
alter publication supabase_realtime add table shopping_list_items;
alter publication supabase_realtime add table recipes;
alter publication supabase_realtime add table household_members;
alter publication supabase_realtime add table recipe_pings;
alter publication supabase_realtime add table household_settings;
