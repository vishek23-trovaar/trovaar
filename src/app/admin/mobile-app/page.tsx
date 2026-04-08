"use client";

import { useState } from "react";

export default function MobileAppPage() {
  const [expoUrl, setExpoUrl] = useState("http://localhost:8081");
  const [device, setDevice] = useState<"iphone" | "android" | "tablet">("iphone");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [scale, setScale] = useState(100);
  const [refreshKey, setRefreshKey] = useState(0);

  const devices = {
    iphone: { name: "iPhone 15 Pro", width: 393, height: 852 },
    android: { name: "Pixel 8", width: 412, height: 915 },
    tablet: { name: "iPad Air", width: 820, height: 1180 },
  };

  const current = devices[device];
  const frameW = orientation === "portrait" ? current.width : current.height;
  const frameH = orientation === "portrait" ? current.height : current.width;
  const scaledW = (frameW * scale) / 100;
  const scaledH = (frameH * scale) / 100;

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Top toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl shadow">
            📱
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Mobile App Preview</h1>
            <p className="text-xs text-slate-500">Live development preview via Expo</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Device selector */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(Object.keys(devices) as Array<keyof typeof devices>).map((key) => (
              <button
                key={key}
                onClick={() => setDevice(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  device === key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {key === "iphone" ? "🍎 iPhone" : key === "android" ? "🤖 Android" : "📱 Tablet"}
              </button>
            ))}
          </div>

          {/* Orientation toggle */}
          <button
            onClick={() => setOrientation(o => o === "portrait" ? "landscape" : "portrait")}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Toggle orientation"
          >
            {orientation === "portrait" ? "📲" : "📱"}
          </button>

          {/* Scale */}
          <select
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white"
          >
            <option value={50}>50%</option>
            <option value={65}>65%</option>
            <option value={75}>75%</option>
            <option value={85}>85%</option>
            <option value={100}>100%</option>
          </select>

          {/* Refresh */}
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm text-slate-600 font-medium transition-colors"
          >
            🔄 Reload
          </button>
        </div>
      </div>

      {/* Device info bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-medium text-slate-700">{devices[device].name}</span>
          <span>{frameW} × {frameH}px</span>
          <span className="capitalize">{orientation}</span>
          <span>{scale}% scale</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500">Expo URL:</label>
          <input
            type="text"
            value={expoUrl}
            onChange={(e) => setExpoUrl(e.target.value)}
            className="w-64 px-2 py-1 border border-slate-200 rounded text-xs font-mono text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Connect
          </button>
        </div>
      </div>

      {/* Phone frame area */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-6">
        <div
          className="relative shrink-0"
          style={{ width: scaledW + 32, height: scaledH + 32 }}
        >
          {/* Phone bezel */}
          <div
            className="absolute inset-0 bg-slate-900 rounded-[3rem] shadow-2xl"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            {/* Notch (iPhone) */}
            {device === "iphone" && orientation === "portrait" && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-slate-900 rounded-b-2xl z-10 flex items-center justify-center">
                <div className="w-16 h-4 bg-slate-800 rounded-full" />
              </div>
            )}

            {/* Status bar dots (bottom - home indicator) */}
            {device === "iphone" && orientation === "portrait" && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-600 rounded-full z-10" />
            )}
          </div>

          {/* iframe container */}
          <div
            className="absolute overflow-hidden bg-white"
            style={{
              top: 16,
              left: 16,
              width: scaledW,
              height: scaledH,
              borderRadius: "2.2rem",
            }}
          >
            <iframe
              key={refreshKey}
              src={expoUrl}
              className="border-0"
              style={{
                width: frameW,
                height: frameH,
                transform: `scale(${scale / 100})`,
                transformOrigin: "top left",
              }}
              title="Mobile App Preview"
              allow="geolocation; camera; microphone"
            />
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-between text-xs text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Live Preview — Changes auto-reload via Expo</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Make sure <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">npx expo start</code> is running in terminal</span>
        </div>
      </div>
    </div>
  );
}
