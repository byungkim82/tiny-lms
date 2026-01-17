"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EnrollmentButtonProps {
  courseId: string;
  enrollment: {
    id: string;
    status: string;
  } | null;
  isSignedIn: boolean;
  firstLessonId?: string;
}

export default function EnrollmentButton({
  courseId,
  enrollment,
  isSignedIn,
  firstLessonId,
}: EnrollmentButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "수강 등록에 실패했습니다");
      }

      router.refresh();
      if (firstLessonId) {
        router.push(`/learn/${courseId}/${firstLessonId}`);
      } else {
        router.push("/my-learning");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "수강 등록에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <Link
        href="/sign-in"
        className="block w-full rounded-md bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-indigo-500"
      >
        로그인하여 수강하기
      </Link>
    );
  }

  if (enrollment?.status === "active") {
    return (
      <div className="space-y-3">
        {firstLessonId ? (
          <Link
            href={`/learn/${courseId}/${firstLessonId}`}
            className="block w-full rounded-md bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-indigo-500"
          >
            이어서 학습하기
          </Link>
        ) : (
          <span className="block w-full rounded-md bg-gray-400 px-4 py-3 text-center text-sm font-medium text-white">
            아직 레슨이 없습니다
          </span>
        )}
        <Link
          href="/my-learning"
          className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          내 학습으로 가기
        </Link>
      </div>
    );
  }

  if (enrollment?.status === "completed") {
    return (
      <div className="space-y-3">
        <span className="block w-full rounded-md bg-green-600 px-4 py-3 text-center text-sm font-medium text-white">
          수강 완료
        </span>
        {firstLessonId && (
          <Link
            href={`/learn/${courseId}/${firstLessonId}`}
            className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            다시 학습하기
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleEnroll}
        disabled={isLoading}
        className="block w-full rounded-md bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
      >
        {isLoading ? "등록 중..." : "수강 신청하기"}
      </button>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
