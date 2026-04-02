
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_invoices_company_due ON invoices(company_id, due_date) WHERE status != 'betaald';
CREATE INDEX IF NOT EXISTS idx_route_stops_trip ON route_stops(trip_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recent ON driver_locations(driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON customer_submissions(status, created_at DESC);

-- Dashboard ops RPC
CREATE OR REPLACE FUNCTION public.get_dashboard_ops(
  p_company_id uuid,
  p_month_start timestamptz,
  p_six_months_ago timestamptz
)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH today_range AS (
    SELECT date_trunc('day', now()) AS d_start, 
           date_trunc('day', now()) + interval '1 day' - interval '1 second' AS d_end
  ),
  six_weeks_ago AS (
    SELECT (now() - interval '6 weeks')::timestamptz AS cutoff
  ),
  revenue AS (
    SELECT to_char(created_at, 'YYYY-MM') AS month_key,
      COALESCE(SUM(sales_total), 0) AS revenue,
      COALESCE(SUM(purchase_total), 0) AS costs
    FROM trips
    WHERE company_id = p_company_id AND deleted_at IS NULL
      AND created_at >= p_six_months_ago
    GROUP BY month_key
  ),
  status_counts AS (
    SELECT status::text, COUNT(*)::int AS cnt
    FROM trips
    WHERE company_id = p_company_id AND deleted_at IS NULL
      AND trip_date >= (SELECT cutoff FROM six_weeks_ago)
    GROUP BY status
  ),
  weekly AS (
    SELECT date_trunc('week', trip_date)::date AS week_start, COUNT(*)::int AS trips
    FROM trips
    WHERE company_id = p_company_id AND deleted_at IS NULL
      AND trip_date >= (SELECT cutoff FROM six_weeks_ago)
    GROUP BY week_start ORDER BY week_start
  ),
  today_trips AS (
    SELECT id, status::text AS status, driver_id, vehicle_id, order_number, pickup_city, delivery_city
    FROM trips
    WHERE company_id = p_company_id AND deleted_at IS NULL
      AND trip_date >= (SELECT d_start FROM today_range) AND trip_date <= (SELECT d_end FROM today_range)
  ),
  pod_missing AS (
    SELECT id, order_number, pickup_city, delivery_city
    FROM trips
    WHERE company_id = p_company_id AND deleted_at IS NULL
      AND status IN ('afgerond', 'gecontroleerd') AND pod_available = false
      AND trip_date >= (SELECT cutoff FROM six_weeks_ago)
    LIMIT 10
  ),
  ops AS (
    SELECT
      COUNT(*) FILTER (WHERE status NOT IN ('geannuleerd','afgerond','afgeleverd','gecontroleerd','gefactureerd') AND driver_id IS NULL)::int AS chauffeur_nodig,
      COUNT(*) FILTER (WHERE status = 'onderweg')::int AS onderweg,
      COUNT(*) FILTER (WHERE status IN ('afgeleverd','afgerond','gecontroleerd','gefactureerd'))::int AS afgeleverd,
      COUNT(*) FILTER (WHERE status NOT IN ('geannuleerd','afgerond','afgeleverd','gecontroleerd','gefactureerd') AND driver_id IS NULL AND vehicle_id IS NULL)::int AS at_risk
    FROM today_trips
  ),
  ready_to_invoice AS (
    SELECT COUNT(*)::int AS cnt FROM trips
    WHERE company_id = p_company_id AND deleted_at IS NULL AND status IN ('afgerond', 'gecontroleerd')
      AND trip_date >= (SELECT cutoff FROM six_weeks_ago)
  ),
  completed AS (
    SELECT COUNT(*)::int AS cnt FROM trips
    WHERE company_id = p_company_id AND deleted_at IS NULL
      AND status IN ('afgerond','afgeleverd','gecontroleerd','gefactureerd')
      AND trip_date >= (SELECT cutoff FROM six_weeks_ago)
  )
  SELECT json_build_object(
    'revenue', (SELECT COALESCE(json_agg(json_build_object('month_key', month_key, 'revenue', revenue, 'costs', costs)), '[]'::json) FROM revenue),
    'status_counts', (SELECT COALESCE(json_object_agg(status, cnt), '{}'::json) FROM status_counts),
    'weekly', (SELECT COALESCE(json_agg(json_build_object('week_start', week_start, 'trips', trips)), '[]'::json) FROM weekly),
    'ops', (SELECT row_to_json(ops) FROM ops),
    'pod_missing_count', (SELECT COUNT(*)::int FROM pod_missing),
    'ready_to_invoice', (SELECT cnt FROM ready_to_invoice),
    'completed_count', (SELECT cnt FROM completed),
    'unassigned_today', (SELECT COALESCE(json_agg(json_build_object('id', id, 'order_number', order_number, 'pickup_city', pickup_city, 'delivery_city', delivery_city)), '[]'::json) FROM today_trips WHERE driver_id IS NULL AND status NOT IN ('geannuleerd','afgerond','afgeleverd','gecontroleerd','gefactureerd')),
    'pod_missing_items', (SELECT COALESCE(json_agg(json_build_object('id', id, 'order_number', order_number, 'pickup_city', pickup_city, 'delivery_city', delivery_city)), '[]'::json) FROM pod_missing)
  );
$$;

-- Driver locations with names RPC
CREATE OR REPLACE FUNCTION public.get_driver_locations_with_names(p_max_age_minutes int DEFAULT 60)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH recent AS (
    SELECT DISTINCT ON (driver_id)
      driver_id, trip_id, latitude, longitude, heading, speed, accuracy, recorded_at
    FROM driver_locations
    WHERE recorded_at >= (now() - (p_max_age_minutes || ' minutes')::interval)
    ORDER BY driver_id, recorded_at DESC
  )
  SELECT COALESCE(json_agg(json_build_object(
    'driver_id', r.driver_id,
    'driver_name', COALESCE(p.full_name, d.name, 'Chauffeur ' || LEFT(r.driver_id::text, 6)),
    'phone', d.phone,
    'trip_id', r.trip_id,
    'latitude', r.latitude,
    'longitude', r.longitude,
    'heading', r.heading,
    'speed', r.speed,
    'accuracy', r.accuracy,
    'recorded_at', r.recorded_at
  )), '[]'::json)
  FROM recent r
  LEFT JOIN profiles p ON p.user_id = r.driver_id
  LEFT JOIN drivers d ON d.user_id = r.driver_id;
$$;
