"use client";

import { useState } from "react";
import Link from "next/link";
import { scenarios } from "@/lib/scenarios";
import type { Scenario } from "@/lib/types";
import GameChat from "@/components/GameChat";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 mt-12 text-sm font-semibold uppercase tracking-wider text-ember/80">
      {children}
    </h2>
  );
}

export default function Home() {
  const [active, setActive] = useState<Scenario | null>(null);

  if (active) {
    return <GameChat scenario={active} onExit={() => setActive(null)} />;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-4 text-center">
        <h1 className="bg-gradient-to-b from-parchment to-ember bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
          AI Game Jam
        </h1>
        <p className="mt-3 text-parchment/60">
          一个门户：玩我们做好的游戏，或<span className="text-parchment/90">导入一本小说</span>，现场生成一个全新的游戏。
        </p>
      </div>

      {/* —— 成品游戏：直播间形态，即点即玩 —— */}
      <SectionLabel>🎮 成品游戏 · 即点即玩</SectionLabel>
      <a
        href="/games/worlds-live/index.html"
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-ember/30 bg-gradient-to-br from-ember/[0.12] to-white/[0.02] p-7 transition hover:border-ember/70 hover:from-ember/20"
      >
        <span className="absolute right-5 top-5 rounded-full bg-ember/90 px-3 py-1 text-xs font-bold text-ink">
          可玩 · 直播间
        </span>
        <span className="text-5xl">🛸</span>
        <h3 className="mt-4 text-2xl font-bold text-parchment">WORLDS LIVE · 世界大战</h3>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-parchment/65">
          《世界大战》改编 · 维多利亚末日生存直播。火星人入侵，你只是个普通人——打不赢，只能躲。
          带妻逃亡、潜行避敌、撑过七天，等火星人被地球细菌击倒。观众的弹幕会写进你的命运。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["开场演出", "生存抉择", "隐蔽潜行", "同伴对白", "观众弹幕"].map((t) => (
            <span key={t} className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-parchment/70">
              {t}
            </span>
          ))}
        </div>
        <span className="mt-5 text-sm font-semibold text-ember">进入直播间 →</span>
      </a>

      {/* —— 文字冒险剧本：AI 主持人实时叙事 —— */}
      <SectionLabel>📜 文字冒险剧本 · AI 主持人实时编织</SectionLabel>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s)}
            className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-ember/50 hover:bg-white/[0.06]"
          >
            <span className="text-4xl">{s.emoji}</span>
            <h3 className="mt-4 text-lg font-semibold text-parchment">{s.title}</h3>
            <p className="mt-1 flex-1 text-sm text-parchment/55">{s.tagline}</p>
            <span className="mt-4 text-sm font-medium text-ember opacity-0 transition group-hover:opacity-100">
              开始冒险 →
            </span>
          </button>
        ))}
      </div>

      {/* —— 创作入口：导入小说 / 剧本索引 —— */}
      <SectionLabel>✨ 创作你自己的</SectionLabel>
      <div className="grid gap-5 sm:grid-cols-2">
        <Link
          href="/create"
          className="group flex flex-col rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-left transition hover:border-ember/50 hover:bg-white/[0.05]"
        >
          <span className="text-4xl">📖</span>
          <h3 className="mt-4 text-lg font-semibold text-parchment">从你的小说生成</h3>
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
          <h3 className="mt-4 text-lg font-semibold text-parchment">剧本索引</h3>
          <p className="mt-1 flex-1 text-sm text-parchment/55">
            跨来源（内置 / 仓库 / GitHub）聚合的剧本目录，支持动态新增、即时上线。
          </p>
          <span className="mt-4 text-sm font-medium text-ember opacity-0 transition group-hover:opacity-100">
            浏览索引 →
          </span>
        </Link>
      </div>

      <p className="mt-14 text-center text-xs text-parchment/30">
        想加剧本？往{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5">scenarios/index.json</code>
        {" "}加一项并提交即可。直播间成品游戏见{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5">novel_to_game_Larry/</code>
        。
      </p>
    </main>
  );
}
