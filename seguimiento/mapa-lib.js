/* ==MAPA-LIB== Mapa de soluciones (T-030): ubicación de piezas y recorrido de flechas. Sin DOM, sin dependencias.
   Columnas = tipos (en el orden del JSON). Las flechas van por pasillos verticales entre columnas y por dos
   corredores (arriba y abajo): nunca atraviesan una pieza. Los rótulos se muestran dentro de las piezas. */
var MAPA_LIB = (function () {
  "use strict";
  var C = { NW: 176, GAP: 18, HEAD: 40, PAD: 12, LS: 8, PS: 9, CPAD: 14, MINGUT: 28, CHARS: 21 };

  function partir(txt, n, max) {
    /* corta en espacios y después de cada guion (nombres de repos) */
    var pal = String(txt || "").replace(/-/g, "-\u0001").split(/\s+|\u0001/).filter(Boolean), lin = [], cur = "";
    pal.forEach(function (p) {
      var j = /-$/.test(cur) ? cur + p : cur + " " + p;
      if (!cur) cur = p; else if (j.length <= n) cur = j; else { lin.push(cur); cur = p; }
    });
    if (cur) lin.push(cur);
    if (lin.length > max) { lin = lin.slice(0, max); lin[max - 1] = lin[max - 1].replace(/.{0,1}$/, "") + "…"; }
    return lin.map(function (l) { return l.length > n ? l.slice(0, n - 1) + "…" : l; });
  }

  /* Coloreo de intervalos: devuelve lane por item y cantidad de lanes. items: [{a,b}] */
  function carriles(items, sep) {
    var orden = items.map(function (it, i) { return i; }).sort(function (x, y) { return items[x].a - items[y].a || items[x].b - items[y].b; });
    var fin = [], lane = new Array(items.length);
    orden.forEach(function (i) {
      var it = items[i], k = 0;
      while (k < fin.length && fin[k] + sep > it.a) k++;
      fin[k] = it.b; lane[i] = k;
    });
    return { lane: lane, n: fin.length };
  }

  function calcular(data) {
    var tipos = data.tipos.map(function (t) { return t.id; });
    var nCol = tipos.length, byId = {}, cols = tipos.map(function () { return []; });
    data.nodos.forEach(function (n, i) {
      var c = tipos.indexOf(n.tipo); if (c < 0) return;
      var o = { id: n.id, n: n, col: c, ord: i, lineas: partir(n.nombre, C.CHARS, 2), L: [], R: [] };
      byId[n.id] = o; cols[c].push(o);
    });
    var E = [];
    (data.flujos || []).forEach(function (f, i) {
      var s = byId[f.de], t = byId[f.a]; if (!s || !t || s === t) return;
      var d = t.col - s.col, e = { i: i, f: f, s: s, t: t, d: d };
      e.sSide = d >= 0 ? "R" : "L"; e.tSide = d > 0 ? "L" : "R";
      e.largo = Math.abs(d) > 1;
      s[e.sSide].push(e); t[e.tSide].push(e); E.push(e);
    });
    /* orden dentro de cada columna: baricentro de los vecinos (4 pasadas) */
    cols.forEach(function (cl) { cl.forEach(function (o, k) { o.pos = k / Math.max(1, cl.length - 1); }); });
    for (var it = 0; it < 4; it++) {
      cols.forEach(function (cl) {
        cl.forEach(function (o) {
          var v = o.L.concat(o.R).map(function (e) { return (e.s === o ? e.t : e.s).pos; });
          o.bar = v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : o.pos;
        });
        cl.sort(function (a, b) { return a.bar - b.bar || a.ord - b.ord; });
        cl.forEach(function (o, k) { o.pos = k / Math.max(1, cl.length - 1); });
      });
    }
    /* alturas y posición relativa */
    var altoCol = cols.map(function (cl) {
      var y = 0;
      cl.forEach(function (o) {
        var base = 16 + o.lineas.length * 17 + 20 + 10;
        o.h = Math.max(base, (Math.max(o.L.length, o.R.length) + 1) * C.PS);
        o.ry = y; y += o.h + C.GAP;
      });
      return Math.max(0, y - C.GAP);
    });
    var H = Math.max.apply(null, altoCol.concat([0]));
    cols.forEach(function (cl, c) { var off = (H - altoCol[c]) / 2; cl.forEach(function (o) { o.ry += off; }); });
    /* corredores para las flechas largas: arriba o abajo según dónde estén las puntas */
    var arriba = [], abajo = [];
    E.forEach(function (e) {
      if (!e.largo) return;
      var m = (e.s.ry + e.s.h / 2 + e.t.ry + e.t.h / 2) / 2;
      e.corr = m < H / 2 ? "A" : "B";
      var g1 = e.d > 0 ? e.s.col + 1 : e.s.col, g2 = e.d > 0 ? e.t.col : e.t.col + 1;
      e.g1 = g1; e.g2 = g2;
      (e.corr === "A" ? arriba : abajo).push({ a: Math.min(g1, g2), b: Math.max(g1, g2), e: e });
    });
    var cA = carriles(arriba, 1), cB = carriles(abajo, 1);
    var altoA = cA.n ? C.CPAD * 2 + (cA.n - 1) * C.LS : 0, altoB = cB.n ? C.CPAD * 2 + (cB.n - 1) * C.LS : 0;
    var y0 = C.HEAD + altoA;
    data.nodos.forEach(function (n) { var o = byId[n.id]; if (o) o.y = o.ry + y0; });
    var yFinNodos = y0 + H;
    /* carril A: el 0 queda más cerca de los nodos */
    arriba.forEach(function (x, i) { x.e.yc = y0 - C.CPAD - cA.lane[i] * C.LS; });
    abajo.forEach(function (x, i) { x.e.yc = yFinNodos + C.CPAD + cB.lane[i] * C.LS; });
    /* puertos: ordenados por la altura del otro extremo */
    function otroY(e, o) {
      if (e.largo) return e.corr === "A" ? -1e6 + e.yc : 1e6 + e.yc;
      var p = e.s === o ? e.t : e.s; return p.y + p.h / 2;
    }
    Object.keys(byId).forEach(function (id) {
      var o = byId[id];
      ["L", "R"].forEach(function (lado) {
        var l = o[lado].slice().sort(function (a, b) { return otroY(a, o) - otroY(b, o) || a.i - b.i; });
        l.forEach(function (e, k) {
          var y = o.y + (k + 1) * o.h / (l.length + 1);
          if (e.s === o && e.sSide === lado) e.ys = y; else e.yt = y;
        });
      });
    });
    /* dos tramos horizontales del mismo pasillo a la misma altura se tapan: se corre uno 4 px */
    var usados = {};
    function marcar(g, y) { usados[g + ":" + Math.round(y)] = 1; }
    function libre(g, y) { return !usados[g + ":" + Math.round(y)] && !usados[g + ":" + Math.round(y - 1)] && !usados[g + ":" + Math.round(y + 1)]; }
    E.forEach(function (e) {
      var gS = e.sSide === "R" ? e.s.col + 1 : e.s.col, gT = e.tSide === "R" ? e.t.col + 1 : e.t.col;
      [["ys", gS, e.s], ["yt", gT, e.t]].forEach(function (q) {
        var y = e[q[0]], o = q[2], k = 0, d = [0, 4, -4, 8, -8];
        while (k < d.length && !(libre(q[1], y + d[k]) && y + d[k] > o.y + 2 && y + d[k] < o.y + o.h - 2)) k++;
        if (k < d.length) e[q[0]] = y + d[k];
        marcar(q[1], e[q[0]]);
      });
    });
    /* tramos verticales por pasillo (pasillo g = a la izquierda de la columna g; g = nCol es el último) */
    var pas = []; for (var g = 0; g <= nCol; g++) pas.push([]);
    E.forEach(function (e) {
      if (!e.largo) {
        var gg = e.d > 0 ? e.s.col + 1 : (e.d < 0 ? e.s.col : e.s.col + 1);
        pas[gg].push({ a: Math.min(e.ys, e.yt), b: Math.max(e.ys, e.yt), e: e, k: "v" });
      } else {
        pas[e.g1].push({ a: Math.min(e.ys, e.yc), b: Math.max(e.ys, e.yc), e: e, k: "v1" });
        pas[e.g2].push({ a: Math.min(e.yt, e.yc), b: Math.max(e.yt, e.yc), e: e, k: "v2" });
      }
    });
    var anchoPas = pas.map(function (lst) {
      var r = carriles(lst, 6); lst.forEach(function (x, i) { x.lane = r.lane[i]; });
      return Math.max(C.MINGUT, C.PAD * 2 + Math.max(0, r.n - 1) * C.LS);
    });
    /* x de columnas y pasillos */
    var x = 0, xPas = [], xCol = [];
    for (g = 0; g <= nCol; g++) {
      xPas.push(x); x += anchoPas[g];
      if (g < nCol) { xCol.push(x); x += C.NW; }
    }
    var W = x;
    Object.keys(byId).forEach(function (id) { var o = byId[id]; o.x = xCol[o.col]; o.w = C.NW; });
    pas.forEach(function (lst, g) { lst.forEach(function (it) { it.e[it.k + "x"] = xPas[g] + C.PAD + it.lane * C.LS; }); });
    /* recorridos */
    E.forEach(function (e) {
      var sx = e.sSide === "R" ? e.s.x + e.s.w : e.s.x, tx = e.tSide === "R" ? e.t.x + e.t.w : e.t.x;
      if (!e.largo) e.pts = [[sx, e.ys], [e.vx, e.ys], [e.vx, e.yt], [tx, e.yt]];
      else e.pts = [[sx, e.ys], [e.v1x, e.ys], [e.v1x, e.yc], [e.v2x, e.yc], [e.v2x, e.yt], [tx, e.yt]];
    });
    var cabeceras = data.tipos.map(function (t, c) { return { id: t.id, nombre: t.nombre, x: xCol[c], w: C.NW, n: cols[c].length }; });
    return { W: W, H: yFinNodos + altoB + 8, nodos: Object.keys(byId).map(function (id) { return byId[id]; }), flechas: E, cabeceras: cabeceras, C: C };
  }

  /* Controles de prolijidad (para las pruebas): tramos que atraviesan piezas y tramos superpuestos */
  function revisar(L) {
    var prob = [];
    function cruza(p, q, o) {
      var x1 = Math.min(p[0], q[0]), x2 = Math.max(p[0], q[0]), y1 = Math.min(p[1], q[1]), y2 = Math.max(p[1], q[1]);
      return x2 > o.x + 0.5 && x1 < o.x + o.w - 0.5 && y2 > o.y + 0.5 && y1 < o.y + o.h - 0.5;
    }
    var seg = [];
    L.flechas.forEach(function (e) {
      for (var i = 0; i < e.pts.length - 1; i++) {
        var p = e.pts[i], q = e.pts[i + 1];
        L.nodos.forEach(function (o) { if (cruza(p, q, o)) prob.push("cruza " + e.f.de + ">" + e.f.a + " sobre " + o.id); });
        seg.push({ e: e, p: p, q: q });
      }
    });
    for (var i = 0; i < seg.length; i++) for (var j = i + 1; j < seg.length; j++) {
      var A = seg[i], B = seg[j]; if (A.e === B.e) continue;
      var hA = A.p[1] === A.q[1], hB = B.p[1] === B.q[1];
      if (hA && hB && A.p[1] === B.p[1]) {
        var o1 = Math.max(Math.min(A.p[0], A.q[0]), Math.min(B.p[0], B.q[0])), o2 = Math.min(Math.max(A.p[0], A.q[0]), Math.max(B.p[0], B.q[0]));
        if (o2 - o1 > 1) prob.push("superpuestas H " + A.e.f.de + ">" + A.e.f.a + " / " + B.e.f.de + ">" + B.e.f.a);
      }
      if (!hA && !hB && A.p[0] === B.p[0]) {
        var v1 = Math.max(Math.min(A.p[1], A.q[1]), Math.min(B.p[1], B.q[1])), v2 = Math.min(Math.max(A.p[1], A.q[1]), Math.max(B.p[1], B.q[1]));
        if (v2 - v1 > 1) prob.push("superpuestas V " + A.e.f.de + ">" + A.e.f.a + " / " + B.e.f.de + ">" + B.e.f.a);
      }
    }
    return prob;
  }

  /* Rótulos de las conexiones de una pieza elegida: se escriben dentro de las piezas vecinas */
  function vecinos(L, id) {
    var r = {};
    L.flechas.forEach(function (e) {
      if (e.s.id === id) (r[e.t.id] = r[e.t.id] || []).push("→ " + e.f.rotulo);
      else if (e.t.id === id) (r[e.s.id] = r[e.s.id] || []).push("← " + e.f.rotulo);
    });
    return r;
  }

  return { C: C, calcular: calcular, revisar: revisar, vecinos: vecinos, partir: partir };
})();
if (typeof module !== "undefined" && module.exports) module.exports = MAPA_LIB;
