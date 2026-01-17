import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses } from "@/db";
import { eq, desc } from "drizzle-orm";

export const runtime = "edge";

async function getPublishedCourses() {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  return db
    .select()
    .from(courses)
    .where(eq(courses.status, "published"))
    .orderBy(desc(courses.createdAt));
}

export default async function CoursesPage() {
  const allCourses = await getPublishedCourses();

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
              className="text-sm font-medium text-indigo-600"
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">모든 강좌</h1>
          <p className="mt-2 text-gray-600">
            체계적인 강좌를 통해 신앙의 깊이를 더해보세요.
          </p>
        </div>

        {allCourses.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <p className="text-gray-500">아직 공개된 강좌가 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="group overflow-hidden rounded-lg bg-white shadow transition hover:shadow-lg"
              >
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-gray-100">
                    <span className="text-5xl">📚</span>
                  </div>
                )}
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                    {course.title}
                  </h2>
                  {course.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                      {course.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
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
