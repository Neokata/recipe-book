"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { RecipeCard } from "@/components/RecipeCard";
import { useFavorites } from "@/lib/favorites";
import type { Recipe } from "@/lib/types";
import Fuse from "fuse.js";

export function HomeClient({ recipes }: { recipes: Recipe[] }) {
  const [query, setQuery] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const favIds = useFavorites((s) => s.ids);

  const fuse = new Fuse(recipes, {
    keys: ["title", "subtitle", "ingredients.text"],
    threshold: 0.4,
    ignoreLocation: true,
  });

  const filtered = (() => {
    let list = query ? fuse.search(query).map((r) => r.item) : recipes;
    if (showFavorites) list = list.filter((r) => favIds.includes(r.slug));
    return list;
  })();

  return (
    <div className="py-8 sm:py-12">
      {/* Hero */}
      <section className="text-center mb-10 sm:mb-14">
        <h1 className="h-display text-4xl sm:text-6xl font-semibold text-cocoa-800 tracking-tight">
          The Recipe Book
        </h1>
        <p className="mt-3 text-cocoa-700/80 text-lg max-w-xl mx-auto">
          A curated collection of {recipes.length} baking recipes — at your fingertips.
        </p>
      </section>

      {/* Search + favorites filter */}
      <div className="max-w-2xl mx-auto mb-10 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="search"
            placeholder="Search recipes or ingredients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-cocoa-700/15 bg-cream-50 px-5 py-3 pl-11 text-cocoa-800 placeholder-cocoa-700/40 shadow-soft focus:outline-none focus:border-terracotta-400"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-cocoa-700/50" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className={`btn-ghost ${showFavorites ? "bg-blush-100 border-blush-300" : ""}`}
        >
          <span>{showFavorites ? "★" : "☆"}</span>
          <span>Favorites {favIds.length > 0 && `(${favIds.length})`}</span>
        </button>
      </div>

      {query || showFavorites ? (
        <ResultsGrid recipes={filtered} emptyMessage={showFavorites ? "No favorites yet — tap the star on a recipe to save it." : "No recipes match your search."} />
      ) : (
        <CategoryGrid recipes={recipes} />
      )}
    </div>
  );
}

function CategoryGrid({ recipes }: { recipes: Recipe[] }) {
  return (
    <div className="space-y-12">
      {CATEGORIES.map((cat) => {
        const inCat = recipes.filter((r) => r.category === cat.id);
        if (inCat.length === 0) return null;
        return (
          <section key={cat.id}>
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="h-display text-2xl sm:text-3xl font-semibold text-cocoa-800 flex items-center gap-2.5">
                  <span>{cat.emoji}</span> {cat.name}
                </h2>
                <p className="text-cocoa-700/70 text-sm mt-0.5">{cat.blurb}</p>
              </div>
              <Link href={`/c/${cat.id}`} className="text-sm font-medium text-terracotta-500 hover:text-terracotta-600 whitespace-nowrap">
                See all {inCat.length} →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {inCat.slice(0, 8).map((r) => (
                <RecipeCard key={r.slug} recipe={r} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ResultsGrid({ recipes, emptyMessage }: { recipes: Recipe[]; emptyMessage: string }) {
  if (recipes.length === 0) {
    return (
      <p className="text-center text-cocoa-700/60 py-16">{emptyMessage}</p>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
      {recipes.map((r) => (
        <RecipeCard key={r.slug} recipe={r} />
      ))}
    </div>
  );
}
