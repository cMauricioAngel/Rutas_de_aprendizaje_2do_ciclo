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
