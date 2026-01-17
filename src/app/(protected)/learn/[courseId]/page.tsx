import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, lessons, users, enrollments, lessonProgress } from "@/db";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getFirstLesson(courseId: string, clerkUserId: string): Promise<{ redirect: string } | { lessonId: string }> {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUserId),
  });

  if (!user) return { redirect: "/sign-in" };

  // Get enrollment
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.userId, user.id),
      eq(enrollments.courseId, courseId)
    ),
  });

  if (!enrollment || enrollment.status === "dropped") {
    return { redirect: `/courses/${courseId}` };
  }

  // Get course lessons
  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.order));

  if (courseLessons.length === 0) {
    return { redirect: `/courses/${courseId}` };
  }

  // Get progress to find the first incomplete lesson
  const progress = await db.query.lessonProgress.findMany({
    where: eq(lessonProgress.enrollmentId, enrollment.id),
  });

  const progressMap = new Map(progress.map((p) => [p.lessonId, p.completed]));

  // Find first incomplete lesson, or first lesson if all complete
  const firstIncomplete = courseLessons.find((l) => !progressMap.get(l.id));
  const targetLesson = firstIncomplete || courseLessons[0];

  return { lessonId: targetLesson.id };
}

export default async function LearnCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const result = await getFirstLesson(courseId, userId);

  if ("redirect" in result) {
    redirect(result.redirect);
  }

  redirect(`/learn/${courseId}/${result.lessonId}`);
}
