import type { ChatMessage } from "./types";

/**
 * AI Provider 抽象层
 * ============================================
 * 统一封装不同模型厂商的「流式对话」接口，返回一个 ReadableStream<string>。
 * 当前支持：anthropic（Claude API）、gemini、agent（本机 claude -p 订阅，无需 key）。
 * 想接入新厂商？加一个 streamXxx 函数，并在 streamChat 里分支即可。
 */

const PROVIDER = process.env.AI_PROVIDER || "anthropic";

export function streamChat(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<ReadableStream<string>> {
  if (PROVIDER === "agent") return streamAgent(systemPrompt, messages);
  if (PROVIDER === "gemini") return streamGemini(systemPrompt, messages);
  // anthropic（默认）：有 key 走 API（快·真流式）；无 key 自动兜底到本机 claude -p agent
  if (process.env.ANTHROPIC_API_KEY) return streamAnthropic(systemPrompt, messages);
  return streamAgent(systemPrompt, messages);
}

// ---------- Anthropic (Claude) ----------
async function streamAnthropic(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<ReadableStream<string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("缺少 ANTHROPIC_API_KEY，请在 .env.local 中配置");
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-7";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API 错误 ${res.status}: ${detail}`);
  }

  return parseSSE(res.body, (data) => {
    if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
      return data.delta.text as string;
    }
    return null;
  });
}

// ---------- Agent（本机 claude -p 订阅，无需 API key） ----------
// 像 worker 那样 spawn `claude -p`，把系统提示+对话折成单条 prompt 喂进去，
// 实时转发 stdout。每回合一个进程（较慢 ~10-30s），但本机自含、不烧 key。
async function streamAgent(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<ReadableStream<string>> {
  const { spawn } = await import("node:child_process");
  const model = process.env.AGENT_MODEL || "claude-opus-4-7";

  const convo = messages
    .map((m) => (m.role === "user" ? "玩家：" : "主持人：") + m.content)
    .join("\n\n");
  const prompt =
    `${systemPrompt}\n\n` +
    `——以下是这局游戏到目前为止的对话。你是「游戏主持人(GM)」，严格延续上述规则，` +
    `以 GM 身份回应玩家最新的行动。只输出叙事正文本身，不要任何前缀/解释，不要使用任何工具。——\n\n` +
    `${convo}\n\n主持人：`;

  const child = spawn(
    "claude",
    ["-p", "--model", model, "--dangerously-skip-permissions"],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  return new ReadableStream<string>({
    start(controller) {
      const decoder = new TextDecoder();
      let err = "";
      let got = false;
      child.stdout.on("data", (d: Buffer) => { got = true; controller.enqueue(decoder.decode(d)); });
      child.stderr.on("data", (d: Buffer) => { err += d.toString(); });
      child.on("error", (e) => {
        controller.enqueue(`[系统] 无法启动本机 agent（claude CLI）：${e.message}`);
        controller.close();
      });
      child.on("close", (code) => {
        if (!got && code !== 0) {
          controller.enqueue(`[系统] GM 生成失败（退出码 ${code}）：${err.slice(0, 160)}`);
        }
        controller.close();
      });
      child.stdin.write(prompt);
      child.stdin.end();
    },
    cancel() {
      child.kill("SIGKILL");
    },
  });
}

// ---------- Google Gemini ----------
async function streamGemini(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<ReadableStream<string>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("缺少 GEMINI_API_KEY，请在 .env.local 中配置");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini API 错误 ${res.status}: ${detail}`);
  }

  return parseSSE(res.body, (data) => {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  });
}

// ---------- 通用 SSE 解析 ----------
// 把厂商的 SSE 字节流转成纯文本增量流。extract 负责从每条 JSON 中取出文本片段。
function parseSSE(
  body: ReadableStream<Uint8Array>,
  extract: (data: any) => string | null,
): ReadableStream<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<string>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const piece = extract(JSON.parse(payload));
          if (piece) controller.enqueue(piece);
        } catch {
          /* 忽略无法解析的行 */
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
