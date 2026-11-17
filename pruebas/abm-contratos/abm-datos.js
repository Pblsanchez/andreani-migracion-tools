/* ABM Contratos DMS · prototipo (T-007) · DATOS FICTICIOS: ningún cliente, contrato ni domicilio es real (D-003, D-014). */
(function (g) {
  "use strict";

  // Niveles de esfuerzo (valores de ejemplo)
  var NIVELES = [
    { id: "logistica", nombre: "Logística solicitada", opciones: ["Distribución", "Logística inversa", "Almacenaje y distribución"] },
    { id: "container", nombre: "Container", opciones: ["Seco", "Refrigerado 2 a 8 °C", "Congelado"] },
    { id: "sla", nombre: "SLA", opciones: ["Estándar", "Prioritario", "Llega Hoy"] },
    { id: "form", nombre: "Formulario Mobile", opciones: ["Entrega estándar", "Entrega con DNI", "Entrega a mayor de 18 con DNI"] }
  ];

  // Ciclo de vida de ejemplo (D-067.2 / D-068): código + descripción coloquial
  var CICLOS = [
    { id: "cv-01", codigo: "*B-3 , B-2 , CU-7-DES", nombre: "2 visitas + custodia de 7 días descentralizada" }
  ];

  // Condiciones: 16 interruptores de hoy agrupados en 3 bloques (D-067.1). "dms" = nombre actual en DMS.
  var BLOQUES = [
    { id: "admision", nombre: "Admisión", desc: "Cómo entra el envío a la red." },
    { id: "acciones", nombre: "Acciones sobre el envío", desc: "Qué se puede hacer con el envío una vez admitido." },
    { id: "admin", nombre: "Administrativas", desc: "Cobros y valores." }
  ];
  var CONDICIONES = [
    { id: "admAuto", bloque: "admision", nombre: "Admisión automática", dms: ["Admisión automática"], ayuda: "Los envíos se admiten sin control manual en el ingreso." },
    { id: "aforo", bloque: "admision", nombre: "Aforo obligatorio", dms: ["Aforo obligatorio"], ayuda: "Se exige pesar y medir cada bulto al admitirlo." },
    { id: "frio", bloque: "admision", nombre: "Cadena de frío", dms: ["Tiene cadena de frío"], ayuda: "El envío viaja refrigerado de punta a punta." },
    { id: "conservadora", bloque: "admision", nombre: "Conservadora cerrada por el cliente", dms: ["Conservadora cerrada por el cliente"], ayuda: "El cliente entrega la conservadora cerrada y no se abre en la operación." },
    { id: "almacenamiento", bloque: "admision", nombre: "Almacenamiento", dms: ["Permite almacenamiento"], ayuda: "Los envíos pueden quedar guardados en planta antes de salir a distribución." },
    { id: "remito", bloque: "admision", tipo: "opciones", nombre: "Remito", dms: ["Tiene remito"], opciones: ["Digital", "Físico", "Sin remito"], ayuda: "Cómo viaja el remito del cliente. Hoy DMS solo permite sí / no." },
    { id: "rescate", bloque: "acciones", nombre: "Rescate", dms: ["Permite rescate"], ayuda: "El cliente puede pedir recuperar el envío antes de la entrega." },
    { id: "cambio", bloque: "acciones", nombre: "Cambio", dms: ["Tiene cambio"], ayuda: "En la misma visita se entrega un producto y se retira otro." },
    { id: "parcial", bloque: "acciones", nombre: "Entrega parcial", dms: ["Permite entrega parcial"], ayuda: "Se puede entregar una parte de los bultos del envío." },
    { id: "contingencia", bloque: "acciones", nombre: "Contingencia", dms: ["Permite contingencia"], ayuda: "El envío puede operarse con el procedimiento de contingencia." },
    { id: "fecha", bloque: "acciones", nombre: "Actualizar fecha pactada", dms: ["Permite actualizar la fecha pactada"], ayuda: "Se puede reprogramar la fecha acordada con el destinatario." },
    { id: "comprobante", bloque: "acciones", nombre: "Imprimir comprobante de entrega", dms: ["Permite imprimir comprobante de entrega"], ayuda: "Se puede imprimir la constancia de entrega." },
    { id: "telefonica", bloque: "acciones", nombre: "Gestión telefónica", dms: ["Permite gestión telefónica", "Tiene gestión telefónica"], ayuda: "Se contacta por teléfono al destinatario para coordinar la entrega. Reúne los 2 interruptores que hoy parecen duplicados." },
    { id: "cobranza", bloque: "admin", nombre: "Gestión de cobranza", dms: ["Tiene gestión cobranza"], ayuda: "Se cobran valores al destinatario en la entrega." },
    { id: "retiroParcial", bloque: "admin", nombre: "Retiro parcial de valores", dms: ["Pemite retiro parcial de valores"], depende: "cobranza", ayuda: "Los valores cobrados se pueden retirar en partes. Solo aplica con gestión de cobranza." }
  ];

  // Clases de domicilio (D-065): lista de Pablo; obligatorias = las marcadas con *. A validar con el equipo DMS.
  var CLASES = [
    { id: "DEVOLUCION", nombre: "Devolución", obligatoria: true },
    { id: "DEVOLUCION_REMITOS", nombre: "Devolución de remitos (rendición)", obligatoria: true },
    { id: "RESCATE", nombre: "Rescate", obligatoria: false },
    { id: "REENVIO", nombre: "Reenvío", obligatoria: false },
    { id: "DESTRUCCION", nombre: "Destrucción", obligatoria: false },
    { id: "SINIESTRO", nombre: "Siniestro", obligatoria: false },
    { id: "DEVOLUCION_CENTRALIZADA", nombre: "Devolución centralizada", obligatoria: false },
    { id: "DEVOLUCION_COBROS", nombre: "Devolución de cobros", obligatoria: false }
  ];

  // Contratos dados de alta en SAP (ficticios). Se buscan, no se tipean (D-063.1).
  var SAP = [
    { nro: "4000100231", desc: "Encomienda Pyme – Estándar", solicitante: "1000045871", razon: "Comercio Ejemplo Uno S.A.", alta: "2026-10-02" },
    { nro: "4000100232", desc: "Encomienda Pyme – Cobranza", solicitante: "1000045871", razon: "Comercio Ejemplo Uno S.A.", alta: "2026-10-02" },
    { nro: "4000100417", desc: "Encomienda Corporativa – Refrigerado", solicitante: "1000051230", razon: "Laboratorio Demo S.R.L.", alta: "2026-10-15" },
    { nro: "4000100502", desc: "E-commerce – Entrega directa", solicitante: "1000060044", razon: "Tienda Ficticia S.A.", alta: "2026-10-28" },
    { nro: "4000100503", desc: "E-commerce – Cambio", solicitante: "1000060044", razon: "Tienda Ficticia S.A.", alta: "2026-10-28" },
    { nro: "4000100611", desc: "Encomienda Pyme – Estándar", solicitante: "1000070310", razon: "Distribuidora Modelo S.A.", alta: "2026-11-05" },
    { nro: "4000100720", desc: "Encomienda Corporativa – Estándar", solicitante: "1000081122", razon: "Industrias Prueba S.A.", alta: "2026-11-10" },
    { nro: "4000100721", desc: "Encomienda Corporativa – Cobranza", solicitante: "1000081122", razon: "Industrias Prueba S.A.", alta: "2026-11-10" }
  ];

  function condBase(extra) {
    var c = { admAuto: true, aforo: false, frio: false, conservadora: false, almacenamiento: false, remito: "Digital",
      rescate: true, cambio: false, parcial: false, contingencia: true, fecha: true, comprobante: true, telefonica: true,
      cobranza: false, retiroParcial: false };
    for (var k in extra) c[k] = extra[k];
    return c;
  }
  var DOMI_A = { calle: "Av. Siempre Viva", numero: "742", localidad: "Ciudad Ejemplo", provincia: "Buenos Aires", cp: "1000" };
  var DOMI_B = { calle: "Calle Falsa", numero: "123", localidad: "Villa Demo", provincia: "Córdoba", cp: "5000" };

  // Contratos ya configurados en DMS (ficticios)
  var CONTRATOS = [
    { nro: "4000100231", niveles: { logistica: "Distribución", container: "Seco", sla: "Estándar", form: "Entrega estándar" }, ciclo: "cv-01",
      cond: condBase({}), analizar: { poliza: "", tipoEnvio: "", tipoEntrega: "", agrupador: "", finValidez: "9999-12-31" },
      domicilios: [{ id: "d1", dom: DOMI_A, clases: ["DEVOLUCION", "DEVOLUCION_REMITOS", "REENVIO"] }],
      estado: "habilitado", vigencia: "2026-10-05",
      historial: [{ fecha: "2026-10-05 10:12", usuario: "comercial.ejemplo", accion: "Alta", detalle: "Contrato creado · Habilitado desde 05/10/2026" }] },
    { nro: "4000100232", niveles: { logistica: "Distribución", container: "Seco", sla: "Estándar", form: "Entrega con DNI" }, ciclo: "cv-01",
      cond: condBase({ cobranza: true, retiroParcial: true, remito: "Físico" }), analizar: { poliza: "", tipoEnvio: "", tipoEntrega: "", agrupador: "", finValidez: "9999-12-31" },
      domicilios: [{ id: "d2", dom: DOMI_A, clases: ["DEVOLUCION", "DEVOLUCION_REMITOS", "DEVOLUCION_COBROS"] }],
      estado: "habilitado", vigencia: "2026-10-05",
      historial: [{ fecha: "2026-10-05 10:30", usuario: "comercial.ejemplo", accion: "Alta", detalle: "Contrato creado · Habilitado desde 05/10/2026" }] },
    { nro: "4000100417", niveles: { logistica: "Distribución", container: "Refrigerado 2 a 8 °C", sla: "Prioritario", form: "Entrega con DNI" }, ciclo: "cv-01",
      cond: condBase({ frio: true, conservadora: true, aforo: true, remito: "Digital" }), analizar: { poliza: "", tipoEnvio: "", tipoEntrega: "", agrupador: "", finValidez: "9999-12-31" },
      domicilios: [{ id: "d3", dom: DOMI_B, clases: ["DEVOLUCION", "DEVOLUCION_REMITOS"] }],
      estado: "programado", vigencia: "2026-12-01",
      historial: [{ fecha: "2026-11-12 16:02", usuario: "comercial.demo", accion: "Alta", detalle: "Contrato creado · Vigente desde 01/12/2026" }] },
    { nro: "4000100502", niveles: { logistica: "Distribución", container: "Seco", sla: "Llega Hoy", form: "Entrega estándar" }, ciclo: "cv-01",
      cond: condBase({ parcial: true, remito: "Sin remito" }), analizar: { poliza: "", tipoEnvio: "", tipoEntrega: "", agrupador: "", finValidez: "9999-12-31" },
      domicilios: [{ id: "d4", dom: DOMI_B, clases: ["DEVOLUCION"] }],
      estado: "deshabilitado", vigencia: "",
      historial: [{ fecha: "2026-11-03 09:45", usuario: "comercial.demo", accion: "Alta", detalle: "Contrato creado · Deshabilitado (falta domicilio de rendición)" }] }
  ];

  g.ABM_DATOS = { NIVELES: NIVELES, CICLOS: CICLOS, BLOQUES: BLOQUES, CONDICIONES: CONDICIONES, CLASES: CLASES, SAP: SAP, CONTRATOS: CONTRATOS };
})(typeof window !== "undefined" ? window : globalThis);
