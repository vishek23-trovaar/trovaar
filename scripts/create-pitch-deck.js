const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Trovaar";
pres.title = "Trovaar - Investor Pitch Deck";

// ── Brand Colors ──
const C = {
  navy: "0A0F1E",
  blue: "1E40AF",
  blueLight: "3B82F6",
  indigo: "4338CA",
  white: "FFFFFF",
  offWhite: "F8FAFC",
  slate100: "F1F5F9",
  slate300: "CBD5E1",
  slate400: "94A3B8",
  slate500: "64748B",
  slate700: "334155",
  slate900: "0F172A",
  green: "059669",
  greenLight: "10B981",
  amber: "D97706",
  red: "DC2626",
  purple: "7C3AED",
};

const makeShadow = () => ({
  type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.2,
});

// ════════════════════════════════════════════════════════════════
// SLIDE 1 — TITLE
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Grid pattern overlay (simulated with subtle lines)
  for (let i = 0; i < 10; i++) {
    s.addShape(pres.shapes.LINE, {
      x: i + 0.5, y: 0, w: 0, h: 5.625,
      line: { color: C.white, width: 0.3, transparency: 95 },
    });
  }

  // Lightning bolt icon (text emoji)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 4.25, y: 0.8, w: 1.5, h: 1.5,
    fill: { color: C.blue },
    rectRadius: 0.3,
    shadow: makeShadow(),
  });
  s.addText("⚡", {
    x: 4.25, y: 0.8, w: 1.5, h: 1.5,
    fontSize: 48, align: "center", valign: "middle",
  });

  // Title
  s.addText("Trovaar", {
    x: 0.5, y: 2.4, w: 9, h: 1.0,
    fontSize: 54, fontFace: "Arial Black", color: C.white,
    bold: true, align: "center", valign: "middle", margin: 0,
  });

  // Tagline
  s.addText("The network that connects every skilled trade to every job.", {
    x: 1.5, y: 3.35, w: 7, h: 0.6,
    fontSize: 18, fontFace: "Calibri", color: C.slate400,
    align: "center", valign: "middle",
  });

  // Subtitle
  s.addText("Connect Any Skill to Any Trade", {
    x: 2, y: 4.0, w: 6, h: 0.5,
    fontSize: 14, fontFace: "Calibri", color: C.blueLight,
    align: "center", valign: "middle", italic: true,
  });

  // Bottom bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.2, w: 10, h: 0.425,
    fill: { color: C.blue },
  });
  s.addText("Investor Pitch  |  2026", {
    x: 0, y: 5.2, w: 10, h: 0.425,
    fontSize: 11, fontFace: "Calibri", color: C.white,
    align: "center", valign: "middle",
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 2 — THE PROBLEM
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addText("The Problem", {
    x: 0.6, y: 0.3, w: 5, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.white, bold: true, margin: 0,
  });

  // Red story box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 1.2, w: 5.5, h: 2.8,
    fill: { color: "1A1A2E" },
    rectRadius: 0.15,
    shadow: makeShadow(),
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: 1.2, w: 0.08, h: 2.8,
    fill: { color: C.red },
  });

  s.addText("REAL STORY", {
    x: 0.95, y: 1.35, w: 2, h: 0.35,
    fontSize: 10, fontFace: "Calibri", color: C.red,
    bold: true,
  });

  s.addText([
    { text: "An 86-year-old man was quoted ", options: { color: C.slate300, fontSize: 14 } },
    { text: "$11,000–$13,000", options: { color: C.red, fontSize: 14, bold: true } },
    { text: " to redo his bathroom.", options: { color: C.slate300, fontSize: 14, breakLine: true } },
    { text: "", options: { fontSize: 8, breakLine: true } },
    { text: "His son got quoted ", options: { color: C.slate300, fontSize: 14 } },
    { text: "$5,800–$7,000", options: { color: C.greenLight, fontSize: 14, bold: true } },
    { text: " for the exact same job.", options: { color: C.slate300, fontSize: 14, breakLine: true } },
    { text: "", options: { fontSize: 8, breakLine: true } },
    { text: "That's not a coincidence. That's predatory pricing — targeting a senior who they assumed wouldn't question it.", options: { color: C.slate500, fontSize: 12, italic: true } },
  ], {
    x: 0.95, y: 1.7, w: 4.9, h: 2.1,
    fontFace: "Calibri", valign: "top",
  });

  // Stats column on right
  const stats = [
    { num: "72%", label: "of homeowners feel\novercharged for repairs", color: C.red },
    { num: "$12K", label: "avg overpayment on\nhome renovation jobs", color: C.amber },
    { num: "0", label: "platforms offer truly\nunbiased blind bidding", color: C.blueLight },
  ];

  stats.forEach((stat, i) => {
    const y = 1.2 + i * 1.0;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 6.6, y, w: 3.0, h: 0.85,
      fill: { color: "1A1A2E" },
      rectRadius: 0.1,
    });
    s.addText(stat.num, {
      x: 6.75, y, w: 1.2, h: 0.85,
      fontSize: 28, fontFace: "Arial Black", color: stat.color,
      bold: true, valign: "middle", margin: 0,
    });
    s.addText(stat.label, {
      x: 7.9, y, w: 1.6, h: 0.85,
      fontSize: 10, fontFace: "Calibri", color: C.slate400,
      valign: "middle",
    });
  });

  // Bottom insight
  s.addText("Seniors, women, and non-English speakers are disproportionately targeted with inflated quotes.", {
    x: 0.6, y: 4.5, w: 8.8, h: 0.6,
    fontSize: 12, fontFace: "Calibri", color: C.slate500, italic: true,
    align: "center",
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 3 — THE BROKEN SYSTEM (Lead Gen Pain)
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("The System is Broken — For Everyone", {
    x: 0.6, y: 0.3, w: 9, h: 0.7,
    fontSize: 34, fontFace: "Arial Black", color: C.slate900, bold: true, margin: 0,
  });
  s.addText("Today's platforms punish contractors AND exhaust customers.", {
    x: 0.6, y: 0.95, w: 8, h: 0.4,
    fontSize: 14, fontFace: "Calibri", color: C.slate500,
  });

  // LEFT — Customer Pain
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.6, w: 4.3, h: 3.5,
    fill: { color: C.white },
    shadow: makeShadow(),
    rectRadius: 0.12,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.6, w: 4.3, h: 0.06,
    fill: { color: C.red },
  });
  s.addText("😩  The Customer Experience", {
    x: 0.7, y: 1.8, w: 3.9, h: 0.45,
    fontSize: 16, fontFace: "Calibri", color: C.red, bold: true,
  });

  const customerPains = [
    "Submit a request on Angi or Thumbtack",
    "Your phone number gets sold to 5-10 contractors",
    "Phone rings non-stop within minutes",
    "You repeat the SAME problem to every single caller",
    "Each contractor wants to schedule their own visit",
    "You spend hours coordinating — just to compare prices",
    "Many give up and just hire whoever calls first",
  ];
  s.addText(
    customerPains.map((item, j) => ({
      text: item,
      options: { bullet: true, breakLine: j < customerPains.length - 1, fontSize: 10.5, color: C.slate700 },
    })),
    { x: 0.8, y: 2.35, w: 3.8, h: 2.5, fontFace: "Calibri", paraSpaceAfter: 3 }
  );

  // RIGHT — Contractor Pain
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.6, w: 4.3, h: 3.5,
    fill: { color: C.white },
    shadow: makeShadow(),
    rectRadius: 0.12,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.6, w: 4.3, h: 0.06,
    fill: { color: C.amber },
  });
  s.addText("💸  The Contractor Experience", {
    x: 5.4, y: 1.8, w: 3.9, h: 0.45,
    fontSize: 16, fontFace: "Calibri", color: C.amber, bold: true,
  });

  const contractorPains = [
    "Pay $15–$80 per lead just to SEE a customer's info",
    "Lead is shared with 5+ other contractors simultaneously",
    "Customer often doesn't answer — lead is wasted",
    "No guarantee the customer is serious or qualified",
    "Win rate on paid leads: roughly 10-15%",
    "Effectively paying $150–$500 per actual job won",
    "Small operators can't afford to compete with big firms",
  ];
  s.addText(
    contractorPains.map((item, j) => ({
      text: item,
      options: { bullet: true, breakLine: j < contractorPains.length - 1, fontSize: 10.5, color: C.slate700 },
    })),
    { x: 5.3, y: 2.35, w: 3.8, h: 2.5, fontFace: "Calibri", paraSpaceAfter: 3 }
  );

  // Bottom comparison bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 5.25, w: 9.0, h: 0.0,
    line: { color: C.slate300, width: 0.5 },
  });

  // Trovaar difference callouts
  s.addText([
    { text: "Trovaar flips this: ", options: { bold: true, color: C.blue, fontSize: 11 } },
    { text: "Customers describe the job once → Contractors bid on the listing → No phone spam, no lead fees, no repeating yourself. Post once, get multiple competitive bids.", options: { color: C.slate500, fontSize: 11 } },
  ], {
    x: 0.6, y: 5.05, w: 8.8, h: 0.45,
    fontFace: "Calibri", valign: "middle",
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 4 — THE SOLUTION
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("The Solution", {
    x: 0.6, y: 0.3, w: 5, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.slate900, bold: true, margin: 0,
  });

  s.addText("Trovaar is the Uber of home services — transparent, competitive, and fair.", {
    x: 0.6, y: 1.0, w: 8.8, h: 0.5,
    fontSize: 16, fontFace: "Calibri", color: C.slate500,
  });

  const features = [
    { icon: "📸", title: "Snap & Post", desc: "Clients describe or record a video of the problem. AI auto-categorizes and writes the listing.", color: C.blue },
    { icon: "🔒", title: "Blind Bidding", desc: "Contractors bid without seeing client identity — no discrimination based on age, gender, or appearance.", color: C.purple },
    { icon: "⚡", title: "Pros Compete", desc: "Multiple verified contractors bid in real-time. Clients compare price, rating, and availability.", color: C.green },
    { icon: "✅", title: "Get It Done", desc: "Choose the best bid, track progress, pay securely through the platform. Rate when complete.", color: C.amber },
  ];

  features.forEach((f, i) => {
    const x = 0.6 + i * 2.3;
    // Card
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.7, w: 2.1, h: 3.2,
      fill: { color: C.white },
      shadow: makeShadow(),
      rectRadius: 0.12,
    });
    // Top accent
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.7, w: 2.1, h: 0.06,
      fill: { color: f.color },
    });
    // Icon
    s.addText(f.icon, {
      x, y: 1.9, w: 2.1, h: 0.7,
      fontSize: 36, align: "center", valign: "middle",
    });
    // Title
    s.addText(f.title, {
      x: x + 0.15, y: 2.6, w: 1.8, h: 0.5,
      fontSize: 14, fontFace: "Calibri", color: C.slate900,
      bold: true, align: "center",
    });
    // Desc
    s.addText(f.desc, {
      x: x + 0.15, y: 3.1, w: 1.8, h: 1.5,
      fontSize: 10, fontFace: "Calibri", color: C.slate500,
      align: "center", valign: "top",
    });
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 4 — AI-POWERED (THE HOOK)
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addText("AI-Powered Job Posting", {
    x: 0.6, y: 0.3, w: 8, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.white, bold: true, margin: 0,
  });
  s.addText("Record a video. AI does the rest.", {
    x: 0.6, y: 0.95, w: 8, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.blueLight, italic: true,
  });

  // Flow steps
  const steps = [
    { num: "01", icon: "📱", title: "Record", desc: "Client records a Snapchat-style video showing the problem" },
    { num: "02", icon: "🤖", title: "AI Analyzes", desc: "Gemini AI watches the video, transcribes audio, identifies the trade" },
    { num: "03", icon: "📋", title: "Auto-Fill", desc: "Category, title, description, urgency — all generated instantly" },
    { num: "04", icon: "✏️", title: "Confirm", desc: "Client reviews, edits if needed, and posts in one tap" },
  ];

  steps.forEach((step, i) => {
    const x = 0.4 + i * 2.4;
    // Card bg
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.7, w: 2.15, h: 3.0,
      fill: { color: "111827" },
      rectRadius: 0.12,
    });
    // Number
    s.addText(step.num, {
      x: x + 0.15, y: 1.85, w: 0.6, h: 0.4,
      fontSize: 11, fontFace: "Calibri", color: C.blueLight,
      bold: true,
    });
    // Icon
    s.addText(step.icon, {
      x, y: 2.2, w: 2.15, h: 0.8,
      fontSize: 40, align: "center", valign: "middle",
    });
    // Title
    s.addText(step.title, {
      x: x + 0.15, y: 3.0, w: 1.85, h: 0.4,
      fontSize: 16, fontFace: "Calibri", color: C.white,
      bold: true, align: "center",
    });
    // Desc
    s.addText(step.desc, {
      x: x + 0.15, y: 3.4, w: 1.85, h: 1.1,
      fontSize: 10, fontFace: "Calibri", color: C.slate400,
      align: "center", valign: "top",
    });

    // Arrow between cards
    if (i < 3) {
      s.addText("→", {
        x: x + 2.15, y: 2.8, w: 0.25, h: 0.5,
        fontSize: 20, color: C.blueLight, align: "center", valign: "middle",
      });
    }
  });

  s.addText("No typing. No confusion. Gen Z and seniors can post a job in under 30 seconds.", {
    x: 0.6, y: 4.85, w: 8.8, h: 0.45,
    fontSize: 13, fontFace: "Calibri", color: C.slate500,
    align: "center", italic: true,
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 5 — DUAL PLATFORM
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("Web + Mobile", {
    x: 0.6, y: 0.3, w: 5, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.slate900, bold: true, margin: 0,
  });
  s.addText("One platform, every device. Built for how people actually work.", {
    x: 0.6, y: 0.95, w: 8, h: 0.4,
    fontSize: 14, fontFace: "Calibri", color: C.slate500,
  });

  // Web side
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.6, w: 4.3, h: 3.4,
    fill: { color: C.white },
    shadow: makeShadow(),
    rectRadius: 0.12,
  });
  s.addText("🖥️  Web Application", {
    x: 0.7, y: 1.75, w: 3.9, h: 0.5,
    fontSize: 16, fontFace: "Calibri", color: C.slate900, bold: true,
  });
  s.addText([
    { text: "Full-featured dashboard for clients & contractors", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "Post jobs with photos, video, or text", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "Real-time messaging & bid tracking", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "Admin console with analytics & user management", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "Subscription management", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "Built with Next.js 15 — fast, SEO-optimized", options: { bullet: true, fontSize: 11 } },
  ], {
    x: 0.8, y: 2.35, w: 3.8, h: 2.4,
    fontFace: "Calibri", color: C.slate700,
  });

  // Mobile side
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.6, w: 4.3, h: 3.4,
    fill: { color: C.white },
    shadow: makeShadow(),
    rectRadius: 0.12,
  });
  s.addText("📱  Mobile App (iOS + Android)", {
    x: 5.4, y: 1.75, w: 3.9, h: 0.5,
    fontSize: 16, fontFace: "Calibri", color: C.slate900, bold: true,
  });
  s.addText([
    { text: "Snapchat-style video job recording", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "AI-powered voice & video analysis", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "Uber-quality onboarding & navigation", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "Push notifications for new bids & messages", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "Offline-ready with local caching", options: { bullet: true, breakLine: true, fontSize: 11 } },
    { text: "Built with React Native / Expo", options: { bullet: true, fontSize: 11 } },
  ], {
    x: 5.3, y: 2.35, w: 3.8, h: 2.4,
    fontFace: "Calibri", color: C.slate700,
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 6 — UNBIASED BIDDING (KEY DIFFERENTIATOR)
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addText("Unbiased Bidding", {
    x: 0.6, y: 0.3, w: 8, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.white, bold: true, margin: 0,
  });
  s.addText("What makes us different from every other marketplace.", {
    x: 0.6, y: 0.95, w: 8, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.blueLight,
  });

  // Left — Before (Competitors)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.6, w: 4.3, h: 3.2,
    fill: { color: "1F1215" },
    rectRadius: 0.12,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.6, w: 4.3, h: 0.06,
    fill: { color: C.red },
  });
  s.addText("❌  Traditional Platforms", {
    x: 0.7, y: 1.8, w: 3.9, h: 0.45,
    fontSize: 16, fontFace: "Calibri", color: C.red, bold: true,
  });
  s.addText([
    { text: "Contractor sees client name, photo, address before quoting", options: { bullet: true, breakLine: true, fontSize: 11, color: C.slate400 } },
    { text: "Older clients consistently quoted 30-80% higher", options: { bullet: true, breakLine: true, fontSize: 11, color: C.slate400 } },
    { text: "Women quoted higher for auto & home repair", options: { bullet: true, breakLine: true, fontSize: 11, color: C.slate400 } },
    { text: "Affluent zip codes get inflated quotes", options: { bullet: true, breakLine: true, fontSize: 11, color: C.slate400 } },
    { text: "No accountability for price discrimination", options: { bullet: true, fontSize: 11, color: C.slate400 } },
  ], {
    x: 0.8, y: 2.35, w: 3.8, h: 2.2,
    fontFace: "Calibri",
  });

  // Right — After (Trovaar)
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.6, w: 4.3, h: 3.2,
    fill: { color: "0D1F17" },
    rectRadius: 0.12,
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.2, y: 1.6, w: 4.3, h: 0.06,
    fill: { color: C.green },
  });
  s.addText("✅  Trovaar", {
    x: 5.4, y: 1.8, w: 3.9, h: 0.45,
    fontSize: 16, fontFace: "Calibri", color: C.greenLight, bold: true,
  });
  s.addText([
    { text: "Bids are blind — no name, photo, age, or address shared", options: { bullet: true, breakLine: true, fontSize: 11, color: C.slate400 } },
    { text: "Contractors bid on the job description only", options: { bullet: true, breakLine: true, fontSize: 11, color: C.slate400 } },
    { text: "Identity revealed only after bid is accepted", options: { bullet: true, breakLine: true, fontSize: 11, color: C.slate400 } },
    { text: "Every quote is based on scope of work — nothing else", options: { bullet: true, breakLine: true, fontSize: 11, color: C.slate400 } },
    { text: "Fair pricing enforced by transparency", options: { bullet: true, fontSize: 11, color: C.slate400 } },
  ], {
    x: 5.3, y: 2.35, w: 3.8, h: 2.2,
    fontFace: "Calibri",
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 7 — REVENUE MODEL
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("Revenue Model", {
    x: 0.6, y: 0.3, w: 5, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.slate900, bold: true, margin: 0,
  });

  // Main revenue box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.3, w: 5.5, h: 2.5,
    fill: { color: C.white },
    shadow: makeShadow(),
    rectRadius: 0.12,
  });

  s.addText("20%", {
    x: 0.7, y: 1.4, w: 2.5, h: 1.2,
    fontSize: 64, fontFace: "Arial Black", color: C.blue,
    bold: true, margin: 0,
  });
  s.addText("Platform Fee", {
    x: 0.7, y: 2.5, w: 2.5, h: 0.4,
    fontSize: 16, fontFace: "Calibri", color: C.slate700, bold: true,
  });
  s.addText("Built into every accepted bid.\nContractor sees their price.\nClient sees price + 20%.\nPlatform keeps the difference.", {
    x: 3.4, y: 1.5, w: 2.4, h: 2.0,
    fontSize: 12, fontFace: "Calibri", color: C.slate500,
  });

  // Secondary revenue
  const secondary = [
    { title: "Subscriptions", desc: "Home Health plans: $49–$189/mo for routine maintenance visits", icon: "💎" },
    { title: "Priority Placement", desc: "Contractors pay for featured positioning in bid results", icon: "📈" },
    { title: "Premium Tools", desc: "Advanced analytics, portfolio showcase, verified badges", icon: "🛠️" },
  ];

  secondary.forEach((r, i) => {
    const y = 1.3 + i * 0.85;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 6.4, y, w: 3.2, h: 0.75,
      fill: { color: C.white },
      shadow: makeShadow(),
      rectRadius: 0.08,
    });
    s.addText(r.icon, {
      x: 6.5, y, w: 0.5, h: 0.75,
      fontSize: 20, valign: "middle", align: "center",
    });
    s.addText(r.title, {
      x: 7.05, y: y + 0.05, w: 2.4, h: 0.3,
      fontSize: 12, fontFace: "Calibri", color: C.slate900, bold: true,
    });
    s.addText(r.desc, {
      x: 7.05, y: y + 0.35, w: 2.4, h: 0.35,
      fontSize: 9, fontFace: "Calibri", color: C.slate500,
    });
  });

  // Unit economics
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.1, w: 9.0, h: 1.1,
    fill: { color: C.blue },
    rectRadius: 0.1,
  });
  s.addText("Example: $500 plumbing job", {
    x: 0.7, y: 4.15, w: 3, h: 0.4,
    fontSize: 12, fontFace: "Calibri", color: C.white, bold: true,
  });

  const breakdown = [
    { label: "Client Pays", value: "$600", x: 4.0 },
    { label: "Contractor Gets", value: "$500", x: 6.0 },
    { label: "Trovaar Keeps", value: "$100", x: 8.0 },
  ];
  breakdown.forEach((b) => {
    s.addText(b.value, {
      x: b.x, y: 4.15, w: 1.5, h: 0.55,
      fontSize: 24, fontFace: "Arial Black", color: C.white,
      bold: true, align: "center", margin: 0,
    });
    s.addText(b.label, {
      x: b.x, y: 4.7, w: 1.5, h: 0.35,
      fontSize: 10, fontFace: "Calibri", color: C.slate300,
      align: "center",
    });
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 8 — MARKET SIZE
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addText("Market Opportunity", {
    x: 0.6, y: 0.3, w: 8, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.white, bold: true, margin: 0,
  });

  // TAM SAM SOM
  const circles = [
    { label: "TAM", value: "$657B", desc: "US Home Services Market", size: 3.2, x: 1.0, y: 1.5, opacity: 20 },
    { label: "SAM", value: "$89B", desc: "On-Demand / Gig Services", size: 2.4, x: 3.8, y: 1.8, opacity: 35 },
    { label: "SOM", value: "$2.4B", desc: "Digital-First Bidding Platforms", size: 1.6, x: 6.2, y: 2.2, opacity: 50 },
  ];

  circles.forEach((c) => {
    s.addShape(pres.shapes.OVAL, {
      x: c.x, y: c.y, w: c.size, h: c.size,
      fill: { color: C.blueLight, transparency: c.opacity },
      line: { color: C.blueLight, width: 1.5, transparency: 30 },
    });
    s.addText(c.value, {
      x: c.x, y: c.y + c.size * 0.25, w: c.size, h: c.size * 0.3,
      fontSize: 28, fontFace: "Arial Black", color: C.white,
      bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText(c.label, {
      x: c.x, y: c.y + c.size * 0.5, w: c.size, h: 0.35,
      fontSize: 12, fontFace: "Calibri", color: C.blueLight,
      bold: true, align: "center",
    });
    s.addText(c.desc, {
      x: c.x, y: c.y + c.size * 0.65, w: c.size, h: 0.35,
      fontSize: 9, fontFace: "Calibri", color: C.slate400,
      align: "center",
    });
  });

  // Growth stat
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 4.6, w: 9.0, h: 0.7,
    fill: { color: "111827" },
    rectRadius: 0.08,
  });
  s.addText("Home services market growing 18.9% CAGR — projected to reach $1.2T by 2030  (Grand View Research)", {
    x: 0.7, y: 4.6, w: 8.6, h: 0.7,
    fontSize: 12, fontFace: "Calibri", color: C.slate400,
    align: "center", valign: "middle",
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 9 — COMPETITIVE LANDSCAPE
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("Why Not Them?", {
    x: 0.6, y: 0.3, w: 5, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.slate900, bold: true, margin: 0,
  });

  // Comparison table
  const headers = ["", "Trovaar", "Angi", "Thumbtack", "TaskRabbit", "Nextdoor"];
  const rows = [
    ["Blind bidding (anti-discrimination)", "✅", "❌", "❌", "❌", "❌"],
    ["AI video job posting", "✅", "❌", "❌", "❌", "❌"],
    ["Competitive real-time bids", "✅", "❌", "✅", "❌", "❌"],
    ["No lead-gen fees for contractors", "✅", "❌", "❌", "✅", "✅"],
    ["Mobile + Web with Expo", "✅", "✅", "✅", "✅", "❌"],
    ["20% only on completed jobs", "✅", "❌", "❌", "✅", "❌"],
    ["Admin console with risk flags", "✅", "❌", "❌", "❌", "❌"],
    ["Subscription maintenance plans", "✅", "✅", "❌", "❌", "❌"],
  ];

  const colW = [2.8, 1.2, 1.0, 1.2, 1.2, 1.2];
  const tableData = [
    headers.map((h, i) => ({
      text: h,
      options: {
        fill: { color: i === 1 ? C.blue : C.slate900 },
        color: C.white,
        bold: true,
        fontSize: 10,
        align: "center",
        fontFace: "Calibri",
      },
    })),
    ...rows.map((row) =>
      row.map((cell, i) => ({
        text: cell,
        options: {
          fill: { color: i === 1 && cell === "✅" ? "EFF6FF" : C.white },
          color: cell === "✅" ? C.green : cell === "❌" ? C.red : C.slate700,
          fontSize: 10,
          align: i === 0 ? "left" : "center",
          fontFace: "Calibri",
        },
      }))
    ),
  ];

  s.addTable(tableData, {
    x: 0.5, y: 1.2, w: 8.6,
    colW,
    border: { pt: 0.5, color: C.slate300 },
    rowH: 0.4,
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 10 — ADMIN CONSOLE
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addText("Built to Scale", {
    x: 0.6, y: 0.3, w: 8, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.white, bold: true, margin: 0,
  });
  s.addText("Enterprise-grade admin console for managing thousands of users.", {
    x: 0.6, y: 0.95, w: 8, h: 0.4,
    fontSize: 14, fontFace: "Calibri", color: C.slate400,
  });

  const adminFeatures = [
    { icon: "👤", title: "People Management", desc: "View all users, contractors, clients. Suspend, approve IDs, manage strikes. Deep-dive detail drawer." },
    { icon: "💰", title: "Revenue Analytics", desc: "30-day charts, category breakdown, KPIs, conversion rates. Real-time platform earnings tracking." },
    { icon: "🏷️", title: "Category Management", desc: "Enable/disable services, edit labels, manage 80+ trade categories with admin overrides." },
    { icon: "⚠️", title: "Risk & Fraud Flags", desc: "12+ risk signals: suspended, unverified, high strikes, low rating, insurance pending. Auto-computed." },
    { icon: "📊", title: "CSV Export & Audit", desc: "Export any table. Full audit log with undo. Sort/filter every column. Bulk operations." },
    { icon: "🔔", title: "Dispute Resolution", desc: "Mediate between client and contractor. Partial refunds, strike system, suspension controls." },
  ];

  adminFeatures.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.1;
    const y = 1.6 + row * 1.7;

    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.9, h: 1.5,
      fill: { color: "111827" },
      rectRadius: 0.1,
    });
    s.addText(f.icon + "  " + f.title, {
      x: x + 0.15, y: y + 0.1, w: 2.6, h: 0.4,
      fontSize: 13, fontFace: "Calibri", color: C.white, bold: true,
    });
    s.addText(f.desc, {
      x: x + 0.15, y: y + 0.5, w: 2.6, h: 0.9,
      fontSize: 9, fontFace: "Calibri", color: C.slate400,
    });
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 11 — TRACTION
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.offWhite };

  s.addText("Current Traction", {
    x: 0.6, y: 0.3, w: 5, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.slate900, bold: true, margin: 0,
  });
  s.addText("MVP live and tested. Ready to scale.", {
    x: 0.6, y: 0.95, w: 8, h: 0.4,
    fontSize: 14, fontFace: "Calibri", color: C.slate500,
  });

  const metrics = [
    { value: "80+", label: "Trade Categories", color: C.blue },
    { value: "13", label: "Service Groups", color: C.purple },
    { value: "iOS + Android", label: "Mobile App Live", color: C.green },
    { value: "Full Stack", label: "Admin Console Built", color: C.amber },
  ];

  metrics.forEach((m, i) => {
    const x = 0.5 + i * 2.35;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.6, w: 2.15, h: 1.5,
      fill: { color: C.white },
      shadow: makeShadow(),
      rectRadius: 0.1,
    });
    s.addText(m.value, {
      x, y: 1.7, w: 2.15, h: 0.8,
      fontSize: 28, fontFace: "Arial Black", color: m.color,
      bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText(m.label, {
      x, y: 2.5, w: 2.15, h: 0.45,
      fontSize: 11, fontFace: "Calibri", color: C.slate500,
      align: "center",
    });
  });

  // Built features list
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 3.4, w: 9.0, h: 1.8,
    fill: { color: C.white },
    shadow: makeShadow(),
    rectRadius: 0.1,
  });
  s.addText("What's Built & Working", {
    x: 0.7, y: 3.5, w: 4, h: 0.4,
    fontSize: 14, fontFace: "Calibri", color: C.slate900, bold: true,
  });

  const built = [
    "User auth (email, phone, OAuth-ready)",
    "Job posting with AI video analysis",
    "Real-time competitive bidding",
    "Messaging between parties",
    "Contractor profiles & portfolios",
    "Phone verification (Twilio)",
    "Admin: users, revenue, categories",
    "Subscription plans (Home Health)",
    "Blind bidding / unbiased quotes",
    "Account number system",
    "Nearby contractors (geolocation)",
    "Email notifications (6 triggers)",
  ];

  built.forEach((item, i) => {
    const col = Math.floor(i / 4);
    const row = i % 4;
    s.addText("✅  " + item, {
      x: 0.7 + col * 3.0, y: 3.9 + row * 0.3, w: 2.9, h: 0.28,
      fontSize: 9, fontFace: "Calibri", color: C.slate700,
    });
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 12 — ROADMAP
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  s.addText("Roadmap", {
    x: 0.6, y: 0.3, w: 5, h: 0.7,
    fontSize: 36, fontFace: "Arial Black", color: C.white, bold: true, margin: 0,
  });

  const phases = [
    {
      phase: "Q2 2026", title: "Launch",
      items: ["Public beta launch", "Stripe payment integration", "Push notifications", "App Store + Play Store"],
      color: C.blueLight,
    },
    {
      phase: "Q3 2026", title: "Growth",
      items: ["10 metro areas", "Contractor verification pipeline", "Escrow / milestone payments", "Referral program"],
      color: C.green,
    },
    {
      phase: "Q4 2026", title: "Scale",
      items: ["PostgreSQL migration", "WebSocket messaging", "Background checks (Checkr)", "Advanced analytics"],
      color: C.purple,
    },
    {
      phase: "2027", title: "Expand",
      items: ["National rollout", "Commercial / B2B tier", "API marketplace", "International markets"],
      color: C.amber,
    },
  ];

  phases.forEach((p, i) => {
    const x = 0.4 + i * 2.4;
    // Card
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.3, w: 2.2, h: 3.8,
      fill: { color: "111827" },
      rectRadius: 0.12,
    });
    // Top accent
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.3, w: 2.2, h: 0.06,
      fill: { color: p.color },
    });
    // Phase label
    s.addText(p.phase, {
      x: x + 0.15, y: 1.5, w: 1.9, h: 0.35,
      fontSize: 11, fontFace: "Calibri", color: p.color, bold: true,
    });
    // Title
    s.addText(p.title, {
      x: x + 0.15, y: 1.85, w: 1.9, h: 0.4,
      fontSize: 18, fontFace: "Calibri", color: C.white, bold: true,
    });
    // Items
    s.addText(
      p.items.map((item, j) => ({
        text: item,
        options: { bullet: true, breakLine: j < p.items.length - 1, fontSize: 10, color: C.slate400 },
      })),
      {
        x: x + 0.15, y: 2.4, w: 1.9, h: 2.5,
        fontFace: "Calibri",
        paraSpaceAfter: 4,
      }
    );
  });
})();

// ════════════════════════════════════════════════════════════════
// SLIDE 13 — THE ASK
// ════════════════════════════════════════════════════════════════
(() => {
  const s = pres.addSlide();
  s.background = { color: C.navy };

  // Large centered content
  s.addText("Let's Build This Together", {
    x: 1, y: 0.8, w: 8, h: 0.8,
    fontSize: 40, fontFace: "Arial Black", color: C.white,
    bold: true, align: "center", margin: 0,
  });

  s.addText("Trovaar is ready to disrupt a $657B industry with fair pricing,\nAI-powered simplicity, and a platform built for everyone.", {
    x: 1.5, y: 1.7, w: 7, h: 0.8,
    fontSize: 14, fontFace: "Calibri", color: C.slate400,
    align: "center",
  });

  // What we need
  s.addShape(pres.shapes.RECTANGLE, {
    x: 1.5, y: 2.7, w: 7, h: 2.2,
    fill: { color: "111827" },
    rectRadius: 0.15,
    shadow: makeShadow(),
  });

  s.addText([
    { text: "🚀  Seed funding to launch in 3 metro areas", options: { breakLine: true, fontSize: 14, color: C.white } },
    { text: "", options: { breakLine: true, fontSize: 6 } },
    { text: "📱  Deploy to App Store + Play Store (app is built)", options: { breakLine: true, fontSize: 14, color: C.white } },
    { text: "", options: { breakLine: true, fontSize: 6 } },
    { text: "💳  Integrate Stripe payments & escrow", options: { breakLine: true, fontSize: 14, color: C.white } },
    { text: "", options: { breakLine: true, fontSize: 6 } },
    { text: "📈  Scale to 10,000 users in Year 1", options: { fontSize: 14, color: C.white } },
  ], {
    x: 2.2, y: 2.9, w: 5.5, h: 1.8,
    fontFace: "Calibri", valign: "top",
  });

  // Contact
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.1, w: 10, h: 0.525,
    fill: { color: C.blue },
  });
  s.addText("vishek23@gmail.com  |  trovaar.com  |  Patent Pending", {
    x: 0, y: 5.1, w: 10, h: 0.525,
    fontSize: 13, fontFace: "Calibri", color: C.white,
    align: "center", valign: "middle",
  });
})();

// ── Save ──
pres.writeFile({ fileName: "C:/Claude/ServiceRequest/Trovaar-Pitch-Deck.pptx" })
  .then(() => console.log("✅ Pitch deck saved: C:/Claude/ServiceRequest/Trovaar-Pitch-Deck.pptx"))
  .catch((err) => console.error("Error:", err));
