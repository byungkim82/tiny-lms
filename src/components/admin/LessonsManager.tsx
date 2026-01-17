"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Lesson } from "@/db/schema";

type LessonsManagerProps = {
  courseId: string;
  initialLessons: Lesson[];
};

type LessonFormData = {
  id?: string;
  title: string;
  content: string;
  videoUrl: string;
};

export default function LessonsManager({
  courseId,
  initialLessons,
}: LessonsManagerProps) {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<LessonFormData>({
    title: "",
    content: "",
    videoUrl: "",
  });

  const resetForm = () => {
    setFormData({ title: "", content: "", videoUrl: "" });
    setEditingLesson(null);
    setIsCreating(false);
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "레슨 생성에 실패했습니다");
      }

      const newLesson = (await response.json()) as Lesson;
      setLessons([...lessons, newLesson]);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}/lessons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: editingLesson.id }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "레슨 수정에 실패했습니다");
      }

      const updatedLesson = (await response.json()) as Lesson;
      setLessons(
        lessons.map((l) => (l.id === updatedLesson.id ? updatedLesson : l))
      );
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm("정말로 이 레슨을 삭제하시겠습니까?")) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/courses/${courseId}/lessons?lessonId=${lessonId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "레슨 삭제에 실패했습니다");
      }

      setLessons(lessons.filter((l) => l.id !== lessonId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      content: lesson.content || "",
      videoUrl: lesson.videoUrl || "",
    });
    setIsCreating(false);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Lesson List */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              레슨 목록 ({lessons.length}개)
            </h2>
            <button
              onClick={startCreate}
              disabled={isCreating || editingLesson !== null}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              레슨 추가
            </button>
          </div>
        </div>

        {lessons.length === 0 && !isCreating ? (
          <div className="p-6 text-center text-gray-500">
            아직 레슨이 없습니다. 첫 번째 레슨을 추가해보세요.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {lessons.map((lesson, index) => (
              <li key={lesson.id} className="px-6 py-4">
                {editingLesson?.id === lesson.id ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      placeholder="레슨 제목"
                    />
                    <textarea
                      rows={3}
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      placeholder="레슨 내용 (마크다운 지원)"
                    />
                    <input
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, videoUrl: e.target.value })
                      }
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      placeholder="동영상 URL (YouTube/Vimeo)"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {isSubmitting ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {lesson.title}
                        </h3>
                        {lesson.videoUrl && (
                          <span className="text-xs text-indigo-600">
                            동영상 포함
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEdit(lesson)}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => handleDelete(lesson.id)}
                        disabled={isSubmitting}
                        className="text-sm text-red-600 hover:text-red-500"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Create New Lesson Form */}
        {isCreating && (
          <div className="border-t border-gray-200 px-6 py-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">새 레슨</h3>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                placeholder="레슨 제목"
              />
              <textarea
                rows={3}
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                placeholder="레슨 내용 (마크다운 지원)"
              />
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, videoUrl: e.target.value })
                }
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                placeholder="동영상 URL (YouTube/Vimeo)"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {isSubmitting ? "추가 중..." : "레슨 추가"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
