// 共享类型定义 —— 前后端通用

export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface Scenario {
  /** 唯一 id，作为 URL / 选择标识 */
  id: string;
  /** 卡片标题 */
  title: string;
  /** 一句话简介 */
  tagline: string;
  /** emoji 封面 */
  emoji: string;
  /** 开场白：游戏开始时 AI 主持人说的第一段话 */
  opening: string;
  /** 系统提示词：定义这个剧本里 AI 主持人的世界观、风格、规则 */
  systemPrompt: string;
}
