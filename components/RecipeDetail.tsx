"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Recipe, Ingredient, IngredientSection } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { scaleQty } from "@/lib/parse";
import { useShoppingList } from "@/lib/store";
import { useFavorites } from "@/lib/favorites";

const SCALES: Array<{ label: string; factor: number }> = [
  { label: "½×", factor: 0.5 },
  { label: "1×", factor: 1 },
  { label: "1½×", factor: 1.5 },
  { label: "2×", factor: 2 },
];

export function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const cat = CATEGORY_MAP[recipe.category];
  const [scaleIdx, setScaleIdx] = useState(1);
  const factor = SCALES[scaleIdx].factor;
  const [toast, setToast] = useState<string | null>(null);

  const add = useShoppingList((s) => s.add);
  const favIds = useFavorites((s) => s.ids);
  const toggleFav = useFavorites((s) => s.toggle);
  const isFav = favIds.includes(recipe.slug);

  // Scale every section by the active factor.
  const scaledSections = useMemo(
    () =>
      recipe.ingredientSections.map((sec) => ({
        name: sec.name,
        ingredients: sec.ingredients.map((ing) => scaleIngredient(ing, factor)),
      })),
    [recipe.ingredientSections, factor]
  );
  const totalIngredients = useMemo(
    () => scaledSections.reduce((n, s) => n + s.ingredients.length, 0),
    [scaledSections]
  );

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1500);
  }

  function addAll() {
    let n = 0;
    for (const ing of recipe.ingredientSections.flatMap((s) => s.ingredients)) {
      add(scaleIngredient(ing, factor).text, recipe.title);
      n++;
    }
    flash(`Added ${n} ingredient${n === 1 ? "" : "s"} to shopping list`);
  }

  function addOne(text: string) {
    add(text, recipe.title);
    flash(`Added: ${text}`);
  }

  return (
    <article className="py-6 sm:py-10">
      <Link href={`/c/${recipe.category}`} className="text-sm text-cocoa-700/60 hover:text-cocoa-800 inline-flex items-center gap-1 mb-4">
        ← {cat?.name}
      </Link>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-10">
        {/* Image */}
        <div className="relative aspect-square rounded-3xl overflow-hidden bg-cream-100 shadow-soft">
          {recipe.image ? (
            <Image src={recipe.image} alt={recipe.title} fill className="object-cover" priority sizes="(min-width: 1024px) 50vw, 100vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-50">
              {cat?.emoji ?? "🍰"}
            </div>
          )}
          {recipe.isNonFood && (
            <span className="absolute top-4 left-4 pill bg-blush-100 text-cocoa-700 text-sm">
              🧴 Non-food item
            </span>
          )}
        </div>

        {/* Title + meta */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-sm text-cocoa-700/70 mb-2">
            <span>{cat?.emoji}</span>
            <span>{cat?.name}</span>
          </div>
          <h1 className="h-display text-3xl sm:text-4xl font-semibold text-cocoa-800 leading-tight">
            {recipe.title}
          </h1>
          {recipe.subtitle && (
            <p className="mt-2 text-cocoa-700/70">{recipe.subtitle}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-cocoa-700/80">
            {recipe.servings && <span className="pill">🍽 {recipe.servings}</span>}
            {recipe.prepTime && <span className="pill">⏱ Prep {recipe.prepTime}</span>}
            {recipe.cookTime && <span className="pill">🔥 Cook {recipe.cookTime}</span>}
            <span className="pill">{totalIngredients} ingredients</span>
            <span className="pill">{recipe.steps.length} steps</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button onClick={() => toggleFav(recipe.slug)} className="btn-ghost">
              <span className="text-lg">{isFav ? "★" : "☆"}</span>
              <span>{isFav ? "Saved" : "Save"}</span>
            </button>
            <button
              onClick={addAll}
              disabled={recipe.isNonFood || totalIngredients === 0}
              className="btn-primary disabled:opacity-50"
            >
              <span>🛒</span>
              <span>Add all to list</span>
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-cocoa-700/10 bg-cream-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="h-display text-xl font-medium text-cocoa-800">Ingredients</h2>
              <ScaleControl value={scaleIdx} onChange={setScaleIdx} />
            </div>
            {totalIngredients === 0 ? (
              <p className="text-cocoa-700/60 text-sm">No ingredients extracted.</p>
            ) : (
              <IngredientList sections={scaledSections} onAddOne={addOne} />
            )}
            <p className="mt-3 text-xs text-cocoa-700/50">Tap any ingredient to add it to your shopping list.</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <section className="mt-10 max-w-3xl">
        <h2 className="h-display text-2xl sm:text-3xl font-semibold text-cocoa-800 mb-4">Steps</h2>
        {recipe.steps.length === 0 ? (
          <p className="text-cocoa-700/60">No steps extracted for this recipe.</p>
        ) : (
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-terracotta-500 text-cream-50 font-semibold flex items-center justify-center text-sm">
                  {i + 1}
                </span>
                <p className="text-cocoa-800 leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-cocoa-800 text-cream-50 px-5 py-3 rounded-full shadow-lg text-sm animate-in fade-in">
          ✓ {toast}
        </div>
      )}
    </article>
  );
}

function IngredientList({
  sections,
  onAddOne,
}: {
  sections: IngredientSection[];
  onAddOne: (text: string) => void;
}) {
  return (
    <div>
      {sections.map((section, i) => (
        <div key={i} className={i > 0 ? "mt-5" : ""}>
          {section.name && (
            <h3 className="h-display text-sm font-semibold uppercase tracking-wider text-terracotta-600 mb-1.5">
              {section.name}
              <span className="ml-2 text-cocoa-700/40 font-normal normal-case tracking-normal">
                {section.ingredients.length}
              </span>
            </h3>
          )}
          <ul className="divide-y divide-cocoa-700/10">
            {section.ingredients.map((ing, j) => (
              <li key={j}>
                <button
                  onClick={() => onAddOne(ing.text)}
                  className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-blush-100/60 active:bg-blush-100 transition flex items-start gap-3 group"
                >
                  <span className="mt-0.5 text-terracotta-500 opacity-0 group-hover:opacity-100 transition">+</span>
                  <span className="text-cocoa-800">{ing.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ScaleControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex rounded-full border border-cocoa-700/15 bg-cream-50 p-0.5 text-sm">
      {SCALES.map((s, i) => (
        <button
          key={s.label}
          onClick={() => onChange(i)}
          className={`px-3 py-1 rounded-full font-medium transition ${
            i === value ? "bg-terracotta-500 text-cream-50" : "text-cocoa-700 hover:bg-cream-100"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

function scaleIngredient(ing: Ingredient, factor: number): Ingredient {
  if (factor === 1) return ing;
  const qty = scaleQty(ing.qty, factor);
  if (qty == null) return ing;
  // Rebuild text: replace the leading qty + unit, keep the rest.
  // Re-parse original text for the leading number+unit substring.
  const m = ing.text.match(/^(\s*)([\d\/\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞.]+)(.*)$/);
  if (!m) return { ...ing, qty };
  // Trust the parsed unit/name; rebuild deterministically
  const unit = ing.unit ? (/\b$/.test(ing.unit) ? ing.unit : ing.unit) : "";
  const tail = ing.name ? (ing.unit ? " " : "") + ing.name : ing.text.slice(m[1].length + m[2].length);
  // Simpler: keep the original "tail" (everything after the number)
  const tailClean = ing.text.replace(/^[\s\d\/\.½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+/, "").trimStart();
  return { ...ing, qty, text: `${qty}${tailClean ? " " + tailClean : ""}` };
}
