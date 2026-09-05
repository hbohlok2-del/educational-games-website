const LEVELS = [
  { id: "early", label: "Early Elementary (Grades 1-3)" },
  { id: "upper", label: "Upper Elementary (Grades 4-6)" },
  { id: "middle", label: "Middle School (Grades 7-9)" },
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

function fractionString(num, den) {
  const [n, d] = reduceFraction(num, den);
  return d === 1 ? String(n) : `${n}/${d}`;
}

function makeNumberProblem(text, answer) {
  return {
    text,
    type: "number",
    checkAnswer(input) {
      const v = Number(String(input).trim());
      return Number.isFinite(v) && v === answer;
    },
  };
}

function makeFractionProblem(text, num, den) {
  const [n, d] = reduceFraction(num, den);
  const decimal = n / d;
  return {
    text,
    type: "fraction",
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

function generateEarly() {
  const op = Math.random() < 0.5 ? "+" : "-";
  let a = randInt(0, 20);
  let b = randInt(0, 20);
  if (op === "-" && b > a) [a, b] = [b, a];
  const answer = op === "+" ? a + b : a - b;
  return makeNumberProblem(`${a} ${op} ${b}`, answer);
}

function generateUpper() {
  const kind = ["+", "-", "*", "/", "frac"][randInt(0, 4)];
  if (kind === "frac") {
    const den = [2, 3, 4, 5, 6, 8, 10, 12][randInt(0, 7)];
    const n1 = randInt(1, den - 1);
    const n2 = randInt(1, den - 1);
    return makeFractionProblem(`${n1}/${den} + ${n2}/${den}`, n1 + n2, den);
  }
  if (kind === "/") {
    const divisor = randInt(2, 12);
    const quotient = randInt(2, 12);
    return makeNumberProblem(`${divisor * quotient} / ${divisor}`, quotient);
  }
  if (kind === "*") {
    const a = randInt(2, 12);
    const b = randInt(2, 12);
    return makeNumberProblem(`${a} * ${b}`, a * b);
  }
  let a = randInt(10, 100);
  let b = randInt(10, 100);
  if (kind === "-" && b > a) [a, b] = [b, a];
  return makeNumberProblem(`${a} ${kind} ${b}`, kind === "+" ? a + b : a - b);
}

function generateMiddle() {
  const kind = ["negative", "order", "exponent"][randInt(0, 2)];
  if (kind === "negative") {
    const op = Math.random() < 0.5 ? "+" : "-";
    const a = randInt(-20, 20);
    const b = randInt(-20, 20);
    const answer = op === "+" ? a + b : a - b;
    return makeNumberProblem(`(${a}) ${op} (${b})`, answer);
  }
  if (kind === "exponent") {
    const base = randInt(2, 9);
    const exp = randInt(2, 3);
    return makeNumberProblem(`${base}^${exp}`, Math.pow(base, exp));
  }
  const a = randInt(2, 12);
  const b = randInt(2, 12);
  const c = randInt(2, 12);
  const useMinus = Math.random() < 0.5;
  const op = useMinus ? "-" : "+";
  const answer = useMinus ? a - b * c : a + b * c;
  return makeNumberProblem(`${a} ${op} ${b} * ${c}`, answer);
}

function generateProblem(difficulty) {
  if (difficulty === "upper") return generateUpper();
  if (difficulty === "middle") return generateMiddle();
  return generateEarly();
}
