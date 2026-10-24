// Escape Room sound effects, synthesized with Web Audio (no audio files).
// Browsers only allow sound after a tap or click, so the context starts on
// the first one. The mute choice is remembered per device.
(function () {
  "use strict";

  var KEY = "escapeSound";
  var ctx = null;
  var enabled = true;
  try { enabled = localStorage.getItem(KEY) !== "off"; } catch (e) { /* storage unavailable: sound stays on */ }

  function audio() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  ["pointerdown", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, function () { if (enabled) audio(); }, { passive: true });
  });

  // One note: frequency (Hz), start offset and length (s), wave type, volume.
  function tone(freq, at, len, type, vol, slideTo) {
    var c = audio();
    if (!c) return;
    var t0 = c.currentTime + at;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + len);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + len + 0.02);
  }

  var SOUNDS = {
    click: function () { tone(1800, 0, 0.03, "square", 0.05); },
    ok: function () { tone(660, 0, 0.12, "triangle", 0.2); tone(990, 0.09, 0.18, "triangle", 0.2); },
    wrong: function () { tone(150, 0, 0.35, "sawtooth", 0.18, 90); tone(155, 0.02, 0.35, "square", 0.08, 95); },
    door: function () {
      tone(90, 0, 0.5, "sawtooth", 0.08, 60);
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.25 + i * 0.09, 0.3, "triangle", 0.18); });
    },
    alarm: function () { tone(880, 0, 0.18, "square", 0.08); tone(660, 0.2, 0.18, "square", 0.08); },
    tick: function () { tone(1200, 0, 0.06, "sine", 0.12); },
    go: function () { tone(784, 0, 0.12, "triangle", 0.2); tone(1175, 0.1, 0.35, "triangle", 0.22); },
    hint: function () { tone(1320, 0, 0.1, "sine", 0.12); tone(1760, 0.08, 0.15, "sine", 0.1); },
    vault: function () {
      tone(60, 0, 0.9, "sawtooth", 0.1, 40);
      [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.5 + i * 0.11, 0.45, "triangle", 0.2); });
    },
  };

  window.Sfx = {
    play: function (name) { if (enabled && SOUNDS[name]) SOUNDS[name](); },
    isOn: function () { return enabled; },
    setOn: function (on) {
      enabled = !!on;
      try { localStorage.setItem(KEY, enabled ? "on" : "off"); } catch (e) { /* not remembered */ }
      if (enabled) audio();
    },
  };
})();
