/* ABM Contratos DMS · prototipo de propuesta (T-007, D-063 a D-068). Datos ficticios. */
(function (g) {
  "use strict";
  var D = g.ABM_DATOS;

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clon(o) { return JSON.parse(JSON.stringify(o)); }
  function hoyISO() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function manianaISO() { var d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function fmtFecha(iso) { if (!iso) return "—"; var p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function ahora() { var d = new Date(); return hoyISO() + " " + p2(d.getHours()) + ":" + p2(d.getMinutes()); }
  function sap(nro) { for (var i = 0; i < D.SAP.length; i++) if (D.SAP[i].nro === nro) return D.SAP[i]; return null; }
  function ciclo(id) { for (var i = 0; i < D.CICLOS.length; i++) if (D.CICLOS[i].id === id) return D.CICLOS[i]; return null; }
  function clase(id) { for (var i = 0; i < D.CLASES.length; i++) if (D.CLASES[i].id === id) return D.CLASES[i]; return null; }
  function condDef(id) { for (var i = 0; i < D.CONDICIONES.length; i++) if (D.CONDICIONES[i].id === id) return D.CONDICIONES[i]; return null; }
  function domTexto(d) { return d.calle + " " + d.numero + ", " + d.localidad + ", " + d.provincia + " (CP " + d.cp + ")"; }
  function domClave(d) { return [d.calle, d.numero, d.localidad, d.provincia, d.cp].join("|").toLowerCase().replace(/\s+/g, " ").trim(); }

  var ICO = {
    info: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="2"/><rect x="9" y="8.5" width="2" height="6" fill="currentColor"/><rect x="9" y="5" width="2" height="2" fill="currentColor"/></svg>',
    alerta: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2 19 18H1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><rect x="9" y="7.5" width="2" height="5" fill="currentColor"/><rect x="9" y="14" width="2" height="2" fill="currentColor"/></svg>',
    error: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    ok: '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 10.5l2.7 2.7L14 7.8" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    check: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5 5 9l5-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    cruz: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3 3 9" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    reloj: '<svg viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 3v3l2 1.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
    pausa: '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="3" y="2.5" width="2" height="7" fill="currentColor"/><rect x="7" y="2.5" width="2" height="7" fill="currentColor"/></svg>',
    flecha: '<svg class="flecha" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    kebab: '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="4" r="2" fill="currentColor"/><circle cx="10" cy="10" r="2" fill="currentColor"/><circle cx="10" cy="16" r="2" fill="currentColor"/></svg>'
  };
  function alerta(tipo, html, extra) {
    var ic = tipo === "info" ? ICO.info : tipo === "success" ? ICO.ok : tipo === "error" ? ICO.error : ICO.alerta;
    var rol = tipo === "error" ? ' role="alert"' : "";
    return '<div class="alert alert-' + tipo + '"' + rol + (extra || "") + ">" + ic + "<div>" + html + "</div></div>";
  }
  function chipEstado(c) {
    if (c.estado === "habilitado") return '<span class="chip chip-ok">' + ICO.check + "Habilitado</span>";
    if (c.estado === "programado") return '<span class="chip chip-prog">' + ICO.reloj + "Vigente desde " + fmtFecha(c.vigencia) + "</span>";
    return '<span class="chip chip-off">' + ICO.pausa + "Deshabilitado</span>";
  }

  /* ---------- lógica pura (testeable en Node) ---------- */
  function nuevoBorrador() {
    var cond = {};
    D.CONDICIONES.forEach(function (c) { cond[c.id] = c.tipo === "opciones" ? "" : false; });
    return { nro: "", niveles: { logistica: "", container: "", sla: "", form: "" }, ciclo: "", cond: cond,
      analizar: { poliza: "", tipoEnvio: "", tipoEntrega: "", agrupador: "", finValidez: "9999-12-31" },
      domicilios: [], estado: "", vigencia: "" };
  }
  function clasesCubiertas(b) {
    var m = {};
    b.domicilios.forEach(function (d) { d.clases.forEach(function (c) { m[c] = d.id; }); });
    return m;
  }
  function faltantes(paso, b, ctx) {
    var f = [];
    if (paso === 1) {
      if (!b.nro) f.push("Elegir el contrato de SAP");
      else if (ctx && ctx.modo === "alta" && ctx.yaConfigurado(b.nro)) f.push("El contrato elegido ya está configurado: editalo desde el listado");
    }
    if (paso === 2) {
      D.NIVELES.forEach(function (n) { if (!b.niveles[n.id]) f.push("Elegir «" + n.nombre + "»"); });
      if (!b.ciclo) f.push("Elegir el ciclo de vida");
      if (!b.cond.remito) f.push("Indicar cómo viaja el remito (Admisión)");
    }
    if (paso === 3) {
      var cub = clasesCubiertas(b);
      D.CLASES.forEach(function (c) { if (c.obligatoria && !cub[c.id]) f.push("Cargar domicilio de «" + c.nombre + "»"); });
    }
    if (paso === 4) {
      if (!b.estado) f.push("Elegir cómo queda el contrato al guardar");
      if (b.estado === "programado") {
        if (!b.vigencia) f.push("Indicar la fecha «Vigente desde»");
        else if (b.vigencia < manianaISO()) f.push("La fecha «Vigente desde» debe ser posterior a hoy");
      }
    }
    return f;
  }
  function advertencias(b) {
    var a = [];
    var frioCont = /Refrigerado|Congelado/.test(b.niveles.container || "");
    if (frioCont && !b.cond.frio) a.push({ tipo: "warning", txt: "El container es «" + b.niveles.container + "» pero «Cadena de frío» está apagada. Revisá si corresponde activarla." });
    if (!frioCont && b.niveles.container && b.cond.frio) a.push({ tipo: "caution", txt: "«Cadena de frío» está activa con container «" + b.niveles.container + "»." });
    if (b.cond.conservadora && !b.cond.frio) a.push({ tipo: "caution", txt: "«Conservadora cerrada por el cliente» suele ir con «Cadena de frío»." });
    return a;
  }
  function textoCond(c, v) { return c.tipo === "opciones" ? (v || "—") : (v ? "Sí" : "No"); }
  function filasResumen(b) {
    var s = sap(b.nro) || {};
    var f = [];
    function add(sec, k, v) { f.push({ sec: sec, k: k, v: v }); }
    add("sap", "N° de contrato", b.nro); add("sap", "Descripción", s.desc); add("sap", "Razón social", s.razon); add("sap", "Solicitante", s.solicitante);
    add("analizar", "Póliza", b.analizar.poliza || "—"); add("analizar", "Tipo de envío", b.analizar.tipoEnvio || "—");
    add("analizar", "Tipo de entrega", b.analizar.tipoEntrega || "—"); add("analizar", "Contrato agrupador", b.analizar.agrupador || "—");
    add("analizar", "Fin de validez", b.analizar.finValidez === "9999-12-31" ? "Sin vencimiento (31/12/9999)" : fmtFecha(b.analizar.finValidez));
    D.NIVELES.forEach(function (n) { add("servicio", n.nombre, b.niveles[n.id] || "—"); });
    var cv = ciclo(b.ciclo); add("servicio", "Ciclo de vida", cv ? cv.codigo + " · " + cv.nombre : "—");
    D.CONDICIONES.forEach(function (c) {
      if (c.depende && !b.cond[c.depende]) add("cond-" + c.bloque, c.nombre, "No aplica (requiere " + condDef(c.depende).nombre + ")");
      else add("cond-" + c.bloque, c.nombre, textoCond(c, b.cond[c.id]));
    });
    var cub = clasesCubiertas(b);
    D.CLASES.forEach(function (c) {
      var d = null; b.domicilios.forEach(function (x) { if (x.id === cub[c.id]) d = x; });
      add("domicilios", c.nombre + (c.obligatoria ? " (obligatoria)" : ""), d ? domTexto(d.dom) : "Sin domicilio");
    });
    return f;
  }
  function diferencias(orig, b) {
    if (!orig) return {};
    var a = filasResumen(orig), n = filasResumen(b), m = {};
    for (var i = 0; i < n.length; i++) if (a[i] && a[i].v !== n[i].v) m[n[i].sec + "|" + n[i].k] = a[i].v;
    return m;
  }
  g.ABM_LOGICA = { nuevoBorrador: nuevoBorrador, faltantes: faltantes, advertencias: advertencias, clasesCubiertas: clasesCubiertas, filasResumen: filasResumen, diferencias: diferencias, domClave: domClave };
  if (typeof document === "undefined") return;

  /* ---------- estado de la interfaz ---------- */
  var S = { contratos: clon(D.CONTRATOS), vista: "lista", modo: "alta", paso: 1, b: null, orig: null, busqSap: "", busq: "", filtro: "", errores: false, nuevoDom: { calle: "", numero: "", localidad: "", provincia: "", cp: "" }, nuevoClases: [], idSeq: 100 };
  var raiz = document.getElementById("app");

  function contrato(nro) { for (var i = 0; i < S.contratos.length; i++) if (S.contratos[i].nro === nro) return S.contratos[i]; return null; }
  var ctx = { get modo() { return S.modo; }, yaConfigurado: function (n) { return !!contrato(n); } };

  function render(foco) {
    raiz.innerHTML = S.vista === "lista" ? vLista() : vWizard();
    if (foco) { var el = document.getElementById(foco); if (el) el.focus(); }
  }

  /* ---------- listado ---------- */
  function vLista() {
    var q = S.busq.toLowerCase();
    var filas = S.contratos.filter(function (c) {
      var s = sap(c.nro) || {};
      var txt = [c.nro, s.razon, s.desc, s.solicitante].join(" ").toLowerCase();
      return (!q || txt.indexOf(q) >= 0) && (!S.filtro || c.estado === S.filtro);
    });
    var sinConf = D.SAP.filter(function (s) { return !contrato(s.nro); }).length;
    var h = alerta("info", "<strong>Prototipo de propuesta.</strong> Datos ficticios; no se conecta con DMS ni con SAP. Usuario de ejemplo: comercial.");
    h += '<section class="card" aria-labelledby="t-lista"><div class="card-head"><h2 id="t-lista">Contratos</h2><div class="acciones">' +
      '<button class="btn btn-primary" data-acc="nuevo">+ Configurar contrato</button></div></div>';
    h += '<p class="small">' + sinConf + " contrato" + (sinConf === 1 ? "" : "s") + " de SAP todavía sin configurar en DMS.</p>";
    h += '<div class="campos"><div class="campo buscador"><label for="busq">Buscar</label><input type="search" id="busq" value="' + esc(S.busq) + '" placeholder="Contrato, razón social o solicitante"></div>' +
      '<div class="campo"><label for="filtro">Estado</label><select id="filtro"><option value="">Todos</option>' +
      [["habilitado", "Habilitado"], ["programado", "Vigente desde (programado)"], ["deshabilitado", "Deshabilitado"]].map(function (o) { return '<option value="' + o[0] + '"' + (S.filtro === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div></div>";
    h += '<div class="tabla-wrap"><table><caption class="sr-only">Contratos configurados</caption><thead><tr><th scope="col">Razón social</th><th scope="col">Contrato SAP</th><th scope="col">Solicitante</th><th scope="col">Niveles de esfuerzo</th><th scope="col">Ciclo de vida</th><th scope="col">Vigencia</th><th scope="col">Estado</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>';
    if (!filas.length) h += '<tr><td colspan="8">No hay contratos con esos filtros.</td></tr>';
    filas.forEach(function (c) {
      var s = sap(c.nro) || {}; var cv = ciclo(c.ciclo);
      h += "<tr><td>" + esc(s.razon) + "</td><td><span class=\"strong\">" + esc(c.nro) + '</span><br><span class="caption">' + esc(s.desc) + "</span></td><td>" + esc(s.solicitante) + "</td>" +
        '<td><div class="chips">' + D.NIVELES.map(function (n) { return '<span class="chip" title="' + esc(n.nombre) + '">' + esc(c.niveles[n.id]) + "</span>"; }).join("") + "</div></td>" +
        "<td>" + (cv ? esc(cv.nombre) + '<br><span class="caption">' + esc(cv.codigo) + "</span>" : "—") + "</td>" +
        "<td>" + (c.vigencia ? "Desde " + fmtFecha(c.vigencia) : "—") + "</td><td>" + chipEstado(c) + "</td>" +
        '<td class="acc"><div class="kebab"><button class="btn btn-ghost btn-icon btn-sm" aria-haspopup="true" aria-expanded="false" data-acc="kebab" data-nro="' + c.nro + '" aria-label="Acciones del contrato ' + c.nro + '">' + ICO.kebab + "</button>" +
        '<div class="menu" role="menu" hidden><button role="menuitem" data-acc="editar" data-nro="' + c.nro + '">Editar</button><button role="menuitem" data-acc="historial" data-nro="' + c.nro + '">Ver historial (auditoría)</button></div></div></td></tr>';
    });
    h += "</tbody></table></div></section>";
    h += vPropuesta();
    return h;
  }
  function vPropuesta() {
    var h = '<section class="card" aria-labelledby="t-prop"><h3 id="t-prop">Principios de la propuesta</h3><div class="propuesta">';
    [["Datos de SAP, no se tipean", "El contrato y el cliente se buscan en SAP y se muestran en solo lectura. Si algo está mal, se corrige en el origen."],
     ["Cada dato tiene un consumidor", "Si ningún proceso (Mostrador, Mobile u otro) usa un dato, se cuestiona antes de pedirlo."],
     ["Configura quien conoce el acuerdo", "No conviene derivar un requerimiento a un área que no le agrega valor. El control lo da la auditoría de DMS: quién cambió qué y cuándo."],
     ["Los cambios rigen hacia adelante", "Cada alta o cambio tiene fecha de vigencia y no afecta a los envíos ya admitidos."]
    ].forEach(function (p) { h += '<div class="prop"><span class="strong">' + p[0] + "</span><span>" + p[1] + "</span></div>"; });
    h += '</div><h3>Fuera de este prototipo (propuesta de proceso)</h3><div class="propuesta">';
    [["Maestro de ciclos de vida con nombre", "El contrato solo elige el ciclo por nombre; los ciclos se definen en un maestro aparte, con cada intento completo."],
     ["Plantillas para generar ciclos", "Crear ciclos a partir de plantillas o Excel, no con un ABM pantalla por pantalla."],
     ["Conversión de ciclos Integra → DMS", "Validar cuánto cubre el programa de Pablo Lugo antes de construir un ABM de ciclos."],
     ["Alta de motivos", "Un motivo nuevo se crea indicando «se comporta igual que el motivo X»."]
    ].forEach(function (p) { h += '<div class="prop"><span class="strong">' + p[0] + "</span><span>" + p[1] + "</span></div>"; });
    return h + "</div></section>";
  }

  /* ---------- wizard ---------- */
  var PASOS = [["Contrato SAP", "Buscar y confirmar"], ["Servicio", "Niveles, ciclo y condiciones"], ["Domicilios", "Clases y direcciones"], ["Resumen", "Revisar y guardar"]];
  function vWizard() {
    var s = sap(S.b.nro);
    var tit = S.modo === "alta" ? "Configurar contrato" : "Editar contrato " + S.b.nro;
    var h = '<section class="card" aria-labelledby="t-wiz"><div class="card-head"><h2 id="t-wiz">' + esc(tit) + "</h2>" + (s ? '<span class="chip chip-marca">' + esc(s.razon) + "</span>" : "") + "</div>";
    h += '<ol class="stepper">' + PASOS.map(function (p, i) {
      var n = i + 1, act = n === S.paso, hecho = n < S.paso;
      return '<li' + (act ? ' aria-current="step"' : "") + (hecho ? ' class="hecho"' : "") + '><span class="num">' + n + '</span><span>' + p[0] + '<span class="sub">' + (hecho ? "Completo · " : "") + p[1] + "</span></span></li>";
    }).join("") + "</ol>";
    var f = faltantes(S.paso, S.b, ctx);
    if (S.errores && f.length) h += alerta("error", "<strong>Para continuar falta:</strong><ul>" + f.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>", ' id="err" tabindex="-1"');
    h += S.paso === 1 ? vPaso1() : S.paso === 2 ? vPaso2() : S.paso === 3 ? vPaso3() : vPaso4();
    var ult = S.paso === 4;
    h += '<div class="pie-wizard"><button class="btn btn-ghost" data-acc="cancelar">Cancelar</button>' +
      '<span class="small" aria-live="polite">' + (f.length ? "Falta" + (f.length === 1 ? " 1 dato" : "n " + f.length + " datos") + " para continuar" : "Paso completo") + "</span>" +
      '<div class="der">' + (S.paso > 1 ? '<button class="btn btn-secondary" data-acc="anterior">Anterior</button>' : "") +
      '<button class="btn btn-primary" data-acc="' + (ult ? "guardar" : "siguiente") + '">' + (ult ? (S.modo === "alta" ? "Crear contrato" : "Guardar cambios") : "Siguiente") + "</button></div></div>";
    return h + "</section>";
  }

  function vFicha(s) {
    return '<dl class="ficha"><div><dt>N° de contrato</dt><dd>' + esc(s.nro) + "</dd></div><div><dt>Descripción</dt><dd>" + esc(s.desc) + "</dd></div><div><dt>Razón social</dt><dd>" + esc(s.razon) + "</dd></div><div><dt>Solicitante</dt><dd>" + esc(s.solicitante) + "</dd></div><div><dt>Alta en SAP</dt><dd>" + fmtFecha(s.alta) + "</dd></div></dl>";
  }
  function vPaso1() {
    var h = "";
    if (S.modo === "alta") {
      var q = S.busqSap.toLowerCase();
      var res = D.SAP.filter(function (s) { return !q || [s.nro, s.razon, s.desc, s.solicitante].join(" ").toLowerCase().indexOf(q) >= 0; });
      h += '<div class="campo buscador"><label for="busqSap">Buscar contrato en SAP</label><input type="search" id="busqSap" value="' + esc(S.busqSap) + '" placeholder="N° de contrato, razón social o solicitante" aria-describedby="busqSap-a"><span class="ayuda" id="busqSap-a">El contrato tiene que estar dado de alta en SAP. No se tipean datos.</span></div>';
      h += '<ul class="resultados" aria-label="Contratos de SAP">' + (res.length ? res.map(function (s) {
        var ya = !!contrato(s.nro);
        return '<li><button data-acc="elegirSap" data-nro="' + s.nro + '" aria-pressed="' + (S.b.nro === s.nro) + '"' + (ya ? ' disabled aria-disabled="true"' : "") + '><span class="strong">' + esc(s.nro) + " · " + esc(s.desc) + '</span><span class="small">' + esc(s.razon) + " · Solicitante " + esc(s.solicitante) + (ya ? " · Ya configurado en DMS (editalo desde el listado)" : "") + "</span></button></li>";
      }).join("") : '<li class="small" style="padding:12px 16px">Sin resultados en SAP.</li>') + "</ul>";
    }
    var s = sap(S.b.nro);
    if (s) h += '<h3>Datos del contrato en SAP</h3><p class="small">Solo lectura: si algo está mal, se corrige en SAP.</p>' + vFicha(s);
    h += '<h3>Datos a analizar</h3>' + alerta("info", "Estos campos existen hoy en DMS, pero no está claro qué proceso los usa. <strong>Proponemos analizar su valor en DMS</strong> antes de seguir pidiéndolos.");
    var a = S.b.analizar;
    h += '<div class="campos">' +
      campoTxt("an-poliza", "Póliza", a.poliza) + campoTxt("an-tipoEnvio", "Tipo de envío", a.tipoEnvio) + campoTxt("an-tipoEntrega", "Tipo de entrega", a.tipoEntrega) + campoTxt("an-agrupador", "Contrato agrupador", a.agrupador) +
      '<div class="campo"><label for="an-finValidez">Fin de validez <span class="chip">A analizar</span></label><input type="date" id="an-finValidez" value="' + esc(a.finValidez) + '" aria-describedby="an-fv-a"><span class="ayuda" id="an-fv-a">Hoy todos los contratos usan 31/12/9999 (sin vencimiento).</span></div></div>';
    return h;
  }
  function campoTxt(id, lbl, v) { return '<div class="campo"><label for="' + id + '">' + lbl + ' <span class="chip">A analizar</span></label><input type="text" id="' + id + '" value="' + esc(v) + '"></div>'; }

  function vPaso2() {
    var b = S.b;
    var h = '<div class="grid-2"><div class="campo" style="gap:16px"><h3>Niveles de esfuerzo</h3><div class="campos">' + D.NIVELES.map(function (n) {
      return '<div class="campo"><label for="niv-' + n.id + '">' + n.nombre + '</label><select id="niv-' + n.id + '"><option value="">Elegir…</option>' + n.opciones.map(function (o) { return "<option" + (b.niveles[n.id] === o ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select></div>";
    }).join("") + '</div><p class="caption">Valores de ejemplo. Hoy DMS concatena estos niveles como «Nombre contrato DMS»; proponemos mostrarlos en el listado en lugar de un nombre que se repite.</p></div>';
    h += '<div class="campo" style="gap:16px"><h3>Ciclo de vida</h3><fieldset class="opciones"><legend>Elegí el ciclo por nombre</legend>' + D.CICLOS.map(function (c) {
      return '<label class="opcion grande"><input type="radio" name="ciclo" value="' + c.id + '"' + (b.ciclo === c.id ? " checked" : "") + '><span><span class="strong">' + esc(c.nombre) + '</span><span class="det">' + esc(c.codigo) + "</span></span></label>";
    }).join("") + '</fieldset><p class="caption">La lista sale del maestro de ciclos con nombre (propuesta, fuera de este prototipo). Hoy todos los contratos usan un único ciclo y no se puede elegir.</p></div></div>';
    advertencias(b).forEach(function (a) { h += alerta(a.tipo, esc(a.txt)); });
    h += "<h3>Condiciones del servicio</h3><p class=\"small\">Los 16 interruptores de hoy, agrupados y explicados. Debajo de cada uno figura su nombre actual en DMS. Textos de ayuda de ejemplo, a validar con DMS.</p>";
    D.BLOQUES.forEach(function (bl, i) {
      var cs = D.CONDICIONES.filter(function (c) { return c.bloque === bl.id; });
      var act = cs.filter(function (c) { return c.tipo === "opciones" ? false : !!b.cond[c.id] && (!c.depende || b.cond[c.depende]); }).length;
      var bin = cs.filter(function (c) { return c.tipo !== "opciones"; }).length;
      h += '<details class="bloque" data-bloque="' + bl.id + '"' + (S.abiertos[bl.id] ? " open" : "") + '><summary>' + ICO.flecha + '<span><span class="strong">' + bl.nombre + '</span><br><span class="caption">' + bl.desc + '</span></span><span class="chip resumen-b">' + act + " de " + bin + " activas</span></summary><div class=\"condiciones\">";
      cs.forEach(function (c) { h += vCond(c, b); });
      h += "</div></details>";
    });
    return h;
  }
  function vCond(c, b) {
    var idA = "ay-" + c.id;
    var cab = '<div><span class="strong">' + c.nombre + '</span><br><span class="caption">En DMS hoy: ' + c.dms.map(function (x) { return "«" + esc(x) + "»"; }).join(" + ") + "</span></div>";
    if (c.tipo === "opciones") {
      return '<div class="cond">' + cab + "<span></span>" + '<fieldset class="opciones" aria-describedby="' + idA + '" style="grid-column:1/-1"><legend class="sr-only">' + c.nombre + "</legend>" + c.opciones.map(function (o) {
        return '<label class="opcion"><input type="radio" name="cond-' + c.id + '" value="' + esc(o) + '"' + (b.cond[c.id] === o ? " checked" : "") + ">" + esc(o) + "</label>";
      }).join("") + '</fieldset><span class="ayuda" id="' + idA + '">' + esc(c.ayuda) + "</span></div>";
    }
    var bloq = c.depende && !b.cond[c.depende];
    var on = !!b.cond[c.id] && !bloq;
    return '<div class="cond' + (c.depende ? " dependiente" : "") + '">' + cab +
      '<label class="switch"><input type="checkbox" role="switch" id="sw-' + c.id + '" data-cond="' + c.id + '"' + (on ? " checked" : "") + (bloq ? " disabled" : "") + ' aria-describedby="' + idA + '" aria-label="' + esc(c.nombre) + '"><span class="pista" aria-hidden="true"></span><span class="txt" aria-hidden="true">' + (on ? "Sí" : "No") + "</span></label>" +
      '<span class="ayuda" id="' + idA + '">' + esc(c.ayuda) + (bloq ? ' <span class="bloqueo">Activá «' + condDef(c.depende).nombre + "» para habilitarla.</span>" : "") + "</span></div>";
  }

  function vPaso3() {
    var b = S.b, cub = clasesCubiertas(b);
    var h = alerta("info", "Clases y obligatorias según la lista actual. Hay más clases y la correspondencia con los «Tipo N» de hoy queda <strong>a validar con el equipo de DMS</strong>.");
    h += '<h3>Clases de domicilio</h3><div class="clases" role="list">' + D.CLASES.map(function (c) {
      var ok = !!cub[c.id];
      var est = ok ? '<span class="chip chip-ok estado">' + ICO.check + "Cargada</span>" : c.obligatoria ? '<span class="chip chip-falta estado">' + ICO.cruz + "Falta</span>" : '<span class="chip estado">Opcional</span>';
      return '<div role="listitem" class="clase' + (ok ? " ok" : c.obligatoria ? " falta" : "") + '"><span>' + esc(c.nombre) + (c.obligatoria ? ' <span class="caption">(obligatoria)</span>' : "") + "</span>" + est + "</div>";
    }).join("") + "</div>";
    h += '<div class="grid-2"><div class="campo" style="gap:12px"><h3>Agregar domicilio</h3>';
    var reus = domiciliosReusables();
    if (reus.length) h += '<div class="campo"><label for="reusar">Reusar un domicilio del cliente</label><select id="reusar"><option value="">Elegir…</option>' + reus.map(function (d, i) { return '<option value="' + i + '">' + esc(domTexto(d)) + "</option>"; }).join("") + "</select></div>";
    var n = S.nuevoDom;
    h += '<div class="campos">' + [["calle", "Calle"], ["numero", "Número"], ["localidad", "Localidad"], ["provincia", "Provincia"], ["cp", "Código postal"]].map(function (x) {
      return '<div class="campo"><label for="nd-' + x[0] + '">' + x[1] + '</label><input type="text" id="nd-' + x[0] + '" value="' + esc(n[x[0]]) + '"></div>';
    }).join("") + "</div>";
    h += '<fieldset class="opciones" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0 12px"><legend>Usar este domicilio para</legend>' + D.CLASES.map(function (c) {
      return '<label class="chk"><input type="checkbox" data-nclase="' + c.id + '"' + (S.nuevoClases.indexOf(c.id) >= 0 ? " checked" : "") + ">" + esc(c.nombre) + (cub[c.id] ? ' <span class="caption">(reemplaza)</span>' : "") + "</label>";
    }).join("") + "</fieldset>";
    h += '<div><button class="btn btn-secondary" data-acc="agregarDom">Agregar domicilio</button></div><div id="msgDom" aria-live="polite">' + (S.msgDom || "") + "</div></div>";
    h += '<div class="campo" style="gap:12px"><h3>Domicilios cargados (' + b.domicilios.length + ")</h3>";
    if (!b.domicilios.length) h += '<p class="small">Todavía no hay domicilios. Cargá uno y marcá todas las clases donde se usa.</p>';
    h += '<div class="domis">' + b.domicilios.map(function (d) {
      return '<div class="domi"><div class="domi-top"><span class="strong">' + esc(domTexto(d.dom)) + '</span><div class="der"><button class="btn btn-ghost btn-sm" data-acc="quitarDom" data-id="' + d.id + '">Quitar</button></div></div>' +
        '<fieldset class="opciones" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0 12px"><legend class="caption">Clases donde se usa</legend>' + D.CLASES.map(function (c) {
          return '<label class="chk"><input type="checkbox" data-domi="' + d.id + '" data-clase="' + c.id + '"' + (d.clases.indexOf(c.id) >= 0 ? " checked" : "") + ">" + esc(c.nombre) + "</label>";
        }).join("") + "</fieldset></div>";
    }).join("") + "</div></div></div>";
    return h;
  }
  function domiciliosReusables() {
    var s = sap(S.b.nro); if (!s) return [];
    var vistos = {}, out = [];
    S.b.domicilios.forEach(function (d) { vistos[domClave(d.dom)] = 1; });
    S.contratos.forEach(function (c) {
      var sc = sap(c.nro); if (!sc || sc.solicitante !== s.solicitante) return;
      c.domicilios.forEach(function (d) { var k = domClave(d.dom); if (!vistos[k]) { vistos[k] = 1; out.push(d.dom); } });
    });
    return out;
  }

  function vPaso4() {
    var b = S.b, filas = filasResumen(b), dif = diferencias(S.orig, b), nDif = Object.keys(dif).length;
    var h = "";
    if (S.modo === "edicion") h += alerta(nDif ? "caution" : "info", nDif ? "<strong>" + nDif + " cambio" + (nDif === 1 ? "" : "s") + "</strong> respecto de la versión vigente (resaltados, con el valor anterior tachado)." : "No hay cambios respecto de la versión vigente.");
    var secs = [["sap", "Contrato SAP", 1], ["analizar", "Datos a analizar", 1], ["servicio", "Niveles de esfuerzo y ciclo de vida", 2]];
    D.BLOQUES.forEach(function (bl) { secs.push(["cond-" + bl.id, "Condiciones · " + bl.nombre, 2]); });
    secs.push(["domicilios", "Domicilios por clase", 3]);
    h += '<div class="resumen">' + secs.map(function (sc) {
      var fs = filas.filter(function (f) { return f.sec === sc[0]; });
      var nc = fs.filter(function (f) { return dif.hasOwnProperty(f.sec + "|" + f.k); }).length;
      return '<div class="res-sec"><h4>' + sc[1] + (nc ? ' <span class="chip chip-cambio">' + nc + " cambio" + (nc === 1 ? "" : "s") + "</span>" : "") + (sc[0] === "sap" && S.modo === "edicion" ? "" : '<button class="btn btn-ghost btn-sm" data-acc="irPaso" data-paso="' + sc[2] + '">Editar</button>') + "</h4>" +
        fs.map(function (f) {
          var k = f.sec + "|" + f.k, ch = dif.hasOwnProperty(k);
          return '<div class="res-fila' + (ch ? " cambio" : "") + '"><span class="k">' + esc(f.k) + '</span><span class="v">' + (ch ? '<span class="chip chip-cambio">Cambió</span> ' : "") + esc(f.v) + (ch ? '<span class="antes"><span class="sr-only">Antes: </span>' + esc(dif[k]) + "</span>" : "") + "</span></div>";
        }).join("") + "</div>";
    }).join("") + "</div>";
    var ed = S.modo === "edicion";
    h += '<fieldset class="opciones"><legend>' + (ed ? "¿Desde cuándo rigen los cambios?" : "¿Cómo queda el contrato al guardar?") + "</legend>" +
      opEstado("habilitado", ed ? "Habilitado desde hoy" : "Habilitado", ed ? "Los cambios rigen para los envíos que se admitan desde hoy." : "Se puede usar desde hoy.") +
      opEstado("programado", "Vigente desde una fecha", ed ? "Los cambios rigen desde la fecha elegida; hasta entonces sigue la versión actual." : "Queda listo y empieza a regir en la fecha elegida.") +
      opEstado("deshabilitado", "Deshabilitado", "Queda guardado pero no se puede usar hasta habilitarlo.") + "</fieldset>";
    if (b.estado === "programado") h += '<div class="campo" style="max-width:260px"><label for="vigencia">Vigente desde</label><input type="date" id="vigencia" min="' + manianaISO() + '" value="' + esc(b.vigencia) + '"></div>';
    h += alerta("info", "Los cambios rigen hacia adelante: los envíos ya admitidos siguen con la configuración con la que entraron. Queda registro en la auditoría de DMS (usuario, fecha y detalle).");
    return h;
  }
  function opEstado(v, t, d) { return '<label class="opcion grande"><input type="radio" name="estado" value="' + v + '"' + (S.b.estado === v ? " checked" : "") + '><span><span class="strong">' + t + '</span><span class="det">' + d + "</span></span></label>"; }

  /* ---------- modal historial ---------- */
  var ultimoFoco = null;
  function abrirHistorial(nro) {
    var c = contrato(nro); ultimoFoco = document.activeElement;
    var m = document.createElement("div"); m.className = "modal-fondo"; m.id = "modal";
    m.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="t-hist"><div class="modal-head"><h3 id="t-hist">Historial del contrato ' + esc(nro) + '</h3><button class="btn btn-ghost btn-sm" data-acc="cerrarModal" id="cerrarModal">Cerrar</button></div>' +
      '<p class="small">Auditoría de DMS: cada alta y cada cambio quedan registrados con usuario, fecha y detalle.</p><div class="tabla-wrap"><table><thead><tr><th scope="col">Fecha</th><th scope="col">Usuario</th><th scope="col">Acción</th><th scope="col">Detalle</th></tr></thead><tbody>' +
      c.historial.slice().reverse().map(function (h) { return "<tr><td>" + esc(h.fecha) + "</td><td>" + esc(h.usuario) + "</td><td>" + esc(h.accion) + "</td><td>" + esc(h.detalle) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    document.body.appendChild(m);
    document.getElementById("cerrarModal").focus();
  }
  function cerrarModal() { var m = document.getElementById("modal"); if (m) m.parentNode.removeChild(m); if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus(); }
  function toast(txt) {
    var t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.innerHTML = ICO.ok + "<span>" + esc(txt) + "</span>";
    document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
  }

  /* ---------- acciones ---------- */
  function iniciar(modo, nro) {
    S.modo = modo; S.vista = "wizard"; S.paso = 1; S.errores = false; S.busqSap = ""; S.msgDom = "";
    S.nuevoDom = { calle: "", numero: "", localidad: "", provincia: "", cp: "" }; S.nuevoClases = [];
    S.abiertos = { admision: true, acciones: false, admin: false };
    if (modo === "alta") { S.b = nuevoBorrador(); S.orig = null; }
    else {
      var c = contrato(nro);
      S.b = { nro: c.nro, niveles: clon(c.niveles), ciclo: c.ciclo, cond: clon(c.cond), analizar: clon(c.analizar), domicilios: clon(c.domicilios), estado: "", vigencia: "" };
      S.orig = clon(S.b);
    }
    render("t-wiz"); window.scrollTo(0, 0);
  }
  function irPaso(n) { S.paso = n; S.errores = false; S.msgDom = ""; render("t-wiz"); window.scrollTo(0, 0); }
  function siguiente() {
    var f = faltantes(S.paso, S.b, ctx);
    if (f.length) { S.errores = true; render("err"); return; }
    irPaso(S.paso + 1);
  }
  function guardar() {
    var f = faltantes(4, S.b, ctx);
    if (f.length) { S.errores = true; render("err"); return; }
    var b = S.b, vig = b.estado === "habilitado" ? hoyISO() : b.estado === "programado" ? b.vigencia : "";
    var detEstado = b.estado === "habilitado" ? "Habilitado desde " + fmtFecha(vig) : b.estado === "programado" ? "Vigente desde " + fmtFecha(vig) : "Deshabilitado";
    if (S.modo === "alta") {
      S.contratos.unshift({ nro: b.nro, niveles: b.niveles, ciclo: b.ciclo, cond: b.cond, analizar: b.analizar, domicilios: b.domicilios, estado: b.estado, vigencia: vig,
        historial: [{ fecha: ahora(), usuario: "comercial.ejemplo", accion: "Alta", detalle: "Contrato creado · " + detEstado }] });
      toast("Contrato " + b.nro + " creado · " + detEstado);
    } else {
      var c = contrato(b.nro), dif = diferencias(S.orig, b), ks = Object.keys(dif);
      c.niveles = b.niveles; c.ciclo = b.ciclo; c.cond = b.cond; c.analizar = b.analizar; c.domicilios = b.domicilios; c.estado = b.estado; c.vigencia = vig;
      c.historial.push({ fecha: ahora(), usuario: "comercial.ejemplo", accion: "Modificación (versión " + (c.historial.length + 1) + ")",
        detalle: (ks.length ? ks.map(function (k) { return k.split("|")[1]; }).join(", ") : "Sin cambios de configuración") + " · " + detEstado });
      toast("Cambios guardados · " + detEstado);
    }
    S.vista = "lista"; render("t-lista");
  }
  function agregarDom() {
    var n = S.nuevoDom, faltan = [];
    [["calle", "Calle"], ["numero", "Número"], ["localidad", "Localidad"], ["provincia", "Provincia"], ["cp", "Código postal"]].forEach(function (x) { if (!String(n[x[0]]).trim()) faltan.push(x[1]); });
    if (faltan.length) { S.msgDom = alerta("error", "Completá: " + esc(faltan.join(", ")) + "."); render("nd-calle"); return; }
    if (!S.nuevoClases.length) { S.msgDom = alerta("error", "Marcá al menos una clase donde se usa el domicilio."); render(); return; }
    var dom = { calle: n.calle.trim(), numero: n.numero.trim(), localidad: n.localidad.trim(), provincia: n.provincia.trim(), cp: n.cp.trim() };
    var k = domClave(dom), existe = null;
    S.b.domicilios.forEach(function (d) { if (domClave(d.dom) === k) existe = d; });
    S.b.domicilios.forEach(function (d) { d.clases = d.clases.filter(function (c) { return S.nuevoClases.indexOf(c) < 0; }); });
    if (existe) S.nuevoClases.forEach(function (c) { if (existe.clases.indexOf(c) < 0) existe.clases.push(c); });
    else S.b.domicilios.push({ id: "n" + (S.idSeq++), dom: dom, clases: S.nuevoClases.slice() });
    S.b.domicilios = S.b.domicilios.filter(function (d) { return d.clases.length; });
    S.msgDom = alerta("success", existe ? "El domicilio ya estaba cargado: se le sumaron las clases (sin duplicarlo)." : "Domicilio agregado a " + S.nuevoClases.length + " clase" + (S.nuevoClases.length === 1 ? "" : "s") + ".");
    S.nuevoDom = { calle: "", numero: "", localidad: "", provincia: "", cp: "" }; S.nuevoClases = [];
    render();
  }

  raiz.addEventListener("click", function (e) {
    var t = e.target.closest("[data-acc]"); if (!t) { cerrarMenus(); return; }
    var a = t.getAttribute("data-acc"), nro = t.getAttribute("data-nro");
    if (a === "kebab") { var m = t.nextElementSibling, ab = m.hidden; cerrarMenus(); m.hidden = !ab; t.setAttribute("aria-expanded", String(ab));
      if (ab) { var r = t.getBoundingClientRect(); m.style.position = "fixed"; m.style.top = (r.bottom + 4) + "px"; m.style.left = Math.max(8, r.right - 200) + "px"; m.style.right = "auto"; m.querySelector("button").focus(); }
      return; }
    cerrarMenus();
    if (a === "nuevo") iniciar("alta");
    else if (a === "editar") iniciar("edicion", nro);
    else if (a === "historial") abrirHistorial(nro);
    else if (a === "cancelar") { S.vista = "lista"; render("t-lista"); }
    else if (a === "anterior") irPaso(S.paso - 1);
    else if (a === "siguiente") siguiente();
    else if (a === "guardar") guardar();
    else if (a === "irPaso") irPaso(+t.getAttribute("data-paso"));
    else if (a === "elegirSap") { S.b.nro = nro; S.b.domicilios = []; S.errores = false; render("busqSap"); }
    else if (a === "agregarDom") agregarDom();
    else if (a === "quitarDom") { var id = t.getAttribute("data-id"); S.b.domicilios = S.b.domicilios.filter(function (d) { return d.id !== id; }); S.msgDom = ""; render(); }
  });
  function cerrarMenus() { var ms = raiz.querySelectorAll(".menu"); for (var i = 0; i < ms.length; i++) { ms[i].hidden = true; var b = ms[i].previousElementSibling; if (b) b.setAttribute("aria-expanded", "false"); } }
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-acc='cerrarModal']")) cerrarModal(); else if (e.target.id === "modal") cerrarModal(); });
  window.addEventListener("scroll", cerrarMenus, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (document.getElementById("modal")) cerrarModal(); else cerrarMenus(); } });

  raiz.addEventListener("input", function (e) {
    var t = e.target, id = t.id;
    if (id === "busq") { S.busq = t.value; render("busq"); posFin(t.id); }
    else if (id === "busqSap") { S.busqSap = t.value; render("busqSap"); posFin(t.id); }
    else if (id.indexOf("an-") === 0 && t.type === "text") S.b.analizar[id.slice(3)] = t.value;
    else if (id.indexOf("nd-") === 0) S.nuevoDom[id.slice(3)] = t.value;
  });
  function posFin(id) { var el = document.getElementById(id); if (el && el.setSelectionRange) { var n = el.value.length; try { el.setSelectionRange(n, n); } catch (x) { } } }
  raiz.addEventListener("change", function (e) {
    var t = e.target, id = t.id || "";
    if (id === "filtro") { S.filtro = t.value; render("filtro"); }
    else if (id === "an-finValidez") S.b.analizar.finValidez = t.value || "9999-12-31";
    else if (id.indexOf("niv-") === 0) { S.b.niveles[id.slice(4)] = t.value; render(id); }
    else if (t.name === "ciclo") { S.b.ciclo = t.value; render(); }
    else if (t.hasAttribute("data-cond")) {
      var c = t.getAttribute("data-cond"); S.b.cond[c] = t.checked;
      D.CONDICIONES.forEach(function (x) { if (x.depende === c && !t.checked) S.b.cond[x.id] = false; });
      render(t.id);
    }
    else if (t.name && t.name.indexOf("cond-") === 0) { S.b.cond[t.name.slice(5)] = t.value; render(); }
    else if (t.hasAttribute("data-nclase")) { var k = t.getAttribute("data-nclase"); S.nuevoClases = S.nuevoClases.filter(function (x) { return x !== k; }); if (t.checked) S.nuevoClases.push(k); }
    else if (t.hasAttribute("data-domi")) {
      var did = t.getAttribute("data-domi"), cl = t.getAttribute("data-clase");
      S.b.domicilios.forEach(function (d) {
        if (d.id === did) { d.clases = d.clases.filter(function (x) { return x !== cl; }); if (t.checked) d.clases.push(cl); }
        else if (t.checked) d.clases = d.clases.filter(function (x) { return x !== cl; });
      });
      S.msgDom = t.checked ? alerta("info", "«" + esc(clase(cl).nombre) + "» quedó asignada a este domicilio (una clase usa un solo domicilio).") : "";
      render(t.id === "" ? null : null);
    }
    else if (id === "reusar" && t.value !== "") { var d = domiciliosReusables()[+t.value]; S.nuevoDom = clon(d); render("nd-calle"); }
    else if (t.name === "estado") { S.b.estado = t.value; if (t.value === "programado" && !S.b.vigencia) S.b.vigencia = manianaISO(); render(t.value === "programado" ? "vigencia" : null); }
    else if (id === "vigencia") S.b.vigencia = t.value;
  });
  raiz.addEventListener("toggle", function (e) { var d = e.target; if (d.matches && d.matches("details.bloque")) S.abiertos[d.getAttribute("data-bloque")] = d.open; }, true);

  g.ABM_UI = { S: S, iniciar: iniciar, irPaso: irPaso, siguiente: siguiente, guardar: guardar, agregarDom: agregarDom, render: render };
  render();
})(typeof window !== "undefined" ? window : globalThis);
