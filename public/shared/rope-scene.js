// The Tug of War rope scene shared by Number Haul and the Team Race rope
// theme. Ported from Houssam's Lovable prototype of 2026-10-17: two crews of
// four, a striped rope with the flag (the marker) at its middle, a center
// line and a goal line per side. The game decides WHEN something happened
// (from room updates); this file only decides how it looks.
//
// Position runs 0..100 as on the server: 50 = center, 0 = Red (team A) wins,
// 100 = Blue (team B) wins. Without GSAP, or when the viewer prefers reduced
// motion, only the rope moves.
(function () {
  "use strict";

  var gsap = window.gsap;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var on = !!gsap && !reduced;
  var SVG = "http://www.w3.org/2000/svg";
  var TRAVEL = 250; // scene units the rope moves from the center to a goal line
  var COLORS = { A: "#E63946", B: "#2E86FF" };
  // Crews stand 60 units in from the prototype so a winning crew stays in frame
  // when the rope reaches the goal line.
  var CREW_X = { A: [310, 380, 450, 520], B: [1080, 1150, 1220, 1290] };
  var ROPE_REST = "M 210 640 Q 800 660 1390 640";
  var ROPE_SAG = "M 210 640 Q 800 678 1390 640";
  var TENSE_AT = 18; // within this many points of a goal line the rope strains

  function posToX(p) { return ((p - 50) / 50) * TRAVEL; }
  function lean(team, deg) { return team === "A" ? -deg : deg; } // lean away from the center
  function leaderOf(p) { return p < 50 ? "A" : p > 50 ? "B" : null; }

  // One cartoon figure facing the rope, wearing its team shape on the shirt.
  function figure(parent, x, team) {
    var dir = team === "A" ? 1 : -1;
    var shape = team === "A" ? '<path d="M0 630 L13 652 L-13 652 Z" fill="#F4F1E8"/>' : '<path d="M0 626 L12 641 L0 656 L-12 641 Z" fill="#F4F1E8"/>';
    var g = document.createElementNS(SVG, "g");
    g.setAttribute("transform", "translate(" + x + " 0)");
    var body = document.createElementNS(SVG, "g");
    body.innerHTML =
      '<line x1="-14" y1="760" x2="-6" y2="700" stroke="#0e1730" stroke-width="14" stroke-linecap="round"/>' +
      '<line x1="14" y1="760" x2="6" y2="700" stroke="#0e1730" stroke-width="14" stroke-linecap="round"/>' +
      '<rect x="-26" y="590" width="52" height="115" rx="22" fill="' + COLORS[team] + '"/>' + shape +
      '<circle cx="0" cy="555" r="32" fill="#F2C9A0"/>' +
      '<circle cx="' + 10 * dir + '" cy="550" r="4" fill="#16213E"/>' +
      '<path d="M -30 548 Q 0 505 30 548" fill="' + COLORS[team] + '"/>' +
      '<g class="arms"><line x1="0" y1="615" x2="' + 48 * dir + '" y2="645" stroke="#F2C9A0" stroke-width="12" stroke-linecap="round"/></g>';
    g.appendChild(body);
    parent.appendChild(g);
    if (on) gsap.set(body, { svgOrigin: "0 760" });
    return body;
  }

  function build(container) {
    container.innerHTML =
      '<div class="rope-scene" dir="ltr">' +
        '<div class="rs-flash a"></div><div class="rs-flash b"></div>' +
        '<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
          '<defs><pattern id="rsStripes" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">' +
            '<rect width="28" height="28" fill="#C79A5B"/><rect width="10" height="28" fill="#9C7444"/></pattern></defs>' +
          '<g>' +
            '<line x1="550" y1="600" x2="550" y2="830" stroke="#E63946" stroke-width="8" stroke-dasharray="18 12"/>' +
            '<line x1="1050" y1="600" x2="1050" y2="830" stroke="#2E86FF" stroke-width="8" stroke-dasharray="18 12"/>' +
            '<line x1="800" y1="580" x2="800" y2="850" stroke="#F4F1E8" stroke-width="8"/>' +
          '</g>' +
          '<g class="rs-track"><g class="rs-crew-a"></g><g class="rs-crew-b"></g>' +
            '<path class="rs-rope" d="' + ROPE_REST + '" stroke="url(#rsStripes)" stroke-width="22" fill="none" stroke-linecap="round"/>' +
            '<g transform="translate(800 650)"><g class="rs-flag">' +
              '<line x1="0" y1="0" x2="0" y2="-90" stroke="#F4F1E8" stroke-width="6"/>' +
              '<path d="M0 -90 L70 -70 L0 -50 Z" fill="#FFC145" stroke="#F4F1E8" stroke-width="3"/>' +
              '<circle r="14" fill="#FFC145" stroke="#F4F1E8" stroke-width="4"/>' +
            '</g></g>' +
          '</g>' +
          '<g class="rs-dust"></g>' +
        '</svg>' +
        '<div class="rs-overlay"><div class="rs-countdown"></div></div>' +
        '<div class="rs-overlay"><div class="rs-banner"></div></div>' +
      '</div>';

    var root = container.querySelector(".rope-scene");
    var q = function (sel) { return root.querySelector(sel); };
    var track = q(".rs-track"), rope = q(".rs-rope"), flag = q(".rs-flag");
    var crews = { A: [], B: [] };
    CREW_X.A.forEach(function (x) { crews.A.push(figure(q(".rs-crew-a"), x, "A")); });
    CREW_X.B.forEach(function (x) { crews.B.push(figure(q(".rs-crew-b"), x, "B")); });
    var all = crews.A.concat(crews.B);

    var state = { pos: 50, running: false, over: false };
    var idleTl = null, tensionTl = null, timers = [];

    function placeTrack(duration, overshoot) {
      var x = posToX(state.pos);
      if (!on) { track.setAttribute("transform", "translate(" + x + " 0)"); return; }
      if (!duration) gsap.set(track, { x: x });
      else gsap.to(track, { x: x, duration: duration, ease: "back.out(" + overshoot + ")", overwrite: "auto" });
    }

    // Idle: crews sway, the rope sags and breathes, so the screen never looks frozen.
    function idle() {
      if (!on || state.over) return;
      if (idleTl) idleTl.kill();
      idleTl = gsap.timeline({ repeat: -1, yoyo: true });
      idleTl.to(rope, { attr: { d: ROPE_SAG }, duration: 1.6, ease: "sine.inOut" }, 0);
      ["A", "B"].forEach(function (t) {
        crews[t].forEach(function (f, i) {
          idleTl.to(f, { rotation: lean(t, state.running ? 14 : 3), duration: 1.4 + i * 0.1, ease: "sine.inOut" }, i * 0.08);
        });
      });
    }

    function dust(team, n) {
      var layer = q(".rs-dust");
      var baseX = (team === "A" ? 415 : 1185) + posToX(state.pos);
      for (var i = 0; i < n; i++) {
        var c = document.createElementNS(SVG, "circle");
        c.setAttribute("r", 8 + Math.random() * 10);
        c.setAttribute("fill", "#d9c8a0");
        c.setAttribute("cx", baseX + (Math.random() - 0.5) * 200);
        c.setAttribute("cy", 760);
        layer.appendChild(c);
        gsap.to(c, {
          attr: { cy: 700 - Math.random() * 60 }, x: (team === "A" ? -1 : 1) * (30 + Math.random() * 60),
          opacity: 0, scale: 1.8, transformOrigin: "50% 50%", duration: 0.8 + Math.random() * 0.4, ease: "power2.out",
          onComplete: (function (node) { return function () { node.remove(); }; })(c),
        });
      }
    }

    function tension(onOff) {
      if (!on) return;
      if (onOff && !tensionTl) {
        var losing = state.pos < 50 ? "B" : "A";
        tensionTl = gsap.timeline({ repeat: -1 });
        tensionTl.to(rope, { y: 3, duration: 0.05, yoyo: true, repeat: 7 }, 0)
          .to(flag, { scale: 1.25, transformOrigin: "50% 100%", duration: 0.3, yoyo: true, repeat: 1 }, 0)
          .to(crews[losing], { rotation: lean(losing, 26), x: losing === "A" ? -3 : 3, duration: 0.1, yoyo: true, repeat: 3 }, 0);
      } else if (!onOff && tensionTl) {
        tensionTl.kill(); tensionTl = null;
        gsap.to([rope, flag], { y: 0, scale: 1, duration: 0.2 });
        gsap.to(all, { x: 0, duration: 0.2 });
      }
    }

    function leadChange(team) {
      if (!on) return;
      gsap.fromTo(q(".rs-flash." + team.toLowerCase()), { opacity: 0.55 }, { opacity: 0, duration: 0.8, ease: "power2.out" });
    }

    function banner(text, color) {
      var b = q(".rs-banner");
      b.textContent = text;
      b.style.borderColor = color;
      if (!on) { b.style.opacity = 1; return; }
      gsap.fromTo(b, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2)" });
    }

    var scene = {
      // The rope's new position. pull = { team, mag } when a correct answer
      // moved it (mag 10 fast, 7 medium, 5 slow).
      pos: 50,

      setPos: function (pos, pull) {
        var before = state.pos;
        state.pos = scene.pos = pos;
        if (!pull || !on) { placeTrack(on && pull ? 0.6 : 0, 1); }
        else {
          var strength = Math.min(1, pull.mag / 10);
          placeTrack(0.5 + (1 - strength) * 0.6, 1 + strength * 1.6);
          gsap.timeline()
            .to(crews[pull.team], { rotation: lean(pull.team, 14 + 20 * strength), duration: 0.18, stagger: 0.03, ease: "power3.out" })
            .to(crews[pull.team], { rotation: lean(pull.team, 14), duration: 0.6, ease: "elastic.out(1,0.5)" });
          if (pull.mag >= 7) dust(pull.team, pull.mag >= 10 ? 10 : 5);
        }
        var lb = leaderOf(before), la = leaderOf(pos);
        if (la && la !== lb && (before - 50) * (pos - 50) <= 0) leadChange(la);
        if (!state.over) tension(pos <= TENSE_AT || pos >= 100 - TENSE_AT);
      },

      // Wrong answer: the crew stumbles and loses grip; the rope stays.
      wrong: function (team) {
        if (!on || state.over) return;
        var arms = crews[team].map(function (f) { return f.querySelector(".arms"); });
        gsap.timeline()
          .to(crews[team], { rotation: lean(team, -10), duration: 0.15, stagger: 0.04, ease: "power2.in" })
          .to(arms, { rotation: team === "A" ? 40 : -40, svgOrigin: "0 615", duration: 0.15 }, 0)
          .to(crews[team], { x: team === "A" ? 8 : -8, duration: 0.06, repeat: 5, yoyo: true }, 0.15)
          .to(arms, { rotation: 0, duration: 0.3 }, 0.6)
          .to(crews[team], { rotation: lean(team, 14), x: 0, duration: 0.5, ease: "back.out(2)" }, 0.6);
      },

      // A round already under way (joined late): crews take the strain, no countdown.
      start: function () {
        state.running = true;
        idle();
      },

      // 3-2-1-GO over the scene, timed to the server's start; crews grip and lean back.
      countdown: function (startAt) {
        state.running = true;
        idle();
        if (!on) return;
        var el = q(".rs-countdown");
        ["3", "2", "1", "GO!"].forEach(function (txt, n) {
          var at = startAt - (3 - n) * 1000 - Date.now();
          if (at < -600) return;
          timers.push(setTimeout(function () {
            el.textContent = txt;
            gsap.fromTo(el, { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" });
            gsap.to(el, { opacity: 0, scale: 0.6, duration: 0.3, delay: 0.6 });
            if (n === 0) ["A", "B"].forEach(function (t) { gsap.to(crews[t], { rotation: lean(t, 14), duration: 0.6, stagger: 0.05, ease: "power2.out" }); });
          }, Math.max(0, at)));
        });
      },

      // Finish: winners fall back, losers tumble forward, confetti, banner.
      finish: function (team, text) {
        state.over = true;
        tension(false);
        if (idleTl) idleTl.kill();
        banner(text, COLORS[team]);
        if (!on) return;
        var loser = team === "A" ? "B" : "A";
        gsap.to(crews[team], { rotation: lean(team, 80), duration: 0.6, stagger: 0.08, ease: "bounce.out", delay: 0.3 });
        gsap.to(crews[loser], { rotation: lean(loser, -75), duration: 0.7, stagger: 0.08, ease: "power2.in", delay: 0.2 });
        for (var i = 0; i < 70; i++) {
          var d = document.createElement("div");
          d.className = "rs-confetti";
          d.style.background = i % 3 === 0 ? "#FFC145" : COLORS[team];
          d.style.left = Math.random() * 100 + "%";
          root.appendChild(d);
          gsap.to(d, {
            y: root.clientHeight + 40, x: (Math.random() - 0.5) * 160, rotation: Math.random() * 720,
            duration: 1.8 + Math.random() * 1.5, delay: Math.random() * 0.8, ease: "power1.in",
            onComplete: (function (node) { return function () { node.remove(); }; })(d),
          });
        }
      },

      // Time ran out level: neutral banner, both crews sit down.
      draw: function (text) {
        state.over = true;
        tension(false);
        if (idleTl) idleTl.kill();
        banner(text, "#FFC145");
        if (!on) return;
        gsap.to(all, { rotation: 0, y: 60, scaleY: 0.8, duration: 0.5, stagger: 0.06, ease: "power2.out" });
      },

      // Back to the start state for a new round.
      reset: function (pos) {
        timers.forEach(clearTimeout); timers = [];
        state.over = false; state.running = false;
        state.pos = scene.pos = typeof pos === "number" ? pos : 50;
        tension(false);
        Array.prototype.forEach.call(root.querySelectorAll(".rs-confetti"), function (c) { c.remove(); });
        var b = q(".rs-banner"); b.style.opacity = 0;
        if (on) {
          gsap.killTweensOf(all.concat([track, rope, flag, b, q(".rs-countdown")]));
          gsap.set(all, { rotation: 0, x: 0, y: 0, scaleY: 1 });
          gsap.set(rope, { attr: { d: ROPE_REST }, y: 0 });
          gsap.set(q(".rs-countdown"), { opacity: 0 });
        }
        placeTrack(0, 1);
        idle();
      },
    };
    scene.reset(50);
    return scene;
  }

  window.RopeScene = { enabled: on, build: build };
})();
