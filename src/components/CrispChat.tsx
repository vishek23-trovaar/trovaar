"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

declare global {
  interface Window {
    $crisp: Array<unknown>;
    CRISP_WEBSITE_ID: string;
  }
}

export default function CrispChat() {
  const { user } = useAuth();
  const websiteId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;

  // Load the Crisp script once
  useEffect(() => {
    if (!websiteId) return;
    if (window.$crisp) return; // already loaded

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = websiteId;

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);
  }, [websiteId]);

  // Identify the user whenever auth state changes
  useEffect(() => {
    if (!window.$crisp) return;

    if (user) {
      window.$crisp.push(["set", "user:email", [user.email]]);
      window.$crisp.push(["set", "user:nickname", [user.name]]);
      window.$crisp.push(["set", "session:data", [[
        ["role", user.role === "consumer" ? "Client" : "Contractor"],
        ["user_id", user.id],
      ]]]);
    } else {
      // Reset session on logout so next visitor starts fresh
      if (typeof window.$crisp.push === "function") {
        window.$crisp.push(["do", "session:reset"]);
      }
    }
  }, [user]);

  return null;
}
