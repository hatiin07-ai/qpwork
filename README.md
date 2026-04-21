# 💖 업보 숙제장

스트리머 "업보"의 시청자별 숙제 관리 웹앱

## 기술 스택
- HTML + Tailwind CSS (CDN)
- Vanilla JavaScript
- Supabase (PostgreSQL + Auth + RLS)

## 파일 구조
```
├── upbo.html            ← 공개 페이지 (숙제 목록)
├── admin/index.html     ← 관리자 페이지 (/admin)
├── css/style.css        ← 커스텀 스타일
├── js/
│   ├── supabase-config.js  ← Supabase 연결 설정
│   ├── upbo.js             ← 공개 페이지 로직
│   └── upbo-admin.js       ← 관리자 페이지 로직
└── supabase-upbo-setup.sql ← DB 스키마
```

## 설정 방법
1. Supabase 프로젝트에서 `supabase-upbo-setup.sql` 실행
2. `js/supabase-config.js`에 Supabase URL/Key 설정
3. Supabase Auth에서 관리자 계정 생성
4. GitHub Pages 등으로 배포

## 숙제 항목 (기본 14개)
랜덤 방셀, 사탕 1개, 방송국 뻘글, 움짤 방셀, 움짤 프사, 사이드 배너, 방송국 편지, 스토리 방셀, 하단 배너, 사탕 10개, 인생네컷, 상단 배너, 배너 3종 세트, 손편지(사진)

> 이벤트성 항목(그림 사이드 배너 등)은 어드민에서 추가/비활성화 가능

© 2026 QP 💖
