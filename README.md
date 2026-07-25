# rutas-de-aprendizaje

Rutas de aprendizaje — mapas visuales HTML estático (2do ciclo).

8 mapas: Atlas de Estilos, Álgebra Lineal y Geometría Analítica, Java, JavaScript,
Matemática Discreta II, Matemática Superior, Modelado de Negocios (BPM) y POO.

---

## Novedad: sincronización de progreso en la nube (opcional)

Cada mapa guarda el progreso de los subtemas marcados. Ahora ese progreso puede
**sincronizarse con Supabase** para no perderlo al limpiar el navegador y poder
continuar desde otro dispositivo.

- **Funciona sin configuración**: si no se configuran credenciales, el sitio sigue
  operando en modo **local** (solo `localStorage`), igual que antes. Nada se rompe.
- **Bonus**: los 3 mapas que antes *no* persistían progreso (Mate Discreta II,
  Matemática Superior, Modelado de Negocios) ahora también lo guardan.

### Archivos nuevos

| Archivo | Rol |
|---|---|
| `progress-sync.js` | Librería compartida de sincronización (pull/merge/push por polling). |
| `supabase-config.js` | Donde se pegan las credenciales del proyecto Supabase. |
| `schema.sql` | Script SQL para crear la tabla y las políticas (RLS) en Supabase. |

### Configuración (3 pasos)

1. **Crear proyecto** en [supabase.com](https://supabase.com) (plan gratis).
2. **Crear la tabla**: abre *SQL Editor* → pega el contenido de `schema.sql` → *Run*.
3. **Pegar credenciales** en `supabase-config.js`:
   ```js
   window.RUTAS_SUPABASE = {
     url: "https://XXXXX.supabase.co",   // Settings → API → Project URL
     anonKey: "eyJhbGci..."              // Settings → API → "anon public"
   };
   ```
   > Usa **solo** la clave `anon public`. Nunca la `service_role`.

Listo. Al abrir cualquier mapa, el progreso se sube/baja automáticamente (polling
cada 4 s y al salir de la página).

### Compartir progreso entre dispositivos (sin login)

La identidad es un **perfil anónimo** (UUID) guardado en `localStorage`.
Para retomar el mismo progreso en otro dispositivo, abre el mapa con el parámetro
`?p=<perfilId>`:

```
https://<tu-sitio>/Mapa_Java.html?p=11111111-2222-3333-4444-555555555555
```

El `perfilId` se imprime en la consola del navegador con:
```js
RutasSync.profileId
```

### Seguridad

Las políticas RLS permiten lectura/escritura abierta, donde el "secreto" es el
`profile_id` (UUID no adjudicable). Para un control más estricto, activa
**Supabase Auth** y cambia las políticas en `schema.sql` para validar `auth.uid()`.

---

## Estructura

```
index.html            Galería de las 8 rutas (filtro + tema claro/oscuro)
Mapa_*.html (7)       Mapas de aprendizaje con tracking de progreso
Atlas_de_estilos+prompt.html   Catálogo de estilos + referencia de prompts
barra-nav.js          Navegación superior compartida entre mapas
progress-sync.js      Sincronización de progreso (Supabase opcional)
supabase-config.js    Credenciales de Supabase (a completar)
schema.sql            Esquema de la tabla route_progress + RLS
```

## Desarrollo local

Es HTML estático: abre `index.html` directamente o sirve la carpeta con
`python3 -m http.server` / cualquier servidor estático.

---

## Curación de fuentes (pipeline)

Las referencias (videos, libros, práctica) originalmente eran **solo texto** y muchas
no coincidían con fuentes reales. Este pipeline las convierte en **enlaces verificados
a la fuente exacta**. Sigue 6 fases reproducibles, con scripts Node **sin dependencias**.

> Piloto: **Java** (`Mapa_Java.html`, 300 referencias). El resto de mapas se escala
> agregando un adaptador por archivo en `scripts/inventario.mjs`.

### Archivos

| Archivo | Rol |
|---|---|
| `scripts/lib.mjs` | Utilidades (extractor de `DATA`, CSV, `httpStatus`, sugeridor de URLs canónicas). |
| `scripts/inventario.mjs` | **Fase 1**: extrae todas las refs → `data/referencias_raw.csv` + inicializa `data/referencias_curadas.csv` (sembrada con URLs canónicas conocidas y `busqueda_url` preconstruida). |
| `scripts/validar.mjs` | **Fase 6**: HEAD a cada URL → actualiza `status_http` y `ultima_revision`. |
| `scripts/aplicar.mjs` | **Fase 5**: parcha los campos `url` (y `titulo_canonico`) en `DATA` del HTML. Idempotente. |
| `data/referencias_curadas.csv` | **Fuente única de gobierno** (fase 6). Una fila por referencia. |

### Flujo de trabajo

```bash
# 1) Generar inventario (sembrado con ~92 URLs canónicas ya verificadas)
node scripts/inventario.mjs

# 2) Curar en data/referencias_curadas.csv (Excel/Sheets/VS Code):
#    - abre la columna busqueda_url (búsqueda YouTube/Google ya armada)
#    - pega la URL exacta en url_directa_final
#    - cambia estado: sugerido -> verificado (o no_existe)

# 3) Validar que ningún enlace esté roto
node scripts/validar.mjs

# 4) Integrar al HTML (sólo filas con estado=verificado)
node scripts/aplicar.mjs
```

Columnas de `data/referencias_curadas.csv`:
`id, archivo, unidad, subtema, seccion, tipo, titulo_visible, autor_canal, cita,
url_actual, busqueda_url, estado, titulo_canonico, url_directa_final, dominio_fuente,
nivel_confianza, status_http, ultima_revision, notas`

### Regla editorial (obligatoria para recursos nuevos)

> **Todo recurso nuevo debe tener: título canónico + fuente oficial + URL directa verificada.**
> Sin `url_directa_final` verificada, el recurso se muestra como texto plano (sin enlace)
> y con etiqueta *pendiente*.

El `id` es estable (`archivo:subtema:seccion:indice`) y el render del mapa muestra `<a href>`
sólo si el objeto tiene `url`; por eso se puede curar de forma incremental sin romper nada.
