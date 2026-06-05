import { getAllScenarios } from "@/lib/registry";
import ScenarioBrowser from "@/components/ScenarioBrowser";

// 运行时渲染：每次请求重新聚合三来源（含运行时 GitHub 索引）
export const dynamic = "force-dynamic";

export const metadata = {
  title: "剧本索引 — AI Game Jam",
  description: "跨来源（内置 / 仓库 / GitHub）聚合的剧本目录。",
};

export default async function ScenariosPage() {
  const scenarios = await getAllScenarios();
  return <ScenarioBrowser scenarios={scenarios} />;
}
