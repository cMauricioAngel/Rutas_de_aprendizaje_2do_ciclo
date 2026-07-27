# Rutas de Aprendizaje

Mapas visuales interactivos para materias del 2do ciclo universitario.

## 📚 Mapas Disponibles

| Mapa | Descripción |
|------|-------------|
| [Java](maps/java.html) | Programación orientada a objetos con Java |
| [JavaScript](maps/javascript.html) | Desarrollo web frontend y backend |
| [Álgebra Lineal](maps/algebra-lineal.html) | Vectores, matrices y geometría analítica |
| [Matemática Discreta](maps/mate-discreta.html) | Lógica, conjuntos y grafos |
| [Matemática Superior](maps/mate-superior.html) | Cálculo avanzado y ecuaciones diferenciales |
| [Modelado de Negocios](maps/modelado-negocios.html) | BPMN y procesos empresariales |
| [POO](maps/poo.html) | Fundamentos de programación orientada a objetos |

## ✨ Características

- ✅ **Progreso sincronizado**: Guarda tu avance en la nube con Supabase
- ✅ **Funciona offline**: Los datos se guardan localmente si no hay conexión
- ✅ **Multi-dispositivo**: Continúa donde lo dejaste desde cualquier lugar
- ✅ **Diseño responsive**: Funciona en desktop y móvil

## 🚀 Inicio Rápido

### Opción 1: GitHub Pages (Recomendado)
1. Ve a Settings → Pages
2. Activa GitHub Pages en la rama `main`
3. Accede a `https://tu-usuario.github.io/tu-repo`

### Opción 2: Servidor Local
```bash
# Python
python -m http.server 8000

# Node.js
npx serve
```

### Opción 3: Abrir directamente
Simplemente abre `index.html` en tu navegador.

## 🔧 Configurar Sincronización (Opcional)

El proyecto funciona perfectamente sin configuración. Para habilitar la sincronización en la nube:

1. Crea un proyecto gratuito en [Supabase](https://supabase.com)
2. Ejecuta el script `schema.sql` en el SQL Editor
3. Copia tus credenciales en `assets/js/supabase-client.js`:

```js
window.RUTAS_SUPABASE = {
  url: "https://XXXXX.supabase.co",
  anonKey: "eyJhbGci..."
};
```

> ⚠️ Usa solo la clave `anon public`, nunca la `service_role`.

## 📁 Estructura del Proyecto

```
├── index.html              # Página principal
├── maps/                   # Mapas de aprendizaje
│   ├── java.html
│   ├── javascript.html
│   └── ...
├── assets/
│   ├── js/                 # Scripts JavaScript
│   │   ├── main.js
│   │   ├── progress-sync.js
│   │   └── supabase-client.js
│   ├── css/                # Estilos personalizados
│   └── img/                # Imágenes y recursos
├── scripts/                # Utilidades CLI (Node.js)
│   ├── lib.mjs
│   ├── validar.mjs
│   ├── inventario.mjs
│   └── aplicar.mjs
├── docs/                   # Documentación adicional
│   └── atlas-estilos.html
├── schema.sql              # Esquema de base de datos
└── README.md
```

## 🛠️ Scripts de Utilidad

Los scripts en `/scripts` son herramientas CLI para mantenimiento:

```bash
# Validar integridad de datos
node scripts/validar.mjs

# Generar inventario de recursos
node scripts/inventario.mjs

# Aplicar cambios masivos
node scripts/aplicar.mjs
```

## 🎨 Atlas de Estilos

Consulta la guía completa de estilos en [docs/atlas-estilos.html](docs/atlas-estilos.html)

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) si existe.

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
