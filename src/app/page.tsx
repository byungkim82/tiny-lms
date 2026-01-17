import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses } from "@/db";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";


async function getPublishedCourses() {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  return db
    .select()
    .from(courses)
    .where(eq(courses.status, "published"))
    .orderBy(desc(courses.createdAt))
    .limit(3);
}

export default async function HomePage() {
  const featuredCourses = await getPublishedCourses();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
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

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-indigo-50 to-white py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            신학과 성경을 배우는
            <br />
            <span className="text-indigo-600">가장 쉬운 방법</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            교회 성도들을 위한 온라인 학습 플랫폼입니다.
            <br />
            체계적인 강좌를 통해 하나님의 말씀을 깊이 있게 배워보세요.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/courses"
              className="rounded-md bg-indigo-600 px-6 py-3 text-base font-medium text-white hover:bg-indigo-500"
            >
              강좌 둘러보기
            </Link>
            <SignedOut>
              <Link
                href="/sign-up"
                className="rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                회원가입
              </Link>
            </SignedOut>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      {featuredCourses.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900">추천 강좌</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCourses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-lg"
                >
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-gray-100">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                        {course.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/courses"
                className="text-indigo-600 hover:text-indigo-500"
              >
                모든 강좌 보기 →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
          <p>Tiny LMS - 교회 학습 관리 시스템</p>
        </div>
      </footer>
    </div>
  );
}
