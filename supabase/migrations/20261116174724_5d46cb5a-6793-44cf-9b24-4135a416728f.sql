CREATE OR REPLACE FUNCTION public.trigger_workflow_on_invoice_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_edge_url TEXT := 'https://mlhcjccvgsexkwryfcnp.supabase.co/functions/v1/execute-workflow';
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := v_edge_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), '')
      ),
      body := jsonb_build_object(
        'trigger_type', 'invoice_created',
        'trigger_data', jsonb_build_object(
          'invoice_id', NEW.id,
          'invoice_number', NEW.invoice_number,
          'customer_id', NEW.customer_id,
          'company_id', NEW.company_id,
          'total_amount', NEW.total_amount
        ),
        'tenant_id', NEW.company_id
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[workflow] invoice trigger dispatch failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_workflow_on_trip_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_edge_url TEXT := 'https://mlhcjccvgsexkwryfcnp.supabase.co/functions/v1/execute-workflow';
  v_events JSONB := '[]'::jsonb;
  v_event JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_events := v_events || jsonb_build_array(jsonb_build_object(
      'trigger_type', 'order_created',
      'trigger_data', jsonb_build_object(
        'trip_id', NEW.id, 'order_number', NEW.order_number, 'status', NEW.status,
        'customer_id', NEW.customer_id, 'company_id', NEW.company_id)));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_events := v_events || jsonb_build_array(jsonb_build_object(
        'trigger_type', 'order_status_changed',
        'trigger_data', jsonb_build_object(
          'trip_id', NEW.id, 'order_number', NEW.order_number,
          'old_status', OLD.status, 'new_status', NEW.status,
          'customer_id', NEW.customer_id, 'company_id', NEW.company_id)));
    END IF;
    IF OLD.driver_id IS DISTINCT FROM NEW.driver_id AND NEW.driver_id IS NOT NULL THEN
      v_events := v_events || jsonb_build_array(jsonb_build_object(
        'trigger_type', 'driver_assigned',
        'trigger_data', jsonb_build_object(
          'trip_id', NEW.id, 'order_number', NEW.order_number, 'driver_id', NEW.driver_id,
          'customer_id', NEW.customer_id, 'company_id', NEW.company_id)));
    END IF;
  END IF;

  FOR v_event IN SELECT * FROM jsonb_array_elements(v_events) LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_edge_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), '')
        ),
        body := v_event || jsonb_build_object('tenant_id', NEW.company_id)
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[workflow] trip trigger dispatch failed: %', SQLERRM;
    END;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$function$;