// Recipe image extractor.
//
// Reads the existing data/recipes.json (produced by extract-recipes.mjs)
// to learn each recipe's slug, then for each recipe with a DOCX source
// (or a "*Pictures" companion DOCX), extracts the largest embedded image
// and writes it to public/recipes/<slug>.jpg.
//
// Run AFTER extract-recipes.mjs:
//   node scripts/extract-images.mjs
//   or: npm run extract-images

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RECIPES_DIR = "C:\\Users\\freemanshe\\Personal Vibe Coding\\Recipes";
const OUT_DIR = path.join(ROOT, "public", "recipes");
const DATA_JSON = path.join(ROOT, "data", "recipes.json");

const MAX_DIM = 800;       // longest edge in pixels
const JPEG_QUALITY = 82;   // 0-100
const MIN_BYTES = 5000;    // ignore tiny images (likely logos, dividers)

function isPicturesCompanion(filename) {
  return /\bpictures\b/i.test(path.basename(filename));
}

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function findPicturesCompanion(recipeFile) {
  // Look in the same dir and in common subfolders. The Pictures companion
  // is usually named "<recipe basename> Pictures.docx".
  const dir = path.dirname(recipeFile);
  const baseNoExt = path.basename(recipeFile, path.extname(recipeFile));
  const candidates = [
    path.join(dir, `${baseNoExt} Pictures.docx`),
    path.join(dir, `${baseNoExt} Pictures.DOCX`),
    path.join(RECIPES_DIR, "Christmas", `${baseNoExt} Pictures.docx`),
    path.join(RECIPES_DIR, "Cupcakes", `${baseNoExt} Pictures.docx`),
    path.join(RECIPES_DIR, "Dinner", `${baseNoExt} Pictures.docx`),
    path.join(RECIPES_DIR, "Appetizers", `${baseNoExt} Pictures.docx`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && c !== recipeFile) return c;
  }
  return null;
}

async function extractLargestDocxImage(docxPath) {
  const candidates = [];
  await mammoth.convertToHtml(
    { path: docxPath },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const data = await image.read("base64");
        const buf = Buffer.from(data, "base64");
        if (buf.length < MIN_BYTES) return { src: "ignored" };
        candidates.push({ buffer: buf, contentType: image.contentType });
        return { src: "ignored" };
      }),
    }
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.buffer.length - a.buffer.length);
  return candidates[0];
}

async function writeJpg(buffer, outPath) {
  await sharp(buffer)
    .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(outPath);
}

async function main() {
  if (!fs.existsSync(DATA_JSON)) {
    console.error(`Run \`npm run extract\` (or \`npm run extract-recipes\`) first to produce ${DATA_JSON}.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const recipes = JSON.parse(fs.readFileSync(DATA_JSON, "utf8"));
  console.log(`Found ${recipes.length} recipes; scanning for embedded DOCX images…`);

  // Build a map from sourceFile → recipe
  const bySource = new Map();
  for (const r of recipes) {
    bySource.set(normalizePath(r.sourceFile), r);
  }

  let totalOk = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const rec of recipes) {
    const recipePath = path.join(RECIPES_DIR, normalizePath(rec.sourceFile));
    if (!fs.existsSync(recipePath)) {
      totalSkipped++;
      continue;
    }

    // Find a DOCX source: the main file if it's a DOCX, or a Pictures companion
    const isDocx = /\.docx$/i.test(recipePath);
    const companion = findPicturesCompanion(recipePath);
    const docxSource = companion || (isDocx ? recipePath : null);
    if (!docxSource) {
      totalSkipped++;
      continue;
    }

    const out = path.join(OUT_DIR, `${rec.slug}.jpg`);
    if (fs.existsSync(out)) {
      // already extracted; skip
      totalOk++;
      continue;
    }

    try {
      const img = await extractLargestDocxImage(docxSource);
      if (!img) {
        totalSkipped++;
        continue;
      }
      await writeJpg(img.buffer, out);
      const src = path.relative(RECIPES_DIR, docxSource);
      console.log(`✓ ${rec.sourceFile} → ${rec.slug}.jpg (from ${path.basename(src)}, ${(img.buffer.length / 1024).toFixed(0)}KB)`);
      totalOk++;
    } catch (e) {
      totalFailed++;
      console.log(`✗ ${rec.sourceFile} (${e.message?.slice(0, 80) || "error"})`);
    }
  }

  console.log(`\nDone: ${totalOk} extracted, ${totalSkipped} skipped, ${totalFailed} failed.`);
  console.log(`Output: ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

