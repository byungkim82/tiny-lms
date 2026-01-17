import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses, users } from "@/db";
import { generateId } from "@/lib/utils";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createCourseSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다"),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

// GET /api/courses - 강좌 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");

    const allCourses =
      status === "published"
        ? await db
            .select()
            .from(courses)
            .where(eq(courses.status, "published"))
            .orderBy(desc(courses.createdAt))
        : await db.select().from(courses).orderBy(desc(courses.createdAt));

    return NextResponse.json(allCourses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "강좌 목록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/courses - 강좌 생성 (admin only)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createCourseSchema.parse(body);

    const newCourse = await db
      .insert(courses)
      .values({
        id: generateId(),
        title: validatedData.title,
        description: validatedData.description || null,
        thumbnailUrl: validatedData.thumbnailUrl || null,
        status: validatedData.status || "draft",
        instructorId: user.id,
      })
      .returning();

    return NextResponse.json(newCourse[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "유효성 검사 실패" },
        { status: 400 }
      );
    }
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "강좌 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
