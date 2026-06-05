/* ============================================================
   art-bridge.jsx — 评论生成内容 → 像素配图（运行时关键词解析）
   规则与 art/runtime/art-resolver.mjs 同源（那边是 ESM 规范版，这边是
   babel 页面可用的全局版）；新增资产时两处各加一行。
   解析顺序：emoji 精确映射(data.jsx iconSrc) → 关键词规则 → 回退 emoji。
   load AFTER data.jsx, BEFORE effects.jsx / viewer-app.jsx
   产权：美术线（林子尧）
   ============================================================ */

const AB_BASE = "/assets";

/* ---- ITEM：关键词优先，未中则回退 ---- */
const AB_ICON_RULES = [
  [/鸡腿|烤鸡|鸡肉|drumstick|chicken/i, "drumstick"],
  [/水|瓶装|water|bottle/i, "water"],
  [/罐头|罐装|罐罐|can(ned)?/i, "canned_food"],
  [/药|医疗|绷带|急救|镇静|med|first.?aid|bandage/i, "medkit"],
  [/电池|能源|电芯|batter|power.?cell/i, "battery"],
  [/扳手|修理|工具|wrench|repair/i, "tool_wrench"],
  [/球棒|棍棒|bat\b/i, "weapon_bat"],
  [/钢管|铁管|管子|pipe/i, "weapon_pipe"],
  [/金斧|斧|axe/i, "gold_axe"],
  [/背包|容纳|包裹|backpack|bag/i, "backpack"],
  [/绳|缆|rope|cable/i, "rope"],
  [/手电|照明|灯|flash|torch|light/i, "flashlight"],
  [/收音机|电台|对讲|radio|walkie/i, "radio"],
  [/钥匙|门禁|key\b/i, "key"],
];
const AB_AI_HINT = /AI|机械|无人机|信标|芯片|drone|robot|machine/i;

/* ---- CHARACTER：关键词 → 立绘原型 ---- */
const AB_PORTRAIT_RULES = [
  [/猫|犬|狗|鼠|动物|宠物|cat|dog|animal|pet/i, "npc_cat"],
  [/鬼|幽灵|亡|灵异|贞子|俊雄|ghost|spirit|phantom/i, "npc_ghost"],
  [/皇|帝|古人|将军|朝|甄嬛|emperor|ancient/i, "npc_qinshihuang"],
  [/收银|机器|机械(?!师)|AI|电子|义体|守卫|robot|machine|android/i, "npc_cashier"],
  [/医|护|药剂|博士|学者|教授|阿姨|doctor|medic|scientist|女|girl|woman/i, "companion_girl"],
  [/兵|军|工人|机械师|大叔|猎|壮|拾荒|厨师|光头|soldier|veteran|mechanic|hunter|man|uncle/i, "companion_uncle"],
];

/* 文本 → 资产。kind: "item" | "character" | "auto"；未命中返回 null（调用方回退 emoji） */
function abResolve(text, kind) {
  return null;  /* woodcut: 不用像素PNG，全部回退 emoji（木刻/暗调主题） */
  const t = text || "";
  if (kind !== "character") {
    const hit = AB_ICON_RULES.find(([re]) => re.test(t));
    if (hit) {
      const ai = AB_AI_HINT.test(t);
      const name = ai && hit[1] === "battery" ? "battery_ai" : hit[1];
      return { src: AB_BASE + "/icons/icon_" + name + ".png", kind: "icon", aiVariant: ai };
    }
  }
  if (kind !== "item") {
    const hit = AB_PORTRAIT_RULES.find(([re]) => re.test(t));
    if (hit) return { src: AB_BASE + "/characters/char_" + hit[1] + ".png", kind: "portrait" };
  }
  return null;
}

/* 小图标：决策卡/横幅用。emoji 精确映射 → 关键词 → 回退原 emoji */
function ArtIco({ icon, text, size = 26, kind = "auto" }) {
  let src = window.iconSrc ? window.iconSrc(icon) : null;
  let ai = false;
  if (!src) {
    const r = abResolve((icon || "") + " " + (text || ""), kind === "auto" ? "item" : kind);
    if (r && r.kind === "icon") { src = r.src; ai = !!r.aiVariant; }
  }
  if (!src) return <span>{icon || "❓"}</span>;
  return <img src={src} width={size} height={size} alt=""
    style={{ imageRendering: "pixelated", verticalAlign: "-18%",
      ...(ai ? { outline: "1px solid #30e1b9", outlineOffset: 1 } : {}) }} />;
}

/* 立绘：story 卡用。按文本匹配角色原型，未中回退大 emoji */
function ArtIllus({ emoji, text, height = 144 }) {
  const r = abResolve((emoji || "") + " " + (text || ""), "character");
  if (!r) return <React.Fragment>{emoji || "📖"}</React.Fragment>;
  return <img src={r.src} height={height} alt=""
    style={{ imageRendering: "pixelated", filter: "drop-shadow(0 0 14px rgba(53,224,208,.35))" }} />;
}

Object.assign(window, { abResolve, ArtIco, ArtIllus });
