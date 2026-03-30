
-- Trigger function for trips table events → workflow engine
CREATE OR REPLACE FUNCTION public.trigger_workflow_on_trip_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trigger_type TEXT;
  v_trigger_data JSONB;
  v_edge_url TEXT;
BEGIN
  v_edge_url := 'https://spycblsfcktsnepsdssv.supabase.co/functions/v1/execute-workflow';

  IF TG_OP = 'INSERT' THEN
    v_trigger_type := 'order_created';
    v_trigger_data := jsonb_build_object(
      'trip_id', NEW.id,
      'order_number', NEW.order_number,
      'status', NEW.status,
      'customer_id', NEW.customer_id,
      'company_id', NEW.company_id
    );

    PERFORM net.http_post(
      url := v_edge_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'trigger_type', v_trigger_type,
        'trigger_data', v_trigger_data,
        'tenant_id', NEW.company_id
      )
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_trigger_type := 'order_status_changed';
      v_trigger_data := jsonb_build_object(
        'trip_id', NEW.id,
        'order_number', NEW.order_number,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'customer_id', NEW.customer_id,
        'company_id', NEW.company_id
      );

      PERFORM net.http_post(
        url := v_edge_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'trigger_type', v_trigger_type,
          'trigger_data', v_trigger_data,
          'tenant_id', NEW.company_id
        )
      );
    END IF;

    -- Driver assigned
    IF OLD.driver_id IS DISTINCT FROM NEW.driver_id AND NEW.driver_id IS NOT NULL THEN
      v_trigger_type := 'driver_assigned';
      v_trigger_data := jsonb_build_object(
        'trip_id', NEW.id,
        'order_number', NEW.order_number,
        'driver_id', NEW.driver_id,
        'customer_id', NEW.customer_id,
        'company_id', NEW.company_id
      );

      PERFORM net.http_post(
        url := v_edge_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'trigger_type', v_trigger_type,
          'trigger_data', v_trigger_data,
          'tenant_id', NEW.company_id
        )
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on trips
DROP TRIGGER IF EXISTS trg_workflow_trip_events ON public.trips;
CREATE TRIGGER trg_workflow_trip_events
  AFTER INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_workflow_on_trip_event();

-- Trigger function for invoices table → workflow engine
CREATE OR REPLACE FUNCTION public.trigger_workflow_on_invoice_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    'total_amount', NEW.total_incl_btw
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
$$;

-- Create trigger on invoices
DROP TRIGGER IF EXISTS trg_workflow_invoice_events ON public.invoices;
CREATE TRIGGER trg_workflow_invoice_events
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_workflow_on_invoice_event();
