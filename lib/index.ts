/**
 * 🎮 评论智能 + 叙事引擎 v2 — 统一导出
 *
 * v2 新增：能力驱动系统类型（CompanionSkill, ItemState, NarrativeHook）
 *
 * HTTP API:
 * POST /api/comment      — 注入评论
 * GET  /api/comment       — 获取评论缓冲区
 * DELETE /api/comment     — 清空并返回缓冲区
 * POST /api/narrative     — 生成叙事事件（含能力驱动+钩子）
 * POST /api/gamestate     — 广播游戏状态
 * GET  /api/gamestate     — 获取最新状态
 */

// ── 类型 ──
export type {
  RawComment,
  ProcessedComments,
  ActionableComment,
  NarrativeContext,
  GameState,
  NarrativeRequest,
  NarrativeResponse,
  LiveComment,
  CompanionSkill,
  CompanionState,
  ItemState,
  NarrativeHook,
} from './comment-types';

// ── 评论智能（纯规则，不调AI） ──
export { processComments, checkCollectiveWill } from './comment-intelligence';

// ── 叙事引擎（调Claude API，仅服务端） ──
export { generateNarrative } from './narrative-engine';

// ── Fallback事件库（纯数据） ──
export { homeEvents } from './fallback-events/home-events';
export { presetExploreEvents } from './fallback-events/explore-events';
export { mapChoiceGroups } from './fallback-events/map-choices';
export { resourceActions } from './fallback-events/resource-actions';
