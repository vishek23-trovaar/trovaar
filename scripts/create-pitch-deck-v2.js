const pptxgen = require("pptxgenjs");
const http = require("http");
const fs = require("fs");
const path = require("path");

// ── Screenshot capture helper ──
function captureUrl(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    http.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(filePath); });
    }).on("error", (err) => { fs.unlink(filePath, () => {}); reject(err); });
  });
}

async function buildDeck() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = "Trovar";
  pres.title = "Trovar - Investor Pitch Deck 2026";

  // ── Brand Colors ──
  const C = {
    navy: "0A0F1E",
    navyMid: "111827",
    blue: "1E40AF",
    blueLight: "3B82F6",
    blueBright: "60A5FA",
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
    cyan: "0891B2",
  };

  const makeShadow = () => ({
    type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.18,
  });

  const makeLightShadow = () => ({
    type: "outer", color: "000000", blur: 4, offset: 2, angle: 135, opacity: 0.1,
  });

  // Helper: add page number footer
  function addFooter(slide, num, total) {
    slide.addText(`${num} / ${total}`, {
      x: 9.0, y: 5.3, w: 0.8, h: 0.3,
      fontSize: 8, color: C.slate500, align: "right", fontFace: "Calibri",
    });
  }

  // Helper: section title slide
  function addSectionTitle(slide, title, subtitle) {
    slide.background = { color: C.navy };
    slide.addText(title, {
      x: 0.5, y: 0.4, w: 9, h: 0.7,
      fontSize: 32, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });
    if (subtitle) {
      slide.addText(subtitle, {
        x: 0.5, y: 1.05, w: 8, h: 0.4,
        fontSize: 14, fontFace: "Calibri", color: C.slate400, margin: 0,
      });
    }
    // Accent line
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 1.5, w: 1.2, h: 0.06, fill: { color: C.blueLight },
    });
  }

  // Helper: stat box
  function addStatBox(slide, x, y, w, h, value, label, color) {
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w, h,
      fill: { color: C.navyMid },
      line: { color: color, width: 1.5 },
      shadow: makeLightShadow(),
    });
    slide.addText(value, {
      x, y: y + 0.15, w, h: 0.55,
      fontSize: 28, fontFace: "Arial", color: color,
      bold: true, align: "center", valign: "middle", margin: 0,
    });
    slide.addText(label, {
      x, y: y + 0.65, w, h: 0.35,
      fontSize: 10, fontFace: "Calibri", color: C.slate400,
      align: "center", valign: "middle", margin: 0,
    });
  }

  const TOTAL_SLIDES = 16;

  // ════════════════════════════════════════════════════════════════
  // SLIDE 1 — TITLE
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    s.background = { color: C.navy };

    // Grid pattern
    for (let i = 0; i < 10; i++) {
      s.addShape(pres.shapes.LINE, {
        x: i + 0.5, y: 0, w: 0, h: 5.625,
        line: { color: C.white, width: 0.3, transparency: 95 },
      });
    }

    // Logo icon
    s.addShape(pres.shapes.RECTANGLE, {
      x: 4.25, y: 0.6, w: 1.5, h: 1.5,
      fill: { color: C.blue },
      rectRadius: 0.3,
      shadow: makeShadow(),
    });
    s.addText("\u26A1", {
      x: 4.25, y: 0.6, w: 1.5, h: 1.5,
      fontSize: 48, align: "center", valign: "middle",
    });

    // Title
    s.addText("Trovar", {
      x: 0.5, y: 2.2, w: 9, h: 1.0,
      fontSize: 54, fontFace: "Arial Black", color: C.white,
      bold: true, align: "center", valign: "middle", margin: 0,
    });

    // Tagline
    s.addText("The network that connects every skilled trade to every job.", {
      x: 1.5, y: 3.15, w: 7, h: 0.6,
      fontSize: 18, fontFace: "Calibri", color: C.slate400,
      align: "center", valign: "middle",
    });

    // Subtitle
    s.addText("Connect Any Skill to Any Trade", {
      x: 2, y: 3.7, w: 6, h: 0.5,
      fontSize: 14, fontFace: "Calibri", color: C.blueLight,
      align: "center", valign: "middle", italic: true,
    });

    // Bottom bar
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 5.2, w: 10, h: 0.425,
      fill: { color: C.blue },
    });
    s.addText("Investor Pitch  |  March 2026", {
      x: 0, y: 5.2, w: 10, h: 0.425,
      fontSize: 11, fontFace: "Calibri", color: C.white,
      align: "center", valign: "middle",
    });
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 2 — THE PROBLEM (BOTH SIDES)
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "The Problem", "Two real stories from both sides of the marketplace");

    // Consumer story card (left)
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 1.8, w: 4.3, h: 2.0,
      fill: { color: C.navyMid },
      line: { color: C.red, width: 1 },
      shadow: makeShadow(),
    });

    s.addText("\u{1F474}  The Consumer", {
      x: 0.7, y: 1.85, w: 3.9, h: 0.4,
      fontSize: 14, fontFace: "Arial", color: C.red, bold: true, margin: 0,
    });

    s.addText([
      { text: '"My 86-year-old neighbor was quoted $1,800 to snake a simple drain. She didn\'t know any better. She paid it."\n\n', options: { fontSize: 11, color: C.white, italic: true, breakLine: true } },
      { text: 'The fair price? About $175.', options: { fontSize: 12, color: C.red, bold: true } },
    ], {
      x: 0.7, y: 2.3, w: 3.9, h: 1.4,
      fontFace: "Calibri", valign: "top", margin: 0,
    });

    // Contractor story card (right)
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.2, y: 1.8, w: 4.3, h: 2.0,
      fill: { color: C.navyMid },
      line: { color: C.amber, width: 1 },
      shadow: makeShadow(),
    });

    s.addText("\u{1F477}  The Contractor", {
      x: 5.4, y: 1.85, w: 3.9, h: 0.4,
      fontSize: 14, fontFace: "Arial", color: C.amber, bold: true, margin: 0,
    });

    s.addText([
      { text: '"I do all the work \u2014 the driving, the labor, the late nights \u2014 and my company keeps 85% of what the customer pays."\n\n', options: { fontSize: 11, color: C.white, italic: true, breakLine: true } },
      { text: 'Skilled tradespeople deserve to keep what they earn.', options: { fontSize: 12, color: C.amber, bold: true } },
    ], {
      x: 5.4, y: 2.3, w: 3.9, h: 1.4,
      fontFace: "Calibri", valign: "top", margin: 0,
    });

    // Purpose / Mission banner
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 3.95, w: 9, h: 1.0,
      fill: { color: C.blue },
      shadow: makeShadow(),
    });
    s.addText("\u26A1  Our Purpose", {
      x: 0.7, y: 3.98, w: 8.6, h: 0.35,
      fontSize: 14, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });
    s.addText("Connecting every skill to a trade. Trovar is the networking platform for services \u2014 where skilled professionals find work on their own terms and customers get fair, transparent pricing. Payments are held in escrow until the job is done and confirmed by both sides. One app that finally works for everyone.", {
      x: 0.7, y: 4.32, w: 8.6, h: 0.55,
      fontSize: 11, fontFace: "Calibri", color: C.blueBright, margin: 0,
    });

    // Bottom stat boxes
    addStatBox(s, 0.5, 5.1, 2.15, 0.45, "10x", "", C.red);
    s.addText("10x price variance", { x: 0.5, y: 5.1, w: 2.15, h: 0.45, fontSize: 9, fontFace: "Calibri", color: C.red, align: "center", valign: "middle", margin: 0 });

    addStatBox(s, 2.85, 5.1, 2.15, 0.45, "~85%", "", C.amber);
    s.addText("~85% taken by corps", { x: 2.85, y: 5.1, w: 2.15, h: 0.45, fontSize: 9, fontFace: "Calibri", color: C.amber, align: "center", valign: "middle", margin: 0 });

    addStatBox(s, 5.2, 5.1, 2.15, 0.45, "67%", "", C.purple);
    s.addText("67% consumers overpay", { x: 5.2, y: 5.1, w: 2.15, h: 0.45, fontSize: 9, fontFace: "Calibri", color: C.purple, align: "center", valign: "middle", margin: 0 });

    addStatBox(s, 7.55, 5.1, 2.15, 0.45, "0", "", C.slate400);
    s.addText("0 fair platforms", { x: 7.55, y: 5.1, w: 2.15, h: 0.45, fontSize: 9, fontFace: "Calibri", color: C.slate400, align: "center", valign: "middle", margin: 0 });

    addFooter(s, 2, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 3 — THE BROKEN SYSTEM (LEAD GEN)
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "The System is Broken", "For BOTH sides of the marketplace");

    // Consumer pain
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 1.8, w: 4.3, h: 3.2,
      fill: { color: C.navyMid },
      shadow: makeLightShadow(),
    });
    s.addText("\u{1F62B}  Consumer Pain", {
      x: 0.8, y: 1.9, w: 3.7, h: 0.5,
      fontSize: 16, fontFace: "Arial", color: C.red, bold: true, margin: 0,
    });
    s.addText([
      { text: "\u2022  Describe problem 5+ times to different companies\n", options: { breakLine: true } },
      { text: "\u2022  Endless spam calls from lead-gen sites\n", options: { breakLine: true } },
      { text: "\u2022  No price transparency until in-home visit\n", options: { breakLine: true } },
      { text: "\u2022  Seniors & women routinely overcharged\n", options: { breakLine: true } },
      { text: "\u2022  No way to compare bids side-by-side", options: {} },
    ], {
      x: 0.8, y: 2.5, w: 3.7, h: 2.2,
      fontSize: 11, fontFace: "Calibri", color: C.slate300, lineSpacingMultiple: 1.5, margin: 0,
    });

    // Contractor pain
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.2, y: 1.8, w: 4.3, h: 3.2,
      fill: { color: C.navyMid },
      shadow: makeLightShadow(),
    });
    s.addText("\u{1F4B8}  Contractor Pain", {
      x: 5.5, y: 1.9, w: 3.7, h: 0.5,
      fontSize: 16, fontFace: "Arial", color: C.amber, bold: true, margin: 0,
    });
    s.addText([
      { text: "\u2022  Corporations take ~85% of what customers pay\n", options: { breakLine: true, color: C.amber, bold: true } },
      { text: "\u2022  No freedom to set own prices or schedule\n", options: { breakLine: true } },
      { text: "\u2022  Pay $15\u201350 per lead on Angi/Thumbtack\n", options: { breakLine: true } },
      { text: "\u2022  Leads shared with 5\u20138 other contractors\n", options: { breakLine: true } },
      { text: "\u2022  Monthly subscriptions even when no work\n", options: { breakLine: true } },
      { text: "\u2022  Can\u2019t build their own reputation or brand", options: {} },
    ], {
      x: 5.5, y: 2.5, w: 3.7, h: 2.5,
      fontSize: 11, fontFace: "Calibri", color: C.slate300, lineSpacingMultiple: 1.4, margin: 0,
    });

    // Trovar advantage banner at bottom
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 5.1, w: 9, h: 0.45,
      fill: { color: C.blue },
    });
    s.addText("\u26A1  Trovar: Contractors keep 100% of their bid. Work for yourself. Set your own prices. Build YOUR reputation.", {
      x: 0.5, y: 5.1, w: 9, h: 0.45,
      fontSize: 11, fontFace: "Calibri", color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
    });

    addFooter(s, 3, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 4 — THE SOLUTION
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Our Solution", "A true marketplace \u2014 not a lead-gen machine");

    const features = [
      { icon: "\u{1F4F1}", title: "Post Once", desc: "Describe the job once. No repeating yourself to 10 companies. AI does the heavy lifting.", color: C.blueLight },
      { icon: "\u{1F512}", title: "Unbiased Bidding", desc: "Your identity stays hidden. Bids are based on the JOB, not who you are. Fair pricing for everyone.", color: C.purple },
      { icon: "\u{1F4B0}", title: "Escrow Payments", desc: "Money is held securely until the job is completed and BOTH parties confirm satisfaction. Trust built in.", color: C.green },
      { icon: "\u{1F4AA}", title: "Be Your Own Boss", desc: "Contractors keep 100% of their bid. Set your own prices, choose your hours, build YOUR reputation.", color: C.amber },
    ];

    features.forEach((f, i) => {
      const x = 0.5 + i * 2.3;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.8, w: 2.1, h: 3.2,
        fill: { color: C.navyMid },
        shadow: makeLightShadow(),
      });
      s.addText(f.icon, { x, y: 1.95, w: 2.1, h: 0.7, fontSize: 32, align: "center" });
      s.addText(f.title, {
        x: x + 0.15, y: 2.65, w: 1.8, h: 0.4,
        fontSize: 14, fontFace: "Arial", color: f.color, bold: true, align: "center", margin: 0,
      });
      s.addText(f.desc, {
        x: x + 0.15, y: 3.1, w: 1.8, h: 1.5,
        fontSize: 10, fontFace: "Calibri", color: C.slate300, align: "center", margin: 0,
      });
    });

    addFooter(s, 4, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 5 — AI-POWERED JOB POSTING
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "AI-Powered Job Posting", "Snap. Speak. Done. Our AI handles the rest.");

    const steps = [
      { num: "01", title: "Record Video", desc: "Point your phone at the issue. Our app captures video + audio.", color: C.blueLight },
      { num: "02", title: "AI Analyzes", desc: "Gemini AI identifies the problem, category, urgency, and creates the listing.", color: C.purple },
      { num: "03", title: "Pros Get Notified", desc: "Matching contractors in your area receive the job instantly.", color: C.green },
      { num: "04", title: "Bids Roll In", desc: "Compare competing bids. Accept the best one. Done.", color: C.amber },
    ];

    steps.forEach((step, i) => {
      const y = 1.8 + i * 0.9;
      s.addText(step.num, {
        x: 0.5, y, w: 0.8, h: 0.7,
        fontSize: 22, fontFace: "Arial", color: step.color, bold: true, align: "center", valign: "middle", margin: 0,
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: 1.4, y, w: 8.1, h: 0.7,
        fill: { color: C.navyMid },
        shadow: makeLightShadow(),
      });
      s.addText(step.title, {
        x: 1.6, y, w: 2.2, h: 0.7,
        fontSize: 14, fontFace: "Arial", color: C.white, bold: true, valign: "middle", margin: 0,
      });
      s.addText(step.desc, {
        x: 3.8, y, w: 5.5, h: 0.7,
        fontSize: 11, fontFace: "Calibri", color: C.slate400, valign: "middle", margin: 0,
      });
    });

    addFooter(s, 5, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 6 — PRODUCT: WEB PLATFORM (SCREENSHOT)
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "The Web Platform", "Live at trovar.com \u2014 fully functional marketplace");

    // Screenshot placeholder with border
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y: 1.7, w: 5.0, h: 3.4,
      fill: { color: C.navyMid },
      line: { color: C.slate700, width: 1 },
      shadow: makeShadow(),
    });
    s.addText("\u{1F310}  Homepage", {
      x: 0.5, y: 1.8, w: 4.8, h: 0.4,
      fontSize: 11, fontFace: "Calibri", color: C.blueLight, margin: 0,
    });
    // Simulated browser content
    s.addText([
      { text: "The network that connects\n", options: { fontSize: 14, color: C.white, bold: true, breakLine: true } },
      { text: "every skilled trade to every job.\n\n", options: { fontSize: 14, color: C.blueLight, bold: true, breakLine: true } },
      { text: "Post a job \u2192 Pros compete \u2192 You choose\n", options: { fontSize: 10, color: C.slate400, breakLine: true } },
      { text: "\nOAuth: Google, Apple, Facebook", options: { fontSize: 9, color: C.slate500 } },
    ], {
      x: 0.7, y: 2.3, w: 4.4, h: 2.5,
      fontFace: "Calibri", valign: "top", margin: 0,
    });

    // Feature bullets on right
    const features = [
      { icon: "\u2705", text: "OAuth signup (Google, Apple, Facebook)" },
      { icon: "\u2705", text: "Dual-role: Consumer & Contractor accounts" },
      { icon: "\u2705", text: "Real-time bidding with blind identity" },
      { icon: "\u2705", text: "In-app messaging between parties" },
      { icon: "\u2705", text: "Escrow payments \u2014 released after both confirm" },
      { icon: "\u2705", text: "20% platform markup built into price" },
      { icon: "\u2705", text: "Review & rating system" },
      { icon: "\u2705", text: "Admin console with 15 analytics modules" },
    ];

    features.forEach((f, i) => {
      s.addText(`${f.icon}  ${f.text}`, {
        x: 5.6, y: 1.8 + i * 0.42, w: 4.2, h: 0.38,
        fontSize: 11, fontFace: "Calibri", color: C.slate300, valign: "middle", margin: 0,
      });
    });

    addFooter(s, 6, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 7 — PRODUCT: MOBILE APP (SCREENSHOT)
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Mobile App", "iOS & Android \u2014 built with React Native / Expo");

    // Phone mockup - Client
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y: 1.7, w: 2.6, h: 3.5,
      fill: { color: C.navyMid },
      line: { color: C.slate700, width: 2 },
      rectRadius: 0.2,
      shadow: makeShadow(),
    });
    s.addText("\u{1F4F1} Client Dashboard", {
      x: 0.7, y: 1.85, w: 2.4, h: 0.35,
      fontSize: 10, fontFace: "Calibri", color: C.blueLight, bold: true, align: "center", margin: 0,
    });
    s.addText([
      { text: "\u{1F44B} Good morning, Vishal\n\n", options: { fontSize: 9, color: C.white, breakLine: true } },
      { text: "3 Awaiting  |  1 In Progress  |  5 Done\n\n", options: { fontSize: 8, color: C.slate400, breakLine: true } },
      { text: "\u{1F4DD} Post Job   \u{1F4AC} Messages\n", options: { fontSize: 9, color: C.blueLight, breakLine: true } },
      { text: "\u{1F464} Profile     \u2753 Support", options: { fontSize: 9, color: C.blueLight } },
    ], {
      x: 0.7, y: 2.3, w: 2.4, h: 2.5,
      fontFace: "Calibri", valign: "top", align: "center", margin: 0,
    });

    // Phone mockup - Contractor
    s.addShape(pres.shapes.RECTANGLE, {
      x: 3.7, y: 1.7, w: 2.6, h: 3.5,
      fill: { color: C.navyMid },
      line: { color: C.slate700, width: 2 },
      rectRadius: 0.2,
      shadow: makeShadow(),
    });
    s.addText("\u{1F4F1} Contractor Dashboard", {
      x: 3.8, y: 1.85, w: 2.4, h: 0.35,
      fontSize: 10, fontFace: "Calibri", color: C.green, bold: true, align: "center", margin: 0,
    });
    s.addText([
      { text: "\u{1F50D} Find Jobs\n\n", options: { fontSize: 10, color: C.white, bold: true, breakLine: true } },
      { text: "Plumbing | Electrical | HVAC\n", options: { fontSize: 8, color: C.slate400, breakLine: true } },
      { text: "Landscaping | Auto | General\n\n", options: { fontSize: 8, color: C.slate400, breakLine: true } },
      { text: "\u{1F525} 12 jobs near you\n", options: { fontSize: 9, color: C.amber, breakLine: true } },
      { text: "Sort: Newest | Urgent | Budget", options: { fontSize: 8, color: C.slate500 } },
    ], {
      x: 3.8, y: 2.3, w: 2.4, h: 2.5,
      fontFace: "Calibri", valign: "top", align: "center", margin: 0,
    });

    // Feature list
    const mobileFeatures = [
      "Uber-quality onboarding flow",
      "AI video job posting (Gemini)",
      "Real-time push notifications",
      "Secure token auth (SecureStore)",
      "Pull-to-refresh + skeleton loading",
      "Animated urgency badges",
      "Full bidding & messaging",
    ];

    s.addText("Key Mobile Features", {
      x: 6.8, y: 1.8, w: 3, h: 0.4,
      fontSize: 14, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });

    mobileFeatures.forEach((f, i) => {
      s.addText(`\u25B8  ${f}`, {
        x: 6.8, y: 2.3 + i * 0.38, w: 3, h: 0.35,
        fontSize: 10, fontFace: "Calibri", color: C.slate300, valign: "middle", margin: 0,
      });
    });

    addFooter(s, 7, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 8 — ADMIN CONSOLE (SCREENSHOT)
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Admin Console", "Full operational control \u2014 15 management modules");

    // Admin dashboard mockup
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y: 1.7, w: 5.2, h: 3.5,
      fill: { color: C.navyMid },
      line: { color: C.slate700, width: 1 },
      shadow: makeShadow(),
    });

    // Sidebar
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y: 1.7, w: 1.4, h: 3.5,
      fill: { color: "0D1321" },
    });
    const navItems = ["Dashboard", "Users", "Consumers", "Contractors", "Jobs", "Revenue", "Analytics"];
    navItems.forEach((item, i) => {
      s.addText(item, {
        x: 0.5, y: 1.85 + i * 0.4, w: 1.2, h: 0.35,
        fontSize: 7, fontFace: "Calibri", color: i === 0 ? C.blueLight : C.slate500,
        valign: "middle", margin: 0,
      });
    });

    // Main content
    s.addText("Dashboard", {
      x: 2.0, y: 1.85, w: 3.4, h: 0.4,
      fontSize: 14, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });

    // Stats grid
    const stats = [
      { val: "32", label: "Users", color: C.blueLight },
      { val: "30", label: "Contractors", color: C.purple },
      { val: "75", label: "Total Jobs", color: C.green },
      { val: "$189", label: "Revenue", color: C.amber },
    ];
    stats.forEach((st, i) => {
      const sx = 2.0 + (i % 2) * 1.7;
      const sy = 2.4 + Math.floor(i / 2) * 1.1;
      s.addShape(pres.shapes.RECTANGLE, {
        x: sx, y: sy, w: 1.5, h: 0.9,
        fill: { color: C.navy },
        line: { color: st.color, width: 0.8 },
      });
      s.addText(st.val, {
        x: sx, y: sy + 0.05, w: 1.5, h: 0.5,
        fontSize: 16, fontFace: "Arial", color: st.color, bold: true, align: "center", margin: 0,
      });
      s.addText(st.label, {
        x: sx, y: sy + 0.55, w: 1.5, h: 0.3,
        fontSize: 8, fontFace: "Calibri", color: C.slate400, align: "center", margin: 0,
      });
    });

    // Module list on right
    s.addText("15 Management Modules", {
      x: 5.9, y: 1.8, w: 3.8, h: 0.4,
      fontSize: 14, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });

    const modules = [
      ["\u{1F4CA} Dashboard", "\u{1F465} All Users", "\u{1F64B} Consumers"],
      ["\u{1F527} Contractors", "\u{1F4CB} Jobs", "\u{1F4B0} Revenue"],
      ["\u{1F4CA} Analytics", "\u{1F3F7} Categories", "\u2705 Verifications"],
      ["\u2696\uFE0F Disputes", "\u{1F4DD} Audit Log", "\u{1F514} Notifications"],
      ["\u{1F3A7} Support", "\u{1F504} Subscriptions", "\u{1F4F1} Mobile App"],
    ];

    modules.forEach((row, ri) => {
      row.forEach((mod, ci) => {
        s.addText(mod, {
          x: 5.9 + ci * 1.35, y: 2.35 + ri * 0.55, w: 1.3, h: 0.45,
          fontSize: 8, fontFace: "Calibri", color: C.slate300, valign: "middle", margin: 0,
        });
      });
    });

    // Analytics highlight
    s.addShape(pres.shapes.RECTANGLE, {
      x: 5.9, y: 4.3, w: 3.8, h: 0.8,
      fill: { color: C.navyMid },
      line: { color: C.green, width: 1 },
    });
    s.addText("Job Conversion Funnel: 75 Posted \u2192 32 Bids \u2192 37 Accepted \u2192 26 Paid (35%)", {
      x: 6.0, y: 4.35, w: 3.6, h: 0.7,
      fontSize: 9, fontFace: "Calibri", color: C.greenLight, valign: "middle", margin: 0,
    });

    addFooter(s, 8, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 9 — UNBIASED BIDDING (DIFFERENTIATOR)
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Unbiased Bidding", "Our key differentiator \u2014 fair pricing for everyone");

    // How it works
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 1.8, w: 9, h: 1.6,
      fill: { color: C.navyMid },
      shadow: makeLightShadow(),
    });

    s.addText("How Blind Bidding Works", {
      x: 0.7, y: 1.9, w: 8.6, h: 0.4,
      fontSize: 16, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });

    const steps = [
      { num: "1", text: "Customer posts job", sub: "Photos + description only" },
      { num: "2", text: "Pros see the JOB", sub: "Not the person" },
      { num: "3", text: "Bids based on work", sub: "Fair market price" },
      { num: "4", text: "Customer reveals ID", sub: "Only after accepting" },
    ];

    steps.forEach((step, i) => {
      const x = 0.7 + i * 2.25;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 2.4, w: 0.4, h: 0.4,
        fill: { color: C.blue },
      });
      s.addText(step.num, {
        x, y: 2.4, w: 0.4, h: 0.4,
        fontSize: 14, fontFace: "Arial", color: C.white, bold: true, align: "center", valign: "middle", margin: 0,
      });
      s.addText(step.text, {
        x: x + 0.5, y: 2.35, w: 1.6, h: 0.25,
        fontSize: 11, fontFace: "Calibri", color: C.white, bold: true, margin: 0,
      });
      s.addText(step.sub, {
        x: x + 0.5, y: 2.6, w: 1.6, h: 0.25,
        fontSize: 9, fontFace: "Calibri", color: C.slate400, margin: 0,
      });
    });

    // Who benefits
    const beneficiaries = [
      { emoji: "\u{1F474}", group: "Seniors", desc: "No more price gouging based on perceived vulnerability", color: C.red },
      { emoji: "\u{1F469}", group: "Women", desc: "Fair pricing regardless of gender \u2014 every quote is merit-based", color: C.purple },
      { emoji: "\u{1F30D}", group: "Minorities", desc: "Eliminates discrimination \u2014 bids reflect the job, not the person", color: C.cyan },
      { emoji: "\u{1F477}", group: "New Contractors", desc: "Compete on quality and price, not just reputation and connections", color: C.green },
    ];

    beneficiaries.forEach((b, i) => {
      const x = 0.5 + i * 2.3;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 3.65, w: 2.1, h: 1.6,
        fill: { color: C.navyMid },
        line: { color: b.color, width: 1 },
      });
      s.addText(b.emoji, { x, y: 3.7, w: 2.1, h: 0.5, fontSize: 24, align: "center" });
      s.addText(b.group, {
        x: x + 0.1, y: 4.15, w: 1.9, h: 0.3,
        fontSize: 12, fontFace: "Arial", color: b.color, bold: true, align: "center", margin: 0,
      });
      s.addText(b.desc, {
        x: x + 0.1, y: 4.45, w: 1.9, h: 0.65,
        fontSize: 8, fontFace: "Calibri", color: C.slate400, align: "center", margin: 0,
      });
    });

    addFooter(s, 9, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 10 — REVENUE MODEL
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Revenue Model", "Simple, scalable, and aligned with marketplace success");

    // Main revenue box
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 1.8, w: 9, h: 1.4,
      fill: { color: C.navyMid },
      line: { color: C.green, width: 2 },
      shadow: makeShadow(),
    });

    s.addText("20%", {
      x: 0.8, y: 1.9, w: 1.5, h: 1.2,
      fontSize: 42, fontFace: "Arial", color: C.green, bold: true, align: "center", valign: "middle", margin: 0,
    });

    s.addText([
      { text: "Platform Markup on Every Transaction\n", options: { fontSize: 16, color: C.white, bold: true, breakLine: true } },
      { text: "Built into the price. Customer pays total. Contractor receives their bid amount. Trovar keeps 20%.\n", options: { fontSize: 11, color: C.slate400, breakLine: true } },
      { text: "No subscriptions. No lead fees. We only make money when work gets done.", options: { fontSize: 11, color: C.greenLight, italic: true } },
    ], {
      x: 2.5, y: 1.9, w: 6.8, h: 1.2,
      fontFace: "Calibri", valign: "middle", margin: 0,
    });

    // Escrow box
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 3.35, w: 9, h: 0.95,
      fill: { color: C.navyMid },
      line: { color: C.blueLight, width: 1.5 },
      shadow: makeLightShadow(),
    });
    s.addText("\u{1F512}  Escrow-Protected Payments", {
      x: 0.7, y: 3.38, w: 8.6, h: 0.35,
      fontSize: 13, fontFace: "Arial", color: C.blueLight, bold: true, margin: 0,
    });
    s.addText("When a customer accepts a bid, the full payment is held in escrow. The contractor completes the work. Money is only released after BOTH the customer and contractor confirm the job is done. Both sides are protected \u2014 no chargebacks, no ghosting, no disputes.", {
      x: 0.7, y: 3.72, w: 8.6, h: 0.5,
      fontSize: 10, fontFace: "Calibri", color: C.slate300, margin: 0,
    });

    // Revenue example
    s.addText("Example Transaction", {
      x: 0.5, y: 4.45, w: 3.5, h: 0.35,
      fontSize: 13, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });

    const txnRows = [
      { label: "Contractor bids:", value: "$400", color: C.white },
      { label: "Held in escrow:", value: "$480", color: C.blueLight },
      { label: "Both confirm \u2192 Released:", value: "$400 to pro", color: C.green },
      { label: "Trovar keeps:", value: "$80", color: C.amber },
    ];

    txnRows.forEach((r, i) => {
      s.addText(r.label, {
        x: 0.5, y: 4.85 + i * 0.2, w: 2.8, h: 0.2,
        fontSize: 10, fontFace: "Calibri", color: C.slate300, margin: 0, valign: "middle",
      });
      s.addText(r.value, {
        x: 3.3, y: 4.85 + i * 0.2, w: 1.5, h: 0.2,
        fontSize: 11, fontFace: "Arial", color: r.color, bold: true, margin: 0, valign: "middle",
      });
    });

    // Future revenue
    s.addText("Future Revenue Streams", {
      x: 5.5, y: 3.5, w: 4, h: 0.4,
      fontSize: 14, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });

    const future = [
      "\u{1F451}  Pro Verified badge (\u2014 premium tier)",
      "\u{1F4E3}  Promoted listings for contractors",
      "\u{1F4B3}  Instant pay (fee for same-day payouts)",
      "\u{1F4CA}  Business analytics dashboard (SaaS)",
      "\u{1F6E1}  Protection plans (warranty upsells)",
    ];

    future.forEach((f, i) => {
      s.addText(f, {
        x: 5.5, y: 4.0 + i * 0.35, w: 4.2, h: 0.3,
        fontSize: 10, fontFace: "Calibri", color: C.slate300, valign: "middle", margin: 0,
      });
    });

    addFooter(s, 10, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 11 — MARKET SIZE
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Market Opportunity", "Massive TAM with clear path to capture");

    addStatBox(s, 0.5, 1.8, 2.8, 1.2, "$657B", "Total Addressable Market\nUS Home Services 2026", C.blueLight);
    addStatBox(s, 3.6, 1.8, 2.8, 1.2, "$120B", "Serviceable Addressable\nTrades + Repair", C.green);
    addStatBox(s, 6.7, 1.8, 2.8, 1.2, "$4.8B", "Serviceable Obtainable\nYear 5 Target", C.amber);

    // Growth drivers
    s.addText("Why Now?", {
      x: 0.5, y: 3.3, w: 9, h: 0.5,
      fontSize: 18, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });

    const drivers = [
      { icon: "\u{1F4F1}", text: "Smartphone-first generation now homeowners", desc: "Millennials expect app-based services for everything" },
      { icon: "\u{1F916}", text: "AI makes job posting effortless", desc: "Video-to-listing in 30 seconds vs. 10-minute forms" },
      { icon: "\u{1F4B8}", text: "Lead-gen fatigue at all-time high", desc: "Angi/Thumbtack churn rates exceed 40% annually" },
      { icon: "\u{1F3E0}", text: "Aging housing stock = more repairs", desc: "Average US home age: 40 years. Maintenance demand rising." },
    ];

    drivers.forEach((d, i) => {
      const y = 3.9 + i * 0.45;
      s.addText(`${d.icon}  ${d.text}`, {
        x: 0.5, y, w: 4.5, h: 0.4,
        fontSize: 11, fontFace: "Calibri", color: C.white, bold: true, valign: "middle", margin: 0,
      });
      s.addText(d.desc, {
        x: 5.0, y, w: 4.5, h: 0.4,
        fontSize: 10, fontFace: "Calibri", color: C.slate400, valign: "middle", margin: 0,
      });
    });

    addFooter(s, 11, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 12 — COMPETITIVE LANDSCAPE
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Competitive Landscape", "We win where the incumbents fail");

    // Table headers
    const headers = ["Feature", "Trovar", "Angi", "Thumbtack", "TaskRabbit"];
    const headerColors = [C.slate400, C.green, C.slate500, C.slate500, C.slate500];

    headers.forEach((h, i) => {
      const x = 0.5 + i * 1.9;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.8, w: 1.7, h: 0.5,
        fill: { color: i === 1 ? C.blue : C.navyMid },
      });
      s.addText(h, {
        x, y: 1.8, w: 1.7, h: 0.5,
        fontSize: 11, fontFace: "Arial", color: i === 1 ? C.white : headerColors[i],
        bold: true, align: "center", valign: "middle", margin: 0,
      });
    });

    const rows = [
      ["Blind bidding", "\u2705", "\u274C", "\u274C", "\u274C"],
      ["AI job posting", "\u2705", "\u274C", "\u274C", "\u274C"],
      ["Escrow payments", "\u2705", "\u274C", "\u274C", "\u{1F7E1}"],
      ["No lead fees", "\u2705", "\u274C", "\u274C", "\u2705"],
      ["No subscription", "\u2705", "\u274C", "\u274C", "\u2705"],
      ["Mobile app", "\u2705", "\u2705", "\u2705", "\u2705"],
      ["Video posting", "\u2705", "\u274C", "\u274C", "\u274C"],
      ["Price transparency", "\u2705", "\u274C", "\u{1F7E1}", "\u2705"],
      ["Identity protection", "\u2705", "\u274C", "\u274C", "\u274C"],
    ];

    rows.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const x = 0.5 + ci * 1.9;
        const y = 2.35 + ri * 0.36;
        const bgColor = ci === 1 ? "0B1A3A" : (ri % 2 === 0 ? C.navyMid : C.navy);
        s.addShape(pres.shapes.RECTANGLE, {
          x, y, w: 1.7, h: 0.34,
          fill: { color: bgColor },
        });
        s.addText(cell, {
          x, y, w: 1.7, h: 0.34,
          fontSize: ci === 0 ? 9 : 12,
          fontFace: "Calibri",
          color: ci === 0 ? C.slate300 : C.white,
          align: "center", valign: "middle", margin: 0,
        });
      });
    });

    addFooter(s, 12, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 13 — TECH STACK
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Built to Scale", "Modern tech stack, production-ready architecture");

    const layers = [
      { title: "Frontend", items: "Next.js 15 \u2022 React 18 \u2022 Tailwind CSS \u2022 TypeScript", color: C.blueLight },
      { title: "Mobile", items: "React Native \u2022 Expo SDK 54 \u2022 Expo Router \u2022 SecureStore", color: C.purple },
      { title: "Backend", items: "Next.js API Routes \u2022 JWT Auth \u2022 bcrypt \u2022 CORS Middleware", color: C.green },
      { title: "AI", items: "Google Gemini 1.5 Pro \u2022 Multimodal Video Analysis \u2022 Auto-Classification", color: C.amber },
      { title: "Database", items: "SQLite (dev) \u2192 PostgreSQL + Prisma (production)", color: C.cyan },
      { title: "Payments", items: "Stripe Connect \u2022 20% Markup \u2022 Escrow (dual-confirmation release) \u2022 Instant Payouts", color: C.red },
    ];

    layers.forEach((layer, i) => {
      const y = 1.8 + i * 0.6;
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.5, y, w: 9, h: 0.5,
        fill: { color: C.navyMid },
        line: { color: layer.color, width: 0.5 },
      });
      s.addShape(pres.shapes.RECTANGLE, {
        x: 0.5, y, w: 0.06, h: 0.5,
        fill: { color: layer.color },
      });
      s.addText(layer.title, {
        x: 0.8, y, w: 1.5, h: 0.5,
        fontSize: 12, fontFace: "Arial", color: layer.color, bold: true, valign: "middle", margin: 0,
      });
      s.addText(layer.items, {
        x: 2.5, y, w: 6.8, h: 0.5,
        fontSize: 10, fontFace: "Calibri", color: C.slate300, valign: "middle", margin: 0,
      });
    });

    // Deployment plan
    s.addText("Production Deployment Plan", {
      x: 0.5, y: 4.6, w: 9, h: 0.4,
      fontSize: 14, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });
    s.addText("Vercel (web) + EAS Build (mobile) + Supabase/RDS (database) + Stripe Connect (payments) + CloudFlare CDN", {
      x: 0.5, y: 5.0, w: 9, h: 0.3,
      fontSize: 10, fontFace: "Calibri", color: C.slate400, margin: 0,
    });

    addFooter(s, 13, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 14 — TRACTION
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Traction & Metrics", "Built and validated \u2014 real users, real data");

    // Live platform stats
    const metrics = [
      { val: "62", label: "Registered Users", color: C.blueLight },
      { val: "75", label: "Jobs Posted", color: C.green },
      { val: "26", label: "Accepted Bids", color: C.purple },
      { val: "$189", label: "Platform Revenue", color: C.amber },
      { val: "35%", label: "Conversion Rate", color: C.cyan },
      { val: "40%", label: "Bid Acceptance Rate", color: C.greenLight },
    ];

    metrics.forEach((m, i) => {
      const x = 0.5 + (i % 3) * 3.1;
      const y = 1.8 + Math.floor(i / 3) * 1.3;
      addStatBox(s, x, y, 2.8, 1.1, m.val, m.label, m.color);
    });

    // Milestones
    s.addText("Development Milestones", {
      x: 0.5, y: 4.5, w: 9, h: 0.4,
      fontSize: 14, fontFace: "Arial", color: C.white, bold: true, margin: 0,
    });

    const milestones = [
      "\u2705 Full web platform live (100+ API endpoints)",
      "\u2705 React Native mobile app (iOS + Android)",
      "\u2705 AI-powered job posting via video",
      "\u2705 Admin console with 15 modules",
      "\u2705 Blind bidding system operational",
    ];

    milestones.forEach((m, i) => {
      s.addText(m, {
        x: 0.5 + (i < 3 ? 0 : 4.5), y: 4.95 + (i % 3) * 0.25, w: 4.5, h: 0.22,
        fontSize: 9, fontFace: "Calibri", color: C.slate300, valign: "middle", margin: 0,
      });
    });

    addFooter(s, 14, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 15 — ROADMAP
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    addSectionTitle(s, "Roadmap", "From MVP to market leader");

    const phases = [
      {
        q: "Q2 2026", title: "Launch", color: C.blueLight,
        items: ["App Store + Play Store launch", "First 500 users in 3 target cities", "Stripe Connect live payments", "Utility patent filing"],
      },
      {
        q: "Q3-Q4 2026", title: "Growth", color: C.green,
        items: ["Expand to 10 cities", "Push notifications + SMS alerts", "Contractor verification system", "5,000 users milestone"],
      },
      {
        q: "2027", title: "Scale", color: C.purple,
        items: ["Nationwide rollout", "Premium contractor tier", "Business analytics dashboard", "50,000 users target"],
      },
      {
        q: "2028+", title: "Dominate", color: C.amber,
        items: ["Commercial services vertical", "AI price estimator", "International expansion", "IPO preparation"],
      },
    ];

    phases.forEach((phase, i) => {
      const x = 0.5 + i * 2.35;
      // Timeline dot
      s.addShape(pres.shapes.OVAL, {
        x: x + 0.85, y: 1.7, w: 0.3, h: 0.3,
        fill: { color: phase.color },
      });
      // Connector line
      if (i < 3) {
        s.addShape(pres.shapes.LINE, {
          x: x + 1.15, y: 1.85, w: 2.05, h: 0,
          line: { color: C.slate700, width: 1.5, dashType: "dash" },
        });
      }

      s.addText(phase.q, {
        x, y: 2.1, w: 2.15, h: 0.35,
        fontSize: 12, fontFace: "Arial", color: phase.color, bold: true, align: "center", margin: 0,
      });
      s.addText(phase.title, {
        x, y: 2.4, w: 2.15, h: 0.35,
        fontSize: 16, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0,
      });

      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 2.85, w: 2.15, h: 2.2,
        fill: { color: C.navyMid },
        shadow: makeLightShadow(),
      });

      phase.items.forEach((item, j) => {
        s.addText(`\u25B8 ${item}`, {
          x: x + 0.1, y: 3.0 + j * 0.48, w: 1.95, h: 0.4,
          fontSize: 9, fontFace: "Calibri", color: C.slate300, valign: "middle", margin: 0,
        });
      });
    });

    addFooter(s, 15, TOTAL_SLIDES);
  })();

  // ════════════════════════════════════════════════════════════════
  // SLIDE 16 — THE ASK
  // ════════════════════════════════════════════════════════════════
  (() => {
    const s = pres.addSlide();
    s.background = { color: C.navy };

    // Grid pattern
    for (let i = 0; i < 10; i++) {
      s.addShape(pres.shapes.LINE, {
        x: i + 0.5, y: 0, w: 0, h: 5.625,
        line: { color: C.white, width: 0.3, transparency: 95 },
      });
    }

    s.addText("The Ask", {
      x: 0.5, y: 0.5, w: 9, h: 0.7,
      fontSize: 36, fontFace: "Arial", color: C.white, bold: true, align: "center", margin: 0,
    });

    // Funding box
    s.addShape(pres.shapes.RECTANGLE, {
      x: 1.5, y: 1.4, w: 7, h: 1.4,
      fill: { color: C.navyMid },
      line: { color: C.green, width: 2 },
      shadow: makeShadow(),
    });

    s.addText("$500K Seed Round", {
      x: 1.5, y: 1.5, w: 7, h: 0.7,
      fontSize: 32, fontFace: "Arial", color: C.green, bold: true, align: "center", valign: "middle", margin: 0,
    });
    s.addText("Pre-money valuation: $3M  \u2022  Equity: 14.3%", {
      x: 1.5, y: 2.2, w: 7, h: 0.4,
      fontSize: 13, fontFace: "Calibri", color: C.slate400, align: "center", margin: 0,
    });

    // Use of funds
    const funds = [
      { pct: "40%", use: "Engineering", desc: "2 senior engineers, infrastructure", color: C.blueLight },
      { pct: "30%", use: "Growth", desc: "User acquisition, city launches", color: C.green },
      { pct: "20%", use: "Operations", desc: "Support, contractor vetting, legal", color: C.amber },
      { pct: "10%", use: "Reserve", desc: "Working capital and contingency", color: C.slate400 },
    ];

    funds.forEach((f, i) => {
      const x = 0.5 + i * 2.35;
      s.addShape(pres.shapes.RECTANGLE, {
        x, y: 3.1, w: 2.15, h: 1.1,
        fill: { color: C.navyMid },
        line: { color: f.color, width: 1 },
      });
      s.addText(f.pct, {
        x, y: 3.15, w: 2.15, h: 0.45,
        fontSize: 22, fontFace: "Arial", color: f.color, bold: true, align: "center", margin: 0,
      });
      s.addText(f.use, {
        x, y: 3.55, w: 2.15, h: 0.3,
        fontSize: 11, fontFace: "Calibri", color: C.white, bold: true, align: "center", margin: 0,
      });
      s.addText(f.desc, {
        x, y: 3.8, w: 2.15, h: 0.3,
        fontSize: 8, fontFace: "Calibri", color: C.slate400, align: "center", margin: 0,
      });
    });

    // Contact
    s.addShape(pres.shapes.RECTANGLE, {
      x: 2.0, y: 4.5, w: 6, h: 0.9,
      fill: { color: C.blue },
      shadow: makeShadow(),
    });
    s.addText([
      { text: "Let's build the future of home services together.\n", options: { fontSize: 14, color: C.white, bold: true, breakLine: true } },
      { text: "vishek23@gmail.com  \u2022  trovar.com", options: { fontSize: 11, color: C.blueBright } },
    ], {
      x: 2.0, y: 4.5, w: 6, h: 0.9,
      fontFace: "Calibri", align: "center", valign: "middle", margin: 0,
    });
  })();

  // ── Save ──
  const outputPath = path.join(__dirname, "..", "Trovar-Pitch-Deck-v2.pptx");
  await pres.writeFile({ fileName: outputPath });
  console.log(`\n\u2705 Pitch deck created: ${outputPath}`);
  console.log(`   ${TOTAL_SLIDES} slides | Premium investor deck with live product data\n`);
}

buildDeck().catch(console.error);
