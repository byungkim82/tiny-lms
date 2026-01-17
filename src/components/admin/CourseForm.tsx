"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/db/schema";

type CourseFormData = {
  title: string;
  description: string;
  thumbnailUrl: string;
  status: "draft" | "published" | "archived";
};

type CourseFormProps = {
  course?: Course;
  mode: "create" | "edit";
};

export default function CourseForm({ course, mode }: CourseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CourseFormData>({
    title: course?.title || "",
    description: course?.description || "",
    thumbnailUrl: course?.thumbnailUrl || "",
    status: course?.status || "draft",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        mode === "create" ? "/api/courses" : `/api/courses/${course?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "요청 처리에 실패했습니다");
      }

      const data = (await response.json()) as { id: string };

      if (mode === "create") {
        router.push(`/admin/courses/${data.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!course) return;
    if (!confirm("정말로 이 강좌를 삭제하시겠습니까?")) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "삭제에 실패했습니다");
      }

      router.push("/admin/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700"
        >
          강좌 제목 *
        </label>
        <input
          type="text"
          id="title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          placeholder="강좌 제목을 입력하세요"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          설명
        </label>
        <textarea
          id="description"
          rows={4}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          placeholder="강좌에 대한 설명을 입력하세요"
        />
      </div>

      <div>
        <label
          htmlFor="thumbnailUrl"
          className="block text-sm font-medium text-gray-700"
        >
          썸네일 URL
        </label>
        <input
          type="url"
          id="thumbnailUrl"
          value={formData.thumbnailUrl}
          onChange={(e) =>
            setFormData({ ...formData, thumbnailUrl: e.target.value })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-medium text-gray-700"
        >
          상태
        </label>
        <select
          id="status"
          value={formData.status}
          onChange={(e) =>
            setFormData({
              ...formData,
              status: e.target.value as CourseFormData["status"],
            })
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        >
          <option value="draft">초안</option>
          <option value="published">공개</option>
          <option value="archived">보관됨</option>
        </select>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div>
          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              삭제
            </button>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting
              ? "처리 중..."
              : mode === "create"
                ? "강좌 만들기"
                : "저장"}
          </button>
        </div>
      </div>
    </form>
  );
}
