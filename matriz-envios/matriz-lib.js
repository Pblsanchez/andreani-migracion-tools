/* ==LIB-START== Lógica pura de la Matriz de Envíos (sin DOM). Se testea en Node. */
var MATRIZ = (function () {
  "use strict";

  var MESES_ES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
  var MESES_TXT = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  var SIN_RS = "(Sin razón social)";
  var SIN_SEG = "(Sin segmento)";
  var NO_INF = "(Tipo no informado)";
  var AGR_NO = "(Agrupado no informado)";
  var SIN_CON = "(Sin contrato)";
  /* Clientes internos: no aparecen en rankings ni en la concentración top 10 (pedido de Pablo, D-016) */
  var INTERNOS = ["CORREO ANDREANI S.A.", "ANDREANI ONLINE"];
  function esInterno(nombre) {
    var s = sinAcentos(nombre).replace(/[.\s]+/g, " ").trim();
    return INTERNOS.some(function (x) { var k = sinAcentos(x).replace(/[.\s]+/g, " ").trim(); return s === k || s.indexOf(k + " ") === 0; });
  }

  /* ---------- Utilidades ---------- */
  function norm(s) { return String(s == null ? "" : s).trim(); }
  function sinAcentos(s) { return norm(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function esTotal(v) { return /^total$/i.test(norm(v)); }
  function num(v) {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    var s = String(v).trim().replace(/\s/g, "");
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
    var n = Number(s);
    return isFinite(n) ? n : 0;
  }
  /* "Ene.-26", "ene-26", "Enero 2026", "2026-01" -> "2026-01" */
  function parseMes(label) {
    var s = sinAcentos(label).replace(/\s+/g, " ");
    var m = s.match(/^(\d{4})-(\d{1,2})$/);
    if (m) return m[1] + "-" + ("0" + m[2]).slice(-2);
    m = s.match(/^([a-z]{3})[a-z]*\.?\s*[-/ ]\s*(\d{2}|\d{4})$/);
    if (m && MESES_ES[m[1]]) {
      var y = m[2].length === 2 ? "20" + m[2] : m[2];
      return y + "-" + ("0" + MESES_ES[m[1]]).slice(-2);
    }
    return null;
  }
  function mesTxt(k) { var p = k.split("-"); return MESES_TXT[+p[1]] + "-" + p[0].slice(2); }
  function mesActual(fecha) { var d = fecha || new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2); }
  /* La clave NO incluye el servicio agrupado (D-011, D-029): las marcas de migración no cambian */
  function clave(r) { return r.contrato + "|" + r.tipo + "|" + r.servicio; }

  /* ---------- Matriz (filas de celdas) -> registros ---------- */
  function desdeFilas(rows) {
    var iHead = -1;
    for (var i = 0; i < Math.min(rows.length, 30) && iHead < 0; i++) {
      var r = rows[i] || [];
      for (var c = 0; c < r.length; c++) if (/contrato/.test(sinAcentos(r[c]))) { iHead = i; break; }
    }
    if (iHead < 0) throw new Error("No encontré la fila de encabezados (falta la columna «N° Contrato»).");
    var head = (rows[iHead] || []).map(sinAcentos);
    function idx(re, excl) { for (var k = 0; k < head.length; k++) if (re.test(head[k]) && excl.indexOf(k) < 0) return k; return -1; }
    var cols = {};
    cols.contrato = idx(/contrato/, []);
    cols.tipo = idx(/tipo\s*de\s*servicio/, []);
    cols.agr = idx(/servicio\s*agrupado|agrupado/, [cols.tipo]);
    cols.seg = idx(/^segmento/, []);
    cols.rs = idx(/razon\s*social|^cliente/, []);
    cols.serv = idx(/^servicio$/, [cols.tipo, cols.agr]);
    if (cols.serv < 0) cols.serv = idx(/servicio/, [cols.tipo, cols.agr]);
    var faltan = [];
    if (cols.seg < 0) faltan.push("Segmento");
    if (cols.rs < 0) faltan.push("Razón Social");
    if (cols.serv < 0) faltan.push("Servicio");
    if (faltan.length) throw new Error("Faltan columnas: " + faltan.join(", ") + ". Columnas encontradas: " + (rows[iHead] || []).filter(function (x) { return norm(x); }).join(", ") + ".");
    /* "Tipo de Servicio" (D-017) y "Servicio Agrupado" (D-029) son opcionales: se completan con la base */
    var sinTipo = cols.tipo < 0, sinAgr = cols.agr < 0;
    var dimCols = [cols.seg, cols.rs, cols.tipo, cols.agr, cols.serv, cols.contrato].filter(function (c) { return c >= 0; });

    /* Meses: en la fila de encabezado o arriba (Power BI pone "Año, Mes" + meses en la fila 1) */
    var meses = [], colMes = [], maxCol = 0;
    for (var a = 0; a <= iHead; a++) maxCol = Math.max(maxCol, (rows[a] || []).length);
    for (var cc = 0; cc < maxCol; cc++) {
      if (dimCols.indexOf(cc) >= 0) continue;
      var k = null;
      for (var b = iHead; b >= 0 && !k; b--) k = parseMes((rows[b] || [])[cc]);
      if (k && meses.indexOf(k) < 0) { meses.push(k); colMes.push(cc); }
    }
    if (!meses.length) throw new Error("No encontré columnas de meses (ej. «Ene.-26»).");

    var dataRows = [], filtros = "";
    for (var j = iHead + 1; j < rows.length; j++) {
      var row = rows[j] || [];
      var txt = row.map(norm).filter(Boolean).join(" ");
      if (/^filtros aplicados/i.test(txt)) { filtros = txt.replace(/^filtros aplicados:?\s*/i, "").replace(/\s*[\r\n]+\s*/g, " · ").trim(); continue; }
      if (!txt) continue;
      dataRows.push(row);
    }
    /* Si la exportación deja en blanco las etiquetas repetidas, se completan hacia abajo */
    /* El tipo de servicio nunca viene vacío en una fila de dato: si falta en muchas, se completa hacia abajo */
    var colRef = sinTipo ? cols.serv : cols.tipo;
    var vaciosTipo = dataRows.filter(function (r) { return norm(r[colRef]) === ""; }).length;
    var fillDown = dataRows.length > 0 && vaciosTipo / dataRows.length > 0.2;

    var registros = [], totalGeneral = null, last = {};
    var dims = ["seg", "rs"].concat(sinTipo ? [] : ["tipo"], sinAgr ? [] : ["agr"], ["serv", "contrato"]);
    dataRows.forEach(function (row) {
      var esSub = dims.some(function (d) { return esTotal(row[cols[d]]); }) || esTotal(row[0]);
      if (esSub) {
        /* Total general: "Total" en la primera dimensión y el resto vacío */
        var resto = dims.filter(function (d) { return d !== "seg"; }).every(function (d) { return norm(row[cols[d]]) === ""; });
        if ((esTotal(row[cols.seg]) || esTotal(row[0])) && resto) { var t = 0; colMes.forEach(function (c) { t += num(row[c]); }); totalGeneral = t; }
        return;
      }
      var v = {};
      dims.forEach(function (d) { var x = norm(row[cols[d]]); if (fillDown && x === "") x = last[d] || ""; v[d] = x; });
      /* Filas con servicio y envíos pero sin segmento, razón social ni contrato: se conservan para que el total cuadre */
      if (!v.contrato) {
        var tot = 0; colMes.forEach(function (c) { tot += Math.abs(num(row[c])); });
        if (!v.serv || !tot) return;
        v.contrato = SIN_CON;
      }
      dims.forEach(function (d) { last[d] = v[d]; });
      registros.push({
        segmento: v.seg, cliente: v.rs, tipo: sinTipo ? NO_INF : v.tipo, agrupado: sinAgr ? "" : v.agr, servicio: v.serv, contrato: v.contrato.replace(/\.0+$/, ""),
        valores: colMes.map(function (c) { return num(row[c]); })
      });
    });
    var suma = 0; registros.forEach(function (r) { r.valores.forEach(function (x) { suma += x; }); });
    return { meses: meses, registros: registros, filtros: filtros, fillDown: fillDown, sinTipo: sinTipo, sinAgrupado: sinAgr,
      control: { totalGeneral: totalGeneral, sumaDetalle: suma, cuadra: totalGeneral == null ? null : Math.round(totalGeneral) === Math.round(suma) } };
  }

  /* ---------- CSV (separador ; , o tab) -> filas ---------- */
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, "");
    var primera = text.split(/\r?\n/)[0] || "";
    var sep = [";", "\t", ","].sort(function (x, y) { return primera.split(y).length - primera.split(x).length; })[0];
    var rows = [], row = [], cell = "", q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  /* ---------- XLSX (ZIP + DecompressionStream, sin librerías) -> filas de la primera hoja ---------- */
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function leerZip(buf) {
    var b = new Uint8Array(buf), eocd = -1;
    for (var i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("El archivo no es un .xlsx válido.");
    var n = u16(b, eocd + 10), off = u32(b, eocd + 16), files = {};
    for (var k = 0; k < n; k++) {
      if (u32(b, off) !== 0x02014b50) break;
      var metodo = u16(b, off + 10), csize = u32(b, off + 20), nlen = u16(b, off + 28), xlen = u16(b, off + 30), clen = u16(b, off + 32), loff = u32(b, off + 42);
      var nombre = new TextDecoder().decode(b.subarray(off + 46, off + 46 + nlen));
      var ldata = loff + 30 + u16(b, loff + 26) + u16(b, loff + 28);
      files[nombre] = { metodo: metodo, data: b.subarray(ldata, ldata + csize) };
      off += 46 + nlen + xlen + clen;
    }
    return files;
  }
  function inflar(f) {
    if (f.metodo === 0) return Promise.resolve(new TextDecoder().decode(f.data));
    if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("Tu navegador no soporta descompresión nativa. Usá Chrome o Edge actualizados."));
    var stream = new Blob([f.data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).text();
  }
  function xmlDecode(s) {
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (_, d) { return String.fromCodePoint(+d); }).replace(/&amp;/g, "&");
  }
  function textos(xml) { var out = "", re = /<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g, m; while ((m = re.exec(xml))) out += m[1]; return xmlDecode(out); }
  function colIndex(ref) { var m = /^([A-Z]+)/.exec(ref || ""); if (!m) return -1; var n = 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64); return n - 1; }
  function hojaAFilas(xml, shared) {
    var rows = [], reRow = /<(?:\w+:)?row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g, mr, rowNum = 0;
    while ((mr = reRow.exec(xml))) {
      var ra = /\br="(\d+)"/.exec(mr[1]); if (ra) rowNum = +ra[1] - 1;
      var row = [], col = 0, body = mr[2] || "";
      var reC = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g, mc;
      while ((mc = reC.exec(body))) {
        var at = mc[1], inner = mc[2] || "";
        var r = /\br="([A-Z]+\d+)"/.exec(at); if (r) col = colIndex(r[1]);
        var t = (/\bt="(\w+)"/.exec(at) || [])[1];
        var vm = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inner), val = "";
        if (t === "s") val = shared[+(vm ? vm[1] : -1)] || "";
        else if (t === "inlineStr") val = textos(inner);
        else if (t === "str" || t === "e") val = vm ? xmlDecode(vm[1]) : "";
        else if (t === "b") val = vm ? (vm[1] === "1") : "";
        else val = vm ? Number(vm[1]) : "";
        row[col] = val; col++;
      }
      for (var i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = "";
      rows[rowNum] = row; rowNum++;
    }
    for (var j = 0; j < rows.length; j++) if (!rows[j]) rows[j] = [];
    return rows;
  }
  function leerXLSX(buf) {
    var files;
    try { files = leerZip(buf); } catch (e) { return Promise.reject(e); }
    var hoja = Object.keys(files).filter(function (n) { return /^xl\/worksheets\/[^/]+\.xml$/i.test(n); }).sort()[0];
    if (!hoja) return Promise.reject(new Error("No encontré hojas dentro del .xlsx."));
    var ss = Object.keys(files).filter(function (n) { return /^xl\/sharedStrings\.xml$/i.test(n); })[0];
    var pShared = ss ? inflar(files[ss]).then(function (x) {
      var out = [], re = /<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g, m;
      while ((m = re.exec(x))) out.push(textos(m[1]));
      return out;
    }) : Promise.resolve([]);
    return Promise.all([pShared, inflar(files[hoja])]).then(function (r) { return hojaAFilas(r[1], r[0]); });
  }

  /* ---------- Servicio agrupado (D-029) ----------
     Cada tipo + servicio pertenece a un solo servicio agrupado. Si una descarga o un registro viejo de la base no lo trae, se completa con ese mapa. */
  function ts(r) { return r.tipo + "|" + r.servicio; }
  function mapaAgrupado(listas) {
    var vistos = {};
    listas.forEach(function (regs) { regs.forEach(function (r) { if (r.agrupado) (vistos[ts(r)] = vistos[ts(r)] || {})[r.agrupado] = 1; }); });
    var mapa = {};
    Object.keys(vistos).forEach(function (k) { var a = Object.keys(vistos[k]); if (a.length === 1) mapa[k] = a[0]; });
    return mapa;
  }
  /* Completa en el lugar los registros sin agrupado. Devuelve cuántos completó. */
  function rellenarAgrupado(regs, mapa) {
    var n = 0;
    regs.forEach(function (r) { if (!r.agrupado && mapa[ts(r)]) { r.agrupado = mapa[ts(r)]; n++; } });
    return n;
  }
  /* Si la descarga no trae "Servicio Agrupado", se toma de la base (mismo tipo + servicio). Devuelve una copia de parsed. */
  function completarAgrupado(base, parsed) {
    if (!parsed.sinAgrupado) return parsed;
    var mapa = mapaAgrupado([base.registros]), n = 0;
    var regs = parsed.registros.map(function (r) { var c = Object.assign({}, r); if (!c.agrupado && mapa[ts(c)]) { c.agrupado = mapa[ts(c)]; n++; } return c; });
    return Object.assign({}, parsed, { registros: regs, agrupadosDeducidos: n });
  }

  /* ---------- Base ---------- */
  function calcParcial(meses, hoy) { var u = meses[meses.length - 1]; return u && u >= mesActual(hoy) ? u : null; }
  function regBase(r, v) {
    var o = { segmento: r.segmento, cliente: r.cliente, tipo: r.tipo, servicio: r.servicio, contrato: r.contrato, v: v || {} };
    if (r.agrupado) o.agrupado = r.agrupado;
    return o;
  }
  function nuevaBase(parsed, fuente, hoy, archivo) {
    var regs = parsed.registros.map(function (r) {
      var v = {}; parsed.meses.forEach(function (m, i) { if (r.valores[i]) v[m] = r.valores[i]; });
      return regBase(r, v);
    });
    rellenarAgrupado(regs, mapaAgrupado([regs]));
    var b = { version: 1, fuente: fuente, filtros: parsed.filtros || "", meses: parsed.meses.slice().sort(), registros: regs, historial: [] };
    b.mesParcial = calcParcial(b.meses, hoy);
    b.actualizado = (hoy || new Date()).toISOString();
    b.historial.push({ fecha: b.actualizado, archivo: archivo || (fuente === "demo" ? "Datos sintéticos" : ""), accion: "Base inicial", nuevos: regs.length, cambios: 0, mesesNuevos: b.meses.slice(), total: totalBase(b) });
    return b;
  }

  /* Si la descarga no trae "Tipo de Servicio", se toma de la base (mismo contrato + servicio) o del servicio.
     Devuelve una copia de parsed; no modifica la base. */
  function completarTipo(base, parsed) {
    if (!parsed.sinTipo) return parsed;
    var porCS = {}, porServ = {};
    base.registros.forEach(function (r) {
      if (r.tipo === NO_INF) return;
      (porCS[r.contrato + "|" + r.servicio] = porCS[r.contrato + "|" + r.servicio] || {})[r.tipo] = 1;
      (porServ[r.servicio] = porServ[r.servicio] || {})[r.tipo] = 1;
    });
    var deducidos = 0;
    var regs = parsed.registros.map(function (r) {
      var c = Object.assign({}, r), a = Object.keys(porCS[r.contrato + "|" + r.servicio] || {}), b = Object.keys(porServ[r.servicio] || {});
      if (a.length === 1) c.tipo = a[0]; else if (b.length === 1) c.tipo = b[0];
      if (c.tipo !== NO_INF) deducidos++;
      return c;
    });
    return Object.assign({}, parsed, { registros: regs, tiposDeducidos: deducidos });
  }
  function completar(base, parsed) { return completarAgrupado(base, completarTipo(base, parsed)); }
  /* Busca el registro de la base para r. Si la base tiene el registro sin tipo y la descarga sí lo trae, también lo encuentra. */
  function buscar(idxBase, r) { return idxBase[clave(r)] || (r.tipo !== NO_INF ? idxBase[r.contrato + "|" + NO_INF + "|" + r.servicio] : null) || null; }

  /* Compara una descarga con la base (D-011). No modifica nada. */
  function diferencias(base, parsed) {
    parsed = completar(base, parsed);
    var idxBase = {}; base.registros.forEach(function (r) { idxBase[clave(r)] = r; });
    var mesesNuevos = parsed.meses.filter(function (m) { return base.meses.indexOf(m) < 0; });
    var nuevos = [], cambios = [], dup = 0, vistos = {}, agrNuevo = {};
    parsed.registros.forEach(function (r) {
      var k = clave(r);
      if (vistos[k]) { dup++; return; } vistos[k] = 1;
      var b = buscar(idxBase, r);
      if (!b) { nuevos.push(r); return; }
      vistos[clave(b)] = 1;
      if (r.agrupado && !b.agrupado) agrNuevo[clave(b)] = 1;
      parsed.meses.forEach(function (m, i) {
        var nv = r.valores[i] || 0, ov = b.v[m] || 0;
        if (base.meses.indexOf(m) >= 0 && nv !== ov) cambios.push({ contrato: r.contrato, cliente: r.cliente || b.cliente, servicio: r.servicio, mes: m, antes: ov, despues: nv });
      });
    });
    /* Registros de la base sin servicio agrupado que lo reciben (por la descarga o por tipo + servicio) */
    var mapa = mapaAgrupado([parsed.registros, base.registros]);
    base.registros.forEach(function (r) { if (!r.agrupado && mapa[ts(r)]) agrNuevo[clave(r)] = 1; });
    var ausentes = base.registros.filter(function (r) { return !vistos[clave(r)]; }).length;
    var filtrosDistintos = !!(base.filtros && parsed.filtros && normFiltros(base.filtros) !== normFiltros(parsed.filtros));
    return { nuevos: nuevos, cambios: cambios, mesesNuevos: mesesNuevos, ausentes: ausentes, duplicados: dup, filtrosDistintos: filtrosDistintos, control: parsed.control,
      registrosDescarga: parsed.registros.length, sinTipo: !!parsed.sinTipo, tiposDeducidos: parsed.tiposDeducidos || 0,
      sinAgrupado: !!parsed.sinAgrupado, agrupadosDeducidos: parsed.agrupadosDeducidos || 0, agrupadosCompletados: Object.keys(agrNuevo).length };
  }
  /* Compara filtros ignorando el orden, los separadores y los «Parámetro_…» de Power BI (son de visualización, no filtran datos) */
  function normFiltros(s) { return sinAcentos(s).split(/\s*·\s*/).map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^parametro_/.test(x); }).sort().join("|"); }

  /* Aplica la descarga (D-011): agrega nuevos, reemplaza meses existentes, conserva lo ausente. */
  function fusionar(base, parsed, archivo, hoy) {
    var d = diferencias(base, parsed);
    parsed = completar(base, parsed);
    var idx = {}; base.registros.forEach(function (r) { idx[clave(r)] = r; });
    parsed.registros.forEach(function (r) {
      var b = buscar(idx, r);
      if (!b) { b = regBase(r); idx[clave(b)] = b; base.registros.push(b); }
      else {
        if (r.segmento) b.segmento = r.segmento; if (r.cliente) b.cliente = r.cliente; if (r.agrupado) b.agrupado = r.agrupado;
        if (b.tipo === NO_INF && r.tipo !== NO_INF) {
          /* Cambia la clave: se mueve también la marca de migración */
          var viejo = clave(b), mk = migracion(base).marcas;
          delete idx[viejo]; b.tipo = r.tipo; idx[clave(b)] = b;
          if (mk[viejo]) { mk[clave(b)] = mk[viejo]; delete mk[viejo]; }
        }
      }
      parsed.meses.forEach(function (m, i) { var x = r.valores[i] || 0; if (x) b.v[m] = x; else delete b.v[m]; });
    });
    /* Registros que no vinieron en la descarga: toman el agrupado por tipo + servicio */
    rellenarAgrupado(base.registros, mapaAgrupado([base.registros]));
    d.mesesNuevos.forEach(function (m) { base.meses.push(m); });
    base.meses.sort();
    if (parsed.filtros && !base.filtros) base.filtros = parsed.filtros;
    base.mesParcial = calcParcial(base.meses, hoy);
    base.actualizado = (hoy || new Date()).toISOString();
    base.historial = base.historial || [];
    base.historial.push({ fecha: base.actualizado, archivo: archivo || "", accion: "Actualización", nuevos: d.nuevos.length, cambios: d.cambios.length, mesesNuevos: d.mesesNuevos.slice(), total: totalBase(base) });
    return d;
  }
  function totalBase(base) { var t = 0; base.registros.forEach(function (r) { for (var m in r.v) t += r.v[m]; }); return t; }

  /* ---------- Análisis ---------- */
  function segDe(r) { return r.segmento || SIN_SEG; }
  function cliDe(r) { return r.cliente || SIN_RS; }
  function agrDe(r) { return r.agrupado || AGR_NO; }
  function sumaMeses(r, meses) { var t = 0; for (var i = 0; i < meses.length; i++) t += r.v[meses[i]] || 0; return t; }
  function completos(base) { return base.meses.filter(function (m) { return m !== base.mesParcial; }); }

  /* Jerarquía de la información (D-029, modelo A): SEGMENTO > RAZÓN SOCIAL > TIPO DE SERVICIO > SERVICIO AGRUPADO > SERVICIO > N° CONTRATO */
  var NIVELES = [
    { id: "segmentos", nombre: "Segmento", valor: function (r) { return segDe(r); } },
    { id: "clientes", nombre: "Razón social", valor: function (r) { return cliDe(r); } },
    { id: "tipos", nombre: "Tipo de servicio", valor: function (r) { return r.tipo; } },
    { id: "agrupados", nombre: "Servicio agrupado", valor: function (r) { return agrDe(r); } },
    { id: "servicios", nombre: "Servicio", valor: function (r) { return r.servicio; } },
    { id: "contratos", nombre: "N° contrato", valor: function (r) { return r.contrato; } }
  ];
  function ok(arr, v) { return !arr || !arr.length || arr.indexOf(v) >= 0; }
  /* Aplica los filtros de los niveles 0..hasta-1 (hasta = NIVELES.length aplica todos) */
  function pasaNiveles(r, f, hasta) {
    for (var i = 0; i < hasta; i++) if (!ok(f[NIVELES[i].id], NIVELES[i].valor(r))) return false;
    return true;
  }
  /* f: { segmentos:[], clientes:[], tipos:[], agrupados:[], servicios:[], contratos:[], texto:"" } (vacío = todos). Los meses se aplican al sumar. */
  function filtrar(base, f) {
    var txt = sinAcentos(f.texto || "");
    return base.registros.filter(function (r) {
      if (!pasaNiveles(r, f, NIVELES.length)) return false;
      if (txt && sinAcentos(r.cliente).indexOf(txt) < 0 && r.contrato.indexOf(txt) < 0) return false;
      return true;
    });
  }
  /* Opciones de un nivel en cascada: solo valores compatibles con lo elegido en los niveles de arriba. Ordenadas por envíos. */
  function opciones(base, f, nivel, meses) {
    var map = {}, N = NIVELES[nivel];
    base.registros.forEach(function (r) {
      if (!pasaNiveles(r, f, nivel)) return;
      var k = N.valor(r); map[k] = (map[k] || 0) + sumaMeses(r, meses);
    });
    return Object.keys(map).map(function (k) { return { valor: k, envios: map[k] }; })
      .sort(function (a, b) { return b.envios - a.envios || a.valor.localeCompare(b.valor, "es"); });
  }
  /* Quita selecciones de niveles inferiores que ya no son compatibles con los superiores. Devuelve cuántas quitó. */
  function podar(base, f) {
    var quitadas = 0;
    for (var i = 1; i < NIVELES.length; i++) {
      var id = NIVELES[i].id; if (!f[id] || !f[id].length) continue;
      var validos = {}; opciones(base, f, i, []).forEach(function (o) { validos[o.valor] = 1; });
      var antes = f[id].length; f[id] = f[id].filter(function (v) { return validos[v]; }); quitadas += antes - f[id].length;
    }
    return quitadas;
  }
  /* Agrupa registros por un nivel de la jerarquía (para el explorador) */
  function grupoNivel(regs, nivel, meses, mesRef) {
    var map = {}, N = NIVELES[nivel];
    regs.forEach(function (r) {
      var k = N.valor(r), g = map[k] || (map[k] = { clave: k, envios: 0, ref: 0, regs: [], cli: {}, con: {} });
      var t = sumaMeses(r, meses); g.envios += t; g.ref += mesRef ? (r.v[mesRef] || 0) : 0; g.regs.push(r);
      if (r.cliente) g.cli[r.cliente] = 1; if (r.contrato !== SIN_CON) g.con[r.contrato] = 1;
    });
    return Object.keys(map).map(function (k) { var g = map[k]; return { clave: k, envios: g.envios, ref: g.ref, regs: g.regs, clientes: Object.keys(g.cli).length, contratos: Object.keys(g.con).length }; })
      .sort(function (a, b) { return b.envios - a.envios || a.clave.localeCompare(b.clave, "es"); });
  }
  /* Orden jerárquico para el detalle */
  function compararJer(a, b) {
    for (var i = 0; i < NIVELES.length; i++) { var x = NIVELES[i].valor(a), y = NIVELES[i].valor(b); if (x !== y) return x.localeCompare(y, "es"); }
    return 0;
  }

  /* ---------- Migración a DMS (D-020) ----------
     Unidad mínima = registro (contrato + tipo + servicio). Marcar un nodo de la jerarquía marca todos sus registros.
     base.migracion = { marcas: { clave: "AAAA-MM-DD" }, historial: [...] } */
  function migracion(base) { return base.migracion || (base.migracion = { marcas: {}, historial: [] }); }
  function esMigrado(base, r) { return !!migracion(base).marcas[clave(r)]; }
  /* Marca (valor=true) o desmarca registros. Devuelve los cambios para poder deshacer. */
  function marcarMigrado(base, regs, valor, fecha, desc) {
    var mg = migracion(base), cambios = [];
    regs.forEach(function (r) {
      var k = clave(r), antes = mg.marcas[k] || null;
      if (valor ? !antes : !!antes) { cambios.push({ k: k, antes: antes }); if (valor) mg.marcas[k] = fecha; else delete mg.marcas[k]; }
    });
    if (cambios.length) mg.historial.push({ fecha: new Date().toISOString(), accion: valor ? "Marcado como migrado" : "Desmarcado", registros: cambios.length, desc: desc || "" });
    return cambios;
  }
  function deshacerMigrado(base, cambios, desc) {
    var mg = migracion(base);
    cambios.forEach(function (c) { if (c.antes) mg.marcas[c.k] = c.antes; else delete mg.marcas[c.k]; });
    mg.historial.push({ fecha: new Date().toISOString(), accion: "Deshecho", registros: cambios.length, desc: desc || "" });
  }
  /* Resumen de avance sobre un conjunto de registros */
  function resumenMigracion(base, regs, meses, mesRef) {
    var mk = migracion(base).marcas, o = { registros: 0, registrosMigrados: 0, envios: 0, enviosMigrados: 0, ref: 0, refMigrado: 0 }, con = {}, cli = {};
    regs.forEach(function (r) {
      var m = !!mk[clave(r)], e = sumaMeses(r, meses), x = mesRef ? (r.v[mesRef] || 0) : 0;
      o.registros++; o.envios += e; o.ref += x;
      if (m) { o.registrosMigrados++; o.enviosMigrados += e; o.refMigrado += x; }
      if (r.contrato !== SIN_CON) { var c = con[r.contrato] || (con[r.contrato] = { t: 0, m: 0 }); c.t++; if (m) c.m++; }
      if (r.cliente) { var d = cli[r.cliente] || (cli[r.cliente] = { t: 0, m: 0 }); d.t++; if (m) d.m++; }
    });
    function cuenta(map) { var x = { total: 0, completos: 0, parciales: 0 }; Object.keys(map).forEach(function (k) { var g = map[k]; x.total++; if (g.m === g.t) x.completos++; else if (g.m) x.parciales++; }); return x; }
    o.contratos = cuenta(con); o.clientes = cuenta(cli);
    o.estado = !o.registrosMigrados ? "pendiente" : o.registrosMigrados === o.registros ? "migrado" : "parcial";
    return o;
  }
  /* Lista de contratos desde un archivo (CSV/XLSX): columna que contenga "contrato" o cualquier número de 6 a 12 dígitos */
  function contratosDesdeFilas(rows) {
    var col = -1, desde = 0;
    for (var i = 0; i < Math.min(rows.length, 10) && col < 0; i++) {
      var r = rows[i] || [];
      for (var c = 0; c < r.length; c++) if (/contrato/.test(sinAcentos(r[c]))) { col = c; desde = i + 1; break; }
    }
    var set = {};
    rows.slice(desde).forEach(function (row) {
      (col >= 0 ? [(row || [])[col]] : (row || [])).forEach(function (v) { var s = norm(v).replace(/\.0+$/, ""); if (/^\d{6,12}$/.test(s)) set[s] = 1; });
    });
    return Object.keys(set);
  }

  function agrupar(regs, keyFn, meses) {
    var map = {};
    regs.forEach(function (r) {
      var k = keyFn(r), g = map[k] || (map[k] = { clave: k, envios: 0, contratos: {}, clientes: {}, servicios: {} });
      var t = sumaMeses(r, meses);
      g.envios += t; if (r.contrato !== SIN_CON) g.contratos[r.contrato] = 1; g.servicios[r.servicio] = 1;
      if (t > 0) g.clientes[cliDe(r)] = 1;
    });
    return Object.keys(map).map(function (k) {
      var g = map[k];
      return { clave: k, envios: g.envios, contratos: Object.keys(g.contratos).length, clientes: Object.keys(g.clientes).length, servicios: Object.keys(g.servicios).length };
    });
  }

  function kpis(base, regs, mesesSel) {
    var meses = mesesSel && mesesSel.length ? base.meses.filter(function (m) { return mesesSel.indexOf(m) >= 0; }) : base.meses.slice();
    var comp = meses.filter(function (m) { return m !== base.mesParcial; });
    var total = 0, porMes = {}, contratos = {}, clientes = {}, servicios = {}, segmentos = {}, agrupados = {};
    meses.forEach(function (m) { porMes[m] = 0; });
    regs.forEach(function (r) {
      var t = 0; meses.forEach(function (m) { var x = r.v[m] || 0; porMes[m] += x; t += x; });
      total += t;
      if (t > 0) { if (r.contrato !== SIN_CON) contratos[r.contrato] = 1; if (r.cliente) clientes[r.cliente] = 1; servicios[r.servicio] = 1; segmentos[segDe(r)] = 1; agrupados[agrDe(r)] = 1; }
    });
    var ultimo = comp[comp.length - 1] || null, previo = comp[comp.length - 2] || null;
    var activos = {};
    if (ultimo) regs.forEach(function (r) { if ((r.v[ultimo] || 0) > 0 && r.contrato !== SIN_CON) activos[r.contrato] = 1; });
    var sumComp = 0; comp.forEach(function (m) { sumComp += porMes[m]; });
    var porCli = agrupar(regs.filter(function (r) { return r.cliente && !esInterno(r.cliente); }), cliDe, meses).sort(function (a, b) { return b.envios - a.envios; });
    var top10 = 0; porCli.slice(0, 10).forEach(function (c) { top10 += c.envios; });
    var nContratos = Object.keys(contratos).length;
    return {
      meses: meses, completos: comp, porMes: porMes, envios: total,
      clientes: Object.keys(clientes).length, contratos: nContratos, contratosActivos: Object.keys(activos).length,
      promedioMensual: comp.length ? sumComp / comp.length : 0,
      enviosPorContrato: nContratos ? total / nContratos : 0,
      mesUltimo: ultimo, mesPrevio: previo,
      variacion: ultimo && previo && porMes[previo] ? (porMes[ultimo] - porMes[previo]) / porMes[previo] : null,
      concentracionTop10: total ? top10 / total : 0,
      clientesNuevos: clientesNuevos(base, regs).length,
      servicios: Object.keys(servicios).length, segmentos: Object.keys(segmentos).length, agrupados: Object.keys(agrupados).length
    };
  }

  function clientesNuevos(base, regs) {
    var first = {}, tot = {}, m0 = base.meses[0];
    regs.forEach(function (r) {
      if (!r.cliente) return;
      tot[r.cliente] = (tot[r.cliente] || 0) + sumaMeses(r, base.meses);
      for (var i = 0; i < base.meses.length; i++) {
        if ((r.v[base.meses[i]] || 0) > 0) { if (!first[r.cliente] || base.meses[i] < first[r.cliente]) first[r.cliente] = base.meses[i]; break; }
      }
    });
    return Object.keys(first).filter(function (c) { return first[c] > m0; })
      .map(function (c) { return { clave: c, mes: first[c], envios: tot[c] }; })
      .sort(function (a, b) { return a.mes < b.mes ? 1 : a.mes > b.mes ? -1 : b.envios - a.envios; });
  }

  /* Últimos 3 meses completos vs 3 anteriores, por cliente (D-013: sin el mes parcial) */
  function tendencia(base, regs) {
    var comp = completos(base);
    if (comp.length < 2) return { ventana: null, filas: [] };
    var n = Math.min(3, Math.floor(comp.length / 2));
    var rec = comp.slice(-n), ant = comp.slice(-2 * n, -n);
    var map = {};
    regs.forEach(function (r) {
      if (!r.cliente) return;
      var g = map[r.cliente] || (map[r.cliente] = { clave: r.cliente, reciente: 0, anterior: 0 });
      g.reciente += sumaMeses(r, rec); g.anterior += sumaMeses(r, ant);
    });
    var filas = Object.keys(map).map(function (k) { var g = map[k]; g.dif = g.reciente - g.anterior; g.pct = g.anterior ? g.dif / g.anterior : null; return g; });
    return { ventana: { reciente: rec, anterior: ant }, filas: filas };
  }

  /* Contratos con envíos antes y 0 en los últimos 3 meses completos */
  function sinActividad(base, regs) {
    var comp = completos(base);
    if (comp.length < 4) return { meses: [], filas: [] };
    var rec = comp.slice(-3), antes = base.meses.filter(function (m) { return m < rec[0]; });
    var porC = {};
    regs.forEach(function (r) {
      if (r.contrato === SIN_CON) return;
      var g = porC[r.contrato] || (porC[r.contrato] = { contrato: r.contrato, cliente: cliDe(r), servicios: {}, rec: 0, antes: 0, ultimo: null });
      g.servicios[r.servicio] = 1; g.rec += sumaMeses(r, rec); g.antes += sumaMeses(r, antes);
      antes.forEach(function (m) { if ((r.v[m] || 0) > 0 && (!g.ultimo || m > g.ultimo)) g.ultimo = m; });
    });
    var filas = Object.keys(porC).map(function (k) { return porC[k]; }).filter(function (g) { return g.rec === 0 && g.antes > 0; })
      .map(function (g) { return { contrato: g.contrato, cliente: g.cliente, servicios: Object.keys(g.servicios).join(", "), ultimo: g.ultimo, envios: g.antes }; })
      .sort(function (a, b) { return b.envios - a.envios; });
    return { meses: rec, filas: filas };
  }

  function calidad(base) {
    var sinSeg = {}, sinSegEnv = 0, sinServ = {}, formato = {}, contratoServ = {}, negativos = 0, claves = {}, dup = 0, sinCon = 0, sinConEnv = 0, sinTipo = 0;
    var sinAgr = 0, conAgr = 0, agrPorTS = {};
    base.registros.forEach(function (r) {
      var t = 0; for (var m in r.v) { t += r.v[m]; if (r.v[m] < 0) negativos++; }
      if (r.tipo === NO_INF) sinTipo++;
      if (r.agrupado) { conAgr++; (agrPorTS[ts(r)] = agrPorTS[ts(r)] || {})[r.agrupado] = 1; } else sinAgr++;
      if (r.contrato === SIN_CON) { sinCon++; sinConEnv += t; return; }
      if (!r.segmento || !r.cliente) { sinSeg[r.contrato] = 1; sinSegEnv += t; }
      if (/sin servicio/i.test(r.tipo) || /sin servicio/i.test(r.servicio)) sinServ[r.contrato] = 1;
      if (!/^\d{9}$/.test(r.contrato)) formato[r.contrato] = 1;
      (contratoServ[r.contrato] = contratoServ[r.contrato] || {})[r.tipo + "|" + r.servicio] = 1;
      var k = clave(r); if (claves[k]) dup++; claves[k] = 1;
    });
    var multi = Object.keys(contratoServ).filter(function (c) { return Object.keys(contratoServ[c]).length > 1; });
    var agrConflicto = Object.keys(agrPorTS).filter(function (k) { return Object.keys(agrPorTS[k]).length > 1; });
    return [
      { id: "sinseg", nivel: "error", titulo: "Contratos sin segmento o razón social", cantidad: Object.keys(sinSeg).length, extra: sinSegEnv, extraTxt: "envíos afectados", ejemplos: Object.keys(sinSeg).slice(0, 5) },
      { id: "sinserv", nivel: "warning", titulo: "Contratos con «Sin servicio asignado»", cantidad: Object.keys(sinServ).length, ejemplos: Object.keys(sinServ).slice(0, 5) },
      { id: "multi", nivel: "info", titulo: "Contratos en más de un servicio", cantidad: multi.length, ejemplos: multi.slice(0, 5), nota: "No es un error: por eso la clave es contrato + tipo + servicio." },
      { id: "formato", nivel: "warning", titulo: "Contratos con formato distinto a 9 dígitos", cantidad: Object.keys(formato).length, ejemplos: Object.keys(formato).slice(0, 5) },
      { id: "sincon", nivel: "error", titulo: "Filas sin contrato (solo servicio)", cantidad: sinCon, extra: sinConEnv, extraTxt: "envíos sin segmento, razón social ni contrato" },
      { id: "dup", nivel: "error", titulo: "Registros duplicados (misma clave)", cantidad: dup },
      { id: "neg", nivel: "error", titulo: "Valores negativos", cantidad: negativos }
    ].concat(sinTipo ? [{ id: "sintipo", nivel: "info", titulo: "Registros sin tipo de servicio", cantidad: sinTipo, nota: "La descarga no trae la columna «Tipo de Servicio». Se completa sola si una descarga posterior la incluye." }] : [])
      .concat(sinAgr ? [{ id: "sinagr", nivel: conAgr ? "warning" : "info", titulo: "Registros sin servicio agrupado", cantidad: sinAgr, nota: conAgr ? "Su tipo + servicio no figura en ninguna descarga con «Servicio Agrupado»." : "La base todavía no tiene «Servicio Agrupado». Se completa al cargar una descarga que lo incluya." }] : [])
      .concat(conAgr ? [{ id: "agrconf", nivel: "warning", titulo: "Tipo + servicio en más de un servicio agrupado", cantidad: agrConflicto.length, ejemplos: agrConflicto.slice(0, 5).map(function (k) { return k.replace("|", " › "); }) }] : []);
  }

  /* ---------- Datos sintéticos (pruebas). Nombres y contratos inventados. ---------- */
  function demo(hoy) {
    var seed = 20261029;
    function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    var segs = ["FASHION", "RETAIL", "MARKETPLACE", "CONTADO", "FINANCIERO", "TECNOLOGIA", "SALUD", "HOGAR", "DEPORTES", "COSMETICA", "LIBRERIA", "ALIMENTOS", "AUTOMOTOR", "JUGUETERIA", "MASCOTAS", "OPTICA"];
    var tipos = [["(2) PAQUETERIA", 0.62], ["(1) SOBRES", 0.24], ["(3) LOGISTICA INVERSA", 0.14]];
    var serv = {
      "(2) PAQUETERIA": ["Estándar a domicilio", "Urgente a domicilio", "Retiro en sucursal", "Mismo día", "Próximo día", "Pesados", "Estándar a sucursal", "Express AMBA", "Interior estándar", "Punto de retiro"],
      "(1) SOBRES": ["Sobre simple", "Sobre con acuse", "Carta documento", "Sobre certificado", "Tarjetas"],
      "(3) LOGISTICA INVERSA": ["Cambio en domicilio", "Devolución en sucursal", "Retiro de equipos", "Logística inversa estándar"]
    };
    /* Servicio agrupado sintético: cada tipo + servicio cae en un solo agrupado */
    function agrDemo(tipo, sv) {
      if (/PAQUET/.test(tipo)) return sv === "Pesados" ? "(2.5) Paquetes grandes" : /sucursal|retiro/i.test(sv) ? "(2.7) Retiro y sucursal" : "(2.1) Paquetes chicos";
      if (/SOBRES/.test(tipo)) return sv === "Tarjetas" ? "(1.4) Tarjetas" : "(1.1) Sobres y cartas";
      return "(3.1) Logística inversa";
    }
    var pref = ["NIMBUS", "ATLAS", "CEIBO", "PAMPA", "DELTA", "ANDES", "LUMEN", "AUSTRAL", "FARO", "QUEBRACHO", "TANDIL", "RUTA", "VERTICE", "BRISA", "PATAGON", "LITORAL", "NORTE", "CARDON", "ZONDA", "ACONCAGUA"];
    var suf = ["COMERCIO", "TIENDA", "MARKET", "MODA", "DIGITAL", "HOGAR", "SALUD", "STORE", "GROUP", "DISTRIBUIDORA", "ONLINE", "EXPRESS"];
    var soc = ["S.A.", "S.R.L.", "S.A.S."];
    var meses = []; for (var i = 1; i <= 10; i++) meses.push("2026-" + ("0" + i).slice(-2));
    var registros = [], usados = {}, contratosUsados = {};
    for (var c = 0; c < 180; c++) {
      var nombre; do { nombre = "DEMO " + pick(pref) + " " + pick(suf) + " " + pick(soc); } while (usados[nombre]); usados[nombre] = 1;
      var seg = pick(segs);
      var escala = Math.pow(rnd(), 3.2) * 90000 + 120; if (c < 3) escala *= 6 + c * 3;
      var inicio = rnd() < 0.18 ? 1 + Math.floor(rnd() * 8) : 0;
      var tend = (rnd() - 0.45) * 0.08;
      var nCon = 1 + Math.floor(Math.pow(rnd(), 2.5) * (c < 10 ? 28 : 9));
      for (var k = 0; k < nCon; k++) {
        var contrato; do { contrato = String(pick([40, 30, 10])) + String(1000000 + Math.floor(rnd() * 8999999)); } while (contratosUsados[contrato]); contratosUsados[contrato] = 1;
        var nServ = rnd() < 0.08 ? 2 : 1, servUsados = {};
        for (var s = 0; s < nServ; s++) {
          var x = rnd(), acc = 0, tipo = tipos[0][0];
          for (var t = 0; t < tipos.length; t++) { acc += tipos[t][1]; if (x <= acc) { tipo = tipos[t][0]; break; } }
          var sv = pick(serv[tipo]); if (servUsados[tipo + sv]) continue; servUsados[tipo + sv] = 1;
          var r = { segmento: seg, cliente: nombre, tipo: tipo, agrupado: agrDemo(tipo, sv), servicio: sv, contrato: contrato, valores: [] };
          var peso = escala / nCon * (0.4 + rnd() * 1.2), muerto = rnd() < 0.05 ? 5 + Math.floor(rnd() * 3) : 99;
          for (var mi = 0; mi < meses.length; mi++) {
            var v = mi < inicio || mi >= muerto ? 0 : Math.round(peso * (1 + tend * mi) * (0.85 + rnd() * 0.3) * (mi === 9 ? 0.93 : 1));
            r.valores.push(Math.max(0, v));
          }
          registros.push(r);
        }
      }
    }
    /* Casos de calidad para que el panel tenga contenido */
    for (var q = 0; q < 6; q++) registros.push({ segmento: "", cliente: "", tipo: "(2) PAQUETERIA", agrupado: agrDemo("(2) PAQUETERIA", "Estándar a domicilio"), servicio: "Estándar a domicilio", contrato: "40" + (5550000 + q * 11), valores: meses.map(function () { return Math.round(rnd() * 400); }) });
    registros.push({ segmento: registros[5].segmento, cliente: registros[5].cliente, tipo: "Sin servicio asignado", agrupado: "Sin servicio asignado", servicio: "Sin servicio asignado", contrato: "309990001", valores: meses.map(function () { return Math.round(rnd() * 90); }) });
    registros.push({ segmento: registros[8].segmento, cliente: registros[8].cliente, tipo: "(1) SOBRES", agrupado: agrDemo("(1) SOBRES", "Sobre simple"), servicio: "Sobre simple", contrato: "4012345", valores: meses.map(function () { return Math.round(rnd() * 150); }) });
    var parsed = { meses: meses, registros: registros, filtros: "canal es B2C · monetizacion es Facturables · ANIO es 2026 (DATOS SINTÉTICOS)" };
    return nuevaBase(parsed, "demo", hoy || new Date(2026, 9, 29), "Datos sintéticos");
  }

  return {
    parseMes: parseMes, mesTxt: mesTxt, mesActual: mesActual, num: num, parseCSV: parseCSV, leerXLSX: leerXLSX, hojaAFilas: hojaAFilas,
    desdeFilas: desdeFilas, nuevaBase: nuevaBase, diferencias: diferencias, fusionar: fusionar, totalBase: totalBase,
    filtrar: filtrar, agrupar: agrupar, kpis: kpis, tendencia: tendencia, sinActividad: sinActividad, clientesNuevos: clientesNuevos,
    calidad: calidad, completos: completos, sumaMeses: sumaMeses, segDe: segDe, cliDe: cliDe, agrDe: agrDe, clave: clave, sinAcentos: sinAcentos, demo: demo,
    completarTipo: completarTipo, completarAgrupado: completarAgrupado, mapaAgrupado: mapaAgrupado, esInterno: esInterno, INTERNOS: INTERNOS,
    NIVELES: NIVELES, opciones: opciones, podar: podar, grupoNivel: grupoNivel, compararJer: compararJer,
    migracion: migracion, esMigrado: esMigrado, marcarMigrado: marcarMigrado, deshacerMigrado: deshacerMigrado,
    resumenMigracion: resumenMigracion, contratosDesdeFilas: contratosDesdeFilas,
    SIN_RS: SIN_RS, SIN_SEG: SIN_SEG, NO_INF: NO_INF, AGR_NO: AGR_NO, SIN_CON: SIN_CON
  };
})();
if (typeof module !== "undefined" && module.exports) module.exports = MATRIZ;
/* ==LIB-END== */
