"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type Summary = {
  title: string;
  opening: string;
  scenes: string[];
  crew: string[];
};

const SAMPLE = `末日第四十七天。丧尸潮退去后，城市成了钢铁与腐肉的坟场。陈野背着空了大半的背包，蹲在天台边缘，啃着最后半块发霉的压缩饼干。楼下的街道上，三两只游荡的丧尸拖着断腿，发出空洞的低吼。他的水壶昨天就见底了，喉咙干得像吞了沙子。远处的加油站招牌还亮着半边，便利店、社区医院、废弃的地铁站——每一个都可能有补给，也可能是埋骨之地。怀里那把卷了刃的猎刀，是他唯一的依靠。`;

export default function Studio() {
  const [novel, setNovel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ playUrl: string; summary: Summary } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 读 txt 文件：优先 UTF-8，乱码则回退 GBK（中文小说常见）
  async function readFile(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) { setError("文件太大（>5MB），请截取一段。"); return; }
    const buf = await file.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("�")) {
      try { text = new TextDecoder("gbk").decode(buf); } catch { /* 浏览器不支持 gbk 就保留 utf-8 */ }
    }
    setNovel(text.trim());
    setFileName(file.name);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  }

  async function generate() {
    const text = novel.trim();
    if (text.length < 150) { setError("小说内容至少需要 150 字。"); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/generate-game", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ novelText: text }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      // 游戏数据存 localStorage，游戏壳按 ?id 读取（serverless 友好，无需写文件）
      try { localStorage.setItem("wl_game_" + data.id, JSON.stringify(data.gameData)); } catch {}
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm text-ember/80 hover:text-ember">← 返回门户</Link>
      <h1 className="mt-4 text-3xl font-bold text-parchment">🎬 小说 → 叙事抉择游戏</h1>
      <p className="mt-2 text-sm text-parchment/60">
        粘一段<span className="text-parchment/90">末世 / 生存类</span>小说，AI 把它的剧情拆成 6 幕，
        每一幕一个<span className="text-ember">艰难抉择</span>——产出一款木刻风叙事生存游戏（玩法类似《最后的人》），
        小说的人物、剧情、两难直接长进游戏里。
      </p>

      {/* 上传 / 拖拽 / 粘贴 三合一 */}
      <input
        ref={fileRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={"relative mt-6 rounded-xl border transition " + (dragOver ? "border-ember bg-ember/10" : "border-white/15")}
      >
        <textarea
          value={novel}
          onChange={(e) => { setNovel(e.target.value); setFileName(null); }}
          rows={10}
          placeholder="把小说原文粘贴到这里，或把 .txt 文件拖进来 / 点下方按钮上传（≥150 字，末世/生存题材最佳）…"
          className="w-full resize-y rounded-xl bg-black/30 px-4 py-3 text-sm leading-relaxed text-parchment placeholder:text-parchment/30 focus:outline-none"
        />
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-ink/70 text-sm font-medium text-ember">
            松开以载入 txt 文件
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-parchment/40">
        <div className="flex items-center gap-3">
          <button onClick={() => fileRef.current?.click()} className="rounded-md border border-white/15 px-2.5 py-1 text-parchment/70 hover:border-ember/50 hover:text-ember">
            📄 上传 .txt 文件
          </button>
          <button onClick={() => { setNovel(SAMPLE); setFileName(null); }} className="hover:text-ember">↳ 填入示例（丧尸末世）</button>
        </div>
        <span>{fileName ? `📎 ${fileName} · ` : ""}{novel.trim().length} 字</span>
      </div>

      <button
        onClick={generate}
        disabled={busy}
        className="mt-5 rounded-xl bg-ember px-6 py-3 font-medium text-ink transition enabled:hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "🤖 AI 正在拆解小说剧情、生成抉择幕…（约 30–60s）" : "✨ 生成叙事抉择游戏"}
      </button>

      {error && (
        <div className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-2xl border border-ember/40 bg-ember/[0.08] p-6">
          <div className="text-sm font-semibold text-ember">✅ 《{result.summary.title}》已生成</div>
          <p className="mt-2 text-sm leading-relaxed text-parchment/80">{result.summary.opening}</p>
          <div className="mt-4 space-y-2 text-xs text-parchment/65">
            <div><b className="text-parchment/90">六幕剧情：</b>{result.summary.scenes.map((s, i) => `${i + 1}.${s}`).join("  ")}</div>
            <div><b className="text-parchment/90">同行者：</b>{result.summary.crew.join("  ")}</div>
          </div>
          <a
            href={result.playUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded-xl bg-ember px-6 py-3 font-medium text-ink transition hover:brightness-110"
          >
            🎮 开始玩 →
          </a>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-parchment/30">
        AI 把小说拆成 6 幕道德/生存抉择，注入《最后的人》同款木刻叙事壳 ·
        <code className="rounded bg-white/10 px-1.5 py-0.5">/games/last-man</code>
      </p>
    </main>
  );
}
