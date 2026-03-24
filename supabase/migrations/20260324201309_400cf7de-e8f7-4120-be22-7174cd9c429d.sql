-- Step 1: Make handle_new_user() idempotent with ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Upsert profile: always create or update
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = COALESCE(EXCLUDED.email, profiles.email);

  -- Assign admin role UNLESS this is an invited/special user
  IF NOT (
    COALESCE((NEW.raw_user_meta_data->>'is_driver')::boolean, false) OR
    COALESCE((NEW.raw_user_meta_data->>'is_carrier_contact')::boolean, false) OR
    COALESCE((NEW.raw_user_meta_data->>'is_customer')::boolean, false) OR
    NEW.raw_user_meta_data->>'invited_by' IS NOT NULL
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Step 2: Recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();