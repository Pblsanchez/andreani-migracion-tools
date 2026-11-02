/* ==GH-START== Conexión con GitHub: clave personal (lectura o escritura) guardada solo en este navegador. Repo privado (D-035). */
function MATRIZ_GH(c) {
  "use strict";
  var U = MATRIZ_UI, S = MATRIZ_SYNC, $ = U.$, el = U.el, alerta = U.alerta, toast = U.toast;
  var gh = c.gh, LS_TOKEN = c.LS_TOKEN, editor = c.editor, hayPend = c.hayPend, pendTxt = c.pendTxt, abrirDialogo = c.abrirDialogo, cerrarDialogo = c.cerrarDialogo,
    cargarRemoto = c.cargarRemoto, renderTodo = c.renderTodo, olvidarClave = c.olvidarClave;
  function abrirGh() { renderGh(); abrirDialogo("modal-gh", gh.usuario ? "gh-desconectar" : "gh-token"); }
  function renderGh() {
    var b = $("gh-body"); b.innerHTML = "";
    if (gh.usuario) {
      b.appendChild(alerta(editor() ? "ok" : "info", [el("strong", { text: "Conectado como " + gh.usuario + (editor() ? "" : " (solo lectura)") + ". " }),
        editor() ? "Podés ver los datos, marcar la migración, cargar descargas nuevas y enviarlas a GitHub." : "Podés ver los datos. Para editar, la clave necesita «Contents: Read and write».",
        " La clave está guardada solo en este navegador."]));
      b.appendChild(el("button", { type: "button", "class": "btn btn--secondary", id: "gh-desconectar", onclick: desconectar }, ["Desconectar este navegador"]));
      return;
    }
    b.appendChild(el("p", { "class": "gh-intro", text: "Los datos están en un repositorio privado de GitHub (" + S.REPO_TXT + "). Para verlos hace falta estar invitado a ese repositorio y conectar una clave personal de GitHub. Se genera una sola vez:" }));
    b.appendChild(el("ol", { "class": "gh-pasos" }, [
      el("li", null, ["Entrá a ", el("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener noreferrer" }, ["GitHub › Fine-grained tokens › Generate new token (se abre en otra pestaña)"]), "."]),
      el("li", null, ["Nombre: «Dashboard matriz de envíos». Vencimiento: el que prefieras (por ejemplo, 90 días)."]),
      el("li", null, ["Resource owner: ", el("strong", { text: S.CFG.owner }), ". Repository access: «Only select repositories» › ", el("strong", { text: S.REPO_TXT }), "."]),
      el("li", null, ["Permissions › Repository permissions › ", el("strong", { text: "Contents: Read-only" }), " para ver, o ", el("strong", { text: "Read and write" }), " para editar."]),
      el("li", null, ["Tocá «Generate token», copiala y pegala acá abajo."])
    ]));
    var inp = el("input", { "class": "input gh-token", type: "password", id: "gh-token", autocomplete: "off", spellcheck: "false", "aria-describedby": "gh-nota" });
    inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); conectar(); } });
    b.appendChild(el("div", { "class": "field" }, [el("label", { "for": "gh-token", text: "Clave de GitHub (token)" }), inp,
      el("span", { "class": "gh-nota", id: "gh-nota", text: "No la compartas. Queda guardada solo en este navegador y se puede quitar con «Desconectar»." })]));
    b.appendChild(el("div", { id: "gh-resultado", "aria-live": "polite" }));
    b.appendChild(el("button", { type: "button", "class": "btn btn--primary", id: "gh-conectar", onclick: conectar }, ["Conectar"]));
  }
  function conectar() {
    var token = ($("gh-token").value || "").trim(), res = $("gh-resultado");
    res.innerHTML = "";
    if (!token) { res.appendChild(alerta("error", ["Pegá la clave de GitHub para conectar."])); $("gh-token").focus(); return; }
    $("gh-conectar").disabled = true;
    res.appendChild(alerta("info", ["Verificando la clave…"]));
    var cli = new S.Cliente(token);
    cli.verificar().then(function (v) {
      $("gh-conectar").disabled = false; res.innerHTML = "";
      if (!v.puedeLeer) { res.appendChild(alerta("error", [v.error || ("El usuario " + v.usuario + " no tiene acceso a " + S.REPO_TXT + ".")])); return; }
      try { localStorage.setItem(LS_TOKEN, token); } catch (e) { /* sin almacenamiento: queda solo en esta sesión */ }
      gh.cliente = cli; gh.usuario = v.usuario; gh.puede = v.puedeEscribir;
      cerrarDialogo(); cargarRemoto(false); $("btn-gh").focus();
      toast("Conectado como " + v.usuario + (v.puedeEscribir ? ". Ya podés ver, editar y enviar a GitHub." : " (solo lectura)."));
    }).catch(function (e) {
      $("gh-conectar").disabled = false; res.innerHTML = "";
      res.appendChild(alerta("error", [e && e.message ? e.message : String(e)])); $("gh-token").focus();
    });
  }
  function desconectar() {
    if (hayPend() && !confirm("Hay cambios sin enviar (" + pendTxt() + "). Quedan guardados en este navegador, pero no se van a poder enviar hasta que conectes de nuevo. ¿Desconectar igual?")) return;
    try { localStorage.removeItem(LS_TOKEN); } catch (e) { /* nada */ }
    gh.cliente = new S.Cliente(null); gh.usuario = null; gh.puede = false; gh.sha = null;
    c.limpiarDatos(); /* sin clave no se muestran datos */
    cerrarDialogo(); renderTodo(); $("btn-gh").focus();
    toast("Se quitó la clave de GitHub de este navegador. Los datos ya no se muestran.");
  }
  /* Al abrir: si hay una clave guardada, se verifica en segundo plano */
  function verificarGuardada() {
    if (!gh.cliente.token) return;
    gh.cliente.verificar().then(function (v) { gh.usuario = v.usuario; gh.puede = v.puedeEscribir; if (!v.puedeLeer) gh.error = v.error; renderTodo(); })
      .catch(function (e) {
        if (e.status === 401 && gh.cliente.token) { olvidarClave(); renderTodo(); }
      });
  }

  return { abrirGh: abrirGh, renderGh: renderGh, conectar: conectar, desconectar: desconectar, verificarGuardada: verificarGuardada };
}
if (typeof module !== "undefined" && module.exports) module.exports = MATRIZ_GH;
/* ==GH-END== */
