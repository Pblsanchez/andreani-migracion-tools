/* ==SYNC-START== Datos vivos en GitHub, repo PRIVADO (D-035). Lectura y escritura con la clave (token) de cada usuario. Sin dependencias. */
var MATRIZ_SYNC = (function () {
  "use strict";
  var CFG = { owner: "Pblsanchez", repo: "andreani-migracion-datos", rama: "main",
    base: "matriz/base.json", mig: "matriz/migracion.json", vinculos: "rsa/vinculos.json", fuentes: "fuentes" };
  var API = "https://api.github.com/repos/" + CFG.owner + "/" + CFG.repo;
  var HISTORIAL = "https://github.com/" + CFG.owner + "/" + CFG.repo + "/commits/" + CFG.rama;
  var REPO_TXT = CFG.owner + "/" + CFG.repo;

  function mensajeError(status, j, conToken) {
    var m = j && j.message ? " (" + j.message + ")" : "";
    if (!conToken && (status === 401 || status === 403 || status === 404)) return "Los datos son privados: conectá GitHub con tu clave para verlos.";
    if (status === 401) return "La clave de GitHub no es válida o venció. Generá una nueva y conectá de nuevo.";
    if (status === 403 || status === 429) return "GitHub rechazó la operación: la clave necesita el permiso «Contents» sobre " + REPO_TXT + " (Read-only para ver, Read and write para editar)." + m;
    if (status === 404) return "La clave no tiene acceso a " + REPO_TXT + ". Pedí que te inviten al repositorio y sumalo a la clave (Repository access)." + m;
    if (status === 409 || status === 422) return "Alguien guardó cambios en GitHub al mismo tiempo." + m;
    return "GitHub respondió con error " + status + "." + m;
  }

  /* Cliente de la API de GitHub. fetchFn se inyecta en las pruebas. */
  function Cliente(token, fetchFn) {
    this.token = token || null;
    this.f = fetchFn || function (u, o) { return fetch(u, o); };
  }
  Cliente.prototype.api = function (metodo, ruta, cuerpo, crudo) {
    var self = this, h = { Accept: crudo ? "application/vnd.github.raw" : "application/vnd.github+json" };
    if (self.token) h.Authorization = "Bearer " + self.token;
    if (cuerpo) h["Content-Type"] = "application/json";
    var url = /^https:/.test(ruta) ? ruta : API + ruta;
    return self.f(url, { method: metodo, headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined, cache: "no-store" }).then(function (r) {
      return r.text().then(function (txt) {
        if (!r.ok) {
          var j = null; try { j = txt ? JSON.parse(txt) : null; } catch (x) { j = null; }
          var e = new Error(mensajeError(r.status, j, !!self.token)); e.status = r.status;
          throw e;
        }
        if (crudo) return txt;
        try { return txt ? JSON.parse(txt) : null; } catch (x) { return null; }
      });
    });
  };
  function errSinClave() { var e = new Error(mensajeError(401, null, false)); e.status = 401; e.sinClave = true; return e; }
  /* SHA del último commit de la rama de datos (null si el repo está vacío) */
  Cliente.prototype.refDatos = function () {
    if (!this.token) return Promise.reject(errSinClave());
    return this.api("GET", "/git/ref/heads/" + CFG.rama).then(function (j) { return j && j.object ? j.object.sha : null; },
      function (e) { if (e.status === 409) return null; throw e; });
  };
  function urlRuta(ruta, ref) { return "/contents/" + ruta.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(ref); }
  /* Texto de un archivo en un commit (null si no existe). Repo privado: por la API con clave; raw.githubusercontent no sirve desde el navegador. */
  Cliente.prototype.leerTexto = function (ref, ruta) {
    return this.api("GET", urlRuta(ruta, ref), null, true).then(function (t) { return t == null ? null : t; },
      function (e) { if (e.status === 404) return null; throw e; });
  };
  Cliente.prototype.leer = function (ref, ruta) { return this.leerTexto(ref, ruta).then(function (t) { return t ? JSON.parse(t) : null; }); };
  /* Archivos de una carpeta (y sus subcarpetas, un nivel) → {ruta: texto}. null si la carpeta no existe (D-037: fuentes/) */
  Cliente.prototype.leerCarpeta = function (ref, dir) {
    var self = this;
    function listar(d) { return self.api("GET", urlRuta(d, ref)).then(function (l) { return Array.isArray(l) ? l : []; }, function (e) { if (e.status === 404) return null; throw e; }); }
    return listar(dir).then(function (l) {
      if (!l) return null;
      return Promise.all(l.filter(function (x) { return x.type === "dir"; }).map(function (x) { return listar(x.path); })).then(function (subs) {
        var rutas = l.filter(function (x) { return x.type === "file"; }).map(function (x) { return x.path; });
        subs.forEach(function (s) { (s || []).forEach(function (x) { if (x.type === "file") rutas.push(x.path); }); });
        return Promise.all(rutas.map(function (r) { return self.leerTexto(ref, r); })).then(function (tx) { var o = {}; rutas.forEach(function (r, i) { if (tx[i] != null) o[r] = tx[i]; }); return o; });
      });
    });
  };
  /* Lee todo (matriz, migración, vínculos RSA y fuentes de ingreso) del último commit */
  Cliente.prototype.cargar = function () {
    var self = this;
    return self.refDatos().then(function (sha) {
      if (!sha) return { sha: null, base: null, mig: null, vinculos: null, fuentes: null };
      return Promise.all([self.leer(sha, CFG.base), self.leer(sha, CFG.mig), self.leer(sha, CFG.vinculos), self.leerCarpeta(sha, CFG.fuentes)])
        .then(function (x) { return { sha: sha, base: x[0], mig: x[1], vinculos: x[2], fuentes: x[3] }; });
    });
  };
  /* Un commit con varios archivos (Git Data API). padre = commit sobre el que se trabajó. Si la rama avanzó: error.conflicto. */
  Cliente.prototype.escribir = function (archivos, mensaje, padre) {
    var self = this, rutas = Object.keys(archivos);
    var pTree = padre ? self.api("GET", "/git/commits/" + padre).then(function (c) { return c.tree.sha; }) : Promise.resolve(null);
    return pTree.then(function (baseTree) {
      /* Blobs en serie: con archivos de varios MB evita picos de memoria */
      var blobs = [], p = Promise.resolve();
      rutas.forEach(function (ruta) { p = p.then(function () { return self.api("POST", "/git/blobs", { content: archivos[ruta], encoding: "utf-8" }).then(function (b) { blobs.push(b); }); }); });
      return p.then(function () {
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
  /* Usuario de la clave, si ve el repo de datos y si puede escribir */
  Cliente.prototype.verificar = function () {
    var self = this;
    return self.api("GET", "https://api.github.com/user").then(function (u) {
      return self.api("GET", "").then(function (rp) {
        return { usuario: u.login, puedeLeer: true, puedeEscribir: !!(rp && rp.permissions && rp.permissions.push) };
      }, function (e) {
        if (e.status === 404 || e.status === 403) return { usuario: u.login, puedeLeer: false, puedeEscribir: false, error: e.message };
        throw e;
      });
    });
  };

  /* ---------- Almacenamiento local en IndexedDB (localStorage no alcanza para matriz + rentabilidad, D-035) ----------
     get/set/del devuelven promesas. Sin IndexedDB (pruebas en Node o navegador sin soporte): memoria. */
  function Almacen(nombre) { this.nombre = nombre || "andreani-matriz-envios"; this.mem = {}; this.db = null; }
  Almacen.prototype.abrir = function () {
    var self = this;
    if (self.db) return self.db;
    self.db = new Promise(function (ok) {
      var idb = null; try { idb = typeof indexedDB !== "undefined" ? indexedDB : null; } catch (e) { idb = null; }
      if (!idb) { ok(null); return; }
      var rq; try { rq = idb.open(self.nombre, 1); } catch (e) { ok(null); return; }
      rq.onupgradeneeded = function () { rq.result.createObjectStore("kv"); };
      rq.onsuccess = function () { ok(rq.result); };
      rq.onerror = function () { ok(null); };
      rq.onblocked = function () { ok(null); };
    });
    return self.db;
  };
  Almacen.prototype.op = function (modo, fn, enMem) {
    return this.abrir().then(function (db) {
      if (!db) return enMem();
      return new Promise(function (ok, mal) {
        var tx = db.transaction("kv", modo), rq = fn(tx.objectStore("kv"));
        tx.oncomplete = function () { ok(rq ? rq.result : undefined); };
        tx.onerror = function () { mal(tx.error || new Error("IndexedDB")); };
        tx.onabort = function () { mal(tx.error || new Error("No hay espacio en el navegador para guardar los cambios.")); };
      });
    });
  };
  Almacen.prototype.get = function (k) {
    var m = this.mem;
    return this.op("readonly", function (st) { return st.get(k); }, function () { return m[k]; }).then(function (v) { return v === undefined ? null : v; });
  };
  Almacen.prototype.set = function (k, v) { var m = this.mem; return this.op("readwrite", function (st) { return st.put(v, k); }, function () { m[k] = v; }); };
  Almacen.prototype.del = function (k) { var m = this.mem; return this.op("readwrite", function (st) { return st.delete(k); }, function () { delete m[k]; }); };

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
  /* Objeto con una lista grande: cabecera + un elemento por línea (diferencias legibles en GitHub) */
  function serializarLista(obj, campo, excluir) {
    var cab = {}; Object.keys(obj).forEach(function (k) { if (k !== campo && (excluir || []).indexOf(k) < 0) cab[k] = obj[k]; });
    var s = JSON.stringify(cab), lista = obj[campo] || [];
    return s.slice(0, -1) + (s.length > 2 ? "," : "") + "\n" + JSON.stringify(campo) + ":[\n" + lista.map(function (r) { return JSON.stringify(r); }).join(",\n") + "\n]}\n";
  }
  function serializarBase(base) { return serializarLista(base, "registros", ["migracion"]); }
  function serializarMig(mig) {
    var marcas = mig.marcas || {}, claves = Object.keys(marcas).sort();
    var cab = { version: 1, actualizado: mig.actualizado || null, usuario: mig.usuario || null };
    return JSON.stringify(cab).slice(0, -1) + ",\n\"marcas\":{" + (claves.length ? "\n" : "") + claves.map(function (k) { return JSON.stringify(k) + ":" + JSON.stringify(marcas[k]); }).join(",\n") + (claves.length ? "\n" : "") + "},\n\"historial\":[\n" +
      (mig.historial || []).map(function (h) { return JSON.stringify(h); }).join(",\n") + "\n]}\n";
  }
  /* extras = líneas adicionales (por ejemplo, vínculos RSA o rentabilidad actualizados) */
  function mensajeCommit(pendientes, baseNueva, base, extras) {
    var lineas = [];
    if (baseNueva && base) lineas.push("Matriz de envíos actualizada: " + base.registros.length + " registros" + (base.historial && base.historial.length ? " (" + (base.historial[base.historial.length - 1].archivo || "descarga") + ")" : ""));
    (extras || []).forEach(function (x) { lineas.push(x); });
    (pendientes || []).forEach(function (p) { if (p.hist) lineas.push(p.hist.accion + ": " + p.hist.desc + " (" + p.hist.registros + " registros)"); });
    if (!lineas.length) lineas.push("Datos de la matriz de envíos");
    var titulo = (baseNueva || (extras && extras.length) ? "" : "Migración DMS: ") + lineas[0];
    if (titulo.length > 72) titulo = titulo.slice(0, 71) + "…";
    return titulo + (lineas.length > 1 || titulo !== lineas[0] ? "\n\n" + lineas.map(function (l) { return "- " + l; }).join("\n") : "");
  }

  return { CFG: CFG, HISTORIAL: HISTORIAL, REPO_TXT: REPO_TXT, Cliente: Cliente, Almacen: Almacen, aplicarPendientes: aplicarPendientes, serializarLista: serializarLista, serializarBase: serializarBase, serializarMig: serializarMig, mensajeCommit: mensajeCommit, mensajeError: mensajeError };
})();
if (typeof module !== "undefined" && module.exports) module.exports = MATRIZ_SYNC;
/* ==SYNC-END== */
