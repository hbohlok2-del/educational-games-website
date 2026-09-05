const TIERS = [
  { id: "rookie", label: "Rookie", blurb: "Addition & subtraction, numbers up to 20" },
  { id: "varsity", label: "Varsity", blurb: "+ − × ÷ and fractions, larger numbers" },
  { id: "champion", label: "Champion", blurb: "Negatives, order of operations, exponents" },
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

function reduceFraction(num, den) {
  if (den < 0) { num = -num; den = -den; }
  const g = gcd(num, den);
  return [num / g, den / g];
}

function fmt(n) {
  return String(n).replace("-", "−");
}

function makeNumberProblem(display, answer) {
  return {
    display,
    checkAnswer(input) {
      const v = Number(String(input).trim());
      return Number.isFinite(v) && v === answer;
    },
  };
}

function makeFractionProblem(display, num, den) {
  const [n, d] = reduceFraction(num, den);
  const decimal = n / d;
  return {
    display,
    checkAnswer(input) {
      const raw = String(input).trim();
      if (!raw) return false;
      if (raw.includes("/")) {
        const [pn, pd] = raw.split("/").map((s) => Number(s.trim()));
        if (!Number.isFinite(pn) || !Number.isFinite(pd) || pd === 0) return false;
        const [rn, rd] = reduceFraction(pn, pd);
        return rn === n && rd === d;
      }
      const v = Number(raw);
      return Number.isFinite(v) && Math.abs(v - decimal) < 1e-6;
    },
  };
}

function genRookie() {
  const op = Math.random() < 0.55 ? "+" : "-";
  let a = randInt(1, 20);
  let b = randInt(0, 20);
  if (op === "-" && b > a) [a, b] = [b, a];
  const answer = op === "+" ? a + b : a - b;
  return makeNumberProblem(`${fmt(a)} ${op} ${fmt(b)}`, answer);
}

function genVarsity() {
  const r = Math.random();
  if (r < 0.2) {
    const den = [2, 3, 4, 5, 6, 8, 10, 12][randInt(0, 7)];
    const n1 = randInt(1, den - 1);
    const n2 = randInt(1, den - 1);
    return makeFractionProblem(`${n1}/${den} + ${n2}/${den}`, n1 + n2, den);
  }
  if (r < 0.45) {
    const divisor = randInt(2, 12);
    const quotient = randInt(2, 12);
    return makeNumberProblem(`${divisor * quotient} ÷ ${divisor}`, quotient);
  }
  if (r < 0.7) {
    const a = randInt(2, 12);
    const b = randInt(2, 12);
    return makeNumberProblem(`${a} × ${b}`, a * b);
  }
  const op = Math.random() < 0.5 ? "+" : "-";
  let a = randInt(10, 100);
  let b = randInt(10, 100);
  if (op === "-" && b > a) [a, b] = [b, a];
  return makeNumberProblem(`${fmt(a)} ${op} ${fmt(b)}`, op === "+" ? a + b : a - b);
}

function genChampion() {
  const kind = randInt(0, 3);
  if (kind === 0) {
    const a = randInt(-12, 12);
    const b = randInt(2, 9);
    const c = randInt(2, 9);
    return makeNumberProblem(`${fmt(a)} + ${b} × ${c}`, a + b * c);
  }
  if (kind === 1) {
    const a = randInt(-20, 20);
    const b = randInt(-20, 20);
    const op = Math.random() < 0.5 ? "+" : "-";
    return makeNumberProblem(`(${fmt(a)}) ${op} (${fmt(b)})`, op === "+" ? a + b : a - b);
  }
  if (kind === 2) {
    const base = randInt(2, 9);
    const exp = randInt(2, 3);
    return makeNumberProblem(`${base}^${exp}`, Math.pow(base, exp));
  }
  const a = randInt(-9, 9);
  const b = randInt(-9, 9);
  const c = randInt(2, 8);
  return makeNumberProblem(`(${fmt(a)} + ${fmt(b)}) × ${c}`, (a + b) * c);
}

function generateProblem(tier) {
  if (tier === "varsity") return genVarsity();
  if (tier === "champion") return genChampion();
  return genRookie();
}
