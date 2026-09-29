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
  var tugSocket = io("/tug-of-war");
  raceSocket.on("connect_error", function () { notice(t("play.notice.connectError")); });

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var act = el.getAttribute("data-action");
    if (act === "go-landing") { showView("landing"); }
    if (act === "go-create") { location.href = "/teacher/"; }
    if (act === "go-join") { openLookup("join"); }
    if (act === "go-spotlight") { openLookup("spotlight"); }
  });

  function openLookup(m) {
    mode = m;
    $("lookupLabel").textContent = t(mode === "spotlight" ? "play.lookup.labelBigScreen" : "play.lookup.label");
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

  function basePathFor(gameType) {
    if (gameType === "tug-of-war") return "/games/tug-of-war/";
    if (gameType === "team-race") return "/games/team-race/";
    return "/games/team-buzzer/";
  }

  function goToRoom(gameType, code, display) {
    location.href = basePathFor(gameType) + "?code=" + code + (display ? "&role=display" : "");
  }

  $("codeGo").addEventListener("click", function () {
    var code = $("codeInput").value.trim().toUpperCase();
    var errEl = $("lookupErr");
    if (code.length !== 4) { errEl.textContent = t("play.lookup.errShort"); return; }
    errEl.textContent = "";
    $("codeGo").disabled = true;

    Promise.all([peek(raceSocket, code), peek(buzzerSocket, code), peek(tugSocket, code)]).then(function (results) {
      $("codeGo").disabled = false;
      var isRace = results[0], isBuzzer = results[1], isTug = results[2];
      var gameType = isRace ? "team-race" : (isBuzzer ? "team-buzzer" : (isTug ? "tug-of-war" : null));
      if (!gameType) { errEl.textContent = t("play.lookup.errNotFound"); return; }
      goToRoom(gameType, code, mode === "spotlight");
    });
  });

  $("codeInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("codeGo").click();
  });

  // ---------------- Open-games lobby ----------------
  function renderLobby(rooms) {
    var list = $("lobbyList");
    list.innerHTML = "";
    if (!rooms.length) {
      var empty = document.createElement("p");
      empty.className = "lobby-empty";
      empty.textContent = t("play.lobby.empty");
      list.appendChild(empty);
      return;
    }
    rooms.forEach(function (room) {
      var row = document.createElement("div");
      row.className = "lobby-row";

      var info = document.createElement("div");
      info.className = "lobby-info";
      var title = document.createElement("span");
      title.className = "lobby-title";
      title.textContent = room.title || room.code;
      var code = document.createElement("span");
      code.className = "lobby-code mono";
      code.textContent = room.code;
      info.appendChild(title);
      info.appendChild(code);

      var actions = document.createElement("div");
      actions.className = "lobby-actions";
      var joinBtn = document.createElement("button");
      joinBtn.type = "button";
      joinBtn.className = "btn small";
      joinBtn.textContent = t("play.lobby.join");
      joinBtn.addEventListener("click", function () { goToRoom(room.gameType, room.code, false); });
      var bigBtn = document.createElement("button");
      bigBtn.type = "button";
      bigBtn.className = "btn small secondary";
      bigBtn.textContent = t("play.lobby.bigScreen");
      bigBtn.addEventListener("click", function () { goToRoom(room.gameType, room.code, true); });
      actions.appendChild(joinBtn);
      actions.appendChild(bigBtn);

      row.appendChild(info);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }

  function refreshLobby() {
    fetch("/api/rooms")
      .then(function (res) { return res.json(); })
      .then(function (data) { renderLobby(data.rooms || []); })
      .catch(function () { /* lobby is a convenience — silently skip a failed refresh */ });
  }

  refreshLobby();
  setInterval(refreshLobby, 4000);

  showView("landing");
})();
