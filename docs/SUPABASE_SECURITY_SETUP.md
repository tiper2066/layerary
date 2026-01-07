# Supabase 보안 설정 가이드

이 문서는 Supabase 보안 이슈를 해결하기 위한 단계별 가이드입니다.

## 보안 이슈 요약

Supabase에서 다음 보안 경고가 발생했습니다:

1. **users 테이블**: `password` 컬럼이 RLS 없이 노출
2. **posts, categories, notices, tags, post_tags 테이블**: RLS 미활성화
3. **_prisma_migrations 테이블**: RLS 미활성화

## 해결 방법

### 1단계: SQL 스크립트 실행

1. Supabase Dashboard에 로그인
2. 좌측 메뉴에서 **SQL Editor** 선택
3. `prisma/migrations/enable_rls.sql` 파일의 내용을 복사
4. SQL Editor에 붙여넣기
5. **Run** 버튼 클릭하여 실행

### 2단계: Supabase Dashboard에서 추가 설정

#### 2-1. `_prisma_migrations` 테이블 숨기기

1. 좌측 메뉴에서 **Table Editor** 선택
2. `_prisma_migrations` 테이블 선택
3. 우측 상단의 **Settings** (톱니바퀴 아이콘) 클릭
4. **Hide from API** 옵션 체크
5. **Save** 클릭

#### 2-2. `users` 테이블의 `password` 컬럼 숨기기 (선택사항)

> **참고**: SQL 스크립트에서 `public_users` View를 생성했으므로, 이 단계는 선택사항입니다. 
> 하지만 추가 보안을 위해 권장합니다.

1. **Table Editor**에서 `users` 테이블 선택
2. `password` 컬럼을 찾아 클릭
3. 컬럼 설정에서 **Hide from API** 옵션 체크
4. **Save** 클릭

### 3단계: 확인

#### 3-1. 보안 경고 확인

1. Supabase Dashboard에서 **Security** 또는 **Advisories** 메뉴로 이동
2. 이전에 표시되었던 보안 경고가 해결되었는지 확인

#### 3-2. 애플리케이션 테스트

RLS 정책 적용 후 애플리케이션이 정상 작동하는지 확인:

```bash
# 개발 서버 실행
npm run dev
```

다음 기능들을 테스트하세요:
- ✅ 게시물 목록 조회
- ✅ 게시물 상세 조회
- ✅ 공지사항 조회
- ✅ 관리자 기능 (게시물 생성/수정/삭제)
- ✅ 사용자 관리
- ✅ 프로필 업데이트

## 중요 사항

### Prisma와 RLS

- **Prisma는 DATABASE_URL을 통해 직접 PostgreSQL에 연결**하므로, RLS 정책의 영향을 받지 않습니다.
- SQL 스크립트의 모든 정책은 `TO anon, authenticated`로 제한되어 있어, PostgREST API 접근에만 적용됩니다.
- Prisma는 DATABASE_URL의 사용자(postgres 또는 service_role)로 연결되므로, RLS 정책의 영향을 받지 않습니다.
- Prisma를 통한 모든 데이터베이스 작업은 정상적으로 작동합니다.

### PostgREST API 접근

- RLS 정책이 활성화되면, PostgREST API를 통한 직접 접근이 제한됩니다.
- 현재 프로젝트는 PostgREST API를 사용하지 않으므로, 이 제한은 보안 강화에만 도움이 됩니다.

### 문제 해결

만약 애플리케이션에서 오류가 발생한다면:

1. **Prisma 연결 확인**
   - `DATABASE_URL` 환경 변수가 올바른지 확인
   - Prisma가 Service Role 또는 postgres 역할로 연결되는지 확인

2. **RLS 정책 확인**
   - Supabase Dashboard > Authentication > Policies에서 정책 확인
   - 필요시 정책을 수정하거나 제거

3. **로그 확인**
   - Supabase Dashboard > Logs에서 오류 메시지 확인
   - 애플리케이션 콘솔에서 오류 확인

## 추가 보안 권장사항

1. **환경 변수 보호**
   - `.env.local` 파일을 `.gitignore`에 포함
   - 프로덕션 환경에서는 환경 변수를 안전하게 관리

2. **API 키 관리**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 공개되어도 RLS로 보호됨
   - `SUPABASE_SERVICE_ROLE_KEY`는 절대 공개하지 말 것

3. **정기적인 보안 점검**
   - Supabase Dashboard의 Security Advisories를 정기적으로 확인
   - 새로운 보안 경고가 발생하면 즉시 대응

## 참고 자료

- [Supabase RLS 문서](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgREST API 문서](https://postgrest.org/)
- [Prisma 문서](https://www.prisma.io/docs)

