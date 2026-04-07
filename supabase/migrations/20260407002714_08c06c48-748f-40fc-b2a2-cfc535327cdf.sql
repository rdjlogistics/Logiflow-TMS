
-- 1. driver_availability: fix "Drivers can manage own availability"
DROP POLICY IF EXISTS "Drivers can manage own availability" ON public.driver_availability;
CREATE POLICY "Drivers can manage own availability" ON public.driver_availability
FOR ALL TO authenticated
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- 2. shift_applications: fix all 3 driver policies
DROP POLICY IF EXISTS "Drivers can view own applications" ON public.shift_applications;
CREATE POLICY "Drivers can view own applications" ON public.shift_applications
FOR SELECT TO authenticated
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Drivers can create own applications" ON public.shift_applications;
CREATE POLICY "Drivers can create own applications" ON public.shift_applications
FOR INSERT TO authenticated
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Drivers can cancel own pending applications" ON public.shift_applications;
CREATE POLICY "Drivers can cancel own pending applications" ON public.shift_applications
FOR UPDATE TO authenticated
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()) AND status = 'pending');

-- 3. driver_scores: fix "Drivers can view own score"
DROP POLICY IF EXISTS "Drivers can view own score" ON public.driver_scores;
CREATE POLICY "Drivers can view own score" ON public.driver_scores
FOR SELECT TO authenticated
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- 4. driver_locations: fix driver INSERT and UPDATE policies
DROP POLICY IF EXISTS "Drivers can insert their own locations" ON public.driver_locations;
CREATE POLICY "Drivers can insert their own locations" ON public.driver_locations
FOR INSERT TO authenticated
WITH CHECK (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR (
    has_role_cached(auth.uid(), 'admin') AND EXISTS (
      SELECT 1 FROM trips t WHERE t.id = driver_locations.trip_id AND t.company_id = get_user_company_cached(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Drivers can update their own locations" ON public.driver_locations;
CREATE POLICY "Drivers can update their own locations" ON public.driver_locations
FOR UPDATE TO authenticated
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- 5. Fix driver_locations SELECT policy (also had driver_id = auth.uid())
DROP POLICY IF EXISTS "Staff can view driver locations" ON public.driver_locations;
CREATE POLICY "Staff can view driver locations" ON public.driver_locations
FOR SELECT TO authenticated
USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  OR (
    (has_role_cached(auth.uid(), 'admin') OR has_role_cached(auth.uid(), 'medewerker'))
    AND EXISTS (
      SELECT 1 FROM trips t WHERE t.id = driver_locations.trip_id AND t.company_id = get_user_company_cached(auth.uid())
    )
  )
);
