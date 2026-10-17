// Quiz Board animations (GSAP), from the Quiz Board animation spec of
// 2026-10-16. app.js decides WHEN something happened (from room updates);
// this file only decides how it looks. Everything is a no-op when GSAP is
// missing or the viewer prefers reduced motion, except count(), which still
// writes the final number.
(function () {
  "use strict";

  var gsap = window.gsap;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var on = !!gsap && !reduced;

  var BoardFX = {
    enabled: on,

    // Start of a round: categories drop in, then the squares cascade in
    // column by column.
    reveal: function (board) {
      if (!on) return;
      var heads = board.querySelectorAll(".board-head");
      gsap.fromTo(heads, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.8)" });
      Array.prototype.forEach.call(board.querySelectorAll(".board-col"), function (col, c) {
        gsap.fromTo(col.querySelectorAll(".board-cell"), { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.35, stagger: 0.06, delay: 0.35 + c * 0.1, ease: "back.out(2)" });
      });
    },

    // A square was picked: a gold copy of it lifts off and grows into the
    // question screen, which fades in behind it.
    zoom: function (fromRect, points, target) {
      if (!on || !fromRect) return;
      var to = target.getBoundingClientRect();
      var card = document.createElement("div");
      card.className = "fx-pick";
      card.textContent = points;
      card.style.left = fromRect.left + "px"; card.style.top = fromRect.top + "px";
      card.style.width = fromRect.width + "px"; card.style.height = fromRect.height + "px";
      document.body.appendChild(card);
      gsap.timeline({ onComplete: function () { card.remove(); } })
        .to(card, { y: -10, scale: 1.08, duration: 0.15, ease: "power2.out" })
        .to(card, { left: to.left, top: to.top, width: to.width, height: to.height, y: 0, scale: 1, duration: 0.45, ease: "power3.inOut" })
        .to(card, { opacity: 0, duration: 0.25 });
      gsap.fromTo(target, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.5 });
    },

    // A team sent its answer: its status chip pops.
    pop: function (chip) {
      if (!on || !chip) return;
      gsap.fromTo(chip, { scale: 0.92 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
    },

    // A wrong answer: the chip shakes.
    shake: function (el) {
      if (!on || !el) return;
      gsap.fromTo(el, { x: 0 }, { x: 6, duration: 0.06, repeat: 5, yoyo: true, ease: "none", onComplete: function () { gsap.set(el, { x: 0 }); } });
    },

    // Points change: "+300" (or "-300") flies from the question to the
    // team's score chip.
    fly: function (from, chip, delta) {
      if (!on || !from || !chip || !delta) return;
      var a = from.getBoundingClientRect(), b = chip.getBoundingClientRect();
      var tag = document.createElement("div");
      tag.className = "fx-points" + (delta < 0 ? " minus" : "");
      tag.textContent = (delta > 0 ? "+" : "−") + Math.abs(delta);
      tag.style.left = a.left + a.width / 2 + "px"; tag.style.top = a.top + a.height / 2 + "px";
      document.body.appendChild(tag);
      gsap.timeline({ onComplete: function () { tag.remove(); } })
        .fromTo(tag, { scale: 0.4, opacity: 0, xPercent: -50, yPercent: -50 }, { scale: 1.3, opacity: 1, duration: 0.3, ease: "back.out(2)" })
        .to(tag, { left: b.left + b.width / 2, top: b.top + b.height / 2, scale: 0.6, duration: 0.6, ease: "power2.in" })
        .to(tag, { opacity: 0, duration: 0.15 });
      if (delta < 0) BoardFX.shake(chip);
    },

    // The score counts from its old value to the new one.
    count: function (el, from, to) {
      if (!on || from === to) { el.textContent = to; return; }
      var o = { v: from };
      gsap.to(o, { v: to, duration: 0.8, delay: 0.7, ease: "power1.out", onUpdate: function () { el.textContent = Math.round(o.v); } });
    },

    // Control moved to another team: its chip gets a gold pulse.
    control: function (chip) {
      if (!on || !chip) return;
      gsap.fromTo(chip, { boxShadow: "0 0 0 0px rgba(255,193,69,0.9)" }, { boxShadow: "0 0 0 10px rgba(255,193,69,0)", duration: 0.8, ease: "power2.out", clearProps: "boxShadow" });
    },
  };

  window.BoardFX = BoardFX;
})();
