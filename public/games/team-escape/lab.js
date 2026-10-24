// The Big Screen building: a cut-away of the escape rooms (2 to 8) on one or
// two floors, with the vault on the right. Every room shows its number and
// name, a "?" for its secret digit (digits never reach the projector), and
// one padlock per team that springs open when that team clears the room.
// Team markers stand in the room they are working on.
(function () {
  "use strict";

  var W = 1000, H = 620;
  var AREA = { x0: 24, x1: 792, y0: 70, y1: 596 };
  var GAP = 14;
  var VAULT = { cx: 896, cy: 345, r: 74 };
  var COLORS = { A: "#E63946", B: "#2E86FF", C: "#2BB673", D: "#9B59B6" };
  var TOKEN_SHAPE = {
    A: '<path d="M0-15L14 11H-14Z" fill="#E63946" stroke="#F4F1E8" stroke-width="2.5"/>',
    B: '<path d="M0-16L16 0L0 16L-16 0Z" fill="#2E86FF" stroke="#F4F1E8" stroke-width="2.5"/>',
    C: '<circle r="15" fill="#2BB673" stroke="#F4F1E8" stroke-width="2.5"/>',
    D: '<rect x="-14" y="-14" width="28" height="28" rx="2" fill="#9B59B6" stroke="#F4F1E8" stroke-width="2.5"/>',
  };
  var TOKEN_OFFSET = { A: [-34, -6], B: [34, -6], C: [-34, 40], D: [34, 40] };
  var VAULT_OFFSET = { A: [-44, 112], B: [44, 112], C: [-44, 156], D: [44, 156] };

  // Faint lab furniture in the middle of each room, so rooms feel different.
  var DECOR = [
    // chalkboard with a curve
    '<rect x="-46" y="-30" width="92" height="56" rx="4" fill="#1F3B2E" stroke="#8B6A47" stroke-width="5"/><path d="M-36 14C-20 -24 4 30 36 -18" fill="none" stroke="#F4F1E8" stroke-width="3"/>',
    // flask
    '<path d="M-10-34h20M-6-34v22L-30 22a6 6 0 0 0 5 9h50a6 6 0 0 0 5-9L6-12v-22" fill="#163A55" stroke="#9CC9E0" stroke-width="3.5" stroke-linejoin="round"/><path d="M-22 10h44L28 22H-28Z" fill="#2BB673" opacity=".7"/>',
    // gears
    '<g fill="none" stroke="#B9C4C2" stroke-width="5"><circle cx="-12" cy="-4" r="18"/><circle cx="-12" cy="-4" r="6"/><circle cx="22" cy="18" r="12"/><circle cx="22" cy="18" r="4"/></g>',
    // bookshelf
    '<rect x="-44" y="-34" width="88" height="66" rx="3" fill="#3A2B22" stroke="#8B6A47" stroke-width="3"/><path d="M-44 0H44" stroke="#8B6A47" stroke-width="3"/><g fill="#C94F4F"><rect x="-38" y="-28" width="8" height="26"/><rect x="-6" y="6" width="9" height="24"/></g><g fill="#3E78C2"><rect x="-28" y="-26" width="7" height="24"/><rect x="18" y="4" width="8" height="26"/></g><g fill="#D8B76D"><rect x="-18" y="-30" width="9" height="28"/><rect x="6" y="8" width="8" height="22"/></g>',
    // clock
    '<circle r="30" fill="#2B3A63" stroke="#B9C4C2" stroke-width="5"/><path d="M0-18V0L13 9" stroke="#FFC145" stroke-width="4" stroke-linecap="round" fill="none"/>',
    // microscope
    '<path d="M-26 32h52M-6 32v-10h24M8 22V-4M-4-30l18 30" fill="none" stroke="#B9C4C2" stroke-width="6" stroke-linecap="round"/><circle cx="-6" cy="-32" r="7" fill="#B9C4C2"/>',
    // light bulb
    '<path d="M0-34a22 22 0 0 0-13 40v10h26V6A22 22 0 0 0 0-34Z" fill="#5A4A1E" stroke="#FFC145" stroke-width="4"/><path d="M-10 24h20M-7 31h14" stroke="#B9C4C2" stroke-width="4" stroke-linecap="round"/>',
    // computer
    '<rect x="-40" y="-30" width="80" height="50" rx="4" fill="#0E1730" stroke="#B9C4C2" stroke-width="4"/><path d="M-30-18h30M-30-6h44M-30 6h22" stroke="#2BB673" stroke-width="4"/><path d="M-14 30h28M0 20v10" stroke="#B9C4C2" stroke-width="4"/>',
  ];

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]; });
  }

  function padlock(team, open) {
    return '<g class="lab-lock' + (open ? " open" : "") + '" data-team="' + team + '">' +
      '<path class="shackle" d="M-7 0V-7a7 7 0 0 1 14 0V0" fill="none" stroke="' + (open ? COLORS[team] : "#B9C4C2") + '" stroke-width="3.5"/>' +
      '<rect x="-10" y="-1" width="20" height="16" rx="3" fill="' + COLORS[team] + '" opacity="' + (open ? 1 : 0.45) + '"/>' +
      '<circle cy="6" r="2.5" fill="#0E1730"/></g>';
  }

  // Lays the rooms out and draws the static building. labels.room(n) and
  // labels.vault are in the page language. Returns the geometry the markers use.
  function build(svg, n, names, rtl, labels) {
    var rows = n >= 3 ? 2 : 1;
    var cols = Math.ceil(n / rows);
    var w = (AREA.x1 - AREA.x0 - GAP * (cols - 1)) / cols;
    var h = (AREA.y1 - AREA.y0 - GAP * (rows - 1)) / rows;
    var rooms = [];
    for (var i = 0; i < n; i++) {
      var row = Math.floor(i / cols), col = i % cols;
      if (rtl) col = cols - 1 - col;
      var x = AREA.x0 + col * (w + GAP), y = AREA.y0 + row * (h + GAP);
      rooms.push({ x: x, y: y, w: w, h: h, cx: x + w / 2, cy: y + h / 2 + 10 });
    }
    var roomsSvg = rooms.map(function (r, i) {
      var name = names[i] ? esc(names[i]) : "";
      var label = esc(labels.room(i + 1));
      var decorScale = Math.min(1.25, Math.min(r.w, r.h) / 150);
      return '<g class="lab-room" data-room="' + i + '">' +
        '<rect class="lab-room-bg" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="10"/>' +
        '<rect class="lab-floor" x="' + r.x + '" y="' + (r.y + r.h - 16) + '" width="' + r.w + '" height="16" rx="4"/>' +
        '<rect class="lab-flash" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="10"/>' +
        '<g opacity=".32" transform="translate(' + r.cx.toFixed(1) + " " + (r.cy - 4).toFixed(1) + ") scale(" + decorScale.toFixed(2) + ')">' + DECOR[i % DECOR.length] + "</g>" +
        '<text class="lab-room-label" x="' + (r.x + 14) + '" y="' + (r.y + 30) + '">' + label + "</text>" +
        (name ? '<text class="lab-room-name" x="' + (r.x + 14) + '" y="' + (r.y + 54) + '" direction="' + (rtl ? "rtl" : "ltr") + '" unicode-bidi="plaintext">' + name + "</text>" : "") +
        '<g transform="translate(' + (r.x + r.w - 30) + " " + (r.y + 32) + ')"><circle r="20" fill="#0E1730" stroke="#FFC145" stroke-width="3"/><text class="lab-digit" y="9">?</text></g>' +
        '<g class="lab-locks" transform="translate(' + r.cx.toFixed(1) + " " + (r.y + r.h - 34) + ')"></g>' +
        "</g>";
    }).join("");

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML =
      '<defs><linearGradient id="labSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#0B1226"/><stop offset="1" stop-color="#16213E"/></linearGradient>' +
      '<radialGradient id="labVaultGlow"><stop stop-color="#FFC145" stop-opacity=".55"/><stop offset="1" stop-color="#FFC145" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" rx="22" fill="url(#labSky)"/>' +
      '<rect x="12" y="52" width="976" height="556" rx="16" fill="#26324F" stroke="#46598F" stroke-width="4"/>' +
      '<path d="M12 52L120 14H880L988 52" fill="#1E2A4A" stroke="#46598F" stroke-width="4" stroke-linejoin="round"/>' +
      [140, 500, 860].map(function (x) { return '<g class="beacon" transform="translate(' + x + ' 30)"><rect x="-12" y="4" width="24" height="10" rx="2" fill="#46598F"/><path d="M-10 4a10 10 0 0 1 20 0Z" class="beacon-light"/></g>'; }).join("") +
      '<g class="lab-rooms">' + roomsSvg + "</g>" +
      // The vault corridor with its laser grid and the round vault door.
      '<rect x="806" y="70" width="174" height="526" rx="10" fill="#141C33" stroke="#46598F" stroke-width="3"/>' +
      '<g class="lasers">' + [150, 205, 495, 550].map(function (y, k) { return '<path d="M812 ' + y + 'L974 ' + (y + (k % 2 ? -26 : 26)) + '"/>'; }).join("") + "</g>" +
      '<circle class="vault-glow" cx="' + VAULT.cx + '" cy="' + VAULT.cy + '" r="' + (VAULT.r + 40) + '" fill="url(#labVaultGlow)" opacity="0"/>' +
      '<g class="vault-door" transform="translate(' + VAULT.cx + " " + VAULT.cy + ')">' +
      '<circle r="' + VAULT.r + '" fill="#2B3A63" stroke="#8C96B4" stroke-width="7"/><circle r="' + (VAULT.r - 16) + '" fill="#1E2A4A" stroke="#46598F" stroke-width="3"/>' +
      '<g class="vault-wheel"><circle r="22" fill="none" stroke="#FFC145" stroke-width="6"/><path d="M0-46V46M-46 0H46M-32-32l64 64M32-32l-64 64" stroke="#FFC145" stroke-width="6" stroke-linecap="round"/><circle r="9" fill="#FFC145"/></g></g>' +
      '<text class="vault-label" x="' + VAULT.cx + '" y="118">' + esc(labels.vault) + "</text>" +
      '<g class="lab-tokens"></g>';
    return { rooms: rooms, vault: VAULT };
  }

  function tokenPos(geo, team, room, done) {
    if (room == null) {
      var off = VAULT_OFFSET[team];
      return { x: geo.vault.cx + off[0] * (done ? 0.6 : 1), y: geo.vault.cy + off[1] - (done ? 220 : 0) };
    }
    var r = geo.rooms[room], o = TOKEN_OFFSET[team];
    var sx = Math.min(1, r.w / 200);
    return { x: r.cx + o[0] * sx, y: r.cy + o[1] };
  }

  // Padlocks per room and the team markers, redrawn on every update.
  function update(svg, geo, game) {
    var locks = svg.querySelectorAll(".lab-locks");
    var teams = game.playing;
    Array.prototype.forEach.call(locks, function (g, i) {
      g.innerHTML = teams.map(function (team, k) {
        var open = game.progress[team].clearedRooms.indexOf(i) !== -1;
        return '<g transform="translate(' + ((k - (teams.length - 1) / 2) * 30) + ' 0)">' + padlock(team, open) + "</g>";
      }).join("");
    });
    var layer = svg.querySelector(".lab-tokens");
    layer.innerHTML = teams.map(function (team) {
      var p = game.progress[team];
      var pos = tokenPos(geo, team, p.room, p.phase === "done");
      var pips = "";
      for (var i = 0; i < p.qCount; i++) {
        pips += '<circle cx="' + (i * 8 - (p.qCount - 1) * 4) + '" cy="0" r="3" fill="' + (i < p.q ? "#FFC145" : "#F4F1E8") + '" opacity="' + (i < p.q ? 1 : 0.6) + '"/>';
      }
      var flame = p.streak >= 3 ? '<text class="token-flame" x="16" y="-12">' + p.streak + "×</text>" : "";
      return '<g class="lab-token" data-team="' + team + '" transform="translate(' + pos.x.toFixed(1) + " " + pos.y.toFixed(1) + ')"><g class="lab-token-move"><g class="lab-token-body">' + TOKEN_SHAPE[team] + "</g>" + flame + '<g transform="translate(0 25)">' + pips + "</g></g></g>";
    }).join("");
  }

  window.EscapeLab = { build: build, update: update, tokenPos: tokenPos, COLORS: COLORS };
})();
