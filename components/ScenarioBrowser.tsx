"use client";

import { useState } from "react";
import Link from "next/link";
import GameChat from "@/components/GameChat";
import type { IndexedScenario, ScenarioSource } from "@/lib/registry";

const SOURCE_META: Record<ScenarioSource, { label: string; cls: string }> = {
  builtin: { label: "内置", cls: "border-white/15 text-parchment/55" },
  repo: { label: "仓库", cls: "border-sky-400/40 bg-sky-400/10 text-sky-300" },
  github: { label: "GitHub", cls: "border-ember/40 bg-ember/10 text-ember" },
  generated: { label: "AI生成", cls: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" },
};

export default function ScenarioBrowser({
  scenarios,
}: {
  scenarios: IndexedScenario[];
}) {
  const [active, setActive] = useState<IndexedScenario | null>(null);

  if (active) {
    return <GameChat scenario={active} onExit={() => setActive(null)} />;
  }

  const counts = scenarios.reduce<Record<string, number>>((acc, s) => {
    acc[s.source] = (acc[s.source] || 0) + 1;
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-parchment/50 transition hover:text-parchment">
          ← 返回首页
        </Link>
        <span className="text-xs text-parchment/30">剧本索引</span>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl font-bold text-parchment sm:text-3xl">🗂️ 剧本索引</h1>
        <p className="mt-2 text-sm text-parchment/55">
          跨来源聚合的剧本目录：
          <span className="text-parchment/70"> 内置 {counts.builtin || 0}</span> ·
          <span className="text-sky-300"> 仓库 {counts.repo || 0}</span> ·
          <span className="text-ember"> GitHub {counts.github || 0}</span>
          。新增剧本只需往 <code className="rounded bg-white/10 px-1.5 py-0.5">scenarios/index.json</code> 加一项并提交。
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => {
          const meta = SOURCE_META[s.source];
          return (
            <button
              key={s.id}
              onClick={() => setActive(s)}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-ember/50 hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between">
                <span className="text-4xl">{s.emoji}</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${meta.cls}`}>
                  {meta.label}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-parchment">{s.title}</h2>
              <p className="mt-1 flex-1 text-sm text-parchment/55">{s.tagline}</p>
              {(s.genre || s.mechanic) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.genre && (
                    <span className="rounded-full border border-white/12 px-2 py-0.5 text-[11px] text-parchment/50">
                      {s.genre}
                    </span>
                  )}
                  {s.mechanic && (
                    <span className="rounded-full border border-white/12 px-2 py-0.5 text-[11px] text-parchment/50">
                      {s.mechanic}
                    </span>
                  )}
                </div>
              )}
              <span className="mt-4 text-sm font-medium text-ember opacity-0 transition group-hover:opacity-100">
                开始冒险 →
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-12 text-center text-xs text-parchment/30">
        想现场用自己的小说生成？去{" "}
        <Link href="/create" className="text-ember/80 hover:text-ember">
          /create
        </Link>
        。索引来源与刷新机制见 <code className="rounded bg-white/10 px-1.5 py-0.5">scenarios/README.md</code>。
      </p>
    </main>
  );
}
