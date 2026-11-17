/* ABM Contratos DMS · intro animada de la propuesta (T-007 v0.3, D-072). Sin datos de clientes. */
(function () {
  "use strict";
  var I = {
    sap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="t" d="M4 6h16M4 12h10M4 18h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 15l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dato: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="t" cx="7" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="6" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="18" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 11l5.5-3.5M10 13l5.5 3.5" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    persona: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="t" cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="t" cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    ciclo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="t" d="M20 12a8 8 0 1 1-2.3-5.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    plantilla: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="t" x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="t" d="M3 12h15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    motivo: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect class="t" x="3" y="4" width="8" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13" y="13" width="8" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 11v5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  function tarjeta(ic, t, p, hoy, gris) {
    return '<article class="tarjeta' + (gris ? " gris" : "") + '"><span class="ic">' + ic + "</span><h3>" + t + "</h3><p>" + p + "</p>" + (hoy ? '<p class="hoy"><b>Hoy:</b> ' + hoy + "</p>" : "") + "</article>";
  }
  // Problemas del ABM actual (hallazgos H1–H25 de T-007). [pantalla, título, descripción]
  var DOLORES = [
    ["Datos", "Un nombre de contrato que no dice nada", "Le ponemos al contrato un nombre armado con los niveles de esfuerzo. No sabemos qué aporta y varios contratos terminan llamándose igual. ¿Para qué lo queremos?"],
    ["Datos", "Volvemos a tipear lo que ya está en SAP", "Número de contrato, solicitante, razón social: todo existe en SAP y lo cargamos de nuevo a mano. Cada carga es una oportunidad de error."],
    ["Datos", "Campos que nadie usa", "Póliza, tipo de envío, tipo de entrega vacíos, y fin de validez 31/12/9999 en todos. Los pedimos igual, sin saber quién los consume."],
    ["Servicio", "16 interruptores en una sola lista", "Sin agrupar, sin ayuda y con nombres técnicos. Hay dos de gestión telefónica que parecen decir lo mismo."],
    ["Servicio", "El remito es sí o no", "En la operación hay remito digital, físico o directamente no hay. La pantalla no lo distingue."],
    ["Servicio", "Datos que se contradicen y nadie avisa", "Container refrigerado con cadena de frío apagada, retiro parcial de valores sin cobranza. La pantalla lo deja pasar."],
    ["Servicio", "Un solo ciclo de vida para todos", "El contrato no permite elegir el ciclo: todos usan el mismo y los ciclos no tienen un nombre que se entienda."],
    ["Domicilios", "Domicilios por número", "«Tipo 1», «Tipo 2»… No dice qué clase es cada uno ni cuáles faltan cargar."],
    ["Domicilios", "El mismo domicilio, cargado muchas veces", "Hay que repetirlo en cada clase, y muchas veces termina escrito de formas distintas."],
    ["General", "La pantalla no te guía", "«Siguiente» se bloquea sin decir qué falta, y al editar el resumen no muestra qué cambiaste."],
    ["Guardado", "El alta queda deshabilitada", "Creamos el contrato y queda apagado. Si nadie se acuerda de habilitarlo, no opera."],
    ["Guardado", "Los cambios rigen en el momento", "No hay fecha de vigencia: un cambio impacta al instante, incluso en envíos que ya están en curso."]
  ];
  var DIAPOS = [
    { oscura: true, titulo: "Portada", html:
      '<svg class="hero-deco" viewBox="0 0 520 520" aria-hidden="true"><circle cx="260" cy="260" r="250"/><circle cx="260" cy="260" r="190"/><circle cx="260" cy="260" r="130"/><circle class="r" cx="260" cy="260" r="140"/></svg>' +
      '<div class="diapo-in"><span class="eyebrow anim">Propuesta · DMS · ABM de contratos</span>' +
      '<h2 class="titulo-hero anim">Configurar un contrato,<br><em>simple</em> para quien conoce el acuerdo</h2>' +
      '<p class="hero-bajada anim">Un recorrido guiado que trae lo que ya existe en SAP, habla en lenguaje comercial y deja cada cambio con fecha y registro.</p>' +
      '<div class="hero-meta anim"><span><strong>4</strong>pasos guiados</span><span><strong>0</strong>datos de SAP tipeados a mano</span><span><strong>100 %</strong>de los cambios con fecha y auditoría</span></div></div>' },
    { titulo: "Punto de partida", html:
      '<div class="diapo-in"><span class="eyebrow anim">El punto de partida · ABM de contratos actual</span><h2 class="grande anim">Lo que hoy hace difícil configurar un contrato</h2>' +
      '<div class="dolores">' + DOLORES.map(function (d, i) {
        return '<div class="dolor" style="animation-delay:' + (0.3 + i * 0.08).toFixed(2) + 's"><span class="chip" style="justify-self:start">' + d[0] + '</span><span class="que">' + d[1] + "</span><p>" + d[2] + "</p></div>";
      }).join("") +
      "</div></div>" },
    { titulo: "Principios", html:
      '<div class="diapo-in"><span class="eyebrow anim">Principios de la propuesta</span><h2 class="grande anim">Cuatro ideas que ordenan todo el rediseño</h2><div class="tarjetas">' +
      tarjeta(I.sap, "Datos de SAP, no se tipean", "El contrato y el cliente se buscan en SAP y se muestran en solo lectura. Si algo está mal, se corrige en el origen.", "se cargan a mano en DMS.") +
      tarjeta(I.dato, "Cada dato tiene un consumidor", "Si ningún proceso (Mostrador, Mobile u otro) usa un dato, se cuestiona antes de pedirlo.", "hay campos que nadie consume.") +
      tarjeta(I.persona, "Configura quien conoce el acuerdo", "No conviene derivar un requerimiento a un área que no le agrega valor. El control lo da la auditoría de DMS: quién cambió qué y cuándo.", "") +
      tarjeta(I.reloj, "Los cambios rigen hacia adelante", "Cada alta o cambio tiene fecha de vigencia y no afecta a los envíos ya admitidos.", "los cambios aplican al instante.") +
      "</div></div>" },
    { titulo: "Recorrido de la demo", html:
      '<div class="diapo-in"><span class="eyebrow anim">Lo que vamos a ver</span><h2 class="grande anim">Un recorrido guiado en 4 pasos</h2>' +
      '<ol class="recorrido"><li class="linea" aria-hidden="true"></li>' +
      '<li><span class="paso" aria-hidden="true">◎</span><h3>Listado</h3><p>Cada contrato con sus niveles de esfuerzo, ciclo, vigencia y estado.</p></li>' +
      '<li><span class="paso">1</span><h3>Contrato SAP</h3><p>Se busca el contrato ya creado; los datos no se editan.</p></li>' +
      '<li><span class="paso">2</span><h3>Servicio</h3><p>Niveles en lenguaje comercial, condición de entrega por requisitos, ciclo por nombre y condiciones agrupadas.</p></li>' +
      '<li><span class="paso">3</span><h3>Domicilios</h3><p>Todas las clases a la vista; un domicilio sirve para varias.</p></li>' +
      '<li><span class="paso">4</span><h3>Resumen y guardado</h3><p>Se ve qué cambió y desde cuándo rige.</p></li></ol></div>' },
    { titulo: "Después de la demo", html:
      '<div class="diapo-in"><span class="eyebrow anim">Fuera de este prototipo · a resolver junto con DMS</span><h2 class="grande anim">Lo que necesitamos para que el contrato solo tenga que elegir</h2><div class="tarjetas">' +
      tarjeta(I.ciclo, "Ciclos de vida con nombre", "Que cada ciclo tenga un nombre que se entienda y que el contrato solo tenga que elegirlo. Hoy los ciclos no tienen nombre y todos los contratos usan el mismo.", "", true) +
      tarjeta(I.flecha, "Cómo se crean y migran los ciclos a DMS", "Un ciclo en DMS no es un dato: son muchas reglas por estado, motivo, intento y días de custodia, y aplica a entrega, reenvío, devolución, rendición y siniestro. Necesitamos una forma de crearlos y de traerlos desde Integra sin cargarlos regla por regla.", "", true) +
      tarjeta(I.motivo, "Sumar motivos nuevos", "Agregar un motivo no debería obligar a revisar ciclo por ciclo, ni dejar intentos sin definir.", "", true) +
      tarjeta(I.dato, "Datos sin dueño claro", "Clases de domicilio, póliza, tipo de envío, fin de validez: necesitamos que DMS confirme cuáles se usan, quién los consume y cuáles son obligatorios.", "", true) +
      '</div><div class="cta anim"><button class="btn btn-primary btn-lg" data-intro="demo">Ver la demo</button><span class="small">Datos ficticios · no se conecta con DMS ni con SAP.</span></div></div>' }
  ];

  var main = document.getElementById("app"), header = document.querySelector(".header");
  var sec = document.createElement("section");
  sec.className = "intro"; sec.id = "intro"; sec.setAttribute("aria-roledescription", "presentación"); sec.setAttribute("aria-label", "Introducción a la propuesta");
  sec.innerHTML = '<div class="intro-progreso" aria-hidden="true"><span></span></div>' +
    '<div class="intro-barra"><span class="small" id="intro-pos" aria-live="polite"></span><div class="der"><button class="btn btn-ghost btn-sm" data-intro="demo">Saltar a la demo</button></div></div>' +
    '<div class="diapos">' + DIAPOS.map(function (d, i) {
      return '<div class="diapo' + (d.oscura ? " oscura" : "") + '" id="diapo-' + i + '" role="group" aria-roledescription="diapositiva" aria-label="' + (i + 1) + " de " + DIAPOS.length + ": " + d.titulo + '" tabindex="-1" hidden>' + d.html + "</div>";
    }).join("") + "</div>" +
    '<div class="intro-nav"><button class="btn btn-secondary" data-intro="ant">Anterior</button><div class="puntos">' +
    DIAPOS.map(function (d, i) { return '<button data-intro="ir" data-i="' + i + '" aria-label="Ir a ' + d.titulo + '"><span></span></button>'; }).join("") +
    '</div><button class="btn btn-primary" data-intro="sig" id="intro-sig">Siguiente</button></div>';
  main.parentNode.insertBefore(sec, main);

  var btnIntro = document.createElement("button");
  btnIntro.className = "btn btn-ghost btn-sm"; btnIntro.textContent = "Ver introducción"; btnIntro.setAttribute("data-intro", "abrir");
  var usuario = header && header.querySelector(".usuario");
  if (usuario && usuario.nextSibling) header.insertBefore(btnIntro, usuario.nextSibling); else if (header) header.appendChild(btnIntro);

  var actual = 0;
  function ir(i, foco) {
    actual = Math.max(0, Math.min(DIAPOS.length - 1, i));
    for (var k = 0; k < DIAPOS.length; k++) {
      var d = document.getElementById("diapo-" + k);
      d.hidden = k !== actual; d.classList.remove("activa");
      if (k === actual) { void d.offsetWidth; d.classList.add("activa"); }
    }
    var ps = sec.querySelectorAll(".puntos button");
    for (var j = 0; j < ps.length; j++) { if (j === actual) ps[j].setAttribute("aria-current", "step"); else ps[j].removeAttribute("aria-current"); }
    sec.classList.toggle("en-oscura", !!DIAPOS[actual].oscura);
    sec.querySelector(".intro-progreso span").style.width = ((actual + 1) / DIAPOS.length * 100) + "%";
    document.getElementById("intro-pos").textContent = (actual + 1) + " de " + DIAPOS.length + " · " + DIAPOS[actual].titulo;
    sec.querySelector('[data-intro="ant"]').disabled = actual === 0;
    var sig = document.getElementById("intro-sig");
    sig.textContent = actual === DIAPOS.length - 1 ? "Ver la demo" : "Siguiente";
    sig.setAttribute("data-intro", actual === DIAPOS.length - 1 ? "demo" : "sig");
    if (foco) document.getElementById("diapo-" + actual).focus();
  }
  function verDemo() { sec.hidden = true; main.hidden = false; btnIntro.hidden = false; if (location.hash !== "#demo") history.replaceState(null, "", "#demo"); var t = document.getElementById("t-lista") || document.getElementById("t-wiz"); if (t) { t.setAttribute("tabindex", "-1"); t.focus(); } window.scrollTo(0, 0); }
  function verIntro(i) { sec.hidden = false; main.hidden = true; btnIntro.hidden = true; history.replaceState(null, "", location.pathname + location.search); ir(i || 0, true); window.scrollTo(0, 0); }

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-intro]"); if (!t) return;
    var a = t.getAttribute("data-intro");
    if (a === "sig") ir(actual + 1, true); else if (a === "ant") ir(actual - 1, true);
    else if (a === "ir") ir(+t.getAttribute("data-i"), true);
    else if (a === "demo") verDemo(); else if (a === "abrir") verIntro(0);
  });
  document.addEventListener("keydown", function (e) {
    if (sec.hidden) return;
    var tag = (e.target.tagName || "").toLowerCase(); if (tag === "input" || tag === "select" || tag === "textarea") return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); if (actual === DIAPOS.length - 1) verDemo(); else ir(actual + 1, true); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); ir(actual - 1, true); }
    else if (e.key === "Home") ir(0, true); else if (e.key === "End") ir(DIAPOS.length - 1, true);
  });

  if (location.hash === "#demo") { ir(0); verDemo(); } else { verIntro(0); }
  window.ABM_INTRO = { ir: ir, verDemo: verDemo, verIntro: verIntro, total: DIAPOS.length, get actual() { return actual; } };
})();
