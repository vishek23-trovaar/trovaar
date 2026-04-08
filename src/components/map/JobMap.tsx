"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { JobWithBidCount } from "@/types";
import { CATEGORIES } from "@/lib/constants";

const URGENCY_COLORS: Record<string, string> = {
  low: "#6B7280",
  medium: "#3B82F6",
  high: "#F59E0B",
  emergency: "#EF4444",
};

// Ping speed by urgency — emergency pulses fastest
const PING_DURATION: Record<string, string> = {
  low: "3s",
  medium: "2s",
  high: "1.4s",
  emergency: "0.9s",
};

// Inject keyframe CSS once
function ensureStyles() {
  if (document.getElementById("job-map-styles")) return;
  const style = document.createElement("style");
  style.id = "job-map-styles";
  style.textContent = `
    @keyframes sr-ping {
      0%   { transform: scale(1);   opacity: 0.75; }
      100% { transform: scale(3.2); opacity: 0; }
    }
    @keyframes sr-pop {
      0%   { transform: scale(0.4); opacity: 0; }
      60%  { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1);   opacity: 1; }
    }
    .sr-marker-wrap { animation: sr-pop 0.35s cubic-bezier(.34,1.56,.64,1) both; }
  `;
  document.head.appendChild(style);
}

function makeIcon(urgency: string, active: boolean) {
  const color = URGENCY_COLORS[urgency] || "#6B7280";
  const r = active ? 19 : 13;
  const dur = PING_DURATION[urgency] || "2s";

  return L.divIcon({
    className: "",
    html: `
      <div class="sr-marker-wrap" style="position:relative;width:${r * 2}px;height:${r * 2}px;">
        <!-- ping ring -->
        <div style="
          position:absolute;inset:0;
          border-radius:50%;
          background:${color};
          animation:sr-ping ${dur} ease-out infinite;
          pointer-events:none;
        "></div>
        <!-- core dot -->
        <div style="
          position:absolute;inset:0;
          background:${color};
          border:${active ? "3px" : "2.5px"} solid white;
          border-radius:50%;
          box-shadow:0 2px 10px rgba(0,0,0,.4)${active ? ",0 0 0 3px " + color + "55" : ""};
          transition:all .2s cubic-bezier(.34,1.56,.64,1);
        "></div>
      </div>`,
    iconSize: [r * 2, r * 2],
    iconAnchor: [r, r],
    popupAnchor: [0, -(r + 6)],
  });
}

interface JobMapProps {
  jobs: JobWithBidCount[];
  activeJobId?: string | null;
  onJobHover?: (id: string | null) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export default function JobMap({
  jobs,
  activeJobId,
  onJobHover,
  center = [39.5, -98.35],
  zoom = 4,
  className = "",
}: JobMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    ensureStyles();

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      fadeAnimation: true,
      inertia: true,
      inertiaDeceleration: 3000,
      wheelPxPerZoomLevel: 80,
    });

    // Smooth tile layer with crossOrigin for faster loading
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      keepBuffer: 4,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers when jobs / activeJobId change (mapReady ensures map exists)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const validJobs = jobs.filter((j) => j.latitude != null && j.longitude != null);
    const newIds = new Set(validJobs.map((j) => j.id));

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!newIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add / update markers
    validJobs.forEach((job) => {
      const isActive = job.id === activeJobId;
      const icon = makeIcon(job.urgency, isActive);
      const cat = CATEGORIES.find((c) => c.value === job.category);
      const photos = (() => { try { return JSON.parse(job.photos || "[]"); } catch { return []; } })();

      if (markersRef.current.has(job.id)) {
        markersRef.current.get(job.id)!.setIcon(icon);
      } else {
        const marker = L.marker([job.latitude!, job.longitude!], { icon })
          .addTo(map)
          .bindPopup(
            `<div style="min-width:200px;max-width:240px;font-family:sans-serif">
              ${photos[0] ? `<img src="${photos[0]}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;margin-bottom:8px" loading="lazy" />` : ""}
              <div style="font-size:11px;color:#6b7280;margin-bottom:2px">${cat?.label ?? job.category}</div>
              <div style="font-weight:600;font-size:13px;margin-bottom:6px;line-height:1.3">${job.title}</div>
              <div style="font-size:12px;color:#6b7280;margin-bottom:8px">📍 ${job.location}</div>
              <a href="/jobs/${job.id}" style="
                display:block;text-align:center;background:#2563eb;color:white;
                padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;
                text-decoration:none;
              ">View Job →</a>
            </div>`,
            { maxWidth: 260 }
          )
          .on("mouseover", () => onJobHover?.(job.id))
          .on("mouseout", () => onJobHover?.(null));

        markersRef.current.set(job.id, marker);
      }
    });
  }, [jobs, activeJobId, onJobHover, mapReady]);

  // Fit bounds when jobs first load
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const valid = jobs.filter((j) => j.latitude != null && j.longitude != null);
    if (valid.length === 0) return;
    const bounds = L.latLngBounds(valid.map((j) => [j.latitude!, j.longitude!]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11, animate: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.length > 0 ? jobs[0].id : null, mapReady]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ background: "#e5e7eb" }}
    />
  );
}
