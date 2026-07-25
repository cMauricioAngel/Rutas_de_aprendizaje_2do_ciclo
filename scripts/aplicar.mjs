// scripts/aplicar.mjs — FASE 5 (integración en HTML estático).
// Lee data/referencias_curadas.csv y parcha los campos `url` (y opcionalmente
// `titulo_canonico`) en cada referencia de `const DATA = [...]` de Mapa_Java.html.
//
//   estado == "verificado"  && url_directa_final  -> se aplica
//   estado == "no_existe"                       -> se omite (deja sin url)
//   título: si titulo_canonico difiere y no está vacío -> se actualiza el `t`
//
// Estrategia robusta: extrae el array literal (respetando strings), lo evalúa,
//   muta los objetos, re-serializa TODO como JSON y reemplaza el rango exacto.
//   Idempotente. Sin dependencias.
//
// Uso:  node scripts/aplicar.mjs
import path from "node:path";
import { extractArrayLiteral, evalArray, parseCSV, fs_ } from "./lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const MAP = path.join(ROOT, "Mapa_Java.html");
const ARC = path.join(ROOT, "data", "referencias_curadas.csv");

function refPath(data, id) {
  // id = "Mapa_Java.html:1.1:videos:0"
  const [, code, sec, idx] = id.split(":");
  for (const u of data) {
    for (const s of (u.subs || [])) {
      if (s.code === code) return [s[sec], Number(idx)];
    }
  }
  return null;
}

function main() {
  const rows = parseCSV(fs_.read(ARC)).filter((r) =>
    r.estado === "verificado" && (r.url_directa_final || "").trim()
  );
  if (!rows.length) { console.log("Nada que aplicar (marce filas como estado=verificado con url_directa_final)."); return; }

  let src = fs_.read(MAP);
  const lit = extractArrayLiteral(src, "const DATA = ");
  if (!lit) throw new Error("No se encontró 'const DATA = [...]' en Mapa_Java.html");
  const data = evalArray(lit.text);

  let applied = 0, titles = 0, missed = 0;
  for (const r of rows) {
    const hit = refPath(data, r.id);
    if (!hit) { missed++; continue; }
    const [arr, i] = hit;
    const ref = arr[i];
    if (!ref) { missed++; continue; }
    if (r.titulo_canonico && r.titulo_canonico.trim() && r.titulo_canonico !== ref.t) {
      ref.t = r.titulo_canonico.trim(); titles++;
    }
    ref.url = r.url_directa_final.trim();
    applied++;
  }

  // re-serializa como JSON (claves entrecomilladas = JS válido; el render lee por propiedad)
  const newText = JSON.stringify(data, null, 2);
  const before = src.slice(0, lit.start);
  const after = src.slice(lit.end);
  src = before + newText + after;
  fs_.write(MAP, src);

  console.log(`Aplicado -> ${MAP}`);
  console.log(`URLs insertadas: ${applied} | títulos corregidos: ${titles} | no encontradas: ${missed}`);
}
main();
