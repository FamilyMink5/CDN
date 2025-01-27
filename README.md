# CDN Server

안전한 파일 전송을 위한 CDN 서버 프로젝트입니다.

## 특징

- AES 암호화를 통한 안전한 파일 전송
- API 키 기반 인증
- 파일 목록 조회 및 다운로드 기능

## 설치 방법

### 백엔드 (Go)

```bash
cd backend
go mod download
```

### 프론트엔드 (React + TypeScript)

```bash
cd frontend
npm install
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
API_KEY=your_api_key_here
AES_KEY=your_aes_key_here
```

## 실행 방법

### 백엔드

```bash
cd backend
go run .
```

### 프론트엔드

```bash
cd frontend
npm run dev
```

## 보안 주의사항

- `.env` 파일을 절대 Git에 커밋하지 마세요
- API 키와 AES 키는 안전하게 보관하세요
- 프로덕션 환경에서는 보안 설정을 강화하세요 