import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses, users, enrollments } from "@/db";
import { count, eq } from "drizzle-orm";

export const runtime = "edge";

async function getStats() {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  const [coursesCount, studentsCount, enrollmentsCount] = await Promise.all([
    db.select({ count: count() }).from(courses),
    db.select({ count: count() }).from(users).where(eq(users.role, "student")),
    db.select({ count: count() }).from(enrollments),
  ]);

  return {
    courses: coursesCount[0]?.count ?? 0,
    students: studentsCount[0]?.count ?? 0,
    enrollments: enrollmentsCount[0]?.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            총 강좌 수
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.courses}
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            총 학생 수
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.students}
          </dd>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">
            총 수강 등록
          </dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">
            {stats.enrollments}
          </dd>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">빠른 작업</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            href="/admin/courses/new"
            className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400"
          >
            <div>
              <span className="text-2xl">+</span>
              <p className="mt-2 text-sm font-medium text-gray-900">
                새 강좌 만들기
              </p>
            </div>
          </Link>

          <Link
            href="/admin/courses"
            className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-gray-400"
          >
            <div>
              <span className="text-2xl">📚</span>
              <p className="mt-2 text-sm font-medium text-gray-900">
                강좌 관리하기
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
