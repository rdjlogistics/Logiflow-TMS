

## Plan: Herstel database trigger & backfill profielen

### Stap 1: Database migratie — Trigger herstellen + profielen aanvullen

Eén migratie met twee onderdelen:

1. **Trigger opnieuw aanmaken** op `auth.users` zodat nieuwe registraties automatisch een profiel krijgen
2. **Backfill** van ontbrekende profielen voor bestaande gebruikers

```sql
-- 1. Trigger herstellen
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Ontbrekende profielen aanvullen
INSERT INTO public.profiles (user_id, full_name, email)
SELECT u.id, u.raw_user_meta_data->>'full_name', u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL
ON CONFLICT DO NOTHING;
```

Geen codewijzigingen nodig — alleen een database-fix.

