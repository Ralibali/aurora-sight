-- A profile's organization is the source of tenant membership. Clients must
-- never be able to create or rewrite it; handle_new_user provisions profiles
-- as the database owner and trusted server code uses service_role.
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL (id, org_id, email, full_name, created_at)
  ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name) ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles self insert" ON public.profiles;

-- Keep the existing self-update RLS policy for the editable display name.
-- service_role privileges and the signup trigger are intentionally unchanged.
