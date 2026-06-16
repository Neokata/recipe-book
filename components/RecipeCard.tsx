"use client";

import Link from "next/link";
import Image from "next/image";
import type { Recipe } from "@/lib/types";
import { CATEGORY_MAP } from "@/lib/categories";
import { useFavorites } from "@/lib/favorites";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const cat = CATEGORY_MAP[recipe.category];
  const isFav = useFavorites((s) => s.ids.includes(recipe.slug));
  return (
    <Link href={`/r/${recipe.slug}`} className="card group block">
      <div className="relative aspect-square bg-cream-100">
        {recipe.image ? (
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-50">
            {cat?.emoji ?? "🍰"}
          </div>
        )}
        {isFav && (
          <span className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-cream-50/95 text-terracotta-500 text-sm shadow">
            ★
          </span>
        )}
        {recipe.isNonFood && (
          <span className="absolute top-2 left-2 pill bg-blush-100 text-cocoa-700">
            🧴 Non-food
          </span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="h-display font-medium text-cocoa-800 leading-snug line-clamp-2 text-base sm:text-lg">
          {recipe.title}
        </h3>
        <p className="mt-1 text-xs text-cocoa-700/60 flex items-center gap-1.5">
          <span>{cat?.emoji}</span>
          <span>{cat?.name}</span>
        </p>
      </div>
    </Link>
  );
}
