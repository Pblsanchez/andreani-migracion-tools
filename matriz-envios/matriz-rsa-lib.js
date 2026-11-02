/* ==RSA-LIB-START== Lógica pura de «Ingreso y resultado» (T-005, D-031, D-036, D-037). Sin DOM.
   1) Lee las 3 planillas en el navegador (xlsx, solo la hoja necesaria).
   2) Las normaliza a CSV (formato esquemas/fuentes-rsa.md) para guardarlas en el repo privado.
   3) Cruza razón social de la matriz → ID RSA (vías 1–4, 6) y arma vinculos.json conservando los manuales.
   4) Agrega ingreso / costos / resultado por RSA y mes. */
var MATRIZ_RSA = (function () {
  "use strict";
  var MESES_ABR = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  /* RSA internos (D-031): fuera de rankings y totales. 01648 = CONTADO (mostrador) */
  var RSA_INTERNOS = ["88881", "88882", "99999", "01648"];
  var CONTADO = "01648";
  var RUTAS = { puente: "fuentes/puente_solicitantes_envios.csv", baseRsa: "fuentes/base_rsa_solicitantes.csv", rsa: "fuentes/rentabilidad_rsa.csv",
    mesDir: "fuentes/rentabilidad", mes: function (m) { return "fuentes/rentabilidad/" + m + ".csv"; }, vinculos: "rsa/vinculos.json" };

  /* ---------- XLSX: ZIP + DecompressionStream, una hoja por nombre ---------- */
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
      var ld = loff + 30 + u16(b, loff + 26) + u16(b, loff + 28);
      files[nombre] = { metodo: metodo, data: b.subarray(ld, ld + csize) };
      off += 46 + nlen + xlen + clen;
    }
    return files;
  }
  function inflar(f) {
    if (f.metodo === 0) return Promise.resolve(new TextDecoder().decode(f.data));
    if (typeof DecompressionStream === "undefined") return Promise.reject(new Error("Tu navegador no soporta descompresión nativa. Usá Chrome o Edge actualizados."));
    return new Response(new Blob([f.data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text();
  }
  function dec(s) {
    return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-f]+);/gi, function (_, h) { return String.fromCodePoint(parseInt(h, 16)); })
      .replace(/&#(\d+);/g, function (_, d) { return String.fromCodePoint(+d); }).replace(/&amp;/g, "&");
  }
  function textos(x) { var o = "", re = /<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g, m; while ((m = re.exec(x))) o += m[1]; return dec(o); }
  function col(ref) { var m = /^([A-Z]+)/.exec(ref || ""); if (!m) return -1; var n = 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + m[1].charCodeAt(i) - 64; return n - 1; }
  /* Filas con datos (las vacías se omiten: algunas hojas declaran 1.048.558 filas). Celda: número, texto o "" */
  function filas(xml, sh) {
    var out = [], reR = /<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g, mr;
    while ((mr = reR.exec(xml))) {
      if (!mr[1]) continue;
      var row = [], c = 0, reC = /<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g, mc, hay = false;
      while ((mc = reC.exec(mr[1]))) {
        var at = mc[1], inn = mc[2] || "", r = /\br="([A-Z]+)\d+"/.exec(at); if (r) c = col(r[1]);
        var t = (/\bt="(\w+)"/.exec(at) || [])[1], vm = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(inn), v = "";
        if (t === "s") v = sh[+(vm ? vm[1] : -1)] || ""; else if (t === "inlineStr") v = textos(inn);
        else if (t === "str" || t === "e") v = vm ? dec(vm[1]) : ""; else if (t === "b") v = vm ? vm[1] === "1" : ""; else v = vm ? Number(vm[1]) : "";
        row[c++] = v; if (v !== "") hay = true;
      }
      if (!hay) continue;
      for (var i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = "";
      out.push(row);
    }
    return out;
  }
  /* Hojas del libro: [{nombre, ruta}] en orden */
  function hojasDe(files) {
    var wb = files["xl/workbook.xml"], rels = files["xl/_rels/workbook.xml.rels"];
    if (!wb || !rels) return Promise.resolve(Object.keys(files).filter(function (n) { return /^xl\/worksheets\/[^/]+\.xml$/i.test(n); }).sort().map(function (n) { return { nombre: n, ruta: n }; }));
    return Promise.all([inflar(wb), inflar(rels)]).then(function (x) {
      var mapa = {}, re = /<Relationship\b([^>]*)\/?>/g, m;
      while ((m = re.exec(x[1]))) { var id = (/\bId="([^"]+)"/.exec(m[1]) || [])[1], tg = (/\bTarget="([^"]+)"/.exec(m[1]) || [])[1]; if (id && tg) mapa[id] = tg.replace(/^\/?xl\//, "").replace(/^\//, ""); }
      var out = [], rs = /<(?:\w+:)?sheet\b([^>]*)\/?>/g;
      while ((m = rs.exec(x[0]))) { var nm = (/\bname="([^"]*)"/.exec(m[1]) || [])[1], rid = (/\br:id="([^"]+)"/.exec(m[1]) || [])[1]; if (nm && mapa[rid]) out.push({ nombre: dec(nm), ruta: "xl/" + mapa[rid] }); }
      return out;
    });
  }
  /* Lee la hoja cuyo nombre cumple «elegir» (función o texto); si no, la primera */
  function leerHoja(buf, elegir) {
    var files; try { files = leerZip(buf); } catch (e) { return Promise.reject(e); }
    return hojasDe(files).then(function (hs) {
      var h = hs.filter(function (x) { return typeof elegir === "function" ? elegir(x.nombre) : x.nombre === elegir; })[0] || (elegir ? null : hs[0]);
      if (!h || !files[h.ruta]) throw new Error("No encontré la hoja «" + (typeof elegir === "string" ? elegir : "esperada") + "». Hojas del archivo: " + hs.map(function (x) { return x.nombre; }).join(", ") + ".");
      var ss = files["xl/sharedStrings.xml"];
      return Promise.all([ss ? inflar(ss) : Promise.resolve(""), inflar(files[h.ruta])]).then(function (r) {
        var sh = [], re = /<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g, m; while ((m = re.exec(r[0]))) sh.push(textos(m[1]));
        return { hoja: h.nombre, filas: filas(r[1], sh), hojas: hs.map(function (x) { return x.nombre; }) };
      });
    });
  }

  /* ---------- Normalización ---------- */
  function txt(v) { return v == null ? "" : String(v).trim(); }
  function codRsa(v) { var s = typeof v === "number" ? String(Math.round(v)) : txt(v); return /^\d+$/.test(s) && s.length < 5 ? ("00000" + s).slice(-5) : s; }
  function codSol(v) { return typeof v === "number" ? String(Math.round(v)) : txt(v).replace(/\.0+$/, ""); }
  function monto(v) {
    if (v === "" || v == null) return "";
    var x = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    if (!isFinite(x)) return "";
    var s = (Math.round(x * 100) / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
    return s === "-0" ? "0" : s;
  }
  /* Fecha de Excel (número de serie) o texto → AAAA-MM */
  function mesDe(v) {
    if (typeof v === "number") { var d = new Date(Math.round((v - 25569) * 86400000)); return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2); }
    var s = txt(v), m = /^(\d{4})-(\d{2})/.exec(s); if (m) return m[1] + "-" + m[2];
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); return m ? m[3] + "-" + ("0" + m[2]).slice(-2) : "";
  }
  function mesTxt(m) { var p = (m || "").split("-"); return p.length === 2 ? MESES_ABR[+p[1]] + "-" + p[0].slice(2) : m; }
  function sinAcentos(s) { return txt(s).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  /* Nombre comparable: mayúsculas sin acentos ni puntuación, sin forma societaria final */
  var SOCIETARIAS = /\b(S ?A ?C ?I ?F ?I ?A|S ?A ?I ?C|S ?A ?C ?I|S ?A ?U|S ?A ?S|S ?R ?L|S ?C ?A|S ?A|SOC ANONIMA|SOCIEDAD ANONIMA|LTDA|LIMITADA|S ?H|S ?E|SUCURSAL ARGENTINA|SUC ARGENTINA|ARG|ARGENTINA)\s*$/;
  function normNombre(s) {
    var x = sinAcentos(s).replace(/&/g, " Y ").replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim(), prev;
    do { prev = x; x = x.replace(SOCIETARIAS, "").trim(); } while (x !== prev && x.length > 3);
    return x;
  }

  /* ---------- CSV ; ---------- */
  function csvCampo(v) { var s = v == null ? "" : String(v); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function aCSV(cab, rows) { return [cab].concat(rows).map(function (r) { return r.map(csvCampo).join(";"); }).join("\n") + "\n"; }
  function deCSV(t) {
    var out = [], row = [], f = "", q = false, i = 0, c;
    t = String(t || "").replace(/^\uFEFF/, "");
    for (; i < t.length; i++) {
      c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ";") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); out.push(row); row = []; f = ""; }
      else f += c;
    }
    if (f !== "" || row.length) { row.push(f); out.push(row); }
    var cab = out.shift() || [];
    return out.filter(function (r) { return r.length > 1 || r[0] !== ""; }).map(function (r) { var o = {}; cab.forEach(function (k, j) { o[k] = r[j] == null ? "" : r[j]; }); return o; });
  }

  /* ---------- Las 3 planillas → tablas normalizadas ---------- */
  function idx(cab, nombres) { var c = cab.map(sinAcentos); for (var i = 0; i < nombres.length; i++) { var j = c.indexOf(sinAcentos(nombres[i])); if (j >= 0) return j; } return -1; }
  function exigir(cab, mapa, archivo) {
    var o = {}, faltan = [];
    Object.keys(mapa).forEach(function (k) { o[k] = idx(cab, mapa[k]); if (o[k] < 0) faltan.push(mapa[k][0]); });
    if (faltan.length) throw new Error(archivo + ": faltan columnas " + faltan.join(", ") + ".");
    return o;
  }
  /* «Envíos y facturación» › hoja Matriz_de_envios: solicitante_codigo, solicitante_descripcion, imposiciones por sistema */
  function puenteDesdeFilas(rows) {
    var h = -1, c = -1, filtros = [];
    for (var i = 0; i < Math.min(rows.length, 40); i++) { c = rows[i].map(txt).indexOf("solicitante_codigo"); if (c >= 0) { h = i; break; } }
    if (h < 0) throw new Error("Envíos y facturación: no encontré la fila de encabezados con «solicitante_codigo» en la hoja Matriz_de_envios.");
    for (var k = 0; k < h; k++) { var a = txt(rows[k][c]), b = txt(rows[k][c + 1]); if (a && b && a !== "Imposicion") filtros.push(a + " = " + b); }
    var cab = rows[h].map(txt), sis = ["Alertran", "DMS", "Integra", "Total general"].map(function (s) { return cab.indexOf(s); });
    var out = [];
    rows.slice(h + 1).forEach(function (r) {
      var cod = codSol(r[c]); if (!cod || /^total/i.test(cod)) return;
      out.push({ SOLICITANTE_CODIGO: cod, SOLICITANTE_DESCRIPCION: txt(r[c + 1]), IMP_ALERTRAN: monto(sis[0] >= 0 ? r[sis[0]] : ""), IMP_DMS: monto(sis[1] >= 0 ? r[sis[1]] : ""), IMP_INTEGRA: monto(sis[2] >= 0 ? r[sis[2]] : ""), IMP_TOTAL: monto(sis[3] >= 0 ? r[sis[3]] : "") });
    });
    return { filas: out, filtros: filtros.join(" · ") };
  }
  function baseRsaDesdeFilas(rows) {
    var x = exigir(rows[0] || [], { cod: ["COD RSA", "COD_RSA"], sol: ["COD_SOLICITANTE"], rs: ["RAZONSOCIALSOLICITANTE"], norm: ["RSA Normalizada_CORREG", "RSA_NORMALIZADA"] }, "Base RSA");
    return rows.slice(1).filter(function (r) { return txt(r[x.cod]) || txt(r[x.sol]); }).map(function (r) {
      return { COD_RSA: codRsa(r[x.cod]), COD_SOLICITANTE: codSol(r[x.sol]), RAZONSOCIALSOLICITANTE: txt(r[x.rs]), RSA_NORMALIZADA: txt(r[x.norm]) };
    });
  }
  var ATR = ["Ejecutivo Cuentas", "Gerente Cuenta", "Gerente Comercial", "Dirección Comercial", "Tipo de cuenta"];
  function rentabilidadDesdeFilas(rows) {
    var cab = rows[0] || [], x = exigir(cab, { id: ["ID_CLIENTE"], cli: ["CLIENTE"], ing: ["Ingreso"], cos: ["Costos totales"], res: ["Resultado Final"], fe: ["FECHA"] }, "Rentabilidad");
    var at = ATR.map(function (a) { return idx(cab, [a]); }), rsa = {}, montos = [], tot = { ingreso: 0, costos: 0, resultado: 0 }, descartadas = 0;
    rows.slice(1).forEach(function (r) {
      var id = txt(r[x.id]);
      if (!id || /^total/i.test(id)) { descartadas++; return; }
      id = codRsa(r[x.id]);
      var m = mesDe(r[x.fe]); if (!m) { descartadas++; return; }
      montos.push({ ID_RSA: id, MES: m, INGRESO: monto(r[x.ing]), COSTOS: monto(r[x.cos]), RESULTADO: monto(r[x.res]) });
      tot.ingreso += +r[x.ing] || 0; tot.costos += +r[x.cos] || 0; tot.resultado += +r[x.res] || 0;
      var o = { ID_RSA: id, CLIENTE: txt(r[x.cli]) }; ATR.forEach(function (a, i) { o[a] = at[i] >= 0 ? txt(r[at[i]]) : ""; });
      if (!rsa[id] || rsa[id]._m <= m) { o._m = m; rsa[id] = o; }
    });
    montos.sort(function (a, b) { return a.ID_RSA < b.ID_RSA ? -1 : a.ID_RSA > b.ID_RSA ? 1 : a.MES < b.MES ? -1 : a.MES > b.MES ? 1 : 0; });
    var lista = Object.keys(rsa).sort().map(function (k) { var o = rsa[k]; delete o._m; return o; });
    var meses = []; montos.forEach(function (m) { if (meses.indexOf(m.MES) < 0) meses.push(m.MES); }); meses.sort();
    return { rsa: lista, montos: montos, meses: meses, totales: tot, descartadas: descartadas };
  }
  /* Archivos para el commit (D-037): rutas → texto CSV. Montos: un archivo por mes (< 1 MB c/u) */
  var CAB = { puente: ["SOLICITANTE_CODIGO", "SOLICITANTE_DESCRIPCION", "IMP_ALERTRAN", "IMP_DMS", "IMP_INTEGRA", "IMP_TOTAL"],
    baseRsa: ["COD_RSA", "COD_SOLICITANTE", "RAZONSOCIALSOLICITANTE", "RSA_NORMALIZADA"], rsa: ["ID_RSA", "CLIENTE"].concat(ATR), mes: ["ID_RSA", "MES", "INGRESO", "COSTOS", "RESULTADO"] };
  function filasDe(objs, cab) { return objs.map(function (o) { return cab.map(function (k) { return o[k] == null ? "" : o[k]; }); }); }
  function archivosFuentes(f) {
    var a = {};
    if (f.puente) a[RUTAS.puente] = aCSV(CAB.puente, filasDe(f.puente, CAB.puente));
    if (f.baseRsa) a[RUTAS.baseRsa] = aCSV(CAB.baseRsa, filasDe(f.baseRsa, CAB.baseRsa));
    if (f.rent) {
      a[RUTAS.rsa] = aCSV(CAB.rsa, filasDe(f.rent.rsa, CAB.rsa));
      f.rent.meses.forEach(function (m) { a[RUTAS.mes(m)] = aCSV(CAB.mes, filasDe(f.rent.montos.filter(function (x) { return x.MES === m; }), CAB.mes)); });
    }
    return a;
  }

  /* ---------- Cruce razón social → RSA (vías de T-005) ----------
     1 = hoja env.+fact. (puente) nombre exacto · 2 = puente normalizado · 3 = Base RSA exacto · 4 = Base RSA normalizado · 6 = sin cruce.
     Solicitante → RSA con la Base RSA; CONTADO (01648) se ignora si el solicitante tiene otro RSA. */
  function indices(puente, baseRsa) {
    var solRsa = {}, nomRsaEx = {}, nomRsaNo = {}, puEx = {}, puNo = {}, nombreRsa = {};
    function add(m, k, v) { if (!k) return; (m[k] = m[k] || {})[v] = 1; }
    baseRsa.forEach(function (r) {
      if (!r.COD_RSA) return;
      add(solRsa, r.COD_SOLICITANTE, r.COD_RSA);
      [r.RAZONSOCIALSOLICITANTE, r.RSA_NORMALIZADA].forEach(function (n) { add(nomRsaEx, sinAcentos(n), r.COD_RSA); add(nomRsaNo, normNombre(n), r.COD_RSA); });
      if (r.RSA_NORMALIZADA && !nombreRsa[r.COD_RSA]) nombreRsa[r.COD_RSA] = r.RSA_NORMALIZADA;
    });
    (puente || []).forEach(function (p) { add(puEx, sinAcentos(p.SOLICITANTE_DESCRIPCION), p.SOLICITANTE_CODIGO); add(puNo, normNombre(p.SOLICITANTE_DESCRIPCION), p.SOLICITANTE_CODIGO); });
    return { solRsa: solRsa, nomRsaEx: nomRsaEx, nomRsaNo: nomRsaNo, puEx: puEx, puNo: puNo, nombreRsa: nombreRsa };
  }
  function rsaDeSols(I, sols) {
    var s = {}; sols.forEach(function (c) { Object.keys(I.solRsa[c] || {}).forEach(function (r) { s[r] = 1; }); });
    var l = Object.keys(s).sort(); if (l.length > 1) l = l.filter(function (r) { return r !== CONTADO; });
    return l;
  }
  function vincularUno(I, rs) {
    var ex = sinAcentos(rs), no = normNombre(rs), sols, l;
    sols = Object.keys(I.puEx[ex] || {}); l = rsaDeSols(I, sols); if (l.length) return { via: 1, rsa: l, sol: sols };
    if (no) { sols = Object.keys(I.puNo[no] || {}); l = rsaDeSols(I, sols); if (l.length) return { via: 2, rsa: l, sol: sols }; }
    l = Object.keys(I.nomRsaEx[ex] || {}).sort(); if (l.length > 1) l = l.filter(function (r) { return r !== CONTADO; }); if (l.length) return { via: 3, rsa: l, sol: [] };
    if (no) { l = Object.keys(I.nomRsaNo[no] || {}).sort(); if (l.length > 1) l = l.filter(function (r) { return r !== CONTADO; }); if (l.length) return { via: 4, rsa: l, sol: [] }; }
    return { via: 6, rsa: [], sol: [] };
  }
  /* razones = [{rs, b2c, b2b}] (envíos de la matriz). previo = vinculos.json anterior: sus manuales se conservan.
     Devuelve el objeto vinculos.json: {version, actualizado, vinculos:[{rs, rsa:[], via, sol:[], manual?, interno?}]} */
  function vincular(razones, puente, baseRsa, previo, ahora) {
    var I = indices(puente, baseRsa), man = {};
    ((previo && previo.vinculos) || []).forEach(function (v) { if (v.manual) man[v.rs] = v; });
    var out = razones.map(function (z) {
      if (man[z.rs]) return { rs: z.rs, rsa: man[z.rs].rsa.slice(), via: "manual", sol: [], manual: man[z.rs].manual, interno: !!man[z.rs].interno };
      var r = vincularUno(I, z.rs); return { rs: z.rs, rsa: r.rsa, via: r.via, sol: r.sol };
    });
    Object.keys(man).forEach(function (k) { if (!razones.some(function (z) { return z.rs === k; })) out.push(man[k]); }); /* manuales de razones que hoy no vienen: se conservan */
    return { version: 1, actualizado: (ahora || new Date()).toISOString(), vinculos: out.sort(function (a, b) { return a.rs < b.rs ? -1 : a.rs > b.rs ? 1 : 0; }) };
  }
  /* Vínculo manual: rsa = ["01234"] o interno = true. usuario y fecha quedan registrados */
  function fijarManual(vinc, rs, rsa, interno, usuario, ahora) {
    var v = vinc.vinculos.filter(function (x) { return x.rs === rs; })[0];
    if (!v) { v = { rs: rs }; vinc.vinculos.push(v); }
    v.rsa = interno ? [] : rsa.slice(); v.via = "manual"; v.sol = []; v.interno = !!interno;
    v.manual = { usuario: usuario || null, fecha: (ahora || new Date()).toISOString() };
    vinc.actualizado = v.manual.fecha;
    return v;
  }
  /* Candidatos para «Resolver vínculos»: RSA con nombre y código, buscando por texto */
  function buscarRsa(rentRsa, q, max) {
    var qq = sinAcentos(q); if (!qq) return [];
    return rentRsa.filter(function (r) { return r.ID_RSA.indexOf(qq) === 0 || sinAcentos(r.CLIENTE).indexOf(qq) >= 0; }).slice(0, max || 20);
  }
  /* Calidad del vínculo ponderada por envíos (como T-005) */
  function calidad(vinc, razones, rentIds) {
    var env = {}, t = { razones: 0, envios: 0, conRsa: 0, unico: 0, ambiguas: 0, sin: 0, manuales: 0, sinRent: 0, porVia: {} };
    razones.forEach(function (z) { env[z.rs] = (z.b2c || 0) + (z.b2b || 0); });
    vinc.vinculos.forEach(function (v) {
      if (!(v.rs in env)) return;
      var e = env[v.rs]; t.razones++; t.envios += e;
      var k = String(v.via); t.porVia[k] = t.porVia[k] || { razones: 0, envios: 0 }; t.porVia[k].razones++; t.porVia[k].envios += e;
      if (v.manual) t.manuales++;
      if (v.interno) { t.conRsa += e; t.unico += e; return; }
      if (v.rsa.length) t.conRsa += e; else t.sin++;
      if (v.rsa.length === 1) { t.unico += e; if (rentIds && !rentIds[v.rsa[0]]) t.sinRent++; }
      if (v.rsa.length > 1) t.ambiguas++;
    });
    t.pctConRsa = t.envios ? t.conRsa / t.envios : 0; t.pctUnico = t.envios ? t.unico / t.envios : 0;
    return t;
  }
  /* Pendientes de resolver (ambiguas y sin cruce), ordenadas por envíos */
  function dudas(vinc, razones) {
    var env = {}; razones.forEach(function (z) { env[z.rs] = z; });
    return vinc.vinculos.filter(function (v) { return env[v.rs] && !v.interno && v.rsa.length !== 1; })
      .map(function (v) { var z = env[v.rs]; return { rs: v.rs, rsa: v.rsa, via: v.via, b2c: z.b2c || 0, b2b: z.b2b || 0, envios: (z.b2c || 0) + (z.b2b || 0), tipo: v.rsa.length ? "Ambiguo" : "Sin RSA" }; })
      .sort(function (a, b) { return b.envios - a.envios; });
  }

  /* ---------- Montos ---------- */
  /* montosMes = {"2026-01": [{ID_RSA, INGRESO, COSTOS, RESULTADO}]} → {rsa: {id: {m: {mes: [ing, cos, res]}}}, meses} */
  function indexarMontos(montosMes) {
    var rsa = {}, meses = Object.keys(montosMes).sort();
    meses.forEach(function (m) { montosMes[m].forEach(function (x) { var r = rsa[x.ID_RSA] = rsa[x.ID_RSA] || { m: {} }; r.m[m] = [+x.INGRESO || 0, +x.COSTOS || 0, +x.RESULTADO || 0]; }); });
    return { rsa: rsa, meses: meses };
  }
  function esInterno(id) { return RSA_INTERNOS.indexOf(id) >= 0; }
  /* Suma de un RSA en los meses elegidos */
  function sumaRsa(idx, id, meses) {
    var r = idx.rsa[id], o = { ingreso: 0, costos: 0, resultado: 0 }; if (!r) return o;
    (meses && meses.length ? meses : idx.meses).forEach(function (m) { var v = r.m[m]; if (v) { o.ingreso += v[0]; o.costos += v[1]; o.resultado += v[2]; } });
    return o;
  }
  /* Rentabilidad = resultado ÷ ingreso (nunca promedio). Semáforo D-031 */
  function rentab(ing, res) { return ing ? res / ing : null; }
  function nivel(r) { return r == null ? "sin" : r >= 0.15 ? "alta" : r >= 0 ? "media" : "negativa"; }
  /* Totales por mes de un conjunto de RSA */
  function porMes(idx, ids, meses) {
    return (meses && meses.length ? meses : idx.meses).map(function (m) {
      var o = { mes: m, ingreso: 0, costos: 0, resultado: 0 };
      ids.forEach(function (id) { var r = idx.rsa[id], v = r && r.m[m]; if (v) { o.ingreso += v[0]; o.costos += v[1]; o.resultado += v[2]; } });
      return o;
    });
  }

  return { RUTAS: RUTAS, RSA_INTERNOS: RSA_INTERNOS, CONTADO: CONTADO, CAB: CAB,
    leerHoja: leerHoja, puenteDesdeFilas: puenteDesdeFilas, baseRsaDesdeFilas: baseRsaDesdeFilas, rentabilidadDesdeFilas: rentabilidadDesdeFilas,
    archivosFuentes: archivosFuentes, aCSV: aCSV, deCSV: deCSV, codRsa: codRsa, codSol: codSol, monto: monto, mesDe: mesDe, mesTxt: mesTxt,
    sinAcentos: sinAcentos, normNombre: normNombre, indices: indices, vincularUno: vincularUno, vincular: vincular, fijarManual: fijarManual,
    buscarRsa: buscarRsa, calidad: calidad, dudas: dudas, indexarMontos: indexarMontos, esInterno: esInterno, sumaRsa: sumaRsa, rentab: rentab, nivel: nivel, porMes: porMes };
})();
if (typeof module !== "undefined" && module.exports) module.exports = MATRIZ_RSA;
/* ==RSA-LIB-END== */
