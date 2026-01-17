import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, users, enrollments } from "@/db";
import { eq, and } from "drizzle-orm";

// GET /api/enrollments/[id] - 수강 등록 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: enrollmentId } = await params;

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

    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.id, enrollmentId),
        eq(enrollments.userId, user.id)
      ),
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

    if (!enrollment) {
      return NextResponse.json(
        { error: "수강 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(enrollment);
  } catch (error) {
    console.error("Error fetching enrollment:", error);
    return NextResponse.json(
      { error: "수강 정보를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}

// DELETE /api/enrollments/[id] - 수강 취소 (soft delete: dropped 상태로 변경)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: enrollmentId } = await params;

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

    // Check enrollment exists and belongs to user
    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.id, enrollmentId),
        eq(enrollments.userId, user.id)
      ),
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "수강 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (enrollment.status === "dropped") {
      return NextResponse.json(
        { error: "이미 취소된 수강입니다" },
        { status: 400 }
      );
    }

    // Soft delete: set status to dropped
    const updatedEnrollment = await db
      .update(enrollments)
      .set({ status: "dropped" })
      .where(eq(enrollments.id, enrollmentId))
      .returning();

    return NextResponse.json(updatedEnrollment[0]);
  } catch (error) {
    console.error("Error canceling enrollment:", error);
    return NextResponse.json(
      { error: "수강 취소에 실패했습니다" },
      { status: 500 }
    );
  }
}
