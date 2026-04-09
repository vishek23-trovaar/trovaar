import { NextRequest, NextResponse } from "next/server";
import { getDb, initializeDatabase } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/auditLog";
import { adminLogger as logger } from "@/lib/logger";
import { normalizePhone } from "@/lib/phone";

const ALLOWED_SORT_COLS: Record<string, string> = {
  name: "u.name",
  email: "u.email",
  created_at: "u.created_at",
  completed_jobs: "cp.completion_count",
  platform_revenue: "platform_revenue_cents",
  rating: "cp.rating",
  strike_count: "cp.strike_count",
};

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role"); // "consumer" | "contractor" | null (all)
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  // Sort params
  const sortParam = searchParams.get("sort") ?? "created_at";
  const dirParam = searchParams.get("dir") ?? "desc";
  const sortCol = ALLOWED_SORT_COLS[sortParam] ?? "u.created_at";
  const sortDir = dirParam === "asc" ? "ASC" : "DESC";

  const db = getDb();
  await initializeDatabase();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (role) {
    conditions.push("u.role = ?");
    params.push(role);
  }
  if (search) {
    conditions.push(
      "(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.account_number LIKE ?)"
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Filter support
  const filterValues = searchParams.getAll("filter");
  for (const fv of filterValues) {
    if (fv === "suspended") { conditions.push("cp.is_suspended = 1"); }
    if (fv === "unverified") { conditions.push("(cp.verification_status IS NULL OR cp.verification_status != 'approved')"); conditions.push("u.role = 'contractor'"); }
    if (fv === "uninsured") { conditions.push("(cp.insurance_status IS NULL OR cp.insurance_status != 'approved')"); conditions.push("u.role = 'contractor'"); }
    if (fv === "has_strikes") { conditions.push("cp.strike_count > 0"); }
    if (fv === "phone_unverified") { conditions.push("u.phone_verified = 0"); }
    if (fv === "pending_verification") { conditions.push("(cp.verification_status = 'pending' OR cp.insurance_status = 'pending')"); }
  }

  // Flagged filter
  const flaggedParam = searchParams.get("flagged");
  if (flaggedParam === "1") {
    conditions.push("(cp.is_suspended = 1 OR (cp.strike_count > 0) OR cp.verification_status = 'pending' OR cp.insurance_status = 'pending' OR u.phone_verified = 0)");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Build ORDER BY clause safely using the whitelist mapping
  const nullsLast = sortDir === "DESC" ? "NULLS LAST" : "NULLS FIRST";
  const orderBy = `ORDER BY ${sortCol} ${sortDir} ${nullsLast}`;

  const users = await db.prepare(`
    SELECT
      u.id, u.name, u.email, u.role, u.created_at,
      u.email_verified, u.phone, u.phone_verified, u.location, u.is_admin, u.account_number,
      cp.verification_status, cp.insurance_status,
      cp.rating, cp.rating_count, cp.completion_count as completed_jobs,
      cp.is_suspended, cp.strike_count, cp.years_experience,
      cp.contractor_type,
      (SELECT COUNT(*) FROM contractor_strikes cs WHERE cs.contractor_id = u.id) as strikes_total,
      (SELECT COUNT(*) FROM bids b WHERE b.contractor_id = u.id AND b.status = 'accepted') as accepted_bids,
      (SELECT COUNT(*) FROM bids b WHERE b.contractor_id = u.id) as total_bids,
      (SELECT COALESCE(ROUND(SUM(b.price * 0.20)), 0) FROM bids b WHERE b.contractor_id = u.id AND b.status = 'accepted') as platform_revenue_cents,
      (SELECT COUNT(*) FROM jobs j WHERE j.consumer_id = u.id) as total_jobs,
      (SELECT COALESCE(ROUND(SUM(b2.price * 1.20)), 0) FROM bids b2 JOIN jobs j2 ON j2.id = b2.job_id WHERE j2.consumer_id = u.id AND b2.status = 'accepted' AND j2.status = 'completed') as total_spent_cents
    FROM users u
    LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
    ${where}
    ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Record<string, unknown>[];

  const total = (await db.prepare(`
    SELECT COUNT(*) as count FROM users u
    LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
    ${where}
  `).get(...params) as { count: number }).count;

  const pages = Math.ceil(total / limit);

  // Compute counts for tabs
  const allCount = (await db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
  const contractorCount = (await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'contractor'").get() as { count: number }).count;
  const clientCount = (await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'consumer'").get() as { count: number }).count;
  const flaggedCount = (await db.prepare(`
    SELECT COUNT(*) as count FROM users u
    LEFT JOIN contractor_profiles cp ON cp.user_id = u.id
    WHERE cp.is_suspended = 1 OR (cp.strike_count > 0) OR cp.verification_status = 'pending' OR cp.insurance_status = 'pending' OR u.phone_verified = 0
  `).get() as { count: number }).count;

  return NextResponse.json({
    users, total, page, pages, limit,
    counts: { all: allCount, contractors: contractorCount, clients: clientCount, flagged: flaggedCount },
  });
  } catch (err) {
    logger.error({ err }, "GET /admin/users error");
    return NextResponse.json({ error: "Internal server error", detail: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const body = await request.json() as {
    userId: string;
    action: "suspend" | "unsuspend" | "make_admin" | "remove_admin" | "edit_user";
    fields?: {
      name?: string;
      email?: string;
      phone?: string;
      location?: string;
      role?: string;
    };
  };

  const { userId, action } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  // Fetch current user data for audit logging
  const currentUser = await db.prepare(
    "SELECT id, name, email, phone, location, role, is_admin FROM users WHERE id = ?"
  ).get(userId) as { id: string; name: string; email: string; phone: string | null; location: string | null; role: string; is_admin: number } | undefined;

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "edit_user") {
    const fields = body.fields ?? {};
    const updates: string[] = [];
    const vals: (string | number)[] = [];

    if (fields.name !== undefined) {
      if (typeof fields.name !== "string" || !fields.name.trim()) {
        return NextResponse.json({ error: "Name must be a non-empty string" }, { status: 400 });
      }
      updates.push("name = ?");
      vals.push(fields.name.trim());
    }

    if (fields.email !== undefined) {
      if (typeof fields.email !== "string" || !fields.email.trim()) {
        return NextResponse.json({ error: "Email must be a non-empty string" }, { status: 400 });
      }
      // Check email uniqueness
      const existing = await db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(fields.email.trim(), userId) as { id: string } | undefined;
      if (existing) {
        return NextResponse.json({ error: "Email is already taken by another user" }, { status: 409 });
      }
      updates.push("email = ?");
      vals.push(fields.email.trim());
    }

    if (fields.phone !== undefined) {
      if (typeof fields.phone !== "string") {
        return NextResponse.json({ error: "Phone must be a string" }, { status: 400 });
      }
      const normalizedPhone = fields.phone.trim() ? normalizePhone(fields.phone) : null;
      if (fields.phone.trim() && !normalizedPhone) {
        return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
      }
      updates.push("phone = ?");
      vals.push(normalizedPhone ?? "");
    }

    if (fields.location !== undefined) {
      if (typeof fields.location !== "string") {
        return NextResponse.json({ error: "Location must be a string" }, { status: 400 });
      }
      updates.push("location = ?");
      vals.push(fields.location.trim());
    }

    if (fields.role !== undefined) {
      if (fields.role !== "consumer" && fields.role !== "contractor") {
        return NextResponse.json({ error: "Role must be consumer or contractor" }, { status: 400 });
      }
      updates.push("role = ?");
      vals.push(fields.role);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    vals.push(userId);
    await db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...vals);

    logAdminAction({
      action: "edit_user",
      entityType: "user",
      entityId: userId,
      entityLabel: currentUser.name || currentUser.email,
      oldValue: { name: currentUser.name, email: currentUser.email, phone: currentUser.phone, location: currentUser.location, role: currentUser.role },
      newValue: fields as Record<string, unknown>,
      reversible: true,
    });

    return NextResponse.json({ success: true });
  }

  if (action === "suspend") {
    await db.prepare("UPDATE contractor_profiles SET is_suspended = 1 WHERE user_id = ?").run(userId);
    await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at)
      VALUES (?, ?, 'admin', 'Account Suspended', 'Your account has been suspended by an administrator. Please contact support.', datetime('now'))
    `).run(crypto.randomUUID(), userId);
    logAdminAction({
      action: "suspend_user",
      entityType: "user",
      entityId: userId,
      entityLabel: currentUser.name || currentUser.email,
      oldValue: { is_suspended: 0 },
      newValue: { is_suspended: 1 },
      reversible: true,
    });
  } else if (action === "unsuspend") {
    await db.prepare("UPDATE contractor_profiles SET is_suspended = 0 WHERE user_id = ?").run(userId);
    await db.prepare(`INSERT INTO notifications (id, user_id, type, title, message, created_at)
      VALUES (?, ?, 'admin', 'Account Reinstated', 'Your account has been reinstated. You can now receive and bid on jobs.', datetime('now'))
    `).run(crypto.randomUUID(), userId);
    logAdminAction({
      action: "unsuspend_user",
      entityType: "user",
      entityId: userId,
      entityLabel: currentUser.name || currentUser.email,
      oldValue: { is_suspended: 1 },
      newValue: { is_suspended: 0 },
      reversible: true,
    });
  } else if (action === "make_admin") {
    await db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(userId);
    logAdminAction({
      action: "make_admin",
      entityType: "user",
      entityId: userId,
      entityLabel: currentUser.name || currentUser.email,
      oldValue: { is_admin: 0 },
      newValue: { is_admin: 1 },
      reversible: true,
    });
  } else if (action === "remove_admin") {
    await db.prepare("UPDATE users SET is_admin = 0 WHERE id = ?").run(userId);
    logAdminAction({
      action: "remove_admin",
      entityType: "user",
      entityId: userId,
      entityLabel: currentUser.name || currentUser.email,
      oldValue: { is_admin: 1 },
      newValue: { is_admin: 0 },
      reversible: true,
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query param is required" }, { status: 400 });
  }

  const db = getDb();
  await initializeDatabase();

  const existing = await db.prepare(
    "SELECT id, name, email FROM users WHERE id = ?"
  ).get(userId) as { id: string; name: string; email: string } | undefined;
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  logAdminAction({
    action: "delete_user",
    entityType: "user",
    entityId: userId,
    entityLabel: existing.name || existing.email,
    oldValue: { id: existing.id, name: existing.name, email: existing.email },
    reversible: false,
  });

  await db.prepare("DELETE FROM users WHERE id = ?").run(userId);

  return NextResponse.json({ success: true });
}
