import mammoth from "mammoth";
import fs from "node:fs";

const f = process.argv[2];
const r = await mammoth.extractRawText({ path: f });
const lines = r.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
console.log("=== Full text (", r.value.length, "chars) ===");
console.log(r.value);
console.log("\n=== Lines ===");
for (let i = 0; i < lines.length; i++) {
  console.log(i, "[" + lines[i].length + "]:", JSON.stringify(lines[i]));
}
