/* ============================================================
 *  RUTAS DE APRENDIZAJE · progress-sync.js
 *  ------------------------------------------------------------
 *  Sincroniza el progreso de cada mapa con Supabase (nube),
 *  usando localStorage como caché local y fallback.
 *
 *  • Sin acoplamiento a los handlers existentes: detecta
 *    cambios por polling (cada 4 s) + al salir de la página.
 *  • Modo "local-only" automático si Supabase no está
 *    configurado o la red/CDN falla.
 *  • Identidad anónima por perfil (UUID en localStorage),
 *    compartible entre dispositivos vía ?p=<perfilId>.
 *
 *  Uso (al final de cada Mapa_*.html):
 *     RutasSync.init("java", {
 *       storageKey:   "...",        // opcional
 *       collectState: ()=> ({...}), // estado actual
 *       applyState:   (m)=> {...}   // aplicar estado mezclado
 *     });
 * ============================================================ */
(function () {
  "use strict";
  if (window.RutasSync && window.RutasSync._loaded) return;

  var CFG = window.RUTAS_SUPABASE || {};
  var SUPA_URL = (CFG.url || "").trim();
  var SUPA_KEY = (CFG.anonKey || "").trim();
  var CONFIGURED = !!(SUPA_URL && SUPA_KEY);
  var CDN =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
  var TABLE = "route_progress";
  var POLL_MS = 4000;

  /* ---------- helpers seguros sobre localStorage ---------- */
  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  /* ---------- perfil anónimo (compartible) ---------- */
  var PROFILE_KEY = "rutas-profile-id";
  function genId() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      if (window.crypto && crypto.getRandomValues) {
        var b = crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        var h = [];
        for (var i = 0; i < 16; i++) h.push(b[i].toString(16).padStart(2, "0"));
        return (
          h.slice(0, 4).join("") + "-" + h.slice(4, 6).join("") + "-" +
          h.slice(6, 8).join("") + "-" + h.slice(8, 10).join("") + "-" +
          h.slice(10, 16).join("")
        );
      }
    } catch (e) {}
    return "p-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  function getProfileId() {
    try {
      var p = new URL(location.href).searchParams.get("p");
      if (p && /^[A-Za-z0-9_-]{6,64}$/.test(p)) { lsSet(PROFILE_KEY, p); return p; }
    } catch (e) {}
    var cur = lsGet(PROFILE_KEY);
    if (cur) return cur;
    var id = genId();
    lsSet(PROFILE_KEY, id);
    return id;
  }
  var PROFILE = getProfileId();

  /* ---------- cliente Supabase perezoso (carga CDN sólo si hace falta) ---------- */
  var _clientPromise = null;
  function makeClient() {
    if (!CONFIGURED) return Promise.resolve(null);
    try {
      if (window.supabase && window.supabase.createClient) {
        return Promise.resolve(window.supabase.createClient(SUPA_URL, SUPA_KEY));
      }
    } catch (e) {}
    _clientPromise = _clientPromise || new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = CDN;
      s.async = true;
      s.onload = function () {
        try { resolve(window.supabase.createClient(SUPA_URL, SUPA_KEY)); }
        catch (e) { resolve(null); }
      };
      s.onerror = function () { resolve(null); };
      (document.head || document.documentElement).appendChild(s);
    });
    return _clientPromise;
  }

  function nowIso() { return new Date().toISOString(); }
  function tsKey(route) { return "rutas-ts-" + route; }
  function getLocalTs(route) { var t = lsGet(tsKey(route)); return t ? +t : 0; }
  function setLocalTs(route) { lsSet(tsKey(route), String(Date.now())); }

  function fetchRemote(route) {
    return makeClient().then(function (c) {
      if (!c) return null;
      return c.from(TABLE)
        .select("state,updated_at")
        .eq("profile_id", PROFILE)
        .eq("route", route)
        .maybeSingle()
        .then(function (res) {
          if (!res || res.error || !res.data) return null;
          return { state: res.data.state || {}, updated_at: res.data.updated_at || "" };
        })
        .catch(function () { return null; });
    });
  }
  function pushRemote(route, state) {
    return makeClient().then(function (c) {
      if (!c) return false;
      return c.from(TABLE)
        .upsert(
          { profile_id: PROFILE, route: route, state: state, updated_at: nowIso() },
          { onConflict: "profile_id,route" }
        )
        .then(function (res) { return !res || !res.error; })
        .catch(function () { return false; });
    });
  }

  function clone(o) { try { return JSON.parse(JSON.stringify(o || {})); } catch (e) { return {}; } }
  function shallowEqBool(a, b) {
    var ka = Object.keys(a || {}), kb = Object.keys(b || {});
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) {
      var k = ka[i];
      if (!!a[k] !== !!b[k]) return false;
    }
    return true;
  }

  /* ---------- API pública ---------- */
  var api = {
    _loaded: true,
    configured: CONFIGURED,
    profileId: PROFILE,

    /**
     * Registra un mapa e inicia sync.
     * @param {string} route            identificador de ruta (ej. "java")
     * @param {object} opts
     *   storageKey   {string}   clave localStorage (caché local)
     *   collectState {()=>obj}  devuelve el estado actual
     *   applyState   {(m)=>void} aplica el estado mezclado y re-renderiza
     */
    init: function (route, opts) {
      opts = opts || {};
      var storageKey = opts.storageKey || "rutas-progress-" + route;
      var collect = typeof opts.collectState === "function" ? opts.collectState : function () { return readLocal(); };
      var apply = typeof opts.applyState === "function" ? opts.applyState : function () {};

      function readLocal() { try { return JSON.parse(lsGet(storageKey) || "{}"); } catch (e) { return {}; } }
      function writeLocal(s) { lsSet(storageKey, JSON.stringify(s || {})); }

      var lastPushed = null;

      function doPush() {
        try {
          var s = collect() || {};
          writeLocal(s);
          if (lastPushed && shallowEqBool(s, lastPushed)) return;
          lastPushed = clone(s);
          if (CONFIGURED) { setLocalTs(route); pushRemote(route, s); }
        } catch (e) {}
      }

      function doPull() {
        try {
          var localState = readLocal();
          if (!CONFIGURED) { apply(localState); return; }
          fetchRemote(route).then(function (remote) {
            try {
              var remoteTs = remote ? Date.parse(remote.updated_at || "") : 0;
              var localTs = getLocalTs(route);
              var merged;
              if (remote && remote.state && remoteTs > localTs) {
                merged = remote.state;
              } else {
                merged = localState;
                setLocalTs(route);
                pushRemote(route, merged);
              }
              writeLocal(merged);
              lastPushed = clone(merged);
              apply(merged);
            } catch (e) {}
          });
        } catch (e) {}
      }

      setInterval(doPush, POLL_MS);
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") doPush(); });
      window.addEventListener("pagehide", doPush);
      window.addEventListener("beforeunload", doPush);
      setTimeout(doPush, 1500);

      doPull();
      return api;
    },

    /**
     * Devuelve un mapa {route: state} con el estado en nube del perfil actual
     * para las rutas indicadas. Sólo lectura (no toca localStorage).
     * Pensado para dashboards/índice.
     */
    fetchAll: function (routes) {
      return makeClient().then(function (c) {
        if (!c) return {};
        return c.from(TABLE)
          .select("route,state")
          .eq("profile_id", PROFILE)
          .in("route", routes || [])
          .then(function (res) {
            var out = {};
            if (res && !res.error && res.data) {
              res.data.forEach(function (row) { out[row.route] = row.state || {}; });
            }
            return out;
          })
          .catch(function () { return {}; });
      });
    }
  };

  window.RutasSync = api;
})();
