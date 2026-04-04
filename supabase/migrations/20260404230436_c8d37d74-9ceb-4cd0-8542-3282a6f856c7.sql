
-- Enable realtime for all tables that the app subscribes to
-- Only trips is currently enabled; these are all missing

DO $$
BEGIN
  -- Core operational tables
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customer_submissions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_submissions;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'invoices') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'driver_locations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dispatch_conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_conversations;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dispatch_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_messages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'stop_proofs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stop_proofs;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'route_stops') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.route_stops;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'case_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.case_messages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'driver_documents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_documents;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customer_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'company_connections') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_connections;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'order_documents') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_documents;
  END IF;

  -- Audit/monitoring tables (for live dashboards)
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'financial_audit_log') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_audit_log;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customer_portal_audit_log') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_portal_audit_log;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chatgpt_audit_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chatgpt_audit_logs;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'driver_document_access_log') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_document_access_log;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'detected_anomalies') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.detected_anomalies;
  END IF;
END $$;
