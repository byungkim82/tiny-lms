import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses, lessons, users, enrollments, lessonProgress } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { getEmbedUrl } from "@/lib/utils";
import LessonCompleteButton from "@/components/LessonCompleteButton";
import LessonSidebar from "@/components/LessonSidebar";

export const dynamic = "force-dynamic";

interface LessonWithProgress {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  order: number;
  completed: boolean;
}

async function getCourseData(courseId: string, lessonId: string, clerkUserId: string) {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUserId),
  });

  if (!user) return null;

  // Get enrollment
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.userId, user.id),
      eq(enrollments.courseId, courseId)
    ),
  });

  if (!enrollment || enrollment.status === "dropped") return null;

  // Get course with instructor
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      instructor: true,
    },
  });

  if (!course) return null;

  // Get all lessons
  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, courseId))
    .orderBy(asc(lessons.order));

  // Get progress for all lessons
  const progressRecords = await db.query.lessonProgress.findMany({
    where: eq(lessonProgress.enrollmentId, enrollment.id),
  });

  const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p.completed]));

  const lessonsWithProgress: LessonWithProgress[] = courseLessons.map((lesson) => ({
    ...lesson,
    completed: progressMap.get(lesson.id) ?? false,
  }));

  // Find current lesson
  const currentLesson = lessonsWithProgress.find((l) => l.id === lessonId);
  if (!currentLesson) return null;

  // Find previous and next lessons
  const currentIndex = lessonsWithProgress.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessonsWithProgress[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessonsWithProgress.length - 1 ? lessonsWithProgress[currentIndex + 1] : null;

  return {
    course,
    enrollment,
    lessons: lessonsWithProgress,
    currentLesson,
    prevLesson,
    nextLesson,
    currentIndex,
  };
}

export default async function LessonViewerPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const data = await getCourseData(courseId, lessonId, userId);

  if (!data) {
    notFound();
  }

  const { course, lessons: courseLessons, currentLesson, prevLesson, nextLesson, currentIndex } = data;
  const embedUrl = currentLesson.videoUrl ? getEmbedUrl(currentLesson.videoUrl) : null;

  const completedCount = courseLessons.filter((l) => l.completed).length;
  const progressPercent = courseLessons.length > 0
    ? Math.round((completedCount / courseLessons.length) * 100)
    : 0;

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/my-learning"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← 내 학습
            </Link>
            <span className="text-gray-300">|</span>
            <span className="font-medium text-gray-900">{course.title}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {completedCount} / {courseLessons.length} 완료
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <LessonSidebar
          courseId={courseId}
          lessons={courseLessons}
          currentLessonId={lessonId}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-8">
            {/* Lesson Title */}
            <div className="mb-6">
              <span className="text-sm text-gray-500">
                레슨 {currentIndex + 1} / {courseLessons.length}
              </span>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">
                {currentLesson.title}
              </h1>
            </div>

            {/* Video */}
            {embedUrl && (
              <div className="mb-8 aspect-video overflow-hidden rounded-lg bg-black">
                <iframe
                  src={embedUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Content */}
            {currentLesson.content && (
              <div className="prose prose-gray max-w-none rounded-lg bg-white p-6 shadow">
                <div className="whitespace-pre-wrap">{currentLesson.content}</div>
              </div>
            )}

            {/* Complete Button */}
            <div className="mt-8">
              <LessonCompleteButton
                lessonId={currentLesson.id}
                completed={currentLesson.completed}
                nextLessonUrl={nextLesson ? `/learn/${courseId}/${nextLesson.id}` : null}
              />
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
              {prevLesson ? (
                <Link
                  href={`/learn/${courseId}/${prevLesson.id}`}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  <span className="mr-2">←</span>
                  <div>
                    <div className="text-xs text-gray-400">이전 레슨</div>
                    <div>{prevLesson.title}</div>
                  </div>
                </Link>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Link
                  href={`/learn/${courseId}/${nextLesson.id}`}
                  className="flex items-center text-right text-sm text-gray-600 hover:text-gray-900"
                >
                  <div>
                    <div className="text-xs text-gray-400">다음 레슨</div>
                    <div>{nextLesson.title}</div>
                  </div>
                  <span className="ml-2">→</span>
                </Link>
              ) : (
                <Link
                  href="/my-learning"
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                >
                  학습 완료 →
                </Link>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
