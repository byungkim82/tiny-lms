import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses, users, lessons } from "@/db";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const updateCourseSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다").optional(),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

// GET /api/courses/[id] - 강좌 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, id),
      with: {
        instructor: true,
        lessons: {
          orderBy: [asc(lessons.order)],
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "강좌를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "강좌를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/courses/[id] - 강좌 수정 (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

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

    // Check course exists
    const existingCourse = await db.query.courses.findFirst({
      where: eq(courses.id, id),
    });

    if (!existingCourse) {
      return NextResponse.json(
        { error: "강좌를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = updateCourseSchema.parse(body);

    const updatedCourse = await db
      .update(courses)
      .set({
        ...validatedData,
        thumbnailUrl: validatedData.thumbnailUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id))
      .returning();

    return NextResponse.json(updatedCourse[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "유효성 검사 실패" },
        { status: 400 }
      );
    }
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "강좌 수정에 실패했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id] - 강좌 삭제 (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

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

    // Check course exists
    const existingCourse = await db.query.courses.findFirst({
      where: eq(courses.id, id),
    });

    if (!existingCourse) {
      return NextResponse.json(
        { error: "강좌를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await db.delete(courses).where(eq(courses.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "강좌 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
