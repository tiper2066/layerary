# LAYERARY 프로젝트 상세 개발 계획서

## 📋 목차
1. 프로젝트 구조 설계
2. 데이터베이스 스키마 설계
3. 개발 단계별 계획
4. 기술 구현 상세
5. 파일 구조
6. API 설계
7. 보안 및 성능 고려사항

---

## 1. 프로젝트 구조 설계

### 1.1 디렉토리 구조
```
layerary/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 관련 라우트 그룹
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/              # 대시보드 라우트 그룹
│   │   ├── admin/                # 관리자 페이지
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   └── notices/
│   │   ├── profile/              # 사용자 프로필
│   │   └── layout.tsx            # Sidebar 포함 레이아웃
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/
│   │   ├── posts/
│   │   ├── upload/
│   │   ├── download/
│   │   └── search/
│   ├── work/                     # WORK 카테고리
│   │   └── penta-design/
│   ├── source/                   # SOURCE 카테고리
│   │   ├── ci-bi/
│   │   ├── icon/
│   │   ├── character/
│   │   └── diagram/
│   ├── template/                 # TEMPLATE 카테고리
│   │   ├── ppt/
│   │   ├── card/
│   │   ├── wallpaper/
│   │   └── welcome-board/
│   ├── brochure/                 # BROCHURE 카테고리
│   │   ├── wapples/
│   │   ├── damo/
│   │   ├── isign/
│   │   └── cloudbric/
│   ├── layout.tsx                # 루트 레이아웃 (Header 포함)
│   ├── page.tsx                  # 홈 페이지
│   └── globals.css
├── components/                   # React 컴포넌트
│   ├── ui/                       # Shadcn UI 컴포넌트
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Navigation.tsx
│   ├── posts/
│   │   ├── PostGrid.tsx
│   │   ├── PostCard.tsx
│   │   ├── PostDetailDialog.tsx
│   │   └── PostUploadForm.tsx
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   └── AdvancedSearch.tsx
│   ├── editor/                   # SVG 편집기
│   │   ├── SvgEditor.tsx
│   │   ├── ColorPicker.tsx
│   │   └── SizeControl.tsx
│   └── admin/
│       ├── Dashboard.tsx
│       ├── UserManagement.tsx
│       └── NoticeManagement.tsx
├── lib/                          # 유틸리티 및 설정
│   ├── prisma.ts                 # Prisma 클라이언트
│   ├── auth.ts                   # NextAuth 설정
│   ├── b2.ts                     # Backblaze B2 클라이언트
│   ├── utils.ts
│   └── constants.ts
├── types/                        # TypeScript 타입 정의
│   ├── post.ts
│   ├── user.ts
│   └── category.ts
├── hooks/                        # Custom React Hooks
│   ├── usePosts.ts
│   ├── useSearch.ts
│   └── useSvgEditor.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/                       # 정적 파일
│   └── images/
├── .env.local                    # 환경 변수
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. 데이터베이스 스키마 설계

### 2.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  MEMBER
}

enum CategoryType {
  WORK
  SOURCE
  TEMPLATE
  BROCHURE
  ADMIN
  ETC
}

enum PostStatus {
  PUBLISHED
  DRAFT
  ARCHIVED
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String    // hashed
  avatar        String?   // Backblaze B2 URL
  role          UserRole  @default(MEMBER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  posts         Post[]    @relation("PostAuthor")
  updatedPosts  Post[]    @relation("PostUpdater")
  
  @@map("users")
}

model Category {
  id          String      @id @default(cuid())
  name        String      // "Penta Design", "CI/BI", "PPT" 등
  slug        String      @unique // URL-friendly identifier
  type        CategoryType
  parentId    String?     // 상위 카테고리 (null이면 최상위)
  order       Int         @default(0) // 정렬 순서
  description String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  
  parent      Category?   @relation("CategoryParent", fields: [parentId], references: [id])
  children    Category[]  @relation("CategoryParent")
  posts       Post[]
  
  @@map("categories")
}

model Post {
  id            String      @id @default(cuid())
  title         String
  description   String?
  thumbnailUrl  String?     // 썸네일 이미지 URL (Backblaze B2)
  fileUrl       String      // 원본 파일 URL (Backblaze B2)
  fileSize      Int         // 파일 크기 (bytes)
  fileType      String      // "image/png", "application/zip" 등
  mimeType      String?     // MIME 타입
  categoryId    String
  status        PostStatus  @default(PUBLISHED)
  isEditable    Boolean     @default(false) // SVG 편집 가능 여부
  viewCount     Int         @default(0)
  downloadCount Int         @default(0)
  
  authorId      String
  author        User        @relation("PostAuthor", fields: [authorId], references: [id])
  updatedById   String?
  updatedBy     User?       @relation("PostUpdater", fields: [updatedById], references: [id])
  
  category      Category    @relation(fields: [categoryId], references: [id])
  
  tags          PostTag[]
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  @@index([categoryId])
  @@index([status])
  @@index([createdAt])
  @@map("posts")
}

model Tag {
  id        String    @id @default(cuid())
  name      String    @unique
  slug      String    @unique
  createdAt DateTime  @default(now())
  
  posts     PostTag[]
  
  @@map("tags")
}

model PostTag {
  id        String   @id @default(cuid())
  postId    String
  tagId     String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  
  @@unique([postId, tagId])
  @@map("post_tags")
}

model Notice {
  id          String    @id @default(cuid())
  title       String
  content     String    // Markdown 지원
  isImportant Boolean   @default(false)
  viewCount   Int       @default(0)
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("notices")
}
```

---

## 3. 개발 단계별 계획

### Phase 1: 프로젝트 초기 설정 (1-2일)

#### 1.1 Next.js 프로젝트 초기화
- [ ] `npx create-next-app@latest` 실행 (TypeScript, App Router, Tailwind CSS 선택)
- [ ] 프로젝트 구조 생성
- [ ] 기본 설정 파일 구성

#### 1.2 의존성 설치
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "next-auth": "^5.0.0",
    "@auth/prisma-adapter": "^1.0.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "backblaze-b2": "^1.7.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.32.0",
    "react-color": "^2.19.3",
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1",
    "lucide-react": "^0.292.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

#### 1.3 Shadcn UI 설정
- [ ] `npx shadcn-ui@latest init` 실행
- [ ] 필요한 컴포넌트 설치:
  - button, card, dialog, input, select, table, form, avatar, dropdown-menu, sheet (모바일 메뉴용)

#### 1.4 환경 변수 설정
```env
# .env.local
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Backblaze B2
B2_APPLICATION_KEY_ID="..."
B2_APPLICATION_KEY="..."
B2_BUCKET_ID="..."
B2_BUCKET_NAME="..."
B2_ENDPOINT="..."

# Supabase (인증용)
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

---

### Phase 2: 데이터베이스 및 인증 설정 (2-3일)

#### 2.1 Prisma 설정
- [ ] `schema.prisma` 작성
- [ ] Supabase 연결 설정
- [ ] 마이그레이션 실행: `npx prisma migrate dev`
- [ ] Prisma Client 생성: `npx prisma generate`
- [ ] 시드 데이터 작성 (카테고리, 테스트 사용자)

#### 2.2 NextAuth.js 설정
- [ ] `lib/auth.ts` 작성 (Credentials Provider)
- [ ] API Route: `app/api/auth/[...nextauth]/route.ts`
- [ ] 미들웨어: 인증 보호 라우트 설정
- [ ] 세션 관리 유틸리티

#### 2.3 Backblaze B2 설정
- [ ] `lib/b2.ts` 작성 (업로드/다운로드 클라이언트)
- [ ] 파일 업로드 유틸리티
- [ ] 이미지 썸네일 생성 (Sharp 사용)

---

### Phase 3: 레이아웃 및 기본 UI 구성 (3-4일)

#### 3.1 Header 컴포넌트
- [ ] 로고 영역
- [ ] 통합 검색 바
- [ ] 사용자 메뉴 (로그인/로그아웃, 프로필)
- [ ] 반응형 처리

#### 3.2 Sidebar 컴포넌트
- [ ] 네비게이션 메뉴 구조
- [ ] 카테고리별 하위 메뉴 (아코디언/드롭다운)
- [ ] 활성 메뉴 하이라이트
- [ ] 모바일 반응형 (Sheet 컴포넌트)

#### 3.3 루트 레이아웃
- [ ] `app/layout.tsx` 작성
- [ ] Header, Sidebar 통합
- [ ] Content Area 영역 구성
- [ ] 모바일 반응형 레이아웃

#### 3.4 홈 페이지
- [ ] 4개 카테고리 카드 (WORK, SOURCE, TEMPLATE, BROCHURE)
- [ ] 최근 게시물 섹션 (더미 데이터)
- [ ] 공지사항 섹션 (더미 데이터)
- [ ] 카드 클릭 시 해당 카테고리 첫 메뉴로 이동

---

### Phase 4: 게시물 관리 기능 (5-7일)

#### 4.1 게시물 목록 페이지
- [ ] `PostGrid` 컴포넌트 (그리드 레이아웃)
- [ ] `PostCard` 컴포넌트 (썸네일, 제목, 설명)
- [ ] 페이지네이션
- [ ] 무한 스크롤 (선택)
- [ ] 로딩 상태

#### 4.2 게시물 상세 다이얼로그
- [ ] `PostDetailDialog` 컴포넌트
- [ ] 이미지 갤러리
- [ ] 파일 정보 표시
- [ ] 이전/다음 게시물 네비게이션
- [ ] 다운로드 버튼 (권한 체크)
- [ ] 관리자 전용 정보 표시

#### 4.3 게시물 업로드 (관리자)
- [ ] `PostUploadForm` 컴포넌트
- [ ] 파일 업로드 (드래그 앤 드롭)
- [ ] 썸네일 자동 생성
- [ ] 카테고리 선택
- [ ] 메타데이터 입력
- [ ] 업로드 진행 상태 표시
- [ ] Backblaze B2 업로드 연동

#### 4.4 게시물 수정/삭제
- [ ] 수정 폼
- [ ] 삭제 확인 다이얼로그
- [ ] 권한 체크

---

### Phase 5: 검색 기능 (3-4일)

#### 5.1 통합 검색
- [ ] Header 검색 바 기능
- [ ] 실시간 검색 제안
- [ ] 검색 결과 페이지
- [ ] 하이라이트

#### 5.2 상세 검색
- [ ] `AdvancedSearch` 컴포넌트
- [ ] 필터: 범위, 카테고리, 등록기간, 파일 용량
- [ ] 검색 결과 필터링
- [ ] 검색 조건 저장/복원

---

### Phase 6: SVG 편집 기능 (7-10일) ⚠️ Critical

#### 6.1 SVG 편집기 기본 구조
- [ ] `SvgEditor` 컴포넌트
- [ ] SVG DOM 렌더링
- [ ] 편집 가능 SVG 감지 (`isEditable` 플래그)

#### 6.2 편집 기능 구현
- [ ] 크기 조절 (Width, Height, 비율 유지)
- [ ] 선 굵기 조절 (Stroke Width)
- [ ] 색상 편집:
  - [ ] Fill Color Picker
  - [ ] Stroke Color Picker
  - [ ] 특정 요소 선택 편집
- [ ] 실시간 미리보기

#### 6.3 다운로드 기능
- [ ] SVG 다운로드
- [ ] PNG 변환 (Canvas API)
- [ ] JPG 변환 (Canvas API)
- [ ] 해상도 옵션

#### 6.4 기술 스택
- React State로 SVG 속성 관리
- `react-color` 또는 `@uiw/react-color` 사용
- `html2canvas` 또는 `svg2png` 라이브러리
- Canvas API로 래스터 변환

---

### Phase 7: 사용자 관리 및 권한 (3-4일)

#### 7.1 인증 기능
- [ ] 회원가입 페이지
- [ ] 로그인 페이지
- [ ] 비밀번호 해싱 (bcryptjs)
- [ ] 세션 관리

#### 7.2 사용자 프로필
- [ ] 프로필 페이지
- [ ] 아바타 업로드/변경
- [ ] 이름 변경
- [ ] 비밀번호 변경
- [ ] 회원탈퇴

#### 7.3 권한 관리
- [ ] 역할 기반 접근 제어 (RBAC)
- [ ] 미들웨어: 라우트 보호
- [ ] 컴포넌트: 조건부 렌더링
- [ ] API: 권한 체크

---

### Phase 8: 관리자 기능 (4-5일)

#### 8.1 관리자 대시보드
- [ ] 통계 카드 (게시물 수, 사용자 수, 다운로드 수)
- [ ] 차트 (선택)
- [ ] 외부 대시보드 링크

#### 8.2 사용자 관리
- [ ] 사용자 목록 (테이블)
- [ ] 역할 변경
- [ ] 사용자 검색/필터
- [ ] 사용자 삭제 (비활성화)

#### 8.3 공지사항 관리
- [ ] 공지사항 목록
- [ ] 등록/수정/삭제
- [ ] 중요 공지 표시
- [ ] Markdown 에디터 (선택)

---

### Phase 9: 카테고리별 페이지 구현 (5-6일)

#### 9.1 WORK 카테고리
- [ ] Penta Design 페이지
- [ ] 게시물 목록 표시
- [ ] 다운로드 기능

#### 9.2 SOURCE 카테고리
- [ ] CI/BI, ICON, 캐릭터, 다이어그램 페이지
- [ ] SVG 편집 기능 통합
- [ ] 편집 가능 게시물 표시

#### 9.3 TEMPLATE 카테고리
- [ ] PPT, 감사/연말 카드, 바탕화면, 웰컴보드 페이지
- [ ] 파일 다운로드
- [ ] 바탕화면 편집 기능 (추후 구현 표시)

#### 9.4 BROCHURE 카테고리
- [ ] WAPPLES, D.AMO, iSIGN, Cloudbric 페이지
- [ ] 제품별 브로셔 목록
- [ ] 다운로드 기능

---

### Phase 10: 반응형 및 최적화 (2-3일)

#### 10.1 모바일 반응형
- [ ] 모바일 레이아웃 조정
- [ ] 터치 제스처 지원
- [ ] 모바일 메뉴 (Sheet)

#### 10.2 성능 최적화
- [ ] 이미지 최적화 (Next.js Image)
- [ ] 코드 스플리팅
- [ ] 지연 로딩
- [ ] 캐싱 전략

#### 10.3 접근성
- [ ] 키보드 네비게이션
- [ ] ARIA 레이블
- [ ] 색상 대비

---

### Phase 11: 테스트 및 배포 준비 (3-4일)

#### 11.1 테스트
- [ ] 기능 테스트
- [ ] 권한 테스트
- [ ] 파일 업로드/다운로드 테스트
- [ ] SVG 편집 테스트

#### 11.2 배포 준비
- [ ] 환경 변수 설정
- [ ] 빌드 최적화
- [ ] 에러 핸들링
- [ ] 로깅 설정

---

## 4. 기술 구현 상세

### 4.1 Backblaze B2 파일 업로드

```typescript
// lib/b2.ts
import B2 from 'backblaze-b2';

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID!,
  applicationKey: process.env.B2_APPLICATION_KEY!,
});

export async function uploadFile(file: File, path: string) {
  // 1. B2 인증
  // 2. 버킷 정보 가져오기
  // 3. 파일 업로드
  // 4. 공개 URL 반환
}

export async function deleteFile(fileId: string) {
  // 파일 삭제
}
```

### 4.2 SVG 편집기 구현 전략

1. SVG 파싱: `dangerouslySetInnerHTML`로 SVG 렌더링
2. 상태 관리: React State로 편집 속성 관리
3. DOM 조작: `useRef`로 SVG 요소 접근
4. 색상 편집: `react-color` 사용
5. 변환: Canvas API로 SVG → PNG/JPG

### 4.3 검색 구현

- Full-text Search: PostgreSQL `tsvector` 사용
- 필터링: Prisma 쿼리 빌더
- 인덱싱: 카테고리, 상태, 생성일 인덱스

---

## 5. API 설계

### 5.1 게시물 API

```
GET    /api/posts              # 게시물 목록
GET    /api/posts/:id          # 게시물 상세
POST   /api/posts              # 게시물 생성 (관리자)
PUT    /api/posts/:id          # 게시물 수정 (관리자)
DELETE /api/posts/:id          # 게시물 삭제 (관리자)
POST   /api/posts/:id/download # 다운로드
```

### 5.2 검색 API

```
GET    /api/search             # 통합 검색
POST   /api/search/advanced    # 상세 검색
```

### 5.3 업로드 API

```
POST   /api/upload             # 파일 업로드 (관리자)
POST   /api/upload/thumbnail   # 썸네일 생성
```

---

## 6. 보안 고려사항

1. 인증: NextAuth.js 세션 관리
2. 권한: 역할 기반 접근 제어
3. 파일 업로드: 파일 타입/크기 검증
4. SQL Injection: Prisma 사용
5. XSS: 입력값 이스케이프
6. CSRF: NextAuth.js 기본 보호

---

## 7. 개발 우선순위

### 필수 (MVP)
1. 프로젝트 초기 설정
2. 데이터베이스 및 인증
3. 기본 레이아웃
4. 게시물 목록/상세
5. 게시물 업로드 (관리자)
6. 기본 검색
7. 사용자 인증/권한

### 중요
8. SVG 편집 기능
9. 상세 검색
10. 관리자 기능

### 선택
11. 공지사항 관리
12. 통계 대시보드
13. 고급 최적화

---

## 8. 예상 개발 기간

- Phase 1-2: 3-5일 (초기 설정)
- Phase 3: 3-4일 (레이아웃)
- Phase 4: 5-7일 (게시물 관리)
- Phase 5: 3-4일 (검색)
- Phase 6: 7-10일 (SVG 편집) ⚠️
- Phase 7: 3-4일 (사용자 관리)
- Phase 8: 4-5일 (관리자)
- Phase 9: 5-6일 (카테고리 페이지)
- Phase 10: 2-3일 (최적화)
- Phase 11: 3-4일 (테스트/배포)

**총 예상 기간: 38-52일 (약 6-8주)**

---

이 계획서를 기준으로 단계별 개발을 진행하시면 됩니다. 특정 단계나 기능에 대해 더 자세한 설명이 필요하시면 알려주세요.

