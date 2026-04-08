import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SECRET ?? process.env.JWT_SECRET ?? "admin-dev-secret"
);

export async function requireAdmin(request: NextRequest): Promise<{
  error?: NextResponse;
}> {
  const adminToken = request.cookies.get("admin_token")?.value;
  if (!adminToken) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  try {
    const { payload } = await jwtVerify(adminToken, ADMIN_SECRET);
    if (!(payload as { isAdmin?: boolean }).isAdmin) {
      return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
    }
    return {};
  } catch {
    return { error: NextResponse.json({ error: "Invalid admin token" }, { status: 403 }) };
  }
}

export async function requireAdminAsync(request: NextRequest): Promise<{
  error?: NextResponse;
}> {
  const adminToken = request.cookies.get("admin_token")?.value;
  if (!adminToken) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  }
  try {
    const { payload } = await jwtVerify(adminToken, ADMIN_SECRET);
    if (!(payload as { isAdmin?: boolean }).isAdmin) {
      return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
    }
    return {};
  } catch {
    return { error: NextResponse.json({ error: "Invalid admin token" }, { status: 403 }) };
  }
}
