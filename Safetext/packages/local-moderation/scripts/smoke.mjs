import { createModerator, DEFAULT_LOCAL_MODERATION_MODEL } from "../src/index.js";

const m = createModerator({
  onFirstLoad: (id) => console.log("[smoke] loading", id),
});

const samples = [
  "hello",
  "you are stupid",
  "አንተ በጣም ደደብ ነህ",
];

console.log("[smoke] default model id:", DEFAULT_LOCAL_MODERATION_MODEL);

for (const s of samples) {
  console.log(s, await m.classify(s, { threshold: 0.5 }));
}
