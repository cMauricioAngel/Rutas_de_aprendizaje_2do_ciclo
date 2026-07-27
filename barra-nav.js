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
   +   "background:#0a1a2f;"
   +   "border-bottom:4px solid #4a9eff;"
   +   "box-shadow:0 6px 0 #12294a;"
   +   "font-family:'JetBrains Mono','Courier New',monospace;"
   +   "display:flex;align-items:stretch;gap:0;"
   +   "padding:0;margin:0;}"
   + ".rutas-nav *{box-sizing:border-box}"
   + ".rutas-nav-back{flex:0 0 auto;display:flex;align-items:center;gap:8px;"
   +   "padding:14px 20px;background:#4a9eff;color:#0a1a2f;text-decoration:none;"
   +   "font-weight:800;font-size:14px;letter-spacing:0;border:3px solid #0a1a2f;"
   +   "box-shadow:4px 4px 0 #0a1a2f;transition:all .1s ease;white-space:nowrap;"
   +   "text-transform:uppercase;}"
   + ".rutas-nav-back:hover{background:#7ab8ff;transform:translate(-2px,-2px);box-shadow:6px 6px 0 #0a1a2f;}"
   + ".rutas-nav-back:active{transform:translate(0,0);box-shadow:2px 2px 0 #0a1a2f;}"
   + ".rutas-nav-back svg{width:16px;height:16px;flex-shrink:0;stroke-width:3;}"
   + ".rutas-nav-chips{flex:1 1 auto;display:flex;align-items:center;gap:8px;"
   +   "padding:10px 16px;overflow-x:auto;scrollbar-width:thin;scrollbar-color:#4a9eff #0a1a2f;}"
   + ".rutas-nav-chips::-webkit-scrollbar{height:8px;}"
   + ".rutas-nav-chips::-webkit-scrollbar-thumb{background:#4a9eff;border:2px solid #0a1a2f;}"
   + ".rutas-nav-chips::-webkit-scrollbar-track{background:#0a1a2f;}"
   + ".rutas-nav-chip{flex:0 0 auto;display:inline-flex;flex-direction:column;gap:2px;"
   +   "padding:8px 14px;background:#12294a;color:#cfe1ff;text-decoration:none;"
   +   "border:3px solid #0a1a2f;font-size:12px;line-height:1.2;"
   +   "min-width:100px;max-width:180px;transition:all .1s ease;"
   +   "box-shadow:3px 3px 0 rgba(0,0,0,0.3);text-transform:uppercase;}"
   + ".rutas-nav-chip:hover{background:#1e3a5f;border-color:#4a9eff;color:#fff;transform:translate(-2px,-2px);box-shadow:5px 5px 0 #4a9eff;}"
   + ".rutas-nav-chip-tag{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#4a9eff;}"
   + ".rutas-nav-chip-title{font-weight:800;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}"
   + ".rutas-nav-chip.current{background:#4a9eff;color:#0a1a2f;border-color:#0a1a2f;cursor:default;"
   +   "box-shadow:4px 4px 0 #0a1a2f;transform:translate(-1px,-1px);}"
   + ".rutas-nav-chip.current .rutas-nav-chip-tag{color:#0a1a2f;}"
   + "@media (max-width:560px){"
   +   ".rutas-nav-back{padding:12px 14px;font-size:12px;}"
   +   ".rutas-nav-chip{min-width:85px;padding:6px 10px;}"
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
