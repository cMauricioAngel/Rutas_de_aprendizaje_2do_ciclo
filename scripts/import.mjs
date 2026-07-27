/* ============================================================
 *  import.mjs — Genera seed.sql desde los Mapa_*.html
 *  ------------------------------------------------------------
 *  Lee el DATA embebido en cada mapa, lo normaliza al esquema
 *  jerárquico (routes→units→subtopics→resources), calcula
 *  search_query/search_engine (Capa A) y emite seed.sql listo
 *  para correr en Supabase SQL Editor.
 *
 *  Uso:  node scripts/import.mjs   →  genera ./seed.sql
 *  No requiere credenciales (solo lee HTML y escribe SQL).
 * ============================================================ */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "seed.sql");

/* ---------- helpers SQL ---------- */
const esc = s => String(s ?? "").replace(/'/g, "''").replace(/\s+/g, " ").trim();
const lang = (slug) =>
  slug === "java" ? "Java" :
  slug === "javascript" ? "JavaScript" :
  "";

/* ---------- topicOf (réplica del frontend de Java) ---------- */
function topicOf(t){
  let s = String(t ?? "").trim();
  if(s.includes(":")) s = s.slice(s.lastIndexOf(":")+1).trim();
  s = s.replace(/\b(curso de|curso completo|curso profesional|curso intensivo|curso|aprende|tutorial de|tutorial|introducción a la|introducción al|introducción a|desde cero|paso a paso|para principiantes|profesional|completo)\b/gi,"");
  s = s.replace(/^[—:·\-\s]+|[—:·\-\s]+$/g,"").replace(/\s{2,}/g," ").trim();
  s = s.replace(/^(de|a|en|y|del|la|el)\s+/i,"").trim();
  if(s && !/java|git|github/i.test(s)) s += " en Java";
  return s || String(t ?? "").trim();
}

/* ---------- Enriquecimiento (Capa A) ---------- */
function enrich(kind, r, mapSlug){
  const url = r.url && String(r.url).trim();
  if(url) return { search_engine:"direct", search_query:url, url };
  if(kind === "video"){
    const topic = mapSlug === "java" ? topicOf(r.title) : `${r.title || ""} ${lang(mapSlug)}`.replace(/\s+/g," ").trim();
    const q = `${r.channel_or_author || ""} ${topic}`.replace(/\s+/g," ").trim();
    return { search_engine:"youtube", search_query:q };
  }
  // book / practice → google
  const who = r.author || r.channel_or_author || "";
  const q = `${r.title || r.text || ""} ${who}`.replace(/\s+/g," ").trim();
  return { search_engine:"google", search_query:q };
}

/* ---------- Extrae la variable de datos del <script> (sandbox) ---------- */
function extractData(html, varNames){
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  const big = blocks.reduce((a,b)=>b.length>a.length?b:a,"");
  const stub = `
    var localStorage={getItem:()=>null,setItem:()=>{}};
    var document={getElementById:()=>({textContent:'',style:{},innerHTML:'',appendChild:()=>{},querySelector:()=>({appendChild:()=>{}}),querySelectorAll:()=>[]}),createElement:()=>({className:'',innerHTML:'',id:'',appendChild:()=>{},querySelector:()=>({appendChild:()=>{},style:{}}),style:{},addEventListener:()=>{}}),querySelectorAll:()=>[],addEventListener:()=>{}};
    var window={addEventListener:()=>{},MathJax:{},scrollTo:()=>{},innerWidth:1024,innerHeight:768,scrollY:0};
    var IntersectionObserver=function(){this.observe=()=>{};this.unobserve=()=>{};};
    var crypto={randomUUID:()=>'00000000-0000-4000-8000-000000000000'};
    var setInterval=()=>0,requestAnimationFrame=()=>0,setTimeout=()=>0;
    var canvas=null,ctx=null,navigator={userAgent:'node'};
  `;
  const expose = "this.__out={" + varNames.map(v=>`${v}:${v}`).join(",") + "};";
  const tryRun = (code) => {
    try { const fn=new Function(stub+code+";"+expose); const c={}; fn.call(c); return c.__out||{}; }
    catch(e){ return null; }
  };
  let out = tryRun(big);
  if(!out || !varNames.some(v=>out[v])){
    const cut = big.split(/function (renderAll|render|bindEvents|updateAllProgress|toggleAccordion|renderUnits)\b/)[0];
    out = tryRun(cut) || {};
  }
  return out;
}

/* ---------- Normalizadores por mapa → estructura común ---------- */
/*
  Salida común:
  {
    units: [ {
      num, title, desc, weeks, hours, difficulty,
      subtopics: [ { code, title, objective, resources:[ {kind,title,channel_or_author,author,url,level,text} ] } ]
    } ]
  }
*/
const MAPS = [
  { slug:"java", file:"Mapa_Java.html", title:"Java · Ruta de Aprendizaje · 8 Semanas",
    category:"programacion", dataVar:"DATA",
    norm:(d)=>({ units: d.map(u=>({
      num:u.num, title:u.title, desc:u.desc, weeks:u.weeks, hours:u.hours, difficulty:u.difficulty,
      subtopics:(u.subs||[]).map(s=>({
        code:s.code, title:s.title, objective:s.obj,
        resources:[
          ...(s.videos||[]).map(v=>({kind:"video", title:v.t, channel_or_author:v.c, url:v.url})),
          ...(s.biblio||[]).map(b=>({kind:"book", title:b.t, author:b.a, url:b.url, metadata:{desc:b.d}})),
          ...(s.practica||[]).map(p=>({kind:"practice", title:p.t, channel_or_author:p.c, url:p.url, level:p.lvl})),
        ]
      }))
    })) })
  },
  { slug:"javascript", file:"Mapa_Javascript.html", title:"JavaScript · Ruta de Aprendizaje · 8 Semanas",
    category:"programacion", dataVar:"DATA",
    norm:(d)=>({ units: d.map(u=>({
      num:u.id?.replace?.("u","")||u.tag, title:u.title, desc:"", weeks:u.weeks, hours:String(u.hours||""), difficulty:"",
      subtopics:(u.subs||[]).map(s=>({
        code:s.tag||s.id, title:s.title, objective:s.obj,
        resources:[
          ...(s.videos||[]).map(v=>({kind:"video", title:v[0], channel_or_author:v[1], url:v.url})),
          ...(s.biblio||[]).map(b=>({kind:"book", title:b[1], author:b[0], url:b.url, metadata:{cap:b[2],pages:b[3]}})),
          ...(s.practica||[]).map(p=>({kind:"practice", title:p[0], channel_or_author:p[1], url:p.url, level:p[2]})),
        ]
      }))
    })) })
  },
  { slug:"algebra-lineal", file:"Mapa_Algebra_LIneal_y_Geo._Analitica.html",
    title:"Álgebra Lineal y Geometría Analítica — Ruta Topológica",
    category:"matematica", dataVar:"DATA",
    norm:(d)=>({ units: d.map(u=>({
      num:String(u.num).padStart(2,"0"), title:u.title, desc:u.desc, weeks:u.weeks, hours:String(u.hours||""), difficulty:"",
      subtopics:(u.subtopics||[]).map(s=>({
        code:s.id, title:s.title, objective:s.objective,
        resources:[
          ...(s.videos||[]).map(v=>({kind:"video", title:v.t, channel_or_author:v.c, url:v.url})),
          ...(s.lecturas||[]).map(l=>({kind:"book", text:l})),
          ...(s.practica||[]).map(p=>({kind:"practice", title:p.t, channel_or_author:"", url:p.url, level:p.n, text:p.t})),
        ]
      }))
    })) })
  },
  { slug:"matematica-superior", file:"Mapa_Mate_superior.html", title:"Matemática Superior | Arquitectura Visual",
    category:"matematica", dataVar:"syllabusData",
    norm:(d)=>({ units: d.map(u=>({
      num:String(u.id||""), title:u.title, desc:u.desc||"", weeks:u.weeks, hours:String(u.hours||""), difficulty:"",
      subtopics:(u.subtopics||[]).map(s=>({
        code:s.id||s.title, title:s.title, objective:s.objective||"",
        resources:[
          ...(s.videos||[]).map(v=>({kind:"video", title:v.t, channel_or_author:v.c, url:v.url})),
          ...(s.books||[]).map(b=>({kind:"book", title:b.t, author:b.a, url:b.url, metadata:{section:b.c,pages:b.p}})),
          ...(s.practice||[]).map(p=>({kind:"practice", title:p.s, channel_or_author:"", url:p.url, level:p.l})),
        ]
      }))
    })) })
  },
  { slug:"modelado-de-negocios", file:"Mapa_Modelado_de_negocios.html", title:"Modelo de Negocios // Ruta BPM",
    category:"negocios", dataVar:"syllabusData",
    norm:(d)=>({ units: d.map(u=>({
      num:String(u.id||""), title:u.title, desc:u.desc||"", weeks:u.weeks, hours:String(u.hours||""), difficulty:"",
      subtopics:(u.subtopics||[]).map(s=>({
        code:String(s.id||""), title:s.title, objective:s.objective||"",
        resources:[
          ...(s.theory||[]).map(t=>({kind:"video", title:t.title, channel_or_author:t.channel, url:t.url})),
          ...(s.bibliography||[]).map(b=>({kind:"book", text:b.text, url:b.url})),
          ...(s.practice||[]).map(p=>({kind:"practice", text:p.text, channel_or_author:p.type, url:p.url})),
        ]
      }))
    })) })
  },
  { slug:"poo", file:"Mapa_Programacion_orientada_a_objetos.html",
    title:"Programación Orientada a Objetos", category:"programacion", dataVar:"syllabusData",
    norm:(d)=>({ units: d.map(u=>({
      num:String(u.id||""), title:u.title, desc:u.desc||"", weeks:u.weeks, hours:String(u.hours||""), difficulty:"",
      subtopics:(u.subtopics||[]).map(s=>{
        const parseItem=(x)=>{ if(typeof x==="string") return {text:x}; return {title:x.t||x.text, text:x.text||x.t, url:x.url}; };
        return {
          code:String(s.id||""), title:s.title, objective:s.objective||"",
          resources:[
            ...(s.videos||[]).map(x=>({kind:"video", ...parseItem(x), channel_or_author: (typeof x==="string"? (x.split(/\s*-\s*Canal:\s*/)[1]||"").replace(/<[^>]+>/g,"").trim() : "") })),
            ...(s.biblio||[]).map(x=>({kind:"book", ...parseItem(x)})),
            ...(s.practice||[]).map(x=>({kind:"practice", ...parseItem(x)})),
          ]
        };
      })
    })) })
  },
];

/* ---------- Mate Discreta 2: HTML estático (sin DATA) ---------- */
function parseDiscreta2(html){
  const stripTags = s => s.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
  const units = [];
  const unitRe = /<div class="unit-accordion"[^>]*id="(unit-\d+)"[\s\S]*?<div class="unit-title"[^>]*>([^<]+)<\/div>[\s\S]*?(?=<div class="unit-accordion"|<footer|$)/g;
  let um;
  while((um = unitRe.exec(html))){
    const unitHtml = um[0];
    const unitNum = (um[1]||"").replace("unit-","");
    const unitTitle = stripTags(um[2]);
    const subs = [];
    const subRe = /<div class="subtopic-accordion"[^>]*id="([^"]+)"[\s\S]*?<span class="subtopic-title"[^>]*>([^<]+)<\/span>([\s\S]*?)(?=<div class="subtopic-accordion"|<\/div>\s*<\/div>\s*<!--|\s*<\/div>\s*<div class="unit-accordion"|<footer|$)/g;
    let sm;
    while((sm = subRe.exec(unitHtml))){
      const subHtml = sm[3];
      const code = stripTags(sm[2]).split(/\s+/).slice(0,2).join(" ").trim();
      const title = stripTags(sm[2]);
      // objetivo
      const objM = subHtml.match(/<h4>OBJETIVO[^<]*<\/h4>\s*<p>([\s\S]*?)<\/p>/i);
      const objective = objM ? stripTags(objM[1]) : "";
      const resources = [];
      // biblio
      const blocks = [...subHtml.matchAll(/<h4>(REFERENCIAS[^<]*)<\/h4>\s*<ul>([\s\S]*?)<\/ul>/gi)];
      for(const b of blocks){
        const head = stripTags(b[1]).toUpperCase();
        const kind = head.includes("VIDEO") ? "video" : head.includes("BIBLIO") ? "book" : "practice";
        const lis = [...b[2].matchAll(/<li>([\s\S]*?)<\/li>/g)];
        for(const li of lis){
          const raw = li[1];
          const levelM = raw.match(/level-badge\s+(\w+)/);
          const level = levelM ? levelM[1] : null;
          resources.push({ kind, text: stripTags(raw), level });
        }
      }
      subs.push({ code, title, objective, resources });
    }
    units.push({ num:unitNum, title:unitTitle, desc:"", weeks:"", hours:"", difficulty:"", subtopics:subs });
  }
  return { units };
}

/* ---------- Generación de SQL ---------- */
function routeInsert(map){
  const themes = {
    java:{accent:"#E76F00",bg:"#F0F0F0",ink:"#000",style:"brutalismo industrial"},
    javascript:{accent:"#F7DF1E",bg:"#0a0a0a",ink:"#F7DF1E",style:"brutal alto contraste"},
    "algebra-lineal":{accent:"#2C4A6E",bg:"#1B2A3A",ink:"#EDEFEF",style:"brutalismo topológico"},
    "matematica-superior":{accent:"#8B3A3A",bg:"#F4EFE9",ink:"#2A2A2A",style:"brutalismo cálido"},
    "modelado-de-negocios":{accent:"#0F3D2E",bg:"#FAF7F0",ink:"#1A1A1A",style:"esmeralda editorial"},
    poo:{accent:"#FF5F1F",bg:"#EDEDED",ink:"#000",style:"concreto industrial"},
    "matematica-discreta-2":{accent:"#B8A444",bg:"#1F1F1D",ink:"#EDEAE0",style:"matrix binario"},
  };
  const th = themes[map.slug] || {};
  return `('${map.slug}', '${esc(map.title)}', '${map.category}', 'published', '${JSON.stringify(th).replace(/'/g,"''")}'::jsonb)`;
}

function emitRoute(map, data){
  const lines = [];
  lines.push(`do $$ declare v_route uuid; v_unit uuid; v_sub uuid; begin`);
  lines.push(`  insert into public.routes (slug,title,category,status,theme) values ${routeInsert(map)} on conflict (slug) do update set title=excluded.title, category=excluded.category, status=excluded.status, theme=excluded.theme returning id into v_route;`);
  data.units.forEach((u, ui)=>{
    const hours = esc(String(u.hours||""));
    lines.push(`  insert into public.units (route_id,"order",num,title,description,weeks,hours,difficulty) values (v_route,${ui+1},'${esc(u.num||String(ui+1))}','${esc(u.title)}','${esc(u.desc||"")}','${esc(u.weeks||"")}','${hours}','${esc(u.difficulty||"")}') returning id into v_unit;`);
    (u.subtopics||[]).forEach((s, si)=>{
      lines.push(`  insert into public.subtopics (unit_id,"order",code,title,objective) values (v_unit,${si+1},'${esc(s.code||"")}','${esc(s.title)}','${esc(s.objective||"")}') returning id into v_sub;`);
      (s.resources||[]).forEach((r, ri)=>{
        const e = enrich(r.kind, r, map.slug);
        const meta = r.metadata ? `'${JSON.stringify(r.metadata).replace(/'/g,"''")}'::jsonb` : "'{}'::jsonb";
        const lvl = r.level ? `'${esc(r.level)}'` : "null";
        const t = r.title || r.text || "";
        const co = r.channel_or_author || "";
        lines.push(`  insert into public.resources (subtopic_id,"order",kind,title,description,keywords,url,channel_or_author,search_query,search_engine,level,language,metadata) values (v_sub,${ri+1},'${r.kind}','${esc(t)}','${esc(r.description||"")}','{}','${esc(e.url||"")}','${esc(co)}','${esc(e.search_query)}','${e.search_engine}',${lvl},'es',${meta}) on conflict do nothing;`);
      });
    });
  });
  lines.push(`end $$;`);
  return lines.join("\n");
}

/* ---------- MAIN ---------- */
const routeSqls = [];
const slugs = [];

const ALL = [...MAPS, { slug:"matematica-discreta-2", file:"Mapa_Mate_discreta2.html",
  title:"Matemática Discreta (2da parte)", category:"matematica" }];

for(const map of ALL){
  const fp = path.join(ROOT, map.file);
  if(!fs.existsSync(fp)){ console.warn(`⚠  no existe ${map.file}, omitido`); continue; }
  const html = fs.readFileSync(fp,"utf8");
  let data;
  if(map.slug === "matematica-discreta-2"){ data = parseDiscreta2(html); }
  else {
    const out = extractData(html,[map.dataVar]);
    if(!out || !out[map.dataVar]){ console.warn(`⚠  no se extrajo ${map.dataVar} de ${map.file}`); continue; }
    data = map.norm(out[map.dataVar]);
  }
  if(!data || !data.units || !data.units.length){ console.warn(`⚠  sin unidades en ${map.file}`); continue; }
  slugs.push(map.slug);
  routeSqls.push(emitRoute(map, data));
  const nU = data.units.length;
  const nS = data.units.reduce((a,u)=>a+(u.subtopics||[]).length,0);
  const nR = data.units.reduce((a,u)=>a+u.subtopics.reduce((b,s)=>b+(s.resources||[]).length,0),0);
  console.log(`✓ ${map.file}: ${nU} unidades, ${nS} subtemas, ${nR} recursos`);
}

const deleteBlock = `delete from public.routes where slug in (${slugs.map(s=>`'${s}'`).join(",")});`;

const sql = `-- seed.sql — generado por scripts/import.mjs
-- Puebla routes/units/subtopics/resources desde los Mapa_*.html actuales.
-- Idempotente: borra las rutas sembradas y las recrea (cascade).
-- Atómico (BEGIN/COMMIT): si algo falla, la BD queda sin cambios.
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run.

begin;

${deleteBlock}

${routeSqls.join("\n\n")}

commit;
`;
fs.writeFileSync(OUT, sql);
console.log(`\n→ Escrito ${OUT} (${(sql.length/1024).toFixed(1)} KB, ${slugs.length} rutas)`);
