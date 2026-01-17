import { notFound } from "next/navigation";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses, lessons } from "@/db";
import { eq, asc, count } from "drizzle-orm";
import CourseForm from "@/components/admin/CourseForm";

export const runtime = "edge";

async function getCourse(id: string) {
  const { env } = await getCloudflareContext();
  const db = getDb(env.DB);

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, id),
  });

  if (!course) return null;

  const courseLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.courseId, id))
    .orderBy(asc(lessons.order));

  const lessonCount = await db
    .select({ count: count() })
    .from(lessons)
    .where(eq(lessons.courseId, id));

  return {
    ...course,
    lessons: courseLessons,
    lessonCount: lessonCount[0]?.count ?? 0,
  };
}

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getCourse(id);

  if (!course) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">강좌 편집</h1>
        <p className="mt-2 text-sm text-gray-700">강좌 정보를 수정합니다.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <CourseForm course={course} mode="edit" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">레슨 관리</h2>
            <p className="mt-1 text-sm text-gray-500">
              {course.lessonCount}개의 레슨
            </p>
            <Link
              href={`/admin/courses/${course.id}/lessons`}
              className="mt-4 block w-full rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-500"
            >
              레슨 관리하기
            </Link>
          </div>

          {course.lessons.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="text-sm font-medium text-gray-900">레슨 목록</h3>
              <ul className="mt-3 space-y-2">
                {course.lessons.slice(0, 5).map((lesson, index) => (
                  <li key={lesson.id} className="text-sm text-gray-600">
                    {index + 1}. {lesson.title}
                  </li>
                ))}
                {course.lessons.length > 5 && (
                  <li className="text-sm text-gray-400">
                    외 {course.lessons.length - 5}개...
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
