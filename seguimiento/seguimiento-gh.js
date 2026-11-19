/* ==SEG-GH== Seguimiento de actividades (T-017, D-081): lectura de la memoria en GitHub con la clave de cada navegador.
   Solo lectura (GET). Reutiliza la clave de la Matriz de Envíos (mismo origen, D-081 punto 10). Sin dependencias. */
var SEG_GH = (function () {
  "use strict";
  var CFG = { owner: "Pblsanchez", repo: "agente-andreani-memoria", rama: "main", indice: "tareas/README.md", commits: 10 };
  var REPO_TXT = CFG.owner + "/" + CFG.repo;
  var API = "https://api.github.com/repos/" + REPO_TXT;
  var LS_TOKEN = "andreani.matriz-envios.github.token"; /* la misma clave que usa la Matriz */
  var URL_FICHAS = "https://github.com/" + REPO_TXT + "/blob/" + CFG.rama + "/tareas/";

  function mensajeError(status, conToken) {
    if (!conToken) return "Para ver el seguimiento hace falta conectar tu clave de GitHub.";
    if (status === 401) return "La clave de GitHub no es válida o venció. Generá una nueva y conectala de nuevo.";
    if (status === 404) return "La clave no tiene acceso a " + REPO_TXT + ". Sumá ese repositorio a la clave (Repository access).";
    if (status === 403) return "GitHub no dejó leer " + REPO_TXT + ": la clave necesita el permiso «Contents» (alcanza con Read-only) sobre ese repositorio.";
    if (status === 429) return "GitHub limitó las consultas por un rato. Probá de nuevo en unos minutos.";
    return "GitHub respondió con error " + status + ".";
  }

  function leerClave(ls) { try { return (ls || localStorage).getItem(LS_TOKEN); } catch (e) { return null; } }
  function guardarClave(t, ls) { try { (ls || localStorage).setItem(LS_TOKEN, t); return true; } catch (e) { return false; } }
  function borrarClave(ls) { try { (ls || localStorage).removeItem(LS_TOKEN); } catch (e) { /* nada */ } }

  /* fetchFn se inyecta en las pruebas */
  function Cliente(token, fetchFn) {
    this.token = token || null;
    this.f = fetchFn || function (u, o) { return fetch(u, o); };
  }
  Cliente.prototype.get = function (ruta, crudo) {
    var self = this;
    if (!self.token) { var e0 = new Error(mensajeError(401, false)); e0.status = 401; e0.sinClave = true; return Promise.reject(e0); }
    var h = { Accept: crudo ? "application/vnd.github.raw" : "application/vnd.github+json", Authorization: "Bearer " + self.token };
    var url = /^https:/.test(ruta) ? ruta : API + ruta;
    return self.f(url, { method: "GET", headers: h, cache: "no-store" }).then(function (r) {
      return r.text().then(function (txt) {
        if (!r.ok) { var e = new Error(mensajeError(r.status, true)); e.status = r.status; throw e; }
        if (crudo) return txt;
        try { return txt ? JSON.parse(txt) : null; } catch (x) { return null; }
      });
    }, function () {
      var e = new Error("No se pudo llegar a GitHub. Revisá la conexión y probá de nuevo."); e.status = 0; throw e;
    });
  };
  /* Usuario de la clave y si ve la memoria */
  Cliente.prototype.verificar = function () {
    var self = this;
    return self.get("https://api.github.com/user").then(function (u) {
      return self.get("").then(function () { return { usuario: u.login, puedeLeer: true }; },
        function (e) {
          if (e.status === 404 || e.status === 403) return { usuario: u.login, puedeLeer: false, status: e.status, error: e.message };
          throw e;
        });
    });
  };
  /* Texto del índice de tareas, siempre del último commit (sin caché) */
  Cliente.prototype.indice = function () {
    return this.get("/contents/" + CFG.indice.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(CFG.rama), true);
  };
  /* Commits automáticos que no son actividad (v1.3, D-082): las capturas que deja github-actions[bot] en ojos/ */
  var BOTS = ["github-actions[bot]"];
  function esBot(c) {
    var cm = (c && c.commit) || {};
    var n = [c && c.author && c.author.login, c && c.committer && c.committer.login, cm.author && cm.author.name, cm.committer && cm.committer.name];
    return n.some(function (x) { return x && BOTS.indexOf(x) >= 0; });
  }
  /* Últimos commits de la memoria, sin los del bot: [{sha, fecha, mensaje, url}] (E2; filtro v1.3).
     Pide 3 veces más (mín. 30, máx. 100) para que, sacando los del bot, igual queden n. */
  Cliente.prototype.commits = function (n) {
    n = n || CFG.commits;
    var pedir = Math.min(100, Math.max(30, n * 3));
    return this.get("/commits?sha=" + encodeURIComponent(CFG.rama) + "&per_page=" + pedir).then(function (l) {
      return (Array.isArray(l) ? l : []).filter(function (c) { return !esBot(c); }).slice(0, n).map(function (c) {
        var cm = c.commit || {};
        return { sha: c.sha, fecha: (cm.committer && cm.committer.date) || (cm.author && cm.author.date) || "", mensaje: cm.message || "", url: c.html_url || "" };
      });
    });
  };

  return { CFG: CFG, REPO_TXT: REPO_TXT, LS_TOKEN: LS_TOKEN, URL_FICHAS: URL_FICHAS, Cliente: Cliente, mensajeError: mensajeError, esBot: esBot,
    leerClave: leerClave, guardarClave: guardarClave, borrarClave: borrarClave };
})();
if (typeof module !== "undefined" && module.exports) module.exports = SEG_GH;
