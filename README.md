# LAYERARY

펜타시큐리티 디자인 자산 관리 포털 사이트

## 프로젝트 개요

사용자가 펜타시큐리티의 디자인 작업물을 리뷰하고, 필요한 리소스(CI/BI, ICON, PPT 템플릿 등)를 검색, 편집, 및 다운로드할 수 있는 중앙 집중식 플랫폼입니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Backend**: Next.js API Routes / Server Actions
- **Database**: Supabase (PostgreSQL)
- **Storage**: Backblaze B2
- **ORM**: Prisma
- **Auth**: NextAuth.js (Auth.js)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일을 생성하고 `env.example.txt` 파일을 참고하여 필요한 환경 변수를 설정하세요.

```bash
# .env.local 파일 생성
cp env.example.txt .env.local
```

필수 환경 변수:
- `DATABASE_URL`: Supabase PostgreSQL 연결 URL
- `NEXTAUTH_URL`: 애플리케이션 URL
- `NEXTAUTH_SECRET`: NextAuth 시크릿 키
- `B2_APPLICATION_KEY_ID`: Backblaze B2 키 ID
- `B2_APPLICATION_KEY`: Backblaze B2 애플리케이션 키
- `B2_BUCKET_ID`: Backblaze B2 버킷 ID
- `B2_BUCKET_NAME`: Backblaze B2 버킷 이름
- `B2_ENDPOINT`: Backblaze B2 엔드포인트

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
layerary/
├── app/                    # Next.js App Router
├── components/             # React 컴포넌트
│   ├── ui/                # Shadcn UI 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   ├── posts/             # 게시물 관련 컴포넌트
│   ├── search/            # 검색 컴포넌트
│   ├── editor/            # SVG 편집기 컴포넌트
│   └── admin/             # 관리자 컴포넌트
├── lib/                   # 유틸리티 및 설정
├── types/                 # TypeScript 타입 정의
├── hooks/                 # Custom React Hooks
├── prisma/                # Prisma 스키마 및 마이그레이션
├── public/                # 정적 파일
└── design_resources/      # 디자인 리소스 (보존됨)
```

## 개발 계획

상세한 개발 계획은 `design_resources/detailed_dev_plan.md` 파일을 참고하세요.

## 스크립트

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run start`: 프로덕션 서버 실행
- `npm run lint`: ESLint 실행

## 라이선스

Private

