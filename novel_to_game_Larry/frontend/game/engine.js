/* engine.js — 末日生存游戏内核(纯逻辑,浏览器/Node 双用)
   单人:资源经济 + risk 揭晓 + next 分支 + 死亡/通关。
   观众:poll 民意(顺应+1士气)、predict 押注(共鸣+1士气)、金主打赏(给最低资源回血)。
   solo 模式观众为模拟,multiplayer 可把真实投票/打赏接到同样的钩子。 */
(function () {
  var TUNING = {
    clampMax: 10,
    deathAt: 0,            // 任一资源 <= 0 即出局
    donorEvery: 4,         // 每 N 次抉择,金主给最低资源回血(模拟观众支援)
    donorAmount: 1,
    pollFollowBonus: 1,    // 顺应观众民意 → 士气 +1
    predictResonanceBonus: 1, // 你的结果与观众多数押注一致 → 士气 +1
  };

  var clamp = function (v) { return Math.max(0, Math.min(TUNING.clampMax, v)); };
  function lowestRes(res) { return Object.keys(res).reduce(function (a, b) { return res[b] < res[a] ? b : a; }); }

  function newGame(GAME) {
    return {
      res: Object.assign({}, GAME.start_res),
      anchorIdx: 0, node: GAME.campaign[0], visited: {},
      status: "playing", steps: 0, deaths: [], donorTick: 0,
    };
  }
  function getNode(GAME, s) { return GAME.nodes[s.node]; }

  function predictFor(GAME, nodeId) {
    for (var i = 0; i < GAME.interactions.length; i++) {
      var it = GAME.interactions[i];
      if (it.type === "predict" && it.setup_node === nodeId) return it;
    }
    return null;
  }
  function pollFor(GAME, nodeId) {
    var ch = GAME.nodeChapter[nodeId];
    for (var i = 0; i < GAME.interactions.length; i++) {
      var it = GAME.interactions[i];
      if (it.type === "poll" && it.chapter === ch) return it;
    }
    return null;
  }
  function loreFor(GAME, nodeId) {
    var ch = GAME.nodeChapter[nodeId], out = [];
    for (var i = 0; i < GAME.interactions.length; i++) {
      var it = GAME.interactions[i];
      if (it.type === "lore" && it.chapter === ch) out.push(it);
    }
    return out;
  }
  function nextAnchorIdx(GAME, s) {
    for (var i = s.anchorIdx + 1; i < GAME.campaign.length; i++) {
      if (!s.visited[GAME.campaign[i]]) return i;
    }
    return -1;
  }

  // 应用一次抉择;返回 {state, reveal}。不修改入参。
  // opts: { followedAudience:bool, audienceResonance:bool, donor:bool }
  function choose(GAME, s, choiceId, opts) {
    opts = opts || {};
    var node = getNode(GAME, s);
    var choice = null;
    for (var i = 0; i < node.choices.length; i++) if (node.choices[i].id === choiceId) choice = node.choices[i];
    if (!choice) return { state: s, reveal: null };

    var st = { res: Object.assign({}, s.res), anchorIdx: s.anchorIdx, node: s.node,
      visited: Object.assign({}, s.visited), status: "playing", steps: s.steps,
      deaths: [], donorTick: s.donorTick };

    var bonus = {};
    if (opts.followedAudience) { st.res.morale = clamp(st.res.morale + TUNING.pollFollowBonus); bonus.poll = TUNING.pollFollowBonus; }
    if (opts.audienceResonance) { st.res.morale = clamp(st.res.morale + TUNING.predictResonanceBonus); bonus.resonance = TUNING.predictResonanceBonus; }

    for (var j = 0; j < choice.costs.length; j++) {
      var c = choice.costs[j];
      st.res[c.res] = clamp((st.res[c.res] || 0) + c.d);
    }
    st.steps++; st.visited[s.node] = true;

    // 金主打赏(模拟观众支援 / 真实打赏)
    var donor = null;
    st.donorTick++;
    if (opts.donor !== false && st.donorTick >= TUNING.donorEvery) {
      st.donorTick = 0;
      var lo = lowestRes(st.res);
      if (st.res[lo] < TUNING.clampMax) { st.res[lo] = clamp(st.res[lo] + TUNING.donorAmount); donor = { res: lo, d: TUNING.donorAmount }; }
    }

    // 死亡?
    var dead = [];
    for (var k in st.res) if (st.res[k] <= TUNING.deathAt) dead.push(k);
    if (dead.length) { st.status = "dead"; st.deaths = dead; return { state: st, reveal: { choice: choice, donor: donor, bonus: bonus } }; }

    // 推进:线性走主线锚点(每章一卡,节奏紧凑),走完即通关
    var ai = nextAnchorIdx(GAME, st);
    if (ai < 0) { st.status = "won"; }
    else { st.anchorIdx = ai; st.node = GAME.campaign[ai]; }
    return { state: st, reveal: { choice: choice, donor: donor, bonus: bonus } };
  }

  // 结局描述
  function ending(GAME, s) {
    if (s.status === "dead") {
      var cause = s.deaths[0];
      var map = {
        food: { title: "饿殍", body: "存粮见了底。在某个无人的清晨,你们没能再站起来。" },
        health: { title: "疫殁", body: "病气终究漫过了高墙。倒下的人,一个接着一个。" },
        morale: { title: "心死", body: "活下去的理由先你一步死了。你停在了路上,不再往前。" },
      };
      return { kind: "dead", cause: cause, title: (map[cause] || {}).title, body: (map[cause] || {}).body };
    }
    // won
    var r = s.res, sum = r.food + r.health + r.morale;
    if (sum >= 18) return { kind: "won", title: "幸存者", body: "你护住了所剩无几的人,撑到了瘟疫退去的那一天。废墟之上,人类的名字得以延续。" };
    if (r.morale <= 2) return { kind: "won", title: "最后的人", body: "你活了下来,身边却已空无一人。你提笔写下这一切,署名:世界上最后的人。" };
    return { kind: "won", title: "余生", body: "你们一路走到了尽头。失去太多,但毕竟,还活着。" };
  }

  var API = { TUNING: TUNING, newGame: newGame, getNode: getNode, choose: choose, ending: ending,
    predictFor: predictFor, pollFor: pollFor, loreFor: loreFor, lowestRes: lowestRes };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.Engine = API;
})();
