import CourseForm from "@/components/admin/CourseForm";

export default function NewCoursePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">새 강좌 만들기</h1>
        <p className="mt-2 text-sm text-gray-700">
          새로운 강좌의 기본 정보를 입력하세요.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <CourseForm mode="create" />
      </div>
    </div>
  );
}
