"use client";

import { useEffect, useState } from "react";
import { subscribeToPush } from "./push-actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State =
  | "checking"
  | "idle"
  | "working"
  | "subscribed"
  | "denied"
  | "error"
  | "hidden";

export function EnableNotifications() {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    if (!VAPID) return setState("hidden");
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      // iOS shows push only once installed to the home screen (iOS 16.4+).
      return setState("hidden");
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "idle"))
      .catch(() => setState("idle"));
  }, []);

  async function enable() {
    try {
      setState("working");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState("denied");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID!) as BufferSource,
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: Record<string, string> };
      if (!json.endpoint || !json.keys) return setState("error");

      const res = await subscribeToPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setState(res.ok ? "subscribed" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "checking" || state === "hidden") return null;

  if (state === "subscribed") {
    return (
      <div className="mb-6 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
        🔔 Notifications on
      </div>
    );
  }

  return (
    <button
      onClick={enable}
      disabled={state === "working"}
      className="mb-6 w-full rounded-sm border border-beacon/40 bg-beacon-soft/30 px-3.5 py-2.5 text-sm font-semibold hover:border-beacon disabled:opacity-60"
    >
      {state === "working"
        ? "Enabling…"
        : state === "denied"
          ? "Notifications blocked — enable them in your browser settings"
          : state === "error"
            ? "Couldn't enable — tap to retry"
            : "🔔 Turn on notifications"}
    </button>
  );
}
