// art-resolver.mjs — 评论生成内容 → 资产包配图
// 零依赖 ESM，浏览器/Node 通用。输入剧情管线的生成 JSON，输出资产路径。
// 维护：新增资产时往 ICON_RULES / PORTRAIT_RULES 加一行即可。

const BASE = 'assets';

// ---- ITEM：关键词优先，category 兜底 ----
const ICON_RULES = [
  // [正则（匹配 name+description）, 图标名]
  [/鸡腿|烤鸡|鸡肉|drumstick|chicken/i, 'drumstick'],
  [/水|瓶装|water|bottle/i, 'water'],
  [/罐头|罐装|can(ned)?/i, 'canned_food'],
  [/药|医疗|绷带|急救|med|first.?aid|bandage/i, 'medkit'],
  [/电池|能源|电芯|batter|power.?cell/i, 'battery'],
  [/扳手|修理|工具箱|wrench|repair/i, 'tool_wrench'],
  [/球棒|棍棒|bat\b/i, 'weapon_bat'],
  [/钢管|铁管|管子|pipe/i, 'weapon_pipe'],
  [/金斧|斧|axe/i, 'gold_axe'],
  [/背包|容纳|包裹|backpack|bag/i, 'backpack'],
  [/绳|缆|rope|cable/i, 'rope'],
  [/手电|照明|灯|flash|torch|light/i, 'flashlight'],
  [/收音机|电台|对讲|radio|walkie/i, 'radio'],
  [/钥匙|门禁|key\b/i, 'key'],
];
const ICON_BY_CATEGORY = {
  food: 'canned_food', medicine: 'medkit', weapon: 'weapon_pipe',
  tool: 'tool_wrench', material: 'rope', special: 'backpack',
};
const AI_HINT = /AI|机械|无人机|信标|芯片|drone|robot|machine/i;

// ---- CHARACTER：skills/关键词 → 立绘原型 ----
const PORTRAIT_RULES = [
  [/猫|犬|狗|鼠|动物|宠物|cat|dog|animal|pet/i, 'npc_cat'],
  [/鬼|幽灵|亡|灵异|ghost|spirit|phantom/i, 'npc_ghost'],
  [/皇|帝|古人|将军|朝|emperor|ancient/i, 'npc_qinshihuang'],
  [/收银|机器|机械(?!师)|AI|电子|義体|robot|machine|android/i, 'npc_cashier'],
  [/医|护|药剂|博士|学者|教授|doctor|medic|scientist|professor|女|girl|woman/i, 'companion_girl'],
  [/兵|军|工人|机械师|大叔|猎|壮|soldier|veteran|mechanic|hunter|man|uncle/i, 'companion_uncle'],
];

function textOf(json) {
  return [json.name, json.description, json.appearance_prompt, json.personality,
    ...(json.skills || []).map((s) => s.type + ' ' + (s.description || ''))]
    .filter(Boolean).join(' ');
}

/**
 * 剧情管线生成 JSON → 配图。
 * @returns {{src:string, kind:string, matched:boolean, aiVariant?:boolean, aiFrame?:boolean}}
 */
export function resolveArt(json) {
  const type = (json.type || '').toUpperCase();
  const text = textOf(json);

  if (type === 'ITEM') {
    const hit = ICON_RULES.find(([re]) => re.test(text));
    const name = hit ? hit[1] : ICON_BY_CATEGORY[(json.category || '').toLowerCase()];
    const isAI = AI_HINT.test(text);
    if (!name) return { src: `${BASE}/icons/icon_backpack.png`, kind: 'icon', matched: false, aiFrame: isAI };
    if (isAI && name === 'battery') return { src: `${BASE}/icons/icon_battery_ai.png`, kind: 'icon', matched: true, aiVariant: true };
    return { src: `${BASE}/icons/icon_${name}.png`, kind: 'icon', matched: !!hit, aiFrame: isAI };
  }

  if (type === 'CHARACTER') {
    const hit = PORTRAIT_RULES.find(([re]) => re.test(text));
    return hit
      ? { src: `${BASE}/characters/char_${hit[1]}.png`, kind: 'portrait', matched: true }
      : { src: `${BASE}/characters/char_companion_uncle.png`, kind: 'portrait', matched: false };
  }

  if (type === 'LOCATION') {
    const factory = /工厂|车间|机械|factory|industrial/i.test(text);
    return { src: `${BASE}/maps/${factory ? 'factory' : 'supermarket'}/`, kind: 'tileset', matched: factory };
  }

  // EVENT 及其他：用事件卡框
  return { src: `${BASE}/ui/event_card_frame.png`, kind: 'frame', matched: false };
}
