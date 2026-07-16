-- Pesaby accesses PostgreSQL exclusively through its trusted server connection.
-- Public Supabase Data API roles must not have direct table access.
-- Do not use FORCE ROW LEVEL SECURITY here: the application currently connects
-- as the database owner, which intentionally bypasses RLS for server-side work.

do $$
declare
  target_table record;
begin
  for target_table in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table %I.%I enable row level security',
      target_table.schemaname,
      target_table.tablename
    );

    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format(
        'revoke all privileges on table %I.%I from anon',
        target_table.schemaname,
        target_table.tablename
      );
    end if;

    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format(
        'revoke all privileges on table %I.%I from authenticated',
        target_table.schemaname,
        target_table.tablename
      );
    end if;
  end loop;
end
$$;
