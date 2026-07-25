// scripts/curar_fuentes.mjs — Pipeline automático de curación de fuentes.
// Extrae referencias de TODOS los mapas HTML, genera URLs de búsqueda,
// identifica fuentes canónicas, verifica HTTP status y aplica URLs clickables.
//
// Uso:  node scripts/curar_fuentes.mjs [--mapa=Mapa_X.html] [--verificar]
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { parseCSV, toCSV, csvEscape } from "./lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

// Mapas de aprendizaje disponibles con sus variables de datos
const MAPAS = [
  { file: "Mapa_Java.html", var: "DATA" },
  { file: "Mapa_Javascript.html", var: "DATA" },
  { file: "Mapa_Mate_superior.html", var: "syllabusData" },
  { file: "Mapa_Modelado_de_negocios.html", var: "syllabusData" },
  { file: "Mapa_Programacion_orientada_a_objetos.html", var: "syllabusData" },
  { file: "Mapa_Algebra_LIneal_y_Geo._Analitica.html", var: "DATA" },
  { file: "Mapa_Mate_discreta2.html", var: null, parseHTML: true }
];

/* ---------- utilidades HTTP ---------- */
function httpStatus(url, timeout = 8000) {
  return new Promise((resolve) => {
    let done = false;
    const fin = (r) => { if (!done) { done = true; resolve(r); } };
    
    let protocol = url.startsWith("http://") ? http : https;
    const req = protocol.request(url, { method: "HEAD", timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        httpStatus(absUrl(url, res.headers.location), timeout).then(fin);
      } else {
        res.resume();
        fin({ code: res.statusCode, final: url });
      }
    });
    req.on("error", (e) => fin({ code: "ERR:" + e.code }));
    req.on("timeout", () => { req.destroy(); fin({ code: "TIMEOUT" }); });
    req.end();
  });
}

function absUrl(base, loc) {
  try { return new URL(loc, base).href; } catch { return loc; }
}

function enc(s) { return encodeURIComponent(String(s || "")); }

/* ---------- fuentes canónicas conocidas ---------- */
const KNOWN_SOURCES = {
  // Java
  "think java": { url: "https://greenteapress.com/wp/think-java-2e/", dominio: "greenteapress.com", nivel: "alto", nota: "sitio oficial del libro (Green Tea Press)" },
  "introduction to programming using java": { url: "https://math.hws.edu/javanotes/", dominio: "math.hws.edu", nivel: "alto", nota: "sitio oficial de Eck (javanotes)" },
  "david j. eck": { url: "https://math.hws.edu/javanotes/", dominio: "math.hws.edu", nivel: "alto", nota: "sitio oficial de Eck (javanotes)" },
  "javanotes": { url: "https://math.hws.edu/javanotes/", dominio: "math.hws.edu", nivel: "alto", nota: "sitio oficial de Eck (javanotes)" },
  "the java tutorials": { url: "https://docs.oracle.com/javase/tutorial/", dominio: "docs.oracle.com", nivel: "alto", nota: "Oracle Java Tutorials" },
  "oracle": { url: "https://docs.oracle.com/javase/tutorial/", dominio: "docs.oracle.com", nivel: "alto", nota: "Oracle Java Tutorials" },
  "refactoring.guru": { url: "https://refactoring.guru/", dominio: "refactoring.guru", nivel: "alto", nota: "Refactoring.Guru (patrones)" },
  "exercism": { url: "https://exercism.org/tracks/java", dominio: "exercism.org", nivel: "medio", nota: "track base; el ejercicio exacto necesita slug" },
  "mouredev/hello-java": { url: "https://github.com/mouredev/hello-java", dominio: "github.com", nivel: "alto", nota: "repo oficial mouredev/hello-java" },
  "hello-java": { url: "https://github.com/mouredev/hello-java", dominio: "github.com", nivel: "alto", nota: "repo oficial mouredev/hello-java" },
  
  // JavaScript
  "javascript eloquente": { url: "https://eloquentjavascript.net/", dominio: "eloquentjavascript.net", nivel: "alto", nota: "sitio oficial del libro Eloquent JavaScript" },
  "eloquent javascript": { url: "https://eloquentjavascript.net/", dominio: "eloquentjavascript.net", nivel: "alto", nota: "sitio oficial del libro Eloquent JavaScript" },
  "marijn haverbeke": { url: "https://eloquentjavascript.net/", dominio: "eloquentjavascript.net", nivel: "alto", nota: "libro oficial de Marijn Haverbeke" },
  "you don't know js": { url: "https://github.com/getify/You-Dont-Know-JS", dominio: "github.com", nivel: "alto", nota: "repo oficial YDKJS de Kyle Simpson" },
  "kyle simpson": { url: "https://github.com/getify/You-Dont-Know-JS", dominio: "github.com", nivel: "alto", nota: "repo oficial YDKJS" },
  "javascript.info": { url: "https://es.javascript.info/", dominio: "javascript.info", nivel: "alto", nota: "tutorial moderno de JavaScript" },
  "el tutorial de javascript moderno": { url: "https://es.javascript.info/", dominio: "javascript.info", nivel: "alto", nota: "tutorial moderno en español" },
  "mdn": { url: "https://developer.mozilla.org/es/docs/Web/JavaScript", dominio: "developer.mozilla.org", nivel: "alto", nota: "documentación oficial MDN" },
  "mozilla developer network": { url: "https://developer.mozilla.org/es/docs/Web/JavaScript", dominio: "developer.mozilla.org", nivel: "alto", nota: "documentación oficial MDN" },
  "freecodecamp": { url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", dominio: "freecodecamp.org", nivel: "alto", nota: "curso gratuito freeCodeCamp" },
  "hackerrank": { url: "https://www.hackerrank.com/domains/javascript", dominio: "hackerrank.com", nivel: "medio", nota: "track de JavaScript en HackerRank" },
  "codewars": { url: "https://www.codewars.com/?language=javascript", dominio: "codewars.com", nivel: "medio", nota: "katas de JavaScript" },
  
  // Git
  "pro git": { url: "https://git-scm.com/book/en/v2", dominio: "git-scm.com", nivel: "alto", nota: "libro oficial Pro Git 2nd ed." },
  "git-scm": { url: "https://git-scm.com/book/en/v2", dominio: "git-scm.com", nivel: "alto", nota: "libro oficial Pro Git" },
  "hello-git": { url: "https://github.com/mouredev/hello-git", dominio: "github.com", nivel: "alto", nota: "repo oficial mouredev/hello-git" },
  
  // Matemáticas
  "khan academy": { url: "https://es.khanacademy.org/math", dominio: "khanacademy.org", nivel: "alto", nota: "cursos gratuitos Khan Academy" },
  "mit ocw": { url: "https://ocw.mit.edu/courses/mathematics/", dominio: "ocw.mit.edu", nivel: "alto", nota: "OpenCourseWare MIT Mathematics" },
  "paul's online math notes": { url: "https://tutorial.math.lamar.edu/", dominio: "tutorial.math.lamar.edu", nivel: "alto", nota: "notas de matemáticas de Paul Dawkins" },
  "linear algebra done right": { url: "https://linear.axler.net/", dominio: "linear.axler.net", nivel: "alto", nota: "sitio oficial del libro de Sheldon Axler" },
  "sheldon axler": { url: "https://linear.axler.net/", dominio: "linear.axler.net", nivel: "alto", nota: "sitio oficial de Linear Algebra Done Right" },
  "discrete mathematics": { url: "https://discrete.openmathbooks.org/", dominio: "openmathbooks.org", nivel: "alto", nota: "libro abierto de matemática discreta" },
  "osc": { url: "https://openstax.org/subjects/math", dominio: "openstax.org", nivel: "alto", nota: "libros de texto abiertos OpenStax" },
  
  // Modelado de negocios
  "business model generation": { url: "https://strategyzer.com/books/business-model-generation", dominio: "strategyzer.com", nivel: "alto", nota: "libro oficial Business Model Generation" },
  "value proposition design": { url: "https://strategyzer.com/books/value-proposition-design", dominio: "strategyzer.com", nivel: "alto", nota: "libro oficial Value Proposition Design" },
  "lean canvas": { url: "https://leanstack.com/leancanvas", dominio: "leanstack.com", nivel: "medio", nota: "plantilla Lean Canvas" },
  
  // POO general
  "head first object-oriented analysis and design": { url: "https://www.oreilly.com/library/view/head-first-object-oriented/9780596008673/", dominio: "oreilly.com", nivel: "alto", nota: "libro O'Reilly Head First OOAD" },
  "object-oriented design": { url: "https://www.oreilly.com/library/view/object-oriented-design/9781492093398/", dominio: "oreilly.com", nivel: "alto", nota: "recursos O'Reilly sobre OO" }
};

function suggestKnown(ref, type) {
  const t = (ref.t || ref.title || "").toLowerCase();
  const ch = (ref.c || ref.a || "").toLowerCase();
  const text = t + " " + ch;
  
  for (const [key, info] of Object.entries(KNOWN_SOURCES)) {
    if (text.includes(key)) {
      return { ...info };
    }
  }
  return null;
}

function searchUrl(ref, type) {
  const q = [ref.t || ref.title, ref.c || ref.a || ""].filter(Boolean).join(" ");
  if (type === "videos") return "https://www.youtube.com/results?search_query=" + enc(q);
  if (type === "practica") return "https://www.google.com/search?q=" + enc(q);
  return "https://www.google.com/search?q=" + enc(q);
}

/* ---------- extractores específicos por formato ---------- */

// Extrae el array DATA usando la misma lógica que lib.mjs
function extractDataArray(src, varName = "DATA") {
  const marker = `const ${varName} = `;
  const start = src.indexOf(marker);
  if (start < 0) return null;
  
  const lb = src.indexOf("[", start);
  if (lb < 0) return null;
  
  let i = lb + 1, depth = 1, inStr = false, q = "";
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (inStr) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === q) inStr = false;
    } else {
      if (ch === '"' || ch === "'" || ch === "`") { inStr = true; q = ch; }
      else if (ch === "[") depth++;
      else if (ch === "]") depth--;
    }
    i++;
  }
  
  return { start: lb, end: i, text: src.slice(lb, i) };
}

// Formato genérico para extraer referencias de cualquier estructura
function extractRefsFromData(data, mapaName, varName) {
  const refs = [];
  
  data.forEach((u, ui) => {
    const subs = u.subs || u.subtopics || [];
    subs.forEach((s, si) => {
      const code = s.code || s.id || s.tag || `${ui+1}.${si+1}`;
      const unitTitle = u.num ? `${u.num} · ${u.title}` : u.tag ? `${u.tag} · ${u.title}` : u.title;
      const subTitle = s.title;
      
      // Videos / theory
      const videos = s.videos || s.theory || [];
      videos.forEach((r, ri) => {
        const ref = normalizeRef(r, "video");
        if (ref) {
          refs.push({
            id: `${mapaName}:${code}:videos:${ri}`,
            mapa: mapaName,
            unidad: unitTitle,
            subtema: `${code} · ${subTitle}`,
            seccion: "Videos",
            tipo: "video",
            titulo_visible: ref.t,
            autor_canal: ref.c,
            cita: ref.d || "",
            url_actual: ref.url || "",
            estado: ref.url ? "existente" : "pendiente",
            busqueda_url: searchUrl({ t: ref.t, c: ref.c }, "videos")
          });
        }
      });
      
      // Bibliografía / books
      const biblio = s.biblio || s.books || s.bibliography || [];
      biblio.forEach((r, ri) => {
        const ref = normalizeRef(r, "libro");
        if (ref) {
          refs.push({
            id: `${mapaName}:${code}:biblio:${ri}`,
            mapa: mapaName,
            unidad: unitTitle,
            subtema: `${code} · ${subTitle}`,
            seccion: "Bibliografía",
            tipo: "libro",
            titulo_visible: ref.t,
            autor_canal: ref.a || ref.c || "",
            cita: ref.d || ref.p || "",
            url_actual: ref.url || "",
            estado: ref.url ? "existente" : "pendiente",
            busqueda_url: searchUrl({ t: ref.t, c: ref.a }, "biblio")
          });
        }
      });
      
      // Práctica
      const practica = s.practica || s.practice || [];
      practica.forEach((r, ri) => {
        const ref = normalizeRef(r, "practica");
        if (ref) {
          refs.push({
            id: `${mapaName}:${code}:practica:${ri}`,
            mapa: mapaName,
            unidad: unitTitle,
            subtema: `${code} · ${subTitle}`,
            seccion: "Práctica",
            tipo: "practica",
            titulo_visible: ref.t || ref.s || "",
            autor_canal: ref.c || "",
            cita: ref.d || ref.l || "",
            url_actual: ref.url || "",
            estado: ref.url ? "existente" : "pendiente",
            busqueda_url: searchUrl({ t: ref.t || ref.s, c: ref.c }, "practica")
          });
        }
      });
    });
  });
  
  return refs;
}

// Normaliza una referencia a formato común {t, c, a, d, url}
function normalizeRef(r, type) {
  if (!r) return null;
  
  // Objeto con propiedades t, c, a, d, url (formato Java)
  if (typeof r === "object" && !Array.isArray(r)) {
    return {
      t: r.t || r.title || "",
      c: r.c || r.channel || "",
      a: r.a || r.author || "",
      d: r.d || r.cita || r.p || "",
      url: r.url || ""
    };
  }
  
  // Array [titulo, autor, ...] (formato JavaScript)
  if (Array.isArray(r)) {
    return {
      t: r[0] || "",
      c: r[1] || "",
      d: r[2] || "",
      url: ""
    };
  }
  
  // String simple (formato POO)
  if (typeof r === "string") {
    return { t: r, c: "", d: "", url: "" };
  }
  
  return null;
}

// Extractor principal que maneja múltiples formatos
function extractAllFormats(src, mapaName, varName) {
  const lit = extractDataArray(src, varName);
  if (!lit) return null;
  
  let arrayText = lit.text;
  
  try {
    // Evaluar en contexto aislado
    const data = eval("(" + arrayText + ")");
    const refs = extractRefsFromData(data, mapaName, varName);
    return { refs, data, match: lit };
  } catch (e) {
    console.error(`Error parsing ${mapaName} (${varName}): ${e.message}`);
    return null;
  }
}

/* ---------- funciones principales ---------- */

async function extraerTodosLosMapas() {
  console.log("📋 Extrayendo referencias de todos los mapas...\n");
  
  const allRefs = [];
  const mapData = {};
  
  for (const mapaInfo of MAPAS) {
    const { file: mapaName, var: varName } = mapaInfo;
    const mapaPath = path.join(ROOT, mapaName);
    if (!fs.existsSync(mapaPath)) {
      console.log(`⚠️  ${mapaName} no encontrado, saltando...`);
      continue;
    }
    
    const src = fs.readFileSync(mapaPath, "utf8");
    const result = extractAllFormats(src, mapaName, varName);
    
    if (result) {
      console.log(`✅ ${mapaName} (${varName}): ${result.refs.length} referencias encontradas`);
      allRefs.push(...result.refs);
      mapData[mapaName] = result;
    } else {
      console.log(`❌ ${mapaName}: no se pudo extraer referencias`);
    }
  }
  
  console.log(`\n📊 Total: ${allRefs.length} referencias de ${Object.keys(mapData).length} mapas\n`);
  return { allRefs, mapData };
}

function enriquecerReferencias(refs) {
  console.log("🔍 Enriqueciendo referencias con fuentes conocidas y URLs de búsqueda...\n");
  
  let sugeridas = 0;
  
  refs.forEach(ref => {
    const tipo = ref.seccion === "Videos" ? "videos" : ref.seccion === "Práctica" ? "practica" : "biblio";
    const known = suggestKnown(ref, tipo);
    
    if (known) {
      ref.estado = "sugerido";
      ref.url_sugerida = known.url;
      ref.dominio_fuente = known.dominio;
      ref.nivel_confianza = known.nivel;
      ref.notas = known.nota;
      sugeridas++;
    } else if (ref.url_actual) {
      ref.estado = "existente";
    } else {
      ref.estado = "pendiente";
    }
  });
  
  console.log(`   • ${sugeridas} referencias con fuente canónica identificada`);
  console.log(`   • ${refs.filter(r => r.estado === "existente").length} con URL existente`);
  console.log(`   • ${refs.filter(r => r.estado === "pendiente").length} pendientes de verificación\n`);
  
  return refs;
}

async function verificarURLs(refs, maxConcurrent = 10) {
  console.log("🔗 Verificando URLs (esto puede tomar varios minutos)...\n");
  
  const urlsToVerify = refs.filter(r => 
    (r.estado === "sugerido" || r.estado === "existente") && 
    (r.url_sugerida || r.url_actual)
  );
  
  console.log(`   Verificando ${urlsToVerify.length} URLs...\n`);
  
  let verified = 0;
  let errors = 0;
  let idx = 0;
  
  // Procesar en lotes para no saturar
  for (let i = 0; i < urlsToVerify.length; i += maxConcurrent) {
    const batch = urlsToVerify.slice(i, i + maxConcurrent);
    const promises = batch.map(async (ref) => {
      const url = ref.url_sugerida || ref.url_actual;
      const result = await httpStatus(url);
      
      ref.status_http = String(result.code);
      ref.url_final = result.code === 200 || result.code === "200" ? url : "";
      ref.ultima_revision = new Date().toISOString().split("T")[0];
      
      if (result.code === 200 || result.code === "200") {
        ref.estado = "verificado";
        verified++;
      } else {
        ref.estado = "no_existe";
        ref.notas = (ref.notas || "") + ` | HTTP: ${result.code}`;
        errors++;
      }
      
      idx++;
      if (idx % 20 === 0) {
        process.stdout.write(`\r   Progreso: ${idx}/${urlsToVerify.length} (${verified} OK, ${errors} error)`);
      }
    });
    
    await Promise.all(promises);
    process.stdout.write(`\r   Progreso: ${Math.min(i + maxConcurrent, urlsToVerify.length)}/${urlsToVerify.length} (${verified} OK, ${errors} error)   \n`);
  }
  
  console.log(`\n✅ Verificación completada: ${verified} URLs válidas, ${errors} con errores\n`);
  return refs;
}

function guardarCSV(refs, filename) {
  const filepath = path.join(DATA_DIR, filename);
  
  const columns = [
    "id", "mapa", "unidad", "subtema", "seccion", "tipo",
    "titulo_visible", "autor_canal", "cita", "url_actual",
    "busqueda_url", "estado", "url_sugerida", "url_final",
    "dominio_fuente", "nivel_confianza", "status_http",
    "ultima_revision", "notas"
  ];
  
  const csvLines = [columns.join(",")];
  
  refs.forEach(ref => {
    const row = columns.map(col => csvEscape(ref[col] || ""));
    csvLines.push(row.join(","));
  });
  
  fs.writeFileSync(filepath, csvLines.join("\n") + "\n");
  console.log(`💾 CSV guardado en: ${filepath}`);
  console.log(`   Total filas: ${refs.length}\n`);
  
  return filepath;
}

function aplicarAlHTML(mapaName, data, refsVerificados) {
  const mapaPath = path.join(ROOT, mapaName);
  const src = fs.readFileSync(mapaPath, "utf8");
  
  const refsParaEsteMapa = refsVerificados.filter(r => 
    r.mapa === mapaName && r.estado === "verificado" && r.url_final
  );
  
  if (refsParaEsteMapa.length === 0) {
    console.log(`   ⚠️  No hay URLs verificadas para aplicar en ${mapaName}`);
    return;
  }
  
  // Crear un índice de referencias por ID
  const refIndex = {};
  refsParaEsteMapa.forEach(ref => {
    const parts = ref.id.split(":");
    const code = parts[1];
    const sec = parts[2];
    const idx = parseInt(parts[3]);
    
    const key = `${code}:${sec}:${idx}`;
    refIndex[key] = ref.url_final;
  });
  
  // Aplicar URLs al DATA del HTML
  let newSrc = src.replace(
    /(const\s+DATA\s*=\s*)(\[[\s\S]*?\])(;?\s*(?:<\/script>|$))/,
    (match, prefix, arrayText, suffix) => {
      try {
        // Parsear el array
        let cleanArray = arrayText;
        
        // Intentar evaluar y modificar
        const data = eval("(" + arrayText + ")");
        
        data.forEach(u => {
          (u.subs || []).forEach(s => {
            const code = s.code || s.id;
            
            ["videos", "biblio", "practica"].forEach(sec => {
              (s[sec] || []).forEach((r, idx) => {
                const key = `${code}:${sec}:${idx}`;
                if (refIndex[key]) {
                  if (Array.isArray(r)) {
                    // Formato array: convertir a objeto con url
                    const [titulo, autor, ...rest] = r;
                    s[sec][idx] = { t: titulo, c: autor, url: refIndex[key], ...(rest[0] ? { d: rest[0] } : {}) };
                  } else if (typeof r === "object") {
                    r.url = refIndex[key];
                  }
                }
              });
            });
          });
        });
        
        // Re-serializar como JSON formateado
        return prefix + JSON.stringify(data, null, 2) + suffix;
      } catch (e) {
        console.error(`Error aplicando cambios a ${mapaName}: ${e.message}`);
        return match;
      }
    }
  );
  
  fs.writeFileSync(mapaPath, newSrc);
  console.log(`✅ ${refsParaEsteMapa.length} URLs aplicadas en ${mapaName}`);
}

async function main() {
  const args = process.argv.slice(2);
  const mapaFilter = args.find(a => a.startsWith("--mapa="))?.split("=")[1];
  const doVerify = args.includes("--verificar") || args.includes("-v");
  
  console.log("🚀 Pipeline de Curación de Fuentes para Rutas de Aprendizaje\n");
  console.log("=" .repeat(60) + "\n");
  
  // Filtrar mapas si se especificó uno
  if (mapaFilter) {
    const filtered = MAPAS.filter(m => m.includes(mapaFilter));
    if (filtered.length === 0) {
      console.error(`❌ No se encontró ningún mapa que coincida con "${mapaFilter}"`);
      process.exit(1);
    }
    console.log(`Filtrando para: ${filtered.join(", ")}\n`);
  }
  
  // Paso 1: Extraer todas las referencias
  const { allRefs, mapData } = await extraerTodosLosMapas();
  
  if (allRefs.length === 0) {
    console.error("❌ No se encontraron referencias en ningún mapa");
    process.exit(1);
  }
  
  // Paso 2: Enriquecer con fuentes conocidas
  const refsEnriquecidas = enriquecerReferencias(allRefs);
  
  // Paso 3: Guardar CSV preliminar (sin verificación HTTP)
  guardarCSV(refsEnriquecidas, "referencias_curadas_preliminar.csv");
  
  // Paso 4: Verificar URLs (opcional, toma tiempo)
  let refsFinales = refsEnriquecidas;
  if (doVerify || args.includes("--todo")) {
    refsFinales = await verificarURLs(refsEnriquecidas);
    guardarCSV(refsFinales, "referencias_curadas.csv");
  } else {
    console.log("💡 Usa --verificar o -v para verificar URLs HTTP (toma varios minutos)\n");
  }
  
  // Paso 5: Aplicar URLs verificadas a los HTML
  console.log("📝 Aplicando URLs verificadas a los archivos HTML...\n");
  
  for (const [mapaName, { data }] of Object.entries(mapData)) {
    aplicarAlHTML(mapaName, data, refsFinales);
  }
  
  // Resumen final
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMEN FINAL");
  console.log("=".repeat(60));
  console.log(`Total referencias procesadas: ${refsFinales.length}`);
  console.log(`• Verificadas con URL válida: ${refsFinales.filter(r => r.estado === "verificado").length}`);
  console.log(`• Sugeridas (pendientes de verificar): ${refsFinales.filter(r => r.estado === "sugerido").length}`);
  console.log(`• Con URL existente: ${refsFinales.filter(r => r.estado === "existente").length}`);
  console.log(`• Pendientes: ${refsFinales.filter(r => r.estado === "pendiente").length}`);
  console.log(`• No existen (HTTP error): ${refsFinales.filter(r => r.estado === "no_existe").length}`);
  console.log("\n✅ ¡Proceso completado!\n");
}

main().catch(err => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
