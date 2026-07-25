// scripts/validar.mjs — FASE 6 (control de calidad).
// Lee data/referencias_curadas.csv, hace HEAD a cada url_directa_final y
// actualiza las columnas status_http + ultima_revision.  (Idempotente.)
//
// Uso:  node scripts/validar.mjs
import path from "node:path";
import { parseCSV, toCSV, httpStatus, fs_ } from "./lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ARC = path.join(ROOT, "data", "referencias_curadas.csv");

async function main() {
  const rows = parseCSV(fs_.read(ARC));
  let rev = 0, err = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const r of rows) {
    const url = (r.url_directa_final || "").trim();
    if (!url) { r.status_http = ""; r.ultima_revision = ""; continue; }
    const st = await httpStatus(url);
    r.status_http = st;
    r.ultima_revision = today;
    if (/^(2\d\d|3\d\d)$/.test(st)) rev++;
    else err++;
    process.stdout.write(".");
  }
  process.stdout.write("\n");
  fs_.write(ARC, toCSV(rows));
  console.log(`Validación OK -> ${ARC}`);
  console.log(`Revisadas con URL: ${rev + err} | OK (2xx/3xx): ${rev} | con problemas: ${err}`);
}
main();
