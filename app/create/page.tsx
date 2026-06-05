import NovelImport from "@/components/NovelImport";

export const metadata = {
  title: "从小说生成游戏 — AI Game Jam",
  description: "粘贴或上传一段小说，AI 会识别类型、匹配机制，生成一个可玩的互动剧本。",
};

export default function CreatePage() {
  return <NovelImport />;
}
