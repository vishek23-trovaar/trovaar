import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";

// GET /api/quiz/scores/[userId] — Returns best quiz scores for a user (public)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const db = getDb();
  await initializeDatabase();

  // Get best score per category
  const scores = await db.prepare(`
    SELECT category, MAX(percentage) as best_percentage,
           MAX(score) as best_score, MAX(total_questions) as total_questions,
           MAX(completed_at) as last_taken
    FROM skill_assessments
    WHERE user_id = ?
    GROUP BY category
    ORDER BY category
  `).all(userId) as Array<{
    category: string;
    best_percentage: number;
    best_score: number;
    total_questions: number;
    last_taken: string;
  }>;

  return NextResponse.json({ scores });
}
