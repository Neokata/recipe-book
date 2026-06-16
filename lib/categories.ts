export type CategoryId =
  | "cakes"
  | "cupcakes"
  | "cheesecakes"
  | "cookies-brownies"
  | "bars-squares"
  | "pies-tarts"
  | "pastries-choux"
  | "mousses-entremets"
  | "no-bake"
  | "frostings-sauces"
  | "savory-extras";

export type Category = {
  id: CategoryId;
  name: string;
  emoji: string;
  blurb: string;
};

export const CATEGORIES: Category[] = [
  { id: "cakes",            name: "Cakes & Layer Cakes",   emoji: "🎂", blurb: "Bundts, layer cakes, sheet cakes, fruitcakes." },
  { id: "cupcakes",         name: "Cupcakes",              emoji: "🧁", blurb: "Classic, filled, and cheesecake-style cupcakes." },
  { id: "cheesecakes",      name: "Cheesecakes",           emoji: "🍰", blurb: "Whole and mini cheesecakes of every flavor." },
  { id: "cookies-brownies", name: "Cookies & Brownies",    emoji: "🍪", blurb: "Drop cookies, cookie cakes, blondies, brownies." },
  { id: "bars-squares",     name: "Bars & Squares",        emoji: "🍫", blurb: "9x13 pan desserts — gooey, fruity, crunchy." },
  { id: "pies-tarts",       name: "Pies & Tarts",          emoji: "🥧", blurb: "Cream pies, fruit pies, tarts, Bakewell." },
  { id: "pastries-choux",   name: "Pastries & Choux",      emoji: "🥐", blurb: "Eclairs, cream puffs, profiteroles, choux." },
  { id: "mousses-entremets",name: "Mousses & Entremets",   emoji: "🍮", blurb: "Mousse cakes, mirror-glaze domes, chocolate bombs." },
  { id: "no-bake",          name: "No-Bake & Assembled",   emoji: "🍡", blurb: "Mochi, jello, novelty treats, candy." },
  { id: "frostings-sauces", name: "Frostings & Sauces",    emoji: "🍯", blurb: "Buttercreams, whipped creams, caramel, fruit sauces." },
  { id: "savory-extras",    name: "Savory & Extras",       emoji: "🥘", blurb: "Dinner mains, appetizers, and non-food items." },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, Category>;
