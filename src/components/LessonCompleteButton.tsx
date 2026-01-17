"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LessonCompleteButtonProps {
  lessonId: string;
  completed: boolean;
  nextLessonUrl: string | null;
}

export default function LessonCompleteButton({
  lessonId,
  completed: initialCompleted,
  nextLessonUrl,
}: LessonCompleteButtonProps) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lessonId,
          completed: !completed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update progress");
      }

      const data = (await response.json()) as { progress: { completed: boolean } };
      setCompleted(data.progress.completed);
      router.refresh();

      // If completing and there's a next lesson, navigate after a short delay
      if (!completed && nextLessonUrl) {
        setTimeout(() => {
          router.push(nextLessonUrl);
        }, 500);
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center space-x-4">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`inline-flex items-center rounded-md px-6 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
          completed
            ? "bg-green-100 text-green-800 hover:bg-green-200"
            : "bg-indigo-600 text-white hover:bg-indigo-500"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center">
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            처리 중...
          </span>
        ) : completed ? (
          <>
            <svg
              className="mr-2 h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            완료됨 (클릭하여 취소)
          </>
        ) : (
          <>
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            완료로 표시하기
          </>
        )}
      </button>
    </div>
  );
}
