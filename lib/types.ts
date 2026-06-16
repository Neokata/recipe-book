import type { CategoryId } from "./categories";

export type Ingredient = {
  /** Display text, e.g. "1 cup all-purpose flour" */
  text: string;
  /** Best-effort parsed quantity (e.g. "1", "1.5", "1/2"). Null if not parseable. */
  qty: string | null;
  /** Best-effort parsed unit (e.g. "cup", "tbsp", "g"). Null if not present. */
  unit: string | null;
  /** Best-effort ingredient name (everything after qty + unit). */
  name: string | null;
};

export type Recipe = {
  /** URL-safe slug, unique */
  slug: string;
  /** Display title */
  title: string;
  /** Subtitle / flavor hint, if any */
  subtitle?: string;
  /** Source filename relative to the Recipes/ folder */
  sourceFile: string;
  /** Where in the book it was found */
  category: CategoryId;
  /** Image path under /public, e.g. "/recipes/berry-mascarpone-layer-cake.jpg" */
  image: string | null;
  /** Short note if this recipe has no edible output */
  isNonFood?: boolean;
  /** Optional metadata */
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  /** Ingredient lines */
  ingredients: Ingredient[];
  /** Numbered or unnumbered steps */
  steps: string[];
  /** Raw text excerpt, kept for debugging */
  rawExcerpt?: string;
};
