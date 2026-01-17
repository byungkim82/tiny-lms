import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses, users, enrollments, lessons, lessonProgress } from "@/db";
import { generateId } from "@/lib/utils";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";

const createEnrollmentSchema = z.object({
  courseId: z.string().min(1, "강좌 ID는 필수입니다"),
});

// GET /api/enrollments - 내 수강 목록 조회
export async function GET(_req: NextRequest) {
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

    // Get enrollments with course info
    const userEnrollments = await db.query.enrollments.findMany({
      where: eq(enrollments.userId, user.id),
      with: {
        course: {
          with: {
            instructor: true,
            lessons: true,
          },
        },
        lessonProgress: true,
      },
    });

    // Calculate progress for each enrollment
    const enrollmentsWithProgress = userEnrollments.map((enrollment) => {
      const totalLessons = enrollment.course.lessons.length;
      const completedLessons = enrollment.lessonProgress.filter((p) => p.completed).length;
      const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          description: enrollment.course.description,
          thumbnailUrl: enrollment.course.thumbnailUrl,
          instructor: enrollment.course.instructor,
          lessonCount: totalLessons,
        },
        progress: {
          completed: completedLessons,
          total: totalLessons,
          percent: progressPercent,
        },
      };
    });

    return NextResponse.json(enrollmentsWithProgress);
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return NextResponse.json(
      { error: "수강 목록을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// POST /api/enrollments - 수강 등록
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
    const validatedData = createEnrollmentSchema.parse(body);

    // Check course exists and is published
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, validatedData.courseId),
    });

    if (!course) {
      return NextResponse.json({ error: "강좌를 찾을 수 없습니다" }, { status: 404 });
    }

    if (course.status !== "published") {
      return NextResponse.json(
        { error: "공개된 강좌만 수강 신청할 수 있습니다" },
        { status: 400 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, user.id),
        eq(enrollments.courseId, validatedData.courseId)
      ),
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === "active") {
        return NextResponse.json(
          { error: "이미 수강 중인 강좌입니다" },
          { status: 400 }
        );
      }
      // If dropped, reactivate enrollment
      if (existingEnrollment.status === "dropped") {
        const updatedEnrollment = await db
          .update(enrollments)
          .set({ status: "active" })
          .where(eq(enrollments.id, existingEnrollment.id))
          .returning();
        return NextResponse.json(updatedEnrollment[0]);
      }
    }

    // Create enrollment
    const newEnrollment = await db
      .insert(enrollments)
      .values({
        id: generateId(),
        userId: user.id,
        courseId: validatedData.courseId,
        status: "active",
      })
      .returning();

    // Initialize lesson progress for all lessons
    const courseLessons = await db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, validatedData.courseId))
      .orderBy(asc(lessons.order));

    if (courseLessons.length > 0) {
      await db.insert(lessonProgress).values(
        courseLessons.map((lesson) => ({
          id: generateId(),
          enrollmentId: newEnrollment[0].id,
          lessonId: lesson.id,
          completed: false,
        }))
      );
    }

    return NextResponse.json(newEnrollment[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "유효성 검사 실패" },
        { status: 400 }
      );
    }
    console.error("Error creating enrollment:", error);
    return NextResponse.json(
      { error: "수강 등록에 실패했습니다" },
      { status: 500 }
    );
  }
}
