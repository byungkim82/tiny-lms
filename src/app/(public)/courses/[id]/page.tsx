import { notFound } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses, lessons, users, enrollments } from "@/db";
import { eq, asc, and } from "drizzle-orm";
import { getEmbedUrl } from "@/lib/utils";
import EnrollmentButton from "@/components/EnrollmentButton";

export const dynamic = "force-dynamic";


async function getCourseWithLessons(id: string) {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, id),
    with: {
      instructor: true,
    },
  });

  if (!course || course.status !== "published") return null;

  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, id))
    .orderBy(asc(lessons.order));

  return {
    ...course,
    lessons: courseLessons,
  };
}

async function getUserEnrollment(courseId: string, clerkUserId: string | null) {
  if (!clerkUserId) return null;

  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUserId),
  });

  if (!user) return null;

  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.userId, user.id),
      eq(enrollments.courseId, courseId)
    ),
  });

  return enrollment;
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();

  const [course, enrollment] = await Promise.all([
    getCourseWithLessons(id),
    getUserEnrollment(id, userId),
  ]);

  if (!course) {
    notFound();
  }

  const firstLessonId = course.lessons[0]?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Tiny LMS
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              href="/courses"
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              강좌
            </Link>
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                로그인
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                회원가입
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/courses" className="hover:text-gray-700">
            강좌
          </Link>
          {" / "}
          <span className="text-gray-900">{course.title}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Course Info */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-lg bg-white shadow">
              {course.thumbnailUrl ? (
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-64 items-center justify-center bg-gray-100">
                  <span className="text-6xl">📚</span>
                </div>
              )}
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {course.title}
                </h1>
                {course.instructor && (
                  <p className="mt-2 text-sm text-gray-500">
                    강사: {course.instructor.name || "미정"}
                  </p>
                )}
                {course.description && (
                  <p className="mt-4 whitespace-pre-wrap text-gray-600">
                    {course.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lessons List */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900">
                강의 목록 ({course.lessons.length}개)
              </h2>

              {course.lessons.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  아직 강의가 없습니다.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {course.lessons.map((lesson, index) => (
                    <li key={lesson.id}>
                      <div className="flex items-start space-x-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50">
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {lesson.title}
                          </h3>
                          {lesson.videoUrl && (
                            <span className="text-xs text-indigo-600">
                              동영상
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6">
                <EnrollmentButton
                  courseId={course.id}
                  enrollment={enrollment ? { id: enrollment.id, status: enrollment.status } : null}
                  isSignedIn={!!userId}
                  firstLessonId={firstLessonId}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lesson Content Preview */}
        {course.lessons.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 text-xl font-bold text-gray-900">강의 미리보기</h2>
            <div className="space-y-6">
              {course.lessons.slice(0, 2).map((lesson, index) => {
                const embedUrl = lesson.videoUrl
                  ? getEmbedUrl(lesson.videoUrl)
                  : null;

                return (
                  <div
                    key={lesson.id}
                    className="overflow-hidden rounded-lg bg-white shadow"
                  >
                    <div className="border-b bg-gray-50 px-6 py-4">
                      <h3 className="font-medium text-gray-900">
                        {index + 1}. {lesson.title}
                      </h3>
                    </div>
                    <div className="p-6">
                      {embedUrl && (
                        <div className="mb-4 aspect-video overflow-hidden rounded-lg">
                          <iframe
                            src={embedUrl}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                      {lesson.content && (
                        <div className="prose prose-sm max-w-none text-gray-600">
                          {lesson.content}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
          <p>Tiny LMS - 교회 학습 관리 시스템</p>
        </div>
      </footer>
    </div>
  );
}
