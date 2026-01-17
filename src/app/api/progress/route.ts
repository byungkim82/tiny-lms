import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, users, enrollments, lessonProgress, lessons } from "@/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateProgressSchema = z.object({
  lessonId: z.string().min(1, "레슨 ID는 필수입니다"),
  completed: z.boolean(),
});

// GET /api/progress?courseId=xxx - 강좌 진도 조회
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "courseId가 필요합니다" }, { status: 400 });
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Get user from clerk ID
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    }

    // Get enrollment
    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, user.id),
        eq(enrollments.courseId, courseId)
      ),
      with: {
        lessonProgress: {
          with: {
            lesson: true,
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "수강 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Build progress map
    const progressMap: Record<string, { completed: boolean; completedAt: Date | null }> = {};
    enrollment.lessonProgress.forEach((p) => {
      progressMap[p.lessonId] = {
        completed: p.completed,
        completedAt: p.completedAt,
      };
    });

    const totalLessons = enrollment.lessonProgress.length;
    const completedLessons = enrollment.lessonProgress.filter((p) => p.completed).length;

    return NextResponse.json({
      enrollmentId: enrollment.id,
      enrollmentStatus: enrollment.status,
      progress: progressMap,
      summary: {
        total: totalLessons,
        completed: completedLessons,
        percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "진도를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/progress - 레슨 완료 상태 업데이트
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { env } = await getCloudflareContext();
    const db = getDb(env.DB);

    // Get user from clerk ID
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = updateProgressSchema.parse(body);

    // Get lesson to find course
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, validatedData.lessonId),
    });

    if (!lesson) {
      return NextResponse.json({ error: "레슨을 찾을 수 없습니다" }, { status: 404 });
    }

    // Get enrollment for this course
    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, user.id),
        eq(enrollments.courseId, lesson.courseId)
      ),
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "수강 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (enrollment.status !== "active") {
      return NextResponse.json(
        { error: "활성화된 수강만 진도를 업데이트할 수 있습니다" },
        { status: 400 }
      );
    }

    // Find or create lesson progress
    let progress = await db.query.lessonProgress.findFirst({
      where: and(
        eq(lessonProgress.enrollmentId, enrollment.id),
        eq(lessonProgress.lessonId, validatedData.lessonId)
      ),
    });

    if (progress) {
      // Update existing progress
      const updated = await db
        .update(lessonProgress)
        .set({
          completed: validatedData.completed,
          completedAt: validatedData.completed ? new Date() : null,
        })
        .where(eq(lessonProgress.id, progress.id))
        .returning();
      progress = updated[0];
    } else {
      // This shouldn't normally happen if enrollment was properly initialized
      // but we handle it gracefully
      const { generateId } = await import("@/lib/utils");
      const created = await db
        .insert(lessonProgress)
        .values({
          id: generateId(),
          enrollmentId: enrollment.id,
          lessonId: validatedData.lessonId,
          completed: validatedData.completed,
          completedAt: validatedData.completed ? new Date() : null,
        })
        .returning();
      progress = created[0];
    }

    // Check if course is completed
    const allProgress = await db.query.lessonProgress.findMany({
      where: eq(lessonProgress.enrollmentId, enrollment.id),
    });

    const allCompleted = allProgress.length > 0 && allProgress.every((p) => p.completed);

    // Re-fetch enrollment to get current status
    const currentEnrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollment.id),
    });

    // Update enrollment status if all lessons are completed
    if (allCompleted && currentEnrollment?.status === "active") {
      await db
        .update(enrollments)
        .set({ status: "completed" })
        .where(eq(enrollments.id, enrollment.id));
    } else if (!allCompleted && currentEnrollment?.status === "completed") {
      // Revert to active if not all completed anymore
      await db
        .update(enrollments)
        .set({ status: "active" })
        .where(eq(enrollments.id, enrollment.id));
    }

    return NextResponse.json({
      progress,
      courseCompleted: allCompleted,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "유효성 검사 실패" },
        { status: 400 }
      );
    }
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { error: "진도 업데이트에 실패했습니다" },
      { status: 500 }
    );
  }
}
