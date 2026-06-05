/* ============================================================
   audience-bot.jsx — 伪AI观众引擎 for WASTELAND LIVE
   纯客户端、零网络、确定性/伪随机地把观众评论转译成游戏事件。
   无 API key 也能跑。无 JSX、无 React 依赖。
   依赖 window.ITEMS（来自 data.jsx）做道具合成。
   暴露 window.AudienceBot —— 冻结契约见各方法注释。
   ============================================================ */

(function () {
  "use strict";

  /* ---- small utils ---- */
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function clampStat(v) {
    v = Math.round(v);
    if (v < 0) return 0;
    if (v > 100) return 100;
    return v;
  }

  /* ============================================================
     1. PERSONAS — 8 个人格
     每个 { id, user, av, kind }
     kind: creative | helper | strategist | troll | superfan
           | lurker | comedian | chatter
     ============================================================ */
  var PERSONAS = [
    { id: "p_creative", user: "脑洞核辐射", av: "🧠", kind: "creative" },
    { id: "p_helper",   user: "盖革姐姐",   av: "📟", kind: "helper" },
    { id: "p_strat",    user: "指挥官锈钉", av: "🎖️", kind: "strategist" },
    { id: "p_troll",    user: "搅屎棍2077", av: "💩", kind: "troll" },
    { id: "p_fan",      user: "应援铁皮",   av: "📣", kind: "superfan" },
    { id: "p_lurker",   user: "墙缝幽灵",   av: "🕳️", kind: "lurker" },
    { id: "p_comedian", user: "梗王哈基米", av: "🐈", kind: "comedian" },
    { id: "p_chatter",  user: "唠嗑老张",   av: "🗨️", kind: "chatter" },
  ];

  // 按 kind 快速取人格
  var BY_KIND = {};
  PERSONAS.forEach(function (p) { BY_KIND[p.kind] = p; });
  function persona(kind) { return BY_KIND[kind] || PERSONAS[0]; }

  /* ---- 轮转器：避免连续重复同一人格 ---- */
  var _rot = 0;
  function rotatePersona() {
    var p = PERSONAS[_rot % PERSONAS.length];
    _rot++;
    return p;
  }

  /* ============================================================
     2. nextComment(scene) -> { user, av, text }
     氛围评论（闲聊/应援/吐槽），不触发事件。
     ============================================================ */

  // 文案池：scene -> { kind -> [文案...] }
  // 取人格时优先轮转，并尽量用与文案匹配的人格语气。
  var AMBIENT = {
    home: [
      { kind: "chatter",    text: "这避难所装修得还行啊主播" },
      { kind: "helper",     text: "出门前记得看一眼饱腹和水" },
      { kind: "superfan",   text: "主播今天气色不错！能活到第七天！" },
      { kind: "lurker",     text: "潜水的冒个泡，加油" },
      { kind: "comedian",   text: "末日还能开播，这网速比我家强" },
      { kind: "chatter",    text: "门外那风声怪渗人的" },
      { kind: "strategist", text: "先别急着出门，物资盘一遍再说" },
      { kind: "troll",      text: "我赌主播今天熬不过晚上 哈哈" },
      { kind: "helper",     text: "理智低的话先休息一下别硬撑" },
      { kind: "superfan",   text: "冲鸭！家人们把弹幕打在公屏上" },
      { kind: "lurker",     text: "在的在的" },
      { kind: "comedian",   text: "AI都来灭世了主播还在算房租呢" },
    ],
    organize: [
      { kind: "strategist", text: "罐头留着压轴，先把快坏的吃了" },
      { kind: "helper",     text: "绷带别浪费，留给真受伤的时候" },
      { kind: "chatter",    text: "整理物资最治愈了说实话" },
      { kind: "comedian",   text: "鲱鱼罐头那味儿隔着屏幕都闻到了" },
      { kind: "lurker",     text: "默默看主播分类ing" },
      { kind: "superfan",   text: "主播这收纳能力可以去当管家了！" },
      { kind: "troll",      text: "全吃了！饿死今晚算我的" },
      { kind: "strategist", text: "废铁别扔，能换东西" },
      { kind: "helper",     text: "水比食物重要，先备够水" },
      { kind: "chatter",    text: "背包看着满满当当好有安全感" },
    ],
    destination: [
      { kind: "strategist", text: "近的地方先去，别浪费行动点" },
      { kind: "helper",     text: "危险等级高的地方记得带武器" },
      { kind: "chatter",    text: "选哪去呢 纠结" },
      { kind: "superfan",   text: "主播去哪我跟到哪！" },
      { kind: "comedian",   text: "白宫?那不得有AI总统等着你" },
      { kind: "troll",      text: "去最危险那个！要的就是刺激" },
      { kind: "lurker",     text: "投超市一票" },
      { kind: "strategist", text: "回程也要留行动点，别贪" },
      { kind: "helper",     text: "出门前确认手电带了没" },
      { kind: "chatter",    text: "外面天看着要变了" },
    ],
    explore: [
      { kind: "superfan",   text: "稳住主播！我们都在！" },
      { kind: "helper",     text: "血不多了 谨慎点翻格子" },
      { kind: "chatter",    text: "这地方好像有人来过的样子" },
      { kind: "comedian",   text: "翻开是空气我能笑一年" },
      { kind: "lurker",     text: "屏住呼吸跟着主播" },
      { kind: "troll",      text: "翻那个最暗的！肯定有怪 嘿嘿" },
      { kind: "strategist", text: "行动点只剩这几个，挑回报高的开" },
      { kind: "superfan",   text: "666 主播这波操作教科书" },
      { kind: "chatter",    text: "角落那阴影看着不对劲啊" },
      { kind: "comedian",   text: "废土探险家本家了属于是" },
      { kind: "helper",     text: "精神也得看着点，别吓崩了" },
      { kind: "lurker",     text: "好紧张...冒个泡" },
    ],
  };

  function poolFor(scene) {
    return AMBIENT[scene] || AMBIENT.home;
  }

  // 小说注入的弹幕池（来自 GAME_DATA.SCENE_COMMENTS，每条已含 user/av/text）
  function novelComments(scene) {
    var g = (typeof window !== "undefined" && window.GAME_DATA && window.GAME_DATA.SCENE_COMMENTS) || null;
    if (g && Array.isArray(g[scene]) && g[scene].length) return g[scene];
    return null;
  }

  function nextComment(scene) {
    // 优先用小说的弹幕（直接同步直播间评论到小说题材）
    var nc = novelComments(scene);
    if (nc) {
      var c = pick(nc);
      return { user: c.user || rotatePersona().user, av: c.av || "💬", text: c.text };
    }
    var pool = poolFor(scene);
    var entry = pick(pool);
    var p = (Math.random() < 0.7) ? persona(entry.kind) : rotatePersona();
    return { user: p.user, av: p.av, text: entry.text };
  }

  /* ============================================================
     3. actionableComment(scene) -> { user, av, text, kind }
     会驱动事件的创意评论。
     kind: item_summon | npc_create | event_create | environment
     ============================================================ */

  // 每条 { kind, text }；按 scene 给不同创意池，explore 最丰富。
  var ACTIONABLE = {
    home: [
      { kind: "item_summon", text: "主播门口凭空出现了一个急救包！" },
      { kind: "item_summon", text: "桌上多了一瓶矿泉水，谁放的？" },
      { kind: "npc_create",  text: "门外站着一个自称马斯克的流浪汉" },
      { kind: "event_create",text: "收音机突然自己响了，播报着什么" },
      { kind: "environment", text: "外面下起了酸雨，墙皮在脱落" },
      { kind: "item_summon", text: "床底下翻出一盒没过期的镇静剂" },
      { kind: "npc_create",  text: "一只会说话的猫从通风口钻了进来" },
      { kind: "event_create",text: "有人在敲门，节奏很奇怪" },
    ],
    organize: [
      { kind: "item_summon", text: "翻箱倒柜找到一卷绷带！" },
      { kind: "item_summon", text: "柜子深处藏着一把枪" },
      { kind: "environment", text: "突然停电了，屋里一片漆黑" },
      { kind: "event_create",text: "整理时发现墙上有前住户留的暗号" },
      { kind: "item_summon", text: "杂物堆里掉出一堆废铁零件" },
      { kind: "npc_create",  text: "储物间里蹲着个吓人一跳的拾荒小孩" },
      { kind: "item_summon", text: "找到一桶军用罐头！" },
    ],
    destination: [
      { kind: "event_create",text: "地图上空投了一箱补给，谁先到归谁" },
      { kind: "environment", text: "通往超市的路上刮起了辐射沙暴" },
      { kind: "npc_create",  text: "路口拦着一个自称甄嬛的女机器人" },
      { kind: "item_summon", text: "路边废车里露出一支手电筒" },
      { kind: "event_create",text: "远处传来爆炸声，是不是又出新地点了" },
      { kind: "environment", text: "难得的好天气，阳光晒得人暖洋洋" },
      { kind: "npc_create",  text: "一个流浪机器人非要给主播带路" },
    ],
    explore: [
      { kind: "item_summon", text: "主播脚边出现一个急救包！" },
      { kind: "item_summon", text: "货架后面藏着几瓶水" },
      { kind: "item_summon", text: "墙角有一把上了膛的冲锋枪" },
      { kind: "item_summon", text: "天上空投了一箱矿泉水" },
      { kind: "item_summon", text: "有人喊：给主播一把激光枪！" },
      { kind: "npc_create",  text: "拐角来了个自称马斯克的流浪汉" },
      { kind: "npc_create",  text: "废墟里钻出一只会说话的机械犬" },
      { kind: "npc_create",  text: "一个自称是厨子的机器人想加入队伍" },
      { kind: "event_create",text: "地板突然塌了一块，下面有动静" },
      { kind: "event_create",text: "警报响了，AI巡逻队正在靠近" },
      { kind: "environment", text: "突然刮起了辐射沙暴，能见度骤降" },
      { kind: "environment", text: "一阵刺骨严寒袭来，呼出的气都结冰了" },
      { kind: "item_summon", text: "破柜子里翻出一盒药片" },
      { kind: "npc_create",  text: "有个鬼影飘过去说要反清复明" },
    ],
  };

  function actionPoolFor(scene) {
    return ACTIONABLE[scene] || ACTIONABLE.explore;
  }

  // 从弹幕文本推断会触发哪类事件
  function inferKind(t) {
    t = t || "";
    if (/沙暴|严寒|寒|冰|雪|冻|停电|辐射|酸雨|地震|塌|起火|爆炸|暴雨|风暴|海啸/.test(t)) return "environment";
    if (/医生|商人|护士|士兵|老人|孩子|流浪|幸存者|陌生人|队友|同伴|一个人|一只|动物|犬|狗|猫|机器人|NPC/.test(t)) return "npc_create";
    if (/生成|出现|捡到|获得|多了|空投|发现|翻出|掉出|藏着|露出/.test(t)) return "item_summon";
    return "event_create";
  }

  function actionableComment(scene) {
    // 优先用小说的创意弹幕（"生成XX"那类），按文本推断事件类型
    var nc = novelComments(scene) || novelComments("explore");
    if (nc) {
      var creatives = nc.filter(function (c) {
        return /生成|出现|捡到|获得|空投|发现|来了|钻出|多了|一只|一个/.test(c.text || "");
      });
      var c = pick(creatives.length ? creatives : nc);
      return { user: c.user || persona("creative").user, av: c.av || "🧠", text: c.text, kind: inferKind(c.text) };
    }
    var pool = actionPoolFor(scene);
    var entry = pick(pool);
    var p = rotatePersona();
    if (entry.kind === "item_summon" || entry.kind === "npc_create" || entry.kind === "event_create") {
      if (Math.random() < 0.55) p = persona("creative");
      else if (Math.random() < 0.4) p = persona("troll");
    }
    return { user: p.user, av: p.av, text: entry.text, kind: entry.kind };
  }

  /* ============================================================
     4. synthEvent(comment, ctx) -> mock 事件对象
     comment = { text, kind, user, av }
     ctx = { scene, stats:{hp,hunger,sanity,supply}, day }
     完全本地合成，返回 banner|story|item|stats 之一，绝不 undefined。
     ============================================================ */

  function getName(comment) {
    if (comment && comment.user) return comment.user;
    return "神秘观众";
  }
  function safeStats(ctx) {
    var s = (ctx && ctx.stats) || {};
    return {
      hp:     typeof s.hp === "number" ? s.hp : 50,
      hunger: typeof s.hunger === "number" ? s.hunger : 50,
      sanity: typeof s.sanity === "number" ? s.sanity : 50,
      supply: typeof s.supply === "number" ? s.supply : 50,
    };
  }
  function hasItem(id) {
    return typeof window !== "undefined" && window.ITEMS && window.ITEMS[id];
  }
  function itemName(id) {
    return (hasItem(id) && window.ITEMS[id].name) || id;
  }
  function lc(s) { return (s || "").toLowerCase(); }

  // 关键词 -> 合法 itemId，基于当前 window.ITEMS（小说生成的物品）动态匹配，
  // 而非写死默认键。先按类别(武器/医疗/水/食物/材料)在小说物品里找，找不到随机给一个。
  function itemKeys() {
    return (typeof window !== "undefined" && window.ITEMS) ? Object.keys(window.ITEMS) : [];
  }
  function findItemBy(pred) {
    var keys = itemKeys();
    for (var i = 0; i < keys.length; i++) {
      if (pred(window.ITEMS[keys[i]] || {}, keys[i])) return keys[i];
    }
    return null;
  }
  function mapTextToItem(text) {
    var t = text || "";
    var keys = itemKeys();
    if (!keys.length) return { id: "can" };
    var id = null;
    if (/枪|武器|刀|弓|矛|火力|弹/.test(t)) id = findItemBy(function (it) { return it.kind === "weapon"; });
    else if (/药|医疗|绷带|急救|包扎|止血|镇静|针|疫/.test(t)) id = findItemBy(function (it) { return /药|绷带|医|止血|镇静|针|疫|膏/.test(it.name || ""); });
    else if (/水|喝|饮|渴/.test(t)) id = findItemBy(function (it) { return /水|饮|渴/.test(it.name || ""); });
    else if (/吃|食|粮|罐|肉|饼|果|菜|鱼|蚝|贝/.test(t)) id = findItemBy(function (it) { return it.kind === "consume" && /食|粮|罐|肉|饼|果|菜|鱼|蚝|贝|干/.test(it.name || ""); });
    else if (/铁|零件|材料|工具|绳|骨/.test(t)) id = findItemBy(function (it) { return it.kind === "material"; });
    else if (/手电|照明|灯|电池|电台|收音/.test(t)) id = findItemBy(function (it) { return /电|灯|台/.test(it.name || ""); });
    if (!id) id = keys[Math.floor(Math.random() * keys.length)];
    return { id: id };
  }

  // 兜底到一个真实存在的小说物品 key
  function ensureValidItem(id) {
    if (hasItem(id)) return id;
    var keys = itemKeys();
    return keys.length ? keys[0] : id;
  }

  /* ---- 各 kind 的合成器 ---- */

  function synthItem(comment) {
    var name = getName(comment);
    var m = mapTextToItem(comment && comment.text);
    var id = ensureValidItem(m.id);
    var label = m.downgrade || itemName(id);
    var html;
    if (m.downgrade) {
      html = "<b>@" + name + "</b> 想召唤的东西在末日里失效了，主播只捡到「" + label + "」——总比没有强。";
    } else {
      html = "<b>@" + name + "</b> 让主播获得了「" + itemName(id) + "」！";
    }
    return { type: "item", itemId: id, source: "@" + name, html: html };
  }

  // 角色登场剧情（含名人转译）
  var NPC_ILLUS = ["🤖", "🐈", "🧑‍🦲", "👻", "🦾", "🥷", "🧓", "🐕‍🦺"];
  function synthNpc(comment) {
    var name = getName(comment);
    var t = comment && comment.text ? comment.text : "一个陌生身影";
    var illus = "🤖";
    var text;
    if (/马斯克|甄嬛|总统|名人|明星|马云|王金鑫|霉霉|蔡徐坤/.test(t)) {
      illus = "🤖";
      text = "一个浑身锈迹的破机器人晃了出来，扬声器里嘶嘶作响：「我，就是" +
        (/马斯克/.test(t) ? "马斯克" : /甄嬛/.test(t) ? "甄嬛" : "你们的偶像") +
        "本人。」——显然只是台捡来名号的报废机体，但它眼里那点红光，意外地像在求生。";
    } else if (/猫|犬|狗|机械犬|动物/.test(t)) {
      illus = /犬|狗/.test(t) ? "🐕‍🦺" : "🐈";
      text = "废墟阴影里钻出一个毛茸茸的轮廓，金属关节随动作咔哒作响。它歪头打量主播，喉咙里挤出几个含混的人类音节——这年头，连它都学会了说话求活。";
    } else if (/厨子|医生|工程师|机械师|商人/.test(t)) {
      illus = "🧓";
      text = "一个佝偻的身影从碎砖后直起腰，自报家门说曾是个手艺人。它的工具包磨得发亮，眼神在饥饿与警惕之间反复横跳：「带上我，我能派上用场。」";
    } else {
      illus = pick(NPC_ILLUS);
      text = "废土把一个新角色推到了主播面前。它来历不明、动机成谜，却在这片死寂里，成了又一个会喘气的变量。";
    }
    return { type: "story", illus: illus, source: "@" + name, text: text };
  }

  // 环境灾害 -> 数值变化，安全钳制（任一数值不一步归零，负向后 >= 10）
  function synthEnvironment(comment, ctx) {
    var name = getName(comment);
    var stats = safeStats(ctx);
    var t = comment && comment.text ? comment.text : "环境突变";
    var delta = {};
    var html;
    var benign = /空投|晴|阳光|好天气|补给|温暖|暖/.test(t);
    if (benign) {
      // 利好：supply 或 hunger 改善
      if (/空投|补给|水/.test(t)) {
        delta.supply = 8 + Math.floor(Math.random() * 8); // +8~+15
        html = "<b>@" + name + "</b> 的空投砸了下来，主播补给 +" + delta.supply + "！";
      } else {
        delta.hunger = 6 + Math.floor(Math.random() * 6); // +6~+11
        html = "<b>@" + name + "</b> 带来了难得的好天气，主播喘了口气，饱腹 +" + delta.hunger + "。";
      }
    } else {
      // 灾害：sanity 或 supply 下降
      var isCold = /严寒|寒|冰|雪|冻/.test(t);
      var key = isCold ? "sanity" : (/沙暴|辐射|酸雨|停电|黑暗/.test(t) ? "supply" : "sanity");
      var mag = 5 + Math.floor(Math.random() * 11); // 5~15
      var cur = stats[key];
      // 安全钳制：负向后保证 cur + delta >= 10
      var maxDrop = cur - 10;
      if (maxDrop < 0) maxDrop = 0;
      if (mag > maxDrop) mag = maxDrop;
      if (mag <= 0) {
        // 已经太低，改为轻微正向缓冲，避免无意义的 0 变化
        delta[key] = 0;
        delta.sanity = (delta.sanity || 0); // 保底字段
        html = "<b>@" + name + "</b> 召来的灾害逼近，但主播已退无可退，咬牙稳住了阵脚。";
        delta = { sanity: 1 };
      } else {
        delta[key] = -mag;
        var lbl = key === "sanity" ? "理智" : key === "supply" ? "物资" : key === "hp" ? "健康" : "饱腹";
        var ev = isCold ? "刺骨严寒" : (/沙暴/.test(t) ? "辐射沙暴" : (/酸雨/.test(t) ? "酸雨" : (/停电|黑暗/.test(t) ? "突袭的黑暗" : "环境剧变")));
        html = "<b>@" + name + "</b> 召来的" + ev + "席卷而过，主播" + lbl + " -" + mag + "。";
      }
    }
    return { type: "stats", delta: delta, source: "@" + name, html: html };
  }

  // 突发事件 -> banner 或 story
  var EVENT_ILLUS = ["⚠️", "📻", "🚨", "🕳️", "🔊", "💥"];
  function synthEventCreate(comment) {
    var name = getName(comment);
    var t = comment && comment.text ? comment.text : "突发状况";
    if (Math.random() < 0.5) {
      return {
        type: "banner",
        icon: "✨",
        html: "<b>@" + name + "</b> 的创意生效了！「" + t.replace(/[「」]/g, "") + "——直播间瞬间炸开了锅。」",
      };
    }
    return {
      type: "story",
      illus: pick(EVENT_ILLUS),
      source: "@" + name,
      text: "评论区一句「" + t.replace(/[「」]/g, "") + "」竟成了真。废土像是听见了观众的话，把这桩怪事原样塞进了主播的眼前——危险还是机遇，没人说得准。",
    };
  }

  // 兜底 banner（任何分支异常都回到这里）
  function fallbackBanner(comment) {
    var name = getName(comment);
    var t = (comment && comment.text) ? comment.text.replace(/[「」]/g, "") : "一个脑洞";
    return {
      type: "banner",
      icon: "✨",
      html: "<b>@" + name + "</b> 的创意被废土收下了！「" + t + "」",
    };
  }

  function synthEvent(comment, ctx) {
    try {
      comment = comment || {};
      var kind = comment.kind;
      var ev;
      if (kind === "item_summon") ev = synthItem(comment);
      else if (kind === "npc_create") ev = synthNpc(comment);
      else if (kind === "environment") ev = synthEnvironment(comment, ctx);
      else if (kind === "event_create") ev = synthEventCreate(comment);
      else {
        // 未知 kind：用文本启发式猜一个，再不行兜底
        var l = lc(comment.text);
        if (/水|药|枪|罐头|绷带|急救|手电|废铁|镇静/.test(comment.text || "")) ev = synthItem(comment);
        else ev = fallbackBanner(comment);
      }
      if (!ev || !ev.type) return fallbackBanner(comment);
      return ev;
    } catch (e) {
      return fallbackBanner(comment || {});
    }
  }

  /* ---- export ---- */
  var AudienceBot = {
    PERSONAS: PERSONAS,
    nextComment: nextComment,
    actionableComment: actionableComment,
    synthEvent: synthEvent,
    // 辅助导出（非契约，方便调试/复用）
    _clampStat: clampStat,
  };

  Object.assign(window, { AudienceBot });
})();
