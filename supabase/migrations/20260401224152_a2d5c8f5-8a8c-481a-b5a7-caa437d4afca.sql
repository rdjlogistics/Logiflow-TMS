ALTER TABLE public.webauthn_credentials 
  ADD COLUMN IF NOT EXISTS last_challenge text,
  ADD COLUMN IF NOT EXISTS challenge_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz;