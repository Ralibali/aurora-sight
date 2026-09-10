
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('aurora_admin','org_admin','member');
CREATE TYPE public.prompt_intent AS ENUM ('discovery','comparison','recommendation','local_buyer','branded','problem_solution');
CREATE TYPE public.result_class AS ENUM ('RECOMMENDED','CITED','MENTIONED','ABSENT');
CREATE TYPE public.run_status AS ENUM ('pending','running','completed','failed','partial');
CREATE TYPE public.run_mode AS ENUM ('live','demo');
CREATE TYPE public.search_mode AS ENUM ('offline','native_search');
CREATE TYPE public.action_status AS ENUM ('open','in_progress','done','dismissed');
CREATE TYPE public.action_category AS ENUM ('entity_clarity','landing_page','structured_data','content_gap','third_party_citation','internal_linking','review_authority','technical_seo');

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  is_aurora boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_aurora_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'aurora_admin');
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_access_org(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_aurora_admin() OR _org_id = public.current_org_id();
$$;

CREATE POLICY "org readable by members" ON public.organizations FOR SELECT TO authenticated USING (public.can_access_org(id));
CREATE POLICY "org updatable by members" ON public.organizations FOR UPDATE TO authenticated USING (public.can_access_org(id));
CREATE POLICY "org insert by authenticated" ON public.organizations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "profiles self or admin read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.can_access_org(org_id));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_aurora_admin());

-- SIGNUP TRIGGER
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
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CLIENTS
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_email text,
  notes text,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  domain text,
  country text NOT NULL DEFAULT 'SE',
  language text NOT NULL DEFAULT 'sv',
  description text,
  products text,
  aliases text[] NOT NULL DEFAULT '{}',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  domain text,
  aliases text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prompt_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prompt_set_id uuid NOT NULL REFERENCES public.prompt_sets(id) ON DELETE CASCADE,
  text text NOT NULL,
  intent public.prompt_intent NOT NULL DEFAULT 'discovery',
  language text NOT NULL DEFAULT 'sv',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.provider_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'openrouter',
  model_id text NOT NULL,
  model_label text NOT NULL,
  supports_native_search boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  est_cost_per_1k_in numeric NOT NULL DEFAULT 0,
  est_cost_per_1k_out numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  prompt_set_id uuid REFERENCES public.prompt_sets(id) ON DELETE SET NULL,
  label text,
  provider text NOT NULL DEFAULT 'openrouter',
  model_id text NOT NULL,
  model_label text NOT NULL,
  search_mode public.search_mode NOT NULL DEFAULT 'offline',
  language text NOT NULL DEFAULT 'sv',
  country text NOT NULL DEFAULT 'SE',
  mode public.run_mode NOT NULL DEFAULT 'demo',
  status public.run_status NOT NULL DEFAULT 'pending',
  total_prompts int NOT NULL DEFAULT 0,
  completed_prompts int NOT NULL DEFAULT 0,
  failed_prompts int NOT NULL DEFAULT 0,
  cost_estimate_usd numeric NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE public.audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.audit_runs(id) ON DELETE CASCADE,
  prompt_id uuid REFERENCES public.prompts(id) ON DELETE SET NULL,
  prompt_text text NOT NULL,
  intent public.prompt_intent NOT NULL DEFAULT 'discovery',
  classification public.result_class NOT NULL DEFAULT 'ABSENT',
  classification_reason text,
  raw_answer text,
  brand_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  competitor_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  tokens_in int NOT NULL DEFAULT 0,
  tokens_out int NOT NULL DEFAULT 0,
  cost_estimate_usd numeric NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  result_id uuid NOT NULL REFERENCES public.audit_results(id) ON DELETE CASCADE,
  url text NOT NULL,
  domain text,
  title text,
  is_brand_domain boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.audit_runs(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  severity int NOT NULL DEFAULT 2,
  evidence_result_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  finding_id uuid REFERENCES public.findings(id) ON DELETE SET NULL,
  title text NOT NULL,
  category public.action_category NOT NULL DEFAULT 'content_gap',
  rationale text,
  priority int NOT NULL DEFAULT 2,
  status public.action_status NOT NULL DEFAULT 'open',
  owner text,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  prompt_set_id uuid REFERENCES public.prompt_sets(id) ON DELETE SET NULL,
  model_id text,
  cadence text NOT NULL DEFAULT 'monthly',
  enabled boolean NOT NULL DEFAULT false,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.audit_runs(id) ON DELETE SET NULL,
  title text NOT NULL,
  summary text,
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  plan_key text NOT NULL DEFAULT 'monitor',
  status text NOT NULL DEFAULT 'inactive',
  mrr_sek numeric NOT NULL DEFAULT 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PRICING (public)
CREATE TABLE public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  price_sek numeric NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'month',
  tagline text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta_label text NOT NULL DEFAULT 'Kom igång',
  is_contact boolean NOT NULL DEFAULT false,
  highlight boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.pricing_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_plans TO authenticated;
GRANT ALL ON public.pricing_plans TO service_role;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing public read" ON public.pricing_plans FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "pricing admin write" ON public.pricing_plans FOR ALL TO authenticated USING (public.is_aurora_admin()) WITH CHECK (public.is_aurora_admin());

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  website text,
  plan_interest text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leads public insert" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "leads admin read" ON public.leads FOR SELECT TO authenticated USING (public.is_aurora_admin());

-- ORG-SCOPED RLS FOR ALL TENANT TABLES
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','brands','competitors','prompt_sets','prompts','provider_configs','audit_runs','audit_results','citations','findings','actions','schedules','reports','subscriptions','audit_log']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "org scoped access" ON public.%I FOR ALL TO authenticated USING (public.can_access_org(org_id)) WITH CHECK (public.can_access_org(org_id));', t);
  END LOOP;
END $$;

CREATE INDEX idx_brands_org ON public.brands(org_id);
CREATE INDEX idx_runs_brand ON public.audit_runs(brand_id, started_at DESC);
CREATE INDEX idx_results_run ON public.audit_results(run_id);
CREATE INDEX idx_citations_result ON public.citations(result_id);
CREATE INDEX idx_prompts_set ON public.prompts(prompt_set_id);

-- SEED PRICING
INSERT INTO public.pricing_plans (key,name,price_sek,interval,tagline,features,cta_label,is_contact,highlight,sort_order) VALUES
('analys','AI-synlighetsanalys',2995,'once','Engångsanalys av hur AI-modeller svarar om ditt varumärke','["Upp till 30 köpintentioner","Konkurrentjämförelse","Evidenslänkad rapport (PDF-redo)","Prioriterad åtgärdslista"]','Beställ analys',false,false,1),
('monitor','Monitor',995,'month','Löpande bevakning för ett varumärke','["1 varumärke","20 bevakade köpprompter","Månatlig omkörning","Trend mot föregående körning","Delbar kundrapport"]','Starta Monitor',false,true,2),
('growth','Growth',2495,'month','För byråer och växande team','["3 varumärken","60 bevakade köpprompter","Månatliga rekommendationer","Åtgärdstavla med ansvarig","Prioriterad support"]','Starta Growth',false,false,3),
('agency','Byrå / Custom',0,'month','Volym, white label och egna modeller','["Obegränsat antal varumärken","White label-rapporter","Egna modeller via OpenRouter","API och exporter","Onboarding och utbildning"]','Kontakta oss',true,false,4);
