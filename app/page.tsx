import recipes from "@/data/recipes.json";
import type { Recipe } from "@/lib/types";
import { HomeClient } from "@/components/HomeClient";

export const metadata = {
  title: "The Recipe Book",
  description: "A curated collection of baking recipes — at your fingertips.",
};

export default function HomePage() {
  return <HomeClient recipes={recipes as Recipe[]} />;
}
