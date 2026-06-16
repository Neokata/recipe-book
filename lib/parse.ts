import type { CategoryId } from "./categories";

/**
 * Categorize a recipe based on its title + subfolder hint.
 * Returns one of the 11 category ids.
 *
 * Rules are applied top-down: the first matching rule wins.
 */
export function categorize(title: string, sourcePath: string): CategoryId {
  const t = title.toLowerCase();
  const src = sourcePath.toLowerCase();

  // Source-folder based: anything in the Christmas folder that isn't a
  // dessert goes to savory-extras so it can be clearly badged as non-food.
  if (src.includes("\\christmas\\") || src.includes("/christmas/")) {
    // Real Christmas desserts are rare here; the ones that exist already
    // sit at the root and are picked up by the dessert rules below.
  }
  if (src.includes("\\dinner\\") || src.includes("/dinner/")) return "savory-extras";
  if (src.includes("\\appetizers\\") || src.includes("/appetizers/")) return "savory-extras";
  if (src.includes("\\christmas\\") || src.includes("/christmas/")) return "savory-extras";

  // --- Frostings / sauces / whipped toppings / pastry cream ---
  if (/\b(frosting|buttercream|ganache|whipped cream|pastry cream|creme patissiere|crme ptissire|creme patissiere|caramel sauce|chocolate sauce|blueberry sauce|strawberry sauce|simple syrup|fondant)\b/.test(t)) {
    return "frostings-sauces";
  }
  if (/\b(mascarpone whipped cream|coffee whipped cream)\b/.test(t)) return "frostings-sauces";

  // --- Pies & tarts ---
  if (/\b(pastry case|pastry shell|pastry crust|shortcrust|puff pastry)/.test(t)) return "pies-tarts";
  if (/\b(pie\b|tart\b|bakewell)/.test(t) && !/\bcookie pie\b/.test(t)) {
    return "pies-tarts";
  }

  // --- Cupcakes (cheesecake-style cup-cakes go here, not into cheesecakes) ---
  if (/\bcupcake(s)?\b/.test(t)) return "cupcakes";

  // --- Cheesecakes (whole and mini, not "cupcake" form) ---
  if (/\bcheesecake(s)?\b/.test(t) || /\bcheescake(s)?\b/.test(t)) return "cheesecakes";

  // --- Pastries / choux ---
  if (/\b(eclair|choux|cream puff|profiterole|puff pastry|craquelin)/.test(t)) {
    return "pastries-choux";
  }

  // --- Mousses, entremets, mirror-glaze cakes, bombs ---
  if (/\b(mousse|entremet|mirror glaze|chocolate bomb|domes?\b)/.test(t)) return "mousses-entremets";

  // --- No-bake / assembled / mochi / jello / candy ---
  if (/\b(mochi|jello|jelly|gelatin|no[- ]bake|refrigerate|refrigerator|truffles?\b|fudge\b|stained glass|candy|ornament cake)/.test(t)) {
    return "no-bake";
  }
  // "Mini Dessert Burgers" / "Miniature Single Use Soaps" etc.
  if (/mini dessert burger/i.test(t)) return "no-bake";

  // --- Cookies & brownies (also catches cookie cakes, blondies, bars?) ---
  // Cookie bars go in cookies-brownies; 9x13 sheet bars go in bars-squares.
  if (/\b(cookie|brownie|blondie|muffin|bon bon|scone)/.test(t) && !/\bbar(s)?\b/.test(t)) {
    return "cookies-brownies";
  }
  if (/\b(cookie cake|cookie cup)\b/.test(t)) return "cookies-brownies";

  // --- Bars & squares (sheet-pan desserts) ---
  if (/\bbar(s)?\b/.test(t)) return "bars-squares";

  // --- Cakes (catch-all for "cake", "torte", "gateau" etc.) ---
  if (/\b(cake|torte|gateau)/.test(t)) return "cakes";

  // --- Default ---
  return "savory-extras";
}

const QTY_FRACTION: Record<string, number> = {
  "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

const UNIT_RE = /^(cups?|c\.|teaspoons?|tsp\.?|tablespoons?|tbsp\.?|tbs\.?|ounces?|oz\.?|pounds?|lb\.?|lbs\.?|grams?|g\.?|kilograms?|kg\.?|milliliters?|ml\.?|liters?|l\.?|quarts?|qt\.?|pints?|pt\.?|gallons?|gal\.?|pinch(?:es)?|dash(?:es)?|sticks?\b|packages?|pkg\.?|cans?\b|cloves?\b|slices?\b|sprigs?\b|bunches?\b|heads?\b)/i;

const UNICODE_FRACTION_RE = /[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g;

const UNICODE_FRACTION_MAP: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4",
  "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5",
  "⅙": "1/6", "⅚": "5/6", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

/**
 * Parse a free-text ingredient line into a structured form.
 * Best-effort only; we always keep the original text.
 */
export function parseIngredient(raw: string) {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return { text, qty: null, unit: null, name: null };

  // Replace unicode fractions with ASCII fractions for parsing
  const normalized = text.replace(UNICODE_FRACTION_RE, (m) => UNICODE_FRACTION_MAP[m] ?? m);
  // Collapse "1 1/2" → "1.5" style mixed number
  const m = normalized.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|\d+)\s*(.*)$/);
  let qty: string | null = null;
  let rest = normalized;
  if (m) {
    const rawQty = m[1].trim();
    if (rawQty.includes("/") && !rawQty.includes(" ")) {
      const [n, d] = rawQty.split("/").map(Number);
      if (Number.isFinite(n) && Number.isFinite(d) && d !== 0) {
        qty = (n / d).toString();
      } else {
        qty = rawQty;
      }
    } else if (rawQty.includes(" ")) {
      const [whole, frac] = rawQty.split(/\s+/);
      const [n, d] = frac.split("/").map(Number);
      if (Number.isFinite(n) && Number.isFinite(d) && d !== 0) {
        qty = (Number(whole) + n / d).toString();
      } else {
        qty = rawQty;
      }
    } else {
      qty = rawQty;
    }
    rest = m[2].trim();
  }

  const um = rest.match(UNIT_RE);
  let unit: string | null = null;
  let name: string | null = rest;
  if (um) {
    unit = um[1].toLowerCase();
    name = rest.slice(um[0].length).trim() || null;
  }
  // Drop leading "of"
  if (name && /^of\s+/i.test(name)) name = name.replace(/^of\s+/i, "").trim();

  return { text, qty, unit, name };
}

/**
 * Scale a qty string by a multiplier, returning a friendly fraction when possible.
 */
export function scaleQty(qty: string | null, factor: number): string | null {
  if (qty == null) return null;
  const n = Number(qty);
  if (!Number.isFinite(n)) return qty;
  const scaled = n * factor;
  // Round to 2 decimals, then try to express as a common fraction
  const rounded = Math.round(scaled * 100) / 100;
  return prettyNumber(rounded);
}

function prettyNumber(n: number): string {
  // Try common fractions first
  const fractions: Array<[number, string]> = [
    [0.125, "1/8"], [0.25, "1/4"], [0.333, "1/3"], [0.375, "3/8"],
    [0.5, "1/2"], [0.625, "5/8"], [0.667, "2/3"], [0.75, "3/4"],
    [0.875, "7/8"],
  ];
  const whole = Math.floor(n);
  const frac = n - whole;
  for (const [val, label] of fractions) {
    if (Math.abs(frac - val) < 0.05) {
      return whole === 0 ? label : `${whole} ${label}`;
    }
  }
  if (frac < 0.05) return whole.toString();
  if (Math.abs(frac - 1) < 0.05) return (whole + 1).toString();
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export { QTY_FRACTION };
