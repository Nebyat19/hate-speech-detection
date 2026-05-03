import { createModerator } from "../src/index.js";

const m = createModerator({
  onFirstLoad: (id) => console.log("[smoke] loading", id),
});

const samples = ["hello", "you are stupid"];
for (const s of samples) {
  console.log(s, await m.classify(s, { threshold: 0.5 }));
}
