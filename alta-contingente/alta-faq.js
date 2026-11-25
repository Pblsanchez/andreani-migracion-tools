/* Alta automática de contratos DMS · preguntas frecuentes agregadas en v2.4 (T-026, 25/11/2026).
   Van aparte porque index.html está cerca del límite de tamaño. */
(function () {
  var faq = document.querySelector("#preguntas .faq");
  if (!faq) return;
  var nuevas = [
    [1, "¿Dónde consigo el modelo del Excel?",
      "Pedilo en el mismo chat (por ejemplo: «¿me pasás el modelo limpio?») y te mandamos el link al modelo vigente. Completá solo las celdas rosadas (las grises ya traen el valor habitual), elegí de las listas desplegables y mandá un contrato por Excel. Guardá una copia por cada contrato: no reutilices uno completado de otro cliente."],
    [2, "¿Lo puedo mandar por mail?",
      "No, el pedido va siempre por Teams. Si nos llega por mail, te escribimos por Teams para que reenvíes el Excel por el chat, y todo sigue por ahí: correcciones, plazo y resultado."],
    [4, "¿Puedo preguntar cómo va mi pedido?",
      "Sí. Escribí en el mismo chat «¿cómo va?» o «¿ya lo puedo validar?» y en la próxima revisión (cada hora, en horario hábil) te contestamos con el estado de tu pedido. Si tenés más de uno abierto, te contamos de todos."]
  ];
  nuevas.forEach(function (n) {
    var d = document.createElement("details");
    d.className = "rev on";
    var s = document.createElement("summary");
    s.textContent = n[1];
    var p = document.createElement("p");
    p.textContent = n[2];
    d.appendChild(s);
    d.appendChild(p);
    faq.insertBefore(d, faq.children[n[0]] || null);
  });
})();
