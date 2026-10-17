// Rally treasure map, drawn for any number of stations from 3 to 12.
// Adapted from the ChatGPT prototype Houssam made on 2026-10-17
// (rally-prototype (3).html): one island for 3 to 6 stations, a larger one
// for 7 to 9, two islands joined by a bridge for 10 to 12. Stations sit
// evenly along the route; trees, shrubs and rocks fill the land around them.
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var W = 1000, H = 700;

  // Eleven discoveries plus the treasure chest, which is always last.
  var LANDMARK_ART = [
    '<g><ellipse cy="16" rx="31" ry="9" fill="#173F35" opacity=".35"/><path d="M-26 12L0-25L27 12Z" fill="#D8B76D" stroke="#F4E5B8" stroke-width="2"/><path d="M0-25V12H27Z" fill="#AF724A"/><path d="M-8 12L0-3L8 12Z" fill="#61472F"/><path d="M-30 17Q0 8 30 17" fill="none" stroke="#E2D4A4" stroke-width="2"/></g>',
    '<g><ellipse cy="20" rx="38" ry="9" fill="#15382E" opacity=".4"/><path d="M-36-7L0-30L36-7Z" fill="#C9C7AC" stroke="#F4EBDD" stroke-width="2"/><rect x="-33" y="-7" width="66" height="7" rx="2" fill="#E5DFC8"/><rect x="-29" y="0" width="58" height="27" fill="#A4A995" stroke="#E5DFC8" stroke-width="2"/><path d="M-20 2V25M-7 2V25M7 2V25M20 2V25" stroke="#E9E1C9" stroke-width="5"/><rect x="-39" y="27" width="78" height="6" rx="2" fill="#D6CBAE"/><path d="M-4 12Q0 5 4 12V26H-4Z" fill="#4B5A4D"/></g>',
    '<g><ellipse cy="14" rx="31" ry="9" fill="#173F35" opacity=".35"/><circle r="24" fill="#B8B9A5" stroke="#EEE5C9" stroke-width="3"/><circle r="15" fill="#315F48" stroke="#D8CFB1" stroke-width="2"/><path d="M0-18L5-5L18 0L5 5L0 18L-5 5L-18 0L-5-5Z" fill="#FFC145"/><circle r="4" fill="#F4F1E8"/></g>',
    '<g><ellipse cy="21" rx="31" ry="8" fill="#15382E" opacity=".35"/><path d="M-30 20V-1Q-30-23-12-32Q7-38 18-18L30 20Z" fill="#64766A" stroke="#BEC7B0" stroke-width="2"/><path d="M-18 20V2Q-18-14-5-20Q10-24 15-7L20 20Z" fill="#132B32"/><path d="M-7 20L0 8L8 20" stroke="#FFC145" stroke-width="2" fill="none"/></g>',
    '<g><ellipse cy="12" rx="44" ry="14" fill="#17485B" opacity=".8"/><ellipse cy="9" rx="36" ry="10" fill="#5DAEB8"/><path d="M-29-4L-31-34L-18-46L-5-34V-3M-10-3L-9-28L3-38L15-29V-3M18-3L20-26L29-34L38-23V-3" fill="#B2BBA5" stroke="#E4E4CD" stroke-width="2"/><path d="M-20-10V0M2-10V0M29-9V0" stroke="#53685B" stroke-width="4"/></g>',
    '<g><ellipse cy="23" rx="25" ry="7" fill="#173F35" opacity=".35"/><path d="M-22 22V-15L-16-29L-8-15V22Z" fill="#D8D5B9" stroke="#F7EBCB" stroke-width="2"/><path d="M-18-14H-11M-18-4H-11M-18 6H-11" stroke="#8D9A8A" stroke-width="2"/><path d="M-25-15H-5L-15-27Z" fill="#E63946"/><path d="M-22 22H-2" stroke="#B28B57" stroke-width="5"/><path d="M-14-29V-39" stroke="#E6D8B3" stroke-width="2"/></g>',
    '<g><ellipse cy="24" rx="25" ry="7" fill="#173F35" opacity=".3"/><path d="M-13 22L-9-2H9L13 22Z" fill="#D2C39B" stroke="#F3E7C7" stroke-width="2"/><path d="M-15-2H15L0-17Z" fill="#9B5845" stroke="#E8C7A0" stroke-width="2"/><path d="M0-16L-5-30L0-33L5-19L18-25L21-20L6-12L17-2L13 2L2-8L-5 6L-10 3L-4-11L-19-9L-19-15Z" fill="#D9C18B" stroke="#795E43" stroke-width="1.5"/><circle cy="-14" r="4" fill="#8D6948"/></g>',
    '<g><ellipse cy="18" rx="35" ry="8" fill="#173F35" opacity=".35"/><path d="M-33 17L-22-8L-12-2L-3-26L12-4L24-13L35 17Z" fill="#6D655B" stroke="#B8B5A1" stroke-width="2"/><path d="M-3-26L3-11L12-4L6 2L14 17H-5L-8 4L-15-2Z" fill="#D16C38"/><path d="M-5-26L-2-37M4-31L12-40M-13-28L-20-37" stroke="#B8C2B3" stroke-width="4" stroke-linecap="round"/><path d="M-24 18H27" stroke="#E2D2A7" stroke-width="3"/></g>',
    '<g><ellipse cy="17" rx="38" ry="10" fill="#173F35" opacity=".35"/><path d="M-37 13Q-23 4-8 13L-3 20H-36Z" fill="#6D4C3C" stroke="#D5B995" stroke-width="2"/><path d="M-2 18L7-26L14 18Z" fill="#9C7352" stroke="#E8D1A4" stroke-width="2"/><path d="M-1-15L-23 8L-2 8Z" fill="#EAD5A1"/><path d="M10-7L30 11L12 11Z" fill="#EAD5A1"/><path d="M-31 22Q0 26 35 20" fill="none" stroke="#6AB4C1" stroke-width="3"/></g>',
    '<g><ellipse cy="23" rx="30" ry="8" fill="#173F35" opacity=".35"/><path d="M-7 22L-10-5L-2-18L6-4L7 22Z" fill="#835D3B"/><circle cx="-8" cy="-20" r="20" fill="#235A3F"/><circle cx="10" cy="-25" r="20" fill="#34764C"/><circle cx="7" cy="-9" r="18" fill="#286644"/><circle cx="-15" cy="-7" r="14" fill="#408456"/><circle cx="-6" cy="-29" r="4" fill="#8AAE6E" opacity=".8"/></g>',
    '<g><ellipse cy="17" rx="40" ry="9" fill="#173F35" opacity=".35"/><path d="M-34 15L-20-14L-5 15Z" fill="#C9A85C" stroke="#F5E5B5" stroke-width="2"/><path d="M-30 15V-2L-20-14L-10-2V15" fill="#B45F4F"/><path d="M3 15L18-20L34 15Z" fill="#D8B76D" stroke="#F5E5B5" stroke-width="2"/><path d="M8 15V-7L18-20L28-7V15" fill="#6E9D70"/><path d="M-40 18H40" stroke="#E5CEA0" stroke-width="3"/><circle cx="-19" cy="2" r="3" fill="#FFC145"/><circle cx="18" cy="0" r="3" fill="#FFC145"/></g>',
    '<g><ellipse cy="18" rx="27" ry="8" fill="#163C2F" opacity=".4"/><path d="M-21 0Q-21-17 0-17T21 0V7H-21Z" fill="#C99136" stroke="#F6D783" stroke-width="2"/><rect x="-22" y="0" width="44" height="21" rx="3" fill="#A86D2D" stroke="#F6D783" stroke-width="2"/><path d="M-21 7H21M0 0V21" stroke="#F6D783" stroke-width="3"/><rect x="-5" y="4" width="10" height="9" rx="2" fill="#FFC145" stroke="#604520" stroke-width="1.5"/><path d="M-12-8L-15-17M0-11V-21M12-8L17-17" stroke="#FFE49A" stroke-width="2"/></g>',
  ];

  var ISLAND_SMALL = "M120 180 C145 82 300 49 405 89 C500 48 650 75 742 91 C854 107 916 214 883 315 C912 420 800 559 690 574 C575 614 470 572 386 590 C252 608 111 528 104 426 C49 350 64 246 120 180Z";
  var ISLAND_LARGE = "M70 177 C91 66 250 27 358 76 C476 27 634 49 730 87 C870 93 963 207 923 318 C965 443 816 595 705 607 C574 666 451 602 365 624 C212 657 61 542 59 431 C5 344 18 249 70 177Z";
  var ISLAND_LEFT = "M38 211 C54 116 164 73 257 105 C340 75 432 141 452 226 C486 291 457 383 424 445 C384 537 261 596 158 537 C68 507 29 422 49 349 C24 300 23 253 38 211Z";
  var ISLAND_RIGHT = "M551 174 C589 80 712 51 794 88 C893 83 972 184 948 276 C988 381 915 515 817 567 C704 628 580 553 566 454 C529 369 528 254 551 174Z";
  var ROUTE_SMALL = "M 115 300 C 80 190 175 105 280 165 S 435 265 520 165 S 745 85 850 210 S 875 420 735 475 S 520 585 395 455 S 165 520 125 390";
  var ROUTE_LARGE = "M 77 314 C 43 158 190 66 305 160 S 454 274 551 151 S 799 65 904 207 S 920 450 760 515 S 511 640 381 470 S 105 555 80 390";
  var ROUTE_TWO = "M 92 299 C 55 192 166 105 265 177 S 405 279 443 330 C 462 351 487 350 515 363 C 540 372 556 383 584 398 C 630 422 672 439 729 464 S 817 526 895 406 S 899 220 805 176 S 649 192 649 300";

  var DEFS =
    '<defs>' +
    '<pattern id="rmOcean" width="48" height="38" patternUnits="userSpaceOnUse"><path d="M4 14q8-6 16 0t16 0" fill="none" stroke="#73BDD0" stroke-width="1.6" opacity=".34"/></pattern>' +
    '<pattern id="rmSpeckle" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="4" cy="7" r="1.5" fill="#E2D6A0" opacity=".22"/><path d="M15 17l3-4" stroke="#CBE0A4" stroke-width="1.2" opacity=".2"/></pattern>' +
    '<linearGradient id="rmWater" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#123D58"/><stop offset=".6" stop-color="#1B566B"/><stop offset="1" stop-color="#163C5A"/></linearGradient>' +
    '<linearGradient id="rmGrass" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#427B55"/><stop offset=".55" stop-color="#2D6848"/><stop offset="1" stop-color="#24553F"/></linearGradient>' +
    '<linearGradient id="rmSand" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#F0D8A0"/><stop offset="1" stop-color="#CDAF75"/></linearGradient>' +
    '<g id="rmTree"><circle r="15" cy="4" fill="#173F35" opacity=".45"/><path d="M-4 7h8l2 12h-12Z" fill="#835D3B"/><circle cy="-3" r="13" fill="#1D4D3D"/><circle cx="-7" cy="-8" r="8" fill="#34724B"/><circle cx="5" cy="-10" r="8" fill="#448457"/><circle cx="4" cy="-1" r="7" fill="#2E6947"/></g>' +
    '<g id="rmShrub"><ellipse cx="0" cy="3" rx="13" ry="6" fill="#173F35" opacity=".35"/><circle cx="-6" cy="0" r="6" fill="#448457"/><circle cx="1" cy="-3" r="7" fill="#34724B"/><circle cx="7" cy="1" r="5" fill="#5A925A"/></g>' +
    '<g id="rmRock"><path d="M-14 6l-5-8 8-10 11-2 13 11-4 10Z" fill="#A6B8A8" stroke="#526F68" stroke-width="1.5"/></g>' +
    '</defs>';

  // Each team waits beside its station at its own corner, so tokens never overlap.
  var TOKEN_OFFSET = { A: [-34, -50], B: [34, -50], C: [-34, 40], D: [34, 40] };
  var TOKEN_SHAPE = {
    A: '<path d="M0-15L14 11H-14Z" fill="#E63946" stroke="#F4F1E8" stroke-width="2.5"/>',
    B: '<path d="M0-16L16 0L0 16L-16 0Z" fill="#2E86FF" stroke="#F4F1E8" stroke-width="2.5"/>',
    C: '<circle r="15" fill="#2BB673" stroke="#F4F1E8" stroke-width="2.5"/>',
    D: '<rect x="-14" y="-14" width="28" height="28" rx="2" fill="#9B59B6" stroke="#F4F1E8" stroke-width="2.5"/>',
  };

  function escapeXML(value) {
    return String(value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]; });
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Draws the map into svg for n stations; labels is the list of 12 landmark
  // names in the page language (the last is the treasure). Returns the
  // station points for the tokens.
  function build(svg, n, labels, rtl) {
    var two = n >= 10, large = n >= 7 && n <= 9;
    var land, route, extra = "";
    if (two) {
      route = ROUTE_TWO;
      land = [ISLAND_LEFT, ISLAND_RIGHT].map(function (d) {
        return '<path d="' + d + '" transform="translate(0 5)" fill="#081B2A" opacity=".45"/><path d="' + d + '" fill="url(#rmGrass)" stroke="#F0D8A0" stroke-width="16"/><path d="' + d + '" fill="url(#rmSpeckle)" stroke="#668B60" stroke-width="2"/>';
      }).join("");
      extra = '<g transform="rotate(7 500 350)"><path d="M418 334 Q492 321 579 354 L579 386 Q493 357 418 372Z" fill="#8B6546" stroke="#E7C998" stroke-width="4"/><path d="M432 337L432 375M462 330L462 380M492 329L492 388M522 338L522 394M552 347L552 400" stroke="#5E4733" stroke-width="3"/></g>';
    } else {
      route = large ? ROUTE_LARGE : ROUTE_SMALL;
      var island = large ? ISLAND_LARGE : ISLAND_SMALL;
      land = '<path d="' + island + '" transform="translate(0 6)" fill="#081B2A" opacity=".45"/><path d="' + island + '" fill="url(#rmSand)" stroke="#F9E8B9" stroke-width="4"/>' +
        '<path d="' + island + '" transform="scale(.976 .976) translate(12 10)" fill="url(#rmGrass)" stroke="#668B60" stroke-width="2"/><path d="' + island + '" transform="scale(.976 .976) translate(12 10)" fill="url(#rmSpeckle)"/>';
      extra = '<path d="M740 112 C700 166 770 214 722 259 S755 330 711 366" fill="none" stroke="#164D65" stroke-width="29" stroke-linecap="round"/><path d="M740 112 C700 166 770 214 722 259 S755 330 711 366" fill="none" stroke="#5DAEB8" stroke-width="18" stroke-linecap="round"/>' +
        '<g transform="translate(725 276) rotate(-28)"><rect x="-24" y="-7" width="48" height="14" rx="2" fill="#9A7046" stroke="#E5C99A" stroke-width="2"/><path d="M-15-7V7M-5-7V7M5-7V7M15-7V7" stroke="#5E4733" stroke-width="2"/></g>';
    }
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = DEFS +
      '<rect width="' + W + '" height="' + H + '" rx="22" fill="url(#rmWater)"/><rect width="' + W + '" height="' + H + '" rx="22" fill="url(#rmOcean)"/>' +
      land + extra +
      '<g class="rm-decor"></g><path class="rm-route" d="' + route + '"/><g class="rm-landmarks"></g><g class="rm-stations"></g><g class="rm-labels"></g><g class="rm-tokens"></g>' +
      '<g transform="translate(925 72)" opacity=".9"><circle r="25" fill="#143A4C" stroke="#E9DBB3" stroke-width="1.8"/><path d="M0-19L5-4L19 0L5 4L0 19L-5 4L-19 0L-5-4Z" fill="#FFC145" stroke="#F4F1E8" stroke-width="1.2"/></g>';

    var path = svg.querySelector(".rm-route");
    var len = path.getTotalLength();
    var at = function (d) { return path.getPointAtLength(clamp(d, 0, len)); };
    var points = [];
    for (var i = 0; i < n; i++) {
      var d = (len * i) / (n - 1), p = at(d), b = at(d - 8), a = at(d + 8);
      var dx = a.x - b.x, dy = a.y - b.y, m = Math.hypot(dx, dy) || 1;
      points.push({ x: p.x, y: p.y, nx: -dy / m, ny: dx / m });
    }
    // Landmarks alternate sides of the route; labels sit just beyond them.
    var marks = points.map(function (p, i) {
      var side = i % 2 === 0 ? -1 : 1;
      var x = clamp(p.x + p.nx * side * 68, 70, 930), y = clamp(p.y + p.ny * side * 68, 80, 620);
      return { x: x, y: y, lx: clamp(x + p.nx * side * 37, 80, 920), ly: clamp(y + p.ny * side * 37, 70, 640) };
    });

    // Trees, shrubs and rocks on land, clear of the route, stations, landmarks and labels.
    var samples = [];
    for (var s = 0; s <= len; s += 10) samples.push(at(s));
    var keep = points.map(function (p) { return { x: p.x, y: p.y, r: 62 }; })
      .concat(marks.map(function (p) { return { x: p.x, y: p.y, r: 53 }; }))
      .concat(marks.map(function (p) { return { x: p.lx, y: p.ly, r: 100 }; }));
    var onLand = function (x, y) {
      if (two) return Math.pow((x - 245) / 215, 2) + Math.pow((y - 346) / 260, 2) < 1 || Math.pow((x - 750) / 225, 2) + Math.pow((y - 345) / 285, 2) < 1;
      return Math.pow((x - 500) / (large ? 470 : 415), 2) + Math.pow((y - 350) / (large ? 315 : 270), 2) < 1;
    };
    var decor = "", seed = 0;
    for (var y = 78; y <= 625; y += 43) {
      for (var x = 55; x <= 945; x += 47) {
        seed++;
        var xx = x + Math.sin(seed * 12.9898) * 10, yy = y + Math.cos(seed * 7.233) * 8;
        if (!onLand(xx, yy)) continue;
        if (samples.some(function (p) { return Math.hypot(p.x - xx, p.y - yy) < 52; })) continue;
        if (keep.some(function (k) { return Math.hypot(xx - k.x, yy - k.y) < k.r; })) continue;
        var sc = (0.68 + ((seed * 7) % 5) * 0.09).toFixed(2);
        var use = seed % 9 === 0 ? "#rmRock" : seed % 4 === 0 ? "#rmShrub" : "#rmTree";
        decor += '<use href="' + use + '" transform="translate(' + xx.toFixed(1) + " " + yy.toFixed(1) + ") scale(" + sc + ')"/>';
      }
    }
    svg.querySelector(".rm-decor").innerHTML = decor;
    var scale = n >= 10 ? 0.79 : n >= 7 ? 0.88 : 0.94;
    svg.querySelector(".rm-landmarks").innerHTML = marks.map(function (m, i) {
      return '<g transform="translate(' + m.x.toFixed(1) + " " + m.y.toFixed(1) + ") scale(" + scale + ')">' + LANDMARK_ART[i === n - 1 ? 11 : i % 11] + "</g>";
    }).join("");
    svg.querySelector(".rm-stations").innerHTML = points.map(function (p, i) {
      return '<g class="rm-station" data-station="' + i + '" transform="translate(' + p.x.toFixed(1) + " " + p.y.toFixed(1) + ')"><circle r="29" cy="4" fill="#183F33" opacity=".4"/><circle class="rm-station-disc" r="25" fill="#FFC145" stroke="#FFF1C4" stroke-width="4"/><text y="1" font-size="22" font-weight="900" fill="#17213A" text-anchor="middle" dominant-baseline="middle" font-family="Nunito,Arial,sans-serif">' + (i + 1) + "</text></g>";
    }).join("");
    var placed = [];
    var hitsCircle = function (r, cx, cy, rad) {
      var nx = clamp(cx, r.x1, r.x2), ny = clamp(cy, r.y1, r.y2);
      return Math.hypot(cx - nx, cy - ny) < rad;
    };
    var free = function (r) {
      if (r.x1 < 12 || r.x2 > W - 12 || r.y1 < 12 || r.y2 > H - 12) return false;
      if (hitsCircle(r, 925, 72, 34)) return false; // compass
      if (points.some(function (p) { return hitsCircle(r, p.x, p.y, 33); })) return false;
      return !placed.some(function (q) { return r.x1 < q.x2 + 6 && q.x1 < r.x2 + 6 && r.y1 < q.y2 + 4 && q.y1 < r.y2 + 4; });
    };
    var labelSpots = marks.map(function (m, i) {
      var name = labels[i === n - 1 ? 11 : i % 11] || "";
      var width = clamp(Array.from(name).length * (rtl ? 11 : 10) + 24, 80, 170);
      var tries = [[m.lx, m.ly], [m.x, m.y + 46], [m.x, m.y - 50], [m.x + width / 2 + 34, m.y], [m.x - width / 2 - 34, m.y], [m.lx, m.ly + 34], [m.lx, m.ly - 34], [m.x, m.y + 78], [m.x, m.y - 82]];
      var spot = null;
      for (var k = 0; k < tries.length && !spot; k++) {
        var cx = tries[k][0], cy = tries[k][1];
        var r = { x1: cx - width / 2, x2: cx + width / 2, y1: cy - 15, y2: cy + 15 };
        if (free(r)) spot = { x: cx, y: cy, r: r };
      }
      if (!spot) spot = { x: m.lx, y: m.ly, r: { x1: m.lx - width / 2, x2: m.lx + width / 2, y1: m.ly - 15, y2: m.ly + 15 } };
      placed.push(spot.r);
      return { name: name, width: width, x: spot.x, y: spot.y };
    });
    svg.querySelector(".rm-labels").innerHTML = labelSpots.map(function (l) {
      var name = l.name, width = l.width, m = { lx: l.x, ly: l.y };
      return '<g transform="translate(' + m.lx.toFixed(1) + " " + m.ly.toFixed(1) + ')"><rect x="' + (-width / 2) + '" y="-15" width="' + width + '" height="30" rx="8" fill="#163F33" stroke="#98BE91" stroke-width="1.5"/>' +
        '<text y="6" text-anchor="middle" fill="#FFF3CF" font-family="Nunito,Cairo,Arial,sans-serif" font-size="20" font-weight="900" direction="' + (rtl ? "rtl" : "ltr") + '" unicode-bidi="plaintext">' + escapeXML(name) + "</text></g>";
    }).join("");
    return points;
  }

  // Team tokens beside their stations, with one pip per question of the
  // station (filled as the team answers). A team in the finale or finished
  // waits at the treasure.
  function tokens(svg, points, room) {
    var layer = svg.querySelector(".rm-tokens");
    if (!layer) return;
    layer.innerHTML = room.playing.map(function (team) {
      var t = room.progress[team];
      var idx = t.station == null ? points.length - 1 : t.station;
      var p = points[idx], off = TOKEN_OFFSET[team];
      var pips = "";
      for (var i = 0; i < t.qCount; i++) {
        pips += '<circle cx="' + (i * 8 - (t.qCount - 1) * 4) + '" cy="0" r="3" fill="' + (i < t.q ? "#FFC145" : "#F4F1E8") + '" opacity="' + (i < t.q ? 1 : 0.6) + '"/>';
      }
      return '<g class="rm-token" data-team="' + team + '" transform="translate(' + (p.x + off[0]).toFixed(1) + " " + (p.y + off[1]).toFixed(1) + ')"><g class="rm-token-move"><g class="rm-token-body">' + TOKEN_SHAPE[team] + '</g><g transform="translate(0 25)">' + pips + "</g></g></g>";
    }).join("");
  }

  window.RallyMap = { build: build, tokens: tokens, svgNS: SVG_NS };
})();
