// Homepage "Join a game" box: looks the code up the same way the Play page
// does and sends the student to that game's team pick.
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function basePathFor(gameType) {
    if (gameType === "tug-of-war") return "/games/tug-of-war/";
    if (gameType === "team-race") return "/games/team-race/";
    if (gameType === "team-board") return "/games/team-board/";
    if (gameType === "team-rally") return "/games/team-rally/";
    return "/games/team-buzzer/";
  }

  $("joinForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var code = $("joinCode").value.trim().toUpperCase();
    var errEl = $("joinErr");
    if (code.length !== 4) { errEl.textContent = t("play.lookup.errShort"); return; }
    errEl.textContent = "";
    $("joinGo").disabled = true;

    fetch("/api/rooms/" + encodeURIComponent(code))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        $("joinGo").disabled = false;
        if (!data.ok) { errEl.textContent = t("play.lookup.errNotFound"); return; }
        location.href = basePathFor(data.gameType) + "?code=" + code;
      })
      .catch(function () {
        $("joinGo").disabled = false;
        errEl.textContent = t("play.notice.connectError");
      });
  });
})();
