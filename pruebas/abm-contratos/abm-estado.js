/* ABM Contratos DMS · deshabilitar y volver a habilitar un contrato existente (T-007 v0.7, D-078). Datos ficticios. */
(function (g) {
  "use strict";
  function U() { return g.ABM_UI; }
  function activo(c) { return c.estado !== "deshabilitado"; }

  /* Barra de estado en la pantalla de edición */
  function barra(nro) {
    var u = U(), c = u.contrato(nro); if (!c) return "";
    var on = activo(c);
    return '<div class="estado-bar' + (on ? "" : " off") + '"><div class="estado-txt"><span class="small strong">Estado actual</span> ' + u.chipEstado(c) +
      '<p class="small">' + (on
        ? "Si el contrato deja de usarse, deshabilitalo: queda guardado con su configuración y lo podés volver a habilitar cuando haga falta."
        : "Está deshabilitado: no se pueden admitir envíos nuevos con este contrato. Podés volver a habilitarlo cuando haga falta.") + "</p></div>" +
      '<button class="btn ' + (on ? "btn-secondary" : "btn-primary") + '" id="btnEstado" data-acc="estadoContrato" data-nro="' + u.esc(nro) + '">' + (on ? "Deshabilitar contrato" : "Volver a habilitar") + "</button></div>";
  }
  /* Opción en el menú ⋮ del listado */
  function itemMenu(c) { return '<button role="menuitem" data-acc="estadoContrato" data-nro="' + c.nro + '">' + (activo(c) ? "Deshabilitar" : "Volver a habilitar") + "</button>"; }

  var foco = null;
  function abrir(nro) {
    var u = U(), c = u.contrato(nro); if (!c) return;
    var on = activo(c); foco = document.activeElement && document.activeElement.id;
    var m = document.createElement("div"); m.className = "modal-fondo"; m.id = "modal";
    m.innerHTML = '<div class="modal modal-chico" role="dialog" aria-modal="true" aria-labelledby="t-est"><div class="modal-head"><h3 id="t-est">' + (on ? "Deshabilitar" : "Volver a habilitar") + " el contrato " + u.esc(nro) + "</h3></div>" +
      "<p>" + (on
        ? "Desde ahora no se van a poder admitir envíos nuevos con este contrato. La configuración queda guardada y lo podés volver a habilitar cuando haga falta."
        : "El contrato vuelve a quedar habilitado desde hoy, con la misma configuración que tenía.") + "</p>" +
      '<div class="campo"><label for="motivoEstado">Motivo (opcional, queda en el historial)</label><textarea id="motivoEstado" rows="3" placeholder="' + (on ? "Ej.: el cliente dejó de operar este servicio" : "Ej.: el cliente retoma el servicio") + '"></textarea></div>' +
      '<div class="pie-modal"><button class="btn btn-ghost" data-acc="cerrarModal">Cancelar</button><button class="btn btn-primary" id="confEstado" data-nro="' + u.esc(nro) + '">' + (on ? "Deshabilitar" : "Habilitar desde hoy") + "</button></div></div>";
    document.body.appendChild(m);
    var ta = document.getElementById("motivoEstado"); if (ta) ta.focus();
  }

  /* Cambia el estado del contrato guardado (no toca el borrador del wizard) y lo deja en la auditoría */
  function cambiar(nro, motivo) {
    var u = U(), c = u.contrato(nro); if (!c) return null;
    var on = activo(c); motivo = String(motivo || "").trim();
    c.estado = on ? "deshabilitado" : "habilitado";
    c.vigencia = on ? "" : u.hoyISO();
    c.historial.push({ fecha: u.ahora(), usuario: "comercial.ejemplo", accion: on ? "Deshabilitado" : "Habilitado nuevamente",
      detalle: (on ? "Deshabilitado desde " + u.fmtFecha(u.hoyISO()) : "Habilitado desde " + u.fmtFecha(c.vigencia)) + (motivo ? " · Motivo: " + motivo : "") });
    return c.estado;
  }

  if (typeof document !== "undefined") {
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("#confEstado"); if (!t) return;
      var nro = t.getAttribute("data-nro"), txt = document.getElementById("motivoEstado");
      var est = cambiar(nro, txt ? txt.value : "");
      var m = document.getElementById("modal"); if (m) m.parentNode.removeChild(m);
      U().toast(est === "deshabilitado" ? "Contrato " + nro + " deshabilitado" : "Contrato " + nro + " habilitado desde hoy");
      U().render(foco === "btnEstado" ? "btnEstado" : null);
    });
  }

  g.ABM_ESTADO = { barra: barra, itemMenu: itemMenu, abrir: abrir, cambiar: cambiar, activo: activo };
})(typeof window !== "undefined" ? window : globalThis);
