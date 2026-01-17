import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, enrollments } from "@/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface EnrollmentWithDetails {
  id: string;
  status: string;
  enrolledAt: Date | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  course: {
    id: string;
    title: string;
  };
  progress: {
    completed: number;
    total: number;
    percent: number;
  };
}

async function getAllEnrollments(): Promise<EnrollmentWithDetails[]> {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  const allEnrollments = await db.query.enrollments.findMany({
    with: {
      user: true,
      course: {
        with: {
          lessons: true,
        },
      },
      lessonProgress: true,
    },
    orderBy: [desc(enrollments.enrolledAt)],
  });

  return allEnrollments.map((enrollment) => {
    const totalLessons = enrollment.course.lessons.length;
    const completedLessons = enrollment.lessonProgress.filter((p) => p.completed).length;

    return {
      id: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      user: {
        id: enrollment.user.id,
        email: enrollment.user.email,
        name: enrollment.user.name,
      },
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
      },
      progress: {
        completed: completedLessons,
        total: totalLessons,
        percent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      },
    };
  });
}

export default async function AdminEnrollmentsPage() {
  const enrollmentList = await getAllEnrollments();

  const activeCount = enrollmentList.filter((e) => e.status === "active").length;
  const completedCount = enrollmentList.filter((e) => e.status === "completed").length;
  const droppedCount = enrollmentList.filter((e) => e.status === "dropped").length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">수강 관리</h1>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">전체</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">
            {enrollmentList.length}
          </dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">학습 중</dt>
          <dd className="mt-1 text-3xl font-semibold text-blue-600">{activeCount}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">완료</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{completedCount}</dd>
        </div>
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">취소</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-400">{droppedCount}</dd>
        </div>
      </div>

      {/* Table */}
      <div className="mt-8 overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                학생
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                강좌
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                진도
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                등록일
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {enrollmentList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  아직 수강 등록이 없습니다.
                </td>
              </tr>
            ) : (
              enrollmentList.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {enrollment.user.name || "이름 없음"}
                      </div>
                      <div className="text-sm text-gray-500">{enrollment.user.email}</div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      href={`/admin/courses/${enrollment.course.id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-900"
                    >
                      {enrollment.course.title}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={enrollment.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-24">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className={`h-full ${
                              enrollment.progress.percent === 100
                                ? "bg-green-500"
                                : "bg-indigo-600"
                            }`}
                            style={{ width: `${enrollment.progress.percent}%` }}
                          />
                        </div>
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        {enrollment.progress.completed}/{enrollment.progress.total} (
                        {enrollment.progress.percent}%)
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {enrollment.enrolledAt
                      ? new Date(enrollment.enrolledAt).toLocaleDateString("ko-KR")
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    dropped: "bg-gray-100 text-gray-800",
  };

  const labels = {
    active: "학습 중",
    completed: "완료",
    dropped: "취소",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        styles[status as keyof typeof styles] || styles.active
      }`}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}
