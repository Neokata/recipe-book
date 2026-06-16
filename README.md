# The Recipe Book 🍰

A mobile-friendly PWA for browsing, scaling, and shopping for a curated collection of baking recipes.

**Live:** *(vercel URL after deploy)*

## Features

- 🧁 **147+ recipes** across 11 categories (cakes, cupcakes, cheesecakes, cookies, bars, pies, pastries, mousses, no-bake, frostings, savory & extras)
- 🖼 **Recipe images** extracted from source files where available
- 🔍 **Fuzzy search** across titles + ingredients
- 🛒 **Tap-to-add shopping list** — tap any ingredient, or "Add all"
- 🔗 **Shareable shopping list** via a URL — no login required
- ⭐ **Favorites** — star your go-to recipes
- ⚖️ **Recipe scaling** — ½×, 1×, 1½×, 2× for any recipe
- 📱 **Installable PWA** — add to home screen on iOS and Android
- 🌓 **Offline-friendly** — service worker caches recipes you visit

## Tech

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Zustand · Vercel.

## Local development

```bash
npm install
npm run extract      # parses source files in ../Recipes into data/recipes.json
npm run dev          # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Deploy

The repo is configured to auto-deploy from the `main` branch on Vercel.

## Updating recipes

1. Drop new files into the source `Recipes/` folder.
2. Re-run `npm run extract` (or push to main and let CI re-extract).
3. Commit the updated `data/recipes.json` (and any new images).

## Categories

| | | |
|---|---|---|
| 🎂 Cakes & Layer Cakes | 🧁 Cupcakes | 🍰 Cheesecakes |
| 🍪 Cookies & Brownies | 🍫 Bars & Squares | 🥧 Pies & Tarts |
| 🥐 Pastries & Choux | 🍮 Mousses & Entremets | 🍡 No-Bake & Assembled |
| 🍯 Frostings & Sauces | 🥘 Savory & Extras | |

## License

Personal project — recipes © their original authors. Images extracted from source files are used for personal reference only.
