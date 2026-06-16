"use client";

import { useEffect, useState, useMemo } from "react";
import { useShoppingList } from "@/lib/store";
import type { Recipe } from "@/lib/types";
import Link from "next/link";

type Props = {
  recipes: Recipe[];
};

export function ShoppingListClient({ recipes }: Props) {
  const { items, toggle, remove, clear, clearChecked, setAll } = useShoppingList();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [importPrompt, setImportPrompt] = useState(false);

  // Handle ?i=... shared list on first mount
  useEffect(() => {
    const url = new URL(window.location.href);
    const shared = url.searchParams.get("i");
    if (shared) {
      const texts = shared.split("|").map(decodeURIComponent).filter(Boolean);
      const sharedItems = texts.map((t, i) => ({
        id: `shared-${i}`,
        text: t,
        checked: false,
        addedAt: Date.now(),
      }));
      setAll(sharedItems);
      setImportPrompt(true);
      // Clean the URL
      url.searchParams.delete("i");
      window.history.replaceState({}, "", url.toString());
    }
  }, [setAll]);

  const titleBySlug = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of recipes) m.set(r.slug, r.title);
    return m;
  }, [recipes]);

  const grouped = useMemo(() => {
    const checked: typeof items = [];
    const unchecked: typeof items = [];
    for (const it of items) (it.checked ? checked : unchecked).push(it);
    return { checked, unchecked };
  }, [items]);

  function shareList() {
    const url = new URL(window.location.origin + "/list");
    const payload = items.map((i) => encodeURIComponent(i.text)).join("|");
    url.searchParams.set("i", payload);
    setShareUrl(url.toString());
    navigator.clipboard?.writeText(url.toString()).catch(() => {});
  }

  return (
    <div className="py-6 sm:py-10 max-w-2xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="h-display text-3xl sm:text-4xl font-semibold text-cocoa-800">Shopping list</h1>
          <p className="text-cocoa-700/70 mt-1">
            {items.length === 0
              ? "Tap an ingredient on a recipe to add it here."
              : `${grouped.unchecked.length} to buy · ${grouped.checked.length} in cart`}
          </p>
        </div>
        {items.length > 0 && (
          <button onClick={shareList} className="btn-primary flex-shrink-0">
            <span>🔗</span>
            <span>Share</span>
          </button>
        )}
      </header>

      {importPrompt && (
        <div className="mb-4 rounded-2xl bg-blush-100 border border-blush-300 p-4 text-sm text-cocoa-800 flex items-start justify-between gap-3">
          <span>Loaded a shared list. You can keep editing — these items are now in your list.</span>
          <button onClick={() => setImportPrompt(false)} className="text-cocoa-700/60 hover:text-cocoa-800">✕</button>
        </div>
      )}

      {shareUrl && (
        <div className="mb-4 rounded-2xl border border-cocoa-700/15 bg-cream-50 p-4 text-sm">
          <p className="font-medium text-cocoa-800 mb-1">Shareable link copied!</p>
          <p className="text-cocoa-700/70 break-all text-xs">{shareUrl}</p>
          <button onClick={() => setShareUrl(null)} className="mt-2 text-xs text-cocoa-700/50 hover:text-cocoa-800">Dismiss</button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-3">🛒</div>
          <p className="text-cocoa-700/60 mb-4">Your list is empty.</p>
          <Link href="/" className="btn-ghost">Browse recipes</Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2 mb-6">
            {grouped.unchecked.map((it) => (
              <ItemRow key={it.id} item={it} onToggle={() => toggle(it.id)} onRemove={() => remove(it.id)} />
            ))}
            {grouped.checked.length > 0 && (
              <>
                <li className="pt-4 pb-1 text-xs uppercase tracking-wider text-cocoa-700/50 font-medium">
                  In cart
                </li>
                {grouped.checked.map((it) => (
                  <ItemRow key={it.id} item={it} onToggle={() => toggle(it.id)} onRemove={() => remove(it.id)} muted />
                ))}
              </>
            )}
          </ul>

          <div className="flex flex-wrap gap-2 justify-end text-sm">
            {grouped.checked.length > 0 && (
              <button onClick={clearChecked} className="btn-ghost">Clear in-cart</button>
            )}
            <button onClick={clear} className="btn-ghost text-cocoa-700/70">Clear all</button>
          </div>
        </>
      )}
    </div>
  );
}

function ItemRow({ item, onToggle, onRemove, muted }: { item: any; onToggle: () => void; onRemove: () => void; muted?: boolean }) {
  return (
    <li className={`flex items-start gap-3 rounded-2xl border border-cocoa-700/10 bg-cream-50 p-3 ${muted ? "opacity-60" : ""}`}>
      <input
        type="checkbox"
        checked={item.checked}
        onChange={onToggle}
        className="mt-1 w-5 h-5 rounded border-cocoa-700/30 text-terracotta-500 focus:ring-terracotta-400 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p className={`text-cocoa-800 ${item.checked ? "line-through" : ""}`}>{item.text}</p>
        {item.source && <p className="text-xs text-cocoa-700/50 mt-0.5">from {item.source}</p>}
      </div>
      <button onClick={onRemove} className="text-cocoa-700/40 hover:text-terracotta-500 px-1.5" aria-label="Remove">
        ✕
      </button>
    </li>
  );
}
