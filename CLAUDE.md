# Tiny LMS - 교회 학습 관리 시스템

## 프로젝트 개요

교회 기반 온라인 학습 관리 시스템(LMS)입니다. 강좌 생성, 수강 등록, 진도 추적 기능을 제공합니다.

## 기술 스택

| 항목 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 + React 19 + TypeScript |
| 데이터베이스 | Cloudflare D1 (SQLite) + Drizzle ORM |
| 인증 | Clerk (@clerk/nextjs) |
| 스토리지 | Cloudflare R2 |
| 스타일링 | Tailwind CSS 4.0 |
| 배포 | Cloudflare Pages (OpenNext) |

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/              # 인증 페이지 (sign-in, sign-up)
│   ├── (protected)/         # 로그인 필요 페이지
│   │   ├── learn/           # 학습 뷰어
│   │   └── my-learning/     # 내 학습 대시보드
│   ├── (public)/            # 공개 페이지
│   │   └── courses/         # 강좌 목록/상세
│   ├── admin/               # 관리자 페이지
│   │   ├── courses/         # 강좌 관리
│   │   └── enrollments/     # 수강 관리
│   └── api/                 # API 라우트
│       ├── courses/         # 강좌 CRUD
│       ├── enrollments/     # 수강 등록
│       ├── progress/        # 진도 추적
│       ├── upload/          # 파일 업로드
│       └── webhooks/        # Clerk 웹훅
├── components/              # React 컴포넌트
│   ├── admin/               # 관리자 컴포넌트
│   └── *.tsx                # 공통 컴포넌트
├── db/
│   ├── schema.ts            # Drizzle 스키마
│   └── index.ts             # DB 연결
├── lib/
│   └── utils.ts             # 유틸리티 함수
└── middleware.ts            # 라우트 보호
```

## 데이터베이스 스키마

### 테이블 구조

- **users**: 사용자 (Clerk 동기화)
- **courses**: 강좌
- **lessons**: 레슨 (강좌에 속함)
- **enrollments**: 수강 등록
- **lessonProgress**: 레슨별 진도

### 주요 관계

```
users 1:N courses (instructor)
users 1:N enrollments
courses 1:N lessons
courses 1:N enrollments
enrollments 1:N lessonProgress
lessons 1:N lessonProgress
```

## 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# Cloudflare 로컬 개발
npm run cf:dev

# 빌드
npm run build

# 타입 체크
npx tsc --noEmit

# DB 마이그레이션 생성
npm run db:generate

# DB 마이그레이션 적용 (로컬)
npm run db:migrate:local

# DB 마이그레이션 적용 (원격)
npm run db:migrate:remote
```

## API 패턴

### 인증 체크

```typescript
import { auth } from "@clerk/nextjs/server";

const { userId } = await auth();
if (!userId) {
  return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
}
```

### DB 접근

```typescript
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";

const { env } = await getCloudflareContext();
const db = getDb(env.DB);
```

### 사용자 조회 (Clerk ID → DB User)

```typescript
const user = await db.query.users.findFirst({
  where: eq(users.clerkId, userId),
});
```

## 역할 (Roles)

- **admin**: 관리자 - 강좌/레슨 CRUD, 수강생 관리
- **student**: 학생 - 수강 등록, 학습

역할은 Clerk 메타데이터와 DB users 테이블에 저장됩니다.

## 라우트 보호

- `/admin/*`: admin 역할 필요
- `/my-learning`, `/learn/*`: 로그인 필요
- `/courses/*`: 공개

## 코드 컨벤션

### 언어

- UI 텍스트: 한국어
- 코드/변수명: 영어
- 주석: 한국어 또는 영어

### 컴포넌트

- Server Component 기본 사용
- 인터랙션 필요시 "use client" 사용
- 파일명: PascalCase (예: LessonSidebar.tsx)

### API

- Zod로 입력 검증
- 에러 메시지 한국어로 반환
- RESTful 패턴 준수

### ID 생성

```typescript
import { generateId } from "@/lib/utils";
const id = generateId(); // nanoid(12)
```

## 환경 변수

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Cloudflare (wrangler.jsonc에서 설정)
# DB, R2_BUCKET
```

## 주의사항

1. Server Component에서 auth는 `@clerk/nextjs/server`에서 import
2. Client Component에서 useAuth는 `@clerk/nextjs`에서 import
3. DB 스키마 변경 시 마이그레이션 필요
4. 이미지는 R2에 업로드 후 `/api/files/[...path]`로 서빙
