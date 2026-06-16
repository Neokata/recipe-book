"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useShoppingList } from "@/lib/store";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const count = useShoppingList((s) => s.items.length);

  // Close menu on route change
  useEffect(() => setOpen(false), [pathname]);

  const linkCls = (href: string) =>
    `px-3 py-1.5 rounded-full text-sm font-medium transition ${
      pathname === href
        ? "bg-terracotta-500 text-cream-50"
        : "text-cocoa-700 hover:bg-cream-100"
    }`;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-cream-50/85 border-b border-cocoa-700/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-2xl">🧁</span>
          <span className="h-display text-xl sm:text-2xl font-semibold tracking-tight text-cocoa-800">
            The Recipe Book
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className={linkCls("/")}>Home</Link>
          <Link href="/list" className={linkCls("/list")}>
            Shopping list
            {count > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blush-500 text-[10px] font-bold text-cream-50">
                {count}
              </span>
            )}
          </Link>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg text-cocoa-800 hover:bg-cream-100"
          aria-label="Open menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-cocoa-700/10 bg-cream-50">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            <Link href="/" className={linkCls("/")}>Home</Link>
            <Link href="/list" className={linkCls("/list")}>
              Shopping list {count > 0 && `(${count})`}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
