/* api-bridge.jsx — connects WASTELAND LIVE to backend APIs */

const API_BASE = window.location.origin;

const ApiBridge = {
  // Post a comment to the server buffer
  async postComment(user, text) {
    try {
      await fetch(API_BASE + '/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, text }),
      });
    } catch(e) { console.warn('postComment failed:', e); }
  },

  // Get and drain comment buffer
  async getComments() {
    try {
      const res = await fetch(API_BASE + '/api/comment');
      const data = await res.json();
      return data.comments || [];
    } catch(e) { return []; }
  },

  // Generate narrative event from comments + game state
  async generateEvent(gameState, context, rawComments) {
    try {
      const res = await fetch(API_BASE + '/api/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState: {
            day: gameState.day || 1,
            hp: gameState.stats?.hp || 80,
            food: gameState.stats?.hunger || 50,
            sanity: gameState.stats?.sanity || 60,
            actionPoints: gameState.ap || 5,
            companions: (gameState.companions || []).map(c => c.name),
            inventory: (gameState.pack || []).map(i => i.name),
            karma: gameState.karma || 0,
            history: gameState.history || [],
          },
          context,
          rawComments,
        }),
      });
      return await res.json();
    } catch(e) {
      console.warn('generateEvent failed:', e);
      return null;
    }
  },

  // Broadcast game state for spectators
  async broadcastState(state) {
    try {
      await fetch(API_BASE + '/api/gamestate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch(e) {}
  },

  // Simple comment classification (client-side, mirrors server logic)
  classifyComment(text) {
    // Noise patterns
    const noise = [/^(哈哈|lol|666|加油|厉害|牛|gg|好看|好玩)/i, /^.{0,2}$/];
    if (noise.some(p => p.test(text))) return { type: 'noise', actionable: false };

    // Creative/actionable patterns
    const patterns = [
      { pattern: /(前面|前方|出现|遇到|发现).*(人|老人|怪物|建筑|医院|超市)/, type: 'event_create' },
      { pattern: /(给他|掉落|出现|找到).*(枪|剑|刀|药|食物|钥匙)/, type: 'item_summon' },
      { pattern: /(来了|出现|遇到).*(人|幸存者|士兵|医生)/, type: 'npc_create' },
      { pattern: /(暴风雨|丧尸|空投|地震|着火)/, type: 'environment' },
    ];

    for (const { pattern, type } of patterns) {
      if (pattern.test(text)) return { type, actionable: true };
    }

    // Long enough to be potentially creative
    if (text.length > 8) return { type: 'event_create', actionable: true, confidence: 0.4 };

    return { type: 'chat', actionable: false };
  },
};

window.ApiBridge = ApiBridge;
