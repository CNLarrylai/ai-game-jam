/* sim.cjs (WotW) — 自测/平衡。以"浏览器方式"加载 gamedata.js + engine.js(提供 window)。
   资源:life/supply/sanity/concealment。run: node scripts/sim.cjs [gamesPerPolicy] */
const fs = require("fs"), vm = require("vm"), path = require("path");
const dir = path.join(__dirname, "..", "frontend", "game");
const sandbox = { window: {}, console: console, Math: Math, Object: Object, JSON: JSON };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "gamedata.js"), "utf8"), sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "engine.js"), "utf8"), sandbox);
const GAME = sandbox.window.GAME;
const E = sandbox.window.Engine;
const RES = GAME.res_def.map((r) => r.id); // [life,supply,sanity,concealment]

const N = parseInt(process.argv[2] || "3000", 10);

function deterministicCosts(choice, res) {
  const r = Object.assign({}, res);
  for (const c of choice.costs) r[c.res] = Math.max(0, Math.min(E.TUNING.clampMax, (r[c.res] || 0) + c.d));
  return r;
}
function pickChoice(policy, node, res) {
  const cs = node.choices;
  if (policy === "random") return cs[Math.floor(Math.random() * cs.length)];
  if (policy === "reckless") { const risky = cs.filter((c) => c.risk); return (risky.length ? risky : cs)[0]; }
  let best = null, bestScore = -1e9;
  for (const c of cs) {
    const r = deterministicCosts(c, res);
    const vals = RES.map((k) => r[k]);
    const mn = Math.min.apply(null, vals), sum = vals.reduce((a, b) => a + b, 0);
    const score = mn * 10 + sum + (c.risk ? -2 : 0);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}
function runOne(policy, donorOn) {
  let s = E.newGame(GAME), guard = 0;
  while (s.status === "playing" && guard++ < 200) {
    const node = E.getNode(GAME, s);
    const choice = pickChoice(policy, node, s.res);
    const poll = E.pollFor(GAME, s.node);
    const followedAudience = policy !== "reckless" && !!poll && Math.random() < 0.6;
    const audienceResonance = Math.random() < 0.45;
    s = E.choose(GAME, s, choice.id, { followedAudience, audienceResonance, donor: donorOn }).state;
  }
  return s;
}
function stats(policy, donorOn) {
  let won = 0, dead = 0, steps = 0, finSum = 0, wonRuns = 0;
  const byCause = {}; RES.forEach((k) => (byCause[k] = 0));
  for (let i = 0; i < N; i++) {
    const s = runOne(policy, donorOn);
    steps += s.steps;
    if (s.status === "won") { won++; wonRuns++; finSum += RES.reduce((a, k) => a + s.res[k], 0); }
    else if (s.status === "dead") { dead++; byCause[s.deaths[0]] = (byCause[s.deaths[0]] || 0) + 1; }
  }
  const pct = (x) => (100 * x / N).toFixed(0) + "%";
  const cause = RES.map((k) => `${k[0]}${(100 * byCause[k] / N).toFixed(0)}`).join(" ");
  return { policy: policy + (donorOn ? "" : " (no-donor)"), win: pct(won), die: pct(dead),
    cause, avgSteps: (steps / N).toFixed(1), winSum: wonRuns ? (finSum / wonRuns).toFixed(1) : "-" };
}

console.log(`campaign = ${GAME.campaign.length} nodes | ${N} games/policy | res: ${RES.join("/")}`);
console.log("TUNING:", JSON.stringify(E.TUNING));
const rows = [stats("random", true), stats("cautious", true), stats("reckless", true), stats("random", false), stats("cautious", false)];
console.log("\n" + "policy".padEnd(22) + "win".padEnd(6) + "die".padEnd(6) + "death-cause(l/s/a/c)".padEnd(24) + "steps".padEnd(7) + "winSum");
for (const r of rows) console.log(r.policy.padEnd(22) + r.win.padEnd(6) + r.die.padEnd(6) + r.cause.padEnd(24) + r.avgSteps.padEnd(7) + r.winSum);
