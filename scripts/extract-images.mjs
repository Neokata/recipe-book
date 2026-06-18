// Recipe image extractor.
//
// Reads the existing data/recipes.json (produced by extract-recipes.mjs)
// to learn each recipe's slug, then for each recipe extracts the best
// available image and writes it to public/recipes/<slug>.jpg.
//
// Strategy (in order of preference):
//   1. If a "*Pictures" companion DOCX exists, extract its largest embedded
//      image (these files contain curated high-quality photos of the recipe).
//   2. Otherwise, for DOCX files, extract the largest embedded image from
//      the main file (most DOCX recipes have a hero photo embedded).
//   3. For PDF files, try `pdfimages` (Poppler) to extract the largest
//      real embedded image. If a PDF has no embedded images (e.g. recipe
//      cards that draw the photo as vector shapes), fall back to
//      `pdftoppm` to render page 1 as a PNG (then resize to JPEG).
//
// Requires Poppler (https://github.com/oschwartz10612/poppler-windows/releases)
// for the PDF paths. On Windows: extract to C:\poppler\ and ensure
// C:\poppler\poppler-XX.XX.XX\Library\bin is on PATH, or set POPPLER_BIN.
//
// Run AFTER extract-recipes.mjs:
//   node scripts/extract-images.mjs
//   or: npm run extract-images

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
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

// Find Poppler binaries. On Windows, look in known install locations and PATH.
const POPPLER_PATHS = [
  process.env.POPPLER_BIN,
  "C:\\poppler\\poppler-26.02.0\\Library\\bin",
  "C:\\Program Files\\poppler\\Library\\bin",
  "C:\\Program Files (x86)\\poppler\\Library\\bin",
  // /mingw64-style paths when running under Git Bash
  "/c/poppler/poppler-26.02.0/Library/bin",
  "/c/poppler/Release-26.02.0-0/Library/bin",
];
let PDFIMAGES = null;
let PDFTOPPM = null;
for (const dir of POPPLER_PATHS) {
  if (!dir) continue;
  const candidates = {
    pdfimages: path.join(dir, process.platform === "win32" ? "pdfimages.exe" : "pdfimages"),
    pdftoppm:  path.join(dir, process.platform === "win32" ? "pdftoppm.exe"  : "pdftoppm"),
  };
  if (!PDFIMAGES && fs.existsSync(candidates.pdfimages)) PDFIMAGES = candidates.pdfimages;
  if (!PDFTOPPM && fs.existsSync(candidates.pdftoppm)) PDFTOPPM = candidates.pdftoppm;
  if (PDFIMAGES && PDFTOPPM) break;
}

// Also try PATH directly (covers Linux/macOS or PATH-set Windows installs)
if (!PDFIMAGES || !PDFTOPPM) {
  try { execFileSync("pdfimages", ["-v"], { stdio: "ignore" }); PDFIMAGES = "pdfimages"; } catch {}
  try { execFileSync("pdftoppm",  ["-v"], { stdio: "ignore" }); PDFTOPPM  = "pdftoppm";  } catch {}
}

if (PDFIMAGES || PDFTOPPM) {
  console.log(`Poppler: ${PDFIMAGES ? "pdfimages ✓" : "pdfimages ✗"}  ${PDFTOPPM ? "pdftoppm ✓" : "pdftoppm ✗"}`);
} else {
  console.log("Poppler not found — PDF recipes will be skipped. Install Poppler or set POPPLER_BIN.");
}

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

// --- PDF extraction (Poppler) -------------------------------------------------

function extractLargestPdfImage(pdfPath) {
  if (!PDFIMAGES) return null;
  const tmpDir = fs.mkdtempSync(path.join(OUT_DIR, ".pdf-img-"));
  try {
    // -png: extract as PNG (works for all formats); -f 1 -l 1: first page only.
    // We extract ALL pages because some PDFs have multiple images (e.g. step
    // photos) and we want to find the largest single photo. Then we pick the
    // biggest by file size.
    execFileSync(PDFIMAGES, ["-png", "-f", "1", "-l", "1", pdfPath, path.join(tmpDir, "img")], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000,
    });
    const files = fs.readdirSync(tmpDir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
    if (files.length === 0) return null;
    let best = null, bestSize = 0;
    for (const f of files) {
      const full = path.join(tmpDir, f);
      const stat = fs.statSync(full);
      if (stat.size > bestSize && stat.size >= MIN_BYTES) {
        bestSize = stat.size;
        best = full;
      }
    }
    if (!best) return null;
    return fs.readFileSync(best);
  } catch (e) {
    return null;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function renderPdfPageOne(pdfPath) {
  if (!PDFTOPPM) return null;
  const tmpBase = path.join(OUT_DIR, `.tmp-${Date.now()}`);
  try {
    execFileSync(PDFTOPPM, [
      "-f", "1", "-l", "1",
      "-singlefile",
      "-r", "150",
      "-png",
      pdfPath,
      tmpBase,
    ], { stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
    const pngPath = tmpBase + ".png";
    if (!fs.existsSync(pngPath)) return null;
    const buf = fs.readFileSync(pngPath);
    try { fs.unlinkSync(pngPath); } catch {}
    return buf;
  } catch (e) {
    return null;
  }
}

async function cropAndResize(pngBuffer, outPath, opts = {}) {
  const topFrac = opts.topFrac ?? 0.6;
  const meta = await sharp(pngBuffer).metadata();
  const cropH = Math.max(1, Math.round((meta.height || 0) * topFrac));
  await sharp(pngBuffer)
    .extract({ left: 0, top: 0, width: meta.width, height: cropH })
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

    // Find a source: Pictures companion DOCX (best), main DOCX (good), PDF (fallback)
    const isDocx = /\.docx$/i.test(recipePath);
    const isPdf = /\.pdf$/i.test(recipePath);
    const companion = findPicturesCompanion(recipePath);
    const docxSource = companion || (isDocx ? recipePath : null);
    const pdfSource = isPdf ? recipePath : null;

    if (!docxSource && !pdfSource) {
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
      let img = null;
      let sourceNote = "";

      if (docxSource) {
        img = await extractLargestDocxImage(docxSource);
        if (img) sourceNote = `from ${path.basename(path.relative(RECIPES_DIR, docxSource))}, ${(img.buffer.length / 1024).toFixed(0)}KB ${img.contentType}`;
      } else if (pdfSource) {
        // First try: extract real embedded images via pdfimages
        const embedded = extractLargestPdfImage(pdfSource);
        if (embedded) {
          img = { buffer: embedded, contentType: "image/png" };
          sourceNote = `pdfimages, ${(embedded.length / 1024).toFixed(0)}KB`;
        } else {
          // Fallback: render page 1 via pdftoppm
          const png = renderPdfPageOne(pdfSource);
          if (png && png.length >= MIN_BYTES) {
            img = { buffer: png, contentType: "image/png" };
            sourceNote = `pdftoppm page 1, ${(png.length / 1024).toFixed(0)}KB`;
          }
        }
      }

      if (!img) {
        totalSkipped++;
        continue;
      }

      // For pdfimages output (already a real photo), just resize to JPEG.
      // For pdftoppm output (likely a recipe card with a styled hero area),
      // crop the top 60% where the photo usually sits.
      if (sourceNote.startsWith("pdftoppm")) {
        const tmpIn = path.join(OUT_DIR, `.tmp-in-${Date.now()}-${Math.random().toString(36).slice(2,8)}.png`);
        const tmpOut = path.join(OUT_DIR, `.tmp-out-${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`);
        try {
          fs.writeFileSync(tmpIn, img.buffer);
          await cropAndResize(fs.readFileSync(tmpIn), tmpOut, { topFrac: 0.6 });
          fs.copyFileSync(tmpOut, out);
        } finally {
          try { fs.unlinkSync(tmpIn); } catch {}
          try { fs.unlinkSync(tmpOut); } catch {}
        }
      } else {
        await writeJpg(img.buffer, out);
      }

      console.log(`✓ ${rec.sourceFile} → ${rec.slug}.jpg (${sourceNote})`);
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

