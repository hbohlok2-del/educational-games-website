// Rocket Race animations (GSAP). Ported from the Lovable prototype of
// 2026-10-16. app.js decides WHEN something happened (from room updates);
// this file only decides how it looks. Every function is a no-op when GSAP
// is missing or the viewer prefers reduced motion, except place(), which
// always moves the rocket.
(function () {
  "use strict";

  var gsap = window.gsap;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var on = !!gsap && !reduced;

  function el(cls, parent) {
    var d = document.createElement("div");
    d.className = cls;
    if (parent) parent.appendChild(d);
    return d;
  }

  function particles(wrap, o) {
    for (var k = 0; k < o.count; k++) {
      var p = el("fx-particle", wrap);
      var s = o.size * (0.6 + Math.random() * 0.8);
      p.style.width = s + "px"; p.style.height = s + "px"; p.style.background = o.color;
      p.style.left = "calc(50% - " + s / 2 + "px)";
      gsap.fromTo(p, { x: 0, y: 0, opacity: 0.9, scale: 1 }, {
        x: (Math.random() - 0.5) * o.spread * 2, y: o.dist * (0.6 + Math.random() * 0.6), opacity: 0, scale: 2,
        duration: o.dur * (0.7 + Math.random() * 0.5), ease: "power2.out",
        onComplete: (function (node) { return function () { node.remove(); }; })(p),
      });
    }
  }

  function overlay(track) {
    return track.querySelector(".fx-overlay") || el("fx-overlay", track);
  }

  var RaceFX = {
    enabled: on,

    // Once per track: engine glows, an overlay for countdown and banners,
    // twinkling stars on the code-drawn track, and a gentle idle bob.
    setup: function (track, rockets, withStars) {
      if (!on) return;
      track.classList.add("fx-on");
      overlay(track);
      rockets.forEach(function (wrap, i) {
        if (!wrap.querySelector(".fx-engine")) wrap.insertBefore(el("fx-engine"), wrap.firstChild);
        var img = wrap.querySelector("img");
        gsap.killTweensOf(img);
        gsap.to(img, { y: -4, duration: 1.2 + i * 0.15, repeat: -1, yoyo: true, ease: "sine.inOut" });
      });
      if (withStars && !track.querySelector(".fx-star")) {
        for (var i = 0; i < 24; i++) {
          var s = el("fx-star", track);
          var sz = Math.random() * 2 + 1;
          s.style.left = Math.random() * 100 + "%"; s.style.top = Math.random() * 80 + "%";
          s.style.width = sz + "px"; s.style.height = sz + "px";
          gsap.to(s, { opacity: "random(.15,1)", duration: "random(.6,1.8)", repeat: -1, yoyo: true, ease: "sine.inOut", delay: Math.random() * 2 });
        }
      }
    },

    // Moves a rocket to a height (percent from the track bottom). A fast
    // answer overshoots a little; a slow one eases in.
    place: function (wrap, pct, kind) {
      if (!on || !kind) {
        if (on) gsap.set(wrap, { bottom: pct + "%" }); else wrap.style.bottom = pct + "%";
        return;
      }
      gsap.to(wrap, { bottom: pct + "%", duration: kind === "fast" ? 0.7 : 0.9, ease: kind === "fast" ? "back.out(1.6)" : "power2.out", overwrite: "auto" });
    },

    // 3-2-1-GO over the track, timed to the server's start time; pads power up
    // and rockets rumble.
    countdown: function (track, startAt, pads, rockets) {
      if (!on) return;
      var box = overlay(track);
      var num = box.querySelector(".fx-countdown") || el("fx-countdown", box);
      var steps = ["3", "2", "1", "GO!"];
      var imgs = rockets.map(function (w) { return w.querySelector("img"); });
      steps.forEach(function (txt, n) {
        var at = startAt - (3 - n) * 1000 - Date.now();
        if (at < -600) return;
        setTimeout(function () {
          num.textContent = txt;
          num.classList.toggle("go", txt === "GO!");
          gsap.fromTo(num, { scale: 2.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" });
          gsap.to(num, { opacity: 0, scale: 0.8, duration: 0.3, delay: 0.6 });
          if (pads.length) gsap.fromTo(pads, { boxShadow: "0 0 6px var(--c)" }, { boxShadow: "0 0 " + (12 + n * 8) + "px var(--c)", duration: 0.3, yoyo: n === 3, repeat: n === 3 ? 1 : 0 });
          if (n < 3) gsap.fromTo(imgs, { x: 0 }, { x: "random(-3,3)", duration: 0.05, repeat: 9, yoyo: true, ease: "none", onComplete: function () { gsap.set(imgs, { x: 0 }); } });
        }, Math.max(0, at));
      });
    },

    // Correct answer: engine flare, exhaust, a squash, and the beam pulses.
    boost: function (wrap, beam, fast) {
      if (!on) return;
      gsap.fromTo(wrap.querySelector(".fx-engine"), { opacity: fast ? 1 : 0.6, scale: fast ? 1.6 : 1.1 }, { opacity: 0, scale: 0.6, duration: fast ? 0.8 : 0.6, ease: "power2.out" });
      if (beam) gsap.fromTo(beam, { opacity: 1 }, { opacity: 0.75, duration: 0.8, ease: "power2.out", clearProps: "opacity" });
      if (fast) gsap.fromTo(wrap.querySelector("img"), { scaleY: 0.92 }, { scaleY: 1, duration: 0.4, ease: "elastic.out(1,.4)" });
      particles(wrap, fast ? { count: 14, color: "#ffcc55", size: 9, spread: 16, dist: 110, dur: 0.7 } : { count: 6, color: "#ffcc55", size: 6, spread: 10, dist: 50, dur: 0.5 });
      if (fast) particles(wrap, { count: 6, color: "#fff", size: 5, spread: 8, dist: 80, dur: 0.5 });
    },

    // Wrong answer: shake and sputter, a smoke puff, the lane dims briefly.
    // The rocket never moves down.
    wrong: function (wrap, dimTarget) {
      if (!on) return;
      var img = wrap.querySelector("img");
      gsap.fromTo(img, { x: 0, rotation: 0 }, { x: "random(-6,6)", rotation: "random(-4,4)", duration: 0.06, repeat: 7, yoyo: true, ease: "none", onComplete: function () { gsap.set(img, { x: 0, rotation: 0 }); } });
      gsap.fromTo(wrap.querySelector(".fx-engine"), { opacity: 0.5 }, { opacity: 0, duration: 0.1, repeat: 3, yoyo: true });
      particles(wrap, { count: 7, color: "rgba(190,200,215,.8)", size: 14, spread: 24, dist: 30, dur: 0.9 });
      gsap.fromTo(dimTarget, { filter: "brightness(.45) saturate(.4)" }, { filter: "brightness(1) saturate(1)", duration: 0.9, ease: "power1.in", clearProps: "filter" });
    },

    // Lead change: the crown hops from the old leader to the new one.
    lead: function (track, wrap) {
      if (!on) return;
      var crown = track.querySelector(".fx-crown");
      var from = crown ? crown.getBoundingClientRect() : null;
      if (!crown) { crown = el("fx-crown"); crown.textContent = "👑"; }
      wrap.appendChild(crown);
      if (from) {
        var to = crown.getBoundingClientRect();
        gsap.fromTo(crown, { x: from.left - to.left, y: from.top - to.top }, { x: 0, y: 0, duration: 0.6, ease: "power3.inOut" });
      } else {
        gsap.fromTo(crown, { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(2)" });
      }
    },

    // Finish: the winner bursts through the line, confetti in its color, the
    // other lanes dim, and a banner.
    finish: function (track, wrap, others, text, color) {
      if (!on) return;
      others.forEach(function (o) { gsap.to(o, { opacity: 0.3, duration: 0.6 }); });
      RaceFX.banner(track, text, color);
      gsap.to(wrap, { bottom: "88%", duration: 0.5, delay: 0.5, ease: "power2.in" });
      gsap.fromTo(wrap.querySelector(".fx-engine"), { opacity: 1, scale: 2 }, { opacity: 0, scale: 1, duration: 1.2, delay: 0.5 });
      particles(wrap, { count: 20, color: "#ffd36b", size: 10, spread: 30, dist: 140, dur: 1 });
      var tr = track.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      var cx = wr.left - tr.left + wr.width / 2, cy = tr.height * 0.1;
      var shades = [color, "#ffffff", color, "#ffd84a"];
      for (var k = 0; k < 70; k++) {
        var c = el("fx-confetti", track);
        c.style.background = shades[k % shades.length];
        gsap.set(c, { x: cx, y: cy, rotation: Math.random() * 360 });
        gsap.to(c, {
          x: cx + (Math.random() - 0.5) * tr.width * 0.9, y: cy + Math.random() * tr.height * 0.9 - 30, rotation: "+=720",
          opacity: 0, duration: 1.6 + Math.random() * 1, ease: "power2.out", delay: 0.5,
          onComplete: (function (node) { return function () { node.remove(); }; })(c),
        });
      }
    },

    // Time ran out with a tie: neutral banner, every beam pulses once.
    draw: function (track, beams, text) {
      if (!on) return;
      RaceFX.banner(track, text, "#3b4a80");
      if (beams.length) gsap.fromTo(beams, { opacity: 0.75 }, { opacity: 1, duration: 0.4, yoyo: true, repeat: 1, ease: "sine.inOut", clearProps: "opacity" });
    },

    banner: function (track, text, color) {
      var b = overlay(track).querySelector(".fx-banner") || el("fx-banner", overlay(track));
      b.textContent = text;
      b.style.setProperty("--bc", color);
      gsap.fromTo(b, { opacity: 0, scale: 0.4, rotation: -6 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.7, delay: 0.4, ease: "back.out(2)" });
    },

    // Back to the start state for a new round or a new room.
    clear: function (track) {
      if (!on || !track) return;
      Array.prototype.forEach.call(track.querySelectorAll(".fx-confetti, .fx-particle, .fx-crown"), function (n) { n.remove(); });
      var b = track.querySelector(".fx-banner");
      if (b) gsap.set(b, { opacity: 0 });
      Array.prototype.forEach.call(track.querySelectorAll(".lane, .rocket-sprite"), function (n) { gsap.set(n, { clearProps: "opacity,filter" }); });
    },
  };

  window.RaceFX = RaceFX;
})();
