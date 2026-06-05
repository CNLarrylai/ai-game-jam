// 评论智能 + 叙事引擎的类型定义 (v2 — 对齐 Python comment_engine)

export interface RawComment {
  user: string;
  text: string;
  timestamp: number;
}

export interface ProcessedComments {
  actionable: ActionableComment[];
  bestComment: ActionableComment | null;
  environmentKeywords: Record<string, number>;
  ignoredCount: number;
}

export interface ActionableComment {
  user: string;
  text: string;
  type: "event_create" | "item_summon" | "npc_create" | "location_create" | "environment";
  confidence: number; // 0-1
}

export type NarrativeContext =
  | "home_event"
  | "resource_adjust"
  | "map_choice"
  | "explore_tile";

// 能力驱动系统类型
export interface CompanionSkill {
  type: "craft" | "combat" | "knowledge" | "social" | "survival";
  description: string;
  enables: string[];
  narrativeHooks: string[];
}

export interface CompanionState {
  name: string;
  skill: string;
  flaw: string;
  dailyCost: Record<string, number>;
  passiveEffect: string;
  skills: CompanionSkill[];
}

export interface ItemState {
  name: string;
  icon: string;
  category: string;
  description: string;
  durability: number;
  effect: Partial<Record<"spirit" | "health" | "hunger" | "thirst", number>>;
  enables: string[];
  narrativeHooks: string[];
  isHardcoded: boolean;
}

export interface NarrativeHook {
  hookId: string;
  setup: string;
  setupDay: number;
  minDelay: number;
  maxDelay: number;
  suggestedPayoffs: string[];
  resolved: boolean;
}

export interface GameState {
  day: number;
  spirit: number;     // 精神值 60/100, high=good, ≤30=deranged, ≤10=game over
  health: number;     // 健康值 50/100, high=good, =0=game over
  hunger: number;     // 饥饿值 30/100, INVERTED: 0=full, 100=starved
  thirst: number;     // 口渴值 30/100, INVERTED: 0=full, 100=dehydrated
  actionPoints: number;
  companions: CompanionState[];
  inventory: ItemState[];
  karma: number;
  history: string[];
  visitedLocations: string[];
  unresolvedThreads: string[];
  hookQueue: NarrativeHook[];
  availableMaps: string[];
}

export interface NarrativeRequest {
  gameState: GameState;
  context: NarrativeContext;
  comments?: ActionableComment[];
  playerAction?: string;
}

export interface NarrativeResponse {
  narrative: string;
  suggestedReactions: string[];
  dangerLevel: "low" | "medium" | "high";
  resourceChanges: Partial<Record<"spirit" | "health" | "hunger" | "thirst", number>>;
  newItems: string[];
  newCompanions: string[];
  attribution: { user: string; text: string } | null;
  threadHook: string | null;
  hooksResolved: string[];
  capabilityUsedSummary: string;
}

// Compat: used by fallback-events (sanity=legacy alias for spirit)
export interface NarrativeChoice {
  text: string;
  cost: Partial<Record<"spirit" | "health" | "hunger" | "thirst" | "sanity" | "hp" | "food" | "morale", number>>;
  reward: Partial<Record<"spirit" | "health" | "hunger" | "thirst" | "sanity" | "hp" | "food" | "morale", number>>;
  karma: number;
  successRate: number;
}

export interface LiveComment extends RawComment {
  source: "websocket" | "manual" | "bot";
}
