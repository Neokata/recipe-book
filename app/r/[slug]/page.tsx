import recipes from "@/data/recipes.json";
import type { Recipe } from "@/lib/types";
import { RecipeDetail } from "@/components/RecipeDetail";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return (recipes as Recipe[]).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = (recipes as Recipe[]).find((x) => x.slug === slug);
  if (!r) return {};
  return { title: `${r.title} — The Recipe Book`, description: r.subtitle };
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = (recipes as Recipe[]).find((x) => x.slug === slug);
  if (!r) notFound();
  return <RecipeDetail recipe={r} />;
}
