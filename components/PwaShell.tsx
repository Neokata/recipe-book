"use client";

import { useEffect, useState } from "react";

/**
 * PWA shell — registers the service worker, exposes an "update available"
 * refresh banner, and shows an install prompt on Android/Chrome.
 */
export function PwaShell() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstalled, setShowInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        if (reg.waiting) {
          setUpdateAvailable(true);
          setWaitingWorker(reg.waiting);
        }
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
              setWaitingWorker(newWorker);
            }
          });
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }

    // Install prompt
    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      window.setTimeout(() => setShowInstalled(false), 4000);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  function applyUpdate() {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  }

  async function installApp() {
    if (!installEvent) return;
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice?.outcome === "accepted") {
      setShowInstalled(true);
      setInstallEvent(null);
    }
  }

  // Don't show banner on iOS — it has no install prompt.
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <>
      {updateAvailable && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] bg-cocoa-800 text-cream-50 rounded-2xl shadow-lg p-4 flex items-start gap-3">
          <div className="flex-1 text-sm">
            <p className="font-medium">A new version is ready</p>
            <p className="text-cream-50/70 text-xs mt-0.5">Refresh to see the latest recipes and fixes.</p>
          </div>
          <button onClick={applyUpdate} className="bg-blush-500 hover:bg-blush-300 text-cocoa-800 rounded-full px-3 py-1.5 text-sm font-medium">
            Refresh
          </button>
        </div>
      )}

      {installEvent && (
        <div className="fixed bottom-4 right-4 z-40 max-w-xs bg-cream-50 border border-cocoa-700/15 rounded-2xl shadow-lg p-4">
          <p className="text-sm font-medium text-cocoa-800">Install The Recipe Book</p>
          <p className="text-xs text-cocoa-700/60 mt-1">Add to your home screen for one-tap access.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={installApp} className="btn-primary text-sm py-1.5 px-3">Install</button>
            <button onClick={() => setInstallEvent(null)} className="text-sm text-cocoa-700/50 hover:text-cocoa-800 px-2">Not now</button>
          </div>
        </div>
      )}

      {showInstalled && (
        <div className="fixed bottom-4 right-4 z-40 max-w-xs bg-terracotta-500 text-cream-50 rounded-2xl shadow-lg p-3 text-sm">
          ✓ Installed! Find it on your home screen.
        </div>
      )}

      {isIOS && !window.matchMedia("(display-mode: standalone)").matches && (
        <IOSInstallHint />
      )}
    </>
  );
}

function IOSInstallHint() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-cream-50 border border-cocoa-700/15 rounded-2xl shadow-lg p-3 text-sm text-cocoa-800"
      >
        📲 Install app
      </button>
    );
  }
  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-xs bg-cream-50 border border-cocoa-700/15 rounded-2xl shadow-lg p-4 text-sm text-cocoa-800">
      <p className="font-medium">Install on iOS</p>
      <p className="text-xs text-cocoa-700/70 mt-1.5">
        Tap the <span className="font-bold">Share</span> button in Safari, then choose <span className="font-bold">Add to Home Screen</span>.
      </p>
      <button onClick={() => setOpen(false)} className="mt-2 text-xs text-cocoa-700/50">Got it</button>
    </div>
  );
}
