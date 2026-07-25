(function(){
  "use strict";
  if(window.__RUTAS_NAV_LOADED) return;
  window.__RUTAS_NAV_LOADED = true;

  var RUTAS = [
    {tag:"Estilos",       title:"Atlas de Estilos",                file:"Atlas_de_estilos+prompt.html"},
    {tag:"Matemática",    title:"Álgebra Lineal y Geom. A.",       file:"Mapa_Algebra_LIneal_y_Geo._Analitica.html"},
    {tag:"Programación",  title:"Java",                             file:"Mapa_Java.html"},
    {tag:"Programación",  title:"JavaScript",                       file:"Mapa_Javascript.html"},
    {tag:"Matemática",    title:"Matemática Discreta II",           file:"Mapa_Mate_discreta2.html"},
    {tag:"Matemática",    title:"Matemática Superior",              file:"Mapa_Mate_superior.html"},
    {tag:"Negocios",      title:"Modelado de Negocios (BPM)",       file:"Mapa_Modelado_de_negocios.html"},
    {tag:"Programación",  title:"Programación OO",                  file:"Mapa_Programacion_orientada_a_objetos.html"}
  ];

  var current = "";
  try { current = decodeURIComponent(location.pathname.split("/").pop()) || ""; } catch(e){}
  if(!current && location.hash) current = "index.html";

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  var css = ""
   + ".rutas-nav{position:sticky;top:0;z-index:9999;width:100%;"
   +   "background:linear-gradient(180deg,#0a1a2f 0%,#12294a 100%);"
   +   "border-bottom:3px solid #4a9eff;"
   +   "box-shadow:0 4px 14px rgba(0,0,0,.45);"
   +   "font-family:'JetBrains Mono','Courier New',monospace;"
   +   "display:flex;align-items:stretch;gap:0;"
   +   "padding:0;margin:0;}"
   + ".rutas-nav *{box-sizing:border-box}"
   + ".rutas-nav-back{flex:0 0 auto;display:flex;align-items:center;gap:6px;"
   +   "padding:10px 16px;background:#4a9eff;color:#0a1a2f;text-decoration:none;"
   +   "font-weight:800;font-size:13px;letter-spacing:.5px;border-right:1px solid rgba(255,255,255,.12);"
   +   "transition:background .15s ease;white-space:nowrap;}"
   + ".rutas-nav-back:hover{background:#7ab8ff;color:#0a1a2f;}"
   + ".rutas-nav-back svg{width:14px;height:14px;flex-shrink:0;}"
   + ".rutas-nav-chips{flex:1 1 auto;display:flex;align-items:center;gap:6px;"
   +   "padding:8px 12px;overflow-x:auto;scrollbar-width:thin;scrollbar-color:#4a9eff transparent;}"
   + ".rutas-nav-chips::-webkit-scrollbar{height:6px;}"
   + ".rutas-nav-chips::-webkit-scrollbar-thumb{background:#4a9eff;border-radius:3px;}"
   + ".rutas-nav-chips::-webkit-scrollbar-track{background:transparent;}"
   + ".rutas-nav-chip{flex:0 0 auto;display:inline-flex;flex-direction:column;gap:1px;"
   +   "padding:5px 11px;background:rgba(255,255,255,.06);color:#cfe1ff;text-decoration:none;"
   +   "border:1px solid rgba(74,158,255,.35);border-radius:3px;font-size:11px;line-height:1.25;"
   +   "min-width:88px;max-width:160px;transition:background .15s ease,border-color .15s ease;}"
   + ".rutas-nav-chip:hover{background:rgba(74,158,255,.22);border-color:#4a9eff;color:#fff;}"
   + ".rutas-nav-chip-tag{font-size:9px;opacity:.7;letter-spacing:.5px;text-transform:uppercase;}"
   + ".rutas-nav-chip-title{font-weight:700;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}"
   + ".rutas-nav-chip.current{background:#4a9eff;color:#0a1a2f;border-color:#7ab8ff;cursor:default;}"
   + ".rutas-nav-chip.current .rutas-nav-chip-tag{opacity:.85;}"
   + "@media (max-width:560px){"
   +   ".rutas-nav-back{padding:10px 12px;font-size:11px;}"
   +   ".rutas-nav-chip{min-width:80px;padding:5px 9px;}"
   + "}";

  var style = document.createElement("style");
  style.setAttribute("data-rutas-nav","");
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  function build(){
    var nav = document.createElement("nav");
    nav.className = "rutas-nav";
    nav.setAttribute("aria-label","Navegación entre rutas");

    var back = document.createElement("a");
    back.href = "./index.html";
    back.className = "rutas-nav-back";
    back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>ÍNDICE';
    nav.appendChild(back);

    var chips = document.createElement("div");
    chips.className = "rutas-nav-chips";

    RUTAS.forEach(function(r){
      var a = document.createElement("a");
      a.href = "./" + r.file;
      a.className = "rutas-nav-chip";
      if(current === r.file){
        a.classList.add("current");
        a.setAttribute("aria-current","page");
        a.href = "javascript:void(0)";
      }
      var tag = document.createElement("span");
      tag.className = "rutas-nav-chip-tag";
      tag.textContent = r.tag;
      var title = document.createElement("span");
      title.className = "rutas-nav-chip-title";
      title.textContent = r.title;
      a.appendChild(tag);
      a.appendChild(title);
      chips.appendChild(a);
    });

    nav.appendChild(chips);

    if(document.body){
      document.body.insertBefore(nav, document.body.firstChild);
    } else {
      document.documentElement.appendChild(nav);
    }
  }

  if(document.body){
    build();
  } else {
    document.addEventListener("DOMContentLoaded", build);
  }
})();
