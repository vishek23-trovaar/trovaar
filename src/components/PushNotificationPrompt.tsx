"use client";

import { useState, useEffect } from "react";

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Only show if browser supports push, user hasn't dismissed, and not already subscribed
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (localStorage.getItem("push-prompt-dismissed") === "true") return;

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (!sub) setShow(true);
      });
    });
  }, []);

  async function handleEnable() {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShow(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Fetch VAPID public key from env or use a placeholder
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!vapidPublicKey) {
        console.warn("[push] No VAPID public key configured");
        setShow(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      const subJson = subscription.toJSON();

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
          },
        }),
      });

      setShow(false);
    } catch (err) {
      console.error("[push] Subscription failed:", err);
    } finally {
      setSubscribing(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem("push-prompt-dismissed", "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">&#x1F514;</span>
        <div>
          <p className="text-sm font-semibold text-blue-900">
            Enable push notifications
          </p>
          <p className="text-xs text-blue-700">
            Get instant alerts for bids, messages, and job updates
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleDismiss}
          className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
        >
          Not now
        </button>
        <button
          onClick={handleEnable}
          disabled={subscribing}
          className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {subscribing ? "Enabling..." : "Enable"}
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
