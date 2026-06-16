import recipes from "@/data/recipes.json";
import type { Recipe } from "@/lib/types";
import { ShoppingListClient } from "@/components/ShoppingListClient";

export const metadata = { title: "Shopping List — The Recipe Book" };

export default function ListPage() {
  return <ShoppingListClient recipes={recipes as Recipe[]} />;
}
