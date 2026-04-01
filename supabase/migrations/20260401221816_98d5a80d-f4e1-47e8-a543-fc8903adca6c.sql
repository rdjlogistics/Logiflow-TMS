
CREATE OR REPLACE FUNCTION public.trigger_workflow_on_invoice_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_edge_url TEXT;
  v_trigger_data JSONB;
BEGIN
  v_edge_url := 'https://spycblsfcktsnepsdssv.supabase.co/functions/v1/execute-workflow';

  v_trigger_data := jsonb_build_object(
    'invoice_id', NEW.id,
    'invoice_number', NEW.invoice_number,
    'customer_id', NEW.customer_id,
    'company_id', NEW.company_id,
    'total_amount', NEW.total_amount
  );

  PERFORM net.http_post(
    url := v_edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'trigger_type', 'invoice_created',
      'trigger_data', v_trigger_data,
      'tenant_id', NEW.company_id
    )
  );

  RETURN NEW;
END;
$function$;
