/* ==LIB-START== Lógica pura de la Matriz de Envíos (sin DOM). Se testea en Node. */
var MATRIZ = (function () {
  "use strict";

  var MESES_ES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
  var MESES_TXT = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  var SIN_RS = "(Sin razón social)";
  var SIN_SEG = "(Sin segmento)";
  var NO_INF = "(Tipo no informado)";
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
    cols.seg = idx(/^segmento/, []);
    cols.rs = idx(/razon\s*social|^cliente/, []);
    cols.serv = idx(/^servicio$/, [cols.tipo]);
    if (cols.serv < 0) cols.serv = idx(/servicio/, [cols.tipo]);
    var faltan = [];
    if (cols.seg < 0) faltan.push("Segmento");
    if (cols.rs < 0) faltan.push("Razón Social");
    if (cols.serv < 0) faltan.push("Servicio");
    if (faltan.length) throw new Error("Faltan columnas: " + faltan.join(", ") + ". Columnas encontradas: " + (rows[iHead] || []).filter(function (x) { return norm(x); }).join(", ") + ".");
    /* "Tipo de Servicio" es opcional: algunas descargas no la traen (se completa con la base, ver completarTipo) */
    var sinTipo = cols.tipo < 0;
    var dimCols = [cols.seg, cols.rs, cols.tipo, cols.serv, cols.contrato].filter(function (c) { return c >= 0; });

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
    var dims = sinTipo ? ["seg", "rs", "serv", "contrato"] : ["seg", "rs", "tipo", "serv", "contrato"];
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
        segmento: v.seg, cliente: v.rs, tipo: sinTipo ? NO_INF : v.tipo, servicio: v.serv, contrato: v.contrato.replace(/\.0+$/, ""),
        valores: colMes.map(function (c) { return num(row[c]); })
      });
    });
    var suma = 0; registros.forEach(function (r) { r.valores.forEach(function (x) { suma += x; }); });
    return { meses: meses, registros: registros, filtros: filtros, fillDown: fillDown, sinTipo: sinTipo,
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

  /* ---------- Base ---------- */
  function calcParcial(meses, hoy) { var u = meses[meses.length - 1]; return u && u >= mesActual(hoy) ? u : null; }
  function nuevaBase(parsed, fuente, hoy, archivo) {
    var regs = parsed.registros.map(function (r) {
      var v = {}; parsed.meses.forEach(function (m, i) { if (r.valores[i]) v[m] = r.valores[i]; });
      return { segmento: r.segmento, cliente: r.cliente, tipo: r.tipo, servicio: r.servicio, contrato: r.contrato, v: v };
    });
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
  /* Busca el registro de la base para r. Si la base tiene el registro sin tipo y la descarga sí lo trae, también lo encuentra. */
  function buscar(idxBase, r) { return idxBase[clave(r)] || (r.tipo !== NO_INF ? idxBase[r.contrato + "|" + NO_INF + "|" + r.servicio] : null) || null; }

  /* Compara una descarga con la base (D-011). No modifica nada. */
  function diferencias(base, parsed) {
    parsed = completarTipo(base, parsed);
    var idxBase = {}; base.registros.forEach(function (r) { idxBase[clave(r)] = r; });
    var mesesNuevos = parsed.meses.filter(function (m) { return base.meses.indexOf(m) < 0; });
    var nuevos = [], cambios = [], dup = 0, vistos = {};
    parsed.registros.forEach(function (r) {
      var k = clave(r);
      if (vistos[k]) { dup++; return; } vistos[k] = 1;
      var b = buscar(idxBase, r);
      if (!b) { nuevos.push(r); return; }
      vistos[clave(b)] = 1;
      parsed.meses.forEach(function (m, i) {
        var nv = r.valores[i] || 0, ov = b.v[m] || 0;
        if (base.meses.indexOf(m) >= 0 && nv !== ov) cambios.push({ contrato: r.contrato, cliente: r.cliente || b.cliente, servicio: r.servicio, mes: m, antes: ov, despues: nv });
      });
    });
    var ausentes = base.registros.filter(function (r) { return !vistos[clave(r)]; }).length;
    var filtrosDistintos = !!(base.filtros && parsed.filtros && normFiltros(base.filtros) !== normFiltros(parsed.filtros));
    return { nuevos: nuevos, cambios: cambios, mesesNuevos: mesesNuevos, ausentes: ausentes, duplicados: dup, filtrosDistintos: filtrosDistintos, control: parsed.control,
      registrosDescarga: parsed.registros.length, sinTipo: !!parsed.sinTipo, tiposDeducidos: parsed.tiposDeducidos || 0 };
  }
  /* Compara filtros ignorando el orden y los separadores */
  function normFiltros(s) { return sinAcentos(s).split(/\s*·\s*/).map(function (x) { return x.trim(); }).filter(Boolean).sort().join("|"); }

  /* Aplica la descarga (D-011): agrega nuevos, reemplaza meses existentes, conserva lo ausente. */
  function fusionar(base, parsed, archivo, hoy) {
    var d = diferencias(base, parsed);
    parsed = completarTipo(base, parsed);
    var idx = {}; base.registros.forEach(function (r) { idx[clave(r)] = r; });
    parsed.registros.forEach(function (r) {
      var b = buscar(idx, r);
      if (!b) { b = { segmento: r.segmento, cliente: r.cliente, tipo: r.tipo, servicio: r.servicio, contrato: r.contrato, v: {} }; idx[clave(b)] = b; base.registros.push(b); }
      else {
        if (r.segmento) b.segmento = r.segmento; if (r.cliente) b.cliente = r.cliente;
        if (b.tipo === NO_INF && r.tipo !== NO_INF) { delete idx[clave(b)]; b.tipo = r.tipo; idx[clave(b)] = b; }
      }
      parsed.meses.forEach(function (m, i) { var x = r.valores[i] || 0; if (x) b.v[m] = x; else delete b.v[m]; });
    });
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
  function sumaMeses(r, meses) { var t = 0; for (var i = 0; i < meses.length; i++) t += r.v[meses[i]] || 0; return t; }
  function completos(base) { return base.meses.filter(function (m) { return m !== base.mesParcial; }); }

  /* f: { tipos:[], segmentos:[], servicios:[], texto:"", cliente:"" } (vacío = todos). Los meses se aplican al sumar. */
  function filtrar(base, f) {
    var txt = sinAcentos(f.texto || "");
    function ok(arr, v) { return !arr || !arr.length || arr.indexOf(v) >= 0; }
    return base.registros.filter(function (r) {
      if (!ok(f.tipos, r.tipo) || !ok(f.segmentos, segDe(r)) || !ok(f.servicios, r.servicio)) return false;
      if (f.cliente && cliDe(r) !== f.cliente) return false;
      if (txt && sinAcentos(r.cliente).indexOf(txt) < 0 && r.contrato.indexOf(txt) < 0) return false;
      return true;
    });
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
    var total = 0, porMes = {}, contratos = {}, clientes = {}, servicios = {}, segmentos = {};
    meses.forEach(function (m) { porMes[m] = 0; });
    regs.forEach(function (r) {
      var t = 0; meses.forEach(function (m) { var x = r.v[m] || 0; porMes[m] += x; t += x; });
      total += t;
      if (t > 0) { if (r.contrato !== SIN_CON) contratos[r.contrato] = 1; if (r.cliente) clientes[r.cliente] = 1; servicios[r.servicio] = 1; segmentos[segDe(r)] = 1; }
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
      servicios: Object.keys(servicios).length, segmentos: Object.keys(segmentos).length
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
    base.registros.forEach(function (r) {
      var t = 0; for (var m in r.v) { t += r.v[m]; if (r.v[m] < 0) negativos++; }
      if (r.tipo === NO_INF) sinTipo++;
      if (r.contrato === SIN_CON) { sinCon++; sinConEnv += t; return; }
      if (!r.segmento || !r.cliente) { sinSeg[r.contrato] = 1; sinSegEnv += t; }
      if (/sin servicio/i.test(r.tipo) || /sin servicio/i.test(r.servicio)) sinServ[r.contrato] = 1;
      if (!/^\d{9}$/.test(r.contrato)) formato[r.contrato] = 1;
      (contratoServ[r.contrato] = contratoServ[r.contrato] || {})[r.tipo + "|" + r.servicio] = 1;
      var k = clave(r); if (claves[k]) dup++; claves[k] = 1;
    });
    var multi = Object.keys(contratoServ).filter(function (c) { return Object.keys(contratoServ[c]).length > 1; });
    return [
      { id: "sinseg", nivel: "error", titulo: "Contratos sin segmento o razón social", cantidad: Object.keys(sinSeg).length, extra: sinSegEnv, extraTxt: "envíos afectados", ejemplos: Object.keys(sinSeg).slice(0, 5) },
      { id: "sinserv", nivel: "warning", titulo: "Contratos con «Sin servicio asignado»", cantidad: Object.keys(sinServ).length, ejemplos: Object.keys(sinServ).slice(0, 5) },
      { id: "multi", nivel: "info", titulo: "Contratos en más de un servicio", cantidad: multi.length, ejemplos: multi.slice(0, 5), nota: "No es un error: por eso la clave es contrato + tipo + servicio." },
      { id: "formato", nivel: "warning", titulo: "Contratos con formato distinto a 9 dígitos", cantidad: Object.keys(formato).length, ejemplos: Object.keys(formato).slice(0, 5) },
      { id: "sincon", nivel: "error", titulo: "Filas sin contrato (solo servicio)", cantidad: sinCon, extra: sinConEnv, extraTxt: "envíos sin segmento, razón social ni contrato" },
      { id: "dup", nivel: "error", titulo: "Registros duplicados (misma clave)", cantidad: dup },
      { id: "neg", nivel: "error", titulo: "Valores negativos", cantidad: negativos }
    ].concat(sinTipo ? [{ id: "sintipo", nivel: "info", titulo: "Registros sin tipo de servicio", cantidad: sinTipo, nota: "La descarga no trae la columna «Tipo de Servicio». Se completa sola si una descarga posterior la incluye." }] : []);
  }

  /* ---------- Datos sintéticos (prueba visual pública, D-014). Nombres y contratos inventados. ---------- */
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
          var r = { segmento: seg, cliente: nombre, tipo: tipo, servicio: sv, contrato: contrato, valores: [] };
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
    for (var q = 0; q < 6; q++) registros.push({ segmento: "", cliente: "", tipo: "(2) PAQUETERIA", servicio: "Estándar a domicilio", contrato: "40" + (5550000 + q * 11), valores: meses.map(function () { return Math.round(rnd() * 400); }) });
    registros.push({ segmento: registros[5].segmento, cliente: registros[5].cliente, tipo: "Sin servicio asignado", servicio: "Sin servicio asignado", contrato: "309990001", valores: meses.map(function () { return Math.round(rnd() * 90); }) });
    registros.push({ segmento: registros[8].segmento, cliente: registros[8].cliente, tipo: "(1) SOBRES", servicio: "Sobre simple", contrato: "4012345", valores: meses.map(function () { return Math.round(rnd() * 150); }) });
    var parsed = { meses: meses, registros: registros, filtros: "canal es B2C · monetizacion es Facturables · ANIO es 2026 (DATOS SINTÉTICOS)" };
    return nuevaBase(parsed, "demo", hoy || new Date(2026, 9, 29), "Datos sintéticos");
  }

  return {
    parseMes: parseMes, mesTxt: mesTxt, mesActual: mesActual, num: num, parseCSV: parseCSV, leerXLSX: leerXLSX, hojaAFilas: hojaAFilas,
    desdeFilas: desdeFilas, nuevaBase: nuevaBase, diferencias: diferencias, fusionar: fusionar, totalBase: totalBase,
    filtrar: filtrar, agrupar: agrupar, kpis: kpis, tendencia: tendencia, sinActividad: sinActividad, clientesNuevos: clientesNuevos,
    calidad: calidad, completos: completos, sumaMeses: sumaMeses, segDe: segDe, cliDe: cliDe, clave: clave, sinAcentos: sinAcentos, demo: demo,
    completarTipo: completarTipo, esInterno: esInterno, INTERNOS: INTERNOS,
    SIN_RS: SIN_RS, SIN_SEG: SIN_SEG, NO_INF: NO_INF, SIN_CON: SIN_CON
  };
})();
if (typeof module !== "undefined" && module.exports) module.exports = MATRIZ;
/* ==LIB-END== */
