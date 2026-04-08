import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (payload.role !== "contractor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // e.g. 2026-03

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month query param required (YYYY-MM)" }, { status: 400 });
  }

  const [year, mon] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  // Calculate last day of month
  const lastDay = new Date(year, mon, 0).getDate();
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  const db = getDb();
  await initializeDatabase();

  // Get accepted/in-progress jobs for this contractor in the date range
  const jobs = await db.prepare(`
    SELECT j.id, j.title, j.category, j.status, j.location,
           b.availability_date, b.price, j.completed_at,
           u.name as consumer_name
    FROM bids b
    JOIN jobs j ON b.job_id = j.id
    JOIN users u ON j.consumer_id = u.id
    WHERE b.contractor_id = ?
      AND b.status = 'accepted'
      AND (
        (b.availability_date >= ? AND b.availability_date <= ?)
        OR (j.completed_at >= ? AND j.completed_at <= ?)
        OR (j.status IN ('accepted', 'en_route', 'arrived', 'in_progress')
            AND b.availability_date <= ?)
      )
    ORDER BY b.availability_date ASC
  `).all(payload.userId, startDate, endDate, startDate, endDate, endDate) as Array<Record<string, unknown>>;

  // Get availability slots (recurring weekly)
  const weeklySlots = await db.prepare(`
    SELECT * FROM contractor_availability
    WHERE contractor_id = ? AND day_of_week IS NOT NULL AND specific_date IS NULL
    ORDER BY day_of_week ASC, start_time ASC
  `).all(payload.userId) as Array<Record<string, unknown>>;

  // Get specific date slots/blocks in range
  const dateSlots = await db.prepare(`
    SELECT * FROM contractor_availability
    WHERE contractor_id = ? AND specific_date IS NOT NULL
      AND specific_date >= ? AND specific_date <= ?
    ORDER BY specific_date ASC, start_time ASC
  `).all(payload.userId, startDate, endDate) as Array<Record<string, unknown>>;

  return NextResponse.json({
    month,
    jobs,
    weeklySlots,
    dateSlots,
  });
}
