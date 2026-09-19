-- Run after migrations. Checks effective privileges, including inherited grants.
DO $$
DECLARE
  identity_column text;
BEGIN
  FOREACH identity_column IN ARRAY ARRAY['id', 'org_id', 'email', 'created_at'] LOOP
    IF has_column_privilege('authenticated', 'public.profiles', identity_column, 'UPDATE') THEN
      RAISE EXCEPTION 'Authenticated users can rewrite profile identity: %', identity_column;
    END IF;
  END LOOP;
  IF has_any_column_privilege('authenticated', 'public.profiles', 'INSERT')
    OR has_table_privilege('authenticated', 'public.profiles', 'DELETE')
    OR has_any_column_privilege('anon', 'public.profiles', 'UPDATE') THEN
    RAISE EXCEPTION 'Untrusted clients can create, replace or update profile identity';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.profiles', 'SELECT')
    OR NOT has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE')
    OR NOT has_table_privilege('service_role', 'public.profiles', 'INSERT, UPDATE') THEN
    RAISE EXCEPTION 'Profile read, display-name editing or trusted provisioning is broken';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'profiles self insert'
  ) THEN
    RAISE EXCEPTION 'Client profile insertion policy still exists';
  END IF;
END;
$$;
