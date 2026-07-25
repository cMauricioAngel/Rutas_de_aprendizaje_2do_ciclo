# Changelog

Cambios relevantes del proyecto. Formado por versión/fecha + tipo (`feat`, `fix`, `docs`).

## [Pendiente] — Curación de fuentes (piloto Java)
- `feat`: pipeline de curación de referencias en 6 fases (sin dependencias).
  - `scripts/lib.mjs` (extractor de `DATA`, CSV RFC 4180, `httpStatus`, sugeridor de URLs canónicas).
  - `scripts/inventario.mjs` → `data/referencias_raw.csv` + `data/referencias_curadas.csv` (sembrada).
  - `scripts/validar.mjs` (HEAD de URLs → `status_http`/`ultima_revision`).
  - `scripts/aplicar.mjs` (parcha `url`/`titulo_canonico` en `DATA` del HTML; idempotente).
- `feat`: `Mapa_Java.html` renderiza cada referencia como `<a href target=_blank rel=noopener>` si tiene `url` (+ CSS `.ref-list a`).
- `docs`: README con regla editorial y documentación del pipeline.
- `fix`: URL canónica de *Think Java* corregida (`greenteapress.com`, no `.org`).
- Estado del piloto: 300 refs inventariadas, 92 URLs canónicas sembradas y verificadas (200 OK), 208 pendientes (videos, requieren verificación humana).

## 2026-07-25 — Dashboard + multi-dispositivo
- `feat`: dashboard de progreso global en `index.html` (% + barra + "X/156 temas").
- `feat`: barra mini de progreso por tarjeta + indicador `☁ Sincronizado`/`● Modo local`.
- `feat`: botón "Copiar enlace de mi progreso" (multi-dispositivo vía `?p=`).
- `feat`: `progress-sync.js` expone `fetchAll(routes)` para el dashboard.

## 2026-07-25 — Sincronización en la nube (Supabase)
- `feat`: `progress-sync.js` — sincronización de progreso con Supabase (pull/merge/push por polling, fallback local).
- `feat`: `supabase-config.js` + `schema.sql` (tabla `route_progress` + RLS).
- `feat`: adaptador de sync en los 7 mapas (Java, JS, Álgebra, POO, Discreta II, Superior, Modelado).
- `feat`: los 3 mapas sin persistencia (Discreta II, Superior, Modelado) ahora guardan progreso.
- `feat`: multi-dispositivo anónimo por perfil UUID compartible con `?p=<id>`.
