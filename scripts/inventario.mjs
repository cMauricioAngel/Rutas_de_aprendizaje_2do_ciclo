// scripts/inventario.mjs — FASE 1 del plan de curación.
// Extrae TODAS las referencias de Mapa_Java.html (piloto) y genera:
//   data/referencias_raw.csv        (inventario puro)
//   data/referencias_curadas.csv    (gobierno: raw + columnas de curación
//                                    + busqueda_url preconstruida + URLs
//                                    canónicas conocidas sembradas)
//
// Uso:  node scripts/inventario.mjs
import fs from "node:fs";
import path from "node:path";
import { extractArrayLiteral, evalArray, toCSV, suggestKnown, searchUrl, fs_ } from "./lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const MAP = path.join(ROOT, "Mapa_Java.html");
const ARCRaw = path.join(ROOT, "data", "referencias_raw.csv");
const ARCCur = path.join(ROOT, "data", "referencias_curadas.csv");

const SECTION = { videos: "Videos", biblio: "Bibliografía", practica: "Práctica" };
const KIND = { videos: "video", biblio: "libro", practica: "practica" };

function flatten(src) {
  const lit = extractArrayLiteral(src, "const DATA = ");
  if (!lit) throw new Error("No se encontró 'const DATA = [...]' en Mapa_Java.html");
  const data = evalArray(lit.text);
  const rows = [];
  data.forEach((u) => {
    (u.subs || []).forEach((s) => {
      for (const sec of ["videos", "biblio", "practica"]) {
        (s[sec] || []).forEach((r, i) => {
          const id = `Mapa_Java.html:${s.code}:${sec}:${i}`;
          const sug = suggestKnown(r, sec);
          rows.push({
            id,
            archivo: "Mapa_Java.html",
            unidad: `${u.num} · ${u.title}`,
            subtema: `${s.code} · ${s.title}`,
            seccion: SECTION[sec],
            tipo: KIND[sec],
            titulo_visible: r.t || "",
            autor_canal: r.c || r.a || "",
            cita: r.d || "",
            url_actual: "",                       // aún no hay links en DATA
            busqueda_url: searchUrl(r, sec),      // lista para dar clic
            estado: sug ? "sugerido" : "pendiente",
            titulo_canonico: r.t || "",            // por defecto = título actual
            url_directa_final: sug ? sug.url : "",
            dominio_fuente: sug ? sug.dominio : "",
            nivel_confianza: sug ? sug.nivel : "",
            status_http: "",
            ultima_revision: "",
            notas: sug ? sug.nota : ""
          });
        });
      }
    });
  });
  return { rows, lit };
}

function main() {
  fs.existsSync(path.join(ROOT, "data")) || fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
  const src = fs_.read(MAP);
  const { rows } = flatten(src);

  fs_.write(ARCRaw, toCSV(rows.map((r) => ({
    id: r.id, archivo: r.archivo, unidad: r.unidad, subtema: r.subtema,
    seccion: r.seccion, tipo: r.tipo, titulo_visible: r.titulo_visible,
    autor_canal: r.autor_canal, cita: r.cita, url_actual: r.url_actual,
    estado: r.estado, busqueda_url: r.busqueda_url
  }))));

  fs_.write(ARCCur, toCSV(rows));

  const totals = rows.length;
  const sug = rows.filter((r) => r.estado === "sugerido").length;
  const pend = rows.filter((r) => r.estado === "pendiente").length;
  console.log(`Inventario OK -> ${ARCRaw}`);
  console.log(`Curadas (sembrado) -> ${ARCCur}`);
  console.log(`Total refs: ${totals} | sugeridas: ${sug} | pendientes: ${pend}`);
}
main();
