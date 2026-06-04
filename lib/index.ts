/**
 * 🎮 评论智能 + 叙事引擎 — 统一导出
 *
 * 使用方式：
 *
 * // 方式1：统一import
 * import { processComments, generateNarrative, homeEvents } from '@/lib';
 *
 * // 方式2：按模块import
 * import { processComments, checkCollectiveWill } from '@/lib/comment-intelligence';
 * import { generateNarrative } from '@/lib/narrative-engine';
 * import { homeEvents } from '@/lib/fallback-events/home-events';
 *
 * // 方式3：HTTP API（前端/外部系统）
 * POST /api/comment      — 注入评论
 * GET  /api/comment       — 获取评论缓冲区
 * POST /api/narrative     — 生成叙事事件
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
  NarrativeChoice,
  LiveComment,
} from './comment-types';

// ── 评论智能（纯规则，不调AI，可在任何环境运行） ──
export { processComments, checkCollectiveWill } from './comment-intelligence';

// ── 叙事引擎（调Claude API，仅服务端） ──
export { generateNarrative } from './narrative-engine';

// ── Fallback事件库（纯数据，可在任何环境运行） ──
export { homeEvents } from './fallback-events/home-events';
export { presetExploreEvents } from './fallback-events/explore-events';
export { mapChoiceGroups } from './fallback-events/map-choices';
export { resourceActions } from './fallback-events/resource-actions';
