(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var mode = null; // "join" | "spotlight"

  function showView(name) {
    qsa("#app > section[data-view]").forEach(function (sec) {
      sec.classList.toggle("hidden", sec.getAttribute("data-view") !== name);
    });
  }

  function notice(msg) {
    var n = $("notice");
    if (!msg) { n.style.display = "none"; n.textContent = ""; return; }
    n.style.display = "block"; n.textContent = msg;
  }

  var raceSocket = io("/team-race");
  var buzzerSocket = io("/team-buzzer");
  raceSocket.on("connect_error", function () { notice("Can't reach the game server right now. Check your connection and reload."); });

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var act = el.getAttribute("data-action");
    if (act === "go-landing") { showView("landing"); }
    if (act === "go-create") { location.href = "/teacher/"; }
    if (act === "go-join") { openLookup("join", "Enter the 4-letter room code"); }
    if (act === "go-spotlight") { openLookup("spotlight", "Enter the code to put on the big screen"); }
  });

  function openLookup(m, label) {
    mode = m;
    $("lookupLabel").textContent = label;
    $("codeInput").value = "";
    $("lookupErr").textContent = "";
    showView("lookup");
    $("codeInput").focus();
  }

  function peek(socket, code) {
    return new Promise(function (resolve) {
      socket.emit("peek-room", { code: code }, function (ack) {
        resolve(!!(ack && ack.ok));
      });
    });
  }

  $("codeGo").addEventListener("click", function () {
    var code = $("codeInput").value.trim().toUpperCase();
    var errEl = $("lookupErr");
    if (code.length !== 4) { errEl.textContent = "Enter the 4-letter code."; return; }
    errEl.textContent = "";
    $("codeGo").disabled = true;

    Promise.all([peek(raceSocket, code), peek(buzzerSocket, code)]).then(function (results) {
      $("codeGo").disabled = false;
      var isRace = results[0], isBuzzer = results[1];
      var base = isRace ? "/games/team-race/" : (isBuzzer ? "/games/team-buzzer/" : null);
      if (!base) { errEl.textContent = "No match found with that code."; return; }
      var url = base + "?code=" + code + (mode === "spotlight" ? "&role=display" : "");
      location.href = url;
    });
  });

  $("codeInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("codeGo").click();
  });

  showView("landing");
})();
