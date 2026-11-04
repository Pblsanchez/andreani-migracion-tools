/* ==XLSX-START== Generador de .xlsx propio, sin librerías ni CDN (D-007, D-015). T-005 v1.8.4.
   MATRIZ_XLSX: genérico y reutilizable. libro(hojas) → Uint8Array (ZIP sin compresión + CRC32); descargar(nombre, hojas).
   hoja = { nombre, columnas: [{ t: "Título", ancho: 20, n: 1 (número) , wrap: 1 }], filas: [[...]], filtro: true }.
   MATRIZ_RSA_XLSX: filas de «Resolver vínculos» (pendientes) con candidatos sugeridos por nombre. Lógica pura, sin DOM. */
var MATRIZ_XLSX = (function () {
  "use strict";
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function utf8(s) { return new TextEncoder().encode(s); }
  /* ZIP «stored» (método 0): Excel lo abre sin problema y no depende de CompressionStream */
  function zip(archivos) {
    var partes = [], central = [], off = 0, d = new Date(), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    function cab(len) { var b = new Uint8Array(len); return { b: b, v: new DataView(b.buffer) }; }
    archivos.forEach(function (f) {
      var nm = utf8(f.nombre), data = typeof f.data === "string" ? utf8(f.data) : f.data, crc = crc32(data);
      var L = cab(30 + nm.length), v = L.v;
      v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
      v.setUint16(10, tm, true); v.setUint16(12, dt, true); v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true);
      v.setUint16(26, nm.length, true); v.setUint16(28, 0, true); L.b.set(nm, 30);
      var C = cab(46 + nm.length), w = C.v;
      w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true); w.setUint16(10, 0, true);
      w.setUint16(12, tm, true); w.setUint16(14, dt, true); w.setUint32(16, crc, true); w.setUint32(20, data.length, true); w.setUint32(24, data.length, true);
      w.setUint16(28, nm.length, true); w.setUint32(42, off, true); C.b.set(nm, 46);
      partes.push(L.b, data); central.push(C.b); off += L.b.length + data.length;
    });
    var tamC = central.reduce(function (s, b) { return s + b.length; }, 0), E = cab(22), e = E.v;
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, archivos.length, true); e.setUint16(10, archivos.length, true); e.setUint32(12, tamC, true); e.setUint32(16, off, true);
    var todo = partes.concat(central, [E.b]), out = new Uint8Array(off + tamC + 22), p = 0;
    todo.forEach(function (b) { out.set(b, p); p += b.length; });
    return out;
  }
  function esc(v) { return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function letra(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; }
  function nombreHoja(s, usados) {
    var b = String(s || "Hoja").replace(/[\[\]:*?\/\\]/g, " ").trim().slice(0, 31) || "Hoja", x = b, k = 2;
    while (usados[x.toLowerCase()]) x = b.slice(0, 28) + " " + k++;
    usados[x.toLowerCase()] = 1; return x;
  }
  /* Estilos: 0 normal · 1 encabezado (negrita, fondo gris, ajuste) · 2 número #.##0 · 3 texto con ajuste */
  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EAED"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
    '<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="top"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  function hojaXml(h) {
    var cols = h.columnas, nf = (h.filas || []).length + 1, ult = letra(cols.length - 1);
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
    x += '<dimension ref="A1:' + ult + nf + '"/>';
    x += '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>';
    x += '<sheetFormatPr defaultRowHeight="15"/><cols>' + cols.map(function (c, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (c.ancho || 14) + '" customWidth="1"/>'; }).join("") + '</cols><sheetData>';
    function celda(v, i, r, s) {
      var ref = letra(i) + r;
      if (v === null || v === undefined || v === "") return s ? '<c r="' + ref + '" s="' + s + '"/>' : "";
      if (typeof v === "number" && isFinite(v)) return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : "") + '><v>' + v + '</v></c>';
      return '<c r="' + ref + '" t="inlineStr"' + (s ? ' s="' + s + '"' : "") + '><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
    }
    x += '<row r="1">' + cols.map(function (c, i) { return celda(c.t, i, 1, 1); }).join("") + '</row>';
    (h.filas || []).forEach(function (f, j) {
      x += '<row r="' + (j + 2) + '">' + cols.map(function (c, i) { return celda(f[i], i, j + 2, c.n ? 2 : c.wrap ? 3 : 0); }).join("") + '</row>';
    });
    x += '</sheetData>';
    if (h.filtro !== false) x += '<autoFilter ref="A1:' + ult + nf + '"/>';
    x += '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
    return x;
  }
  function libro(hojas) {
    var usados = {}, nombres = hojas.map(function (h) { return nombreHoja(h.nombre, usados); });
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      hojas.map(function (h, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") + '</Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
      nombres.map(function (n, i) { return '<sheet name="' + esc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + '</sheets>';
    var dn = hojas.map(function (h, i) { return h.filtro === false ? "" : '<definedName name="_xlnm._FilterDatabase" localSheetId="' + i + '" hidden="1">\'' + esc(nombres[i]).replace(/'/g, "''") + '\'!$A$1:$' + letra(h.columnas.length - 1) + '$' + ((h.filas || []).length + 1) + '</definedName>'; }).join("");
    wb += (dn ? '<definedNames>' + dn + '</definedNames>' : "") + '</workbook>';
    var wbr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      hojas.map(function (h, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
      '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var arch = [{ nombre: "[Content_Types].xml", data: ct }, { nombre: "_rels/.rels", data: rels }, { nombre: "xl/workbook.xml", data: wb }, { nombre: "xl/_rels/workbook.xml.rels", data: wbr }, { nombre: "xl/styles.xml", data: STYLES }];
    hojas.forEach(function (h, i) { arch.push({ nombre: "xl/worksheets/sheet" + (i + 1) + ".xml", data: hojaXml(h) }); });
    return zip(arch);
  }
  function descargar(nombre, hojas) {
    var blob = new Blob([libro(hojas)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  return { libro: libro, descargar: descargar, crc32: crc32, letra: letra };
})();

/* Pendientes de «Resolver vínculos» → hoja «Pendientes» (T-005 v1.8.4, pedido de Pablo 2026-11-04).
   Candidatos sugeridos: parecido de nombre por palabras (coeficiente de Dice sobre palabras normalizadas, sin formas societarias).
   «Sin RSA»: hasta 3 RSA del catálogo (Rentabilidad CLIENTE y Base RSA) con parecido ≥ 50 %. «Ambiguo»: el RSA posible con nombre más parecido, si supera el umbral y no empata. */
var MATRIZ_RSA_XLSX = (function () {
  "use strict";
  var INTERNOS = ["88881", "88882", "99999", "01648"], UMBRAL = 0.5;
  var VACIAS = { SA: 1, SRL: 1, SAS: 1, SAU: 1, SACI: 1, SAIC: 1, SACIFIA: 1, SAICEI: 1, SCA: 1, SH: 1, SE: 1, LTDA: 1, SOCIEDAD: 1, ANONIMA: 1, LIMITADA: 1, SUCURSAL: 1, SUC: 1, DE: 1, DEL: 1, LA: 1, LAS: 1, EL: 1, LOS: 1, Y: 1, E: 1, THE: 1, AND: 1, ARGENTINA: 1, ARG: 1 };
  function palabras(s) {
    var x = String(s == null ? "" : s).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " Y ").replace(/[^A-Z0-9]+/g, " ").trim();
    var t = x ? x.split(" ") : [], o = [], vis = {};
    t.forEach(function (w) { if ((w.length > 1 || /\d/.test(w)) && !VACIAS[w] && !vis[w]) { vis[w] = 1; o.push(w); } });
    return o;
  }
  function parecido(a, b) {
    var A = Array.isArray(a) ? a : palabras(a), B = Array.isArray(b) ? b : palabras(b);
    if (!A.length || !B.length) return 0;
    var sa = A.join(" "), sb = B.join(" "); if (sa === sb) return 1;
    var i = 0, mb = {}; B.forEach(function (w) { mb[w] = 1; }); A.forEach(function (w) { if (mb[w]) i++; });
    var d = 2 * i / (A.length + B.length), corto = sa.length < sb.length ? sa : sb, largo = corto === sa ? sb : sa;
    if (corto.length >= 5 && (" " + largo + " ").indexOf(" " + corto + " ") >= 0) d = Math.max(d, 0.8);
    return d;
  }
  /* Índice de nombres de RSA: catálogo (fuentes/rentabilidad_rsa.csv) + Base RSA (nombre normalizado y razón social del solicitante) */
  function indice(catalogo, baseRsa) {
    var ent = [], porPal = {}, nombre = {};
    function add(id, nm) {
      if (!id || !nm || INTERNOS.indexOf(id) >= 0) return;
      var p = palabras(nm); if (!p.length) return;
      var e = { id: id, nombre: nm, p: p }, k = ent.push(e) - 1;
      p.forEach(function (w) { (porPal[w] = porPal[w] || []).push(k); });
    }
    (catalogo || []).forEach(function (r) { if (r.CLIENTE && !nombre[r.ID_RSA]) nombre[r.ID_RSA] = r.CLIENTE; add(r.ID_RSA, r.CLIENTE); });
    (baseRsa || []).forEach(function (r) { if (r.RSA_NORMALIZADA && !nombre[r.COD_RSA]) nombre[r.COD_RSA] = r.RSA_NORMALIZADA; add(r.COD_RSA, r.RSA_NORMALIZADA); add(r.COD_RSA, r.RAZONSOCIALSOLICITANTE); });
    return { ent: ent, porPal: porPal, nombre: nombre };
  }
  function nombreDe(I, id) { return I.nombre[id] || "(sin nombre)"; }
  /* Mejor parecido por RSA para una razón social. ids (opcional) = limitar a esos RSA.
     Sin ids, solo se comparan nombres que comparten al menos una palabra poco frecuente (≤ RARA nombres del catálogo):
     así «DISTRIBUIDORA», «LOGISTICA» o «COMERCIAL» solas no generan sugerencias. */
  var RARA = 25;
  function puntajes(I, rs, ids) {
    var p = palabras(rs), cand = {}, mej = {};
    p.forEach(function (w) { var l = I.porPal[w] || []; if (ids || l.length <= RARA) l.forEach(function (k) { cand[k] = 1; }); });
    Object.keys(cand).forEach(function (k) {
      var e = I.ent[k]; if (ids && ids.indexOf(e.id) < 0) return;
      var s = parecido(p, e.p); if (!mej[e.id] || s > mej[e.id]) mej[e.id] = s;
    });
    return Object.keys(mej).map(function (id) { return { id: id, nombre: nombreDe(I, id), score: mej[id] }; })
      .sort(function (a, b) { return b.score - a.score || (a.id < b.id ? -1 : 1); });
  }
  function sugerir(I, d, max) {
    if (d.rsa && d.rsa.length > 1) {
      var l = puntajes(I, d.rs, d.rsa);
      return l.length && l[0].score >= UMBRAL && (!l[1] || l[1].score < l[0].score) ? [l[0]] : [];
    }
    return puntajes(I, d.rs).filter(function (x) { return x.score >= UMBRAL; }).slice(0, max || 3);
  }
  function pct(x) { return Math.round(x * 100) + " %"; }
  var COLUMNAS = [{ t: "Razón social", ancho: 42, wrap: 1 }, { t: "Envíos", ancho: 12, n: 1 }, { t: "Situación", ancho: 12 }, { t: "Cantidad de RSA posibles", ancho: 12, n: 1 },
    { t: "RSA posibles", ancho: 50, wrap: 1 }, { t: "Candidatos sugeridos", ancho: 50, wrap: 1 }, { t: "RSA elegido", ancho: 16 }];
  /* du = MATRIZ_RSA.dudas(...) (todas las pendientes, ordenadas por envíos). Devuelve la hoja para MATRIZ_XLSX.libro */
  function hojaPendientes(du, catalogo, baseRsa) {
    var I = indice(catalogo, baseRsa), conSug = 0;
    var filas = du.map(function (d) {
      var sug = sugerir(I, d); if (sug.length) conSug++;
      return [d.rs, d.envios, d.tipo, d.rsa.length, d.rsa.map(function (id) { return id + " · " + nombreDe(I, id); }).join(" | "),
        sug.map(function (x) { return x.id + " · " + x.nombre + " (" + pct(x.score) + ")"; }).join(" | "), ""];
    });
    return { hoja: { nombre: "Pendientes", columnas: COLUMNAS, filas: filas }, conSugeridos: conSug };
  }
  function nombreArchivo(fecha) { var d = fecha || new Date(); return "vinculos-pendientes-" + d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2) + ".xlsx"; }
  return { palabras: palabras, parecido: parecido, indice: indice, puntajes: puntajes, sugerir: sugerir, hojaPendientes: hojaPendientes, nombreArchivo: nombreArchivo, COLUMNAS: COLUMNAS, UMBRAL: UMBRAL };
})();
if (typeof module !== "undefined" && module.exports) module.exports = { MATRIZ_XLSX: MATRIZ_XLSX, MATRIZ_RSA_XLSX: MATRIZ_RSA_XLSX };
/* ==XLSX-END== */
