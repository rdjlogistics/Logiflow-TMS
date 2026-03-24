
Doel: dit is niet “waarschijnlijk”, maar wat nu aantoonbaar uit code + database blijkt.

1. Waar horen nieuwe accounts opgeslagen te worden?
- Primair: `auth.users`
- Gespiegeld voor app-data: `public.profiles`
- Rollen: `public.user_roles`

Kort:
- account bestaat = `auth.users`
- app-profiel zichtbaar in database/UI = `public.profiles`
- rechten = `public.user_roles`

2. Exacte huidige code die de insert doet

Frontend signup op `/auth`:
```ts
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/`,
    data: {
      full_name: fullName,
      ...(planSlug ? { selected_plan: planSlug } : {}),
      ...(fingerprint ? { browser_fingerprint: fingerprint } : {}),
    },
  },
});
```

Driver onboarding signup:
```ts
const { data: authData, error: signUpError } = await supabase.auth.signUp({
  email: data.email.trim().toLowerCase(),
  password: data.password,
  options: {
    emailRedirectTo: `${window.location.origin}/driver`,
    data: {
      full_name: data.name,
      phone: data.phone,
      date_of_birth: data.dateOfBirth?.toISOString(),
      role: 'driver',
    },
  },
});
```

Database trigger functie die profiel insert hoort te doen:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);

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
$function$
```

Migrationbestand dat de trigger hoort te maken:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

3. Exacte logs van mislukte inserts van vandaag en gisteren
Gevonden logs:
```text
auth_logs (laatste 7 dagen, signup/errors): []
postgres_logs (laatste 7 dagen, handle_new_user/profiles/user_roles): []
```

Dus: er zijn geen “failed insert” logs, omdat er in de huidige omgeving geen actieve trigger-call plaatsvond.

4. Bewezen root cause
Bewezen met database-state, niet met gokwerk:

- `auth.users` heeft accounts van vandaag/gisteren:
```text
2026-03-24 10:01:33  info@miranze.com   id=004f8ed6-de3a-41f4-9380-7c33c36ba219
2026-03-23 21:38:39  roberto@test.nl    id=7c9c664d-f8e7-41d6-ba76-33315c684768
2026-03-23 18:26:46  rdjhomo@gay.nl     id=46b05913-cbb7-426d-ad63-6322677a12aa
```

- `public.profiles` voor deze accounts zijn pas later in bulk aangemaakt:
```text
2026-03-24 19:27:07  info@miranze.com
2026-03-24 19:27:07  roberto@test.nl
2026-03-24 19:27:07  rdjhomo@gay.nl
```

- Actieve triggers op `auth.users` in huidige omgeving:
```text
[]
```

Conclusie:
```text
De root cause is NIET een mislukte profile insert.
De root cause is dat de trigger op `auth.users` in de huidige omgeving ontbreekt.
Daardoor werd `public.handle_new_user()` niet uitgevoerd bij signup.
Gevolg: accounts kwamen wel in `auth.users`, maar niet automatisch in `public.profiles` / `public.user_roles`.
De bulk backfill van 2026-03-24 19:27:07 heeft ze achteraf toegevoegd.
```

5. Fix die ik ga doorvoeren
Ik ga dit waterdicht maken met 1 gerichte database-fix:

Stap A — trigger hard herstellen
- `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`
- trigger opnieuw aanmaken op `auth.users`

Stap B — functie hardenen
- `handle_new_user()` idempotent maken met `ON CONFLICT`
- profiel altijd aanmaken/updaten op `user_id`
- rolinsert veilig houden met `ON CONFLICT DO NOTHING`

Stap C — ontbrekende accounts opnieuw synchroniseren
- alle ontbrekende users uit `auth.users` backfillen naar `public.profiles`
- ontbrekende rollen aanvullen waar nodig

Veilige eindtoestand:
```text
signup -> auth.users insert
      -> trigger fired
      -> profiles upsert
      -> user_roles insert/upsert
```

6. Live testaccount aanmaken
Na goedkeuring voer ik dit uit in deze volgorde:
1. database-fix toepassen
2. nieuw testaccount aanmaken via de app
3. direct queryen op:
   - `auth.users`
   - `public.profiles`
   - `public.user_roles`

7. Bewijs dat het in de database staat
Ik lever daarna exact deze bewijzen op:
```sql
select id, email, created_at
from auth.users
where email = '<test-email>';

select user_id, email, full_name, created_at
from public.profiles
where email = '<test-email>';

select user_id, role
from public.user_roles
where user_id = '<same-user-id>';
```

Technische noot
- De eerdere “fix” bestond wel als migrationbestand, maar is aantoonbaar niet actief in de huidige omgeving, omdat `information_schema.triggers` voor `auth.users` leeg terugkomt.
- Daarom was de echte fout niet “de functie-inhoud”, maar “de trigger ontbreekt / draait niet in de huidige omgeving”.

Implementatieplan
1. Defensieve migration maken: trigger droppen + opnieuw aanmaken
2. `handle_new_user()` idempotent maken
3. Missing profiles + roles backfillen
4. Nieuwe signup uitvoeren
5. Bewijs leveren met exacte rows uit `auth.users`, `public.profiles`, `public.user_roles`
