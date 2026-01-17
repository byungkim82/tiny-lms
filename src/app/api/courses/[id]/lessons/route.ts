import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses, users, lessons } from "@/db";
import { generateId } from "@/lib/utils";
import { eq, asc, max } from "drizzle-orm";
import { z } from "zod";

const createLessonSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다"),
  content: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  order: z.number().optional(),
});

const updateLessonSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "제목은 필수입니다").optional(),
  content: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  order: z.number().optional(),
});

const reorderLessonsSchema = z.object({
  lessonIds: z.array(z.string()),
});

// GET /api/courses/[id]/lessons - 레슨 목록 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    const courseLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, courseId))
      .orderBy(asc(lessons.order));

    return NextResponse.json(courseLessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "레슨 목록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/lessons - 레슨 생성 (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: courseId } = await params;

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
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    });

    if (!course) {
      return NextResponse.json(
        { error: "강좌를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const validatedData = createLessonSchema.parse(body);

    // Get max order for this course
    const maxOrderResult = await db
      .select({ maxOrder: max(lessons.order) })
      .from(lessons)
      .where(eq(lessons.courseId, courseId));

    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;

    const newLesson = await db
      .insert(lessons)
      .values({
        id: generateId(),
        courseId,
        title: validatedData.title,
        content: validatedData.content || null,
        videoUrl: validatedData.videoUrl || null,
        order: validatedData.order ?? nextOrder,
      })
      .returning();

    return NextResponse.json(newLesson[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "유효성 검사 실패" },
        { status: 400 }
      );
    }
    console.error("Error creating lesson:", error);
    return NextResponse.json(
      { error: "레슨 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}

// PUT /api/courses/[id]/lessons - 레슨 수정 또는 순서 변경 (admin only)
export async function PUT(req: NextRequest) {
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

    const body = (await req.json()) as Record<string, unknown>;

    // Check if this is a reorder request
    if (body.lessonIds) {
      const validatedData = reorderLessonsSchema.parse(body);

      // Update order for each lesson
      for (let i = 0; i < validatedData.lessonIds.length; i++) {
        await db
          .update(lessons)
          .set({ order: i, updatedAt: new Date() })
          .where(eq(lessons.id, validatedData.lessonIds[i]));
      }

      return NextResponse.json({ success: true });
    }

    // Otherwise, update a single lesson
    const validatedData = updateLessonSchema.parse(body);

    const updatedLesson = await db
      .update(lessons)
      .set({
        title: validatedData.title,
        content: validatedData.content,
        videoUrl: validatedData.videoUrl || null,
        order: validatedData.order,
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, validatedData.id))
      .returning();

    return NextResponse.json(updatedLesson[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "유효성 검사 실패" },
        { status: 400 }
      );
    }
    console.error("Error updating lesson:", error);
    return NextResponse.json(
      { error: "레슨 수정에 실패했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id]/lessons - 레슨 삭제 (admin only)
export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");

    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId가 필요합니다" },
        { status: 400 }
      );
    }

    await db.delete(lessons).where(eq(lessons.id, lessonId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return NextResponse.json(
      { error: "레슨 삭제에 실패했습니다" },
      { status: 500 }
    );
  }
}
