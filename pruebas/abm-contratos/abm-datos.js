/* ABM Contratos DMS · prototipo (T-007) · DATOS FICTICIOS: ningún cliente, contrato ni domicilio es real (D-003, D-014). */
(function (g) {
  "use strict";

  // Niveles de esfuerzo: catálogo real de DMS (cod / dms) + nombre comercial y ayuda (D-070). Ver esquemas/niveles-esfuerzo-dms.md
  var NIVELES = [
    { id: "logistica", nombre: "Tipo de operación", dmsNombre: "Logística solicitada", opciones: [
      { cod: "1", dms: "Entrega", nombre: "Entrega", ayuda: "Llevamos el envío del cliente al destinatario." },
      { cod: "2", dms: "Entrega con un unidad exclusiva", nombre: "Entrega con vehículo exclusivo", ayuda: "Entrega con un vehículo dedicado solo a este cliente." },
      { cod: "3", dms: "Logística inversa", nombre: "Retorno de lo no entregado", ayuda: "Vuelve al cliente la mercadería que no se entregó: rechazos, roturas, recuperos de siniestros. No hay un pedido de retiro: es el flujo de regreso." },
      { cod: "4", dms: "Logística inversa con unidad exclusiva", nombre: "Retorno de lo no entregado con vehículo exclusivo", ayuda: "Igual que el retorno, con un vehículo dedicado solo a este cliente." },
      { cod: "5", dms: "Punto a punto", nombre: "Traslado punto a punto", ayuda: "Retiramos en un punto A y entregamos en un punto B sin pasar por plantas, troncal ni sucursales." },
      { cod: "6", dms: "Retiro", nombre: "Retiro posventa a pedido", ayuda: "El cliente nos pide retirar un paquete a un destinatario al que ya se le entregó (posventa)." },
      { cod: "7", dms: "Cambio", nombre: "Cambio (entrega y retiro en la misma visita)", ayuda: "Se entrega un producto y se retira otro en la misma visita." }
    ] },
    { id: "continente", nombre: "Tipo de carga", dmsNombre: "Continente", opciones: [
      { cod: "1", dms: "Contenedor de 2 a 8 °C", nombre: "Refrigerado (2 a 8 °C)", frio: true, ayuda: "Temperatura controlada entre 2 y 8 °C: farmacéuticos, alimentos." },
      { cod: "2", dms: "Contenedor de 15 a 25 °C", nombre: "Temperatura controlada (15 a 25 °C)", frio: true, ayuda: "Cadena de frío de temperatura controlada entre 15 y 25 °C: productos sensibles al calor." },
      { cod: "3", dms: "Bulto/Paquete", nombre: "Paquete o caja", ayuda: "Mercadería embalada en cajas, bolsas o sobres." },
      { cod: "4", dms: "Pallet", nombre: "Pallet", ayuda: "Carga sobre pallet." },
      { cod: "5", dms: "Contenedor -30 °C", nombre: "Congelado (hasta −30 °C)", frio: true, ayuda: "Mantiene temperaturas de congelación hasta −30 °C." },
      { cod: "6", dms: "Equipos", nombre: "Equipos o maquinaria", ayuda: "Maquinaria, herramientas o electrónicos que requieren transporte especializado." },
      { cod: "7", dms: "Sobre", nombre: "Sobre o documentación", ayuda: "Documentos o artículos pequeños y planos." },
      { cod: "8", dms: "Bodega", nombre: "Bodega exclusiva en el vehículo", ayuda: "Espacio del vehículo reservado solo para la mercadería de este cliente." },
      { cod: "9", dms: "Contenedor Nitrógeno -190°", nombre: "Ultracongelado con nitrógeno (−190 °C)", frio: true, ayuda: "Nitrógeno líquido para muestras biológicas o materiales muy sensibles." },
      { cod: "10", dms: "Bultos Bigger", nombre: "Bulto grande (fuera de medida)", ayuda: "Bultos que exceden las medidas estándar: muebles, maquinaria, voluminosos." },
      { cod: "11", dms: "Bultos irregulares", nombre: "Bulto de forma irregular", ayuda: "Formas no estándar que dificultan apilar o automatizar: tubos, piezas curvas." },
      { cod: "12", dms: "Pallets irregulares", nombre: "Pallet no apilable", ayuda: "Pallets que no se pueden apilar de forma uniforme." }
    ] },
    { id: "sla", nombre: "Plazo de entrega", dmsNombre: "SLA", opciones: [
      { cod: "1", dms: "SLA 1 - Estandar B2B", nombre: "Estándar", ayuda: "Plazo de llegada habitual entre origen y destino." },
      { cod: "2", dms: "SLA 2 - Acordado con el cliente", nombre: "Acordado con el cliente", ayuda: "Plazos acordados especialmente con el cliente." },
      { cod: "3", dms: "SLA 3 - Urgente", nombre: "Urgente", ayuda: "Plazo de llegada extraordinario entre origen y destino." }
    ] }
  ];

  // Nivel 4: «Condición de entrega» = Formulario Mobile B2B, armado por requisitos (D-071; pasa a select en la v0.8 parte 2, D-091). El B2B 9 no se ofrece (no se migrará).
  var REQUISITOS = [
    { id: "dni", grupo: "pide", nombre: "DNI de quien recibe" },
    { id: "firmaSello", grupo: "pide", nombre: "Firma y sello en el remito" },
    { id: "firmaSelloDoc", grupo: "pide", nombre: "Firma y sello en la documentación" },
    { id: "fotoRemito", grupo: "pide", nombre: "Foto del remito" },
    { id: "fotoHojaRuta", grupo: "pide", nombre: "Foto de la hoja de ruta firmada (retira en depósito)" },
    { id: "fotoProducto", grupo: "pide", nombre: "Foto del producto retirado" },
    { id: "valores", grupo: "retira", nombre: "Valores (cobro)" },
    { id: "documentacion", grupo: "retira", nombre: "Documentación" },
    { id: "insumo", grupo: "retira", nombre: "Insumo (conservadora retornable)" }
  ];
  var FORMULARIOS = [
    { cod: "1", dms: "Formulario B2B 1", req: ["fotoRemito"] },
    { cod: "2", dms: "Formulario B2B 2", req: ["dni", "fotoRemito"] },
    { cod: "3", dms: "Formulario B2B 3", req: ["dni", "fotoRemito", "valores"] },
    { cod: "4", dms: "Formulario B2B 4", req: ["dni", "fotoRemito", "documentacion"] },
    { cod: "5", dms: "Formulario B2B 5", req: ["dni", "fotoRemito", "insumo"] },
    { cod: "6", dms: "Formulario B2B 6", req: ["firmaSello", "fotoRemito", "insumo"] },
    { cod: "7", dms: "Formulario B2B 7", req: ["firmaSello", "fotoRemito"] },
    { cod: "8", dms: "Formulario B2B 8", req: ["fotoHojaRuta"] },
    { cod: "10", dms: "Formulario B2B 10", req: ["dni", "firmaSelloDoc", "fotoRemito"] },
    { cod: "11", dms: "Formulario B2B 11", req: ["dni", "firmaSello", "fotoRemito", "valores"] },
    { cod: "12", dms: "Formulario B2B 12", req: ["dni", "firmaSello", "fotoRemito", "valores", "insumo"] },
    { cod: "13", dms: "Formulario B2B 13", req: ["fotoProducto"] }
  ];

  // Ciclos de vida de ejemplo (D-068, D-075): código + descripción coloquial
  // cv-std = ciclo estándar B2B que hoy tienen todos los contratos en DMS (D-075)
  var CICLOS = [
    { id: "cv-std", codigo: "Alertran motives v4", nombre: "2 intentos de visita y devolución", estandar: true },
    { id: "cv-01", codigo: "B-3 , B-2 , CU-7-DES", nombre: "2 visitas + custodia de 7 días descentralizada" },
    { id: "cv-02", codigo: "CU-7-DES", nombre: "Retira en sucursal · custodia de 7 días descentralizada" },
    { id: "cv-03", codigo: "B-3 , B-2", nombre: "Retiro en domicilio · 2 visitas sin custodia" }
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

  // Usuario comercial de ejemplo y su cartera (D-088). De dónde sale la cartera lo define el desarrollo de DMS.
  var COMERCIAL = { usuario: "comercial.ejemplo", nombre: "Usuario comercial (ejemplo)",
    solicitantes: ["1000045871", "1000051230", "1000060044", "1000081122", "1000092200"] };

  // Contratos dados de alta en SAP (ficticios). Se buscan, no se tipean (D-063.1).
  // B2C: 10 dígitos (4000…). B2B: 9 dígitos, empiezan con 35100 (D-090, D-032).
  var SAP = [
    { nro: "4000100231", desc: "Encomienda Pyme – Estándar", solicitante: "1000045871", razon: "Comercio Ejemplo Uno S.A.", alta: "2026-10-02" },
    { nro: "4000100232", desc: "Encomienda Pyme – Cobranza", solicitante: "1000045871", razon: "Comercio Ejemplo Uno S.A.", alta: "2026-10-02" },
    { nro: "4000100233", desc: "Encomienda Pyme – Devoluciones", solicitante: "1000045871", razon: "Comercio Ejemplo Uno S.A.", alta: "2026-11-12" },
    { nro: "4000100417", desc: "Encomienda Corporativa – Refrigerado", solicitante: "1000051230", razon: "Laboratorio Demo S.R.L.", alta: "2026-10-15" },
    { nro: "351000215", desc: "Distribución B2B – Refrigerado", solicitante: "1000051230", razon: "Laboratorio Demo S.R.L.", alta: "2026-11-11" },
    { nro: "4000100502", desc: "E-commerce – Entrega directa", solicitante: "1000060044", razon: "Tienda Ficticia S.A.", alta: "2026-10-28" },
    { nro: "4000100503", desc: "E-commerce – Cambio", solicitante: "1000060044", razon: "Tienda Ficticia S.A.", alta: "2026-10-28" },
    { nro: "4000100610", desc: "Encomienda Pyme – Estándar", solicitante: "1000070310", razon: "Distribuidora Modelo S.A.", alta: "2026-10-20" },
    { nro: "4000100611", desc: "Encomienda Pyme – Cobranza", solicitante: "1000070310", razon: "Distribuidora Modelo S.A.", alta: "2026-11-05" },
    { nro: "4000100720", desc: "Encomienda Corporativa – Estándar", solicitante: "1000081122", razon: "Industrias Prueba S.A.", alta: "2026-11-10" },
    { nro: "4000100721", desc: "Encomienda Corporativa – Cobranza", solicitante: "1000081122", razon: "Industrias Prueba S.A.", alta: "2026-11-10" },
    { nro: "351000101", desc: "Distribución B2B – Estándar", solicitante: "1000092200", razon: "Mayorista Ejemplo S.A.", alta: "2026-09-15" },
    { nro: "351000102", desc: "Distribución B2B – Pallet", solicitante: "1000092200", razon: "Mayorista Ejemplo S.A.", alta: "2026-11-14" }
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
  var DOMI_C = { calle: "Ruta Ficticia", numero: "4500", localidad: "Parque Industrial Demo", provincia: "Santa Fe", cp: "2000" };
  var DOMI_D = { calle: "Pasaje Modelo", numero: "88", localidad: "Pueblo Ejemplo", provincia: "Mendoza", cp: "5500" };

  // Contratos ya configurados en DMS (ficticios). agrupador = contrato del mismo solicitante del que se hereda la rendición (D-089).
  var CONTRATOS = [
    { nro: "4000100231", niveles: { logistica: "1", continente: "3", sla: "1" }, req: ["dni", "fotoRemito"], ciclo: "cv-std",
      cond: condBase({}), agrupador: "", poliza: "",
      domicilios: [{ id: "d1", dom: DOMI_A, clases: ["DEVOLUCION", "DEVOLUCION_REMITOS", "REENVIO"] }],
      estado: "habilitado", vigencia: "2026-10-05",
      historial: [{ fecha: "2026-10-05 10:12", usuario: "comercial.ejemplo", accion: "Alta", detalle: "Contrato creado · Habilitado desde 05/10/2026" }] },
    { nro: "4000100232", niveles: { logistica: "1", continente: "3", sla: "1" }, req: ["dni", "fotoRemito", "valores"], ciclo: "cv-std",
      cond: condBase({ cobranza: true, retiroParcial: true, remito: "Físico" }), agrupador: "4000100231", poliza: "",
      domicilios: [{ id: "d2", dom: DOMI_A, clases: ["DEVOLUCION", "DEVOLUCION_COBROS"] }],
      estado: "habilitado", vigencia: "2026-10-05",
      historial: [{ fecha: "2026-10-05 10:30", usuario: "comercial.ejemplo", accion: "Alta", detalle: "Contrato creado · Agrupador 4000100231 (hereda la rendición) · Habilitado desde 05/10/2026" }] },
    { nro: "4000100417", niveles: { logistica: "1", continente: "1", sla: "3" }, req: ["dni", "fotoRemito", "insumo"], ciclo: "cv-std",
      cond: condBase({ frio: true, conservadora: true, aforo: true, remito: "Digital" }), agrupador: "", poliza: "",
      domicilios: [{ id: "d3", dom: DOMI_B, clases: ["DEVOLUCION", "DEVOLUCION_REMITOS"] }],
      estado: "programado", vigencia: "2026-12-01",
      historial: [{ fecha: "2026-11-12 16:02", usuario: "comercial.demo", accion: "Alta", detalle: "Contrato creado · Vigente desde 01/12/2026" }] },
    { nro: "4000100502", niveles: { logistica: "1", continente: "7", sla: "2" }, req: ["firmaSello", "fotoRemito"], ciclo: "cv-std",
      cond: condBase({ parcial: true, remito: "Digital" }), agrupador: "", poliza: "",
      domicilios: [{ id: "d4", dom: DOMI_B, clases: ["DEVOLUCION"] }],
      estado: "deshabilitado", vigencia: "",
      historial: [{ fecha: "2026-11-03 09:45", usuario: "comercial.demo", accion: "Alta", detalle: "Contrato creado · Deshabilitado (falta domicilio de rendición)" }] },
    { nro: "351000101", niveles: { logistica: "1", continente: "4", sla: "1" }, req: ["firmaSello", "fotoRemito"], ciclo: "cv-std",
      cond: condBase({ aforo: true, remito: "Físico" }), agrupador: "", poliza: "",
      domicilios: [{ id: "d5", dom: DOMI_C, clases: ["DEVOLUCION", "DEVOLUCION_REMITOS", "REENVIO"] }],
      estado: "habilitado", vigencia: "2026-09-20",
      historial: [{ fecha: "2026-09-20 11:05", usuario: "comercial.ejemplo", accion: "Alta", detalle: "Contrato creado · Habilitado desde 20/09/2026" }] },
    // Fuera de la cartera del comercial de ejemplo: no se ve en el listado (D-088)
    { nro: "4000100610", niveles: { logistica: "1", continente: "3", sla: "1" }, req: ["dni", "fotoRemito"], ciclo: "cv-std",
      cond: condBase({}), agrupador: "", poliza: "",
      domicilios: [{ id: "d6", dom: DOMI_D, clases: ["DEVOLUCION", "DEVOLUCION_REMITOS"] }],
      estado: "habilitado", vigencia: "2026-10-22",
      historial: [{ fecha: "2026-10-22 15:40", usuario: "comercial.otro", accion: "Alta", detalle: "Contrato creado · Habilitado desde 22/10/2026" }] }
  ];

  g.ABM_DATOS = { NIVELES: NIVELES, REQUISITOS: REQUISITOS, FORMULARIOS: FORMULARIOS, CICLOS: CICLOS, BLOQUES: BLOQUES, CONDICIONES: CONDICIONES, CLASES: CLASES, COMERCIAL: COMERCIAL, SAP: SAP, CONTRATOS: CONTRATOS };
})(typeof window !== "undefined" ? window : globalThis);
