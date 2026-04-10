import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { getRandomQuestions, getQuestionsForCategory, QUIZ_CATEGORIES } from "@/lib/quiz-questions";
import { v4 as uuidv4 } from "uuid";

// GET /api/quiz?category=plumbing — Returns 10 random questions (without answers)
export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();

  const category = request.nextUrl.searchParams.get("category");
  if (!category || !QUIZ_CATEGORIES[category]) {
    return NextResponse.json(
      { error: "Invalid category", availableCategories: Object.keys(QUIZ_CATEGORIES) },
      { status: 400 }
    );
  }

  // Check if user has taken this quiz in the last 24 hours
  const recentAttempt = await db.prepare(
    `SELECT id, completed_at FROM skill_assessments
     WHERE user_id = ? AND category = ? AND completed_at > NOW() - INTERVAL '24 hours'
     ORDER BY completed_at DESC LIMIT 1`
  ).get(payload.userId, category) as { id: string; completed_at: string } | undefined;

  if (recentAttempt) {
    const completedAt = new Date(recentAttempt.completed_at);
    const retakeAt = new Date(completedAt.getTime() + 24 * 60 * 60 * 1000);
    return NextResponse.json({
      error: "You can only retake a quiz after 24 hours",
      retakeAvailableAt: retakeAt.toISOString(),
    }, { status: 429 });
  }

  const questions = getRandomQuestions(category, 10);

  // Return questions WITHOUT correctIndex
  const safeQuestions = questions.map((q) => ({
    id: q.id,
    category: q.category,
    question: q.question,
    options: q.options,
    difficulty: q.difficulty,
  }));

  return NextResponse.json({ questions: safeQuestions, category, total: safeQuestions.length });
}

// POST /api/quiz — Submit quiz answers
export async function POST(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = getDb();
  await initializeDatabase();

  const body = await request.json();
  const { category, answers } = body as {
    category: string;
    answers: { questionId: string; selectedIndex: number }[];
  };

  if (!category || !QUIZ_CATEGORIES[category]) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "No answers provided" }, { status: 400 });
  }

  // Check 24-hour cooldown
  const recentAttempt = await db.prepare(
    `SELECT id, completed_at FROM skill_assessments
     WHERE user_id = ? AND category = ? AND completed_at > NOW() - INTERVAL '24 hours'
     ORDER BY completed_at DESC LIMIT 1`
  ).get(payload.userId, category) as { id: string; completed_at: string } | undefined;

  if (recentAttempt) {
    return NextResponse.json({ error: "You can only retake a quiz after 24 hours" }, { status: 429 });
  }

  // Grade the quiz server-side
  const allQuestions = getQuestionsForCategory(category);
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

  let score = 0;
  const results = answers.map((answer) => {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      return {
        questionId: answer.questionId,
        correct: false,
        correctIndex: -1,
        explanation: "Question not found",
      };
    }
    const isCorrect = answer.selectedIndex === question.correctIndex;
    if (isCorrect) score++;
    return {
      questionId: answer.questionId,
      correct: isCorrect,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    };
  });

  const total = answers.length;
  const percentage = Math.round((score / total) * 100);

  // Store result
  const id = uuidv4();
  await db.prepare(
    `INSERT INTO skill_assessments (id, user_id, category, score, total_questions, percentage, answers)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, payload.userId, category, score, total, percentage, JSON.stringify(answers));

  return NextResponse.json({
    score,
    total,
    percentage,
    results,
    passed: percentage >= 70,
  });
}
