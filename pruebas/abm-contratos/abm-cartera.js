/* ABM Contratos DMS · cartera del comercial, canal y contrato agrupador (T-007 v0.8, D-088, D-089, D-090). Datos ficticios. */
(function (g) {
  "use strict";
  var D = g.ABM_DATOS;
  function sap(nro) { for (var i = 0; i < D.SAP.length; i++) if (D.SAP[i].nro === nro) return D.SAP[i]; return null; }

  /* Canal por número de contrato (D-032): 350/351 = B2B; el resto, B2C */
  function canal(nro) { return /^35[01]/.test(String(nro || "")) ? "B2B" : "B2C"; }
  function chipCanal(nro) { var c = canal(nro); return '<span class="chip" title="Canal ' + c + '">' + c + "</span>"; }

  /* Cartera (D-088): de dónde sale la define el desarrollo de DMS; acá, solicitantes asignados al comercial de ejemplo */
  function enCartera(nro) { var s = sap(nro); return !!s && D.COMERCIAL.solicitantes.indexOf(s.solicitante) >= 0; }
  function clientesCartera() {
    var vistos = {}, n = 0;
    D.SAP.forEach(function (s) { if (D.COMERCIAL.solicitantes.indexOf(s.solicitante) >= 0 && !vistos[s.solicitante]) { vistos[s.solicitante] = 1; n++; } });
    return n;
  }

  /* Contrato agrupador (D-089): contratos ya configurados del mismo solicitante, que no tengan a su vez un agrupador */
  function agrupadores(nro, contratos) {
    var s = sap(nro); if (!s) return [];
    return contratos.filter(function (c) { var sc = sap(c.nro); return c.nro !== nro && sc && sc.solicitante === s.solicitante && !c.agrupador; });
  }
  /* Domicilio de rendición heredado: se lee del agrupador cada vez (herencia viva) */
  function rendicionDe(nroAgrupador, contratos) {
    for (var i = 0; i < contratos.length; i++) {
      var c = contratos[i]; if (c.nro !== nroAgrupador) continue;
      for (var j = 0; j < c.domicilios.length; j++) if (c.domicilios[j].clases.indexOf("DEVOLUCION_REMITOS") >= 0) return c.domicilios[j].dom;
    }
    return null;
  }
  /* Al elegir agrupador, la rendición deja de cargarse en este contrato */
  function aplicarAgrupador(b, nro) {
    b.agrupador = nro || "";
    if (b.agrupador) {
      b.domicilios.forEach(function (d) { d.clases = d.clases.filter(function (x) { return x !== "DEVOLUCION_REMITOS"; }); });
      b.domicilios = b.domicilios.filter(function (d) { return d.clases.length; });
    }
    return b;
  }

  g.ABM_CARTERA = { canal: canal, chipCanal: chipCanal, enCartera: enCartera, clientesCartera: clientesCartera, agrupadores: agrupadores, rendicionDe: rendicionDe, aplicarAgrupador: aplicarAgrupador };
})(typeof window !== "undefined" ? window : globalThis);
