/* ==SYNC-START== Datos vivos en GitHub (D-022). Lectura pública sin clave; escritura con clave (token) del editor. Sin dependencias. */
var MATRIZ_SYNC = (function () {
  "use strict";
  var CFG = { owner: "Pblsanchez", repo: "andreani-migracion-tools", rama: "datos", base: "matriz-envios/datos/base.json", mig: "matriz-envios/datos/migracion.json" };
  var API = "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo;
  var RAW = "https://raw.githubusercontent.com/" + CFG.owner + "/" + CFG.repo + "/";
  var HISTORIAL = "https://github.com/" + CFG.owner + "/" + CFG.repo + "/commits/" + CFG.rama;

  function mensajeError(status, j, conToken) {
    var m = j && j.message ? " (" + j.message + ")" : "";
    if (status === 401) return "La clave de GitHub no es válida o venció. Generá una nueva y conectá de nuevo.";
    if (status === 403 || status === 429) return conToken
      ? "GitHub rechazó la operación: la clave necesita el permiso «Contents: Read and write» sobre " + CFG.owner + "/" + CFG.repo + "." + m
      : "GitHub limitó las consultas desde esta red. Se reintenta en unos minutos." + m;
    if (status === 404) return "No se encontró el recurso en GitHub." + m;
    if (status === 409 || status === 422) return "Alguien guardó cambios en GitHub al mismo tiempo." + m;
    return "GitHub respondió con error " + status + "." + m;
  }

  /* Cliente de la API de GitHub. fetchFn se inyecta en las pruebas. */
  function Cliente(token, fetchFn) {
    this.token = token || null;
    this.f = fetchFn || function (u, o) { return fetch(u, o); };
  }
  Cliente.prototype.api = function (metodo, ruta, cuerpo) {
    var self = this, h = { Accept: "application/vnd.github+json" };
    if (self.token) h.Authorization = "Bearer " + self.token;
    if (cuerpo) h["Content-Type"] = "application/json";
    var url = /^https:/.test(ruta) ? ruta : API + ruta;
    return self.f(url, { method: metodo, headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined, cache: "no-store" }).then(function (r) {
      return r.text().then(function (txt) {
        var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { j = null; }
        if (!r.ok) {
          var e = new Error(mensajeError(r.status, j, !!self.token)); e.status = r.status;
          e.limite = r.status === 429 || (r.status === 403 && !self.token);
          throw e;
        }
        return j;
      });
    });
  };
  /* SHA del último commit de la rama de datos (null si la rama no existe) */
  Cliente.prototype.refDatos = function () {
    return this.api("GET", "/git/ref/heads/" + CFG.rama).then(function (j) { return j && j.object ? j.object.sha : null; },
      function (e) { if (e.status === 404) return null; throw e; });
  };
  Cliente.prototype.raw = function (ref, ruta) {
    var fija = /^[0-9a-f]{40}$/.test(ref);
    return this.f(RAW + ref + "/" + ruta, fija ? {} : { cache: "no-store" }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) { var e = new Error("No se pudo leer " + ruta + " desde GitHub (error " + r.status + ")."); e.status = r.status; throw e; }
      return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  };
  /* Lee base y migración del último commit. Si GitHub limita las consultas, lee la rama por nombre (puede venir con hasta 5 min de demora). */
  Cliente.prototype.cargar = function () {
    var self = this;
    return self.refDatos().then(function (sha) { return { sha: sha, demorado: false }; },
      function (e) { if (e.limite || e.status >= 500) return { sha: null, demorado: true }; throw e; })
      .then(function (ref) {
        if (!ref.sha && !ref.demorado) return { sha: null, base: null, mig: null, demorado: false };
        var r = ref.sha || CFG.rama;
        return Promise.all([self.raw(r, CFG.base), self.raw(r, CFG.mig)]).then(function (x) { return { sha: ref.sha, base: x[0], mig: x[1], demorado: ref.demorado }; });
      });
  };
  /* Un commit con varios archivos (Git Data API). padre = commit sobre el que se trabajó. Si la rama avanzó: error.conflicto. */
  Cliente.prototype.escribir = function (archivos, mensaje, padre) {
    var self = this, rutas = Object.keys(archivos);
    var pTree = padre ? self.api("GET", "/git/commits/" + padre).then(function (c) { return c.tree.sha; }) : Promise.resolve(null);
    return pTree.then(function (baseTree) {
      return Promise.all(rutas.map(function (ruta) { return self.api("POST", "/git/blobs", { content: archivos[ruta], encoding: "utf-8" }); }))
        .then(function (blobs) {
          var cuerpo = { tree: rutas.map(function (ruta, i) { return { path: ruta, mode: "100644", type: "blob", sha: blobs[i].sha }; }) };
          if (baseTree) cuerpo.base_tree = baseTree;
          return self.api("POST", "/git/trees", cuerpo);
        });
    }).then(function (tree) {
      return self.api("POST", "/git/commits", { message: mensaje, tree: tree.sha, parents: padre ? [padre] : [] });
    }).then(function (commit) {
      var p = padre ? self.api("PATCH", "/git/refs/heads/" + CFG.rama, { sha: commit.sha, force: false })
        : self.api("POST", "/git/refs", { ref: "refs/heads/" + CFG.rama, sha: commit.sha });
      return p.then(function () { return commit.sha; }, function (e) { if (e.status === 422 || e.status === 409) e.conflicto = true; throw e; });
    });
  };
  /* Usuario de la clave y si puede escribir en el repo */
  Cliente.prototype.verificar = function () {
    var self = this;
    return Promise.all([self.api("GET", "https://api.github.com/user"), self.api("GET", "")]).then(function (x) {
      return { usuario: x[0].login, puedeEscribir: !!(x[1] && x[1].permissions && x[1].permissions.push) };
    });
  };

  /* ---------- Cambios pendientes (marcas de migración) ----------
     Cada pendiente = { cambios: [{k: clave, v: "AAAA-MM-DD" | null}], hist: {...} }.
     Al enviar se aplican sobre la última versión de GitHub: si otra persona cambió otras marcas, se conservan;
     si cambió la misma, gana el cambio más reciente (el que se envía). */
  function aplicarPendientes(mig, pendientes) {
    mig = mig || {};
    mig.marcas = mig.marcas || {}; mig.historial = mig.historial || [];
    (pendientes || []).forEach(function (p) {
      (p.cambios || []).forEach(function (c) { if (c.v) mig.marcas[c.k] = c.v; else delete mig.marcas[c.k]; });
      if (p.hist) mig.historial.push(p.hist);
    });
    if (mig.historial.length > 1000) mig.historial = mig.historial.slice(-1000);
    return mig;
  }
  /* Base sin las marcas, un registro por línea (diferencias legibles en GitHub) */
  function serializarBase(base) {
    var cab = {}; Object.keys(base).forEach(function (k) { if (k !== "registros" && k !== "migracion") cab[k] = base[k]; });
    var s = JSON.stringify(cab);
    return s.slice(0, -1) + (s.length > 2 ? "," : "") + "\n\"registros\":[\n" + base.registros.map(function (r) { return JSON.stringify(r); }).join(",\n") + "\n]}\n";
  }
  function serializarMig(mig) {
    var marcas = mig.marcas || {}, claves = Object.keys(marcas).sort();
    var cab = { version: 1, actualizado: mig.actualizado || null, usuario: mig.usuario || null };
    return JSON.stringify(cab).slice(0, -1) + ",\n\"marcas\":{" + (claves.length ? "\n" : "") + claves.map(function (k) { return JSON.stringify(k) + ":" + JSON.stringify(marcas[k]); }).join(",\n") + (claves.length ? "\n" : "") + "},\n\"historial\":[\n" +
      (mig.historial || []).map(function (h) { return JSON.stringify(h); }).join(",\n") + "\n]}\n";
  }
  function mensajeCommit(pendientes, baseNueva, base) {
    var lineas = [];
    if (baseNueva && base) lineas.push("Matriz de envíos actualizada: " + base.registros.length + " registros" + (base.historial && base.historial.length ? " (" + (base.historial[base.historial.length - 1].archivo || "descarga") + ")" : ""));
    (pendientes || []).forEach(function (p) { if (p.hist) lineas.push(p.hist.accion + ": " + p.hist.desc + " (" + p.hist.registros + " registros)"); });
    if (!lineas.length) lineas.push("Datos de la matriz de envíos");
    var titulo = (baseNueva ? "" : "Migración DMS: ") + lineas[0];
    if (titulo.length > 72) titulo = titulo.slice(0, 71) + "…";
    return titulo + (lineas.length > 1 || titulo !== lineas[0] ? "\n\n" + lineas.map(function (l) { return "- " + l; }).join("\n") : "");
  }

  return { CFG: CFG, HISTORIAL: HISTORIAL, Cliente: Cliente, aplicarPendientes: aplicarPendientes, serializarBase: serializarBase, serializarMig: serializarMig, mensajeCommit: mensajeCommit, mensajeError: mensajeError };
})();
if (typeof module !== "undefined" && module.exports) module.exports = MATRIZ_SYNC;
/* ==SYNC-END== */
