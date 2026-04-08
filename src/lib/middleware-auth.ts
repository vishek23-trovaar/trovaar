import { jwtVerify } from "jose";
import { AuthPayload } from "@/types";

export async function verifyTokenEdge(token: string): Promise<AuthPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-dev-secret");
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}
