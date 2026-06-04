// 评论智能 + 叙事引擎的类型定义

export interface RawComment {
  user: string;
  text: string;
  timestamp: number;
}

export interface ProcessedComments {
  actionable: ActionableComment[]; // 可触发事件的评论
  bestComment: ActionableComment | null; // 本周期最佳（用于归属展示）
  environmentKeywords: Record<string, number>; // 集体意志关键词计数
  ignoredCount: number;
}

export interface ActionableComment {
  user: string;
  text: string;
  type: "event_create" | "item_summon" | "npc_create" | "environment";
  confidence: number; // 0-1
}

export type NarrativeContext =
  | "home_event" // 在家突发事件（评论触发）
  | "resource_adjust" // 资源/伙伴调整（玩家自由操作）
  | "map_choice" // 选择地图
  | "explore_tile"; // 探索格子

export interface GameState {
  day: number;
  hp: number;
  food: number;
  sanity: number;
  actionPoints: number;
  companions: string[];
  inventory: string[];
  karma: number;
  history: string[]; // recent event summaries
}

export interface NarrativeRequest {
  gameState: GameState;
  context: NarrativeContext;
  comments?: ActionableComment[];
  playerAction?: string;
}

export interface NarrativeResponse {
  narrative: string;
  choices: NarrativeChoice[];
  resourceChanges: Partial<
    Record<"hp" | "food" | "sanity" | "actionPoints", number>
  >;
  newItems: string[];
  newCompanions: string[];
  attribution: { user: string; text: string } | null;
  divineType: "blessing" | "aid" | "curse" | null;
}

export interface NarrativeChoice {
  text: string;
  cost: Partial<Record<"hp" | "food" | "sanity", number>>;
  reward: Partial<Record<"hp" | "food" | "sanity", number>>;
  karma: number;
  successRate: number;
}

export interface LiveComment extends RawComment {
  source: "websocket" | "manual" | "bot";
}
