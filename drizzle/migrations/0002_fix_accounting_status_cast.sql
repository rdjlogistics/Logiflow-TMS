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
  INSERT INTO public.finance_transactions(company_id, transaction_type, status, transaction_date, description, amount, vat_amount, trip_id, customer_id, external_id, is_billable)
  VALUES (p_trip.company_id, 'revenue', (CASE WHEN p_finalize THEN 'approved' ELSE 'pending' END)::finance_transaction_status, now(), 'Verwachte omzet ' || v_desc, v_sub, v_vat, p_trip.id, p_trip.customer_id, 'trip-revenue:' || p_trip.id, true)
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
      v_sub, 21, v_vat, v_sub + v_vat, 0, (CASE WHEN p_finalize THEN 'verzonden' ELSE 'concept' END)::invoice_status,
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
REVOKE ALL ON FUNCTION public.sync_trip_accounting(public.trips, boolean) FROM public, anon, authenticated;