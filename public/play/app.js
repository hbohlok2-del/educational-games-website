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

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var act = el.getAttribute("data-action");
    if (act === "go-landing") { showView("landing"); }
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

  function basePathFor(gameType) {
    if (gameType === "tug-of-war") return "/games/tug-of-war/";
    if (gameType === "team-race") return "/games/team-race/";
    if (gameType === "team-board") return "/games/team-board/";
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

    fetch("/api/rooms/" + encodeURIComponent(code))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        $("codeGo").disabled = false;
        if (!data.ok) { errEl.textContent = t("play.lookup.errNotFound"); return; }
        goToRoom(data.gameType, code, mode === "spotlight");
      })
      .catch(function () {
        $("codeGo").disabled = false;
        errEl.textContent = t("play.notice.connectError");
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

  // ---------------- Tabs ----------------
  function showTab(name) {
    qsa(".tab").forEach(function (tab) {
      var on = tab.getAttribute("data-tab") === name;
      tab.classList.toggle("active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    qsa("[data-panel]").forEach(function (panel) {
      panel.classList.toggle("hidden", panel.getAttribute("data-panel") !== name);
    });
    if (name === "all") refreshLibrary();
  }

  qsa(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () { showTab(tab.getAttribute("data-tab")); });
  });

  // ---------------- All Games: saved quizzes ----------------
  // The list carries titles and counts only. Play asks the server to start a
  // fresh room from the saved quiz, so its answers never reach this page.
  var librarySets = null;
  var libraryLoaded = false;

  function renderLibrary() {
    var list = $("libraryList");
    list.innerHTML = "";
    if (librarySets === null) {
      var unavailable = document.createElement("p");
      unavailable.className = "lobby-empty";
      unavailable.textContent = t("play.library.unavailable");
      list.appendChild(unavailable);
      return;
    }
    if (!librarySets.length) {
      var empty = document.createElement("p");
      empty.className = "lobby-empty";
      empty.textContent = t("play.library.empty");
      list.appendChild(empty);
      return;
    }
    librarySets.forEach(function (set) {
      var row = document.createElement("div");
      row.className = "lobby-row";

      var info = document.createElement("div");
      info.className = "lobby-info";
      var title = document.createElement("span");
      title.className = "lobby-title";
      title.textContent = set.title;
      var meta = document.createElement("span");
      meta.className = "lobby-meta";
      meta.textContent = t("play.library." + (set.mechanic === "buzzer" || set.mechanic === "board" ? set.mechanic : "race")) + " · " +
        t(set.questionCount === 1 ? "play.library.questionSingular" : "play.library.questionPlural", { n: set.questionCount });
      info.appendChild(title);
      info.appendChild(meta);

      var playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.className = "btn small";
      playBtn.textContent = t("play.library.play");
      playBtn.addEventListener("click", function () { launchSet(set.id, playBtn); });

      row.appendChild(info);
      row.appendChild(playBtn);
      list.appendChild(row);
    });
  }

  function refreshLibrary() {
    fetch("/api/question-sets")
      .then(function (res) { return res.json(); })
      .then(function (data) { librarySets = data.ok ? data.sets : null; libraryLoaded = true; renderLibrary(); })
      .catch(function () { librarySets = null; libraryLoaded = true; renderLibrary(); });
  }

  function launchSet(id, btn) {
    var errEl = $("libraryErr");
    errEl.textContent = "";
    btn.disabled = true;
    fetch("/api/question-sets/" + encodeURIComponent(id) + "/launch", { method: "POST" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        btn.disabled = false;
        if (!data.ok) { errEl.textContent = t("play.library.launchFailed"); return; }
        goToRoom(data.gameType, data.code, false);
      })
      .catch(function () {
        btn.disabled = false;
        errEl.textContent = t("play.library.launchFailed");
      });
  }

  document.addEventListener("i18nchange", function () {
    if (libraryLoaded) renderLibrary();
  });

  showView("landing");
})();
