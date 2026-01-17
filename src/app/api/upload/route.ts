import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, users } from "@/db";
import { generateId } from "@/lib/utils";
import { eq } from "drizzle-orm";

// POST /api/upload - 파일 업로드 (admin only)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Check admin role
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 가능)" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "파일 크기는 5MB를 초과할 수 없습니다" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const extension = file.name.split(".").pop();
    const filename = `${generateId()}.${extension}`;
    const key = `uploads/${filename}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await env.R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Return the public URL (you'll need to set up a custom domain or use R2 public access)
    // For now, we return the key and the frontend can construct the URL
    return NextResponse.json({
      key,
      filename,
      url: `/api/files/${key}`,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다" },
      { status: 500 }
    );
  }
}
