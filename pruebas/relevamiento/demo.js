/* Cartera de EJEMPLO: ningún cliente ni contrato es real (D-003, D-014). En E3 se reemplaza por la cartera cifrada del link personal. */
(function (g) {
  "use strict";
  g.REL_DEMO = {
    id: "demo",
    ejecutivo: "Comercial de ejemplo",
    clientes: [
      { id: "k1", razon: "Comercio Ejemplo Uno S.A.", sap: "104587", contratos: [
        { nro: "4000100231", servicio: "Encomienda Pyme – Estándar" },
        { nro: "4000100232", servicio: "Encomienda Pyme – Cobranza" },
        { nro: "4000100233", servicio: "Encomienda Pyme – Devoluciones" }
      ] },
      { id: "k2", razon: "Tienda Ficticia S.A.", sap: "106004", contratos: [
        { nro: "4000100502", servicio: "E-commerce – Entrega directa" },
        { nro: "4000100503", servicio: "E-commerce – Cambio" }
      ] },
      { id: "k3", razon: "Laboratorio Demo S.R.L.", sap: "105123", contratos: [
        { nro: "4000100417", servicio: "Encomienda Corporativa – Documentación" }
      ] },
      { id: "k4", razon: "Industrias Prueba S.A.", sap: "108112", contratos: [
        { nro: "4000100720", servicio: "Encomienda Corporativa – Estándar" },
        { nro: "4000100721", servicio: "Encomienda Corporativa – Cobranza" }
      ] }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
