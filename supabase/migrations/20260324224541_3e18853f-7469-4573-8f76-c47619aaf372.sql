
-- Add unique constraint on (tenant_id, date) for upsert support
ALTER TABLE public.ai_usage_daily_rollup
  ADD CONSTRAINT ai_usage_daily_rollup_tenant_date_unique UNIQUE (tenant_id, date);

-- Create the rollup refresh function
CREATE OR REPLACE FUNCTION public.refresh_ai_usage_daily_rollup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.ai_usage_daily_rollup (tenant_id, date, total_credits, total_tokens, total_requests, unique_users, cost_estimate_eur)
  SELECT
    tenant_id,
    (created_at AT TIME ZONE 'UTC')::date AS usage_date,
    COALESCE(SUM(credits_used), 0),
    COALESCE(SUM(tokens_used), 0),
    COUNT(*)::integer,
    COUNT(DISTINCT user_id)::integer,
    COALESCE(SUM(credits_used), 0) * 0.01
  FROM public.ai_credit_transactions
  WHERE (created_at AT TIME ZONE 'UTC')::date >= CURRENT_DATE - INTERVAL '2 days'
  GROUP BY tenant_id, usage_date
  ON CONFLICT (tenant_id, date)
  DO UPDATE SET
    total_credits = EXCLUDED.total_credits,
    total_tokens = EXCLUDED.total_tokens,
    total_requests = EXCLUDED.total_requests,
    unique_users = EXCLUDED.unique_users,
    cost_estimate_eur = EXCLUDED.cost_estimate_eur;
END;
$$;
