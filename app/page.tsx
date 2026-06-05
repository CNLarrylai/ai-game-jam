"use client";

import { useState } from "react";
import Link from "next/link";
import { scenarios } from "@/lib/scenarios";
import type { Scenario } from "@/lib/types";
import GameChat from "@/components/GameChat";

export default function Home() {
  const [active, setActive] = useState<Scenario | null>(null);

  if (active) {
    return <GameChat scenario={active} onExit={() => setActive(null)} />;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="bg-gradient-to-b from-parchment to-ember bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
          AI Game Jam
        </h1>
        <p className="mt-3 text-parchment/60">
          选一个剧本，AI 主持人会为你实时编织一个独一无二的故事。
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s)}
            className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-ember/50 hover:bg-white/[0.06]"
          >
            <span className="text-4xl">{s.emoji}</span>
            <h2 className="mt-4 text-lg font-semibold text-parchment">{s.title}</h2>
            <p className="mt-1 flex-1 text-sm text-parchment/55">{s.tagline}</p>
            <span className="mt-4 text-sm font-medium text-ember opacity-0 transition group-hover:opacity-100">
              开始冒险 →
            </span>
          </button>
        ))}

        <Link
          href="/create"
          className="group flex flex-col rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-left transition hover:border-ember/50 hover:bg-white/[0.05]"
        >
          <span className="text-4xl">📖</span>
          <h2 className="mt-4 text-lg font-semibold text-parchment">从你的小说生成</h2>
          <p className="mt-1 flex-1 text-sm text-parchment/55">
            粘贴或上传一段小说，AI 自动识别类型、匹配机制，现场生成一个可玩剧本。
          </p>
          <span className="mt-4 text-sm font-medium text-ember opacity-0 transition group-hover:opacity-100">
            导入小说 →
          </span>
        </Link>

        <Link
          href="/scenarios"
          className="group flex flex-col rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-left transition hover:border-ember/50 hover:bg-white/[0.05]"
        >
          <span className="text-4xl">🗂️</span>
          <h2 className="mt-4 text-lg font-semibold text-parchment">剧本索引</h2>
          <p className="mt-1 flex-1 text-sm text-parchment/55">
            跨来源（内置 / 仓库 / GitHub）聚合的剧本目录，支持动态新增、即时上线。
          </p>
          <span className="mt-4 text-sm font-medium text-ember opacity-0 transition group-hover:opacity-100">
            浏览索引 →
          </span>
        </Link>
      </div>

      <p className="mt-14 text-center text-xs text-parchment/30">
        想加自己的剧本？往{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5">scenarios/index.json</code>
        {" "}加一项并提交即可，无需改代码。详见{" "}
        <Link href="/scenarios" className="text-ember/80 hover:text-ember">
          剧本索引
        </Link>
        。
      </p>
    </main>
  );
}
