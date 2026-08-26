"use client";

import { useEffect } from "react";

/** Registers the service worker (needed for install + push). No-op if the
 *  browser doesn't support service workers. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal; the app still works online.
      });
    }
  }, []);
  return null;
}
