import Link from "next/link";

/**
 * Design-direction chooser. Each card links to a full homepage mockup built
 * faithfully in that design language (see .design-ref DESIGN.md files).
 * These are preview-only routes — the live site is untouched.
 */
const OPTIONS = [
  {
    slug: "stripe",
    name: "Stripe",
    tag: "Clean & trusted",
    desc: "Light, airy, restrained. Tasteful signature gradient, crisp tight-tracked type, real icons. Reads as a polished, well-funded company.",
    swatch: "linear-gradient(135deg, #f6f9fc 0%, #e6e9ff 40%, #533afd 100%)",
    fg: "#0d253d",
  },
  {
    slug: "linear",
    name: "Linear",
    tag: "Premium dark",
    desc: "Near-black canvas, one lavender accent used sparingly, hairline charcoal panels, tight negative tracking. Quietly luxurious, engineering-grade.",
    swatch: "#010102",
    fg: "#f7f8f8",
  },
  {
    slug: "airbnb",
    name: "Airbnb",
    tag: "Warm marketplace",
    desc: "White canvas, Rausch-red accent, rounded and friendly, photo-first card grid with a pill search bar. Approachable consumer-marketplace feel.",
    swatch: "#ffffff",
    fg: "#ff385c",
  },
  {
    slug: "uber",
    name: "Uber",
    tag: "Bold black & white",
    desc: "Monochrome, no gradients, signature 999px pills everywhere, big sentence-case display, alternating black/white bands. Maximally disciplined.",
    swatch: "linear-gradient(135deg, #000 50%, #fff 50%)",
    fg: "#000",
  },
];

export default function DesignPreviewIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "#e7ecf3", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: "#8a93a6", fontWeight: 600 }}>
          Trovaar · design directions
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, margin: "8px 0 12px" }}>
          Pick a direction
        </h1>
        <p style={{ color: "#9aa3b5", maxWidth: 620, lineHeight: 1.6 }}>
          Each is a full homepage mockup built faithfully in that company&apos;s design language, using
          Trovaar&apos;s real copy. Open them, compare, and tell me which one to build the whole site to.
          Your live site is untouched.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginTop: 40 }}>
          {OPTIONS.map((o) => (
            <Link
              key={o.slug}
              href={`/design-preview/${o.slug}`}
              style={{
                display: "block",
                borderRadius: 18,
                overflow: "hidden",
                border: "1px solid #1f2940",
                background: "#111728",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ height: 120, background: o.swatch, display: "flex", alignItems: "flex-end", padding: 16 }}>
                <span style={{ color: o.fg, fontWeight: 800, fontSize: 22, letterSpacing: -0.4 }}>{o.name}</span>
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#7c89ff", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {o.tag}
                </div>
                <p style={{ color: "#9aa3b5", fontSize: 14, lineHeight: 1.55, marginTop: 8 }}>{o.desc}</p>
                <div style={{ marginTop: 14, fontWeight: 700, fontSize: 14 }}>View mockup →</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
