DO $$
DECLARE r record;
  anon_keep text[] := ARRAY['get_tracking_by_token','validate_tracking_token','get_driver_location_by_token','verify_signature_otp','set_signature_otp',
    'has_role','has_role_cached','get_user_company','get_user_company_cached','get_user_company_ids','user_belongs_to_company','user_in_same_tenant',
    'driver_belongs_to_user_tenant','get_customer_for_user','get_carrier_id_for_user','get_carrier_tenant_id','can_view_customer_contact_details','are_companies_connected'];
  system_only text[] := ARRAY['enqueue_email','read_email_batch','delete_email','move_to_dlq','expire_subscriptions','refresh_ai_usage_daily_rollup',
    'handle_new_user','accounting_enabled','seed_accounting_automations','log_accounting_run','sync_trip_accounting','apply_bank_payment',
    'trg_trip_accounting','trg_bank_auto_match','trg_company_bootstrap','trigger_workflow_on_invoice_event','trigger_workflow_on_trip_event',
    'auto_create_customer_settings','auto_create_trip_from_submission','log_accounting_credential_access','log_bank_transaction_access','log_carrier_changes',
    'log_customer_changes','log_customer_data_access','log_finance_transaction_access','log_financial_access','log_pod_upload','log_rate_contract_access',
    'get_accounting_credentials','get_fuel_card_credentials','store_accounting_credentials','store_api_connector_credentials','store_fuel_card_credentials','delete_accounting_credentials'];
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS sig, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.prosecdef LOOP
    IF NOT (r.proname = ANY(anon_keep)) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
      IF NOT (r.proname = ANY(system_only)) THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
      ELSE
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.sig);
      END IF;
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    END IF;
  END LOOP;
END $$;