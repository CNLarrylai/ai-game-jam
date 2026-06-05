"use client";

import { useState } from "react";

interface NarrativeChoice {
  text: string;
  cost: Record<string, number>;
  reward: Record<string, number>;
  karma: number;
  successRate: number;
}

interface NarrativeResult {
  narrative: string;
  choices: NarrativeChoice[];
  resourceChanges: Record<string, number>;
  newItems: string[];
  newCompanions: string[];
  attribution: { user: string; text: string } | null;
  divineType: string | null;
}

const MOCK_STATE = {
  day: 3,
  hp: 75,
  food: 15,
  sanity: 60,
  actionPoints: 4,
  companions: ["小李"],
  inventory: ["绷带", "罐头×2", "手电筒"],
  karma: 5,
  history: ["在便利店找到了一些食物", "遇到一个受伤的幸存者并救助了他"],
};

const PRESET_COMMENTS = [
  "前面有个废弃医院",
  "给他一把枪",
  "遇到一个带着狗的老人",
  "丧尸丧尸丧尸",
  "下雨了，找个地方躲",
  "加油主播！",
  "666",
  "往左走",
  "有个超市可以搜刮",
  "出现一台坏掉的AI机器人",
];

export default function TestPipeline() {
  const [comments, setComments] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [context, setContext] = useState<string>("explore_tile");
  const [classifyResult, setClassifyResult] = useState<any>(null);
  const [narrativeResult, setNarrativeResult] = useState<NarrativeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);

  // Add comment
  const addComment = (text: string) => {
    setComments((prev) => [...prev, text]);
    // Also push to server buffer
    fetch("/api/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: "测试观众" + Math.floor(Math.random() * 99), text }),
    });
  };

  // Run full pipeline: classify + generate
  const runPipeline = async () => {
    setLoading(true);
    setNarrativeResult(null);
    setClassifyResult(null);
    setSelectedChoice(null);

    try {
      // Step 1: Classify (client-side for visibility)
      const classifyRes = await fetch("/api/comment");
      const { comments: serverComments } = await classifyRes.json();

      // Step 2: Generate narrative
      const rawComments = comments.map((text, i) => ({
        user: "观众" + (i + 1),
        text,
        timestamp: Date.now() - (comments.length - i) * 1000,
      }));

      const narrativeRes = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameState: MOCK_STATE,
          context,
          rawComments,
        }),
      });

      const result = await narrativeRes.json();

      // Show classify info
      setClassifyResult({
        total: comments.length,
        serverBuffer: serverComments.length,
        sent: rawComments.length,
      });

      setNarrativeResult(result);
    } catch (err) {
      setNarrativeResult({
        narrative: "❌ 生成失败: " + (err as Error).message,
        choices: [],
        resourceChanges: {},
        newItems: [],
        newCompanions: [],
        attribution: null,
        divineType: null,
      });
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <h1 className="text-2xl font-bold text-yellow-400 mb-2">
        🧪 评论→剧情 Pipeline 测试
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        输入评论 → 点击生成 → 看AI如何将评论转化为游戏事件
      </p>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Comment input */}
        <div>
          <h2 className="text-lg font-semibold text-blue-400 mb-3">💬 模拟评论</h2>

          {/* Quick buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_COMMENTS.map((c, i) => (
              <button
                key={i}
                onClick={() => addComment(c)}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-300 hover:border-yellow-500 hover:text-yellow-400 transition"
              >
                {c}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex gap-2 mb-4">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputText.trim()) {
                  addComment(inputText.trim());
                  setInputText("");
                }
              }}
              placeholder="输入自定义评论..."
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:border-yellow-500 focus:outline-none"
            />
            <button
              onClick={() => {
                if (inputText.trim()) {
                  addComment(inputText.trim());
                  setInputText("");
                }
              }}
              className="px-4 py-2 bg-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-600"
            >
              发送
            </button>
          </div>

          {/* Comment feed */}
          <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto mb-4">
            {comments.length === 0 ? (
              <p className="text-gray-600 text-sm">还没有评论，点击上方快捷按钮或自定义输入</p>
            ) : (
              comments.map((c, i) => (
                <div key={i} className="text-sm py-1 border-b border-gray-800">
                  <span className="text-blue-400">@观众{i + 1}</span>{" "}
                  <span className="text-gray-300">{c}</span>
                </div>
              ))
            )}
          </div>

          {/* Context selector + Generate button */}
          <div className="flex gap-3 items-center">
            <select
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm"
            >
              <option value="home_event">🏠 在家突发事件</option>
              <option value="explore_tile">🗺️ 探索格子</option>
              <option value="map_choice">📍 选择地图</option>
              <option value="resource_adjust">🔧 资源调整</option>
            </select>
            <button
              onClick={runPipeline}
              disabled={loading || comments.length === 0}
              className="flex-1 px-4 py-2 bg-red-700 rounded-lg text-sm font-bold hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 transition"
            >
              {loading ? "⏳ AI生成中..." : "🔮 生成剧情事件"}
            </button>
          </div>

          {/* Game state display */}
          <div className="mt-4 bg-gray-900 rounded-lg p-3 text-xs text-gray-500">
            <div className="font-semibold text-gray-400 mb-1">当前游戏状态（Mock）</div>
            <div>Day {MOCK_STATE.day} | ❤️{MOCK_STATE.hp} 🍞{MOCK_STATE.food} 🧠{MOCK_STATE.sanity} ⚡{MOCK_STATE.actionPoints}</div>
            <div>同伴: {MOCK_STATE.companions.join(", ")} | 背包: {MOCK_STATE.inventory.join(", ")}</div>
          </div>
        </div>

        {/* Right: Result */}
        <div>
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">📜 生成结果</h2>

          {classifyResult && (
            <div className="bg-gray-900 rounded-lg p-3 mb-3 text-xs">
              <span className="text-gray-400">评论统计：</span>
              <span className="text-blue-400"> {classifyResult.total}条输入</span>
              <span className="text-gray-600"> → </span>
              <span className="text-green-400">{classifyResult.sent}条送入AI</span>
            </div>
          )}

          {narrativeResult ? (
            <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              {/* Attribution */}
              {narrativeResult.attribution && (
                <div className="px-4 py-2 bg-yellow-900/20 border-b border-yellow-800/30 text-xs">
                  <span className="text-yellow-400">✨ 灵感来源：</span>
                  <span className="text-blue-400">@{narrativeResult.attribution.user}</span>
                  <span className="text-gray-400"> — &quot;{narrativeResult.attribution.text}&quot;</span>
                </div>
              )}

              {/* Divine type */}
              {narrativeResult.divineType && (
                <div className="px-4 py-2 bg-purple-900/20 border-b border-purple-800/30 text-xs text-purple-300">
                  {narrativeResult.divineType === "blessing" && "⚡ 上帝的旨意！"}
                  {narrativeResult.divineType === "aid" && "🛡️ 神秘人的援助！"}
                  {narrativeResult.divineType === "curse" && "💀 衰神降临！"}
                </div>
              )}

              {/* Narrative */}
              <div className="p-4">
                <p className="text-gray-200 leading-relaxed">{narrativeResult.narrative}</p>
              </div>

              {/* Resource changes */}
              {Object.keys(narrativeResult.resourceChanges).length > 0 && (
                <div className="px-4 pb-2 flex gap-3 text-xs">
                  {Object.entries(narrativeResult.resourceChanges).map(([key, val]) => (
                    <span
                      key={key}
                      className={val >= 0 ? "text-green-400" : "text-red-400"}
                    >
                      {key === "hp" && "❤️"}
                      {key === "food" && "🍞"}
                      {key === "sanity" && "🧠"}
                      {val >= 0 ? "+" : ""}{val}
                    </span>
                  ))}
                </div>
              )}

              {/* New items / companions */}
              {(narrativeResult.newItems.length > 0 || narrativeResult.newCompanions.length > 0) && (
                <div className="px-4 pb-2 text-xs text-gray-400">
                  {narrativeResult.newItems.length > 0 && (
                    <span className="text-green-400">📦 获得: {narrativeResult.newItems.join(", ")}</span>
                  )}
                  {narrativeResult.newCompanions.length > 0 && (
                    <span className="text-blue-400 ml-3">🤝 新同伴: {narrativeResult.newCompanions.join(", ")}</span>
                  )}
                </div>
              )}

              {/* Choices */}
              {narrativeResult.choices.length > 0 && (
                <div className="p-4 border-t border-gray-800">
                  <div className="text-xs text-gray-500 mb-2">选择你的行动：</div>
                  {narrativeResult.choices.map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedChoice(i)}
                      className={`w-full text-left p-3 mb-2 rounded-lg border transition ${
                        selectedChoice === i
                          ? "border-yellow-500 bg-yellow-900/20"
                          : "border-gray-700 bg-gray-800 hover:border-gray-500"
                      }`}
                    >
                      <div className="text-sm text-gray-200">{choice.text}</div>
                      <div className="flex gap-3 mt-1 text-xs">
                        {Object.entries(choice.cost || {}).map(([k, v]) =>
                          v ? (
                            <span key={k} className="text-red-400">
                              {k === "hp" ? "❤️" : k === "food" ? "🍞" : k === "sanity" ? "🧠" : k}
                              {v > 0 ? "-" : ""}{Math.abs(v)}
                            </span>
                          ) : null
                        )}
                        {Object.entries(choice.reward || {}).map(([k, v]) =>
                          v ? (
                            <span key={k} className="text-green-400">
                              {k === "hp" ? "❤️" : k === "food" ? "🍞" : k === "sanity" ? "🧠" : k}
                              +{v}
                            </span>
                          ) : null
                        )}
                        {choice.karma !== 0 && (
                          <span className={choice.karma > 0 ? "text-yellow-400" : "text-purple-400"}>
                            ⚖️{choice.karma > 0 ? "+" : ""}{choice.karma}
                          </span>
                        )}
                        {choice.successRate < 1 && (
                          <span className="text-orange-400">
                            🎲{Math.round(choice.successRate * 100)}%
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl p-8 text-center text-gray-600">
              <p className="text-3xl mb-2">🌫️</p>
              <p>添加一些评论，然后点击&quot;生成剧情事件&quot;</p>
              <p className="text-xs mt-2">AI会将观众评论转化为游戏内事件</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
