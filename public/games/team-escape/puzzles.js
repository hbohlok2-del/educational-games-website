// The phone's puzzle widgets. Each one fills a container from the puzzle's
// public view and calls onSubmit(input) with the text the server checks:
//   padlock dials   -> "-12"           expression -> "3x^2 cos x"
//   multiple choice -> "2" (index)     order      -> "2,0,1" (shown positions, in the chosen order)
//   match           -> "1,2,0" (for each left item, the shown position of its partner)
//   graph           -> "1.25" (the x picked on the curve)
// render() returns { setDisabled(bool) } so the 5-second alarm can lock it.
(function () {
  "use strict";

  var PAIR_COLORS = ["#FFC145", "#2BB673", "#2E86FF", "#E63946", "#9B59B6"];
  // Resize listeners of the puzzle on screen, removed when the next one replaces it.
  var resizers = [];
  function onResize(fn) { window.addEventListener("resize", fn); resizers.push(fn); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function math(node) { if (window.renderMathIn) window.renderMathIn(node); return node; }
  function sfx(name) { if (window.Sfx) window.Sfx.play(name); }

  function submitButton(label, onClick) {
    var b = el("button", "submit-btn block", label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  // ---------------- Padlock dials ----------------
  // n wheels of 0-9 that roll up and down (tap the arrows, swipe, or use the
  // keyboard), with an optional sign wheel in front.
  function dial(container, n, opts) {
    opts = opts || {};
    var wrap = el("div", "dial-lock" + (opts.big ? " big" : ""));
    wrap.setAttribute("dir", "ltr");
    var digits = [];
    var negative = false;
    var controls = [];

    if (opts.signed) {
      var sign = el("button", "dial-sign", "+");
      sign.type = "button";
      sign.setAttribute("aria-label", opts.t("match.sign"));
      sign.addEventListener("click", function () {
        negative = !negative;
        sign.textContent = negative ? "−" : "+";
        sign.classList.toggle("neg", negative);
        sfx("click");
      });
      wrap.appendChild(sign);
      controls.push(sign);
    }

    for (var i = 0; i < n; i++) (function (i) {
      digits.push(0);
      var wheel = el("div", "dial-wheel");
      wheel.tabIndex = 0;
      wheel.setAttribute("role", "spinbutton");
      wheel.setAttribute("aria-valuemin", "0");
      wheel.setAttribute("aria-valuemax", "9");
      var up = el("button", "dial-arrow", "▲"); up.type = "button"; up.tabIndex = -1;
      var win = el("div", "dial-window");
      var strip = el("div", "dial-strip");
      for (var d = 0; d <= 9; d++) strip.appendChild(el("span", null, String(d)));
      win.appendChild(strip);
      var down = el("button", "dial-arrow", "▼"); down.type = "button"; down.tabIndex = -1;
      wheel.appendChild(up); wheel.appendChild(win); wheel.appendChild(down);
      wrap.appendChild(wheel);
      controls.push(up, down, wheel);

      function set(v) {
        if (wheel.disabled) return;
        digits[i] = ((v % 10) + 10) % 10;
        strip.style.transform = "translateY(" + (-digits[i] * 10) + "%)";
        wheel.setAttribute("aria-valuenow", String(digits[i]));
        sfx("click");
      }
      set(0);
      up.addEventListener("click", function () { set(digits[i] + 1); });
      down.addEventListener("click", function () { set(digits[i] - 1); });
      wheel.addEventListener("keydown", function (e) {
        if (e.key === "ArrowUp") { set(digits[i] + 1); e.preventDefault(); }
        else if (e.key === "ArrowDown") { set(digits[i] - 1); e.preventDefault(); }
        else if (/^[0-9]$/.test(e.key)) {
          set(Number(e.key));
          var next = wheel.nextElementSibling;
          if (next && next.classList.contains("dial-wheel")) next.focus();
        }
      });
      // Swipe: every 24 px of vertical drag rolls one digit.
      var startY = null, startV = 0;
      win.addEventListener("pointerdown", function (e) { startY = e.clientY; startV = digits[i]; win.setPointerCapture(e.pointerId); });
      win.addEventListener("pointermove", function (e) {
        if (startY == null) return;
        var steps = Math.round((startY - e.clientY) / 24);
        if (((startV + steps) % 10 + 10) % 10 !== digits[i]) set(startV + steps);
      });
      win.addEventListener("pointerup", function () { startY = null; });
      win.addEventListener("pointercancel", function () { startY = null; });
    })(i);

    container.appendChild(wrap);
    return {
      el: wrap,
      value: function () { return (negative ? "-" : "") + String(Number(digits.join(""))); },
      digits: function () { return digits.join(""); },
      setDisabled: function (off) {
        wrap.classList.toggle("disabled", off);
        controls.forEach(function (c) { c.disabled = off; }); // wheels are divs: set() checks the flag
      },
    };
  }

  function lockPuzzle(area, q, onSubmit, t) {
    var d = dial(area, q.lock.digits, { signed: true, t: t });
    var go = submitButton(t("match.openLock"), function () { onSubmit(d.value()); });
    area.appendChild(go);
    return { setDisabled: function (off) { d.setDisabled(off); go.disabled = off; } };
  }

  // ---------------- Typed answers ----------------
  function textPuzzle(area, q, onSubmit, t) {
    var row = el("div", "answer-row");
    var input = el("input", "text-answer-input");
    input.autocomplete = "off"; input.dir = "auto"; input.placeholder = t("match.typeYourAnswer");
    var go = el("button", "submit-btn", t("match.submit")); go.type = "button";
    function send() { if (input.value.trim()) onSubmit(input.value.trim()); }
    go.addEventListener("click", send);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
    row.appendChild(input); row.appendChild(go);
    area.appendChild(row);
    return { setDisabled: function (off) { input.disabled = off; go.disabled = off; } };
  }

  // An expression typed with a math keypad, with a live preview of how it reads.
  var KEYS = [
    ["x", "x"], ["^", "^"], ["(", "("], [")", ")"], ["/", "/"], ["·", "*"], ["+", "+"], ["−", "-"],
    ["sin", "sin("], ["cos", "cos("], ["tan", "tan("], ["sec", "sec("], ["√", "sqrt("], ["π", "pi"], ["⌫", null],
  ];
  function expressionPuzzle(area, q, onSubmit, t) {
    var input = el("input", "text-answer-input expr-input");
    input.autocomplete = "off"; input.setAttribute("autocapitalize", "off"); input.spellcheck = false;
    input.dir = "ltr"; input.placeholder = t("match.typeExpression");
    var preview = el("div", "expr-preview");
    preview.setAttribute("dir", "ltr");
    var keypad = el("div", "keypad");
    var buttons = [];
    KEYS.forEach(function (k) {
      var b = el("button", "key" + (k[1] === null ? " back" : k[0].length > 1 ? " fn" : ""), k[0]);
      b.type = "button";
      b.addEventListener("click", function () {
        var s = input.selectionStart == null ? input.value.length : input.selectionStart;
        var e = input.selectionEnd == null ? s : input.selectionEnd;
        if (k[1] === null) {
          if (s === e && s > 0) s -= 1;
          input.value = input.value.slice(0, s) + input.value.slice(e);
          input.setSelectionRange(s, s);
        } else {
          input.value = input.value.slice(0, s) + k[1] + input.value.slice(e);
          input.setSelectionRange(s + k[1].length, s + k[1].length);
        }
        sfx("click");
        showPreview();
      });
      keypad.appendChild(b);
      buttons.push(b);
    });
    function showPreview() {
      var text = input.value.trim();
      preview.classList.remove("bad");
      if (!text) { preview.textContent = t("match.previewEmpty"); return; }
      var parsed = window.MathExpr.parse(text);
      if (!parsed.ok) { preview.textContent = t("match.previewIncomplete"); preview.classList.add("bad"); return; }
      preview.textContent = "$" + parsed.tex + "$";
      math(preview);
    }
    input.addEventListener("input", showPreview);
    var go = submitButton(t("match.submit"), function () {
      var text = input.value.trim();
      if (!text) return;
      if (!window.MathExpr.parse(text).ok) { preview.classList.add("bad", "shake"); setTimeout(function () { preview.classList.remove("shake"); }, 400); return; }
      onSubmit(text);
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") go.click(); });
    area.appendChild(input);
    area.appendChild(preview);
    area.appendChild(keypad);
    area.appendChild(go);
    showPreview();
    return { setDisabled: function (off) { input.disabled = off; go.disabled = off; buttons.forEach(function (b) { b.disabled = off; }); } };
  }

  // ---------------- Multiple choice ----------------
  function choicePuzzle(area, q, onSubmit) {
    var wrap = el("div", "mc-choices");
    var buttons = (q.choices || []).map(function (text, idx) {
      var b = el("button", "mc-choice", text);
      b.type = "button";
      b.addEventListener("click", function () { onSubmit(String(idx)); });
      wrap.appendChild(b);
      return b;
    });
    area.appendChild(wrap);
    math(wrap);
    return { setDisabled: function (off) { buttons.forEach(function (b) { b.disabled = off; }); } };
  }

  // ---------------- Order the steps ----------------
  // Drag a step by its handle, or nudge it with the arrows.
  function orderPuzzle(area, q, onSubmit, t) {
    var list = el("ol", "order-list");
    var disabled = false;
    q.items.forEach(function (text, pos) {
      var li = el("li", "order-item");
      li.dataset.pos = String(pos);
      var grip = el("span", "grip", "⋮⋮");
      grip.setAttribute("aria-hidden", "true");
      var body = el("span", "order-text", text);
      body.setAttribute("dir", "auto");
      var arrows = el("span", "order-arrows");
      var up = el("button", "order-move", "▲"); up.type = "button"; up.setAttribute("aria-label", t("match.moveUp"));
      var down = el("button", "order-move", "▼"); down.type = "button"; down.setAttribute("aria-label", t("match.moveDown"));
      up.addEventListener("click", function () { if (!disabled && li.previousElementSibling) { list.insertBefore(li, li.previousElementSibling); moved(li); } });
      down.addEventListener("click", function () { if (!disabled && li.nextElementSibling) { list.insertBefore(li.nextElementSibling, li); moved(li); } });
      arrows.appendChild(up); arrows.appendChild(down);
      li.appendChild(grip); li.appendChild(body); li.appendChild(arrows);
      list.appendChild(li);
      dragHandle(li, grip);
    });
    function moved(li) {
      sfx("click");
      if (window.gsap) window.gsap.fromTo(li, { scale: 1.04 }, { scale: 1, duration: 0.25 });
    }
    function dragHandle(li, grip) {
      var dragging = false;
      grip.addEventListener("pointerdown", function (e) {
        if (disabled) return;
        dragging = true;
        li.classList.add("dragging");
        grip.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      grip.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        var over = document.elementFromPoint(e.clientX, e.clientY);
        var target = over && over.closest(".order-item");
        if (!target || target === li || target.parentNode !== list) return;
        var r = target.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) list.insertBefore(li, target);
        else list.insertBefore(li, target.nextElementSibling);
        sfx("click");
      });
      function end() { dragging = false; li.classList.remove("dragging"); }
      grip.addEventListener("pointerup", end);
      grip.addEventListener("pointercancel", end);
    }
    var go = submitButton(t("match.checkOrder"), function () {
      onSubmit(Array.prototype.map.call(list.children, function (li) { return li.dataset.pos; }).join(","));
    });
    area.appendChild(list);
    area.appendChild(go);
    math(list);
    return {
      setDisabled: function (off) {
        disabled = off; go.disabled = off;
        Array.prototype.forEach.call(list.querySelectorAll("button"), function (b) { b.disabled = off; });
      },
    };
  }

  // ---------------- Match the pairs ----------------
  // Tap an item on the left, then its partner on the right; a coloured line
  // joins them. Tap a joined left item again to undo.
  function matchPuzzle(area, q, onSubmit, t) {
    var n = q.left.length;
    var links = q.left.map(function () { return null; }); // left i -> right position
    var picked = null;
    var disabled = false;
    var board = el("div", "match-board");
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "match-lines");
    var colL = el("div", "match-col"), colR = el("div", "match-col");
    var lefts = q.left.map(function (text, i) {
      var b = el("button", "match-item", text); b.type = "button"; b.setAttribute("dir", "auto");
      b.addEventListener("click", function () {
        if (disabled) return;
        if (links[i] != null && picked !== i) { links[i] = null; picked = null; redraw(); sfx("click"); return; }
        picked = picked === i ? null : i;
        redraw();
      });
      colL.appendChild(b);
      return b;
    });
    var rights = q.right.map(function (text, pos) {
      var b = el("button", "match-item", text); b.type = "button"; b.setAttribute("dir", "auto");
      b.addEventListener("click", function () {
        if (disabled || picked == null) return;
        links = links.map(function (v) { return v === pos ? null : v; });
        links[picked] = pos;
        picked = null;
        sfx("click");
        redraw();
      });
      colR.appendChild(b);
      return b;
    });
    board.appendChild(svg); board.appendChild(colL); board.appendChild(colR);
    var go = submitButton(t("match.checkPairs"), function () {
      if (links.some(function (v) { return v == null; })) return;
      onSubmit(links.join(","));
    });

    function redraw() {
      lefts.forEach(function (b, i) {
        b.classList.toggle("picked", picked === i);
        b.style.setProperty("--pair", links[i] != null ? PAIR_COLORS[i % PAIR_COLORS.length] : "transparent");
        b.classList.toggle("linked", links[i] != null);
      });
      rights.forEach(function (b, pos) {
        var owner = links.indexOf(pos);
        b.style.setProperty("--pair", owner !== -1 ? PAIR_COLORS[owner % PAIR_COLORS.length] : "transparent");
        b.classList.toggle("linked", owner !== -1);
        b.classList.toggle("ready", picked != null);
      });
      var box = board.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
      svg.innerHTML = links.map(function (pos, i) {
        if (pos == null) return "";
        var a = lefts[i].getBoundingClientRect(), b = rights[pos].getBoundingClientRect();
        var rtl = getComputedStyle(board).direction === "rtl";
        var x1 = (rtl ? a.left : a.right) - box.left, y1 = a.top + a.height / 2 - box.top;
        var x2 = (rtl ? b.right : b.left) - box.left, y2 = b.top + b.height / 2 - box.top;
        return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + PAIR_COLORS[i % PAIR_COLORS.length] + '" stroke-width="4" stroke-linecap="round"/>';
      }).join("");
      go.disabled = disabled || links.some(function (v) { return v == null; });
    }
    area.appendChild(board);
    area.appendChild(go);
    math(board);
    // Lines follow the layout (KaTeX and fonts can resize the items).
    setTimeout(redraw, 60);
    onResize(redraw);
    return { setDisabled: function (off) { disabled = off; lefts.concat(rights).forEach(function (b) { b.disabled = off; }); redraw(); } };
  }

  // ---------------- Graph ----------------
  // The curve of f, a point you drag along it, and its tangent line with the
  // slope read out live. Lock in the x where the condition holds.
  function graphPuzzle(area, q, onSubmit, t) {
    var parsed = window.MathExpr.parse(q.fn);
    var f = parsed.ok ? parsed.fn : function () { return NaN; };
    var wrap = el("div", "graph-wrap");
    var canvas = el("canvas", "graph-canvas");
    var readout = el("div", "graph-readout");
    readout.setAttribute("dir", "ltr");
    var nudge = el("div", "graph-nudge");
    var left = el("button", "order-move", "◀"); left.type = "button";
    var right = el("button", "order-move", "▶"); right.type = "button";
    nudge.appendChild(left); nudge.appendChild(readout); nudge.appendChild(right);
    wrap.appendChild(canvas);
    area.appendChild(wrap);
    area.appendChild(nudge);
    var disabled = false;
    var span = q.xmax - q.xmin;
    var step = span / 200;
    var x = q.xmin + span * 0.15;

    // y-range from the curve itself, ignoring spikes near asymptotes.
    var ys = [];
    for (var i = 0; i <= 200; i++) {
      var v = f(q.xmin + (span * i) / 200);
      if (isFinite(v)) ys.push(v);
    }
    ys.sort(function (a, b) { return a - b; });
    var ylo = ys.length ? ys[Math.floor(ys.length * 0.03)] : -5, yhi = ys.length ? ys[Math.ceil(ys.length * 0.97) - 1] : 5;
    if (yhi - ylo < 1e-6) { ylo -= 1; yhi += 1; }
    var pad = (yhi - ylo) * 0.15;
    ylo -= pad; yhi += pad;
    if (ylo > 0) ylo = Math.min(ylo, -pad * 0.5);
    if (yhi < 0) yhi = Math.max(yhi, pad * 0.5);

    function slopeAt(x0) { var h = span * 1e-5; return (f(x0 + h) - f(x0 - h)) / (2 * h); }
    function round2(v) { return Math.round(v * 100) / 100; }

    function draw() {
      var w = wrap.clientWidth || 320, h = Math.round(w * 0.72), dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.height = h + "px";
      var c = canvas.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      var px = function (xv) { return ((xv - q.xmin) / span) * w; };
      var py = function (yv) { return h - ((yv - ylo) / (yhi - ylo)) * h; };
      c.fillStyle = "#0E1730"; c.fillRect(0, 0, w, h);
      // grid every whole unit when that is not too dense
      c.strokeStyle = "rgba(244,241,232,0.08)"; c.lineWidth = 1;
      var gx = span <= 24 ? 1 : Math.pow(10, Math.floor(Math.log10(span / 4)));
      for (var gv = Math.ceil(q.xmin / gx) * gx; gv <= q.xmax; gv += gx) { c.beginPath(); c.moveTo(px(gv), 0); c.lineTo(px(gv), h); c.stroke(); }
      var gy = Math.pow(10, Math.floor(Math.log10((yhi - ylo) / 4)));
      for (var hv = Math.ceil(ylo / gy) * gy; hv <= yhi; hv += gy) { c.beginPath(); c.moveTo(0, py(hv)); c.lineTo(w, py(hv)); c.stroke(); }
      c.strokeStyle = "rgba(244,241,232,0.45)"; c.lineWidth = 1.5;
      if (q.xmin < 0 && q.xmax > 0) { c.beginPath(); c.moveTo(px(0), 0); c.lineTo(px(0), h); c.stroke(); }
      if (ylo < 0 && yhi > 0) { c.beginPath(); c.moveTo(0, py(0)); c.lineTo(w, py(0)); c.stroke(); }
      // the curve, broken at gaps and asymptotes
      c.strokeStyle = "#2E86FF"; c.lineWidth = 3; c.beginPath();
      var pen = false, lastY = null;
      for (var sx = 0; sx <= w; sx += 2) {
        var xv = q.xmin + (sx / w) * span, yv = f(xv);
        var ok = isFinite(yv) && yv > ylo - (yhi - ylo) * 2 && yv < yhi + (yhi - ylo) * 2;
        if (ok && pen && lastY != null && Math.abs(py(yv) - lastY) > h) ok = false;
        if (!ok) { pen = false; lastY = null; continue; }
        if (pen) c.lineTo(sx, py(yv)); else c.moveTo(sx, py(yv));
        pen = true; lastY = py(yv);
      }
      c.stroke();
      // the tangent line and the point
      var y0 = f(x), m = slopeAt(x);
      if (isFinite(y0)) {
        if (q.slope && isFinite(m)) {
          var dx = span * 0.18;
          c.strokeStyle = "#FFC145"; c.lineWidth = 2.5; c.setLineDash([8, 6]);
          c.beginPath(); c.moveTo(px(x - dx), py(y0 - m * dx)); c.lineTo(px(x + dx), py(y0 + m * dx)); c.stroke();
          c.setLineDash([]);
        }
        c.fillStyle = "#FFC145"; c.strokeStyle = "#0E1730"; c.lineWidth = 3;
        c.beginPath(); c.arc(px(x), py(y0), 11, 0, Math.PI * 2); c.fill(); c.stroke();
      }
      readout.textContent = "x = " + round2(x).toFixed(2) + (q.slope ? "  ·  " + t("match.slope") + " = " + (isFinite(m) ? round2(m).toFixed(2) : "—") : "");
    }

    function setX(v) {
      x = Math.max(q.xmin, Math.min(q.xmax, round2(v)));
      draw();
    }
    function fromPointer(e) {
      var r = canvas.getBoundingClientRect();
      setX(q.xmin + ((e.clientX - r.left) / r.width) * span);
    }
    var down = false;
    canvas.addEventListener("pointerdown", function (e) { if (disabled) return; down = true; canvas.setPointerCapture(e.pointerId); fromPointer(e); });
    canvas.addEventListener("pointermove", function (e) { if (down) fromPointer(e); });
    canvas.addEventListener("pointerup", function () { down = false; sfx("click"); });
    canvas.addEventListener("pointercancel", function () { down = false; });
    left.addEventListener("click", function () { setX(x - step); sfx("click"); });
    right.addEventListener("click", function () { setX(x + step); sfx("click"); });
    var go = submitButton(t("match.lockPoint"), function () { onSubmit(round2(x).toFixed(2)); });
    area.appendChild(go);
    setTimeout(draw, 0);
    onResize(draw);
    return { setDisabled: function (off) { disabled = off; left.disabled = off; right.disabled = off; go.disabled = off; canvas.classList.toggle("disabled", off); } };
  }

  // Fills area for question q; t(key) looks up games.teamEscape.* text.
  function render(area, q, onSubmit, t) {
    resizers.forEach(function (fn) { window.removeEventListener("resize", fn); });
    resizers = [];
    area.innerHTML = "";
    area.className = "puzzle puzzle-" + q.type + (q.lock ? " puzzle-lock" : "");
    if (q.type === "short-answer" && q.lock) return lockPuzzle(area, q, onSubmit, t);
    if (q.type === "expression") return expressionPuzzle(area, q, onSubmit, t);
    if (q.type === "multiple-choice") return choicePuzzle(area, q, onSubmit, t);
    if (q.type === "order") return orderPuzzle(area, q, onSubmit, t);
    if (q.type === "match") return matchPuzzle(area, q, onSubmit, t);
    if (q.type === "graph") return graphPuzzle(area, q, onSubmit, t);
    return textPuzzle(area, q, onSubmit, t);
  }

  window.EscapePuzzles = { render: render, dial: dial };
})();
