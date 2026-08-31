# Rutas de Aprendizaje

Plataforma educativa de **Rutas de Aprendizaje** (Learning Paths) que ofrece mapas de conocimiento visuales e interactivos para programación, matemáticas y negocios. Diseñada con una estética brutalista e industrial.

## Características Principales

*   **Mapas Interactivos:** Rutas detalladas de aprendizaje en HTML estático para múltiples disciplinas (Java, JavaScript, Álgebra Lineal, Matemática Discreta, Matemática Superior, POO, y Modelado de Negocios).
*   **Seguimiento de Progreso:** Dashboard integrado que guarda el progreso de aprendizaje localmente (vía `localStorage`) y en la nube de forma opcional (sincronización con Supabase).
*   **Modo Claro/Oscuro:** Temas brutalistas con soporte para `prefers-color-scheme` y toggle manual.
*   **Backend API REST:** Servidor opcional en Express/Node.js para el manejo de mapas de conocimiento adicionales y subida de archivos adjuntos (PDFs, imágenes).
*   **Integración con Supabase:** Esquema de base de datos relacional (PostgreSQL) para gestionar mapas, unidades, recursos y el progreso de usuarios de forma remota.

## Tecnologías Utilizadas

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript.
*   **Backend:** Node.js, Express, Multer (para subida de archivos).
*   **Base de Datos / Backend-as-a-Service:** Supabase (PostgreSQL), scripts SQL para migración (`schema.sql`, `seed.sql`).
*   **Herramientas de Scripting:** Node.js (Módulos ES) para transformación de datos (carpeta `scripts/`).

## Estructura del Proyecto

*   `index.html`: Página principal con el listado y buscador de todas las rutas de aprendizaje disponibles.
*   `Mapa_*.html`: Archivos estáticos individuales para cada ruta de aprendizaje.
*   `server.js`: Servidor de backend Express que expone la API REST (`/api/mapas`) y sirve archivos estáticos.
*   `progress-sync.js`: Lógica del cliente para el seguimiento del progreso y sincronización híbrida (local/nube).
*   `supabase-config.js`: Archivo de configuración para las credenciales del cliente de Supabase.
*   `schema.sql` / `seed.sql`: Estructura inicial y datos pre-cargados para Supabase.
*   `scripts/`: Scripts utilitarios (ej. `aplicar.mjs`, `import.mjs`) para gestionar, validar y poblar datos en los mapas y la base de datos.
*   `barra-nav.js`: Barra de navegación brutalista global para inyectar en todas las vistas de mapas.

## Instalación y Uso

### 1. Despliegue Estático (Frontend)

El sitio principal puede funcionar 100% de manera estática. Simplemente abre `index.html` en un navegador o sírvelo usando cualquier servidor HTTP básico (como Live Server o `npx serve`).

### 2. Ejecutar el Servidor Node.js (Backend Opcional)

Si deseas utilizar la API REST para la subida de archivos y la gestión dinámica de mapas en memoria:

```bash
# Instalar dependencias
npm install

# Iniciar el servidor (Puerto 3000 por defecto)
node server.js
```

El servidor estará disponible en `http://localhost:3000`.

### 3. Configurar Supabase (Opcional)

Para habilitar la sincronización del progreso en la nube:

1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ve al **SQL Editor** y ejecuta primero `schema.sql` y luego `seed.sql` para generar las tablas y llenarlas de datos.
3. Actualiza el archivo `supabase-config.js` con tu **URL** y **Anon Key** (disponibles en la configuración de la API de tu proyecto).

## Licencia

[ISC](https://choosealicense.com/licenses/isc/)
