

## Probleem

De preview kan niet opstarten omdat het bestand `lovable.toml` ontbreekt. Dit bestand vertelt het build-systeem welk commando het moet gebruiken om de dev-server te starten. Zonder dit bestand krijg je de foutmelding "no command found for task dev".

## Oplossing

**1 bestand aanmaken: `lovable.toml`**

```toml
[run]
dev = "npx vite --host 0.0.0.0 --port 8080"
```

Dit is het enige wat nodig is om de preview weer werkend te krijgen. Het koppelt het `dev` commando aan Vite, de bundler die dit project gebruikt.

