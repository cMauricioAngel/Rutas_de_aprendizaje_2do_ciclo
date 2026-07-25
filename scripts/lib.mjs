// scripts/lib.mjs — utilidades compartidas para el pipeline de curación.
// Sin dependencias externas: sólo módulos nativos de Node.
import fs from "node:fs";
import https from "node:https";
import http from "node:http";

/* ---------- extractor de un array literal JS ----------
   Dado el source de un .html y un marcador (ej. "const DATA = "), encuentra
   el array "[ ... ]" que le sigue respetando strings y anidamientos, y
   devuelve { start, end, text }.  Sirve para extraer y reesleccionar DATA. */
export function extractArrayLiteral(src, marker) {
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

/* evalúa de forma aislada el texto de un array literal JS ( datos propios ). */
export function evalArray(text) {
  try { return (0, eval)("(" + text + ")"); }
  catch (e) { throw new Error("No se pudo parsear el array literal: " + e.message); }
}

/* ---------- CSV (mínimo, sin deps) ---------- */
export function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
export function toCSV(rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const lines = [cols.join(",")];
  for (const r of rows) lines.push(cols.map((c) => csvEscape(r[c])).join(","));
  return lines.join("\n") + "\n";
}
export function parseCSV(text) {
  // Parser de pasada única: maneja comas, saltos de línea y "" escapados
  // dentro de campos entrecomillados (RFC 4180).
  const rows = [];
  let row = [], field = "", inQ = false;
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
      else field += ch;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0];
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].length === 1 && rows[r][0] === "") continue; // línea vacía
    const o = {};
    headers.forEach((h, j) => (o[h] = rows[r][j] ?? ""));
    out.push(o);
  }
  return out;
}

/* ---------- estado HTTP (HEAD, sigue redirects, 12 s timeout) ---------- */
export function httpStatus(url) {
  return new Promise((resolve) => {
    let done = false;
    const fin = (r) => { if (!done) { done = true; resolve(r); } };
    let mod = url.startsWith("http://") ? http : https;
    const req = mod.request(url, { method: "HEAD", timeout: 12000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        httpStatus(absUrl(url, res.headers.location)).then(fin);
      } else {
        res.resume();
        fin(res.statusCode + "");
      }
    });
    req.on("error", (e) => fin("ERR:" + e.code));
    req.on("timeout", () => { req.destroy(); fin("TIMEOUT"); });
    req.end();
  });
}
function absUrl(base, loc) {
  try { return new URL(loc, base).href; } catch { return loc; }
}

export function enc(s) { return encodeURIComponent(String(s || "")); }

/* ---------- sugeridor de fuentes canónicas conocidas ----------
   Devuelve { url, dominio, nivel, nota } o null.  Sólo URLs estables
   verificadas; los videos de YouTube NO se sugieren (requieren verificación). */
export function suggestKnown(ref, type) {
  const t = (ref.t || ref.title || "").toLowerCase();
  const ch = (ref.c || ref.a || "").toLowerCase();
  const has = (s) => t.includes(s) || ch.includes(s);

  if (has("think java")) return { url: "https://greenteapress.com/wp/think-java-2e/", dominio: "greenteapress.com", nivel: "alto", nota: "sitio oficial del libro (Green Tea Press)" };
  if (has("aprenda java como si estuviera")) return null; // URL variable → búsqueda
  if (has("introduction to programming using java") || has("david j. eck") || has("javanotes")) return { url: "https://math.hws.edu/javanotes/", dominio: "math.hws.edu", nivel: "alto", nota: "sitio oficial de Eck (javanotes)" };
  if (has("pro git")) return { url: "https://git-scm.com/book/en/v2", dominio: "git-scm.com", nivel: "alto", nota: "libro oficial Pro Git 2nd ed." };
  if (has("oracle") || has("the java tutorials")) return { url: "https://docs.oracle.com/javase/tutorial/", dominio: "docs.oracle.com", nivel: "alto", nota: "Oracle Java Tutorials (base; capítulo exacto a verificar)" };
  if (has("refactoring.guru") || has("refactoring guru")) return { url: "https://refactoring.guru/", dominio: "refactoring.guru", nivel: "alto", nota: "Refactoring.Guru (patrones)" };
  if (has("exercism")) return { url: "https://exercism.org/tracks/java", dominio: "exercism.org", nivel: "medio", nota: "track base; el ejercicio exacto necesita slug" };
  if (has("hello-java") || has("mouredev/hello-java")) return { url: "https://github.com/mouredev/hello-java", dominio: "github.com", nivel: "alto", nota: "repo oficial mouredev/hello-java" };
  if (has("hello-git")) return { url: "https://github.com/mouredev/hello-git", dominio: "github.com", nivel: "alto", nota: "repo oficial mouredev/hello-git" };
  return null;
}

/* construye una URL de búsqueda lista para dar clic */
export function searchUrl(ref, type) {
  const q = [ref.t || ref.title, ref.c || ref.a || ""].filter(Boolean).join(" ");
  if (type === "videos") return "https://www.youtube.com/results?search_query=" + enc(q);
  if (type === "practica") return "https://www.google.com/search?q=" + enc(q);
  return "https://www.google.com/search?q=" + enc(q);
}

export const fs_ = { read: (p) => fs.readFileSync(p, "utf8"), write: (p, t) => fs.writeFileSync(p, t) };
