import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MOBILE_ROOT = path.join(process.cwd(), "mobile");

function getFileTree(dir: string, prefix = ""): any[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const items: any[] = [];

  for (const entry of entries) {
    // Skip node_modules, .expo, etc
    if (["node_modules", ".expo", ".next", "android", "ios", "assets"].includes(entry.name)) continue;

    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        path: relativePath,
        type: "directory",
        children: getFileTree(path.join(dir, entry.name), relativePath),
      });
    } else if (/\.(tsx?|js|json|md)$/.test(entry.name)) {
      items.push({
        name: entry.name,
        path: relativePath,
        type: "file",
      });
    }
  }

  // Sort: directories first, then files, alphabetically
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath) {
    // Return file tree
    const tree = getFileTree(MOBILE_ROOT);
    return NextResponse.json({ tree });
  }

  // Read specific file
  const fullPath = path.join(MOBILE_ROOT, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(MOBILE_ROOT)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const stats = fs.statSync(fullPath);

  return NextResponse.json({
    path: filePath,
    content,
    size: stats.size,
    modified: stats.mtime.toISOString(),
  });
}

export async function PUT(request: NextRequest) {
  const { path: filePath, content } = await request.json();

  if (!filePath || content === undefined) {
    return NextResponse.json({ error: "path and content required" }, { status: 400 });
  }

  const fullPath = path.join(MOBILE_ROOT, filePath);

  // Security: prevent directory traversal
  if (!fullPath.startsWith(MOBILE_ROOT)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Ensure directory exists
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");

  return NextResponse.json({ success: true, path: filePath });
}

export async function POST(request: NextRequest) {
  // Create new file
  const { path: filePath, content = "", type = "file" } = await request.json();

  if (!filePath) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  const fullPath = path.join(MOBILE_ROOT, filePath);

  if (!fullPath.startsWith(MOBILE_ROOT)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (type === "directory") {
    fs.mkdirSync(fullPath, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    if (fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "File already exists" }, { status: 409 });
    }
    fs.writeFileSync(fullPath, content, "utf-8");
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }

  const fullPath = path.join(MOBILE_ROOT, filePath);

  if (!fullPath.startsWith(MOBILE_ROOT)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stats = fs.statSync(fullPath);
  if (stats.isDirectory()) {
    fs.rmSync(fullPath, { recursive: true });
  } else {
    fs.unlinkSync(fullPath);
  }

  return NextResponse.json({ success: true });
}
