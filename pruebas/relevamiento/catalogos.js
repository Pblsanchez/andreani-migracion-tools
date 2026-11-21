/* Relevamiento migración Integra → DMS · catálogos (T-024, D-125). Sin datos de clientes. */
(function (g) {
  "use strict";
  g.REL_CAT = {
    version: "0.1",
    destino: "psanchez@andreani.com",
    migrar: [
      { id: "si", nombre: "Migrar" },
      { id: "no", nombre: "No migrar" },
      { id: "ns", nombre: "No sé" }
    ],
    motivos: [
      { id: "inactivo", nombre: "Inactivo" },
      { id: "baja", nombre: "A dar de baja" }
    ],
    // Provisorios hasta definir otros (D-125)
    ciclos: [
      { id: "c1", codigo: "Alertran motives v4", nombre: "2 intentos de visita y devolución", nota: "Es el estándar de hoy" },
      { id: "c2", codigo: "B-3 , B-2 , CU-7-DES", nombre: "2 visitas + custodia de 7 días descentralizada" },
      { id: "c3", codigo: "CU-7-DES", nombre: "Retira en sucursal · custodia de 7 días descentralizada" },
      { id: "c4", codigo: "B-3 , B-2", nombre: "Retiro en domicilio · 2 visitas sin custodia" }
    ],
    // Condiciones de entrega B2C: una sola por contrato (D-125)
    condiciones: [
      { id: "A", nombre: "Mayor de 18 años, puertas adentro del domicilio, solicitando exhibicion documento que acredite identidad" },
      { id: "B", nombre: "Mayor de 18 años, solicitando exhibicion documento que acredite identidad" },
      { id: "C", nombre: "Solo titular, solicitando exhibicion documento que acredite identidad" },
      { id: "D", nombre: "A titular o familiar directo, solicitando exhibicion documento que acredite identidad" },
      { id: "E", nombre: "A titular o tercero con carta autorizacion o poder firmado por el titular, solicitando exhibicion" },
      { id: "F", nombre: "Bajo puerta con registracion de laterales" },
      { id: "G", nombre: "Bajo puerta" },
      { id: "H", nombre: "Firma en planilla de recorrido" },
      { id: "I", nombre: "Gestion de firma de contrato-Ver instructivo" },
      { id: "J", nombre: "Solo retiro" },
      { id: "K", nombre: "Mayor de 13 años, solicitando exhibición Documento que acredite Identidad" },
      { id: "L", nombre: "A titular con DNI o mayor de 18 años con DNI + Nro de ANDREANI + fotocopia del DNI titular" }
    ],
    // Por cliente (D-125)
    etiquetas: [
      { id: "and", nombre: "Integrada Andreani" },
      { id: "cus", nombre: "Desarrollo custom" },
      { id: "ns", nombre: "No sé" }
    ],
    integraciones: [
      { id: "sin", nombre: "Sin integración" },
      { id: "pull", nombre: "Pull" },
      { id: "push", nombre: "Push" },
      { id: "ambas", nombre: "Pull y push" },
      { id: "ns", nombre: "No sé" }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
