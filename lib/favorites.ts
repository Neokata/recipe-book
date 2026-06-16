"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type FavoritesState = {
  ids: string[];
  toggle: (slug: string) => void;
  has: (slug: string) => boolean;
};

export const useFavorites = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (slug) =>
        set((s) => ({
          ids: s.ids.includes(slug) ? s.ids.filter((x) => x !== slug) : [...s.ids, slug],
        })),
      has: (slug) => get().ids.includes(slug),
    }),
    { name: "recipe-book-favorites-v1" }
  )
);
