"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Scenario } from "@/lib/types";

export default function GameChat({
  scenario,
  onExit,
}: {
  scenario: Scenario;
  onExit: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: scenario.opening },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    const action = input.trim();
    if (!action || streaming) return;

    const history: ChatMessage[] = [
      ...messages,
      { role: "user", content: action },
    ];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id, messages: history }),
      });
      if (!res.ok || !res.body) {
        throw new Error(await res.text());
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: `[系统] 出错了：${(err as Error).message}`,
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between border-b border-white/10 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{scenario.emoji}</span>
          <div>
            <h1 className="text-lg font-semibold">{scenario.title}</h1>
            <p className="text-xs text-parchment/50">{scenario.tagline}</p>
          </div>
        </div>
        <button
          onClick={onExit}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-parchment/70 transition hover:bg-white/5"
        >
          ← 换个剧本
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto py-6">
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          return (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-ember/20 px-4 py-2.5 text-parchment"
                    : "max-w-[88%] whitespace-pre-wrap leading-relaxed text-parchment/90"
                }
              >
                {m.role === "user" && (
                  <span className="mb-0.5 block text-[11px] uppercase tracking-wider text-ember/80">
                    你
                  </span>
                )}
                <span
                  className={
                    streaming && isLast && m.role === "assistant" && m.content === ""
                      ? "caret text-parchment/40"
                      : streaming && isLast && m.role === "assistant"
                        ? "caret"
                        : ""
                  }
                >
                  {m.content || (isLast ? "主持人正在落笔" : "")}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 py-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="你打算怎么做？（Enter 发送，Shift+Enter 换行）"
            className="max-h-40 flex-1 resize-none rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-parchment placeholder:text-parchment/30 focus:border-ember/60 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="rounded-xl bg-ember px-5 py-3 font-medium text-ink transition enabled:hover:brightness-110 disabled:opacity-40"
          >
            {streaming ? "…" : "行动"}
          </button>
        </div>
      </div>
    </div>
  );
}
