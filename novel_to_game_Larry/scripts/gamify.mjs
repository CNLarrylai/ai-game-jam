// gamify.mjs — Step 5 (API engine): distill one chapter into 1-2 contract nodes.
// Run from anywhere: `node scripts/gamify.mjs`. Needs ANTHROPIC_API_KEY.
//   reads  data/selected.json
//   writes build/cards/<id>.json
// This is the API-backed alternative to the in-harness subagent engine; same output contract.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = "claude-opus-4-8";

const chapter = JSON.parse(readFileSync(join(ROOT, "data", "selected.json"), "utf8"));

const GLOBAL_CONTEXT =
  "This chapter is from the back half of Mary Shelley's *The Last Man*. A plague has spread " +
  "from the East into a global pandemic. Society is collapsing: harvests fail, cities empty, " +
  "refugees flood the roads, and the institutions that once held order are breaking down. " +
  "Survivors must make hard choices about shelter, food, the sick, and each other.";

const RES_ENUM = ["food", "health", "morale"];
const NODE_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    nodes: {
      type: "array", description: "1 to 2 narrative decision nodes distilled from the chapter.",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          id: { type: "string" }, title: { type: "string" }, desc: { type: "string" },
          generated: { type: "boolean" }, icon: { type: "string" },
          choices: {
            type: "array",
            items: {
              type: "object", additionalProperties: false,
              properties: {
                id: { type: "string" }, label: { type: "string" }, hint: { type: "string" },
                costs: { type: "array", items: { type: "object", additionalProperties: false,
                  properties: { res: { type: "string", enum: RES_ENUM }, d: { type: "integer" } }, required: ["res", "d"] } },
                risk: { type: "boolean" },
                outcome: { type: "object", additionalProperties: false,
                  properties: { emoji: { type: "string" }, title: { type: "string" }, body: { type: "string" } }, required: ["emoji", "title", "body"] },
                next: { type: "string" }, effects: { type: "array", items: { type: "string" } },
              },
              required: ["id", "label", "hint", "costs", "risk", "outcome", "next", "effects"],
            },
          },
        },
        required: ["id", "title", "desc", "generated", "icon", "choices"],
      },
    },
  },
  required: ["nodes"],
};

const SYSTEM = `You are a narrative designer who turns literary fiction into a survival-choice game (apocalyptic theme).
Given ONE chapter, find 1-2 moments where survivors must make a genuinely hard decision, and turn each into a game "decision node."
- Strip the prose; keep what happens, who must decide, and the tradeoff.
- 2-3 choices per node, all real tradeoffs (no obviously-correct option).
- Costs land only on: food (🥫), health (💊), morale (🔥).
- At least one choice per node has risk=true: its precise costs/outcome are a hidden reveal; its hint is vague.
- "effects" notes downstream causal consequences (may be empty).
- Stay faithful to the chapter's real events and characters. Output strictly in the required JSON structure.`;

const USER = `GLOBAL BACKGROUND:\n${GLOBAL_CONTEXT}\n\nCHAPTER (${chapter.id}, density ${chapter.density}/1k):\n\n${chapter.text}`;

const client = new Anthropic();
console.log(`Distilling ${chapter.id} (${chapter.words} words) with ${MODEL}...`);

const response = await client.messages.create({
  model: MODEL, max_tokens: 8000, thinking: { type: "adaptive" },
  system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: USER }],
  output_config: { format: { type: "json_schema", schema: NODE_SCHEMA } },
});

const parsed = JSON.parse(response.content.find((b) => b.type === "text").text);
const outPath = join(ROOT, "build", "cards", `${chapter.id}.json`);
writeFileSync(outPath, JSON.stringify(parsed.nodes, null, 2));
console.log(`Done. ${parsed.nodes.length} node(s) -> build/cards/${chapter.id}.json`);
