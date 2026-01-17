import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses } from "@/db";
import { desc } from "drizzle-orm";

export const runtime = "edge";

async function getCourses() {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

function getStatusBadge(status: string) {
  const styles = {
    draft: "bg-gray-100 text-gray-800",
    published: "bg-green-100 text-green-800",
    archived: "bg-yellow-100 text-yellow-800",
  };
  const labels = {
    draft: "초안",
    published: "공개",
    archived: "보관됨",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}

export default async function AdminCoursesPage() {
  const allCourses = await getCourses();

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-bold text-gray-900">강좌 관리</h1>
          <p className="mt-2 text-sm text-gray-700">
            모든 강좌를 관리하고 새로운 강좌를 추가할 수 있습니다.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/admin/courses/new"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            강좌 추가
          </Link>
        </div>
      </div>

      <div className="mt-8">
        {allCourses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">아직 강좌가 없습니다.</p>
            <Link
              href="/admin/courses/new"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-500"
            >
              첫 번째 강좌 만들기
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden bg-white shadow sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {allCourses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/admin/courses/${course.id}`}
                    className="block hover:bg-gray-50"
                  >
                    <div className="flex items-center px-4 py-4 sm:px-6">
                      <div className="flex min-w-0 flex-1 items-center">
                        {course.thumbnailUrl ? (
                          <div className="flex-shrink-0">
                            <img
                              className="h-16 w-24 rounded object-cover"
                              src={course.thumbnailUrl}
                              alt={course.title}
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded bg-gray-200">
                            <span className="text-2xl">📚</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1 px-4">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-indigo-600">
                              {course.title}
                            </p>
                            {getStatusBadge(course.status)}
                          </div>
                          {course.description && (
                            <p className="mt-1 truncate text-sm text-gray-500">
                              {course.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-5 flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
