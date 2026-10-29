/* ==APP-START== Interfaz del dashboard: Resumen · Análisis · Migración a DMS */
(function () {
  "use strict";
  var M = MATRIZ, U = MATRIZ_UI, S = MATRIZ_SYNC;
  var n = U.n, pct = U.pct, corto = U.corto, fecha = U.fecha, $ = U.$, el = U.el, svgIcon = U.svgIcon, badge = U.badge, alerta = U.alerta, toast = U.toast, share = U.share, tabla = U.tabla;
  var LS_TOKEN = "andreani.matriz-envios.github.token", LS_PEND = "andreani.matriz-envios.pendientes.v2", LS_VIEJA = "andreani.matriz-envios.base.v1";

  /* ---------- Estado ---------- */
  var VISTAS = [{ id: "resumen", t: "Resumen" }, { id: "analisis", t: "Análisis" }, { id: "migracion", t: "Migración a DMS" }];
  var base = null, f, ui = { vista: "resumen", tab: "crec", sortKey: "jer", sortDir: 1, page: 0, pageSize: 25, verTodoTab: false, abiertos: {}, limites: {}, migAbiertos: {}, migLimites: {}, migVer: "todo", deshacer: null };
  /* Sincronización con GitHub (D-022): los datos viven en la rama "datos" del repo; lo ve cualquiera, edita quien tiene clave */
  var gh = { cliente: null, usuario: null, puede: false, sha: null, pendientes: [], baseCambiada: false, cargando: true, enviando: false, error: null, errorEnvio: null, demorado: false, ultimaCarga: 0, migSola: null, baseRemotaAct: null, recuperados: false };
  function leerLS(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  gh.cliente = new S.Cliente(leerLS(LS_TOKEN));
  function filtrosVacios() { return { segmentos: [], clientes: [], tipos: [], servicios: [], contratos: [], meses: [], texto: "" }; }
  f = filtrosVacios();
  try { var h = (window.location && window.location.hash || "").replace("#", ""); if (VISTAS.some(function (v) { return v.id === h; })) ui.vista = h; } catch (e) { /* sin location */ }

  function editor() { return gh.puede && !!gh.usuario; }
  function hayPend() { return gh.pendientes.length > 0 || gh.baseCambiada; }
  function migVacia() { return { marcas: {}, historial: [] }; }
  /* Carga los datos desde GitHub. silencioso = revisión automática (no reemplaza si no hubo cambios) */
  function cargarRemoto(silencioso, reintento) {
    gh.cargando = !silencioso; if (!silencioso) renderTodo();
    return gh.cliente.cargar().then(function (d) {
      gh.cargando = false; gh.error = null; gh.demorado = d.demorado; gh.ultimaCarga = Date.now();
      if (silencioso && (hayPend() || !d.sha || d.sha === gh.sha)) { renderSync(); return false; }
      gh.sha = d.sha; gh.baseRemotaAct = d.base ? d.base.actualizado : null; gh.migSola = d.mig;
      base = d.base || null;
      if (base) base.migracion = d.mig || migVacia();
      restaurarPendientes();
      if (base) M.podar(base, f);
      renderTodo();
      if (silencioso) toast("Se actualizaron los datos con los últimos cambios guardados en GitHub.");
      return true;
    }).catch(function (e) {
      /* Clave guardada vencida: se descarta y se lee como visitante */
      if (e && e.status === 401 && !reintento) { if (gh.cliente.token) olvidarClave(); return cargarRemoto(silencioso, true); }
      gh.cargando = false; if (!silencioso) gh.error = e && e.message ? e.message : String(e); renderTodo(); return false;
    });
  }
  function olvidarClave() {
    try { localStorage.removeItem(LS_TOKEN); } catch (x) { /* nada */ }
    gh.cliente = new S.Cliente(null); gh.usuario = null; gh.puede = false;
    toast("La clave de GitHub guardada venció o no es válida. Conectá de nuevo para editar.");
  }
  /* Cambios sin enviar: se guardan en el navegador para no perderlos si se cierra la página */
  function guardarPendientes() {
    try {
      if (!hayPend()) localStorage.removeItem(LS_PEND);
      else localStorage.setItem(LS_PEND, JSON.stringify({ ops: gh.pendientes, base: gh.baseCambiada ? sinMig(base) : null }));
    } catch (e) { toast("No se pudieron guardar los cambios pendientes en este navegador. Enviá a GitHub para no perderlos."); }
    renderSync();
  }
  function sinMig(b) { var o = {}; Object.keys(b).forEach(function (k) { if (k !== "migracion") o[k] = b[k]; }); return o; }
  function restaurarPendientes() {
    var p = null; try { p = JSON.parse(leerLS(LS_PEND) || "null"); } catch (e) { p = null; }
    gh.pendientes = []; gh.baseCambiada = false;
    if (!p) return;
    if (p.base) { var mig = base ? base.migracion : (gh.migSola || migVacia()); base = p.base; base.migracion = mig; gh.baseCambiada = true; }
    if (p.ops && p.ops.length && base) { S.aplicarPendientes(base.migracion, p.ops); gh.pendientes = p.ops; }
    gh.recuperados = hayPend();
  }
  function registrarOp(cambios) {
    var mg = M.migracion(base), hh = mg.historial[mg.historial.length - 1];
    if (hh && gh.usuario) hh.usuario = gh.usuario;
    gh.pendientes.push({ cambios: cambios, hist: hh || null });
    guardarPendientes();
  }
  function descartarPendientes() {
    if (!confirm("¿Descartar los cambios que no se enviaron a GitHub? No se puede deshacer.")) return;
    try { localStorage.removeItem(LS_PEND); } catch (e) { /* nada */ }
    gh.pendientes = []; gh.baseCambiada = false; gh.recuperados = false; ui.deshacer = null;
    cargarRemoto(false);
  }

  /* ---------- Envío a GitHub: un commit con la migración (y la matriz si cambió) ---------- */
  function enviar() {
    if (!editor() || gh.enviando || !hayPend()) return;
    gh.enviando = true; gh.errorEnvio = null; renderSync();
    var intento = 0;
    function uno() {
      intento++;
      return gh.cliente.cargar().then(function (d) {
        if (gh.baseCambiada && d.base && d.base.actualizado !== gh.baseRemotaAct &&
          !confirm("Otra persona actualizó la matriz de envíos en GitHub después de que abriste el dashboard. ¿Reemplazarla con la tuya?")) {
          var c = new Error("Envío cancelado. Tus cambios siguen guardados en este navegador."); c.cancelado = true; throw c;
        }
        var mig = S.aplicarPendientes(d.mig || migVacia(), gh.pendientes);
        mig.actualizado = new Date().toISOString(); mig.usuario = gh.usuario;
        var baseFinal = gh.baseCambiada ? base : (d.base || base);
        var archivos = {}; archivos[S.CFG.mig] = S.serializarMig(mig);
        if (gh.baseCambiada) archivos[S.CFG.base] = S.serializarBase(baseFinal);
        return gh.cliente.escribir(archivos, S.mensajeCommit(gh.pendientes, gh.baseCambiada, baseFinal), d.sha)
          .then(function (sha) { return { sha: sha, base: baseFinal, mig: mig }; });
      }).catch(function (e) { if (e.conflicto && intento < 3) return uno(); throw e; });
    }
    return uno().then(function (r) {
      var nOps = gh.pendientes.length, conBase = gh.baseCambiada;
      gh.sha = r.sha; base = r.base; base.migracion = r.mig; gh.baseRemotaAct = base.actualizado; gh.migSola = r.mig;
      gh.pendientes = []; gh.baseCambiada = false; gh.recuperados = false; gh.enviando = false;
      guardarPendientes(); M.podar(base, f); renderTodo();
      toast("Enviado a GitHub" + (conBase ? ": matriz actualizada" : "") + (nOps ? (conBase ? " y " : ": ") + nOps + (nOps === 1 ? " cambio" : " cambios") + " de migración" : "") + ". Quien abra el dashboard ya ve la información al día.");
    }).catch(function (e) {
      gh.enviando = false; gh.errorEnvio = e && e.message ? e.message : String(e); renderTodo();
    });
  }

  /* ---------- Alertas y encabezado ---------- */
  function renderAlertas() {
    var c = $("alertas");
    Array.prototype.slice.call(c.querySelectorAll("[data-auto]")).forEach(function (x) { x.remove(); });
    var avisos = [];
    if (gh.error) avisos.push(alerta("error", [el("strong", { text: "No se pudieron leer los datos de GitHub. " }), gh.error],
      [el("button", { type: "button", "class": "btn btn--secondary btn--small", onclick: function () { cargarRemoto(false); } }, ["Reintentar"])]));
    if (gh.errorEnvio) avisos.push(alerta("error", [el("strong", { text: "No se pudo enviar a GitHub. " }), gh.errorEnvio, " Los cambios siguen guardados en este navegador."],
      [el("button", { type: "button", "class": "btn btn--secondary btn--small", onclick: function () { gh.errorEnvio = null; enviar(); } }, ["Reintentar"]),
        el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { gh.errorEnvio = null; renderTodo(); } }, ["Cerrar"])]));
    if (gh.recuperados && hayPend()) avisos.push(alerta("warning", [el("strong", { text: "Hay cambios de una sesión anterior que no se enviaron a GitHub" }), " (" + pendTxt() + "). Ya se ven aplicados en pantalla."],
      editor() ? [el("button", { type: "button", "class": "btn btn--primary btn--small", onclick: enviar }, ["Enviar a GitHub"]),
        el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: descartarPendientes }, ["Descartar"])]
        : [el("button", { type: "button", "class": "btn btn--secondary btn--small", onclick: abrirGh }, ["Conectar GitHub para enviarlos"])]));
    if (gh.demorado && !gh.error) avisos.push(alerta("info", ["GitHub limitó las consultas desde esta red: los datos pueden tener hasta 5 minutos de demora."]));
    avisos.reverse().forEach(function (a) { a.setAttribute("data-auto", ""); a.classList.add("alert--compacta"); c.insertBefore(a, c.firstChild); });
  }
  function pendTxt() {
    var p = gh.pendientes.length, partes = [];
    if (gh.baseCambiada) partes.push("matriz nueva");
    if (p) partes.push(p + (p === 1 ? " cambio de migración" : " cambios de migración"));
    return partes.join(" y ");
  }
  /* Estado de la sincronización en el encabezado */
  function renderSync() {
    var c = $("sync"); c.innerHTML = "";
    var est;
    if (gh.cargando) est = badge("info", "Cargando datos…", "clock");
    else if (gh.enviando) est = badge("info", "Enviando a GitHub…", "upload");
    else if (gh.error) est = badge("error", "Sin conexión con GitHub");
    else if (hayPend()) est = badge("warning", "Sin enviar: " + pendTxt());
    else est = badge("ok", "Datos al día");
    est.setAttribute("role", "status"); est.setAttribute("id", "sync-estado");
    c.appendChild(est);
    if (editor()) c.appendChild(el("button", { type: "button", "class": "btn btn--primary btn--small", id: "btn-enviar", disabled: !hayPend() || gh.enviando, onclick: enviar }, [svgIcon("upload", 16), "Enviar a GitHub"]));
    c.appendChild(el("button", { type: "button", "class": "btn btn--ghost btn--small", id: "btn-recargar", title: "Volver a leer los datos de GitHub", disabled: gh.cargando || gh.enviando, onclick: function () { cargarRemoto(false); } }, [svgIcon("undo", 16), "Recargar"]));
    c.appendChild(el("button", { type: "button", "class": "btn btn--ghost btn--small", id: "btn-gh", "aria-haspopup": "dialog", onclick: abrirGh },
      [svgIcon("user", 16), editor() ? gh.usuario : "Conectar GitHub"]));
    $("btn-actualizar").hidden = !editor();
  }
  function periodoTxt() { return M.mesTxt(base.meses[0]) + " a " + M.mesTxt(base.meses[base.meses.length - 1]) + (base.mesParcial ? " (" + M.mesTxt(base.mesParcial) + " parcial)" : ""); }
  function renderBase() {
    var total = M.totalBase(base);
    $("subtitulo").textContent = periodoTxt() + " · " + n(total) + " envíos · " + n(base.registros.length) + " registros · actualizada " + fecha(base.actualizado);
    var est = $("estado-base"); est.innerHTML = "";
    var mg = M.migracion(base);
    est.appendChild(badge("ok", "Datos vivos · GitHub"));
    var ab = $("about-meta"); ab.innerHTML = "";
    [["Origen", "Matriz de Envíos · Power BI"], ["Período", periodoTxt()],
      ["Filtros del export", base.filtros || "—"], ["Clave de registro", "N° contrato + tipo de servicio + servicio"], ["Matriz actualizada", fecha(base.actualizado)],
      ["Migración actualizada", mg.actualizado ? fecha(mg.actualizado) + (mg.usuario ? " por " + mg.usuario : "") : "Sin cambios todavía"]
    ].forEach(function (x) { ab.appendChild(el("dt", { text: x[0] })); ab.appendChild(el("dd", { text: x[1] })); });
    ab.appendChild(el("dt", { text: "Historial" }));
    ab.appendChild(el("dd", null, [el("a", { href: S.HISTORIAL, target: "_blank", rel: "noopener noreferrer" }, ["Ver todos los cambios en GitHub (se abre en otra pestaña)"])]));
    var meta = $("base-meta"); meta.innerHTML = "";
    [["Origen", "Descarga de Power BI guardada en GitHub"], ["Registros", n(base.registros.length) + " (contrato + tipo + servicio)"],
      ["Período", periodoTxt()], ["Envíos", n(total)], ["Filtros del export", base.filtros || "—"], ["Actualizada", fecha(base.actualizado)]
    ].forEach(function (x) { meta.appendChild(el("dt", { text: x[0] })); meta.appendChild(el("dd", { text: x[1] })); });
    var hh = $("historial"); hh.innerHTML = "";
    (base.historial || []).slice().reverse().slice(0, 8).forEach(function (x) {
      hh.appendChild(el("li", null, [el("strong", { text: fecha(x.fecha) + " · " + (x.accion || "Actualización") }), el("br"),
        el("span", { text: (x.archivo ? x.archivo + " · " : "") + n(x.nuevos) + " registros nuevos · " + n(x.cambios) + " valores cambiados" + (x.mesesNuevos && x.mesesNuevos.length ? " · meses: " + x.mesesNuevos.map(M.mesTxt).join(", ") : "") + " · total " + n(x.total) })]));
    });
    $("footer-base").textContent = "Matriz: " + fecha(base.actualizado) + (mg.actualizado ? " · Migración: " + fecha(mg.actualizado) : "");
  }

  /* ---------- Pestañas principales ---------- */
  function renderVistas() {
    var bar = $("vistas"); bar.innerHTML = "";
    VISTAS.forEach(function (v, i) {
      var sel = ui.vista === v.id;
      bar.appendChild(el("button", { type: "button", role: "tab", "class": "tab tab--vista", id: "vtab-" + v.id, "aria-controls": "vista-" + v.id, "aria-selected": sel ? "true" : "false", tabindex: sel ? "0" : "-1",
        onclick: function () { irA(v.id, false); },
        onkeydown: function (ev) {
          var j = null; if (ev.key === "ArrowRight") j = (i + 1) % VISTAS.length; else if (ev.key === "ArrowLeft") j = (i - 1 + VISTAS.length) % VISTAS.length; else if (ev.key === "Home") j = 0; else if (ev.key === "End") j = VISTAS.length - 1;
          if (j != null) { ev.preventDefault(); irA(VISTAS[j].id, true); }
        } }, [v.t]));
      $("vista-" + v.id).hidden = !sel;
    });
  }
  function irA(id, foco) {
    ui.vista = id;
    try { if (window.history && history.replaceState) history.replaceState(null, "", "#" + id); } catch (e) { /* file:// */ }
    renderTodo();
    if (foco) $("vtab-" + id).focus();
  }

  /* ---------- Barra de filtros: select múltiple con búsqueda, en cascada (D-018, D-021) ---------- */
  function mesesSel() { return f.meses.length ? base.meses.filter(function (m) { return f.meses.indexOf(m) >= 0; }) : base.meses; }
  function toggle(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
  function renderBarra() {
    var c = $("barra"); c.innerHTML = "";
    M.NIVELES.forEach(function (N, i) {
      c.appendChild(U.multiSelect({ id: N.id, num: i + 1, etiqueta: N.nombre, seleccion: f[N.id], onCambio: cambio,
        opciones: function () { return M.opciones(base, f, i, mesesSel()); } }));
      if (i < M.NIVELES.length - 1) c.appendChild(el("span", { "class": "barra__sep", "aria-hidden": "true" }, ["›"]));
    });
    c.appendChild(U.multiSelect({ id: "meses", etiqueta: "Período", seleccion: f.meses, formato: M.mesTxt, onCambio: cambio,
      opciones: function () {
        var regs = M.filtrar(base, f);
        return base.meses.map(function (m) { var t = 0; regs.forEach(function (r) { t += r.v[m] || 0; }); return { valor: m, texto: M.mesTxt(m) + (m === base.mesParcial ? " (parcial)" : ""), envios: t }; });
      } }));
    var hay = M.NIVELES.some(function (N) { return f[N.id].length; }) || f.meses.length;
    c.appendChild(el("button", { type: "button", "class": "btn btn--ghost btn--small barra__limpiar", disabled: !hay, onclick: function () { f = filtrosVacios(); U.cerrarLista(false); cambio(); toast("Se limpiaron los filtros."); } }, [svgIcon("close", 16), "Limpiar"]));
    renderActivos();
  }
  function renderActivos() {
    var c = $("filtros-activos"); c.innerHTML = "";
    var tags = [];
    function tag(txt, quitar) { tags.push(el("span", { "class": "tag" }, [txt, el("button", { type: "button", "aria-label": "Quitar filtro " + txt, onclick: function () { quitar(); cambio(); } }, [svgIcon("close", 14)])])); }
    M.NIVELES.forEach(function (N) { f[N.id].forEach(function (v) { tag(N.nombre + ": " + v, function () { toggle(f[N.id], v); }); }); });
    f.meses.forEach(function (m) { tag("Período: " + M.mesTxt(m), function () { toggle(f.meses, m); }); });
    c.hidden = !tags.length;
    tags.forEach(function (t) { c.appendChild(t); });
  }
  /* Cada cambio poda selecciones inferiores incompatibles; la lista abierta sigue abierta */
  function cambio() {
    var act = document.activeElement, fid = act && act.getAttribute ? act.getAttribute("data-fid") : null;
    var quitadas = M.podar(base, f);
    ui.page = 0; renderTodo();
    if (quitadas) toast("Se quitaron " + quitadas + " selecciones de niveles inferiores que ya no corresponden a lo elegido arriba.");
    if (U.hayAbierto()) U.reabrir(); else U.enfocar(fid);
  }

  /* ---------- KPIs ---------- */
  function kpiCard(icono, titulo, valor, sub, extra) {
    return el("li", { "class": "kpi" }, [el("span", { "class": "kpi__label" }, [svgIcon(icono, 20), titulo]), el("span", { "class": "kpi__value" }, [valor]), extra || null, el("span", { "class": "kpi__sub" }, [sub])]);
  }
  function renderKpis(k) {
    var c = $("kpis"); c.innerHTML = "";
    var varEl = "—";
    if (k.variacion != null) { var up = k.variacion >= 0; varEl = el("span", { "class": "trend trend--" + (up ? "up" : "down") }, [svgIcon(up ? "up" : "down", 20), (up ? "Sube " : "Baja ") + pct(Math.abs(k.variacion))]); }
    [["box", "Envíos", n(k.envios), k.meses.length + (k.meses.length === 1 ? " mes" : " meses") + (base.mesParcial && k.meses.indexOf(base.mesParcial) >= 0 ? " · incluye " + M.mesTxt(base.mesParcial) + " parcial" : "")],
      ["user", "Clientes", n(k.clientes), "Razones sociales con envíos"],
      ["doc", "Contratos", n(k.contratos), k.mesUltimo ? n(k.contratosActivos) + " activos en " + M.mesTxt(k.mesUltimo) : ""],
      ["cal", "Promedio mensual", n(k.promedioMensual), n(k.enviosPorContrato) + " envíos por contrato"],
      ["trend", "Variación mensual", varEl, k.mesUltimo && k.mesPrevio ? M.mesTxt(k.mesUltimo) + " vs " + M.mesTxt(k.mesPrevio) + " (meses completos)" : "Se necesitan 2 meses completos"],
      ["pie", "Concentración top 10", pct(k.concentracionTop10), "Sin clientes internos"],
      ["star", "Clientes nuevos", n(k.clientesNuevos), "Primer envío después de " + M.mesTxt(base.meses[0])],
      ["grid", "Servicios", n(k.servicios), n(k.segmentos) + " segmentos"]
    ].forEach(function (it) { c.appendChild(kpiCard(it[0], it[1], it[2], it[3])); });
  }

  /* ---------- Gráficos, rankings y calidad: matriz-vistas.js ---------- */
  var V = MATRIZ_VISTAS({ base: function () { return base; }, f: function () { return f; }, ui: ui, cambio: function () { cambio(); } });
  var chartEvolucion = V.chartEvolucion, chartMix = V.chartMix, chartBarras = V.chartBarras, renderRankings = V.renderRankings, renderTabs = V.renderTabs, renderCalidad = V.renderCalidad, linkCliente = V.linkCliente;

  /* ---------- Árbol jerárquico (Resumen y Migración) ----------
     SEGMENTO > RAZÓN SOCIAL > TIPO > SERVICIO > N° CONTRATO (D-018). cfg.mig = true agrega casillas de migración (D-020). */
  var PASO = 25;
  function renderArbol(contId, regs, k, cfg) {
    var cont = $(contId); cont.innerHTML = "";
    var ref = k.mesUltimo, total = k.envios || 0, tbody = el("tbody");
    var abiertos = cfg.mig ? ui.migAbiertos : ui.abiertos, limites = cfg.mig ? ui.migLimites : ui.limites;
    var pref = cfg.mig ? "mig" : "arbol";
    var colsN = cfg.mig ? 6 : 6;
    function redibujar(fid) { if (cfg.mig) renderTodo(); else renderArbol(contId, regs, k, cfg); U.enfocar(fid); }
    function fila(g, nivel, ruta) {
      var N = M.NIVELES[nivel], hoja = nivel === M.NIVELES.length - 1, key = ruta.concat([g.clave]).join("\u0001");
      var abierto = !hoja && !!abiertos[key];
      var nombre = el("span", { "class": "arbol__nombre" }, [el("span", { "class": "sr-only", text: N.nombre + ": " }), g.clave]);
      var celda = hoja
        ? el("span", { "class": "arbol__hoja num" }, [el("span", { "class": "arbol__punto", "aria-hidden": "true" }), nombre])
        : el("button", { type: "button", "class": "arbol__toggle", "aria-expanded": abierto ? "true" : "false", "data-fid": pref + ":" + key,
            onclick: function () { if (abiertos[key]) delete abiertos[key]; else abiertos[key] = 1; redibujar(pref + ":" + key); } },
            [svgIcon(abierto ? "down" : "right", 18), nombre]);
      var primera = [];
      var rm = null;
      if (cfg.mig) {
        rm = M.resumenMigracion(base, g.regs, k.meses, ref);
        var chk = el("input", { type: "checkbox", "class": "mig-check", "data-fid": "migchk:" + key,
          "aria-label": "Marcar " + N.nombre.toLowerCase() + " " + g.clave + " como migrado a DMS (" + n(rm.registros) + " registros)" });
        chk.checked = rm.estado === "migrado"; chk.indeterminate = rm.estado === "parcial"; chk.disabled = !editor();
        if (rm.estado === "parcial") chk.setAttribute("aria-checked", "mixed");
        chk.addEventListener("change", function () { ui.migAviso = null; aplicarMarca(g.regs, rm.estado !== "migrado", N.nombre + " " + g.clave, "migchk:" + key); });
        primera.push(chk);
      }
      primera.push(celda, el("span", { "class": "badge badge--neutral arbol__nivel" }, [N.nombre]));
      var celdas = [el("td", { "class": "arbol__celda", style: "padding-left:calc(var(--c-spacing-4) + " + (nivel * 24) + "px)" }, primera),
        el("td", { "class": "n", text: n(g.envios) })];
      if (cfg.mig) {
        celdas.push(el("td", { "class": "n", text: nivel < 4 ? n(rm.contratos.completos) + " / " + n(rm.contratos.total) : "—" }));
        celdas.push(el("td", null, [estadoBadge(rm)]));
        celdas.push(el("td", { "class": "n" }, [U.progreso(rm.enviosMigrados, rm.envios, "Envíos migrados de " + g.clave)]));
        celdas.push(el("td", { "class": "n", text: rm.estado === "migrado" && hoja ? (M.migracion(base).marcas[M.clave(g.regs[0])] || "") : "" }));
      } else {
        celdas.push(el("td", { "class": "n" }, [share(g.envios, total)]));
        celdas.push(el("td", { "class": "n", text: nivel < 1 ? n(g.clientes) : "—" }));
        celdas.push(el("td", { "class": "n", text: nivel < 4 ? n(g.contratos) : "—" }));
        celdas.push(el("td", { "class": "n", text: ref ? n(g.ref) : "—" }));
      }
      tbody.appendChild(el("tr", { "class": "arbol__fila arbol__fila--n" + nivel + (rm && rm.estado === "migrado" ? " arbol__fila--migrado" : "") }, celdas));
      if (abierto) hijos(g.regs, nivel + 1, ruta.concat([g.clave]));
    }
    function hijos(rs, nivel, ruta) {
      var grupos = M.grupoNivel(rs, nivel, k.meses, ref).filter(function (g) { return g.envios > 0 || nivel > 0 || cfg.mig; });
      var lk = ruta.join("\u0001") || "__raiz", lim = limites[lk] || PASO;
      grupos.slice(0, lim).forEach(function (g) { fila(g, nivel, ruta); });
      if (grupos.length > lim) {
        tbody.appendChild(el("tr", null, [el("td", { colspan: colsN, style: "padding-left:calc(var(--c-spacing-4) + " + (nivel * 24) + "px)" }, [
          el("button", { type: "button", "class": "btn btn--ghost btn--small", "data-fid": pref + "mas:" + lk, onclick: function () { limites[lk] = lim + PASO; redibujar(pref + "mas:" + lk); } },
            ["Mostrar " + Math.min(PASO, grupos.length - lim) + " más (" + n(grupos.length - lim) + " restantes de " + M.NIVELES[nivel].nombre.toLowerCase() + ")"])])]));
      }
    }
    hijos(regs, 0, []);
    if (!regs.length) tbody.appendChild(el("tr", null, [el("td", { colspan: colsN, "class": "empty-row", text: cfg.vacio || "Sin resultados para los filtros elegidos." })]));
    var ths = cfg.mig
      ? ["Envíos", "Contratos migrados", "Estado", "Envíos migrados", "Fecha"]
      : ["Envíos", "% del universo", "Clientes", "Contratos", ref ? M.mesTxt(ref) + " (últ. mes completo)" : "Últ. mes completo"];
    var head = el("thead", null, [el("tr", null, [el("th", { scope: "col", text: M.NIVELES.map(function (x) { return x.nombre; }).join(" › ") })].concat(ths.map(function (t, i) { return el("th", { scope: "col", "class": cfg.mig && i === 2 ? null : "n", text: t }); })))]);
    cont.appendChild(el("div", { "class": "table-wrap" }, [el("table", { "class": "arbol" }, [el("caption", { "class": "sr-only", text: cfg.caption }), head, tbody])]));
  }

  /* ---------- Migración a DMS (D-020) ---------- */
  function estadoBadge(rm) {
    if (rm.estado === "migrado") return badge("ok", "Migrado", "ok");
    if (rm.estado === "parcial") return badge("warning", "Parcial · " + pct(rm.registrosMigrados / rm.registros), "half");
    return el("span", { "class": "badge badge--neutral" }, [svgIcon("clock", 14), "Pendiente"]);
  }
  function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function aplicarMarca(regs, valor, desc, fid) {
    if (!editor()) { toast("Vista de solo lectura: conectá tu cuenta de GitHub para marcar la migración."); renderTodo(); return; }
    var hoy = hoyISO(), cambios = M.marcarMigrado(base, regs, valor, hoy, desc);
    if (!cambios.length) { toast("No hay cambios: " + desc + (valor ? " ya estaba migrado." : " no tenía marcas.")); return; }
    ui.deshacer = { cambios: cambios, desc: (valor ? "marcar " : "desmarcar ") + desc };
    registrarOp(cambios.map(function (c) { return { k: c.k, v: valor ? hoy : null }; }));
    renderTodo(); U.enfocar(fid);
    toast((valor ? "Marcados como migrados: " : "Desmarcados: ") + n(cambios.length) + " registros (" + desc + "). Tocá «Enviar a GitHub» para que lo vean todos.");
  }
  function regsMig(regs) {
    if (ui.migVer === "todo") return regs;
    var mk = M.migracion(base).marcas;
    return regs.filter(function (r) { var m = !!mk[M.clave(r)]; return ui.migVer === "mig" ? m : !m; });
  }
  function hayFiltros() { return M.NIVELES.some(function (N) { return f[N.id].length; }); }
  function renderMigracion(regs, k) {
    var rm = M.resumenMigracion(base, regs, k.meses, k.mesUltimo);
    var c = $("mig-kpis"); c.innerHTML = "";
    c.appendChild(kpiCard("box", "Envíos migrados", pct(rm.envios ? rm.enviosMigrados / rm.envios : 0), n(rm.enviosMigrados) + " de " + n(rm.envios) + " envíos del período", U.progreso(rm.enviosMigrados, rm.envios, "Envíos migrados")));
    c.appendChild(kpiCard("cal", k.mesUltimo ? "Volumen " + M.mesTxt(k.mesUltimo) : "Último mes completo", pct(rm.ref ? rm.refMigrado / rm.ref : 0), k.mesUltimo ? n(rm.refMigrado) + " de " + n(rm.ref) + " envíos del último mes completo" : "Sin meses completos", U.progreso(rm.refMigrado, rm.ref, "Volumen del último mes completo migrado")));
    c.appendChild(kpiCard("doc", "Contratos migrados", n(rm.contratos.completos) + " / " + n(rm.contratos.total), n(rm.contratos.parciales) + " con algunos servicios migrados", U.progreso(rm.contratos.completos, rm.contratos.total, "Contratos migrados")));
    c.appendChild(kpiCard("user", "Clientes migrados", n(rm.clientes.completos) + " / " + n(rm.clientes.total), n(rm.clientes.parciales) + " con migración parcial", U.progreso(rm.clientes.completos, rm.clientes.total, "Clientes migrados")));
    /* Aviso inicial */
    var av = $("mig-aviso"); av.innerHTML = "";
    var ed = editor();
    ["mig-marcar", "mig-desmarcar", "mig-deshacer", "mig-importar", "mig-sep1"].forEach(function (id) { $(id).hidden = !ed; });
    $("mig-archivo").disabled = !ed;
    if (!ed) av.appendChild(alerta("info", [el("strong", { text: "Vista de solo lectura. " }),
      "Muestra el avance de la migración guardado en GitHub" + (M.migracion(base).actualizado ? " (último cambio: " + fecha(M.migracion(base).actualizado) + (M.migracion(base).usuario ? " por " + M.migracion(base).usuario : "") + ")" : "") + ". Para marcar lo migrado, conectá tu cuenta de GitHub."],
      [el("button", { type: "button", "class": "btn btn--secondary btn--small", onclick: abrirGh }, ["Conectar GitHub"])]));
    else if (ui.migAviso) av.appendChild(alerta(ui.migAviso.nivel, ui.migAviso.contenido, [el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { ui.migAviso = null; renderTodo(); $("t-mig-arbol").focus(); } }, ["Cerrar aviso"])]));
    else if (!Object.keys(M.migracion(base).marcas).length) av.appendChild(alerta("info", [el("strong", { text: "Todavía no hay nada marcado como migrado. " }),
      "Marcá la casilla de un contrato, servicio, razón social o segmento completo en la tabla de abajo, usá «Marcar lo filtrado» con la barra de filtros (por ejemplo, un servicio en todos los clientes) o importá una lista de contratos."]));
    /* Avance por segmento */
    var segs = M.grupoNivel(regs, 0, k.meses, k.mesUltimo).filter(function (g) { return g.envios > 0; }).map(function (g) { var r = M.resumenMigracion(base, g.regs, k.meses, k.mesUltimo); r.clave = g.clave; return r; });
    var cs = $("mig-segmentos"); cs.innerHTML = "";
    cs.appendChild(el("div", { "class": "table-wrap" }, [tabla([
      { t: "Segmento", f: function (r) { return r.clave; } }, { t: "Envíos", n: 1, f: function (r) { return n(r.envios); } },
      { t: "Contratos migrados", n: 1, f: function (r) { return n(r.contratos.completos) + " / " + n(r.contratos.total); } },
      { t: "Estado", f: function (r) { return estadoBadge(r); } },
      { t: "Envíos migrados", n: 1, f: function (r) { return U.progreso(r.enviosMigrados, r.envios, "Envíos migrados de " + r.clave); } }
    ], segs, { caption: "Avance de la migración por segmento" })]));
    /* Últimos cambios */
    var hh = $("mig-hist"); hh.innerHTML = "";
    var hist = M.migracion(base).historial.slice().reverse().slice(0, 8);
    if (!hist.length) hh.appendChild(el("li", { text: "Sin cambios todavía." }));
    hist.forEach(function (x) { hh.appendChild(el("li", null, [el("strong", { text: fecha(x.fecha) + " · " + x.accion }), el("br"), el("span", { text: n(x.registros) + " registros · " + x.desc })])); });
    /* Barra de acciones */
    var filt = hayFiltros(), desc = filt ? "lo filtrado (" + n(regs.length) + " registros)" : "todo el universo (" + n(regs.length) + " registros)";
    $("mig-marcar").textContent = "Marcar " + desc;
    $("mig-desmarcar").textContent = "Desmarcar " + desc;
    $("mig-deshacer").disabled = !ui.deshacer;
    $("mig-deshacer-txt").textContent = ui.deshacer ? "Deshacer: " + ui.deshacer.desc : "Deshacer";
    $("mig-ver").value = ui.migVer;
    renderArbol("mig-arbol", regsMig(regs), k, { mig: true, caption: "Selección de lo migrado a DMS por segmento, razón social, tipo de servicio, servicio y contrato.", vacio: ui.migVer === "mig" ? "No hay nada migrado con estos filtros." : "Sin resultados para los filtros elegidos." });
  }
  function descFiltros() {
    var partes = [];
    M.NIVELES.forEach(function (N) { if (f[N.id].length) partes.push(N.nombre + ": " + (f[N.id].length === 1 ? f[N.id][0] : f[N.id].length + " valores")); });
    return partes.length ? partes.join(" · ") : "todo el universo";
  }
  function marcarFiltrado(valor) {
    var regs = M.filtrar(base, f);
    ui.migAviso = null;
    if (!hayFiltros() && valor && !confirm("No hay filtros: se va a marcar TODO el universo (" + n(regs.length) + " registros) como migrado. ¿Continuar?")) return;
    aplicarMarca(regs, valor, descFiltros(), valor ? "mig-marcar-btn" : "mig-desmarcar-btn");
  }
  function deshacer() {
    if (!ui.deshacer || !editor()) return;
    M.deshacerMigrado(base, ui.deshacer.cambios, ui.deshacer.desc);
    registrarOp(ui.deshacer.cambios.map(function (c) { return { k: c.k, v: c.antes }; }));
    toast("Se deshizo: " + ui.deshacer.desc + " (" + n(ui.deshacer.cambios.length) + " registros).");
    ui.deshacer = null; renderTodo(); $("mig-deshacer").focus();
  }
  function exportarMigracion() {
    var mk = M.migracion(base).marcas, regs = M.filtrar(base, f).slice().sort(M.compararJer);
    function q(v) { v = String(v == null ? "" : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [["Segmento", "Razón Social", "Tipo de Servicio", "Servicio", "N° Contrato", "Migrado a DMS", "Fecha de marca"].map(q).join(";")];
    regs.forEach(function (r) { var m = mk[M.clave(r)]; lines.push([r.segmento, r.cliente, r.tipo, r.servicio, r.contrato, m ? "SI" : "NO", m || ""].map(q).join(";")); });
    descargar("\uFEFF" + lines.join("\r\n"), "migracion-dms-estado-" + hoyISO() + ".csv", "text/csv;charset=utf-8");
    toast("Se exportó el estado de " + n(regs.length) + " registros.");
  }
  function importarContratos(file) {
    var esCSV = /\.(csv|txt)$/i.test(file.name);
    (esCSV ? file.text().then(M.parseCSV) : file.arrayBuffer().then(M.leerXLSX)).then(function (rows) {
      var lista = M.contratosDesdeFilas(rows);
      if (!lista.length) throw new Error("No encontré números de contrato (columna «Contrato» o números de 6 a 12 dígitos).");
      var set = {}; lista.forEach(function (c) { set[c] = 1; });
      var regs = base.registros.filter(function (r) { return set[r.contrato]; });
      var encontrados = {}; regs.forEach(function (r) { encontrados[r.contrato] = 1; });
      var faltan = lista.filter(function (c) { return !encontrados[c]; });
      ui.migAviso = { nivel: faltan.length ? "warning" : "ok", contenido: [el("strong", { text: file.name + ": " }), n(lista.length) + " contratos en el archivo, " + n(Object.keys(encontrados).length) + " encontrados en la base" + (faltan.length ? ", " + n(faltan.length) + " no están en la base (ej.: " + faltan.slice(0, 5).join(", ") + ")." : ".")] };
      if (regs.length) aplicarMarca(regs, true, "importación " + file.name, "mig-importar-btn"); else renderTodo();
    }).catch(function (e) {
      ui.migAviso = { nivel: "error", contenido: [el("strong", { text: "No pude leer el archivo. " }), e && e.message ? e.message : String(e)] };
      renderTodo();
    });
  }

  /* ---------- Detalle ---------- */
  var ultimoDetalle = null;
  function renderDetalle(regs, k) {
    var meses = k.meses, filas = regs.map(function (r) { return { r: r, total: M.sumaMeses(r, meses) }; });
    var key = ui.sortKey, dir = ui.sortDir;
    function val(o) { if (key === "total") return o.total; if (key.indexOf("m:") === 0) return o.r.v[key.slice(2)] || 0; if (key === "cliente") return M.cliDe(o.r); if (key === "segmento") return M.segDe(o.r); return o.r[key]; }
    if (key === "jer") filas.sort(function (a, b) { return M.compararJer(a.r, b.r) * dir; });
    else filas.sort(function (a, b) { var x = val(a), y = val(b); return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "es")) * dir || M.compararJer(a.r, b.r); });
    var pages = Math.max(1, Math.ceil(filas.length / ui.pageSize)); if (ui.page >= pages) ui.page = pages - 1;
    var vis = filas.slice(ui.page * ui.pageSize, (ui.page + 1) * ui.pageSize);
    var cols = [{ t: "Segmento", key: "segmento", f: function (o) { return M.segDe(o.r); } }, { t: "Razón social", key: "cliente", f: function (o) { return linkCliente(M.cliDe(o.r)); } },
      { t: "Tipo de servicio", key: "tipo", f: function (o) { return o.r.tipo; } }, { t: "Servicio", key: "servicio", f: function (o) { return o.r.servicio; } }, { t: "N° contrato", key: "contrato", f: function (o) { return o.r.contrato; }, cls: "num" }]
      .concat(meses.map(function (m) { return { t: M.mesTxt(m) + (m === base.mesParcial ? "*" : ""), key: "m:" + m, n: 1, f: function (o) { return o.r.v[m] ? n(o.r.v[m]) : "—"; } }; }))
      .concat([{ t: "Total", key: "total", n: 1, f: function (o) { return n(o.total); } }]);
    var c = $("detalle"); c.innerHTML = "";
    c.appendChild(tabla(cols, vis, { caption: "Detalle por contrato y servicio", sort: { key: key, dir: dir }, onSort: function (kk) { if (ui.sortKey === kk) ui.sortDir = -ui.sortDir; else { ui.sortKey = kk; ui.sortDir = kk === "total" || kk.indexOf("m:") === 0 ? -1 : 1; } renderDetalle(regs, k); c.querySelector("th[aria-sort]:not([aria-sort='none']) button").focus(); } }));
    $("detalle-sub").textContent = n(filas.length) + " registros (contrato + tipo + servicio)" + (base.mesParcial && meses.indexOf(base.mesParcial) >= 0 ? " · * mes parcial" : "");
    var pg = $("pager"); pg.innerHTML = "";
    pg.appendChild(el("span", { text: filas.length ? "Registros " + n(ui.page * ui.pageSize + 1) + "–" + n(Math.min(filas.length, (ui.page + 1) * ui.pageSize)) + " de " + n(filas.length) + " · página " + (ui.page + 1) + " de " + pages : "" }));
    pg.appendChild(el("div", { "class": "pager__btns" }, [
      ui.sortKey !== "jer" ? el("button", { type: "button", "class": "btn btn--ghost btn--small", onclick: function () { ui.sortKey = "jer"; ui.sortDir = 1; ui.page = 0; renderDetalle(regs, k); } }, ["Volver al orden jerárquico"]) : null,
      el("button", { type: "button", "class": "btn btn--ghost btn--small", disabled: ui.page === 0, onclick: function () { ui.page--; renderDetalle(regs, k); } }, ["Anterior"]),
      el("button", { type: "button", "class": "btn btn--ghost btn--small", disabled: ui.page >= pages - 1, onclick: function () { ui.page++; renderDetalle(regs, k); } }, ["Siguiente"])
    ]));
    ultimoDetalle = { filas: filas, meses: meses };
  }
  function exportarCSV() {
    if (!ultimoDetalle) return;
    var meses = ultimoDetalle.meses, mk = M.migracion(base).marcas;
    function q(v) { v = String(v == null ? "" : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
    var lines = [["Segmento", "Razón Social", "Tipo de Servicio", "Servicio", "N° Contrato"].concat(meses.map(M.mesTxt), ["Total", "Migrado a DMS"]).map(q).join(";")];
    ultimoDetalle.filas.forEach(function (o) { lines.push([o.r.segmento, o.r.cliente, o.r.tipo, o.r.servicio, o.r.contrato].concat(meses.map(function (m) { return o.r.v[m] || 0; }), [o.total, mk[M.clave(o.r)] ? "SI" : "NO"]).map(q).join(";")); });
    descargar("\uFEFF" + lines.join("\r\n"), "matriz-envios-filtrado-" + hoyISO() + ".csv", "text/csv;charset=utf-8");
    toast("Se exportaron " + n(ultimoDetalle.filas.length) + " registros a CSV.");
  }
  function descargar(contenido, nombre, tipo) {
    var blob = new Blob([contenido], { type: tipo }), url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: nombre }); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  /* ---------- Diálogos (modales) ---------- */
  var modalPrev = null, pendiente = null, abiertoId = null;
  function abrirDialogo(id, foco) {
    U.cerrarLista(false);
    modalPrev = document.activeElement; abiertoId = id;
    $(id).setAttribute("data-open", "true");
    document.body.style.overflow = "hidden";
    setTimeout(function () { $(foco).focus(); }, 0);
  }
  function cerrarDialogo() {
    if (!abiertoId) return;
    $(abiertoId).setAttribute("data-open", "false"); abiertoId = null;
    document.body.style.overflow = "";
    if (modalPrev && modalPrev.focus && document.body.contains(modalPrev)) modalPrev.focus(); else $("btn-gh").focus();
  }
  function abrirModal() {
    if (!editor()) { abrirGh(); return; }
    pendiente = null;
    $("modal-resultado").innerHTML = ""; $("archivo").value = ""; $("archivo-nombre").textContent = "";
    $("modal-aplicar").disabled = true; $("modal-aplicar").textContent = base ? "Agregar a la base" : "Usar como base";
    abrirDialogo("modal", "modal-cerrar");
  }
  var cerrarModal = cerrarDialogo;
  function teclado(ev) {
    if (!abiertoId) { if (ev.key === "Escape" && U.hayAbierto()) U.cerrarLista(true); return; }
    if (ev.key === "Escape") { ev.preventDefault(); cerrarDialogo(); return; }
    if (ev.key !== "Tab") return;
    var foc = Array.prototype.filter.call($(abiertoId).querySelectorAll("button, [href], input, select, summary, [tabindex]:not([tabindex='-1'])"), function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!foc.length) return;
    var first = foc[0], last = foc[foc.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }

  /* ---------- Conexión con GitHub (clave personal del editor, guardada solo en este navegador) ---------- */
  function abrirGh() { renderGh(); abrirDialogo("modal-gh", editor() ? "gh-desconectar" : "gh-token"); }
  function renderGh() {
    var c = $("gh-body"); c.innerHTML = "";
    if (editor()) {
      c.appendChild(alerta("ok", [el("strong", { text: "Conectado como " + gh.usuario + ". " }), "Podés marcar la migración, cargar descargas nuevas y enviarlas a GitHub. La clave está guardada solo en este navegador."]));
      c.appendChild(el("button", { type: "button", "class": "btn btn--secondary", id: "gh-desconectar", onclick: desconectar }, ["Desconectar este navegador"]));
      return;
    }
    c.appendChild(el("p", { "class": "gh-intro", text: "Cualquiera puede ver el dashboard. Para editar (marcar la migración o cargar una descarga nueva) hace falta una clave personal de GitHub con permiso de escritura en el repositorio. Se genera una sola vez:" }));
    c.appendChild(el("ol", { "class": "gh-pasos" }, [
      el("li", null, ["Entrá a ", el("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener noreferrer" }, ["GitHub › Fine-grained tokens › Generate new token (se abre en otra pestaña)"]), "."]),
      el("li", null, ["Nombre: «Dashboard matriz de envíos». Vencimiento: el que prefieras (por ejemplo, 90 días)."]),
      el("li", null, ["Repository access: «Only select repositories» › ", el("strong", { text: S.CFG.owner + "/" + S.CFG.repo }), "."]),
      el("li", null, ["Permissions › Repository permissions › ", el("strong", { text: "Contents: Read and write" }), "."]),
      el("li", null, ["Tocá «Generate token», copiala y pegala acá abajo."])
    ]));
    var inp = el("input", { "class": "input gh-token", type: "password", id: "gh-token", autocomplete: "off", spellcheck: "false", "aria-describedby": "gh-nota" });
    inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); conectar(); } });
    c.appendChild(el("div", { "class": "field" }, [el("label", { "for": "gh-token", text: "Clave de GitHub (token)" }), inp,
      el("span", { "class": "gh-nota", id: "gh-nota", text: "No la compartas. Queda guardada solo en este navegador y se puede quitar con «Desconectar»." })]));
    c.appendChild(el("div", { id: "gh-resultado", "aria-live": "polite" }));
    c.appendChild(el("button", { type: "button", "class": "btn btn--primary", id: "gh-conectar", onclick: conectar }, ["Conectar"]));
  }
  function conectar() {
    var token = ($("gh-token").value || "").trim(), res = $("gh-resultado");
    res.innerHTML = "";
    if (!token) { res.appendChild(alerta("error", ["Pegá la clave de GitHub para conectar."])); $("gh-token").focus(); return; }
    $("gh-conectar").disabled = true;
    res.appendChild(alerta("info", ["Verificando la clave…"]));
    var cli = new S.Cliente(token);
    cli.verificar().then(function (v) {
      $("gh-conectar").disabled = false; res.innerHTML = "";
      if (!v.puedeEscribir) { res.appendChild(alerta("error", ["El usuario " + v.usuario + " no tiene permiso de escritura en " + S.CFG.owner + "/" + S.CFG.repo + "."])); return; }
      try { localStorage.setItem(LS_TOKEN, token); } catch (e) { /* sin almacenamiento: queda solo en esta sesión */ }
      gh.cliente = cli; gh.usuario = v.usuario; gh.puede = true;
      cerrarDialogo(); renderTodo(); $("btn-gh").focus();
      toast("Conectado como " + v.usuario + ". Ya podés editar y enviar a GitHub.");
    }).catch(function (e) {
      $("gh-conectar").disabled = false; res.innerHTML = "";
      res.appendChild(alerta("error", [e && e.message ? e.message : String(e)])); $("gh-token").focus();
    });
  }
  function desconectar() {
    if (hayPend() && !confirm("Hay cambios sin enviar (" + pendTxt() + "). Quedan guardados en este navegador, pero no se van a poder enviar hasta que conectes de nuevo. ¿Desconectar igual?")) return;
    try { localStorage.removeItem(LS_TOKEN); } catch (e) { /* nada */ }
    gh.cliente = new S.Cliente(null); gh.usuario = null; gh.puede = false;
    cerrarDialogo(); renderTodo(); $("btn-gh").focus();
    toast("Se quitó la clave de GitHub de este navegador.");
  }
  /* Al abrir: si hay una clave guardada, se verifica en segundo plano */
  function verificarGuardada() {
    if (!gh.cliente.token) return;
    gh.cliente.verificar().then(function (v) { gh.usuario = v.usuario; gh.puede = v.puedeEscribir; renderTodo(); })
      .catch(function (e) {
        if (e.status === 401 && gh.cliente.token) { olvidarClave(); renderTodo(); }
      });
  }

  /* ---------- Estado vacío: todavía no hay matriz en GitHub ---------- */
  function renderVacio() {
    var c = $("vacio-body"); c.innerHTML = "";
    if (gh.cargando) { c.appendChild(el("p", { text: "Cargando datos desde GitHub…" })); return; }
    if (gh.error) { c.appendChild(el("p", { text: "No se pudieron leer los datos. Revisá la conexión y tocá «Reintentar»." })); return; }
    c.appendChild(el("h2", { text: "Todavía no hay datos de la matriz de envíos" }));
    if (!editor()) { c.appendChild(el("p", { text: "Cuando se cargue la primera descarga de Power BI la vas a ver acá. Si sos quien la carga, conectá tu cuenta de GitHub." }));
      c.appendChild(el("button", { type: "button", "class": "btn btn--secondary", onclick: abrirGh }, ["Conectar GitHub"])); return; }
    c.appendChild(el("p", { text: "Cargá el Excel de la Matriz de Envíos (formato oficial: data (11).xlsx) y después tocá «Enviar a GitHub»." }));
    var acc = el("div", { "class": "vacio__acciones" }, [el("button", { type: "button", "class": "btn btn--primary", id: "vacio-cargar", onclick: abrirModal }, [svgIcon("upload", 16), "Cargar Excel de Power BI"])]);
    var vieja = null; try { vieja = JSON.parse(leerLS(LS_VIEJA) || "null"); } catch (e) { vieja = null; }
    if (vieja && vieja.registros && vieja.fuente !== "demo") {
      var nm = vieja.migracion && vieja.migracion.marcas ? Object.keys(vieja.migracion.marcas).length : 0;
      acc.appendChild(el("button", { type: "button", "class": "btn btn--secondary", id: "vacio-vieja", onclick: function () { usarVieja(vieja); } },
        ["Usar la base guardada en este navegador (" + n(vieja.registros.length) + " registros" + (nm ? ", " + n(nm) + " marcas de migración" : "") + ", " + fecha(vieja.actualizado) + ")"]));
    }
    c.appendChild(acc);
  }
  function usarVieja(v) {
    var marcas = v.migracion && v.migracion.marcas ? v.migracion.marcas : {};
    base = v; base.migracion = migVacia(); gh.baseCambiada = true;
    var cambios = Object.keys(marcas).map(function (k) { return { k: k, v: marcas[k] }; });
    if (cambios.length) {
      var hh = { fecha: new Date().toISOString(), accion: "Marcado como migrado", registros: cambios.length, desc: "marcas guardadas en el navegador", usuario: gh.usuario };
      S.aplicarPendientes(base.migracion, [{ cambios: cambios, hist: hh }]);
      gh.pendientes.push({ cambios: cambios, hist: hh });
    }
    guardarPendientes(); renderTodo();
    toast("Se cargó la base guardada en este navegador. Tocá «Enviar a GitHub» para guardarla para todos.");
  }
  function leerArchivo(file) {
    var res = $("modal-resultado"); res.innerHTML = "";
    $("archivo-nombre").textContent = file.name + " · " + U.fmt1.format(file.size / 1024) + " KB";
    $("modal-aplicar").disabled = true; pendiente = null;
    res.appendChild(alerta("info", ["Leyendo el archivo…"]));
    var esCSV = /\.(csv|txt)$/i.test(file.name);
    (esCSV ? file.text().then(M.parseCSV) : file.arrayBuffer().then(M.leerXLSX)).then(function (rows) {
      var parsed = M.desdeFilas(rows);
      if (!parsed.registros.length) throw new Error("El archivo no tiene filas de detalle.");
      mostrarResumen(parsed, file.name);
    }).catch(function (e) {
      res.innerHTML = "";
      res.appendChild(alerta("error", [el("strong", { text: "No pude leer el archivo. " }), e && e.message ? e.message : String(e)]));
    });
  }
  function mostrarResumen(parsed, nombre) {
    var res = $("modal-resultado"); res.innerHTML = "";
    var esDemo = !base;
    var d = base ? M.diferencias(base, parsed) : { nuevos: [], cambios: [], mesesNuevos: [], ausentes: 0, duplicados: 0, filtrosDistintos: false, registrosDescarga: parsed.registros.length, tiposDeducidos: 0 };
    var suma = parsed.control.sumaDetalle;
    res.appendChild(el("h3", { text: "Resumen de la descarga" }));
    var items = esDemo
      ? [[parsed.registros.length, "registros en la descarga"], [parsed.meses.length, "meses (" + M.mesTxt(parsed.meses[0]) + " a " + M.mesTxt(parsed.meses[parsed.meses.length - 1]) + ")"], [suma, "envíos en total"]]
      : [[d.nuevos.length, "registros nuevos"], [d.mesesNuevos.length, "meses nuevos" + (d.mesesNuevos.length ? " (" + d.mesesNuevos.map(M.mesTxt).join(", ") + ")" : "")], [d.cambios.length, "valores que cambian"],
         [d.registrosDescarga, "registros en la descarga"], [d.ausentes, "registros de la base que no vienen (se conservan)"], [suma, "envíos en la descarga"]];
    res.appendChild(el("ul", { "class": "summary" }, items.map(function (x) { return el("li", null, [el("b", { text: n(x[0]) }), el("span", { text: x[1] })]); })));
    var c = parsed.control;
    if (c.cuadra === true) res.appendChild(alerta("ok", [el("strong", { text: "Los totales cuadran. " }), "La suma del detalle (" + n(c.sumaDetalle) + ") coincide con el total general del archivo."]));
    else if (c.cuadra === false) res.appendChild(alerta("error", [el("strong", { text: "Los totales no cuadran. " }), "Suma del detalle: " + n(c.sumaDetalle) + " · total general del archivo: " + n(c.totalGeneral) + ". Revisá la descarga antes de seguir."]));
    else res.appendChild(alerta("warning", ["No encontré la fila de total general para controlar la suma (" + n(c.sumaDetalle) + " envíos en el detalle)."]));
    if (d.filtrosDistintos) res.appendChild(alerta("warning", [el("strong", { text: "Los filtros de la descarga no coinciden con los de la base. " }), "Base: " + base.filtros + " · Descarga: " + parsed.filtros]));
    else if (parsed.filtros) res.appendChild(el("p", { "class": "panel__sub", text: "Filtros de la descarga: " + parsed.filtros }));
    if (d.duplicados) res.appendChild(alerta("warning", [n(d.duplicados) + " registros repetidos en la descarga (misma clave): se toma el primero."]));
    if (parsed.fillDown) res.appendChild(alerta("info", ["Las etiquetas venían en blanco en las filas repetidas: se completaron hacia abajo."]));
    if (parsed.sinTipo) res.appendChild(alerta("info", [el("strong", { text: "La descarga no trae la columna «Tipo de Servicio». " }),
      esDemo ? "Los registros quedan como «" + M.NO_INF + "». Si una descarga posterior la trae, se completa sola sin duplicar registros."
        : n(d.tiposDeducidos) + " de " + n(parsed.registros.length) + " registros toman el tipo de la base (mismo contrato y servicio); el resto queda como «" + M.NO_INF + "»."]));
    var sinCon = parsed.registros.filter(function (r) { return r.contrato === M.SIN_CON; });
    if (sinCon.length) res.appendChild(alerta("warning", [n(sinCon.length) + " filas tienen servicio y envíos pero no tienen segmento, razón social ni contrato (" + n(sinCon.reduce(function (a, r) { return a + r.valores.reduce(function (x, y) { return x + y; }, 0); }, 0)) + " envíos). Se incluyen como «" + M.SIN_CON + "» para que el total cuadre."]));
    if (!esDemo && d.cambios.length) {
      res.appendChild(el("details", { "class": "details-data" }, [el("summary", { text: "Ver valores que cambian (" + n(d.cambios.length) + ")" }),
        el("div", { "class": "table-wrap", style: "margin-top:8px;max-height:240px" }, [tabla([{ t: "Contrato", f: function (x) { return x.contrato; } }, { t: "Servicio", f: function (x) { return x.servicio; } }, { t: "Mes", f: function (x) { return M.mesTxt(x.mes); } }, { t: "Antes", n: 1, f: function (x) { return n(x.antes); } }, { t: "Después", n: 1, f: function (x) { return n(x.despues); } }], d.cambios.slice(0, 200))])]));
    }
    if (esDemo) {
      res.appendChild(alerta("info", ["Todavía no hay matriz en GitHub: esta descarga va a ser la ", el("strong", { text: "base inicial" }), ". Después tocá «Enviar a GitHub» para que la vean todos."]));
      pendiente = { parsed: parsed, nombre: nombre, modo: "reemplazar" };
    } else {
      var nMarcas = Object.keys(M.migracion(base).marcas).length;
      var grupo = el("fieldset", { "class": "choice", style: "border:0;padding:0;margin:0" }, [el("legend", { "class": "sr-only", text: "Cómo aplicar la descarga" }),
        el("label", null, [el("input", { type: "radio", name: "modo", value: "agregar", checked: !d.filtrosDistintos }), el("span", null, [el("strong", { text: "Agregar a la base" + (d.filtrosDistintos ? ". " : " (recomendado). ") }), "Suma lo nuevo, reemplaza los meses que ya estaban y conserva lo que no viene. Conserva las marcas de migración."])]),
        el("label", null, [el("input", { type: "radio", name: "modo", value: "reemplazar", checked: d.filtrosDistintos }), el("span", null, [el("strong", { text: "Reemplazar la base completa" + (d.filtrosDistintos ? " (recomendado: los filtros son distintos). " : ". ") }), "Descarta la base actual y usa solo esta descarga." + (nMarcas ? " Las " + n(nMarcas) + " marcas de migración se conservan." : "")])])]);
      grupo.addEventListener("change", function (ev) { pendiente.modo = ev.target.value; $("modal-aplicar").textContent = ev.target.value === "agregar" ? "Agregar a la base" : "Reemplazar base"; });
      res.appendChild(grupo);
      pendiente = { parsed: parsed, nombre: nombre, modo: d.filtrosDistintos ? "reemplazar" : "agregar" };
    }
    $("modal-aplicar").textContent = pendiente.modo === "agregar" ? "Agregar a la base" : (esDemo ? "Usar como base" : "Reemplazar base");
    $("modal-aplicar").disabled = false;
  }
  function aplicar() {
    if (!pendiente) return;
    var msg;
    if (pendiente.modo === "reemplazar") {
      /* Las marcas de migración se guardan aparte (por contrato + tipo + servicio): reemplazar la matriz no las borra */
      var previas = base ? M.migracion(base) : (gh.migSola || migVacia());
      var hist = base ? (base.historial || []) : [];
      base = M.nuevaBase(pendiente.parsed, "export", new Date(), pendiente.nombre);
      base.historial = hist.concat(base.historial).slice(-100);
      base.migracion = previas;
      msg = "Base cargada: " + n(base.registros.length) + " registros, " + n(M.totalBase(base)) + " envíos.";
    } else {
      var d = M.fusionar(base, pendiente.parsed, pendiente.nombre, new Date());
      msg = "Base actualizada: " + n(d.nuevos.length) + " registros nuevos, " + n(d.cambios.length) + " valores cambiados" + (d.mesesNuevos.length ? ", meses nuevos: " + d.mesesNuevos.map(M.mesTxt).join(", ") : "") + ".";
    }
    gh.baseCambiada = true; guardarPendientes();
    pendiente = null; ui.deshacer = null; cerrarModal();
    f = filtrosVacios(); ui.page = 0; ui.abiertos = {}; ui.limites = {}; ui.migAbiertos = {}; ui.migLimites = {};
    renderTodo();
    var a = alerta("success", [el("strong", { text: msg + " " }), "Falta enviarla a GitHub para que la vean todos (mientras tanto queda guardada en este navegador)."],
      [el("button", { type: "button", "class": "btn btn--primary btn--small", onclick: function () { a.remove(); enviar(); } }, [svgIcon("upload", 16), "Enviar a GitHub"])]);
    $("alertas").appendChild(a);
    toast(msg);
    $("contenido").focus();
  }

  /* ---------- Render general: solo la pestaña visible ---------- */
  function renderTodo() {
    renderAlertas(); renderSync();
    var hay = !!base;
    $("vacio").hidden = hay; $("controles").hidden = !hay;
    if (!hay) {
      VISTAS.forEach(function (v) { $("vista-" + v.id).hidden = true; });
      $("subtitulo").textContent = gh.cargando ? "Cargando datos desde GitHub…" : "Sin datos cargados";
      $("estado-base").innerHTML = ""; $("footer-base").textContent = "";
      renderVacio(); return;
    }
    renderBase(); renderBarra(); renderVistas();
    var regs = M.filtrar(base, f), k = M.kpis(base, regs, f.meses);
    if (ui.vista === "resumen") {
      renderKpis(k);
      renderArbol("arbol", regs, k, { caption: "Universo de envíos por segmento, razón social, tipo de servicio, servicio y contrato. Usá los botones para expandir cada nivel." });
      $("btn-contraer").disabled = !Object.keys(ui.abiertos).length;
      var seg = M.agrupar(regs, M.segDe, k.meses).filter(function (x) { return x.envios > 0; }).sort(function (a, b) { return b.envios - a.envios; }).slice(0, 12);
      chartBarras("ch-segmentos", seg, f.segmentos, function (v) { toggle(f.segmentos, v); cambio(); }, "Envíos por segmento");
      var sv = M.agrupar(regs, function (r) { return r.servicio; }, k.meses).filter(function (x) { return x.envios > 0; }).sort(function (a, b) { return b.envios - a.envios; }).slice(0, 12);
      chartBarras("ch-servicios", sv, f.servicios, function (v) { toggle(f.servicios, v); cambio(); }, "Servicios con más envíos");
      renderRankings(regs, k);
    } else if (ui.vista === "analisis") {
      chartEvolucion(regs, k); chartMix(regs, k); renderTabs(regs, k); renderCalidad(); renderDetalle(regs, k);
    } else {
      renderMigracion(regs, k);
    }
  }

  /* ---------- Eventos ---------- */
  $("btn-csv").addEventListener("click", exportarCSV);
  $("btn-contraer").addEventListener("click", function () { ui.abiertos = {}; ui.limites = {}; renderTodo(); $("t-arbol").focus(); });
  $("btn-actualizar").addEventListener("click", abrirModal);
  $("gh-cerrar").addEventListener("click", cerrarDialogo);
  $("modal-gh").addEventListener("click", function (ev) { if (ev.target === $("modal-gh")) cerrarDialogo(); });
  $("modal-cerrar").addEventListener("click", cerrarModal);
  $("modal-cancelar").addEventListener("click", cerrarModal);
  $("modal-aplicar").addEventListener("click", aplicar);
  $("modal").addEventListener("click", function (ev) { if (ev.target === $("modal")) cerrarModal(); });
  document.addEventListener("keydown", teclado);
  $("archivo").addEventListener("change", function (ev) { if (ev.target.files[0]) leerArchivo(ev.target.files[0]); });
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.setAttribute("data-over", "true"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.setAttribute("data-over", "false"); }); });
  drop.addEventListener("drop", function (ev) { var fl = ev.dataTransfer && ev.dataTransfer.files[0]; if (fl) leerArchivo(fl); });
  $("mig-marcar").addEventListener("click", function () { marcarFiltrado(true); });
  $("mig-desmarcar").addEventListener("click", function () { marcarFiltrado(false); });
  $("mig-deshacer").addEventListener("click", deshacer);
  $("mig-exportar").addEventListener("click", exportarMigracion);
  $("mig-archivo").addEventListener("change", function (ev) { if (ev.target.files[0]) importarContratos(ev.target.files[0]); ev.target.value = ""; });
  $("mig-ver").addEventListener("change", function (ev) { ui.migVer = ev.target.value; renderTodo(); $("mig-ver").focus(); });
  $("mig-contraer").addEventListener("click", function () { ui.migAbiertos = {}; ui.migLimites = {}; renderTodo(); $("t-mig-arbol").focus(); });

  /* Revisión automática: al volver a la pestaña y cada 5 minutos, si hay cambios nuevos en GitHub se recargan (solo sin cambios pendientes) */
  function revisarCambios() {
    if (document.hidden || gh.cargando || gh.enviando || hayPend() || Date.now() - gh.ultimaCarga < 60000) return;
    gh.ultimaCarga = Date.now();
    gh.cliente.refDatos().then(function (sha) { if (sha && sha !== gh.sha) cargarRemoto(true); }, function () { /* se reintenta en la próxima vuelta */ });
  }
  document.addEventListener("visibilitychange", revisarCambios);
  if (typeof setInterval !== "undefined") setInterval(revisarCambios, 5 * 60000);
  if (window.addEventListener) window.addEventListener("beforeunload", function (ev) { if (hayPend()) { ev.preventDefault(); ev.returnValue = ""; } });

  var listo;
  try {
    renderTodo();
    verificarGuardada();
    listo = cargarRemoto(false);
  } catch (e) {
    $("alertas").appendChild(alerta("error", [el("strong", { text: "Error al iniciar el dashboard: " }), e && e.message ? e.message : String(e)]));
    if (window.console) console.error(e);
  }
  window.__MATRIZ_APP__ = { base: function () { return base; }, filtros: function () { return f; }, ui: ui, irA: irA, gh: gh, listo: function () { return listo; }, enviar: enviar, revisar: revisarCambios };
})();
/* ==APP-END== */
