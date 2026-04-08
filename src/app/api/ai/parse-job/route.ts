import { NextRequest, NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-api";

const CATEGORIES = [
  "plumbing", "electrical", "hvac", "roofing", "painting", "landscaping",
  "tree_service", "cleaning", "moving", "carpentry", "flooring", "drywall",
  "auto_repair", "auto_detailing", "pest_control", "appliance_repair",
  "locksmith", "security_cameras", "smart_home_install", "computer_repair",
  "it_networking", "photography", "videography", "personal_training",
  "dog_walking", "pet_sitting", "pet_grooming", "event_setup", "welding",
  "pressure_washing", "window_cleaning", "gutter_cleaning", "general_handyman"
];

function generateQuestions(category: string, transcript: string): string[] {
  const lower = transcript.toLowerCase();

  const questionMap: Record<string, string[]> = {
    plumbing: [
      "Is this a repair or a new installation?",
      "How many fixtures are affected?",
      "Do you know where the main water shut-off valve is?",
      "Is there any visible water damage already?",
    ],
    electrical: [
      "Is this indoor or outdoor electrical work?",
      "Do you know your panel's current amperage (100A or 200A)?",
      "Will permits be required for this work?",
      "Are there any existing wiring issues you're aware of?",
    ],
    hvac: [
      "Is this a repair or full replacement?",
      "How old is your current system?",
      "What is the square footage of the area to be cooled/heated?",
      "When was the last time the system was serviced?",
    ],
    roofing: [
      "How old is your current roof?",
      "Is this a repair or full replacement?",
      "What type of roofing material do you currently have?",
      "How many square feet is the roof approximately?",
    ],
    painting: [
      "Is this interior or exterior painting?",
      "How many rooms or square feet need to be painted?",
      "Do you already have paint colors selected?",
      "Is there any prep work needed (patching, priming)?",
    ],
    landscaping: [
      "How large is the area to be landscaped (sq ft)?",
      "Is this a one-time job or ongoing maintenance?",
      "Do you have irrigation/sprinklers already installed?",
      "Are there any specific plants or styles you have in mind?",
    ],
    moving: [
      "How many rooms are you moving?",
      "Are there any large/heavy items like pianos or safes?",
      "Is there elevator access at both locations?",
      "How far is the move (same city or long distance)?",
    ],
    cleaning: [
      "How many square feet is the space?",
      "Is this a one-time deep clean or regular maintenance?",
      "Are there any pets in the home?",
      "Do you need supplies provided or will you supply them?",
    ],
    carpentry: [
      "Do you have existing materials or do you need them sourced?",
      "Is this custom built-in work or standard installation?",
      "Do you have measurements or drawings ready?",
      "What type of wood or finish are you looking for?",
    ],
    flooring: [
      "How many square feet need to be done?",
      "What type of flooring material are you looking for?",
      "Does existing flooring need to be removed first?",
      "Are there stairs involved?",
    ],
    auto_repair: [
      "What is the year, make, and model of the vehicle?",
      "Have you had a diagnostic run already?",
      "Is the vehicle currently drivable?",
      "Is this covered under any warranty?",
    ],
    auto_detailing: [
      "What size is the vehicle (sedan, SUV, truck)?",
      "Is this interior, exterior, or full detail?",
      "Are there any specific stains or issues to address?",
      "Has the vehicle been detailed recently?",
    ],
    pest_control: [
      "What type of pest are you dealing with?",
      "How long have you been experiencing this issue?",
      "Is this a residential or commercial property?",
      "Have you tried any treatments already?",
    ],
    tree_service: [
      "How many trees need work?",
      "Approximately how tall are the trees?",
      "Is there overhead power lines near the trees?",
      "Do you need the debris hauled away?",
    ],
    general_handyman: [
      "How many separate tasks need to be done?",
      "Do you have any materials already purchased?",
      "Is there a specific deadline for this work?",
      "Are there any areas of the home that are difficult to access?",
    ],
  };

  // suppress unused variable warning — lower is available for future use
  void lower;

  const questions = questionMap[category] || questionMap["general_handyman"];
  // Return max 3 most relevant questions
  return questions.slice(0, 3);
}

function parseWithKeywords(transcript: string): {
  title: string;
  description: string;
  category: string;
  urgency: string;
} {
  const lower = transcript.toLowerCase();

  // Category detection
  let category = "general_handyman";
  const categoryMap: Record<string, string[]> = {
    plumbing: ["pipe", "leak", "drain", "toilet", "faucet", "water", "plumb", "sink"],
    electrical: ["electric", "outlet", "wire", "circuit", "breaker", "light", "switch", "power"],
    hvac: ["ac", "heat", "air condition", "furnace", "hvac", "duct", "vent", "cooling", "heating"],
    roofing: ["roof", "shingle", "gutter", "leak", "rain"],
    painting: ["paint", "repaint", "wall", "color", "stain"],
    landscaping: ["lawn", "grass", "garden", "mow", "landscape", "yard", "weed", "plant"],
    tree_service: ["tree", "branch", "trim", "cut down", "stump"],
    cleaning: ["clean", "maid", "housekeep", "vacuum", "sweep", "mop"],
    moving: ["move", "moving", "haul", "furniture", "transport", "relocate"],
    carpentry: ["wood", "cabinet", "shelf", "door", "frame", "carpenter"],
    flooring: ["floor", "tile", "carpet", "hardwood", "laminate"],
    auto_repair: ["car", "vehicle", "brake", "engine", "transmission", "oil change", "tire"],
    auto_detailing: ["detail", "wash car", "polish", "wax"],
    pest_control: ["pest", "bug", "roach", "ant", "mouse", "rat", "termite", "mosquito"],
    dog_walking: ["dog", "walk", "pet", "puppy"],
    computer_repair: ["computer", "laptop", "virus", "slow pc", "windows", "mac"],
    pressure_washing: ["pressure wash", "power wash", "driveway", "concrete"],
    window_cleaning: ["window", "glass"],
    general_handyman: ["fix", "repair", "install", "help", "handyman"],
  };

  for (const [cat, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => lower.includes(kw))) {
      category = cat;
      break;
    }
  }

  // Urgency detection
  let urgency = "medium";
  if (lower.includes("emergency") || lower.includes("asap") || lower.includes("urgent") || lower.includes("right now") || lower.includes("today")) {
    urgency = "emergency";
  } else if (lower.includes("soon") || lower.includes("this week") || lower.includes("couple days")) {
    urgency = "high";
  } else if (lower.includes("whenever") || lower.includes("no rush") || lower.includes("flexible")) {
    urgency = "low";
  }

  // Generate title (capitalize first 8 words)
  const words = transcript.trim().split(" ").slice(0, 8);
  const title = words.join(" ").replace(/[.!?].*$/, "").trim();
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    title: capitalizedTitle.length > 60 ? capitalizedTitle.slice(0, 60) + "..." : capitalizedTitle,
    description: transcript.trim(),
    category,
    urgency,
  };
}

export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(request, { maxRequests: 20, windowMs: 60 * 60 * 1000, keyPrefix: "ai-parse" });
  if (rl) return rl;

  const { transcript } = await request.json() as { transcript: string };

  if (!transcript?.trim()) {
    return NextResponse.json({ error: "Transcript required" }, { status: 400 });
  }

  // Try Gemini API if key available
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const prompt = `You are a job classification AI for a home services marketplace. Analyze this voice transcript and extract structured job info.

Transcript: "${transcript}"

Available categories: ${CATEGORIES.join(", ")}

Respond with ONLY valid JSON (no markdown, no code blocks):
{"title":"Short job title (max 60 chars)","description":"Cleaned up description (2-3 sentences)","category":"one of the available categories","urgency":"low or medium or high or emergency"}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
          }),
        }
      );

      if (res.ok) {
        const aiData = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
        const text = aiData.candidates[0].content.parts[0].text.trim()
          .replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(text) as { title: string; description: string; category: string; urgency: string };
        return NextResponse.json({ ...parsed, questions: generateQuestions(parsed.category, transcript) });
      }
    } catch {
      // Fall through to keyword matching
    }
  }

  // Fallback: keyword-based parsing
  const parsed = parseWithKeywords(transcript);
  return NextResponse.json({ ...parsed, questions: generateQuestions(parsed.category, transcript) });
}
