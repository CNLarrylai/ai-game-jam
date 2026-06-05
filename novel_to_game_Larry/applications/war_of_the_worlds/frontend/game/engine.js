/* engine.js (WotW) — 末日生存游戏内核(纯逻辑,浏览器/Node 双用)
   资源:life / supply / sanity / concealment。
   单人:资源经济 + risk 揭晓 + next 分支 + 死亡/通关。
   观众:poll 民意(顺应+1理智)、predict 押注(共鸣+1理智)、金主打赏(给最低资源回血)。
   solo 模式观众为模拟,multiplayer 可把真实投票/打赏接到同样的钩子。 */
(function () {
  var MORALE = "sanity";    // 本作"士气"映射到 理智(sanity);民意/共鸣加成落于此
  var TUNING = {
    clampMax: 10,
    deathAt: 0,            // 任一资源 <= 0 即出局
    donorEvery: 4,         // 每 N 次抉择,金主给最低资源回血(模拟观众支援)
    donorAmount: 1,
    pollFollowBonus: 1,    // 顺应观众民意 → 理智 +1
    predictResonanceBonus: 1, // 你的结果与观众多数押注一致 → 理智 +1
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
    if (opts.followedAudience) { st.res[MORALE] = clamp(st.res[MORALE] + TUNING.pollFollowBonus); bonus.poll = TUNING.pollFollowBonus; }
    if (opts.audienceResonance) { st.res[MORALE] = clamp(st.res[MORALE] + TUNING.predictResonanceBonus); bonus.resonance = TUNING.predictResonanceBonus; }
    if (opts.extraAdjust) { for (var ea = 0; ea < opts.extraAdjust.length; ea++) { var e = opts.extraAdjust[ea]; st.res[e.res] = clamp((st.res[e.res] || 0) + e.d); } }

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
        life: { title: "伤重不治", body: "热射线的灼伤、踩踏的内伤、长困的饥馁——身体终于撑不住了。你倒在逃亡的某一段路上,再没能站起来。" },
        supply: { title: "断给饿殍", body: "最后一口存粮也见了底。在某个无人的废墟里,你蜷着,等不到下一次搜寻的结果。" },
        sanity: { title: "精神崩溃", body: "持续的恐怖、幽闭与孤独,像牧师那样,先一步压垮了你的理智。你成了死城里又一个只会嚎叫的影子。" },
        concealment: { title: "被火星人锁定", body: "你暴露得太久。一道无形的热束转向你——这一次,你没能趴下。火光过后,只剩一摊焦痕。" },
      };
      return { kind: "dead", cause: cause, title: (map[cause] || {}).title, body: (map[cause] || {}).body };
    }
    // won — 终局总是"被微生物拯救",但状态决定底色
    var r = s.res, sum = r.life + r.supply + r.sanity + r.concealment;
    if (r.sanity <= 2) return { kind: "won", title: "活下来的疯子", body: "火星人死了——被地球最卑微的细菌所杀。你活了下来,可那些目睹的恐怖,再没离开过你。你提笔写下这一切,字里行间满是无法愈合的创伤。人类没有赢,只是活了下来。" };
    if (sum >= 26) return { kind: "won", title: "幸存者", body: "在人类一切器械都失败之后,是地球上最卑微的腐败与疾病细菌,杀死了火星人。你撑到了那一天,甚至奇迹般地,在废墟里再次见到了你的妻子。人类没有赢,只是活了下来——但你还活着。" };
    return { kind: "won", title: "余生", body: "火星人死了,被微生物所杀。你穿过了整场浩劫,失去太多,带着满身创伤走出死城。文明会重建,而你,只是个侥幸活下来的普通人。" };
  }

  var API = { TUNING: TUNING, newGame: newGame, getNode: getNode, choose: choose, ending: ending,
    predictFor: predictFor, pollFor: pollFor, loreFor: loreFor, lowestRes: lowestRes };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof window !== "undefined") window.Engine = API;
})();
