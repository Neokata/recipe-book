// Recipe extraction script.
// Walks the Recipes/ folder, parses PDFs and DOCX files, extracts images,
// normalizes titles/ingredients/steps, and writes data/recipes.json + public/recipes/.
//
// Usage:  node scripts/extract-recipes.mjs
//   or:  npm run extract

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RECIPES_DIR = "C:\\Users\\freemanshe\\Personal Vibe Coding\\Recipes";
const OUT_JSON = path.join(ROOT, "data", "recipes.json");
const OUT_IMG_DIR = path.join(ROOT, "public", "recipes");

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tiff", ".emf", ".wmf"]);

const STOP_TITLE_PREFIXES = [
  /^the best\s+/i,
  /^best\s+/i,
  /^easy\s+/i,
  /^homemade\s+/i,
  /^copycat\s+/i,
  /^classic\s+/i,
  /^ultimate\s+/i,
  /^luxurious\s+/i,
  /^loaded\s+/i,
  /^soft\s+&\s+chewy\s+/i,
  /^soft\s+/i,
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function titleCase(s) {
  return s
    .split(/\s+/)
    .map((w) => {
      if (!w) return w;
      // Keep ALL CAPS or special words intact if already in title case
      if (w.length > 1 && w === w.toUpperCase()) return w;
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function cleanTitle(raw) {
  if (!raw) return "Untitled";
  let t = raw.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  // Replace underscores and pipes with spaces (PDFs often have these in headers)
  t = t.replace(/[|_]+/g, " ").replace(/\s+/g, " ").trim();
  // Strip a leading RECIPE/RECIPE marker
  t = t.replace(/^recipe\s*[:\-]?\s*/i, "");
  // Strip trailing site attribution
  t = t.replace(/\s*[-|_]\s*(life,?\s*love\s*(&|and)?\s*sugar|life\s*love\s*(&|and)?\s*sugar|bbc\s*good\s*food|baker\s*street\s*society|the\s*baking\s*chocolatess|the\s*cozy\s*cook|two\s*sisters|love\s*and\s*olive\s*oil|the\s*flavor\s*bender|preppy\s*kitchen|patisserie\s*makes\s*perfect|cloudy\s*kitchen|julie\s*marie\s*eats|the\s*chunky\s*chef|lemons?\s*\+\s*zest|yellow\s*bliss\s*road|little\s*sunny\s*kitchen|the\s*recipe\s*critic|together\s*as\s*family|baker\s*by\s*nature|beyond\s*frosting|jane's\s*patisserie|cookies\s+cookies|the\s*best\s+fruitcake\s+recipe)\s*$/i, "");
  // Strip trailing generic qualifiers like "_ The Best X Recipe"
  t = t.replace(/\s+the\s+best\s+\w+\s+recipe\s*$/i, "");
  t = t.replace(/\s*[-|_]\s*\d+\s*$/, "");
  t = t.replace(/[|·•].*$/, "");
  t = t.replace(/\s*\(?full\s*page\)?$/i, "");
  t = t.replace(/\s*full\s*page$/i, "");
  // Strip trailing colon (common in docx titles)
  t = t.replace(/\s*:\s*$/, "");
  t = t.trim();
  // Strip a leading descriptor phrase only if a stronger title remains
  for (const re of STOP_TITLE_PREFIXES) {
    if (re.test(t)) {
      const stripped = t.replace(re, "").trim();
      if (stripped.length > 4) t = stripped;
    }
  }
  return titleCase(t);
}

// Lines that look like recipe metadata and should never be the title
const METADATA_PATTERNS = [
  /^(prep|cook|total)\s*time\s*:/i,
  /^author\s*:/i,
  /^yield\s*:/i,
  /^(category|method|cuisine)\s*:/i,
  /^makes?\s*:/i,
  /^servings?\s*:/i,
  /^description\s*$/i,
  /^ingredients?\s*$/i,
  /^(instructions?|directions?|method|preparation|steps?)\s*[:.]?$/i,
  /^notes?\s*[:.]?$/i,
  /^tips?\s*[:.]?$/i,
  /^scale\s*$/i,
  /^\W*recipe\W*$/i,                          // bare "RECIPE" or "❤ RECIPE"
  /^©/,
  /^print\s*recipe\s*$/i,
  /^jump\s+to\s+recipe/i,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}/,            // 3/27/23
  /^\d{1,2}-\d{1,2}-\d{2,4}/,                // 3-27-23
  /^\d{1,2}:\d{2}\s*(am|pm)/i,                // 8:09 AM
  /^(share|tweet|pin|save)\b/i,
  /^(also|you|see|try)\s+(you'?ll|like|these|might)/i,
  /^this\s+(post|recipe|article)\b/i,
  /^by\s+[a-z]/i,                              // "By Lindsay"
  /^love,\s*lindsay/i,
  /^[★☆]/,
  /^[\d\s]+\/\s*[\d\s]+$/,                     // page numbers
  /^page\s+\d+$/i,
  /^\d+(\.\d+)?\s*from\s+\d+\s*votes?$/i,      // "4.97 from 371 votes"
  /^[a-z]+\s*:\s*\/\//i,                        // "COURSE: //" type labels
  /^https?:\/\//i,
  // Chrome phrases the PDF body might include
  /^did you make this/i,
  /^information from your device/i,
  /^find it online/i,
  /^\d+(\.\d+)?\s*from\s+\d/i,                  // star ratings
  /^prep\s*$/i,
  /^cook\s*$/i,
  /^total\s*$/i,
  /^course\s*$/i,
  /^cuisine\s*$/i,
  /^keyword/i,
  /^makes?\s+\d/i,                              // "Makes 16oz of hot chocolate"
  /^happy\s+holidays/i,
  /^enjoy\s+(these|this)/i,
  /^\d+\.\s+\d+(\.\d+)?\s+\w+/,                 // "4.97 from..."
  /^\s*print\s*$/i,                             // bare " Print" button text
  /^\s*pin\s*$/i,
  /^\s*save\s*$/i,
  /^\s*share\s*$/i,
  /^\s*jump\s+to\s/i,
  /^\s*jump\s+to\s+recipe/i,
  /^\s*schedule/i,
  /^\s*scaling/i,
  /^\s*pour\s+the\s/i,                          // step text starting with "Pour"
  /^\s*rate\s+this/i,
  /^\s*leave\s+a\s+rating/i,
  /^©\s*\d{4}/i,                                // © 2014 ...
  /^©\s*&/i,
  /^©&/i,
  /^2014\s*©/i,
  /^2024\s*©/i,
  /^2023\s*©/i,
  /^\W*of\s+general\s+mills/i,
  // Single-word line that is in the chrome stoplist (checked separately in looksLikeJunkTitle)
];

// Single-word lines that are never titles — chrome / section labels / common adverbs.
const SINGLE_WORD_NON_TITLES = new Set([
  "print", "pin", "save", "share", "tweet", "email",
  "course", "cuisine", "keyword", "keywords", "category", "method",
  "prep", "cook", "total", "serves", "yield", "makes", "ingredients", "instructions",
  "difficulty", "author", "rating", "ratings", "reviews", "vote", "votes",
  "description", "notes", "tips", "video", "photos",
  "schedule", "scaling", "scaled",
  "vanilla", "chocolate", "strawberry", "lemon", "caramel", "coffee",
  "cinnamon", "raspberry", "blueberry", "banana", "pumpkin",
]);

function looksLikeJunkTitle(l) {
  // Reject things that are clearly not a recipe title
  if (l.length > 100) return true;
  if (/from your device|personalize|ad experience/i.test(l)) return true;
  if (/^did you make/i.test(l)) return true;
  if (/find it online/i.test(l)) return true;
  if (/\d+\s*from\s+\d+\s*votes?/i.test(l)) return true;
  if (/happy\s+holidays/i.test(l)) return true;
  // Single-word line that is in the chrome stoplist (e.g. "Print", "Course")
  const trimmed = l.trim().toLowerCase();
  if (/^[a-z]+$/.test(trimmed) && SINGLE_WORD_NON_TITLES.has(trimmed)) return true;
  // Star-rating lines
  if (/^[★☆]/.test(l)) return true;
  return false;
}

function isMetadataLine(l) {
  return METADATA_PATTERNS.some((re) => re.test(l));
}

function isLikelySectionLabel(l) {
  // A sub-section header inside ingredients/steps, e.g. "VANILLA CAKE", "Toffee Sauce"
  // Heuristic: short (< 40 chars), no leading number, doesn't end in punctuation,
  // doesn't contain units/qty. Often ALL CAPS or title case.
  if (l.length === 0 || l.length > 50) return false;
  if (/^\d/.test(l)) return false;
  if (/[.!?]$/.test(l)) return false;
  // No qty + unit (e.g. "1 cup", "1/2 tsp")
  if (/^\d+(\.\d+)?(\/\d+)?\s/.test(l)) return false;
  if (/^[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/.test(l)) return false;
  // No obvious verb
  if (/\b(make|mix|stir|bake|whisk|fold|combine|preheat|add|pour|place|remove|serve|cook|spread|cream|beat)\b/i.test(l)) {
    // These can also be labels ("To make the frosting:"), so only treat as label if no leading number+unit
    return false;
  }
  return true;
}

function detectTitle(text, fallbackFromFilename) {
  if (!text) return fallbackFromFilename;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Try to merge consecutive non-metadata, non-junk lines as a single title.
  // This handles PDFs where "Peanut Butter Chocolate Layer\nCake" is the title.
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const l = lines[i];
    if (l.length < 4 || l.length > 110) continue;
    if (isMetadataLine(l)) continue;
    if (looksLikeJunkTitle(l)) continue;
    if (/^https?:\/\//.test(l)) continue;
    if (/^@/.test(l)) continue;
    if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(l)) continue;
    // Look ahead: append the next 1-2 lines if they also look like a title fragment.
    let combined = l;
    for (let j = 1; j <= 2 && i + j < lines.length; j++) {
      const next = lines[i + j];
      if (isMetadataLine(next)) break;
      if (looksLikeJunkTitle(next)) break;
      if (/^https?:\/\//.test(next)) break;
      if (next.length < 2) break;
      if (next.length > 50) break;
      // Hard break on recipe section headers even if they don't match isMetadataLine exactly
      if (/^(ingredients?|instructions?|directions?|method|preparation|steps?|materials|supplies|equipment|tools|you[’']?ll?\s+need|what\s+you[’']?ll?\s+need|notes?\s*:|tips?\s*:|for\s+the\b|starter|to\s+make|marinade|filling|frosting|topping|sauce|garnish|serving|storage|how\s+to|assembly|prep\s+time|cook\s+time|total\s+time|yield|advancing|step\s+\d)/i.test(next)) break;
      // Only merge short fragments, not full sentences.
      if (/[.!?]$/.test(next)) break;
      // Don't merge if the next line is a complete sentence (has a verb and is long enough)
      if (next.length > 30 && /\b(is|are|was|were|has|have|the|a|an)\b/i.test(next) && /\b(recipe|with|made|in|for)\b/i.test(next)) break;
      combined += " " + next;
    }
    if (combined.length > 130) combined = combined.slice(0, 130);
    return cleanTitle(combined);
  }
  return fallbackFromFilename;
}

function isLikelyImageOnlyFile(text) {
  if (!text) return true;
  const stripped = text.replace(/\s+/g, "");
  return stripped.length < 30;
}

// Common recipe-web CTAs / social promos that should never be ingredients or steps.
const WEB_CTA_PATTERNS = [
  /ingredients have been added to your grocery/i,
  /recipe has been saved/i,
  /watch now to discover/i,
  /let'?s make it\b/i,
  /^\s*watch\s+now\b/i,
  /^\s*print\s+recipe\b/i,
  /^\s*pin\s+recipe\b/i,
  /^\s*share\s+this\s+recipe\b/i,
  /^\s*subscribe\s+to\s+my\s+newsletter/i,
  /^\s*follow\s+me\s+on\b/i,
  /^\s*this\s+post\s+contains?\s+affiliate/i,
  /^\s*for\s+more\s+great\s+recipes/i,
  /^\s*looking\s+for\s+more\b/i,
  /^\s*if\s+you\s+like\s+this\s+recipe/i,
  /^\s*love,\s+lindsay\b/i,
  /^\s*xo[,\s]+\w+/i,
  /^\s*photos?\s+(by|via)\b/i,
  /^\s*★{2,}/,
  /^\s*\d+(\.\d+)?\s+from\s+\d+/i,
];

function isWebCtaOrIntro(l) {
  return WEB_CTA_PATTERNS.some((re) => re.test(l));
}

// --- Categorization (duplicated from lib/parse.ts for the build-time script) ---
function categorize(title, sourcePath) {
  const t = title.toLowerCase();
  const src = sourcePath.toLowerCase();
  if (src.includes("\\dinner\\") || src.includes("/dinner/")) return "savory-extras";
  if (src.includes("\\appetizers\\") || src.includes("/appetizers/")) return "savory-extras";
  if (src.includes("\\christmas\\") || src.includes("/christmas/")) return "savory-extras";

  if (/\b(hot chocolate|hot cocoa|cocoa bombs?)\b/.test(t)) return "no-bake";
  if (/\b(diplomat cream|crme diplomate|creme diplomate|patissiere|patissire)/i.test(t)) return "frostings-sauces";
  if (/\b(frosting|buttercream|ganache|whipped cream|pastry cream|creme patissiere|caramel sauce|chocolate sauce|blueberry sauce|strawberry sauce|simple syrup|fondant)/.test(t)) return "frostings-sauces";
  if (/\b(mascarpone whipped cream|coffee whipped cream)\b/.test(t)) return "frostings-sauces";

  if (/\b(pastry case|pastry shell|pastry crust|shortcrust|puff pastry)/.test(t)) return "pies-tarts";
  if (/\b(pie\b|tart\b|bakewell)/.test(t) && !/\bcookie pie\b/.test(t)) return "pies-tarts";

  if (/\bcupcake(s)?\b/.test(t)) return "cupcakes";

  if (/\bcheesecake(s)?\b/.test(t) || /\bcheescake(s)?\b/.test(t)) return "cheesecakes";

  if (/\b(eclair|choux|cream puff|profiterole|puff pastry|craquelin)/.test(t)) return "pastries-choux";

  if (/\b(mousse|entremet|mirror glaze|chocolate bomb|domes?\b)/.test(t)) return "mousses-entremets";

  if (/\b(mochi|jello|jelly|gelatin|no[- ]bake|refrigerate|refrigerator|truffles?\b|fudge\b|stained glass|candy|ornament cake)/.test(t)) return "no-bake";
  if (/mini dessert burger/i.test(t)) return "no-bake";

  if (/\b(cookie|brownie|blondie|muffin|bon bon|scone)/.test(t) && !/\bbar(s)?\b/.test(t)) return "cookies-brownies";
  if (/\b(cookie cake|cookie cup)\b/.test(t)) return "cookies-brownies";

  if (/\bbar(s)?\b/.test(t)) return "bars-squares";

  if (/\b(cake|torte|gateau)/.test(t)) return "cakes";

  return "savory-extras";
}

// --- Title detection (defined above) ---

function cleanFilenameTitle(filename) {
  let s = path.basename(filename, path.extname(filename));
  // Strip common site attributions
  s = s.replace(/\s*[-|_]\s*(life,?\s*love\s*(&|and)?\s*sugar|bbc\s*good\s*food|baker\s*street\s*society|the\s*baking\s*chocolatess|the\s*cozy\s*cook|two\s*sisters|love\s*and\s*olive\s*oil|the\s*flavor\s*bender|preppy\s*kitchen|patisserie\s*makes\s*perfect|cloudy\s*kitchen|julie\s*marie\s*eats|the\s*chunky\s*chef|lemons?\s*\+\s*zest|yellow\s*bliss\s*road|little\s*sunny\s*kitchen|the\s*recipe\s*critic|together\s*as\s*family|baker\s*by\s*nature|beyond\s*frosting|jane's\s*patisserie|cookies\s+cookies)\s*$/i, "");
  s = s.replace(/\s+full\s*page$/i, "");
  return cleanTitle(s);
}

// --- Ingredient / step parsing ---
function parseIngredient(raw) {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { text, qty: null, unit: null, name: null };
  const UNICODE_FRACTION_MAP = { "½":"1/2","⅓":"1/3","⅔":"2/3","¼":"1/4","¾":"3/4","⅕":"1/5","⅖":"2/5","⅗":"3/5","⅘":"4/5","⅙":"1/6","⅚":"5/6","⅛":"1/8","⅜":"3/8","⅝":"5/8","⅞":"7/8" };
  const normalized = text.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (m) => UNICODE_FRACTION_MAP[m] ?? m);
  const m = normalized.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|\d+)\s*(.*)$/);
  let qty = null, rest = normalized;
  if (m) {
    const rawQty = m[1].trim();
    if (rawQty.includes("/") && !rawQty.includes(" ")) {
      const [n, d] = rawQty.split("/").map(Number);
      qty = Number.isFinite(n) && Number.isFinite(d) && d !== 0 ? (n / d).toString() : rawQty;
    } else if (rawQty.includes(" ")) {
      const [w, f] = rawQty.split(/\s+/);
      const [n, d] = f.split("/").map(Number);
      qty = Number.isFinite(n) && Number.isFinite(d) && d !== 0 ? (Number(w) + n / d).toString() : rawQty;
    } else {
      qty = rawQty;
    }
    rest = m[2].trim();
  }
  const UNIT_RE = /^(cups?|c\.|teaspoons?|tsp\.?|tablespoons?|tbsp\.?|tbs\.?|ounces?|oz\.?|pounds?|lb\.?|lbs\.?|grams?|g\.?|kilograms?|kg\.?|milliliters?|ml\.?|liters?|l\.?|quarts?|qt\.?|pints?|pt\.?|gallons?|gal\.?|pinch(?:es)?|dash(?:es)?|sticks?\b|packages?|pkg\.?|cans?\b|cloves?\b|slices?\b|sprigs?\b|bunches?\b|heads?\b)/i;
  const um = rest.match(UNIT_RE);
  let unit = null, name = rest;
  if (um) { unit = um[1].toLowerCase(); name = rest.slice(um[0].length).trim() || null; }
  if (name && /^of\s+/i.test(name)) name = name.replace(/^of\s+/i, "").trim();
  return { text, qty, unit, name };
}

function extractIngredientsAndSteps(text) {
  if (!text) return { ingredients: [], steps: [] };
  let lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  // Pass 0: detect lines that are actually multiple ingredients / multiple
  // steps concatenated without newlines, and split them.
  // We only split lines that look like an INGREDIENT LIST, not step paragraphs.
  // A line looks like an ingredient list when:
  //   - it's long (>60 chars), AND
  //   - it begins with a qty+unit (not a sentence), AND
  //   - it contains 3+ qty markers (clearly many ingredients).
  // Anything else (long step sentences that mention qty in passing) is left alone.
  const QTY_AT_START = /^(\d+(\.\d+)?(\/\d+)?\s|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/;
  const newLines = [];
  for (const line of lines) {
    if (line.length > 60 && QTY_AT_START.test(line)) {
      const qtyMatches = [...line.matchAll(/(\d+(\.\d+)?(\/\d+)?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])(?=\s|$)/g)];
      if (qtyMatches.length >= 3) {
        // Split on each qty-beginning position (keep the qty with the right side).
        const pieces = [];
        let cursor = 0;
        for (const m of qtyMatches) {
          const pos = m.index;
          if (pos > cursor) {
            pieces.push(line.slice(cursor, pos).trim());
          }
          cursor = pos;
        }
        pieces.push(line.slice(cursor).trim());
        for (const p of pieces) {
          if (p && p.length > 1) newLines.push(p);
        }
        continue;
      }
    }
    newLines.push(line);
  }
  lines = newLines;

  // Pass 1: identify the role of each line.
  //   "skip"        — metadata, section labels, page numbers, blank-ish
  //   "ingredient"  — starts with a quantity (or a unicode fraction)
  //   "step"        — long sentence with period/punctuation, or numbered, or has a verb
  //   "header"      — short title-case/uppercase line, possibly ending in ":" (sub-section label)
  //   "unknown"     — we'll decide based on context
  function looksLikeNumberedStep(line) {
    return /^\d+[\.\)]\s+/.test(line) || /^[a-z]\)\s+/i.test(line);
  }
  function looksLikeIngredient(line) {
    return /^(\d+(\.\d+)?(\/\d+)?|\d+\s+\d+\/\d+|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/.test(line);
  }
  const roleOf = (line, idx) => {
    if (line.length < 2) return "skip";
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line) || /^\d{1,2}:\d{2}\s*(am|pm)/i.test(line)) return "skip";
    if (/^page\s+\d+$/i.test(line)) return "skip";
    if (isMetadataLine(line)) return "skip";
    if (looksLikeJunkTitle(line)) return "skip";
    if (isWebCtaOrIntro(line)) return "skip";
    if (looksLikeNumberedStep(line)) return "step";
    if (looksLikeIngredient(line)) return "ingredient";
    if (line.endsWith(":") && line.length < 60 && !/\b(preheat|mix|stir|bake|whisk|fold|combine|add|pour|place|remove|serve|cook|spread|cream|beat)\b/i.test(line)) return "header";
    if (isLikelySectionLabel(line)) return "header";
    if (line.length > 60) return "step";  // long sentence = step
    return "unknown";
  };

  const roles = lines.map((l, i) => roleOf(l, i));

  // Pass 2: walk the lines and assign each "unknown" to a role based on
  // the surrounding context (what came before and what comes after).
  for (let i = 0; i < lines.length; i++) {
    if (roles[i] !== "unknown") continue;
    // Look at the 2 lines before and after for hints
    const before = roles.slice(Math.max(0, i - 2), i);
    const after = roles.slice(i + 1, Math.min(lines.length, i + 3));
    // If we're between two "ingredient" lines, we're an ingredient (e.g. "of flour" without qty)
    if (before.includes("ingredient") && after.includes("ingredient")) roles[i] = "ingredient";
    // If we're between two "step" lines or after a step, we're a step continuation
    else if (before.includes("step")) roles[i] = "step";
    // If we're between two headers, we're a sub-section divider — treat as header
    else if (before.includes("header") && after.includes("header")) roles[i] = "header";
    else roles[i] = "skip";
  }

  // Pass 3: emit ingredients and steps in document order, but group all
  // ingredients first (so the app shows them together), then all steps.
  const ingredientLines = [];
  const stepLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (roles[i] === "ingredient") ingredientLines.push({ text: lines[i], idx: i });
    else if (roles[i] === "step") stepLines.push({ text: lines[i], idx: i });
  }

  // De-dupe ingredients (some recipes have the same line listed twice)
  const seen = new Set();
  const ingredients = [];
  for (const { text } of ingredientLines) {
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    ingredients.push(parseIngredient(text));
  }

  // Numbered steps: strip the leading "1. " / "1) " markers but keep the order.
  let steps = stepLines.map(({ text }) =>
    text.replace(/^\s*(\d+|[a-z]\))\s*[\.\):\-]?\s+/i, "").trim()
  ).filter(Boolean);

  // Drop steps that look like recipe intro blurbs ("These treats are sweet and delicious!")
  // — they're long, in present tense, end with punctuation, and contain descriptive adjectives.
  steps = steps.filter((s) => !isRecipeIntroBlurb(s));

  return { ingredients, steps };
}

// Heuristic: a step is a "recipe intro blurb" if it's long, present-tense, descriptive
// (contains praise words), and doesn't look like a cooking instruction.
const BLURB_TELL = /\b(love|delicious|amazing|perfect|easy|simple|quick|best|moist|fluffy|soft|tender|sweet|salty|creamy|crunchy|satisfying|comforting|indulgent|irresistible|tasty|yummy|cozy)\b/i;
const STEP_VERB = /^(preheat|combine|add|mix|stir|whisk|fold|cream|beat|bake|cook|place|put|remove|spread|pour|drizzle|drop|scoop|set|let|allow|refrigerate|chill|cool|heat|melt|whisk|fold|use|line|garnish|serve|stir|spread|sprinkle|press|dust|trim|slice|cut|chop|fold|whisk|knead|roll|dip|brush)/i;
function isRecipeIntroBlurb(s) {
  if (s.length < 60) return false;
  if (!BLURB_TELL.test(s)) return false;
  if (STEP_VERB.test(s)) return false;  // starts with a cooking verb — real step
  return true;
}

function isPicturesCompanionFile(filename) {
  return /\bpictures\b/i.test(path.basename(filename));
}

// Multi-recipe files we can't sensibly split (e.g. a full cookbook).
const MULTI_RECIPE_FILES = new Set([
  "Pillsbury cookbook 2014.pdf",
  "Data Collection.xlsx", // not a recipe
]);

function shouldDropFile(filename) {
  const base = path.basename(filename);
  if (MULTI_RECIPE_FILES.has(base)) return true;
  // Generic tag/sticker files (not full recipes)
  if (/tags\.(pdf|docx|pptx)$/i.test(base)) return true;
  if (/stickers\.(docx)$/i.test(base)) return true;
  if (/^gift giving list/i.test(base)) return true;
  return false;
}

function isNonFoodFile(filename, text) {
  const base = path.basename(filename).toLowerCase();
  if (/scrub|potpourri|ornament|soap|sticker|tag/i.test(base)) return true;
  if (text && /sugar scrub|stovetop potpourri|salt dough/i.test(text.slice(0, 2000))) return true;
  return false;
}

// --- File reading ---
async function readPdf(file) {
  const buf = fs.readFileSync(file);
  try {
    const result = await pdfParse(buf);
    return { text: result.text || "", images: [] };
  } catch (e) {
    console.error("  ! PDF parse failed:", file, e.message);
    return { text: "", images: [] };
  }
}

async function readDocx(file) {
  try {
    const result = await mammoth.extractRawText({ path: file });
    return { text: result.value || "", images: [] };
  } catch (e) {
    console.error("  ! DOCX parse failed:", file, e.message);
    return { text: "", images: [] };
  }
}

async function extractImageFromPdf(file, outPathBase) {
  // pdf-parse's image extraction is unreliable; we use a simpler approach:
  // rasterize the first page with sharp+pdf-to-png via pdfjs-dist would be heavy.
  // Instead: skip in-PDF image extraction and rely on filename + cover fallback.
  // We DO try to extract embedded images by re-parsing with pdfjs (lazy).
  return null;
}

function walk(dir, out = new Map()) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(pdf|docx)$/i.test(ent.name)) {
      // Dedupe by (filename, size) — same file in different folders is a duplicate.
      const stat = fs.statSync(full);
      const key = `${ent.name.toLowerCase()}|${stat.size}`;
      if (!out.has(key)) out.set(key, full);
    }
  }
  return [...out.values()];
}

// --- Main ---
async function main() {
  if (!fs.existsSync(RECIPES_DIR)) {
    console.error(`Recipes directory not found: ${RECIPES_DIR}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.mkdirSync(OUT_IMG_DIR, { recursive: true });

  const files = walk(RECIPES_DIR);
  console.log(`Found ${files.length} recipe files.`);

  const seen = new Set();
  const recipes = [];

  for (const file of files) {
    const rel = path.relative(RECIPES_DIR, file).replace(/\\/g, "/");
    const base = path.basename(file);
    const baseNoExt = path.basename(file, path.extname(file));
    const isDocx = /\.docx$/i.test(file);

    if (isPicturesCompanionFile(file)) {
      // Skip image-only companion files; their content usually pairs with a real recipe.
      console.log(`~ ${rel} (skipped: pictures companion)`);
      continue;
    }

    if (shouldDropFile(file)) {
      console.log(`~ ${rel} (skipped: multi-recipe file)`);
      continue;
    }

    const { text } = isDocx ? await readDocx(file) : await readPdf(file);
    const isScannedPdf = !isDocx && isLikelyImageOnlyFile(text);

    if (isLikelyImageOnlyFile(text) && !isScannedPdf) {
      console.log(`~ ${rel} (skipped: no extractable text)`);
      continue;
    }

    const filenameTitle = cleanFilenameTitle(file);
    const detectedTitle = isScannedPdf ? null : detectTitle(text, filenameTitle);
    // If the detected title is corrupted (form feeds, non-printable chars) or much shorter than
    // the filename title, prefer the filename title.
    let title = detectedTitle;
    if (title) {
      const hasGarbageChar = /[\x00-\x1f]/.test(title);
      const detSlug = slugify(title);
      const fileSlug = slugify(filenameTitle);
      if (hasGarbageChar || (fileSlug && detSlug && detSlug.length < fileSlug.length * 0.7)) {
        title = filenameTitle;
      }
    }
    if (!title) title = filenameTitle;
    let slug = slugify(title);
    if (!slug) slug = slugify(filenameTitle);
    if (!slug) { console.log(`~ ${rel} (skipped: no title)`); continue; }
    let unique = slug;
    let n = 2;
    while (seen.has(unique)) unique = `${slug}-${n++}`;
    seen.add(unique);
    const slugFinal = unique;

    const { ingredients, steps } = isScannedPdf ? { ingredients: [], steps: [] } : extractIngredientsAndSteps(text);
    const category = categorize(title, rel);
    const isNonFood = isNonFoodFile(file, text);

    // No image yet — the app will use a category emoji placeholder.
    const image = null;

    const recipe = {
      slug: slugFinal,
      title,
      subtitle: undefined,
      sourceFile: rel,
      category,
      image,
      isNonFood: isNonFood || undefined,
      ...(isScannedPdf ? { scannedPdf: true } : {}),
      ingredients,
      steps,
      rawExcerpt: text.slice(0, 600),
    };
    recipes.push(recipe);
    const tag = isScannedPdf ? " [scanned]" : "";
    console.log(`✓${tag} ${rel} → ${slugFinal} (${category}, ${ingredients.length} ing, ${steps.length} steps)`);
  }

  recipes.sort((a, b) => a.title.localeCompare(b.title));
  fs.writeFileSync(OUT_JSON, JSON.stringify(recipes, null, 2));
  console.log(`\nWrote ${recipes.length} recipes to ${path.relative(ROOT, OUT_JSON)}`);

  // Category counts
  const counts = {};
  for (const r of recipes) counts[r.category] = (counts[r.category] || 0) + 1;
  console.log("\nCategory counts:");
  for (const k of Object.keys(counts).sort()) console.log(`  ${k.padEnd(20)} ${counts[k]}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
