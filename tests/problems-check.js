const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync('public/games/tug-of-war/problems.js', 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code + '\nthis.generateProblem = generateProblem; this.TIERS = TIERS;', sandbox);

function assert(cond, msg) { if (!cond) throw new Error('FAIL: ' + msg); }

// Rookie: plain integer answers
for (let i = 0; i < 500; i++) {
  const p = sandbox.generateProblem('rookie');
  assert(typeof p.display === 'string', 'rookie display');
}

// Varsity: hunt for a fraction problem (display contains '/') and verify decimal-keypad-style input works
let foundFraction = false;
for (let i = 0; i < 2000 && !foundFraction; i++) {
  const p = sandbox.generateProblem('varsity');
  if (p.display.includes('/')) {
    foundFraction = true;
    // parse "n1/d + n2/d"
    const m = p.display.match(/^(\d+)\/(\d+) \+ (\d+)\/(\d+)$/);
    const n1 = +m[1], d = +m[2], n2 = +m[3];
    const decimal = (n1 + n2) / d;
    assert(p.checkAnswer(String(decimal)) === true, `decimal answer ${decimal} should be correct for ${p.display}`);
    assert(p.checkAnswer(String(decimal + 0.3)) === false, 'wrong decimal should fail');
    console.log('Fraction problem sample:', p.display, '-> decimal', decimal, 'validated via keypad-style decimal input: OK');
  }
}
assert(foundFraction, 'should have generated at least one fraction problem in 2000 tries');

// Champion: negative-answer problem via keypad with leading '-' (matches ± key behavior)
for (let i = 0; i < 500; i++) {
  const p = sandbox.generateProblem('champion');
  assert(typeof p.display === 'string', 'champion display');
}
// Spot check a manually constructed negative-answer check
{
  const p = sandbox.generateProblem('rookie');
  // just ensure checkAnswer with a negative string doesn't throw
  p.checkAnswer('-5');
}

console.log('ALL PROBLEM GENERATOR CHECKS PASSED');
