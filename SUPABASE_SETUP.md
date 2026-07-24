# Supabase 연결

1. Supabase 프로젝트의 **SQL Editor**에서 `supabase/schema.sql`을 실행합니다.
2. 프로젝트의 **Settings → API**에서 Project URL과 anon public key를 확인합니다.
3. 배포 서비스의 환경 변수에 아래 두 값을 추가합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 다시 배포하면 상단 상태가 `공용 데이터 연결됨`으로 바뀝니다.

현재 정책은 사내 구성원이 로그인 없이 함께 쓰는 용도에 맞춰 공개 쓰기를 허용합니다.
외부 공개 전에는 Supabase Auth를 붙이고 정책을 사용자 기준으로 바꾸는 것을 권장합니다.
