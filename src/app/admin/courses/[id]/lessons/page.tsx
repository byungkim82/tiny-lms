import { notFound } from "next/navigation";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, courses, lessons } from "@/db";
import { eq, asc } from "drizzle-orm";
import LessonsManager from "@/components/admin/LessonsManager";

export const dynamic = "force-dynamic";


async function getCourseWithLessons(id: string) {
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

  return {
    ...course,
    lessons: courseLessons,
  };
}

export default async function LessonsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await getCourseWithLessons(id);

  if (!course) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <nav className="text-sm text-gray-500">
          <Link href="/admin/courses" className="hover:text-gray-700">
            강좌 관리
          </Link>
          {" / "}
          <Link
            href={`/admin/courses/${course.id}`}
            className="hover:text-gray-700"
          >
            {course.title}
          </Link>
          {" / "}
          <span className="text-gray-900">레슨</span>
        </nav>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">레슨 관리</h1>
        <p className="mt-2 text-sm text-gray-700">
          강좌 &quot;{course.title}&quot;의 레슨을 관리합니다.
        </p>
      </div>

      <LessonsManager courseId={course.id} initialLessons={course.lessons} />
    </div>
  );
}
