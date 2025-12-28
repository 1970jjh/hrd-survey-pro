# HRD Survey Pro - 배포 가이드

## 목차

1. [사전 요구사항](#사전-요구사항)
2. [Supabase 설정](#supabase-설정)
3. [Vercel 배포](#vercel-배포)
4. [환경 변수 설정](#환경-변수-설정)
5. [데이터베이스 백업](#데이터베이스-백업)
6. [모니터링 설정](#모니터링-설정)
7. [문제 해결](#문제-해결)

---

## 사전 요구사항

- Node.js 20.x 이상
- npm 10.x 이상
- GitHub 계정
- Vercel 계정
- Supabase 계정
- Google AI Studio 계정 (Gemini API)

---

## Supabase 설정

### 1. 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Organization**: 조직 선택 또는 생성
   - **Project name**: `hrd-survey-pro`
   - **Database Password**: 강력한 비밀번호 설정 (저장해두세요)
   - **Region**: `Northeast Asia (Seoul)` 권장

### 2. 데이터베이스 스키마 적용

1. Supabase Dashboard에서 "SQL Editor" 열기
2. `supabase/schema.sql` 파일 내용 복사하여 실행
3. `supabase/rls-policies.sql` 파일 내용 복사하여 실행

### 3. API 키 확인

Settings > API에서 다음 값을 확인:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

---

## Vercel 배포

### 1. GitHub 연결

```bash
# 저장소 초기화 (이미 완료된 경우 건너뛰기)
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/hrd-survey-pro.git
git push -u origin main
```

### 2. Vercel 프로젝트 생성

1. [Vercel Dashboard](https://vercel.com/dashboard)에서 "Add New Project"
2. GitHub 저장소 연결
3. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `hrd-survey-pro`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3. 환경 변수 설정

Vercel 프로젝트 Settings > Environment Variables에서 추가:

| 변수명                          | 설명                      | 환경       |
| ------------------------------- | ------------------------- | ---------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 프로젝트 URL     | All        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key         | All        |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase Service Role Key | All        |
| `GEMINI_API_KEY`                | Google Gemini API Key     | All        |
| `NEXT_PUBLIC_BASE_URL`          | 배포된 사이트 URL         | Production |

### 4. 배포

```bash
# 자동 배포 (main 브랜치 푸시 시)
git push origin main

# 수동 배포
vercel --prod
```

---

## 환경 변수 설정

### 개발 환경 (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 프로덕션 환경

Vercel Dashboard에서 환경 변수를 설정하세요.
`NEXT_PUBLIC_BASE_URL`은 Vercel이 제공하는 도메인 또는 커스텀 도메인으로 설정합니다.

---

## 데이터베이스 백업

### 자동 백업 (Supabase Pro)

Supabase Pro 플랜에서는 자동 백업이 제공됩니다:

- 매일 자동 백업
- 7일간 보관
- Point-in-time recovery

### 수동 백업

```bash
# pg_dump를 사용한 백업
pg_dump -h your-project.supabase.co -U postgres -d postgres > backup_$(date +%Y%m%d).sql

# Supabase CLI를 사용한 백업
supabase db dump -f backup.sql
```

### 백업 복원

```bash
# pg_restore를 사용한 복원
psql -h your-project.supabase.co -U postgres -d postgres < backup.sql
```

### 권장 백업 전략

1. **일일 백업**: Supabase Pro 자동 백업 사용
2. **주간 백업**: 수동으로 외부 스토리지에 저장
3. **마이그레이션 전**: 항상 수동 백업 수행

---

## 모니터링 설정

### Vercel Analytics

자동으로 활성화됨. Dashboard에서 확인 가능:

- 페이지 뷰
- 방문자 수
- 지역별 트래픽
- 디바이스 분포

### Vercel Speed Insights

자동으로 활성화됨:

- Core Web Vitals
- 페이지 로딩 시간
- 성능 점수

### Supabase 모니터링

Dashboard에서 확인 가능:

- 데이터베이스 사용량
- API 요청 수
- Storage 사용량
- Realtime 연결 수

### 에러 로깅

`src/lib/logger.ts`를 통해 구조화된 로깅이 제공됩니다.
프로덕션에서는 다음 서비스 연동을 권장합니다:

- [Sentry](https://sentry.io) - 에러 트래킹
- [LogRocket](https://logrocket.com) - 세션 리플레이
- [Datadog](https://datadoghq.com) - APM

---

## 문제 해결

### 빌드 실패

```bash
# 캐시 삭제 후 재빌드
rm -rf .next node_modules
npm install
npm run build
```

### 데이터베이스 연결 오류

1. Supabase 프로젝트가 활성 상태인지 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. RLS 정책이 올바르게 적용되었는지 확인

### API 요청 실패

1. CORS 설정 확인
2. API 키가 올바른지 확인
3. Rate limit 확인 (Gemini API)

### 성능 문제

1. Lighthouse 점수 확인
2. 이미지 최적화 확인
3. 불필요한 리렌더링 확인

---

## 체크리스트

### 배포 전

- [ ] 모든 테스트 통과
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 완료
- [ ] RLS 정책 확인

### 배포 후

- [ ] 사이트 접속 확인
- [ ] 로그인/회원가입 테스트
- [ ] 설문 생성 테스트
- [ ] QR코드 스캔 테스트
- [ ] 응답 제출 테스트
- [ ] 결과 분석 테스트

---

## 지원

문제가 발생하면 GitHub Issues에 보고해주세요.

**© 2026 JJ CREATIVE Edu with AI. All Rights Reserved.**
