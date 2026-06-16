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

/**
 * A named group of ingredients within a recipe. Many baking recipes split
 * ingredients into sub-sections (e.g. Biscoff Cheesecake Cupcakes has
 * Crust, Cheesecake, and Cookie Butter Frosting). Single-list recipes
 * are represented as one section with `name: null`.
 */
export type IngredientSection = {
  /** Display name of the sub-section, e.g. "Crust", "Cheesecake". Null when the recipe has no sub-sections. */
  name: string | null;
  ingredients: Ingredient[];
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
  /** Ingredient sub-sections. Single-list recipes have one entry with `name: null`. */
  ingredientSections: IngredientSection[];
  /** Numbered or unnumbered steps */
  steps: string[];
  /** Raw text excerpt, kept for debugging */
  rawExcerpt?: string;
};

/**
 * Flatten a recipe's ingredient sections into a single list.
 * Used by the "Add all" button and any other code that wants every ingredient.
 */
export function flatIngredients(recipe: Recipe): Ingredient[] {
  return recipe.ingredientSections.flatMap((s) => s.ingredients);
}
