// A small, safe math expression parser for answers and graphs in x: numbers,
// x, pi, e, + - * / ^, brackets, |abs|, implicit multiplication (3x^2,
// 2(x+1), x sin x) and the functions below, including powers such as
// sec^2 x. No eval: the text becomes a tree that is evaluated or turned into
// LaTeX. Shared by the server (checking answers) and the browser (graphs,
// answer previews), so both read an expression the same way.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MathExpr = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sec: function (v) { return 1 / Math.cos(v); },
    csc: function (v) { return 1 / Math.sin(v); },
    cot: function (v) { return 1 / Math.tan(v); },
    arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
    sqrt: Math.sqrt, ln: Math.log, log: Math.log10, exp: Math.exp, abs: Math.abs,
  };
  // Longest names first, so "arcsin" is not read as "a" "r" "c" "sin".
  var NAMES = Object.keys(FUNCS).concat(["pi", "x", "e"]).sort(function (a, b) { return b.length - a.length; });
  var MAX_LEN = 200;

  function tokenize(src) {
    var s = String(src == null ? "" : src)
      .replace(/[−–]/g, "-").replace(/[·×⋅]/g, "*").replace(/÷/g, "/")
      .replace(/π/g, "pi").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\*\*/g, "^")
      .toLowerCase();
    if (s.length > MAX_LEN) throw new Error("too-long");
    var out = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      var num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (num) { out.push({ k: "num", v: parseFloat(num[1]) }); i += num[1].length; continue; }
      if (/[a-z]/.test(c)) {
        var name = null;
        for (var n = 0; n < NAMES.length; n++) {
          if (s.substr(i, NAMES[n].length) === NAMES[n]) { name = NAMES[n]; break; }
        }
        if (!name) throw new Error("unknown-name");
        out.push(FUNCS[name] ? { k: "fn", v: name } : { k: "id", v: name });
        i += name.length;
        continue;
      }
      if ("+-*/^()|[]{}".indexOf(c) !== -1) {
        out.push({ k: c === "[" || c === "{" ? "(" : c === "]" || c === "}" ? ")" : c });
        i++;
        continue;
      }
      throw new Error("bad-char");
    }
    return out;
  }

  function Parser(tokens) { this.t = tokens; this.i = 0; this.absDepth = 0; }
  Parser.prototype.peek = function () { return this.t[this.i]; };
  Parser.prototype.next = function () { return this.t[this.i++]; };
  Parser.prototype.expect = function (k) {
    var tok = this.next();
    if (!tok || tok.k !== k) throw new Error("expected-" + k);
  };

  Parser.prototype.expr = function () {
    var node = this.term();
    while (this.peek() && (this.peek().k === "+" || this.peek().k === "-")) {
      var op = this.next().k;
      node = { t: "bin", op: op, a: node, b: this.term() };
    }
    return node;
  };

  // A token that can start a factor with no operator in front: 2x, x(x+1), 3 sin x.
  Parser.prototype.startsFactor = function () {
    var tok = this.peek();
    if (!tok) return false;
    if (tok.k === "|") return this.absDepth === 0; // inside |...| a bar closes
    return tok.k === "num" || tok.k === "id" || tok.k === "fn" || tok.k === "(";
  };

  Parser.prototype.term = function () {
    var node = this.unary();
    for (;;) {
      var tok = this.peek();
      if (tok && (tok.k === "*" || tok.k === "/")) {
        this.next();
        node = { t: "bin", op: tok.k, a: node, b: this.unary() };
      } else if (this.startsFactor()) {
        node = { t: "bin", op: "*", a: node, b: this.power(), implicit: true };
      } else {
        return node;
      }
    }
  };

  Parser.prototype.unary = function () {
    var tok = this.peek();
    if (tok && tok.k === "-") { this.next(); return { t: "neg", a: this.unary() }; }
    if (tok && tok.k === "+") { this.next(); return this.unary(); }
    return this.power();
  };

  Parser.prototype.power = function () {
    var base = this.primary();
    if (this.peek() && this.peek().k === "^") {
      this.next();
      return { t: "bin", op: "^", a: base, b: this.unary() };
    }
    return base;
  };

  Parser.prototype.primary = function () {
    var tok = this.next();
    if (!tok) throw new Error("unexpected-end");
    if (tok.k === "num") return { t: "num", v: tok.v };
    if (tok.k === "id") return tok.v === "x" ? { t: "x" } : { t: "const", name: tok.v };
    if (tok.k === "(") {
      var inner = this.expr();
      this.expect(")");
      return { t: "group", a: inner };
    }
    if (tok.k === "|") {
      this.absDepth++;
      var body = this.expr();
      this.absDepth--;
      this.expect("|");
      return { t: "fn", name: "abs", a: body };
    }
    if (tok.k === "fn") {
      // sin^2 x and sin^2(x) mean (sin x)^2.
      var pow = null;
      if (this.peek() && this.peek().k === "^") {
        this.next();
        var p = this.next();
        if (!p || p.k !== "num") throw new Error("bad-power");
        pow = p.v;
      }
      var arg;
      if (this.peek() && this.peek().k === "(") {
        this.next();
        arg = this.expr();
        this.expect(")");
      } else {
        // Without brackets the argument runs over numbers and x, as on a
        // calculator: sin 2x is sin(2x), but sin x cos x is sin(x) cos(x).
        arg = this.power();
        while (this.peek() && (this.peek().k === "num" || this.peek().k === "id")) {
          arg = { t: "bin", op: "*", a: arg, b: this.power(), implicit: true };
        }
      }
      var call = { t: "fn", name: tok.v, a: arg };
      return pow == null ? call : { t: "bin", op: "^", a: call, b: { t: "num", v: pow }, fnPow: true };
    }
    throw new Error("unexpected-" + tok.k);
  };

  function evaluate(node, x) {
    switch (node.t) {
      case "num": return node.v;
      case "x": return x;
      case "const": return node.name === "pi" ? Math.PI : Math.E;
      case "group": return evaluate(node.a, x);
      case "neg": return -evaluate(node.a, x);
      case "fn": return FUNCS[node.name](evaluate(node.a, x));
      case "bin": {
        var a = evaluate(node.a, x), b = evaluate(node.b, x);
        if (node.op === "+") return a + b;
        if (node.op === "-") return a - b;
        if (node.op === "*") return a * b;
        if (node.op === "/") return a / b;
        return Math.pow(a, b);
      }
    }
    return NaN;
  }

  function num(v) {
    return String(Math.round(v * 1e6) / 1e6);
  }

  var TEX_FN = { sin: "\\sin", cos: "\\cos", tan: "\\tan", sec: "\\sec", csc: "\\csc", cot: "\\cot", arcsin: "\\arcsin", arccos: "\\arccos", arctan: "\\arctan", ln: "\\ln", log: "\\log", exp: "\\exp" };

  function tex(node) {
    switch (node.t) {
      case "num": return num(node.v);
      case "x": return "x";
      case "const": return node.name === "pi" ? "\\pi" : "e";
      case "group": return "\\left(" + tex(node.a) + "\\right)";
      case "neg": return "-" + tex(node.a);
      case "fn":
        if (node.name === "sqrt") return "\\sqrt{" + tex(node.a) + "}";
        if (node.name === "abs") return "\\left|" + tex(node.a) + "\\right|";
        return TEX_FN[node.name] + "\\left(" + tex(node.a) + "\\right)";
      case "bin":
        if (node.op === "/") return "\\frac{" + tex(stripGroup(node.a)) + "}{" + tex(stripGroup(node.b)) + "}";
        if (node.op === "^") {
          if (node.fnPow) return TEX_FN[node.a.name] + "^{" + tex(node.b) + "}\\left(" + tex(node.a.a) + "\\right)";
          return tex(node.a) + "^{" + tex(stripGroup(node.b)) + "}";
        }
        if (node.op === "*") return tex(node.a) + (node.implicit && !startsWithDigit(node.b) ? " " : " \\cdot ") + tex(node.b);
        return tex(node.a) + " " + node.op + " " + tex(node.b);
    }
    return "";
  }
  function stripGroup(node) { return node.t === "group" ? node.a : node; }
  function startsWithDigit(node) {
    while (node.t === "bin") node = node.a;
    return node.t === "num";
  }

  // { ok, fn(x), tex, error }. A parse error never throws to the caller.
  function parse(src) {
    try {
      var tokens = tokenize(src);
      if (!tokens.length) return { ok: false, error: "empty" };
      var p = new Parser(tokens);
      var tree = p.expr();
      if (p.i < tokens.length) throw new Error("trailing");
      return { ok: true, fn: function (x) { return evaluate(tree, x); }, tex: tex(tree) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // Two expressions are equivalent when they agree wherever both are defined,
  // checked at spread-out sample points (at least 4 must be usable).
  var SAMPLES = [-2.31, -1.37, -0.73, -0.29, 0.41, 0.83, 1.19, 1.61, 2.27, 2.93];
  function equivalent(a, b) {
    var pa = typeof a === "string" ? parse(a) : a;
    var pb = typeof b === "string" ? parse(b) : b;
    if (!pa.ok || !pb.ok) return false;
    var used = 0;
    for (var i = 0; i < SAMPLES.length; i++) {
      var va = pa.fn(SAMPLES[i]), vb = pb.fn(SAMPLES[i]);
      var fa = isFinite(va) && Math.abs(va) < 1e8, fb = isFinite(vb) && Math.abs(vb) < 1e8;
      if (fa !== fb) {
        // Defined for one but not the other only counts near an asymptote.
        if (Math.abs(fa ? va : vb) < 1e4) return false;
        continue;
      }
      if (!fa) continue;
      if (Math.abs(va - vb) > 1e-6 * Math.max(1, Math.abs(va), Math.abs(vb))) return false;
      used++;
    }
    return used >= 4;
  }

  return { parse: parse, equivalent: equivalent };
});
