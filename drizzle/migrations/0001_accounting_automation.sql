CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_tx_external ON public.finance_transactions(company_id, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_subscriptions_tenant ON public.tenant_subscriptions(tenant_id);

CREATE OR REPLACE FUNCTION public.accounting_enabled(p_tenant uuid, p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.workflow_automations
    WHERE tenant_id = p_tenant AND trigger_config->>'system_key' = p_key AND is_active = false
  );
$$;

CREATE OR REPLACE FUNCTION public.seed_accounting_automations(p_tenant uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('accounting_new_order','Boekhouding: nieuwe order','Boekt verwachte omzet en maakt een conceptfactuur bij elke nieuwe order.','order_created'),
    ('accounting_delivered','Boekhouding: order afgeleverd','Sluit de factuur af (definitief) zodra de order is afgeleverd.','order_status_changed'),
    ('accounting_bank_match','Boekhouding: bankbetaling matchen','Koppelt binnenkomende bankbetalingen automatisch aan openstaande facturen.','bank_payment')
  ) AS v(k,n,d,t) LOOP
    IF NOT EXISTS (SELECT 1 FROM public.workflow_automations WHERE tenant_id=p_tenant AND trigger_config->>'system_key'=r.k) THEN
      INSERT INTO public.workflow_automations(tenant_id,name,description,trigger_type,trigger_config,is_active)
      VALUES (p_tenant, r.n, r.d, 'system_accounting', jsonb_build_object('system_key', r.k, 'source_event', r.t), true);
    END IF;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.log_accounting_run(p_tenant uuid, p_key text, p_status text, p_event jsonb, p_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.workflow_automations WHERE tenant_id=p_tenant AND trigger_config->>'system_key'=p_key LIMIT 1;
  IF v_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.workflow_runs(workflow_id, trigger_event, status, started_at, completed_at, error_message, actions_executed)
  VALUES (v_id, p_event, p_status, now(), now(), p_error, '[]'::jsonb);
  IF p_status = 'completed' THEN
    UPDATE public.workflow_automations SET run_count = coalesce(run_count,0)+1, last_run_at = now() WHERE id = v_id;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.trip_invoice_id(p_trip uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT il.invoice_id FROM public.invoice_lines il WHERE il.trip_id = p_trip ORDER BY il.created_at LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sync_trip_accounting(p_trip public.trips, p_finalize boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub numeric := coalesce(nullif(p_trip.sales_subtotal,0), nullif(p_trip.price,0), 0);
  v_vat numeric := round(v_sub * 0.21, 2);
  v_inv uuid;
  v_status text;
  v_terms int;
  v_desc text := 'Transport ' || coalesce(p_trip.order_number, left(p_trip.id::text,8)) || ': ' || coalesce(p_trip.pickup_address,'') || ' → ' || coalesce(p_trip.delivery_address,'');
BEGIN
  -- expected revenue
  INSERT INTO public.finance_transactions(company_id, transaction_type, status, transaction_date, description, amount, vat_amount, trip_id, customer_id, external_id, is_billable)
  VALUES (p_trip.company_id, 'revenue', CASE WHEN p_finalize THEN 'approved' ELSE 'pending' END, now(), 'Verwachte omzet ' || v_desc, v_sub, v_vat, p_trip.id, p_trip.customer_id, 'trip-revenue:' || p_trip.id, true)
  ON CONFLICT (company_id, external_id) WHERE external_id IS NOT NULL
  DO UPDATE SET amount = EXCLUDED.amount, vat_amount = EXCLUDED.vat_amount, customer_id = EXCLUDED.customer_id,
    status = CASE WHEN p_finalize THEN 'approved'::finance_transaction_status ELSE finance_transactions.status END, updated_at = now();

  IF p_trip.customer_id IS NULL THEN RETURN; END IF;

  v_inv := public.trip_invoice_id(p_trip.id);
  SELECT coalesce(payment_terms_days, 30) INTO v_terms FROM public.customers WHERE id = p_trip.customer_id;
  v_terms := coalesce(v_terms, 30);

  IF v_inv IS NULL THEN
    INSERT INTO public.invoices(company_id, customer_id, invoice_number, invoice_date, due_date, subtotal, vat_percentage, vat_amount, total_amount, amount_paid, status, notes, is_manual, invoice_type)
    VALUES (p_trip.company_id, p_trip.customer_id, public.get_next_invoice_number(p_trip.company_id), current_date, current_date + v_terms,
      v_sub, 21, v_vat, v_sub + v_vat, 0, CASE WHEN p_finalize THEN 'verzonden' ELSE 'concept' END::invoice_status,
      'Automatisch aangemaakt vanuit order', false, 'order')
    RETURNING id INTO v_inv;
    INSERT INTO public.invoice_lines(invoice_id, trip_id, description, quantity, unit_price, total_price, vat_percentage, vat_amount, line_type)
    VALUES (v_inv, p_trip.id, v_desc, 1, v_sub, v_sub, 21, v_vat, 'transport');
    RETURN;
  END IF;

  SELECT status::text INTO v_status FROM public.invoices WHERE id = v_inv;
  IF v_status = 'concept' THEN
    UPDATE public.invoice_lines SET unit_price = v_sub, total_price = v_sub, vat_amount = v_vat, description = v_desc
      WHERE invoice_id = v_inv AND trip_id = p_trip.id;
    UPDATE public.invoices SET subtotal = v_sub, vat_amount = v_vat, total_amount = v_sub + v_vat, customer_id = p_trip.customer_id,
      status = CASE WHEN p_finalize THEN 'verzonden'::invoice_status ELSE status END,
      invoice_date = CASE WHEN p_finalize THEN current_date ELSE invoice_date END,
      due_date = CASE WHEN p_finalize THEN current_date + v_terms ELSE due_date END
      WHERE id = v_inv;
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_trip_accounting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv uuid; v_final boolean;
BEGIN
  IF NEW.company_id IS NULL THEN RETURN NEW; END IF;
  BEGIN
    IF TG_OP = 'INSERT' THEN
      IF public.accounting_enabled(NEW.company_id,'accounting_new_order') THEN
        PERFORM public.sync_trip_accounting(NEW, NEW.status::text IN ('afgeleverd','afgerond','gecontroleerd'));
        PERFORM public.log_accounting_run(NEW.company_id,'accounting_new_order','completed', jsonb_build_object('trip_id',NEW.id));
      END IF;
    ELSE
      IF NEW.status::text = 'geannuleerd' AND OLD.status IS DISTINCT FROM NEW.status THEN
        v_inv := public.trip_invoice_id(NEW.id);
        IF v_inv IS NOT NULL AND (SELECT status::text FROM public.invoices WHERE id=v_inv) = 'concept'
           AND (SELECT count(*) FROM public.invoice_lines WHERE invoice_id=v_inv) = 1 THEN
          DELETE FROM public.invoice_lines WHERE invoice_id = v_inv;
          DELETE FROM public.invoices WHERE id = v_inv;
        END IF;
        UPDATE public.finance_transactions SET status='rejected', updated_at=now()
          WHERE company_id=NEW.company_id AND external_id='trip-revenue:'||NEW.id;
        RETURN NEW;
      END IF;
      v_final := NEW.status::text IN ('afgeleverd','afgerond') AND OLD.status IS DISTINCT FROM NEW.status
                 AND public.accounting_enabled(NEW.company_id,'accounting_delivered');
      IF v_final OR ((OLD.price IS DISTINCT FROM NEW.price OR OLD.sales_subtotal IS DISTINCT FROM NEW.sales_subtotal OR OLD.customer_id IS DISTINCT FROM NEW.customer_id)
                     AND public.accounting_enabled(NEW.company_id,'accounting_new_order')) THEN
        PERFORM public.sync_trip_accounting(NEW, v_final);
        IF v_final THEN
          PERFORM public.log_accounting_run(NEW.company_id,'accounting_delivered','completed', jsonb_build_object('trip_id',NEW.id,'status',NEW.status));
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[accounting] trip % failed: %', NEW.id, SQLERRM;
    PERFORM public.log_accounting_run(NEW.company_id, CASE WHEN TG_OP='INSERT' THEN 'accounting_new_order' ELSE 'accounting_delivered' END, 'failed', jsonb_build_object('trip_id',NEW.id), SQLERRM);
  END;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_trip_accounting ON public.trips;
CREATE TRIGGER trg_trip_accounting AFTER INSERT OR UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.trg_trip_accounting();

CREATE OR REPLACE FUNCTION public.apply_bank_payment(p_tx_amount numeric, p_invoice uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total numeric; v_paid numeric;
BEGIN
  SELECT total_amount, coalesce(amount_paid,0) + p_tx_amount INTO v_total, v_paid FROM public.invoices WHERE id = p_invoice;
  UPDATE public.invoices SET amount_paid = v_paid,
    status = CASE WHEN v_paid >= v_total - 0.01 THEN 'betaald'::invoice_status ELSE 'gedeeltelijk_betaald'::invoice_status END,
    paid_at = CASE WHEN v_paid >= v_total - 0.01 THEN now() ELSE paid_at END
  WHERE id = p_invoice;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_bank_auto_match()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv uuid; v_conf numeric; v_text text;
BEGIN
  IF NEW.company_id IS NULL OR coalesce(NEW.amount,0) <= 0 OR coalesce(NEW.is_matched,false) OR NEW.matched_invoice_id IS NOT NULL THEN RETURN NEW; END IF;
  IF NOT public.accounting_enabled(NEW.company_id,'accounting_bank_match') THEN RETURN NEW; END IF;
  BEGIN
    v_text := coalesce(NEW.description,'') || ' ' || coalesce(NEW.reference,'');
    SELECT id INTO v_inv FROM public.invoices
      WHERE company_id = NEW.company_id AND status::text IN ('verzonden','gedeeltelijk_betaald','vervallen','concept')
        AND length(invoice_number) > 3 AND position(upper(invoice_number) IN upper(v_text)) > 0
      ORDER BY invoice_date DESC LIMIT 1;
    IF v_inv IS NOT NULL THEN v_conf := 0.98;
    ELSE
      SELECT CASE WHEN count(*) = 1 THEN min(id::text)::uuid END INTO v_inv FROM public.invoices
        WHERE company_id = NEW.company_id AND status::text IN ('verzonden','vervallen')
          AND abs(total_amount - coalesce(amount_paid,0) - NEW.amount) < 0.01;
      IF v_inv IS NOT NULL THEN v_conf := 0.80; END IF;
    END IF;
    IF v_inv IS NOT NULL THEN
      PERFORM public.apply_bank_payment(NEW.amount, v_inv);
      NEW.matched_invoice_id := v_inv; NEW.is_matched := true; NEW.match_confidence := v_conf;
      NEW.status := 'matched'; NEW.needs_review := v_conf < 0.9;
      PERFORM public.log_accounting_run(NEW.company_id,'accounting_bank_match','completed', jsonb_build_object('invoice_id',v_inv,'amount',NEW.amount));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[accounting] bank match failed: %', SQLERRM;
  END;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bank_auto_match ON public.bank_transactions;
CREATE TRIGGER trg_bank_auto_match BEFORE INSERT ON public.bank_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_bank_auto_match();

CREATE OR REPLACE FUNCTION public.match_bank_transaction(p_tx uuid, p_invoice uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tx record; v_company uuid := public.get_user_company_cached(auth.uid());
BEGIN
  SELECT * INTO v_tx FROM public.bank_transactions WHERE id = p_tx AND company_id = v_company;
  IF v_tx IS NULL THEN RAISE EXCEPTION 'Transactie niet gevonden'; END IF;
  IF v_tx.is_matched THEN RAISE EXCEPTION 'Transactie is al gematcht'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE id = p_invoice AND company_id = v_company) THEN RAISE EXCEPTION 'Factuur niet gevonden'; END IF;
  PERFORM public.apply_bank_payment(v_tx.amount, p_invoice);
  UPDATE public.bank_transactions SET matched_invoice_id = p_invoice, is_matched = true, match_confidence = 1, status = 'matched', needs_review = false WHERE id = p_tx;
  RETURN jsonb_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.match_bank_transaction(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.match_bank_transaction(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_trip_invoice(p_trip uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_trip public.trips; v_company uuid := public.get_user_company_cached(auth.uid());
BEGIN
  SELECT * INTO v_trip FROM public.trips WHERE id = p_trip AND company_id = v_company;
  IF v_trip IS NULL THEN RAISE EXCEPTION 'Order niet gevonden'; END IF;
  IF v_trip.customer_id IS NULL THEN RAISE EXCEPTION 'Koppel eerst een klant aan deze order'; END IF;
  PERFORM public.sync_trip_accounting(v_trip, false);
  RETURN public.trip_invoice_id(p_trip);
END; $$;
REVOKE ALL ON FUNCTION public.create_trip_invoice(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_trip_invoice(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_trip_accounting(public.trips, boolean) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_bank_payment(numeric, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_accounting_run(uuid, text, text, jsonb, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_accounting_automations(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_company_bootstrap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan uuid;
BEGIN
  BEGIN
    PERFORM public.seed_accounting_automations(NEW.id);
    SELECT id INTO v_plan FROM public.subscription_plans WHERE slug = 'growth' AND is_active LIMIT 1;
    IF v_plan IS NULL THEN SELECT id INTO v_plan FROM public.subscription_plans WHERE is_active ORDER BY sort_order LIMIT 1; END IF;
    IF v_plan IS NOT NULL THEN
      INSERT INTO public.tenant_subscriptions(tenant_id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at)
      VALUES (NEW.id, v_plan, 'trial', 'monthly', now(), now() + interval '14 days', now() + interval '14 days')
      ON CONFLICT (tenant_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING '[bootstrap] company % failed: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_company_bootstrap ON public.companies;
CREATE TRIGGER trg_company_bootstrap AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.trg_company_bootstrap();

DO $$ DECLARE c record; BEGIN FOR c IN SELECT id FROM public.companies LOOP PERFORM public.seed_accounting_automations(c.id); END LOOP; END $$;