import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, users, enrollments } from "@/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface EnrollmentWithProgress {
  id: string;
  status: string;
  enrolledAt: Date | null;
  course: {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    instructor: {
      name: string | null;
    } | null;
    lessonCount: number;
  };
  progress: {
    completed: number;
    total: number;
    percent: number;
  };
}

async function getMyEnrollments(clerkUserId: string): Promise<EnrollmentWithProgress[]> {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkUserId),
  });

  if (!user) return [];

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

  return userEnrollments
    .filter((e) => e.status !== "dropped")
    .map((enrollment) => {
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
}

export default async function MyLearningPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const enrolledCourses = await getMyEnrollments(userId);
  const activeCourses = enrolledCourses.filter((e) => e.status === "active");
  const completedCourses = enrolledCourses.filter((e) => e.status === "completed");

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
            <Link
              href="/my-learning"
              className="text-sm font-medium text-indigo-600"
            >
              내 학습
            </Link>
            <UserButton afterSignOutUrl="/" />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">내 학습</h1>

        {enrolledCourses.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-6xl">📚</div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">
              아직 수강 중인 강좌가 없습니다
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              새로운 강좌를 찾아 학습을 시작해보세요.
            </p>
            <Link
              href="/courses"
              className="mt-6 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              강좌 둘러보기
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-12">
            {/* Active Courses */}
            {activeCourses.length > 0 && (
              <section>
                <h2 className="text-lg font-medium text-gray-900">
                  학습 중인 강좌 ({activeCourses.length})
                </h2>
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {activeCourses.map((enrollment) => (
                    <CourseCard key={enrollment.id} enrollment={enrollment} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Courses */}
            {completedCourses.length > 0 && (
              <section>
                <h2 className="text-lg font-medium text-gray-900">
                  완료한 강좌 ({completedCourses.length})
                </h2>
                <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {completedCourses.map((enrollment) => (
                    <CourseCard key={enrollment.id} enrollment={enrollment} />
                  ))}
                </div>
              </section>
            )}
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

function CourseCard({ enrollment }: { enrollment: EnrollmentWithProgress }) {
  const { course, progress } = enrollment;

  return (
    <Link
      href={`/learn/${course.id}`}
      className="group overflow-hidden rounded-lg bg-white shadow transition hover:shadow-md"
    >
      {course.thumbnailUrl ? (
        <img
          src={course.thumbnailUrl}
          alt={course.title}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-40 items-center justify-center bg-gray-100">
          <span className="text-4xl">📚</span>
        </div>
      )}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 group-hover:text-indigo-600">
          {course.title}
        </h3>
        {course.instructor && (
          <p className="mt-1 text-sm text-gray-500">
            강사: {course.instructor.name || "미정"}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {progress.completed} / {progress.total} 레슨
            </span>
            <span className="font-medium text-indigo-600">{progress.percent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        {enrollment.status === "completed" && (
          <div className="mt-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            완료됨
          </div>
        )}
      </div>
    </Link>
  );
}
