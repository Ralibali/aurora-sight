
CREATE OR REPLACE FUNCTION public.seed_demo_org(_org_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b record;
  v_client uuid;
  v_brand uuid;
  v_set uuid;
  v_run uuid;
  v_res uuid;
  v_finding uuid;
  p record;
  idx int;
  cls public.result_class;
BEGIN
  INSERT INTO public.clients (org_id, name, contact_email, notes, is_demo)
  VALUES (_org_id, 'DEMO – Aurora Media AB (intern portfölj)', NULL, 'Exempelkund med seedad demodata.', true)
  RETURNING id INTO v_client;

  FOR b IN
    SELECT * FROM (VALUES
      ('Hönsgården','honsgarden.se','DEMO – exempelprojekt: gårdsbaserad försäljning av höns, hönshus och tillbehör.',
        ARRAY['Bosses Hönseri','Granngården','Hönshuset Sverige'],
        ARRAY['var kan jag köpa höns i Sverige','bästa hönshuset för nybörjare','hur många höns behöver en familj','vilken hönsras passar för svenskt klimat','köpa värphöns online Skåne','Hönsgården omdömen','jag vill ha egna ägg hemma vad behöver jag','jämför hönshus pris och kvalitet'],
        ARRAY['discovery','recommendation','problem_solution','comparison','local_buyer','branded','problem_solution','comparison']),
      ('Stayboost','stayboost.se','DEMO – exempelprojekt: verktyg som hjälper boendeanläggningar öka direktbokningar.',
        ARRAY['Sitemider','Profitroom','Mews'],
        ARRAY['hur ökar hotell sina direktbokningar','bästa bokningsmotorn för små hotell','alternativ till Booking.com för svenska hotell','Stayboost recension','minska provision till OTA','bokningssystem för bed and breakfast Sverige','jämför bokningsmotorer pris','vilket system rekommenderas för vandrarhem'],
        ARRAY['problem_solution','recommendation','discovery','branded','problem_solution','local_buyer','comparison','recommendation']),
      ('Updro','updro.se','DEMO – exempelprojekt: digital tjänst för uppdrag och projektuppföljning.',
        ARRAY['Monday.com','Asana','Trello'],
        ARRAY['bästa projektverktyget för små företag i Sverige','enkelt system för uppdragshantering','Updro omdömen','alternativ till Monday för svenska team','hur håller jag koll på uppdrag och deadlines','projektverktyg på svenska','jämför projektverktyg pris 2026','vilket verktyg rekommenderas för konsultbyråer'],
        ARRAY['recommendation','discovery','branded','comparison','problem_solution','local_buyer','comparison','recommendation'])
    ) AS x(name, domain, descr, comps, prompts, intents)
  LOOP
    INSERT INTO public.brands (org_id, client_id, name, domain, description, is_demo, aliases)
    VALUES (_org_id, v_client, b.name, b.domain, b.descr, true, ARRAY[b.name])
    RETURNING id INTO v_brand;

    INSERT INTO public.competitors (org_id, brand_id, name)
    SELECT _org_id, v_brand, unnest(b.comps);

    INSERT INTO public.prompt_sets (org_id, brand_id, name, description)
    VALUES (_org_id, v_brand, 'Köpintentioner (demo)', 'Svenska köpnära prompter för ' || b.name)
    RETURNING id INTO v_set;

    FOR idx IN 1..array_length(b.prompts,1) LOOP
      INSERT INTO public.prompts (org_id, prompt_set_id, text, intent)
      VALUES (_org_id, v_set, b.prompts[idx], (b.intents[idx])::public.prompt_intent);
    END LOOP;

    INSERT INTO public.audit_runs (org_id, brand_id, prompt_set_id, label, model_id, model_label, mode, status, search_mode, total_prompts, completed_prompts, started_at, completed_at)
    VALUES (_org_id, v_brand, v_set, 'DEMO-körning', 'demo/seeded', 'Demo (seedad data)', 'demo', 'completed', 'offline', array_length(b.prompts,1), array_length(b.prompts,1), now() - interval '3 days', now() - interval '3 days')
    RETURNING id INTO v_run;

    idx := 0;
    FOR p IN SELECT * FROM public.prompts WHERE prompt_set_id = v_set ORDER BY created_at, text LOOP
      idx := idx + 1;
      cls := (ARRAY['RECOMMENDED','MENTIONED','ABSENT','CITED','ABSENT','MENTIONED','ABSENT','RECOMMENDED'])[((idx-1) % 8) + 1]::public.result_class;
      INSERT INTO public.audit_results (org_id, run_id, prompt_id, prompt_text, intent, classification, classification_reason, raw_answer, brand_mentions, competitor_mentions)
      VALUES (
        _org_id, v_run, p.id, p.text, p.intent, cls,
        'DEMO: seedad klassificering enligt samma regler som live-motorn.',
        'DEMO-SVAR (ej ett riktigt modellsvar). Exempeltext för prompten "' || p.text || '". Denna text finns endast för att visa hur evidensvyn ser ut.',
        CASE WHEN cls = 'ABSENT' THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('name', b.name, 'count', 1)) END,
        jsonb_build_array(jsonb_build_object('name', b.comps[1], 'count', 2), jsonb_build_object('name', b.comps[2], 'count', 1))
      ) RETURNING id INTO v_res;

      IF cls = 'CITED' THEN
        INSERT INTO public.citations (org_id, result_id, url, domain, title, is_brand_domain)
        VALUES (_org_id, v_res, 'https://' || b.domain, b.domain, b.name || ' – officiell webbplats', true);
      END IF;
    END LOOP;

    UPDATE public.audit_runs SET metrics = jsonb_build_object(
      'visibility_rate', 0.625, 'recommendation_rate', 0.25, 'citation_rate', 0.125, 'absent_rate', 0.375,
      'prompt_coverage', array_length(b.prompts,1)
    ) WHERE id = v_run;

    INSERT INTO public.findings (org_id, brand_id, run_id, title, description, severity, evidence_result_ids)
    VALUES (_org_id, v_brand, v_run, 'DEMO: Osynlig på jämförelseprompter',
      'I demokörningen saknas varumärket i svaren på jämförande köpprompter medan konkurrenter nämns.', 1,
      ARRAY(SELECT id FROM public.audit_results WHERE run_id = v_run AND classification = 'ABSENT' LIMIT 3))
    RETURNING id INTO v_finding;

    INSERT INTO public.actions (org_id, brand_id, finding_id, title, category, rationale, priority)
    VALUES
      (_org_id, v_brand, v_finding, 'Publicera jämförelsesida med tydliga kriterier', 'content_gap', 'Hypotes: modellerna saknar en källa som beskriver erbjudandet i jämförande termer.', 1),
      (_org_id, v_brand, v_finding, 'Förtydliga entitet: vem ni är, var ni verkar, vad ni säljer', 'entity_clarity', 'Hypotes: entiteten är otydlig i tränings- och sökunderlag.', 1),
      (_org_id, v_brand, v_finding, 'Lägg till Organization- och Product-schema', 'structured_data', 'Hypotes: strukturerad data ökar chansen att bli korrekt citerad.', 2);

    INSERT INTO public.reports (org_id, brand_id, run_id, title, summary)
    VALUES (_org_id, v_brand, v_run, 'DEMO – AI-synlighetsrapport ' || b.name, 'Exempelrapport baserad på seedad demodata.');

    INSERT INTO public.schedules (org_id, brand_id, prompt_set_id, cadence, enabled, next_run_at)
    VALUES (_org_id, v_brand, v_set, 'monthly', false, now() + interval '27 days');
  END LOOP;

  INSERT INTO public.subscriptions (org_id, client_id, plan_key, status, mrr_sek)
  VALUES (_org_id, v_client, 'monitor', 'demo', 995);
END;
$$;
REVOKE ALL ON FUNCTION public.seed_demo_org(uuid) FROM PUBLIC, anon;

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

  INSERT INTO public.provider_configs (org_id, model_id, model_label, supports_native_search, est_cost_per_1k_in, est_cost_per_1k_out) VALUES
    (new_org, 'openai/gpt-4o-mini', 'OpenAI GPT-4o mini (OpenRouter)', false, 0.00015, 0.0006),
    (new_org, 'anthropic/claude-3.5-sonnet', 'Anthropic Claude 3.5 Sonnet (OpenRouter)', false, 0.003, 0.015),
    (new_org, 'perplexity/sonar', 'Perplexity Sonar – webbsökning (OpenRouter)', true, 0.001, 0.001);

  PERFORM public.seed_demo_org(new_org);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
