import recipes from "@/data/recipes.json";
import type { Recipe } from "@/lib/types";
import { CATEGORY_MAP, CATEGORIES } from "@/lib/categories";
import { RecipeCard } from "@/components/RecipeCard";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORY_MAP[slug as keyof typeof CATEGORY_MAP];
  if (!cat) return {};
  return { title: `${cat.name} — The Recipe Book` };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = CATEGORY_MAP[slug as keyof typeof CATEGORY_MAP];
  if (!cat) notFound();

  const list = (recipes as Recipe[])
    .filter((r) => r.category === cat.id)
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="py-8 sm:py-12">
      <Link href="/" className="text-sm text-cocoa-700/60 hover:text-cocoa-800 inline-flex items-center gap-1 mb-4">
        ← All categories
      </Link>
      <header className="mb-8">
        <h1 className="h-display text-3xl sm:text-5xl font-semibold text-cocoa-800 flex items-center gap-3">
          <span>{cat.emoji}</span> {cat.name}
        </h1>
        <p className="mt-2 text-cocoa-700/70 text-lg">{cat.blurb}</p>
        <p className="mt-1 text-sm text-cocoa-700/50">{list.length} recipes</p>
      </header>

      {list.length === 0 ? (
        <p className="text-cocoa-700/60 text-center py-16">No recipes in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {list.map((r) => (
            <RecipeCard key={r.slug} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}
