"use client";

import Link from "next/link";
import { useState } from "react";

interface Lesson {
  id: string;
  title: string;
  completed: boolean;
  videoUrl: string | null;
}

interface LessonSidebarProps {
  courseId: string;
  lessons: Lesson[];
  currentLessonId: string;
}

export default function LessonSidebar({
  courseId,
  lessons,
  currentLessonId,
}: LessonSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed bottom-4 left-4 z-50 rounded-full bg-indigo-600 p-3 text-white shadow-lg lg:hidden"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isCollapsed ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-white shadow-lg transition-transform lg:relative lg:translate-x-0 ${
          isCollapsed ? "-translate-x-full" : "translate-x-0"
        }`}
        style={{ top: "57px" }}
      >
        <div className="flex h-full flex-col">
          <div className="border-b px-4 py-3">
            <h2 className="font-medium text-gray-900">강의 목록</h2>
            <p className="mt-1 text-sm text-gray-500">
              {lessons.filter((l) => l.completed).length} / {lessons.length} 완료
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-gray-100">
              {lessons.map((lesson, index) => {
                const isCurrent = lesson.id === currentLessonId;

                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/learn/${courseId}/${lesson.id}`}
                      onClick={() => setIsCollapsed(true)}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                        isCurrent
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {/* Status icon */}
                      <span
                        className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                          lesson.completed
                            ? "bg-green-100 text-green-600"
                            : isCurrent
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {lesson.completed ? (
                          <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>

                      {/* Lesson info */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            isCurrent ? "text-indigo-600" : ""
                          }`}
                        >
                          {lesson.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          {lesson.videoUrl && (
                            <span className="flex items-center">
                              <svg
                                className="mr-1 h-3 w-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                              동영상
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsCollapsed(true)}
          style={{ top: "57px" }}
        />
      )}
    </>
  );
}
