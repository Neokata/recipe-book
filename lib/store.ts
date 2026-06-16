"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ShoppingItem = {
  /** Stable id, allows dedup */
  id: string;
  /** Display text */
  text: string;
  /** Where it came from, for the "from" tag */
  source?: string;
  /** Whether the user has it in the cart */
  checked: boolean;
  addedAt: number;
};

type State = {
  items: ShoppingItem[];
  add: (text: string, source?: string) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  clearChecked: () => void;
  /** Replace the entire list (used when opening a shareable link) */
  setAll: (items: ShoppingItem[]) => void;
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s\-•·*]+/, "")
    .trim();
}

export const useShoppingList = create<State>()(
  persist(
    (set) => ({
      items: [],
      add: (text, source) =>
        set((state) => {
          const key = normalize(text);
          if (!key) return state;
          const existing = state.items.find((i) => normalize(i.text) === key);
          if (existing) return state;
          return {
            items: [
              ...state.items,
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                text: text.trim(),
                source,
                checked: false,
                addedAt: Date.now(),
              },
            ],
          };
        }),
      toggle: (id) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
        })),
      remove: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      clearChecked: () => set((state) => ({ items: state.items.filter((i) => !i.checked) })),
      setAll: (items) => set({ items }),
    }),
    { name: "recipe-book-shopping-list-v1" }
  )
);
