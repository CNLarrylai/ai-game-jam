"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Scenario } from "@/lib/types";
import type { GeneratedGame } from "@/lib/generation";
import { toScenario } from "@/lib/generation";
import GameChat from "@/components/GameChat";

type View = "input" | "generating" | "preview" | "play";

/** 生成时滚动展示的阶段（对应架构里的路由链，纯展示用） */
const STAGES = [
  "① 识别小说类型",
  "② 匹配游戏机制",
  "③ 提炼世界圣经",
  "④ 编排开场与规则",
];

const MIN_CHARS = 200;

export default function NovelImport() {
  const [view, setView] = useState<View>("input");
  const [novelText, setNovelText] = useState("");
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [generated, setGenerated] = useState<GeneratedGame | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [engine, setEngine] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chars = novelText.trim().length;
  const ready = chars >= MIN_CHARS;

  // 生成中：让阶段标签缓慢向前滚动（停在最后一个，等待真实结果）
  useEffect(() => {
    if (view !== "generating") return;
    setStage(0);
    const t = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 1400);
    return () => clearInterval(t);
  }, [view]);

  function readFile(file: File) {
    if (!/\.(txt|md|markdown)$/i.test(file.name)) {
      setError("目前支持 .txt / .md 纯文本文件。");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setNovelText(text);
      setFileName(file.name);
      if (!title.trim()) setTitle(file.name.replace(/\.(txt|md|markdown)$/i, ""));
      setError(null);
    };
    reader.onerror = () => setError("文件读取失败，换一个文件试试。");
    reader.readAsText(file, "utf-8");
  }

  async function generate() {
    if (!ready) return;
    setError(null);
    setEngine(null);
    setView("generating");
    try {
      // 1) 提交任务给后台 worker
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ novelText, title }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { jobId } = (await res.json()) as { jobId: string };

      // 2) 轮询结果（最多 ~4 分钟）
      const deadline = Date.now() + 240000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));
        const sres = await fetch(`/api/jobs/${jobId}`);
        if (!sres.ok) continue;
        const data = (await sres.json()) as {
          status: string;
          engine?: string;
          scenario?: GeneratedGame;
          error?: string;
        };
        if (data.status === "done" && data.scenario) {
          setGenerated(data.scenario);
          setEngine(data.engine || null);
          setView("preview");
          return;
        }
        if (data.status === "error") throw new Error(data.error || "生成失败");
      }
      throw new Error("生成超时——后台 worker 可能没在运行。");
    } catch (err) {
      setError((err as Error).message || "生成失败，请重试。");
      setView("input");
    }
  }

  function startPlay() {
    if (!generated) return;
    // worker 产出的剧本自带稳定 id；离线/旧路径无 id 时再造一个 custom-*
    const withId = generated as GeneratedGame & { id?: string };
    setScenario(
      withId.id
        ? {
            id: withId.id,
            title: generated.title,
            tagline: generated.tagline,
            emoji: generated.emoji,
            opening: generated.opening,
            systemPrompt: generated.systemPrompt,
          }
        : toScenario(generated),
    );
    setView("play");
  }

  // ===== 游玩中：复用现有 GameChat =====
  if (view === "play" && scenario) {
    return <GameChat scenario={scenario} onExit={() => setView("preview")} />;
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      {/* 顶部 */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-parchment/50 transition hover:text-parchment"
        >
          ← 返回首页
        </Link>
        <span className="text-xs text-parchment/30">小说 → 游戏</span>
      </div>

      <header className="mb-8 text-center">
        <h1 className="bg-gradient-to-b from-parchment to-ember bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          把你的小说，变成一场冒险
        </h1>
        <p className="mt-3 text-sm text-parchment/55">
          粘贴或上传一段小说，AI 会识别它的类型、匹配最合适的游戏机制，
          为你生成一个可玩的互动剧本。
        </p>
      </header>

      {/* ===== 生成中：展示路由链 ===== */}
      {view === "generating" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <p className="mb-6 text-center text-sm text-parchment/60">
            正在拆解你的故事……
          </p>
          <ol className="mx-auto max-w-sm space-y-3">
            {STAGES.map((label, i) => {
              const state =
                i < stage ? "done" : i === stage ? "active" : "todo";
              return (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span
                    className={
                      state === "done"
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-ember text-[11px] text-ink"
                        : state === "active"
                          ? "flex h-5 w-5 items-center justify-center rounded-full border border-ember text-ember"
                          : "flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-parchment/30"
                    }
                  >
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span
                    className={
                      state === "todo"
                        ? "text-parchment/30"
                        : state === "active"
                          ? "caret text-parchment"
                          : "text-parchment/70"
                    }
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* ===== 预览：生成结果卡（展示识别类型 + 匹配机制） ===== */}
      {view === "preview" && generated && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-ember/30 bg-white/[0.04] p-7">
            <div className="flex items-start gap-4">
              <span className="text-5xl">{generated.emoji}</span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-parchment">
                  {generated.title}
                </h2>
                <p className="mt-1 text-sm text-parchment/55">
                  {generated.tagline}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-parchment/70">
                    识别类型 · {generated.genre}
                  </span>
                  <span className="rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-xs text-ember">
                    匹配机制 · {generated.mechanic}
                  </span>
                  {engine && (
                    <span
                      title={engine === "agent" ? "由 Claude agent（订阅）生成" : "由 Anthropic API 兜底生成"}
                      className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300"
                    >
                      {engine === "agent" ? "agent 生成" : "API 生成"}
                    </span>
                  )}
                  {generated.offline && (
                    <span
                      title="未配置 API key，由规则引擎离线生成；配置后可用真模型获得更佳效果"
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-parchment/45"
                    >
                      离线生成
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="mb-1.5 text-[11px] uppercase tracking-wider text-parchment/35">
                开场
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-parchment/85">
                {generated.opening}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={startPlay}
              className="rounded-xl bg-ember px-6 py-3 font-medium text-ink transition hover:brightness-110"
            >
              开始游戏 →
            </button>
            <button
              onClick={() => setView("input")}
              className="rounded-xl border border-white/15 px-6 py-3 text-sm text-parchment/70 transition hover:bg-white/5"
            >
              换段小说重生成
            </button>
          </div>
        </div>
      )}

      {/* ===== 输入：粘贴 / 上传 ===== */}
      {view === "input" && (
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="小说标题（可选）"
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-parchment placeholder:text-parchment/30 focus:border-ember/60 focus:outline-none"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) readFile(f);
            }}
            className={`relative rounded-2xl border-2 border-dashed transition ${
              dragging ? "border-ember/70 bg-ember/5" : "border-white/15"
            }`}
          >
            <textarea
              value={novelText}
              onChange={(e) => {
                setNovelText(e.target.value);
                if (fileName) setFileName(null);
              }}
              rows={12}
              placeholder="在此粘贴小说内容，或把 .txt / .md 文件拖到这里……"
              className="w-full resize-none rounded-2xl bg-transparent px-4 py-4 text-sm leading-relaxed text-parchment placeholder:text-parchment/30 focus:outline-none"
            />
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-xs">
              <div className="flex items-center gap-3 text-parchment/40">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-white/15 px-2.5 py-1 text-parchment/70 transition hover:bg-white/5"
                >
                  选择文件
                </button>
                {fileName && (
                  <span className="text-parchment/50">已导入：{fileName}</span>
                )}
              </div>
              <span className={ready ? "text-parchment/45" : "text-parchment/30"}>
                {chars} 字{!ready && ` / 至少 ${MIN_CHARS}`}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <button
            onClick={generate}
            disabled={!ready}
            className="w-full rounded-xl bg-ember px-6 py-3.5 font-medium text-ink transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            生成游戏
          </button>

          <p className="text-center text-xs text-parchment/30">
            小说越完整，AI 越能抓准类型与机制。建议至少 1000 字以上。
          </p>
        </div>
      )}
    </main>
  );
}
