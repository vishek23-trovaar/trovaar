import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { getAuthPayload } from "@/lib/auth";
import { generateAccountNumber } from "@/lib/accountNumber";

const USER_SELECT =
  "SELECT id, email, name, role, phone, phone_verified, location, email_verified, referral_code, credit_balance_cents, created_at, is_admin, account_number FROM users WHERE id = ?";

function mapUser(raw: Record<string, unknown>) {
  const { is_admin, ...rest } = raw;
  return { ...rest, isAdmin: !!is_admin };
}

export async function PATCH(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const db = getDb();
  await initializeDatabase();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name?.trim()) {
    updates.push("name = ?");
    values.push(body.name.trim());
  }

  if (body.phone !== undefined) {
    const phone = (body.phone as string).trim();
    updates.push("phone = ?");
    values.push(phone || null);

    // Generate / update account_number whenever a valid phone is saved
    if (phone) {
      try {
        const acctNum = generateAccountNumber(payload.userId, phone);
        updates.push("account_number = ?");
        values.push(acctNum);
      } catch {
        // Phone had no usable digits — leave account_number unchanged
      }
    }
  }

  if (body.location !== undefined) {
    updates.push("location = ?");
    values.push(body.location);
  }

  if (updates.length > 0) {
    try {
      values.push(payload.userId);
      db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    } catch (err: unknown) {
      // Unique constraint on phone or account_number
      if (
        err instanceof Error &&
        err.message.includes("UNIQUE")
      ) {
        return NextResponse.json(
          { error: "That phone number is already linked to another account." },
          { status: 409 }
        );
      }
      throw err;
    }
  }

  // Persist contractor-specific profile fields if provided
  const contractorUpdates: string[] = [];
  const contractorValues: unknown[] = [];

  if (body.bio !== undefined) {
    contractorUpdates.push("bio = ?");
    contractorValues.push(body.bio);
  }
  if (body.hourlyRate !== undefined) {
    contractorUpdates.push("hourly_rate = ?");
    contractorValues.push(Number(body.hourlyRate) || 0);
  }
  if (body.experience !== undefined) {
    contractorUpdates.push("years_experience = ?");
    contractorValues.push(body.experience);
  }
  if (body.skills !== undefined) {
    contractorUpdates.push("skills = ?");
    contractorValues.push(body.skills);
  }

  if (contractorUpdates.length > 0) {
    // Upsert into contractor_profiles
    // INSERT values: userId + field values; ON CONFLICT UPDATE: field values repeated for SET clause
    const columnNames = contractorUpdates.map((u) => u.split(" = ")[0]).join(", ");
    const insertPlaceholders = contractorUpdates.map(() => "?").join(", ");
    db.prepare(`
      INSERT INTO contractor_profiles (user_id, ${columnNames})
      VALUES (?, ${insertPlaceholders})
      ON CONFLICT(user_id) DO UPDATE SET ${contractorUpdates.join(", ")}
    `).run(payload.userId, ...contractorValues, ...contractorValues);
  }

  const raw = await db.prepare(USER_SELECT).get(payload.userId) as Record<string, unknown> | undefined;
  return NextResponse.json({ user: raw ? mapUser(raw) : null });
}

export async function GET(request: NextRequest) {
  const payload = getAuthPayload(request.headers);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initializeDatabase();
  const raw = await db.prepare(USER_SELECT).get(payload.userId) as Record<string, unknown> | undefined;

  if (!raw) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: mapUser(raw) });
}
