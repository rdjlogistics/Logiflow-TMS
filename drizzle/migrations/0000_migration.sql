GRANT SELECT ON public.subscription_plans TO authenticated, anon;
GRANT ALL ON public.subscription_plans TO service_role;
GRANT SELECT ON public.ai_plans TO authenticated;
GRANT ALL ON public.ai_plans TO service_role;

DROP POLICY IF EXISTS "Public can view active plans" ON public.subscription_plans;
CREATE POLICY "Public can view active plans" ON public.subscription_plans
  FOR SELECT TO anon USING (is_active = true);

INSERT INTO public.subscription_plans (slug, name, description, badge_text, price_monthly_eur, price_yearly_eur, max_users, max_vehicles, max_orders_month, features_json, trial_days, sort_order, is_active)
SELECT v.* FROM (VALUES
  ('solo','Solo','ZZP''er · 1 chauffeur · 1–2 voertuigen',NULL::text,29::numeric,288::numeric,1,2,100,
   '{"ai_dispatch":false,"ai_copilot":false,"chauffeurs_app":false,"multi_stop":false,"route_optimalisatie":false,"klanten_portaal":false,"marge_analyse":false,"cashflow_dashboard":false,"fleet_advanced":false,"bank_reconciliatie":false,"boekhouding_koppeling":false,"wms":false,"ecommerce":false,"api_access":false,"white_label":false}'::jsonb,14,1,true),
  ('starter','Starter','Klein transportbedrijf · tot 5 voertuigen',NULL,79,792,5,5,500,
   '{"ai_dispatch":false,"ai_copilot":false,"chauffeurs_app":true,"multi_stop":true,"route_optimalisatie":false,"klanten_portaal":false,"marge_analyse":false,"cashflow_dashboard":false,"fleet_advanced":false,"bank_reconciliatie":false,"boekhouding_koppeling":false,"wms":false,"ecommerce":false,"api_access":false,"white_label":false}'::jsonb,14,2,true),
  ('growth','Growth','Serieuze transporteur · 5–20 voertuigen','Meest gekozen',159,1596,15,20,2000,
   '{"ai_dispatch":true,"ai_copilot":false,"chauffeurs_app":true,"multi_stop":true,"route_optimalisatie":true,"klanten_portaal":true,"marge_analyse":true,"cashflow_dashboard":true,"fleet_advanced":true,"bank_reconciliatie":false,"boekhouding_koppeling":false,"wms":false,"ecommerce":false,"api_access":false,"white_label":false}'::jsonb,14,3,true),
  ('scale','Scale','Marktleider · 20–50+ voertuigen',NULL,299,2988,999999,50,999999,
   '{"ai_dispatch":true,"ai_copilot":true,"chauffeurs_app":true,"multi_stop":true,"route_optimalisatie":true,"klanten_portaal":true,"marge_analyse":true,"cashflow_dashboard":true,"fleet_advanced":true,"bank_reconciliatie":true,"boekhouding_koppeling":true,"wms":true,"ecommerce":true,"api_access":false,"white_label":false}'::jsonb,14,4,true)
) AS v(slug,name,description,badge_text,price_monthly_eur,price_yearly_eur,max_users,max_vehicles,max_orders_month,features_json,trial_days,sort_order,is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_plans p WHERE p.slug = v.slug);

INSERT INTO public.ai_plans (slug, name, credits_included, price_monthly_eur, features_json, max_conversations_per_day, max_tokens_per_request, model_access, is_active)
SELECT v.* FROM (VALUES
  ('starter','AI Starter',500,19::numeric,'{"chat":true,"email_generation":true,"order_explain":true}'::jsonb,50,4096,ARRAY['google/gemini-2.5-flash-lite'],true),
  ('pro','AI Pro',2000,49,'{"chat":true,"email_generation":true,"smart_order_entry":true,"margin_analysis":true,"cashflow_forecast":true,"auto_dispatch":true}'::jsonb,200,8192,ARRAY['google/gemini-2.5-flash-lite','google/gemini-2.5-flash'],true),
  ('enterprise','AI Enterprise',999999,149,'{"all_tools":true,"custom_workflows":true,"api_access":true,"priority_support":true}'::jsonb,999999,16384,ARRAY['google/gemini-2.5-flash-lite','google/gemini-2.5-flash','google/gemini-2.5-pro'],true)
) AS v(slug,name,credits_included,price_monthly_eur,features_json,max_conversations_per_day,max_tokens_per_request,model_access,is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.ai_plans p WHERE p.slug = v.slug);