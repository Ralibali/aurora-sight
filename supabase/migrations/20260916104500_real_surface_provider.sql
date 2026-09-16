-- Real AI Surface is opt-in. It is disabled until the server-side surface endpoint is configured.
INSERT INTO public.provider_configs (
  org_id,
  provider,
  model_id,
  model_label,
  supports_native_search,
  enabled,
  est_cost_per_1k_in,
  est_cost_per_1k_out
)
SELECT
  o.id,
  'surface',
  'surface/default',
  'Real AI Surface (browser)',
  true,
  false,
  0,
  0
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1
  FROM public.provider_configs p
  WHERE p.org_id = o.id
    AND p.provider IN ('surface', 'real_surface')
);

-- Keep signup provisioning in sync for future organizations.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_org uuid;
BEGIN
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'org_name', split_part(NEW.email,'@',1) || ' AB'))
  RETURNING id INTO new_org;

  INSERT INTO public.profiles (id, org_id, email, full_name)
  VALUES (NEW.id, new_org, NEW.email, NEW.raw_user_meta_data->>'full_name');

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'org_admin');

  INSERT INTO public.provider_configs (
    org_id, provider, model_id, model_label, supports_native_search, enabled,
    est_cost_per_1k_in, est_cost_per_1k_out
  ) VALUES
    (new_org, 'openrouter', 'openai/gpt-4o-mini', 'OpenAI GPT-4o mini (OpenRouter)', false, true, 0.00015, 0.0006),
    (new_org, 'openrouter', 'anthropic/claude-3.5-sonnet', 'Anthropic Claude 3.5 Sonnet (OpenRouter)', false, true, 0.003, 0.015),
    (new_org, 'openrouter', 'perplexity/sonar', 'Perplexity Sonar – webbsökning (OpenRouter)', true, true, 0.001, 0.001),
    (new_org, 'surface', 'surface/default', 'Real AI Surface (browser)', true, false, 0, 0);

  PERFORM public.seed_demo_org(new_org);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
