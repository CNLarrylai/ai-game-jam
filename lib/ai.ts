import type { ChatMessage } from "./types";

/**
 * AI Provider 抽象层
 * ============================================
 * 统一封装不同模型厂商的「流式对话」接口，返回一个 ReadableStream<string>。
 * 当前支持：anthropic（Claude）、gemini。
 * 想接入新厂商？加一个 streamXxx 函数，并在 streamChat 里分支即可。
 */

const PROVIDER = process.env.AI_PROVIDER || "anthropic";

export function streamChat(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<ReadableStream<string>> {
  switch (PROVIDER) {
    case "gemini":
      return streamGemini(systemPrompt, messages);
    case "anthropic":
    default:
      return streamAnthropic(systemPrompt, messages);
  }
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
